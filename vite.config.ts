import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

const buildTimePlugin = {
  name: 'build-time-inject',
  async writeBundle() {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const indexPath = path.resolve('dist/index.html');
    if (!fs.existsSync(indexPath)) return;
    let html = fs.readFileSync(indexPath, 'utf-8');
    const buildTime = new Date().toISOString();
    if (!html.includes('build-time')) {
      html = html.replace(
        '<meta name="color-scheme"',
        `<meta name="build-time" content="${buildTime}" /><meta name="color-scheme"`,
      );
      fs.writeFileSync(indexPath, html);
    }
  },
};

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    buildTimePlugin,
    mode === 'analyze' && visualizer({
      filename: 'dist/bundle-analysis.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ].filter(Boolean),

  resolve: {
    alias: [{ find: '@', replacement: path.resolve(__dirname, './src') }],
  },

  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: 'hidden',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (
            id.includes('/node_modules/react/') ||
            id.includes('/node_modules/react-dom/') ||
            id.includes('/node_modules/react-router/') ||
            id.includes('/node_modules/scheduler/')
          ) return 'react-core';

          if (id.includes('/node_modules/framer-motion/')) return 'motion';

          if (
            id.includes('/node_modules/@radix-ui/') ||
            id.includes('/node_modules/lucide-react/') ||
            id.includes('/node_modules/sonner/') ||
            id.includes('/node_modules/vaul/') ||
            id.includes('/node_modules/cmdk/') ||
            id.includes('/node_modules/embla-carousel')
          ) return 'ui-primitives';

          if (
            id.includes('/node_modules/@supabase/') ||
            id.includes('/node_modules/@tanstack/')
          ) return 'data-layer';

          if (id.includes('/node_modules/leaflet/')) return 'maps';
          if (id.includes('/node_modules/recharts/')) return 'charts';

          if (
            id.includes('/node_modules/react-hook-form/') ||
            id.includes('/node_modules/react-day-picker/')
          ) return 'forms';

          if (id.includes('/node_modules/@sentry/')) return 'monitoring';
          if (id.includes('/node_modules/@stripe/')) return 'payments';

          return 'vendor';
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) return 'assets/css/[name]-[hash][extname]';
          if (
            assetInfo.name?.endsWith('.png') ||
            assetInfo.name?.endsWith('.jpg') ||
            assetInfo.name?.endsWith('.svg') ||
            assetInfo.name?.endsWith('.ico')
          ) return 'assets/images/[name]-[hash][extname]';
          return 'assets/[name]-[hash][extname]';
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
    reportCompressedSize: true,
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
      'sonner',
    ],
  },
}));
