const path = require('path');

module.exports = {
  plugins: {
    tailwindcss: {
      config: path.resolve(__dirname, 'tailwind.options.config.js'),
    },
    autoprefixer: {},
  }
}
