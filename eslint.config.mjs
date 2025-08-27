import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import sveltePlugin from 'eslint-plugin-svelte';
// import vuePlugin from 'eslint-plugin-vue';
import globals from 'globals';
import svelteParser from 'svelte-eslint-parser';
// import vueParser from 'vue-eslint-parser';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        extraFileExtensions: ['.svelte'],
      },
      globals: {
        ...globals.browser,
        ...globals.webextensions,
        ...globals.node,
        chrome: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      import: importPlugin,
    },
    rules: {
      'no-unused-vars': 'off',
      'no-undef': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', {
        vars: 'all',
        args: 'after-used',
        ignoreRestSiblings: true,
      }],
      '@typescript-eslint/no-shadow': 'warn',
      'no-shadow': 'off',

      'no-console': 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'max-len': ['warn', { code: 120 }],
      'no-unreachable': process.env.NODE_ENV === 'production' ? 'error' : 'warn',

      'import/order': ['warn', {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
        pathGroups: [{ pattern: '@/**', group: 'internal' }],
        pathGroupsExcludedImportTypes: ['builtin'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      }],
    },
  },

  // {
  //   files: ['**/*.vue'],
  //   languageOptions: {
  //     parser: vueParser,
  //     parserOptions: {
  //       parser: '@typescript-eslint/parser',
  //       ecmaVersion: 2022,
  //       sourceType: 'module',
  //       extraFileExtensions: ['.vue'],
  //     },
  //   },
  //   plugins: {
  //     vue: vuePlugin,
  //   },
  //   rules: {
  //     ...vuePlugin.configs['flat/recommended'].rules,
  //     'max-len': 'off',
  //     'vue/max-len': ['warn', {
  //       code: 200,
  //       template: 300,
  //       comments: 120,
  //       ignorePattern: '',
  //       ignoreComments: false,
  //       ignoreTrailingComments: false,
  //       ignoreUrls: true,
  //       ignoreStrings: true,
  //       ignoreTemplateLiterals: true,
  //       ignoreRegExpLiterals: true,
  //       ignoreHTMLAttributeValues: true,
  //       ignoreHTMLTextContents: true,
  //     }],
  //   },
  // },

  {
    files: ['**/*.svelte'],
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: tsParser,
        ecmaVersion: 2022,
        sourceType: 'module',
        extraFileExtensions: ['.svelte'],
      },
    },
    plugins: { svelte: sveltePlugin },
    rules: {
      ...sveltePlugin.configs.recommended.rules,
    },
  },

  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/src/libs/**',
    ],
  },
];
