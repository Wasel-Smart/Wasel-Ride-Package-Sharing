import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 15000,
    setupFiles: ['./tests/setup.ts'],
    environmentOptions: {
      jsdom: { url: 'http://localhost/' },
    },
    env: {
      NODE_ENV: 'test',
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_PROJECT_URL: '',
      VITE_PUBLIC_SUPABASE_URL: '',
      VITE_SUPABASE_ANON_KEY: '',
      VITE_SUPABASE_PUBLISHABLE_KEY: '',
      VITE_PUBLIC_SUPABASE_ANON_KEY: '',
      VITE_E2E_LOCAL_AUTH: 'false',
    },
    include: [
      'tests/**/*.test.ts',
      'tests/**/*.test.tsx',
    ],
    exclude: [
      'node_modules',
      'build',
      'src/features/testing/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'node_modules',
        'tests',
        '**/*.d.ts',
        'vite.config.ts',
        'vitest.config.ts',
        'vitest.config.mjs',
      ],
    },
  },
});
