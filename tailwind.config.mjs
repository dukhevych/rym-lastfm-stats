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
  ]
}
