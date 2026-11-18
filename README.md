# Wasel

Shared intercity rides, bus booking, parcel coordination, and wallet services for the Jordan market.

**Release status: remediation in progress. Production readiness has not been independently verified.**

This repository is the application source of truth. Do not interpret the presence of integrations, migrations, workflows, or documentation as evidence that the corresponding production services are configured or operational.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, TypeScript, Vite 6 |
| Routing | React Router 7 |
| Styling | Tailwind CSS 4 |
| Data | Supabase / PostgreSQL |
| State | TanStack Query v5 |
| UI | Radix UI |
| Payments | Stripe integration (provider and settlement verification required) |
| Monitoring | Sentry integration (configuration verification required) |
| Testing | Vitest, Playwright |

## Release readiness

A release may be approved only after the following evidence is available for the exact candidate commit and target environment:

- Dependency audit has no unresolved high or critical vulnerabilities.
- Type checking, strict lint, formatting, unit tests, coverage, production build, and bundle budgets pass.
- Core-flow, accessibility, Arabic RTL, and Lighthouse E2E workflows pass.
- Supabase migrations have been executed and verified on a disposable/staging database matching the target PostgreSQL version.
- RLS, grants, SECURITY DEFINER functions, storage policies, booking concurrency, and payment-ledger invariants have been reviewed against the effective schema.
- Payment webhooks, settlement retries, refunds, and escrow transitions pass provider-backed integration tests.
- Production Supabase project identity, Edge Function versions, required secrets, Vercel project/domain mapping, backups, and recovery procedures are verified.
- Required Jordanian regulatory determinations are documented before passenger transport operations are enabled.

A successful static check or CI workflow does not establish production database correctness, provider settlement, regulatory approval, or a successful live deployment.

## Quick start

```bash
npm ci
cp .env.example .env
npm run dev
```

## Useful commands

- `npm run build` - Production build
- `npm run build:optimized` - Optimized build and bundle checks
- `npm run test` - Unit tests
- `npm run test:coverage` - Coverage report
- `npm run test:e2e` - Browser end-to-end tests
- `npm run type-check` - TypeScript validation
- `npm run verify` - Repository quality gate
- `npm run verify:full` - Full repository verification
- `npm run verify:supabase-rollout` - Static migration registry and rollout checks

## Project structure

```text
src/
  features/      Feature modules
  components/    Shared UI
  services/      API and app services
  utils/         Helpers
  supabase/      Database schema and migrations
tests/           Unit and integration tests
public/          Static assets
scripts/         Operational and build scripts
docs/            Maintained project documentation
supabase/        Edge Functions and Supabase configuration
```

## Documentation

- [Documentation Index](./docs/FEATURE_INDEX.md)
- [Developer Quick Reference](./docs/DEVELOPER_QUICK_REFERENCE.md)
- [Production Deployment Guide](./docs/PRODUCTION_DEPLOYMENT_GUIDE.md)
- [Production Deployment Checklist](./docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md)
- [Performance Optimization](./docs/PERFORMANCE_OPTIMIZATION.md)
- [Monitoring Runbook](./docs/MONITORING_RUNBOOK.md)
- [Security Incident Response](./docs/SECURITY_INCIDENT_RESPONSE.md)

## Security

- [Security policy](./SECURITY.md)
- [Security workflow](./.github/workflows/security.yml)

## Repository hygiene

- Never commit `.env` files, credentials, provider secrets, or production database dumps.
- Keep production deployment gated on successful CI for the exact `master` commit.
- Do not bypass failed quality gates or use a numeric quality claim without reproducible evidence.
- Keep production database changes separate from application code review and validate migrations in staging first.
