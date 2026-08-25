import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
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

// Stamps dist/sw.js with a content-derived cache version at build time.
// Running this inside Vite's writeBundle guarantees the service worker is
// always versioned for every build (including Vercel), so we never ship the
// __CACHE_VERSION__ placeholder that makes the SW throw on evaluation and
// leave returning users stuck on a stale cached shell.
const stampServiceWorkerPlugin = {
  name: 'stamp-service-worker',
  apply: 'build' as const,
  writeBundle() {
    const swPath = path.resolve('dist/sw.js');
    if (!fs.existsSync(swPath)) return;

    let sw = fs.readFileSync(swPath, 'utf-8');
    if (!sw.includes('__CACHE_VERSION__')) return;

    const assetsDir = path.resolve('dist/assets');
    let fingerprint = '';
    if (fs.existsSync(assetsDir)) {
      const walk = (dir: string): string[] =>
        fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
          const full = path.join(dir, entry.name);
          return entry.isDirectory() ? walk(full) : [full];
        });
      const hash = crypto.createHash('sha256');
      for (const file of walk(assetsDir).sort()) {
        hash.update(path.relative('dist', file));
      }
      fingerprint = hash.digest('hex').slice(0, 12);
    }

    const version = `wasel-${fingerprint || Date.now()}`;
    sw = sw.replaceAll('__CACHE_VERSION__', version);
    fs.writeFileSync(swPath, sw);
    console.log(`[stamp-service-worker] versioned dist/sw.js as ${version}`);
  },
};

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    buildTimePlugin,
    stampServiceWorkerPlugin,
    mode === 'analyze' && visualizer({
      filename: 'dist/bundle-analysis.html',
      // CI runners have no interactive browser. Keep the report as an
      // artifact instead of attempting to open it during the release gate.
      open: false,
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

          if (id.includes('/node_modules/framer-motion/')) return 'vendor';

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
            if (id.includes('/node_modules/motion/')) return 'motion';

            if (
              id.includes('/node_modules/react-hook-form/') ||
              id.includes('/node_modules/react-day-picker/')
            ) return 'forms';

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
    chunkSizeWarningLimit: 1200,
    cssChunk: true,
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
