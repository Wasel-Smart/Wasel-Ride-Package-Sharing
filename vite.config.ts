import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    chunkSizeWarningLimit: 600,
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
