const js = require('@eslint/js');
const eslintPluginVue = require('eslint-plugin-vue');
const globals = require('globals');
const eslintPluginReadableTailwind = require('eslint-plugin-readable-tailwind');

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
      'max-len': ['warn', { 'code': 120 }],

      // 'readable-tailwind/order': 'warn',
      // 'readable-tailwind/no-contradicting-classname': 'error',
    },
  },
  {
    plugins: {
      "readable-tailwind": eslintPluginReadableTailwind
    },
    rules: {
      // enable all recommended rules to warn
      ...eslintPluginReadableTailwind.configs.warning.rules,
      // enable all recommended rules to error
      // ...eslintPluginReadableTailwind.configs.error.rules,

      // or configure rules individually
      "readable-tailwind/multiline": ["warn", { printWidth: 100 }]
    }
  },
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/src/libs/**',
    ],
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
