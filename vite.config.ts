import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import legacy from '@vitejs/plugin-legacy';
import path from 'path';
import { Plugin } from 'vite';

// CSP nonce plugin to replace unsafe-inline
function cspNoncePlugin(): Plugin {
  return {
    name: 'csp-nonce',
    transformIndexHtml: {
      order: 'pre',
      handler(html: string) {
        const nonce = `wasel-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        return {
          html: html.replace(
            /<script([^>]*)>/g,
            `<script$1 nonce="${nonce}">`
          ).replace(
            /<style([^>]*)>/g,
            `<style$1 nonce="${nonce}">`
          ),
          tags: [{
            tag: 'meta',
            attrs: {
              name: 'csp-nonce',
              content: nonce
            },
            injectTo: 'head'
          }]
        };
      }
    }
  };
}

export default defineConfig({
  define: {
    'import.meta.env.VITE_E2E_LOCAL_AUTH': JSON.stringify(process.env.VITE_E2E_LOCAL_AUTH ?? ''),
    'import.meta.env.VITE_ENABLE_DEMO_DATA': JSON.stringify(process.env.VITE_ENABLE_DEMO_DATA ?? ''),
  },

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

    cspNoncePlugin(),
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
