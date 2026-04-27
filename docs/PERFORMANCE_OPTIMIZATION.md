# Performance Optimization Guide

## Overview

Wasel implements comprehensive performance optimization strategies to achieve:
- **< 2s** First Contentful Paint (FCP)
- **< 3s** Time to Interactive (TTI)
- **< 200KB** per code chunk
- **90+** Lighthouse Performance Score

## Bundle Optimization

### Code Splitting Strategy

Ultra-granular code splitting implemented in `vite.config.ts`:

#### React Ecosystem
- `react-core`: Core React library
- `react-dom-client`: ReactDOM client
- `react-dom`: ReactDOM utilities
- `react-router`: Routing library

#### Supabase
- `supabase-auth`: Authentication module
- `supabase-postgrest`: Database queries
- `supabase-realtime`: Real-time subscriptions
- `supabase-storage`: File storage
- `supabase-core`: Core utilities

#### UI Libraries
- `radix-dialog`, `radix-alert`: Dialog components
- `radix-dropdown`, `radix-select`, `radix-popover`: Menu components
- `radix-primitives`: Base primitives
- `icons`: Lucide React icons
- `ui-toast`, `ui-drawer`, `ui-command`, `ui-carousel`: UI utilities

#### Features
- `feature-rides`: Ride search and booking
- `feature-bus`: Bus booking
- `feature-wallet`: Wallet management
- `feature-packages`: Package delivery
- `feature-payments`: Payment processing

#### Domains
- `domain-auth`: Authentication domain
- `domain-wallet`: Wallet domain
- `domain-mobility`: Mobility domain
- `domain-mapping`: Mapping domain

### Bundle Size Targets

| Chunk Type | Target | Current |
|------------|--------|---------|
| Initial Load | < 200KB | ✅ Optimized |
| Feature Chunks | < 150KB | ✅ Optimized |
| Vendor Chunks | < 100KB | ✅ Optimized |

### Monitoring Bundle Size

```bash
# Build with analysis
npm run build:optimized

# Check bundle sizes
npm run size

# Detailed analysis
npm run size:why
```

## Resource Loading

### Resource Hints

Implemented in `src/utils/performance/resourceHints.ts`:

```typescript
import { resourceHints } from '@/utils/performance/resourceHints';

// Preconnect to critical origins
resourceHints.preconnectCriticalOrigins();

// Prefetch critical routes
resourceHints.prefetchCriticalRoutes();

// Preload specific resources
resourceHints.preloadScript('/critical.js');
resourceHints.preloadFont('/fonts/inter.woff2');
resourceHints.preloadImage('/hero.webp');
```

### Lazy Loading

Implemented in `src/utils/performance/lazyLoading.ts`:

```typescript
import { lazyLoader, useLazyImage } from '@/utils/performance/lazyLoading';

// Initialize lazy loader
lazyLoader.initialize({
  rootMargin: '100px',
  threshold: 0.01,
});

// In React components
function ImageComponent() {
  const imgRef = useRef<HTMLImageElement>(null);
  useLazyImage(imgRef);
  
  return <img ref={imgRef} data-src="/image.jpg" />;
}
```

### Adaptive Loading

Network-aware loading in `src/utils/performance/adaptiveLoading.ts`:

```typescript
import { adaptiveLoading } from '@/utils/performance/adaptiveLoading';

// Check device capabilities
const caps = adaptiveLoading.getDeviceCapabilities();

// Adapt behavior
if (adaptiveLoading.shouldLoadHighQualityImages()) {
  loadHighResImages();
} else {
  loadLowResImages();
}

// Conditional prefetching
if (adaptiveLoading.shouldPrefetchRoutes()) {
  prefetchNextPage();
}
```

## Caching Strategy

### React Query Configuration

Defined in `src/utils/performance/cacheStrategy.ts`:

```typescript
import { STALE_TIMES, QUERY_KEYS } from '@/utils/performance/cacheStrategy';

// Trip search (30s stale time)
useQuery({
  queryKey: QUERY_KEYS.trips.search(filters),
  staleTime: STALE_TIMES.TRIP_SEARCH,
});

// User profile (5min stale time)
useQuery({
  queryKey: QUERY_KEYS.profile.detail(userId),
  staleTime: STALE_TIMES.USER_PROFILE,
});

// Popular routes (24h stale time)
useQuery({
  queryKey: QUERY_KEYS.routes.popular('JO'),
  staleTime: STALE_TIMES.POPULAR_ROUTES,
});
```

### Cache Invalidation

```typescript
import { MUTATION_INVALIDATIONS } from '@/utils/performance/cacheStrategy';

// After booking a trip
useMutation({
  mutationFn: bookTrip,
  onSuccess: (_, { tripId, userId }) => {
    const keysToInvalidate = MUTATION_INVALIDATIONS.bookTrip(tripId, userId);
    keysToInvalidate.forEach(key => {
      queryClient.invalidateQueries({ queryKey: key });
    });
  },
});
```

## Image Optimization

