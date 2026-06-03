# Production Readiness Architecture Baseline

This repository enforces a production-grade internal architecture with clear ownership boundaries:

- `src/ui`: presentational primitives and UI-only state. UI code must not call Supabase, `fetch`, or create API clients directly.
- `src/features`: feature modules that compose business flows, page controllers, and domain-specific hooks.
- `src/services`: API clients, Supabase integration, external providers, data validation, retries, and telemetry.
- `src/hooks`: reusable cross-feature React hooks only.
- `src/lib` and `src/utils`: framework-agnostic utilities only.
- `src/design-system`: tokens, reusable Button/Input/Card/Tabs/Select/Layout components, and design-system CSS.

## Data layer standard

All server communication is routed through service functions and consumed through React Query. The canonical query client is `createWaselQueryClient`, which centralizes:

- cache stale/gc times from `src/utils/performance/cacheStrategy.ts`;
- retry policy for reads and critical mutations;
- request de-duplication through stable query keys;
- centralized query/mutation error logging and user-facing toast feedback.

## Quality gates

The production baseline is protected by these checks:

- `npm run check:design-system` rejects inline styles and hardcoded color literals in active app surfaces.
- `npm run check:domain-boundaries` rejects domain-layer dependency inversions.
- `npm run check:no-inline-api-in-ui` rejects network/Supabase calls from enforced UI directories.
- `npm run size` protects bundle budgets and tree-shaking regressions.
- `npm run test:lhci` collects the Lighthouse baseline; the target for production routes is a 90+ performance score.

## Known technical debt

Some legacy folders (`src/components`, `src/pages`, and `src/contexts`) still exist for compatibility. New work should land in `src/ui`, `src/features`, `src/services`, or `src/hooks`, and legacy modules should be migrated opportunistically without adding product features.
