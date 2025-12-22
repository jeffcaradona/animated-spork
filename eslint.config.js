import js from '@eslint/js';

export default [
  {
    ignores: ['node_modules/**', 'dist/**', 'build/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      'no-console': 'warn',
    },
  },
];
