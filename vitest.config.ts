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
    minWorkers: 1,
    setupFiles: ['./tests/setup.ts'],
    environmentOptions: {
      jsdom: { url: 'http://localhost/' },
    },
    env: {
      NODE_ENV: 'test',
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
