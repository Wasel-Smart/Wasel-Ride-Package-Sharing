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

  // Production optimizations
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
    minify: false,
    chunkSizeWarningLimit: 400,
    cssCodeSplit: true,
    reportCompressedSize: false, // Faster builds
    
    // Advanced minification
    rollupOptions: {
      output: {
        manualChunks(id) {
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

          if (
            id.includes('/node_modules/@sentry/') ||
            id.includes('/node_modules/hoist-non-react-statics/')
          ) return 'monitoring';

          // Payments
          if (id.includes('/node_modules/@stripe/')) return 'payments';

          return undefined;
        },
        // Optimize asset naming for better caching
        assetFileNames: (assetInfo) => {
          const info = (assetInfo.name ?? '').split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/woff2?|eot|ttf|otf/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
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
