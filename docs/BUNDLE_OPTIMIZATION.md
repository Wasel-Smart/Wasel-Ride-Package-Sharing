# Bundle Optimization Strategy

## Overview

This document outlines the aggressive code-splitting strategy implemented to keep all JavaScript chunks under the 200KB budget.

## Strategy

### 1. Vendor Splitting

**React Ecosystem** - Split into separate chunks:
- `react` - Core React library
- `react-dom` - DOM rendering
- `react-router` - Routing library

**Data Layer** - Split by provider:
- `supabase` - Supabase client
- `tanstack-query` - TanStack Query

**UI Libraries** - Split by component type:
- `radix-dialogs` - Dialog and alert components
- `radix-menus` - Dropdown, select, popover
- `radix-core` - Other Radix UI components
- `icons` - Lucide React icons
- `ui-utils` - Sonner, Vaul, CMDK, Embla

**Heavy Libraries** - Isolated:
- `maps` - Leaflet (150KB)
- `motion` - Framer Motion animations
- `charts-d3` - D3 utilities
- `charts-recharts` - Recharts library
- `monitoring` - Sentry
- `payments` - Stripe
- `telemetry` - OpenTelemetry

### 2. Feature Splitting

Large feature modules are split into separate chunks:
- `feature-rides` - Ride finding and offering
- `feature-bus` - Bus booking
- `feature-wallet` - Wallet and payments
- `feature-operations` - Operations dashboard
- `feature-mobility` - Mobility OS

### 3. Lazy Loading

Features are loaded on-demand using React Router's lazy loading:
```typescript
{
  path: '/find-ride',
  lazy: () => import('./features/rides/FindRidePage')
}
```

## Budget Enforcement

### Build-Time Checks

1. **Vite Warning Limit**: Set to 200KB
2. **Bundle Analyzer**: `npm run build:optimized`
3. **CI Gate**: Fails if any chunk exceeds 200KB

### Monitoring

```bash
# Analyze current bundle
npm run build:optimized

# Check bundle budgets
npm run size

# Detailed analysis
npm run build:analyze
```

## Results

### Before Optimization
- Main chunk: 374KB ❌
- React core: 228KB ❌
- Data layer: 216KB ❌

### After Optimization
- All chunks: < 200KB ✅
- Total bundle: ~1.7MB
- Lazy-loaded features: On-demand

## Best Practices

1. **New Dependencies**: Consider bundle impact before adding
2. **Heavy Libraries**: Always split into separate chunks
3. **Feature Modules**: Use lazy loading for routes
4. **Regular Audits**: Run `npm run build:optimized` weekly

## Tools

- `npm run build:optimized` - Build with bundle analysis
- `npm run size` - Check size limits
- `npm run build:analyze` - Detailed bundle breakdown
- `scripts/optimize-bundle.mjs` - Custom analyzer

## References

- [Vite Code Splitting](https://vitejs.dev/guide/build.html#chunking-strategy)
- [React Router Lazy Loading](https://reactrouter.com/en/main/route/lazy)
- [Web Performance Budget](https://web.dev/performance-budgets-101/)
