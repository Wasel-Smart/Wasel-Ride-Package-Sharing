/// <reference types="vitest" />

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// Dedicated Vitest config — intentionally excludes @tailwindcss/vite.
// That plugin accesses Vite internals (plugin.config) that are unavailable
// inside the Vitest worker context, crashing every test suite with:
//   TypeError: Cannot read properties of undefined (reading 'config')
// CSS is irrelevant for unit/integration tests so the plugin is simply omitted.
export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      { find: '$deno', replacement: path.resolve(__dirname, './supabase/functions') },
    ],
  },

  test: {
    globals: true,
    environment: 'jsdom',
    // 'threads' and 'forks' pools both fail on Windows paths with spaces
    // (e.g. OneDrive\Desktop) because the worker spawn times out waiting for
    // the IPC channel. 'vmForks' runs each test file in a VM context inside
    // the same process, avoiding the worker spawn entirely.
    pool: 'vmForks',
    environmentOptions: { url: 'http://localhost/' },
    passWithNoTests: true,
    testTimeout: 20000,
    hookTimeout: 20000,
    setupFiles: './tests/setup.ts',
    include: [
      'tests/**/*.test.{ts,tsx}',
      'src/**/*.test.{ts,tsx}',
      'src/**/__tests__/**/*.{ts,tsx}',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/e2e/**',
      '**/tests/e2e/**',
      '**/mobile/**',
      '**/*.spec.ts',
      'tests/database/**',
      'tests/integration/**',
      'tests/utils/pricing/**',
      'src/services/Button.test.tsx',
    ],
    env: {
      VITE_EVENT_BROKER: 'memory',
    },
  },
});
