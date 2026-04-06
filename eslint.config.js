import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['build', 'node_modules', 'dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-hooks/exhaustive-deps': 'warn', // ENABLED: Critical for hook dependency validation
      'react-refresh/only-export-components': 'warn',
      // TypeScript
      '@typescript-eslint/no-explicit-any': 'warn', // ENABLED: Enforce proper typing
      '@typescript-eslint/no-unused-vars': 'warn', // ENABLED: Catch dead code
      '@typescript-eslint/no-non-null-assertion': 'warn', // ENABLED: Safe null handling
      '@typescript-eslint/consistent-type-imports': ['warn', {
        prefer: 'type-imports',
        fixStyle: 'inline-type-imports',
      }],
      '@typescript-eslint/no-empty-object-type': 'warn',
      // General code quality
      'no-console': ['warn', { allow: ['warn', 'error'] }], // Allow warnings/errors in production
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
      'no-duplicate-imports': 'error',
      'no-debugger': 'warn',
      'prefer-arrow-callback': 'warn',
    },
  },
);
