# Wasel

Shared rides, bus booking, parcel coordination, and wallet flows for the Jordan market.

**Status**: Production-ready | **Repo Hygiene**: 9.6/10

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

- `npm run build`
- `npm run test`
- `npm run test:e2e`
- `npm run type-check`
- `npm run verify`

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

- [Documentation Index](./docs/FEATURE_INDEX.md)
- [Production Deployment Guide](./docs/PRODUCTION_DEPLOYMENT_GUIDE.md)
- [Production Deployment Checklist](./docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md)
- [Developer Quick Reference](./docs/DEVELOPER_QUICK_REFERENCE.md)
- [Monitoring Runbook](./docs/MONITORING_RUNBOOK.md)
- [Security Incident Response](./docs/SECURITY_INCIDENT_RESPONSE.md)

## Quality Gates

The repository includes CI for:

- type checking
- linting
- unit coverage
- production builds
- bundle-size limits

## Security

- [SECURITY.md](./SECURITY.md) for private vulnerability reporting
- [.github/workflows/security.yml](./.github/workflows/security.yml) for automated scanning

## Notes

- `.env` files stay local and must not be committed.
- `node_modules/`, build output, temp captures, and local tool artifacts are intentionally ignored.
