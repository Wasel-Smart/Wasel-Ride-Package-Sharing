# Wasel Project Audit Report

## Status: UNVERIFIED — do not trust the scores below without re-running CI

Previous versions of this file reported per-area scores of 8–9.5/10 and labeled every
layer "Production-grade." Those numbers were not backed by a passing build. As of this
revision, `test-results/.last-run.json` reports:

```json
{ "status": "failed", "failedTests": [] }
```

An empty `failedTests` array alongside a `"failed"` top-level status means the last run
did not complete cleanly (crashed, timed out, or errored before individual test results
were recorded) — this is worse than a normal failure list, not better. This has not been
diagnosed yet.

**No category in this document should be re-scored until someone has actually run, in
order, and pasted the real output of:**

```
npm run type-check
npm run lint
npm run test:unit
npm run test:e2e
npm run build
```

## Overview

The Wasel repository is a monorepo containing a React 19 + Vite 6 web client, a React
Native (Expo SDK 51) mobile client, Supabase Edge Functions (Deno), Postgres migrations
with PostGIS, and CI/CD scaffolding.

## Known-true facts (verifiable from the filesystem, not from prior claims)

- `src/platform/`, `src/domain/`, `src/features/` exist and contain real, structured code
  (event bus, typed service topology, RBAC middleware) — architecture work is genuine.
- `supabase/migrations/` contains a substantial migration history with PostGIS usage.
- OAuth E2E tests were reported failing by the prior version of this document; that
  claim has not been re-verified and should be re-checked, not assumed fixed.
- `.env.example` correctly separates `VITE_`-prefixed client vars from server-only
  secrets (`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, etc.) — this is good
  practice and holds up on inspection.

## What this document is NOT

This is not a certification that the project is "production-grade." Per-layer scores
will be added back to this file only after each is backed by a command someone actually
ran and output someone actually read.

## Last edited

August 2026 — scores removed pending real verification. See `mobile/HONEST_AUDIT_REPORT.md`
for the mobile-specific version of this same correction.
