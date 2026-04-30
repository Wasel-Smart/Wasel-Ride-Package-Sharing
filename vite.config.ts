import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
  },

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
    chunkSizeWarningLimit: 200,
    cssCodeSplit: true,
    reportCompressedSize: false,
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/src/locales/translations.ts')) {
            return 'translations';
          }

          if (!id.includes('node_modules')) {
            return undefined;
          }

          // Keep route-level chunks intact and split only stable vendor groups.
          if (id.includes('/node_modules/react/') || id.includes('/node_modules/scheduler/')) return 'react-core';
          if (id.includes('/node_modules/react-dom/client')) return 'react-dom-client';
          if (id.includes('/node_modules/react-dom/')) return 'react-dom';
          if (id.includes('/node_modules/react-router/')) return 'react-router';

          if (id.includes('/node_modules/@supabase/')) return 'supabase';

          if (id.includes('/node_modules/@tanstack/query-core')) return 'tanstack-core';
          if (id.includes('/node_modules/@tanstack/react-query')) return 'tanstack-react';

          if (id.includes('/node_modules/@radix-ui/')) return 'radix-primitives';
          if (id.includes('/node_modules/lucide-react/')) return 'icons';
          if (id.includes('/node_modules/sonner/')) return 'ui-toast';

          if (
            id.includes('/node_modules/vaul/')
            || id.includes('/node_modules/cmdk/')
            || id.includes('/node_modules/embla-carousel')
          ) {
            return 'ui-interactions';
          }

          if (id.includes('/node_modules/motion/')) return 'motion';
          if (id.includes('/node_modules/leaflet/')) return 'maps';

          if (
            id.includes('/node_modules/recharts/')
            || id.includes('/node_modules/d3-')
            || id.includes('/node_modules/internmap/')
            || id.includes('/node_modules/react-smooth/')
            || id.includes('/node_modules/recharts-scale/')
          ) {
            return 'charts';
          }

          if (id.includes('/node_modules/react-hook-form/') || id.includes('/node_modules/react-day-picker/')) {
            return 'forms';
          }

          if (id.includes('/node_modules/@sentry/')) return 'monitoring';
          if (id.includes('/node_modules/@stripe/')) return 'payments';
          if (id.includes('/node_modules/@opentelemetry/')) return 'otel';
          if (id.includes('/node_modules/zod/')) return 'validation';
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
