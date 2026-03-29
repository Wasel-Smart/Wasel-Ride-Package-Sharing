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
    setupFiles: ['./src/tests/setup.ts'],
    environmentOptions: {
      jsdom: { url: 'http://localhost/' },
    },
    env: {
      NODE_ENV: 'test',
    },
    include: [
      'tests/**/*.test.ts',
      'tests/**/*.test.tsx',
      'src/tests/example.test.tsx',
      'src/tests/unit/**/*.test.ts?(x)',
      'src/tests/accessibility/**/*.test.ts?(x)',
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
        'src/tests',
        '**/*.d.ts',
        'vite.config.ts',
        'vitest.config.ts',
        'vitest.config.mjs',
      ],
    },
  },
});
