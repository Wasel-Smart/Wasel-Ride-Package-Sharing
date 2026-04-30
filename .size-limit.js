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
    limit: '80 KB',
    gzip: true,
  },
  {
    name: 'React Core',
    path: 'dist/assets/js/react-core-*.js',
    limit: '20 KB',
    gzip: true,
  },
  {
    name: 'Router Runtime',
    path: 'dist/assets/js/react-router-*.js',
    limit: '40 KB',
    gzip: true,
  },
  {
    name: 'Auth Experience',
    path: 'dist/assets/js/WaselAuth-*.js',
    limit: '20 KB',
    gzip: true,
  },
  {
    name: 'Auth Callback',
    path: 'dist/assets/js/WaselAuthCallback-*.js',
    limit: '10 KB',
    gzip: true,
  },
  {
    name: 'Translations',
    path: 'dist/assets/js/translations-*.js',
    limit: '50 KB',
    gzip: true,
  },
  {
    name: 'Supabase Client',
    path: 'dist/assets/js/supabase-*.js',
    limit: '70 KB',
    gzip: true,
  },
  {
    name: 'Maps',
    path: 'dist/assets/js/maps-*.js',
    limit: '50 KB',
    gzip: true,
  },
  {
    name: 'Find Ride Experience',
    path: 'dist/assets/js/FindRidePage-*.js',
    limit: '25 KB',
    gzip: true,
  },
  {
    name: 'Total CSS',
    path: 'dist/assets/*.css',
    limit: '60 KB',
    gzip: true,
  },
];
