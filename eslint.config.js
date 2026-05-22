import js from '@eslint/js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  { ignores: ['build', 'node_modules', 'dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,

      // Re-enabled: stale closures cause subtle runtime bugs
      'react-hooks/exhaustive-deps': 'warn',

      // Re-enabled: catches dead exports that bloat the bundle
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // TypeScript - tightened
      '@typescript-eslint/no-explicit-any': 'warn',          // warn, not error, to allow gradual migration
      '@typescript-eslint/no-unused-vars': ['error', {        // was off - dead code is now caught
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',  // too many false positives in JSX

      // Console - warn in source, errors block CI
      // Devs can use console.* during development but production code should use logger.*
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],

      // General code quality
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
      'no-duplicate-imports': 'error',
      'no-debugger': 'error',
      'no-alert': 'warn',

      // React Compiler advisory rules are not actionable until the app opts into the compiler.
      'react-hooks/immutability': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',

      // Catch process.env usage in browser code - use import.meta.env instead
      'no-restricted-globals': [
        'error',
        {
          name: 'process',
          message: "Use import.meta.env instead of process.env in browser/Vite code.",
        },
      ],
    },
  },
);
