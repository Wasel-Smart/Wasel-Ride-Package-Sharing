import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(rootDir, './src'),
    },
  },
  define: {
    // Comprehensive environment setup for testing
    'import.meta.env.MODE': JSON.stringify('test'),
    'import.meta.env.DEV': JSON.stringify(false),
    'import.meta.env.PROD': JSON.stringify(false),
    'import.meta.env.SSR': JSON.stringify(false),
    'import.meta.env.VITE_APP_ENV': JSON.stringify('test'),
    'import.meta.env.VITE_APP_NAME': JSON.stringify('Wasel'),
    'import.meta.env.VITE_APP_URL': JSON.stringify('http://localhost:3000'),
    'import.meta.env.VITE_SUPPORT_EMAIL': JSON.stringify('support@wasel.jo'),
    'import.meta.env.VITE_ALLOW_DIRECT_SUPABASE_FALLBACK': JSON.stringify('true'),
    'import.meta.env.VITE_ALLOW_LOCAL_PERSISTENCE_FALLBACK': JSON.stringify('true'),
    'import.meta.env.VITE_ENABLE_TWO_FACTOR_AUTH': JSON.stringify('false'),
    'import.meta.env.VITE_ENABLE_EMAIL_NOTIFICATIONS': JSON.stringify('true'),
    'import.meta.env.VITE_ENABLE_SMS_NOTIFICATIONS': JSON.stringify('true'),
    'import.meta.env.VITE_ENABLE_WHATSAPP_NOTIFICATIONS': JSON.stringify('true'),
    'import.meta.env.VITE_AUTH_CALLBACK_PATH': JSON.stringify('/app/auth/callback'),
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(''),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(''),
    'import.meta.env.VITE_ENABLE_DEMO_DATA': JSON.stringify('true'),
    'import.meta.env.VITE_ENABLE_SYNTHETIC_TRIPS': JSON.stringify('true'),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/env-setup.ts', './tests/setup.ts'],
    environmentOptions: {
      jsdom: { 
        url: 'http://localhost/',
        pretendToBeVisual: true,
        resources: 'usable',
      },
    },
    env: {
      NODE_ENV: 'test',
      VITE_APP_NAME: 'Wasel',
      VITE_APP_URL: 'http://localhost:3000',
      VITE_SUPPORT_EMAIL: 'support@wasel.jo',
      VITE_ALLOW_DIRECT_SUPABASE_FALLBACK: 'true',
      VITE_ALLOW_LOCAL_PERSISTENCE_FALLBACK: 'true',
      VITE_ENABLE_TWO_FACTOR_AUTH: 'false',
      VITE_ENABLE_EMAIL_NOTIFICATIONS: 'true',
      VITE_ENABLE_SMS_NOTIFICATIONS: 'true',
      VITE_ENABLE_WHATSAPP_NOTIFICATIONS: 'true',
      VITE_AUTH_CALLBACK_PATH: '/app/auth/callback',
      VITE_ENABLE_DEMO_DATA: 'true',
      VITE_ENABLE_SYNTHETIC_TRIPS: 'true',
      MODE: 'test',
    },
    testTimeout: 15000,
    hookTimeout: 15000,
    teardownTimeout: 5000,
    include: [
      'tests/**/*.test.ts',
      'tests/**/*.test.tsx',
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
    ],
    exclude: [
      'node_modules',
      'build',
      'dist',
      'src/features/testing/**',
      // Database tests require a live Supabase connection — run separately
      'tests/database/**',
      // E2E tests are handled by Playwright
      'tests/e2e/**',
      '**/*.e2e.test.ts',
      '**/*.e2e.test.tsx',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json-summary', 'json'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'node_modules',
        'tests',
        '**/*.d.ts',
        'vite.config.ts',
        'vitest.config.ts',
        'vitest.config.mjs',
        'vitest.coverage.config.ts',
        'src/main.tsx',
        'src/**/*.stories.tsx',
        'src/**/*.story.tsx',
        'src/locales/**',
        'src/assets/**',
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/**/*.spec.ts',
        'src/**/*.spec.tsx',
        // Exclude generated files
        'src/supabase/types.ts',
        'src/config/database.types.ts',
        // Exclude configuration files
        'src/config/**',
        'src/tokens/**',
        // Exclude mock files
        'src/**/__mocks__/**',
        'src/**/*.mock.ts',
        'src/**/*.mock.tsx',
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
      // Fail if coverage is below thresholds
      skipFull: false,
      // Include all files in coverage report, even untested ones
      all: true,
      // Clean coverage directory before running
      clean: true,
    },
    reporters: [
      'default',
      'verbose',
      'json',
      'html',
    ],
    outputFile: {
      json: './coverage/test-results.json',
      html: './coverage/test-results.html',
    },
    // Retry failed tests
    retry: 2,
    // Run tests in parallel
    pool: 'threads',
    poolOptions: {
      threads: {
        minThreads: 1,
        maxThreads: 4,
      },
    },
    // Watch options
    watch: {
      exclude: [
        'node_modules/**',
        'dist/**',
        'build/**',
        'coverage/**',
        '.git/**',
      ],
    },
    // Mock options
    deps: {
      inline: [
        // Inline dependencies that need to be transformed
        '@testing-library/jest-dom',
        '@testing-library/react',
        '@testing-library/user-event',
      ],
    },
    // Global test configuration
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    // Snapshot options
    resolveSnapshotPath: (testPath, snapExtension) => {
      return testPath.replace(/\.test\.([tj]sx?)/, `.test.${snapExtension}`);
    },
    // Custom matchers and utilities
    setupFiles: [
      './tests/env-setup.ts',
      './tests/setup.ts',
      './tests/mocks/global-mocks.ts',
    ],
    // Performance monitoring
    logHeapUsage: true,
    // Fail fast on first test failure in CI
    bail: process.env.CI ? 1 : 0,
    // Disable file watching in CI
    watch: !process.env.CI,
    // Enhanced error reporting
    printConsoleTrace: true,
    // Test isolation
    isolate: true,
    // Concurrent test execution
    sequence: {
      concurrent: true,
      shuffle: false,
      hooks: 'parallel',
    },
  },
  // Optimize for testing performance
  esbuild: {
    target: 'node14',
    sourcemap: 'inline',
  },
});