import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const SOURCE_CHUNKS: Array<{ name: string; patterns: string[] }> = [
  {
    name: 'i18n',
    patterns: ['/src/locales/'],
  },
  {
    name: 'app-shell',
    patterns: [
      '/src/App.tsx',
      '/src/wasel-routes.tsx',
      '/src/layouts/',
      '/src/components/MobileBottomNav.tsx',
      '/src/components/PrivacyConsentBanner.tsx',
      '/src/components/system/WaselPresence.tsx',
      '/src/hooks/useNotifications.ts',
    ],
  },
  {
    name: 'auth-runtime',
    patterns: [
      '/src/contexts/AuthContext.tsx',
      '/src/contexts/LocalAuth.tsx',
      '/src/contexts/authContextHelpers.ts',
      '/src/services/auth.ts',
      '/src/utils/authHelpers.ts',
      '/src/utils/supabase/',
      '/src/pages/WaselAuth.tsx',
      '/src/pages/WaselAuthCallback.tsx',
    ],
  },
  {
    name: 'data-runtime',
    patterns: [
      '/src/services/core.ts',
      '/src/services/notifications.ts',
      '/src/services/communicationPreferences.ts',
      '/src/services/dataIntegrity.ts',
      '/src/services/directSupabase/',
    ],
  },
];

function resolveSourceChunk(id: string) {
  return SOURCE_CHUNKS.find((chunk) => chunk.patterns.some((pattern) => id.includes(pattern)))?.name;
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
    alias: {
      '@': path.resolve(rootDir, './src'),
    },
  },

  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: 'hidden',
    minify: 'esbuild',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const sourceChunk = resolveSourceChunk(id);
          if (sourceChunk) return sourceChunk;

          if (!id.includes('node_modules')) return undefined;

          // React core — must be its own chunk for maximum cache hits
          if (
            id.includes('/node_modules/react/') ||
            id.includes('/node_modules/react-dom/') ||
            id.includes('/node_modules/react-router/') ||
            id.includes('/node_modules/scheduler/')
          ) return 'react-core';

          // Large shared utility vendor used heavily by charts
          if (id.includes('/node_modules/lodash/')) return 'lodash';

          // Animation
          if (id.includes('/node_modules/motion/')) return 'motion';

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
          if (
            id.includes('/node_modules/d3-') ||
            id.includes('/node_modules/internmap/')
          ) return 'charts-d3';
          if (
            id.includes('/node_modules/recharts/') ||
            id.includes('/node_modules/recharts-scale/') ||
            id.includes('/node_modules/react-smooth/') ||
            id.includes('/node_modules/eventemitter3/') ||
            id.includes('/node_modules/fast-equals/') ||
            id.includes('/node_modules/prop-types/') ||
            id.includes('/node_modules/tiny-invariant/') ||
            id.includes('/node_modules/decimal.js-light/')
          ) return 'charts';

          // Forms
          if (
            id.includes('/node_modules/react-hook-form/') ||
            id.includes('/node_modules/react-day-picker/')
          ) return 'forms';

          // Monitoring
          if (id.includes('/node_modules/@sentry/core/')) return 'monitoring-core';
          if (
            id.includes('/node_modules/@sentry/browser/') ||
            id.includes('/node_modules/@sentry-internal/browser-utils/')
          ) return 'monitoring-browser';
          if (
            id.includes('/node_modules/@sentry/react/') ||
            id.includes('/node_modules/hoist-non-react-statics/')
          ) return 'monitoring-react';
          if (
            id.includes('/node_modules/@sentry-internal/replay') ||
            id.includes('/node_modules/@sentry-internal/feedback/')
          ) return 'monitoring-replay';

          // Payments
          if (id.includes('/node_modules/@stripe/')) return 'payments';

          return undefined;
        },
      },
    },
  },

  server: {
    port: 3000,
    strictPort: false,
    open: true,
    host: true,
  },

  preview: {
    port: 4173,
    host: true,
  },

  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router',
      '@supabase/supabase-js',
      '@tanstack/react-query',
      'lucide-react',
    ],
  },
});
