/// <reference types="vitest" />

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
// Vitest will automatically use this configuration.
// By merging the configs, we ensure the test environment
// has the same setup (e.g., for Tailwind CSS) as the app.
// See: https://vitest.dev/config/#configuring-vitest
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Add compression via server/CDN (brotli) or a CI post-build step.
    // NOTE: vite-plugin-compression / @sentry/vite-plugin are intentionally
    // omitted here so the build does not depend on optional dev-only plugins.
    // Sentry sourcemap upload is handled in the deploy pipeline instead.
  ],

  resolve: {
    // This alias is crucial for both the build and test commands.
    // It tells Vite/Vitest that '@/' should point to the 'src/' directory.
    alias: [{ find: '@', replacement: path.resolve(__dirname, './src') }],
  },

  build: {
    target: 'es2020',
    outDir: 'dist',
    // Generate sourcemaps for Sentry, but don't include them in the public build
    // The Sentry plugin will upload and then delete them.
    sourcemap: 'hidden',
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          // React core — must be its own chunk for maximum cache hits
          if (
            id.includes('/node_modules/react/') ||
            id.includes('/node_modules/react-dom/') ||
            id.includes('/node_modules/react-router/') ||
            id.includes('/node_modules/scheduler/')
          ) return 'react-core';

          // Animation
          if (id.includes('/node_modules/framer-motion/')) return 'motion';

          // UI primitives
          if (
            id.includes('/node_modules/@radix-ui/') ||
            id.includes('/node_modules/lucide-react/') ||
            id.includes('/node_modules/sonner/') ||
            id.includes('/node_modules/vaul/') ||
            id.includes('/node_modules/cmdk/') ||
            id.includes('/node_modules/embla-carousel')
          ) return 'ui-primitives';

          // Data / backend
          if (
            id.includes('/node_modules/@supabase/') ||
            id.includes('/node_modules/@tanstack/')
          ) return 'data-layer';

          // Maps
          if (id.includes('/node_modules/leaflet/')) return 'maps';

          // Charts
          if (id.includes('/node_modules/recharts/')) return 'charts';

          // Forms
          if (
            id.includes('/node_modules/react-hook-form/') ||
            id.includes('/node_modules/react-day-picker/')
          ) return 'forms';

          // Monitoring
          if (id.includes('/node_modules/@sentry/')) return 'monitoring';

          // Payments
          if (id.includes('/node_modules/@stripe/')) return 'payments';

          // All other vendors
          return 'vendor';
        },
      },
    },
  },

  server: {
    port: 5173,
    strictPort: false,
    open: true,
    host: '127.0.0.1',
  },

  css: {
    devSourcemap: false,
  },

  preview: {
    port: 4173,
    host: true,
  },

  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@supabase/supabase-js',
      '@tanstack/react-query',
      'lucide-react',
    ],
  },

  // Vitest configuration, merged from vitest.config.ts
  test: {
    globals: true,
    environment: 'jsdom',
    // jsdom needs a URL to back localStorage/sessionStorage.
    environmentOptions: { url: 'http://localhost/' },
    setupFiles: './tests/setup.ts',
    // Keep Playwright (.spec.ts) and Detox (mobile/e2e) suites out of the
    // vitest run — they have their own runners (`playwright test`, Detox).
    include: ['tests/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}', 'src/**/__tests__/**/*.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/e2e/**',
      '**/tests/e2e/**',
      '**/mobile/**',
      '**/*.spec.ts',
    ],
    env: {
      // Force the in-memory broker for unit/integration tests so the
      // EventBroker singleton does not bind to a real Supabase project.
      VITE_EVENT_BROKER: 'memory',
    },
  },
});
