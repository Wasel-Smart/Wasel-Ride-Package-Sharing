import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
  ],

  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
    alias: {
      '@': path.resolve(rootDir, './src'),
      '@domains': path.resolve(rootDir, './src/domains'),
      '@platform': path.resolve(rootDir, './src/platform'),
    },
  },

  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: 'hidden',
    minify: 'esbuild',
    chunkSizeWarningLimit: 200,
    cssMinify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/src/locales/translations.ts')) {
            return 'translations';
          }

          if (!id.includes('node_modules')) {
            return undefined;
          }

          // ── React ecosystem (split granularly to stay under 80 KB gzip) ──────
          if (id.includes('/node_modules/scheduler/')) return 'react-scheduler';
          if (id.includes('/node_modules/react/')) return 'react-core';
          if (id.includes('/node_modules/react-dom/client')) return 'react-dom-client';
          if (id.includes('/node_modules/react-dom/server')) return 'react-dom-server';
          if (id.includes('/node_modules/react-dom/')) return 'react-dom';

          // ── Router ───────────────────────────────────────────────────────────
          if (id.includes('/node_modules/react-router/')) return 'react-router';

          // ── Supabase (split into auth + realtime + storage + postgrest) ──────
          if (id.includes('/node_modules/@supabase/auth-js')) return 'supabase-auth';
          if (id.includes('/node_modules/@supabase/realtime-js')) return 'supabase-realtime';
          if (id.includes('/node_modules/@supabase/storage-js')) return 'supabase-storage';
          if (id.includes('/node_modules/@supabase/postgrest-js')) return 'supabase-postgrest';
          if (id.includes('/node_modules/@supabase/functions-js')) return 'supabase-functions';
          if (id.includes('/node_modules/@supabase/')) return 'supabase-core';

          // ── TanStack Query ───────────────────────────────────────────────────
          if (id.includes('/node_modules/@tanstack/query-core')) return 'tanstack-core';
          if (id.includes('/node_modules/@tanstack/react-query')) return 'tanstack-react';

          // ── Radix UI (split by component family) ─────────────────────────────
          if (
            id.includes('/node_modules/@radix-ui/react-dialog') ||
            id.includes('/node_modules/@radix-ui/react-alert-dialog') ||
            id.includes('/node_modules/@radix-ui/react-popover') ||
            id.includes('/node_modules/@radix-ui/react-tooltip')
          ) return 'radix-overlays';
          if (
            id.includes('/node_modules/@radix-ui/react-dropdown-menu') ||
            id.includes('/node_modules/@radix-ui/react-context-menu') ||
            id.includes('/node_modules/@radix-ui/react-menubar') ||
            id.includes('/node_modules/@radix-ui/react-navigation-menu')
          ) return 'radix-menus';
          if (
            id.includes('/node_modules/@radix-ui/react-select') ||
            id.includes('/node_modules/@radix-ui/react-radio-group') ||
            id.includes('/node_modules/@radix-ui/react-checkbox') ||
            id.includes('/node_modules/@radix-ui/react-switch') ||
            id.includes('/node_modules/@radix-ui/react-slider') ||
            id.includes('/node_modules/@radix-ui/react-toggle') ||
            id.includes('/node_modules/@radix-ui/react-toggle-group')
          ) return 'radix-forms';
          if (id.includes('/node_modules/@radix-ui/')) return 'radix-misc';

          // ── Icons ─────────────────────────────────────────────────────────────
          if (id.includes('/node_modules/lucide-react/')) return 'icons';

          // ── UI utilities ─────────────────────────────────────────────────────
          if (id.includes('/node_modules/sonner/')) return 'ui-toast';
          if (id.includes('/node_modules/vaul/')) return 'ui-drawer';
          if (id.includes('/node_modules/cmdk/')) return 'ui-command';
          if (id.includes('/node_modules/embla-carousel')) return 'ui-carousel';
          if (id.includes('/node_modules/input-otp/')) return 'ui-otp';
          if (id.includes('/node_modules/react-resizable-panels/')) return 'ui-panels';

          // ── Animation ────────────────────────────────────────────────────────
          if (id.includes('/node_modules/motion/')) return 'motion';

          // ── Maps ─────────────────────────────────────────────────────────────
          if (id.includes('/node_modules/leaflet/')) return 'maps';

          // ── Charts / D3 ──────────────────────────────────────────────────────
          if (
            id.includes('/node_modules/recharts/') ||
            id.includes('/node_modules/react-smooth/')
          ) return 'recharts';
          if (
            id.includes('/node_modules/d3-') ||
            id.includes('/node_modules/internmap/') ||
            id.includes('/node_modules/recharts-scale/')
          ) return 'd3-core';

          // ── Forms ─────────────────────────────────────────────────────────────
          if (id.includes('/node_modules/react-hook-form/')) return 'react-hook-form';
          if (id.includes('/node_modules/react-day-picker/')) return 'react-day-picker';
          if (id.includes('/node_modules/zod/')) return 'validation';

          // ── Monitoring / payments ─────────────────────────────────────────────
          if (id.includes('/node_modules/@sentry/browser')) return 'sentry-browser';
          if (id.includes('/node_modules/@sentry/core')) return 'sentry-core';
          if (id.includes('/node_modules/@sentry/')) return 'sentry-misc';
          if (id.includes('/node_modules/@stripe/')) return 'payments';

          // ── OpenTelemetry ─────────────────────────────────────────────────────
          if (id.includes('/node_modules/@opentelemetry/sdk-trace')) return 'otel-sdk';
          if (id.includes('/node_modules/@opentelemetry/exporter')) return 'otel-exporter';
          if (id.includes('/node_modules/@opentelemetry/')) return 'otel-core';

          // ── Style utilities ───────────────────────────────────────────────────
          if (id.includes('/node_modules/clsx') || id.includes('/node_modules/tailwind-merge')) return 'css-utils';
          if (id.includes('/node_modules/class-variance-authority')) return 'cva';

          return undefined;
        },
        assetFileNames: (assetInfo) => {
          const info = (assetInfo.name ?? '').split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return 'assets/images/[name]-[hash][extname]';
          }
          if (/woff2?|eot|ttf|otf/i.test(ext)) {
            return 'assets/fonts/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
  },

  server: {
    port: 3000,
    strictPort: false,
    open: false,
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