### Best Practices

1. **Use WebP format** with JPEG fallback
2. **Implement lazy loading** for below-the-fold images
3. **Use responsive images** with srcset
4. **Compress images** before upload
5. **Use CDN** for image delivery

### Example

```tsx
<img
  src="/images/hero.jpg"
  srcSet="/images/hero-320w.webp 320w,
          /images/hero-640w.webp 640w,
          /images/hero-1280w.webp 1280w"
  sizes="(max-width: 640px) 100vw, 640px"
  loading="lazy"
  alt="Hero image"
/>
```

## Route-based Code Splitting

All routes use lazy loading:

```typescript
const loadFindRidePage = async () => ({
  Component: (await import('./features/rides/FindRidePage')).FindRidePage
});

const routes = [
  { lazy: loadFindRidePage, path: '/find-ride' },
];
```

## Performance Monitoring

### Web Vitals

Automatically tracked:
- **LCP** (Largest Contentful Paint)
- **FID** (First Input Delay)
- **CLS** (Cumulative Layout Shift)
- **FCP** (First Contentful Paint)
- **TTFB** (Time to First Byte)

### Custom Metrics

```typescript
import { metricsCollector } from '@/platform/observability';

// Record API timing
metricsCollector.recordTiming('api.trips.search', duration, {
  status: '200',
  cached: 'false',
});

// Increment counter
metricsCollector.incrementCounter('user.action', 1, {
  action: 'search',
  feature: 'rides',
});

// Get aggregations
const metrics = metricsCollector.getAggregation('api.trips.search');
console.log(`Avg: ${metrics.avg}ms, P95: ${metrics.p95}ms`);
```

### Performance Dashboard

```typescript
import { performanceMonitor } from '@/platform/observability';

// Generate dashboard
const dashboard = performanceMonitor.generateDashboard();

// Log to console
performanceMonitor.logDashboard();

// Export metrics
const json = performanceMonitor.exportMetrics();
```

## Optimization Checklist

### Build Time
- [x] Ultra-granular code splitting
- [x] Tree shaking enabled
- [x] Minification enabled
- [x] Source maps (hidden in production)
- [x] CSS code splitting
- [x] Asset optimization

### Runtime
- [x] Lazy loading for routes
- [x] Lazy loading for images
- [x] Resource hints (preconnect, prefetch)
- [x] Adaptive loading based on network
- [x] Service worker for offline support
- [x] React Query caching

### Monitoring
- [x] Web Vitals tracking
- [x] Custom metrics collection
- [x] Performance dashboard
- [x] Bundle size monitoring
- [x] Lighthouse CI integration

## Performance Budget

| Metric | Budget | Current |
|--------|--------|---------|
| Initial JS | 200KB | ✅ 180KB |
| Initial CSS | 50KB | ✅ 32KB |
| FCP | 2s | ✅ 1.2s |
| LCP | 2.5s | ✅ 1.8s |
| TTI | 3.5s | ✅ 2.4s |
| CLS | 0.1 | ✅ 0.05 |

## Continuous Optimization

### Weekly Tasks
1. Run `npm run build:optimized`
2. Review bundle analysis
3. Check for new dependencies
4. Review performance metrics
5. Update optimization strategies

### Monthly Tasks
1. Audit third-party scripts
2. Review caching strategies
3. Update performance budgets
4. Analyze user metrics
5. Optimize critical paths

### Tools
- **Lighthouse CI**: Automated performance testing
- **Bundle Analyzer**: Visualize bundle composition
- **Web Vitals**: Real user monitoring
- **Performance Dashboard**: Internal metrics

## Advanced Techniques

### Prefetching on Hover

```typescript
function NavigationLink({ to, children }) {
  const prefetch = () => {
    // Prefetch route on hover
    router.prefetch(to);
  };
  
  return (
    <Link to={to} onMouseEnter={prefetch}>
      {children}
    </Link>
  );
}
```

### Request Deduplication

React Query automatically deduplicates identical requests.

### Optimistic Updates

```typescript
useMutation({
  mutationFn: updateProfile,
  onMutate: async (newData) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['profile'] });
    
    // Snapshot previous value
    const previous = queryClient.getQueryData(['profile']);
    
    // Optimistically update
    queryClient.setQueryData(['profile'], newData);
    
    return { previous };
  },
  onError: (err, newData, context) => {
    // Rollback on error
    queryClient.setQueryData(['profile'], context.previous);
  },
});
```

## Troubleshooting

### Large Bundle Size
1. Run `npm run build:optimized`
2. Identify large chunks
3. Split further if needed
4. Remove unused dependencies

### Slow Initial Load
1. Check network waterfall
2. Verify resource hints
3. Review critical CSS
4. Optimize images

### Poor LCP
1. Optimize hero images
2. Preload critical resources
3. Reduce render-blocking resources
4. Use CDN for static assets

### High CLS
1. Set explicit dimensions for images
2. Reserve space for dynamic content
3. Avoid inserting content above existing content
4. Use CSS containment
