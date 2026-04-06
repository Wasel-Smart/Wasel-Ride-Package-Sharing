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
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    environmentOptions: {
      jsdom: { url: 'http://localhost/' },
    },
    env: {
      NODE_ENV: 'test',
      VITE_APP_NAME: 'Wasel',
      VITE_APP_URL: 'http://localhost:3000',
      VITE_SUPPORT_EMAIL: 'support@wasel.jo',
      VITE_ENABLE_TWO_FACTOR_AUTH: 'false',
      VITE_ENABLE_EMAIL_NOTIFICATIONS: 'true',
      VITE_ENABLE_SMS_NOTIFICATIONS: 'true',
      VITE_ENABLE_WHATSAPP_NOTIFICATIONS: 'true',
      VITE_AUTH_CALLBACK_PATH: '/app/auth/callback',
      MODE: 'test',
    },
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['node_modules', 'build', 'dist', 'src/features/testing/**'],
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
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85,
      },
    },
    reporters: ['verbose'],
  },
});
