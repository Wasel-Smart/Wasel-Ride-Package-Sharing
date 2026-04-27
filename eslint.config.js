import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'build',
      'coverage',
      'dist',
      'node_modules',
      'playwright-report',
      'test-results',
    ],
  },
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
      'react-hooks/exhaustive-deps': 'error', // UPGRADED: Critical for hook dependency validation
      'react-refresh/only-export-components': 'off',
      
      // TypeScript - Enhanced Rules
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }], // UPGRADED: Catch dead code
      '@typescript-eslint/no-non-null-assertion': 'error', // UPGRADED: Safe null handling
      '@typescript-eslint/consistent-type-imports': ['error', {
        prefer: 'type-imports',
        fixStyle: 'inline-type-imports',
      }],
      '@typescript-eslint/no-empty-object-type': 'error',
      
      // General code quality - Enhanced
      'no-console': ['error', { allow: ['warn', 'error'] }], // UPGRADED: Strict console usage
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
      'no-duplicate-imports': 'off',
      'no-debugger': 'error', // UPGRADED: No debugger in production
      'prefer-arrow-callback': 'off',
      'no-unused-expressions': 'error',
      'no-unreachable': 'error',
      'no-constant-condition': 'error',
      'no-empty': 'error',
      'no-extra-boolean-cast': 'error',
      'no-irregular-whitespace': 'error',
      'no-sparse-arrays': 'error',
      'valid-typeof': 'error',
      'curly': 'off',
      'dot-notation': 'off',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-wrappers': 'error',
      'no-throw-literal': 'error',
      'no-undef-init': 'error',
      'no-shadow': 'error',
      'prefer-template': 'off',
      'object-shorthand': 'off',
      'array-callback-return': 'off',
    },
  },
  {
    files: ['src/utils/enhanced-logging.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['tests/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
    },
  },
  {
    files: [
      'src/App.tsx',
      'src/components/app/ErrorBoundary.tsx',
      'src/components/app/AppShell.tsx',
      'src/components/MobileBottomNav.tsx',
      'src/features/profile/ProfilePage.tsx',
      'src/layouts/WaselRoot.tsx',
      'src/wasel-routes.tsx',
      'src/app/**/*.tsx',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='style']",
          message: 'Inline styles are blocked. Use shared design-system classes and tokens.',
        },
      ],
    },
  },
  {
    files: ['src/domains/*/domain/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          '@/components/*',
          '@/features/*',
          '@/layouts/*',
          '@/pages/*',
          '@/services/*',
        ],
      }],
    },
  },
  {
    files: ['src/domains/*/application/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          '@/components/*',
          '@/features/*',
          '@/layouts/*',
          '@/pages/*',
        ],
      }],
    },
  },
  {
    files: ['src/domains/*/presentation/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          '@/services/*',
        ],
      }],
    },
  },
);
