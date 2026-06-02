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
    target: 'es2018',
    cssTarget: 'chrome80',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
  },

  server: {
    port: 5173,
    strictPort: false,
  },
});
