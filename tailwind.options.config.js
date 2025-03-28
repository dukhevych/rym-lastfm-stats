module.exports = {
  content: [
    './src/components/options/**/*.vue',
    './public/options.html',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'rym-gradient': 'linear-gradient(to bottom, #33519f, #2480c4)',
      },
      colors: {
        'clr-rym': '#006ED1',
        'clr-lastfm': '#f71414',
      },
    },
  },
  plugins: [],
}
