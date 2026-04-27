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
    limit: '210 KB',
    gzip: true,
  },
  {
    name: 'React Core',
    path: 'dist/assets/js/react-core-*.js',
    limit: '180 KB',
    gzip: true,
  },
  {
    name: 'Entry and Auth Surfaces',
    path: 'dist/assets/js/AppSurfaces-*.js',
    limit: '50 KB',
    gzip: true,
  },
  {
    name: 'Auth Callback',
    path: 'dist/assets/js/WaselAuthCallback-*.js',
    limit: '20 KB',
    gzip: true,
  },
  {
    name: 'Data Layer',
    path: 'dist/assets/js/data-layer-*.js',
    limit: '150 KB',
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
    name: 'Find Ride Experience',
    path: 'dist/assets/js/FindRidePage-*.js',
    limit: '80 KB',
    gzip: true,
  },
  {
    name: 'Total CSS',
    path: 'dist/assets/*.css',
    limit: '80 KB',
    gzip: true,
  },
];
