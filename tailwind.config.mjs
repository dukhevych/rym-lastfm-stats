export default {
  important: true,
  content: [
    './src/**/*.{vue,svelte,html,js,ts}',
    './public/**/*.html',
  ],
  theme: {
    extend: {
      minHeight: {
        'viewport': '100dvh',
      },
      backgroundImage: {
        'rym-gradient': 'linear-gradient(to bottom, #33519f, #2480c4)',
      },
      colors: {
        'clr-rym': '#006ED1',
        'clr-lastfm': '#d92323',
        'clr-lastfm-light': '#f71414'
      },
    },
  },
}
