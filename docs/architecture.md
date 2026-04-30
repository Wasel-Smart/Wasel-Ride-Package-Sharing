# Architecture Overview

## Application shape

Wasel is a React 18 + TypeScript single-page application built with Vite. It serves multiple mobility workflows from one shell:

- Shared rides
- Driver supply
- Package delivery
- Bus corridors
- Operations and trust surfaces

## Structure

- `src/features`: route-level product areas and major workflows
- `src/components`: reusable interface building blocks
- `src/services`: backend-facing APIs and fallback adapters
- `src/utils`: configuration, security, monitoring, and shared helpers
- `src/contexts`: auth, language, and application-wide runtime state
- `src/supabase`: schema, migrations, and seed artifacts
- `tests`: unit, integration-style service tests, and Playwright coverage

## Backend strategy

The frontend prefers the secured edge/backend contract exposed through `src/services/core.ts`.

When the edge contract is unavailable, specific read or degraded-mode paths may fall back to direct Supabase adapters. That fallback behavior is explicitly gated through environment configuration and should remain disabled in production unless used for a controlled recovery drill.

## Quality gates

- Static analysis: ESLint
- Type safety: TypeScript `--noEmit`
- Unit and service verification: Vitest
- Route and UI verification: Playwright
- Production packaging: Vite build output synced into `build/`
