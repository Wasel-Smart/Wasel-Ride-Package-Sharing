# Wasel — Ride & Package Sharing

[![CI](https://img.shields.io/github/actions/workflow/status/Wasel-Smart/Wasel-Ride-Package-Sharing/ci.yml?branch=master&label=ci)](https://github.com/Wasel-Smart/Wasel-Ride-Package-Sharing/actions/workflows/ci.yml)
[![Security](https://img.shields.io/github/actions/workflow/status/Wasel-Smart/Wasel-Ride-Package-Sharing/security.yml?branch=master&label=security)](https://github.com/Wasel-Smart/Wasel-Ride-Package-Sharing/actions/workflows/security.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![OpenAPI](https://img.shields.io/badge/OpenAPI-v1-6BA539?logo=openapiinitiative&logoColor=white)](./docs/openapi/)
[![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

Jordan-focused mobility and logistics platform — shared rides, package handoff delivery, corridor-based transport discovery, bus booking, and operator workflows.

**Live app:** [wasel14.online](https://wasel14.online)

---

## Implementation status

| Layer | Status | Notes |
|---|---|---|
| Web client | ✅ Production | Deployed on Vercel |
| Auth & wallet | ✅ Production | Supabase Auth + Stripe |
| Domain contracts | ✅ Complete | Events, queues, SLOs defined |
| Infrastructure | ✅ Ready | Kubernetes manifests, Docker, k6 |
| Backend services | 🔄 In progress | Skeletons complete; DB layer being wired |
| Mobile apps | 🔄 In progress | Service layer done; UI screens in development |

> Honest audit: [docs/HONEST_AUDIT_REPORT.md](./docs/HONEST_AUDIT_REPORT.md) — 8.5 / 10 with a clear path to 10.

---

## Architecture

Event-driven, service-oriented, DDD-inspired. Strict separation between client, services, and async workers.

```mermaid
flowchart TB
  Web["Web Client (React)"]
  Mobile["Mobile Apps (React Native)"]
  Gateway["API Gateway / Edge Layer"]
  Ride["Ride Matching Service"]
  Package["Package Delivery Service"]
  Payment["Payment Service"]
  Trust["Trust & Operations Service"]
  EventBus["Redis Streams (Event Bus)"]
  MatchWorker["Matching Worker"]
  PayWorker["Payment Worker"]
  OpsWorker["Analytics Worker"]
  DB[(PostgreSQL + PostGIS)]
  Geo[(Redis GEO Cache)]

  Web --> Gateway
  Mobile --> Gateway
  Gateway --> Ride & Package & Payment & Trust
  Ride & Package & Payment --> EventBus
  EventBus --> MatchWorker & PayWorker & OpsWorker
  MatchWorker & PayWorker & OpsWorker --> DB
  MatchWorker --> Geo
```

See [docs/architecture.md](./docs/architecture.md) for the full design, sequence diagrams, and scalability posture.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript 5, Vite 6 |
| Routing | React Router 7 |
| Styling | Tailwind CSS 4, Radix UI |
| Data / Auth | Supabase (Postgres + PostGIS + Auth) |
| State | TanStack Query v5 |
| Payments | Stripe |
| Monitoring | Sentry, Vercel Analytics |
| Testing | Vitest, Playwright, k6 |
| Infra | Docker, Kubernetes, Redis Streams |
| Mobile | React Native (in progress) |

---

## Quick start

```bash
npm ci
cp .env.example .env        # fill in required values
npm run dev
```

### Useful commands

| Command | Purpose |
|---|---|
| `npm run build` | Production build |
| `npm run test` | Unit tests |
| `npm run test:coverage` | Coverage report |
| `npm run test:e2e` | End-to-end tests (Playwright) |
| `npm run type-check` | TypeScript validation |
| `npm run lint` | ESLint (zero warnings) |
| `npm run verify` | Full quality gate |
| `npm run verify:contracts` | OpenAPI + infra contract validation |

---

## Project structure

```
src/
  features/        Route-level user experiences
  domain/          Canonical domain models and event types
  platform/        Event bus, service topology, queue contracts, RBAC, observability
  services/        Backend-facing orchestration and fallback adapters
  components/      Shared UI components
  utils/           Security, monitoring, validation, performance helpers
  locales/         Arabic and English translations
backend/
  services/        Ride matching, payment reconciliation, ops analytics (in progress)
infra/
  kubernetes/      Deployment manifests with dev / staging / prod overlays
  observability/   Prometheus, Grafana configs
mobile/            React Native app (service layer complete, UI in progress)
supabase/          Local config, edge functions, schema, migrations, seeds
tests/             Unit, integration, e2e, and load tests
docs/              Architecture, API contract, SLOs, runbooks
```

---

## Documentation

- [Architecture overview](./docs/architecture.md)
- [API contract](./docs/api-contract.md)
- [Reliability SLOs](./docs/reliability-slos.md)
- [Security & identity model](./docs/security-and-identity.md)
- [Workers & queues](./docs/workers-and-queues.md)
- [Observability guide](./docs/observability.md)
- [Production deployment guide](./docs/PRODUCTION_DEPLOYMENT_GUIDE.md)
- [Production runbook](./docs/PRODUCTION_RUNBOOK.md)
- [Contributing](./CONTRIBUTING.md)
- [Changelog](./CHANGELOG.md)

---

## Security

Vulnerabilities should be reported privately via [GitHub Security Advisories](https://github.com/Wasel-Smart/Wasel-Ride-Package-Sharing/security/advisories/new) — see [SECURITY.md](./SECURITY.md).

Never commit `.env` files or credentials. The `.gitignore` blocks all `.env.*` variants, certificates, and token files. CI includes CodeQL scanning and dependency auditing on every push.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Before opening a PR run `npm run verify:ci`. Use `npm run verify:contracts` when touching OpenAPI specs, infra configs, or async topology.

---

## License

[MIT](./LICENSE)
