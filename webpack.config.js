const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const glob = require('glob');
const { VueLoaderPlugin } = require('vue-loader');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');
const { DefinePlugin } = require('webpack');
const dotenv = require('dotenv');
const dotenvExpand = require('dotenv-expand');
const fs = require('fs');

const generateManifest = require('./manifest.config.js');
const packageJson = require('./package.json');

const appVersion = packageJson.version;

const entries = glob.sync('./src/*.{js,ts}')
  .filter(f => !/\.d\.ts$/.test(f))
  .reduce((acc, file) => {
    const name = path.basename(file, path.extname(file));
    acc[name] = path.resolve(__dirname, file);
    return acc;
  }, {});

module.exports = (env) => {
  const browserTarget = env.browser;

  if (!browserTarget) {
    throw new Error('Missing required env.browser value (e.g., --env browser=chrome)');
  }

  const isLocalDev = env.local === 'true';
  const outputPath = path.resolve(__dirname, `dist/${browserTarget}`);

  const loadEnv = (envPath) => {
    if (fs.existsSync(envPath)) {
      const envConfig = dotenv.config({ path: envPath });
      dotenvExpand.expand(envConfig);
      return envConfig.parsed || {};
    }
    return {};
  };

  const envRoot = loadEnv(!isLocalDev ? '.env' : '.env.local');
  const envBrowser = loadEnv(!isLocalDev ? `.env.${browserTarget}` : `.env.${browserTarget}.local`);

  const combinedEnv = {
    ...process.env,
    ...envRoot,
    ...envBrowser,
  };

  console.log(process.env.NODE_ENV);
  console.log('Build version:', appVersion);
  console.log('Browser target:', browserTarget);
  console.log('System api key:', combinedEnv.LASTFM_API_KEY ? '✅' : '❌');
  console.log('System secret key:', combinedEnv.LASTFM_API_SECRET ? '✅' : '❌');

  if (!combinedEnv.LASTFM_API_KEY) {
    throw new Error('Missing required LASTFM_API_KEY environment variable');
  }

  if (!combinedEnv.LASTFM_API_SECRET) {
    throw new Error('Missing required LASTFM_API_SECRET environment variable');
  }

  const publicEnvVars = [
    'LASTFM_API_KEY',
    'LASTFM_API_SECRET',
    'NODE_ENV',
  ];

  const envKeys = publicEnvVars.reduce((acc, key) => {
    acc[`process.env.${key}`] = JSON.stringify(combinedEnv[key]);
    return acc;
  }, {});

  return {
    entry: entries,
    output: {
      filename: '[name].js',
      path: outputPath,
      sourceMapFilename: '[name].[contenthash].js.map',
    },
    node: false,
    cache: {
      type: 'filesystem',
    },
    devtool: process.env.NODE_ENV === 'production' ? false : 'source-map',
    mode: process.env.NODE_ENV || 'development',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        vue$: 'vue/dist/vue.runtime.esm-browser.prod.js',
      },
      extensions: ['.ts', '.js', '.vue', '.svelte'],
    },
    module: {
      rules: [
        {
          test: /\.svelte$/,
          use: {
            loader: 'svelte-loader',
            options: {
              compilerOptions: {
                dev: process.env.NODE_ENV !== 'production',
              },
              preprocess: require('svelte-preprocess')(),
            },
          },
        },
        {
          test: /\.vue$/,
          loader: 'vue-loader',
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
          use: [
            {
              loader: 'style-loader',
              options: {
                insert: require.resolve('./src/helpers/styleLoaderInsert.ts'),
              }
            },
            'css-loader',
            'postcss-loader',
          ],
        },
        {
          test: /\.svg$/i,
          resourceQuery: /raw/,
          use: 'raw-loader',
        },
        {
          test: /\.csv$/i,
          resourceQuery: /raw/,
          use: 'raw-loader',
        },
        {
          test: /\.ts$/,
          exclude: [/node_modules/, /\.d\.ts$/],
          use: {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
            },
          },
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
        ...envKeys,
        'process.env.APP_VERSION': JSON.stringify(appVersion),
        'process.env.BROWSER_TARGET': JSON.stringify(browserTarget),
      }),
      new VueLoaderPlugin(),
      new CopyPlugin({
        patterns: [
          { from: 'public', to: '.' },
          {
            from: 'manifest.config.js',
            to: 'manifest.json',
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
        extensions: ['js', 'ts', 'vue'],
        configType: 'flat',
        fix: process.env.NODE_ENV === 'production',
        failOnError: true,
      }),
    ],
    optimization: {
      minimize: process.env.NODE_ENV === 'production',
      minimizer: [new TerserPlugin({
        parallel: true,
        terserOptions: {
          sourceMap: true,
          compress: {
            drop_console: false,
          },
        },
      })],
      usedExports: true,
      sideEffects: false,
    },
  };
};
