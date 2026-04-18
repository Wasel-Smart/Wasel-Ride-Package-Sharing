# ADR-005: Manual Code Splitting Strategy

**Status**: Accepted

**Date**: 2024-02-10

**Deciders**: Engineering Team

---

## Context

Vite's automatic code splitting was creating too many small chunks, leading to:
- Excessive HTTP requests (50+ chunks on initial load)
- Poor caching efficiency (vendor code mixed with app code)
- Unpredictable bundle sizes
- Difficulty tracking what's in each chunk

We needed a deterministic chunking strategy that optimizes for:
- Minimal initial load
- Maximum cache hit rate
- Predictable bundle sizes

## Decision

Implement manual code splitting in `vite.config.ts` using `manualChunks` with these rules:

### Core Chunks (Always Loaded)
- **react-core**: React, ReactDOM, React Router, Scheduler
- **app-shell**: App.tsx, layouts, navigation, consent banner
- **auth-runtime**: Auth context, Supabase auth, login/callback pages

### Feature Chunks (Lazy Loaded)
- **data-layer**: Supabase client, TanStack Query
- **ui-primitives**: Radix UI components, Lucide icons
- **maps**: Leaflet and map components
- **charts**: Recharts and D3 dependencies
- **forms**: React Hook Form, date pickers
- **payments**: Stripe SDK
- **monitoring**: Sentry (split into core/browser/react/replay)

### Budget Enforcement
- CI fails if any chunk exceeds 200 KB
- Total bundle warning at 1 MB

## Consequences

### Positive

- **Predictable bundles**: Know exactly what's in each chunk
- **Better caching**: Vendor code changes less frequently than app code
- **Faster builds**: Fewer chunks = less overhead
- **Easier debugging**: Clear chunk names in DevTools
- **Performance budget**: Automated enforcement in CI

### Negative

- **Manual maintenance**: Must update rules when adding large dependencies
- **Over-chunking risk**: Too many rules can create too many chunks
- **Initial setup complexity**: Requires understanding of dependency graph

### Neutral

- Need to monitor bundle sizes regularly
- May need to adjust rules as app grows

## Alternatives Considered

1. **Automatic splitting**: Too unpredictable, creates 50+ chunks
2. **Single vendor bundle**: Too large (>500 KB), poor caching
3. **Route-based splitting only**: Doesn't optimize vendor code

## References

- Implementation: `vite.config.ts` lines 50-180
- CI enforcement: `.github/workflows/ci.yml` (bundle size gate)
- [Vite Manual Chunking Guide](https://vitejs.dev/guide/build.html#chunking-strategy)
