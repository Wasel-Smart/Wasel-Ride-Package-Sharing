/**
 * Bundle Size Limits
 * 
 * Enforces maximum bundle sizes for critical chunks.
 * Run: npm run size
 * 
 * Limits are based on:
 * - 3G network: ~400 KB/s
 * - Target: < 3s initial load
 * - Budget: ~1.2 MB total (gzipped)
 */

export default [
  {
    name: 'Initial Load (Critical Path)',
    path: 'dist/assets/js/index-*.js',
    limit: '150 KB',
    gzip: true,
  },
  {
    name: 'React Core',
    path: 'dist/assets/js/react-core-*.js',
    limit: '180 KB',
    gzip: true,
  },
  {
    name: 'App Shell',
    path: 'dist/assets/js/app-shell-*.js',
    limit: '80 KB',
    gzip: true,
  },
  {
    name: 'Auth Runtime',
    path: 'dist/assets/js/auth-runtime-*.js',
    limit: '60 KB',
    gzip: true,
  },
  {
    name: 'Data Layer',
    path: 'dist/assets/js/data-layer-*.js',
    limit: '120 KB',
    gzip: true,
  },
  {
    name: 'UI Primitives',
    path: 'dist/assets/js/ui-primitives-*.js',
    limit: '200 KB',
    gzip: true,
  },
  {
    name: 'Maps',
    path: 'dist/assets/js/maps-*.js',
    limit: '180 KB',
    gzip: true,
  },
  {
    name: 'Charts',
    path: 'dist/assets/js/charts-*.js',
    limit: '150 KB',
    gzip: true,
  },
  {
    name: 'Total CSS',
    path: 'dist/assets/**/*.css',
    limit: '80 KB',
    gzip: true,
  },
];
