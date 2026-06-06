import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import legacy from '@vitejs/plugin-legacy';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),

    tailwindcss({
      optimize: true,
    }),

    legacy({
      targets: [
        'defaults',
        'iOS >= 12',
        'Safari >= 12',
        'Chrome >= 90',
        'Android >= 8',
      ],
    }),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  build: {
    cssTarget: 'chrome80',
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@supabase')) return 'vendor-supabase';
          if (id.includes('@stripe') || id.includes('stripe')) return 'vendor-payments';
          if (id.includes('@tanstack')) return 'vendor-query';
          if (id.includes('leaflet') || id.includes('recharts') || id.includes('motion')) {
            return 'vendor-visualization';
          }
          if (id.includes('@radix-ui') || id.includes('lucide-react')) return 'vendor-ui';
          return 'vendor';
        },
      },
    },
  },

  server: {
    port: 5173,
    strictPort: false,
  },
});
