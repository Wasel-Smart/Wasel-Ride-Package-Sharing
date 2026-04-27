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
    minify: 'esbuild',
    chunkSizeWarningLimit: 200,
    cssCodeSplit: true,
    reportCompressedSize: false, // Faster builds
    
    // Aggressive minification settings
    cssMinify: true,
    
    // Advanced minification with aggressive code splitting
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            // Split large feature modules
            if (id.includes('/src/features/rides/')) return 'feature-rides';
            if (id.includes('/src/features/bus/')) return 'feature-bus';
            if (id.includes('/src/features/wallet/')) return 'feature-wallet';
            if (id.includes('/src/features/operations/')) return 'feature-operations';
            if (id.includes('/src/features/mobility-os/')) return 'feature-mobility';
            if (id.includes('/src/features/packages/')) return 'feature-packages';
            if (id.includes('/src/features/payments/')) return 'feature-payments';
            
            // Split domains
            if (id.includes('/src/domains/auth/')) return 'domain-auth';
            if (id.includes('/src/domains/wallet/')) return 'domain-wallet';
            if (id.includes('/src/domains/mobility/')) return 'domain-mobility';
            if (id.includes('/src/domains/mapping/')) return 'domain-mapping';
            
            // Split large components
            if (id.includes('/src/components/wasel-ui/')) return 'wasel-ui';
            if (id.includes('/src/components/wasel-ds/')) return 'wasel-ds';
            
            return undefined;
          }

          // React core — ultra-granular splitting
          if (id.includes('/node_modules/react/') || id.includes('/node_modules/scheduler/')) return 'react-core';
          if (id.includes('/node_modules/react-dom/client')) return 'react-dom-client';
          if (id.includes('/node_modules/react-dom/')) return 'react-dom';
          if (id.includes('/node_modules/react-router/')) return 'react-router';

          // Supabase - ultra-granular
          if (id.includes('/node_modules/@supabase/auth-')) return 'supabase-auth';
          if (id.includes('/node_modules/@supabase/postgrest-')) return 'supabase-postgrest';
          if (id.includes('/node_modules/@supabase/realtime-')) return 'supabase-realtime';
          if (id.includes('/node_modules/@supabase/storage-')) return 'supabase-storage';
          if (id.includes('/node_modules/@supabase/')) return 'supabase-core';
          
          // TanStack Query
          if (id.includes('/node_modules/@tanstack/query-core')) return 'tanstack-core';
          if (id.includes('/node_modules/@tanstack/react-query')) return 'tanstack-react';

          // Split Radix UI into ultra-granular chunks
          if (id.includes('/node_modules/@radix-ui/react-dialog')) return 'radix-dialog';
          if (id.includes('/node_modules/@radix-ui/react-alert-dialog')) return 'radix-alert';
          if (id.includes('/node_modules/@radix-ui/react-dropdown')) return 'radix-dropdown';
          if (id.includes('/node_modules/@radix-ui/react-select')) return 'radix-select';
          if (id.includes('/node_modules/@radix-ui/react-popover')) return 'radix-popover';
          if (id.includes('/node_modules/@radix-ui/react-tooltip')) return 'radix-tooltip';
          if (id.includes('/node_modules/@radix-ui/react-tabs')) return 'radix-tabs';
          if (id.includes('/node_modules/@radix-ui/')) return 'radix-primitives';

          // Icons separate from other UI
          if (id.includes('/node_modules/lucide-react/')) return 'icons';

          // UI utilities - split further
          if (id.includes('/node_modules/sonner/')) return 'ui-toast';
          if (id.includes('/node_modules/vaul/')) return 'ui-drawer';
          if (id.includes('/node_modules/cmdk/')) return 'ui-command';
          if (id.includes('/node_modules/embla-carousel')) return 'ui-carousel';

          // Animation
          if (id.includes('/node_modules/motion/')) return 'motion';

          // Maps - heavy library
          if (id.includes('/node_modules/leaflet/')) return 'maps';

          // Charts - ultra-granular
          if (id.includes('/node_modules/d3-scale')) return 'charts-d3-scale';
          if (id.includes('/node_modules/d3-shape')) return 'charts-d3-shape';
          if (id.includes('/node_modules/d3-') || id.includes('/node_modules/internmap/')) return 'charts-d3';
          if (id.includes('/node_modules/recharts/')) return 'charts-recharts';
          if (id.includes('/node_modules/recharts-scale/') || id.includes('/node_modules/react-smooth/')) return 'charts-utils';

          // Forms
          if (id.includes('/node_modules/react-hook-form/')) return 'forms';
          if (id.includes('/node_modules/react-day-picker/')) return 'date-picker';

          // Monitoring - split by module
          if (id.includes('/node_modules/@sentry/browser')) return 'sentry-browser';
          if (id.includes('/node_modules/@sentry/')) return 'sentry-core';

          // Payments
          if (id.includes('/node_modules/@stripe/')) return 'payments';

          // OpenTelemetry - split by module
          if (id.includes('/node_modules/@opentelemetry/api')) return 'otel-api';
          if (id.includes('/node_modules/@opentelemetry/')) return 'otel-sdk';

          // Validation
          if (id.includes('/node_modules/zod/')) return 'validation';
          
          // Utilities
          if (id.includes('/node_modules/clsx') || id.includes('/node_modules/tailwind-merge')) return 'css-utils';
          if (id.includes('/node_modules/class-variance-authority')) return 'cva';

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
