const path = require("path");
const fs = require("fs");
const CopyPlugin = require("copy-webpack-plugin");
const TerserPlugin = require('terser-webpack-plugin');
const glob = require("glob");
const { VueLoaderPlugin } = require("vue-loader");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const ESLintPlugin = require('eslint-webpack-plugin');
const { DefinePlugin } = require('webpack');
const dotenv = require('dotenv');

const generateManifest = require("./manifest.config.js");
const packageJson = require('./package.json');

const appVersion = packageJson.version;

const entries = glob.sync("./src/*.js").reduce((acc, file) => {
  const name = path.basename(file, path.extname(file));
  acc[name] = path.resolve(__dirname, file);
  return acc;
}, {});

module.exports = (env) => {
  const browserTarget = env.browser;
  const outputPath = path.resolve(__dirname, `dist/${browserTarget}`);

  dotenv.config({ path: [`.env.${env.browser}.local`, '.env.local', `.env.${env.browser}`, '.env'] });

  return {
    entry: entries,
    output: {
      filename: "[name].js",
      path: outputPath,
    },
    cache: {
      type: 'filesystem',
    },
    // devtool: 'source-map',
    mode: "production",
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        vue$: "vue/dist/vue.runtime.esm-browser.prod.js",
      },
      extensions: [".js", ".vue"],
    },
    module: {
      rules: [
        {
          test: /\.vue$/,
          loader: "vue-loader",
        },
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              cacheDirectory: true,
            },
          },
        },
        {
          test: /\.css$/,
          use: [MiniCssExtractPlugin.loader, "css-loader", "postcss-loader"],
        },
      ],
    },
    plugins: [
      new CleanWebpackPlugin({
        cleanOnceBeforeBuildPatterns: [outputPath],
        dry: false,
        dangerouslyAllowCleanPatternsOutsideProject: true,
        verbose: true
      }),
      new DefinePlugin({
        'process.env': JSON.stringify(process.env),
        'process.env.APP_VERSION': JSON.stringify(appVersion),
        'window.LASTFM_API_KEY': JSON.stringify(process.env.LASTFM_API_KEY)
      }),
      new VueLoaderPlugin(),
      new MiniCssExtractPlugin({
        filename: "[name].css",
      }),
      new CopyPlugin({
        patterns: [
          { from: "public", to: "." },
          {
            from: "manifest.config.js",
            to: "manifest.json",
            transform() {
              const manifest = generateManifest(browserTarget);
              return Buffer.from(
                JSON.stringify(
                  {
                    ...JSON.parse(manifest),
                    version: process.env.npm_package_version,
                  },
                  null,
                  2
                )
              );
            },
          },
        ],
      }),
      new ESLintPlugin({
        extensions: ['js', 'vue'],
        configType: 'flat',
        fix: true,
        failOnError: true,
      }),
    ],
    optimization: {
      minimize: true,
      minimizer: [new TerserPlugin({
        parallel: true,
      })],
    },
  };
};
