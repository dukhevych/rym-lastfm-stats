const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const glob = require('glob');

const entries = glob.sync('./src/*.js').reduce((acc, file) => {
  const name = path.basename(file, path.extname(file));
  acc[name] = path.resolve(__dirname, file);
  return acc;
}, {});

module.exports = {
  entry: entries,
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
  // devtool: 'source-map', // Add this line to enable source maps
  mode: 'production',
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'public', to: '.' },
        {
          from: 'manifest.json',
          to: 'manifest.json',
          transform(content) {
            return Buffer.from(JSON.stringify({
              ...JSON.parse(content.toString()),
              version: process.env.npm_package_version,
            }))
          }
        },
        // { from: 'src/libs', to: 'libs' }
        // { from: 'node_modules/webextension-polyfill/dist/browser-polyfill.js', }
      ],
    }),
  ],
};
