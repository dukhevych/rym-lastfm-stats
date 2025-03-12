const js = require('@eslint/js');
const eslintPluginVue = require('eslint-plugin-vue');
const globals = require('globals');

module.exports = [
  js.configs.recommended,
  ...eslintPluginVue.configs['flat/recommended'],
  {
    files: ['src/**/*.{js,vue}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.webextensions,
        ...globals.node,
        chrome: 'readonly',
      },
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    rules: {
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      // 'max-len': ['warn', { 'code': 80 }],
    },
  },
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/src/libs/**'],
  },
  {
    files: ['*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
    },
    rules: {
      'no-undef': 'off',
    },
  },
  {
    rules: {
      'no-unused-vars': 'warn',
    },
  }
];
