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
    if (!html.includes('name="build-time"')) {
      html = html.replace(
        '<meta name="color-scheme"',
        `<meta name="build-time" content="${buildTime}" /><meta name="color-scheme"`,
      );
      fs.writeFileSync(indexPath, html);
    }
  },
};

export default defineConfig(({ mode }) => ({
  envDir: path.resolve(import.meta.dirname, process.env.WASEL_ENV_DIR || '.'),
  plugins: [
    react(),
    tailwindcss(),
    buildTimePlugin,
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
    alias: [
      // react-router's package export map points Vite's `import` condition at
      // its development build even for production bundles. Resolve the package's
      // supported production entry explicitly to keep invariant/debug code out
      // of the initial client chunk.
      { find: /^react-router$/, replacement: path.resolve(import.meta.dirname, 'node_modules/react-router/dist/production/index.mjs') },
      { find: '@', replacement: path.resolve(import.meta.dirname, './src') },
      { find: '@wasel/rbac', replacement: path.resolve(import.meta.dirname, './packages/rbac/src/index.ts') },
    ],
  },

  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: 'hidden',
    minify: 'esbuild',
    cssCodeSplit: true,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 400,
    rolldownOptions: {
      output: {
        // NOTE: there is intentionally NO `manualChunks` here.
        //
        // The previous hand-written vendor split created a circular import
        // between the `vendor` and `three-3d` chunks (vendor -> three-3d ->
        // vendor) and pulled three.js (~850 KB) into the eager entry graph.
        // The entry evaluated `three-3d` before `vendor`, so the browser threw
        //   "ReferenceError: Cannot access '...' before initialization"
        // before React mounted. No error boundary can catch that, so the page
        // stayed blank on mobile.
        //
        // Rollup's default chunking does not produce that cycle and keeps
        // three.js / react-three-fiber inside the lazy globe chunk.
        // Avoid Rollup's small-chunk merger on the browser entry: it folds
        // unrelated shared modules back into the initial download. Keep the
        // default graph splits and let route-level dynamic imports stay lazy.
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) return 'assets/css/[name]-[hash][extname]';
          if (
            assetInfo.name?.endsWith('.png') ||
            assetInfo.name?.endsWith('.jpg') ||
            assetInfo.name?.endsWith('.svg') ||
            assetInfo.name?.endsWith('.ico') ||
            assetInfo.name?.endsWith('.webp') ||
            assetInfo.name?.endsWith('.avif')
          ) return 'assets/images/[name]-[hash][extname]';
          return 'assets/[name]-[hash][extname]';
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
      },
    },
    esbuildOptions: {
      legalComments: 'none',
      treeShaking: true,
    },
  },

  server: {
    port: 5173,
    strictPort: false,
    // Never pop a browser window for CI / Playwright runs (scripts/start-playwright-dev.mjs
    // sets WASEL_NO_OPEN). Interactive `npm run dev` still opens one.
    open: !process.env.CI && process.env.WASEL_NO_OPEN !== 'true',
    host: '127.0.0.1',
    // The project lives under OneDrive and contains large non-web trees. Watching
    // them slows startup and can trigger spurious reloads mid-test.
    watch: {
      ignored: [
        '**/.kilo/**',
        '**/.venv/**',
        '**/mobile/**',
        '**/test-results/**',
        '**/artifacts/**',
        '**/dist/**',
      ],
    },
    // Pre-transform the landing/auth/core-flow modules at startup so the first
    // request does not pay the full cold-compile cost.
    warmup: {
      clientFiles: [
        './src/main.tsx',
        './src/App.tsx',
        './src/wasel-routes.tsx',
        './src/features/home/HomePage.tsx',
        './src/features/rides/FindRidePage.tsx',
        './src/features/rides/OfferRidePage.tsx',
        './src/features/packages/PackagesPage.tsx',
      ],
    },
  },

  css: {
    devSourcemap: false,
  },

  preview: {
    port: 4173,
    host: true,
  },

  optimizeDeps: {
    // Scan ONLY the real app entry. By default Vite crawls every index.html under
    // the project root, including the copies in .kilo/worktrees/* and mobile/,
    // which discovers extra deps late and triggers a mid-session re-optimise +
    // full page reload (the cause of pages hanging on the loading screen).
    entries: ['index.html'],
    include: [
      'react',
      'react-dom',
      'react-router',
      '@supabase/supabase-js',
      '@tanstack/react-query',
      'lucide-react',
      'sonner',
      'framer-motion',
      'recharts',
      'leaflet',
      'zod',
    ],
    // three.js + react-three are only loaded lazily on the globe section.
    // Keeping them out of the pre-bundle prevents ~1.2 MB from entering the
    // eager dependency graph. They must NOT appear in `include` above.
    exclude: ['@react-three/fiber', '@react-three/drei', 'three'],
  },
}));
