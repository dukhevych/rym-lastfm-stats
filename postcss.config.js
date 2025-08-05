const animatedCircleGradient = require('./build/postcss-animated-circle-gradient');

module.exports = {
  plugins: [
    require('postcss-import'),
    animatedCircleGradient(),
    require('tailwindcss'),
    require('autoprefixer'),
  ]
}
