function colorMix(color1, color2, color2Amount = 20) {
  return `color-mix(in lab, ${color1}, ${color2} ${color2Amount}%)`;
}

export default {
  important: true,
  content: [
    './src/**/*.{svelte,html,js,ts}',
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
        rymUser: '#383',
        rymPrimary: '#006ED1',

        lastfm: '#d92323',
        lastfmLight: 'var(--color-lastfm-light)',
        lastfmDark: 'var(--color-lastfm-dark)',
      },
    },
    cssVariables: {
      theme: true,
    },
  },
  plugins: [
    function ({ addVariant }) {
      addVariant('hoverable', '@media (hover: hover) and (pointer: fine)');
      addVariant('non-hoverable', '@media (hover: none), (pointer: coarse)');
    },
    ({ addBase }) => {
      addBase({
        ':root': {
          '--color-lastfm': '#d92323',
          '--color-lastfm-light': colorMix('var(--color-lastfm)', 'white'),
          '--color-lastfm-dark': colorMix('var(--color-lastfm)', 'black'),
        },
      });
    },
  ]
}
