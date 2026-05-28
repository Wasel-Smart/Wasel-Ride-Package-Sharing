import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.json']
  },

  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000,

    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (
            id.includes('react') ||
            id.includes('react-dom') ||
            id.includes('scheduler')
          ) {
            return 'react-core';
          }

          if (id.includes('react-router')) {
            return 'router';
          }

          if (
            id.includes('framer-motion') ||
            id.includes('motion')
          ) {
            return 'motion';
          }

          if (
            id.includes('@radix-ui') ||
            id.includes('lucide-react') ||
            id.includes('sonner') ||
            id.includes('vaul') ||
            id.includes('cmdk') ||
            id.includes('embla-carousel')
          ) {
            return 'ui';
          }

          if (
            id.includes('@supabase') ||
            id.includes('@tanstack')
          ) {
            return 'data';
          }

          if (id.includes('leaflet')) {
            return 'maps';
          }

          if (id.includes('recharts')) {
            return 'charts';
          }

          if (
            id.includes('react-hook-form') ||
            id.includes('react-day-picker')
          ) {
            return 'forms';
          }

          if (id.includes('@sentry')) {
            return 'monitoring';
          }

          if (id.includes('@stripe')) {
            return 'payments';
          }
        }
      }
    }
  },

  server: {
    port: 5173,
    strictPort: false,
    open: true,
    host: true
  },

  preview: {
    port: 4173,
    host: true
  },

  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router',
      '@supabase/supabase-js',
      '@tanstack/react-query',
      'lucide-react'
    ]
  }
});