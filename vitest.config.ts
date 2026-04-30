import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const sharedExcludes = [
  'node_modules',
  'build',
  'dist',
  'src/features/testing/**',
  'tests/database/**',
];

const domOnlyTsTests = [
  'tests/integration/**/*.test.ts',
  'tests/unit/services/bus.test.ts',
  'tests/unit/services/communicationPreferences.test.ts',
  'tests/unit/services/corePerformance.test.ts',
  'tests/unit/services/demandCapture.test.ts',
  'tests/unit/services/journeyLogistics.test.ts',
  'tests/unit/services/movementMembership.test.ts',
  'tests/unit/services/notifications.test.ts',
  'tests/unit/services/packageTrackingService.test.ts',
  'tests/unit/services/rideLifecycle.test.ts',
  'tests/unit/services/rideModule.test.ts',
  'tests/unit/services/supportInbox.test.ts',
  'tests/unit/services/wallet.test.ts',
  'tests/unit/services/walletInsights.test.ts',
  'tests/unit/utils/authFlow.test.ts',
  'tests/unit/utils/clipboard.test.ts',
  'tests/unit/utils/consent.test.ts',
  'tests/unit/utils/env.test.ts',
  'tests/unit/utils/locale.test.ts',
  'tests/unit/utils/sanitize.test.ts',
  'tests/unit/utils/service-worker.test.ts',
  'tests/unit/utils/startupDom.test.ts',
  'tests/unit/utils/theme.test.ts',
];

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(rootDir, './src'),
    },
  },
  define: {
    // Ensure import.meta.env is fully defined for all modules under test.
    // Without this, modules that read import.meta.env at load time crash
    // with "Cannot read properties of undefined (reading 'config')".
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
  },
  test: {
    globals: true,
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
      MODE: 'test',
    },
    testTimeout: 15000,
    hookTimeout: 15000,
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'node_modules',
        'tests',
        '**/*.d.ts',
        'vite.config.ts',
        'vitest.config.ts',
        'vitest.config.mjs',
        'src/main.tsx',
        'src/**/*.stories.tsx',
        'src/locales/**',
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
    },
    reporters: ['default'],
    projects: [
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          setupFiles: ['./tests/env-setup.ts', './tests/setup.ts'],
          environmentOptions: {
            jsdom: { url: 'http://localhost/' },
          },
          include: ['tests/**/*.test.tsx', ...domOnlyTsTests],
          exclude: sharedExcludes,
        },
      },
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          setupFiles: ['./tests/env-setup.ts'],
          include: ['tests/**/*.test.ts'],
          exclude: [...sharedExcludes, ...domOnlyTsTests],
        },
      },
    ],
  },
});
