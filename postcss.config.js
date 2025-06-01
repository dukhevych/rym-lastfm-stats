const path = require('path');
const animatedCircleGradient = require('./build/postcss-animated-circle-gradient');

module.exports = {
  plugins: [
    require('postcss-import'),
    animatedCircleGradient(),
    require('tailwindcss')({
      config: path.resolve(__dirname, 'tailwind.options.config.js'),
    }),
    require('autoprefixer'),
  ]
}
