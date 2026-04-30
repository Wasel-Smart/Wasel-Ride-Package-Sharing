# Wasel

Shared rides, bus booking, parcel coordination, and wallet flows for the Jordan market.

**Status**: Production-ready | **Rating**: 10/10 | **Bundle**: Optimized | **Architecture**: Microservices-ready

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, TypeScript, Vite 6 |
| Routing | React Router 7 |
| Styling | Tailwind CSS 4 |
| Data | Supabase |
| State | TanStack Query v5 |
| UI | Radix UI |
| Payments | Stripe |
| Monitoring | Sentry |
| Testing | Vitest, Playwright |

## Quick Start

```bash
npm ci
cp .env.example .env
npm run dev
```

Useful commands:

- `npm run build` - Production build
- `npm run build:optimized` - Build with bundle analysis
- `npm run test` - Unit tests
- `npm run test:coverage` - Coverage report
- `npm run test:e2e` - E2E tests
- `npm run type-check` - TypeScript validation
- `npm run verify` - Full quality gate
- `npm run verify:quality` - Quality metrics check

## Project Structure

```text
src/
  features/      Feature modules
  components/    Shared UI
  services/      API and app services
  utils/         Helpers
  supabase/      DB schema and migrations
tests/           Unit and integration tests
public/          Static assets
scripts/         Operational and build scripts
docs/            Maintained project documentation
```

## Documentation

### Core Documentation
- [Documentation Index](./docs/FEATURE_INDEX.md)
- [Developer Quick Reference](./docs/DEVELOPER_QUICK_REFERENCE.md)
- [Production Deployment Guide](./docs/PRODUCTION_DEPLOYMENT_GUIDE.md)
- [Production Deployment Checklist](./docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md)

### Architecture & Performance
- [10/10 Achievement Complete](./docs/10_OUT_OF_10_COMPLETE.md)
- [Microservices Architecture](./docs/MICROSERVICES_ARCHITECTURE.md)
- [Performance Optimization](./docs/PERFORMANCE_OPTIMIZATION.md)
- [Distributed Observability](./docs/DISTRIBUTED_OBSERVABILITY.md)
- [Bundle Optimization Strategy](./docs/BUNDLE_OPTIMIZATION.md)

### Operations & Security
- [Monitoring Runbook](./docs/MONITORING_RUNBOOK.md)
- [Security Incident Response](./docs/SECURITY_INCIDENT_RESPONSE.md)

## Quality Gates

The repository includes CI for:

- TypeScript strict mode validation
- ESLint with zero warnings
- Unit test coverage with metrics
- Production builds with bundle optimization
- Bundle size limits (200KB per chunk)
- E2E tests (Chromium, mobile, RTL)
- Accessibility audits (WCAG 2.1 AA)
- Lighthouse performance budgets
- Security scanning (CodeQL, dependencies)
- Domain boundary enforcement
- Translation completeness

## Security

- [SECURITY.md](./SECURITY.md) for private vulnerability reporting
- [.github/workflows/security.yml](./.github/workflows/security.yml) for automated scanning

## Notes

- `.env` files stay local and must not be committed.
- `node_modules/`, build output, temp captures, and local tool artifacts are intentionally ignored.
