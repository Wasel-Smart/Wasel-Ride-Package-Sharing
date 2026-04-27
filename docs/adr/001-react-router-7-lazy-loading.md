# ADR-001: React Router 7 with Lazy Loading

**Status**: Accepted

**Date**: 2024-01-15

**Deciders**: Engineering Team

---

## Context

We needed a routing solution that:
- Supports code splitting for optimal bundle sizes
- Provides type-safe route definitions
- Handles nested layouts efficiently
- Works seamlessly with React 18 concurrent features

## Decision

Adopt React Router 7 with lazy-loaded route components defined in `wasel-routes.tsx`.

All page components are loaded via `React.lazy()` to enable automatic code splitting at the route level.

## Consequences

### Positive

- **Smaller initial bundle**: Each route loads only when accessed
- **Better performance**: Users download only what they need
- **Type safety**: Full TypeScript support for route params and loaders
- **Nested layouts**: `WaselRoot` layout wraps all authenticated routes
- **Future-proof**: React Router 7 aligns with React Server Components roadmap

### Negative

- **Loading states**: Must handle Suspense boundaries for each lazy route
- **Prefetching complexity**: Need to manually prefetch critical routes
- **Bundle analysis**: Harder to track which components are in which chunks

### Neutral

- Migration from React Router 6 was straightforward
- No impact on existing context providers

## Alternatives Considered

1. **TanStack Router**: More type-safe but smaller ecosystem, less mature
2. **Next.js App Router**: Would require full framework migration
3. **Remix**: Excellent but requires server-side rendering setup

## References

- [React Router 7 Documentation](https://reactrouter.com/en/main)
- [Code Splitting Guide](https://react.dev/reference/react/lazy)
- Implementation: `src/wasel-routes.tsx`
