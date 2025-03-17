const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const TerserPlugin = require('terser-webpack-plugin');
const glob = require("glob");
const { VueLoaderPlugin } = require("vue-loader");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const ESLintPlugin = require('eslint-webpack-plugin');
const { DefinePlugin } = require('webpack');
const dotenv = require('dotenv');
const dotenvExpand = require('dotenv-expand');
const fs = require("fs");

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

  // Load environment variables from .env files
  const loadEnv = (envPath) => {
    if (fs.existsSync(envPath)) {
      const envConfig = dotenv.config({ path: envPath });
      dotenvExpand.expand(envConfig);
      return envConfig.parsed || {};
    }
    return {};
  };

  // Load environment variables in order of precedence
  // 1. .env.[browser].local (local development overrides for specific browser)
  // 2. .env.[browser] (CI/CD environment variables for specific browser)
  // 3. .env.local (local development overrides)
  // 4. .env (default environment variables)
  const envRoot = loadEnv('.env');
  const envLocal = loadEnv(`.env.local`);
  const envBrowser = loadEnv(`.env.${browserTarget}`);
  const envBrowserLocal = loadEnv(`.env.${browserTarget}.local`);

  // Combine all environment variables with proper precedence
  const combinedEnv = {
    ...process.env,  // System environment variables
    ...envRoot,          // .env variables
    ...envLocal,     // .env.local variables
    ...envBrowser,   // .env.[browser] variables
    ...envBrowserLocal, // .env.[browser].local variables
  };

  // Convert environment variables to format suitable for DefinePlugin
  const envKeys = Object.keys(combinedEnv).reduce((prev, next) => {
    prev[`process.env.${next}`] = JSON.stringify(combinedEnv[next]);
    return prev;
  }, {});

  console.log("Entries:", entries);

  return {
    entry: entries,
    output: {
      filename: "[name].js",
      path: outputPath,
      sourceMapFilename: "[name].[contenthash].js.map",
    },
    cache: {
      type: 'filesystem',
    },
    devtool: 'source-map',
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
        // Include all environment variables
        ...envKeys,
        // Ensure APP_VERSION is available
        'process.env.APP_VERSION': JSON.stringify(appVersion),
        // Explicitly add browserTarget as an environment variable
        'process.env.BROWSER_TARGET': JSON.stringify(browserTarget),
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
        terserOptions: {
          sourceMap: true, // Ensure Terser generates source maps
          compress: {
            drop_console: false, // Keep console logs for debugging if needed
          },
        },
      })],
    },
  };
};
