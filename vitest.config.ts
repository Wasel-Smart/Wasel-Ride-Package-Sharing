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
    pool: 'threads',
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 15000,
    setupFiles: ['./tests/setup.ts'],
    environmentOptions: {
      jsdom: { url: 'http://localhost/' },
    },
    env: {
      NODE_ENV: 'test',
      VITE_SUPABASE_URL: 'https://zexlxabdcsjefptmjhuq.supabase.co',
      VITE_SUPABASE_PROJECT_URL: 'https://zexlxabdcsjefptmjhuq.supabase.co',
      VITE_PUBLIC_SUPABASE_URL: 'https://zexlxabdcsjefptmjhuq.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
      VITE_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
      VITE_E2E_LOCAL_AUTH: 'false',
      VITE_APP_URL: 'http://localhost:3000',
      VITE_ENABLE_TWO_FACTOR_AUTH: 'false',
      VITE_ALLOW_DIRECT_SUPABASE_FALLBACK: 'true',
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
