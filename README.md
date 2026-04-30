# Wasel Ride & Package Sharing

[![CI](https://img.shields.io/github/actions/workflow/status/Wasel-Smart/Wasel-Ride-Package-Sharing/ci.yml?branch=master&label=ci)](https://github.com/Wasel-Smart/Wasel-Ride-Package-Sharing/actions/workflows/ci.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3FCF8E?logo=supabase&logoColor=white)

Wasel is a Jordan-focused mobility platform for shared rides, package handoff logistics, bus corridor discovery, trust workflows, and operator-facing mobility surfaces. The repository contains the production web client, runtime integrations, Supabase schema assets, and automated verification for core flows.

## Why this repo is production-oriented

- Type-safe React 18 + Vite application with route-level feature boundaries
- Supabase-backed auth and data flows with explicit degraded-mode handling
- Unit, service, and browser-level verification already wired into the codebase
- CI automation for type-checking, linting, tests, and production builds
- Contribution, security, and issue templates for maintainable team collaboration

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, TypeScript, Vite 6 |
| Routing | React Router 7 |
| Styling | Tailwind CSS 4 |
| Data and auth | Supabase |
| State and caching | TanStack Query |
| UI primitives | Radix UI |
| Monitoring | Sentry |
| Testing | Vitest, Playwright |

## Repository structure

```text
src/
  features/       Route-level product areas
  components/     Shared UI and branded building blocks
  services/       Backend contract and direct fallback adapters
  utils/          Config, security, monitoring, and helpers
  contexts/       App-wide runtime state
  supabase/       Schema, migrations, and seed data
tests/
  unit/           Unit and service tests
  e2e/            Playwright end-to-end coverage
docs/
  architecture.md System shape and backend strategy
  testing.md      Verification workflow
```

## Getting started

### Prerequisites

- Node.js 20.10+
- npm 10+

### Local setup

```bash
npm install
cp .env.example .env
npm run dev
```

The app expects client-safe Supabase credentials and other `VITE_*` settings in `.env`. Never commit `.env` files or provider secrets.

## Core scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run type-check` | Run TypeScript in no-emit mode |
| `npm run lint` | Enforce ESLint rules |
| `npm run test:unit` | Run Vitest unit and service tests |
| `npm run test:e2e` | Run Playwright browser tests |
| `npm run build` | Produce a production build and sync build output |
| `npm run verify:ci` | CI-grade quality gate |
| `npm run verify` | Full local verification including Playwright |

## Quality workflow

1. Make the change.
2. Run `npm run verify:ci`.
3. Run `npm run verify` if the change affects browser flows or route behavior.
4. Open a pull request with screenshots for visible UI changes.

The GitHub Actions workflow at `.github/workflows/ci.yml` runs the CI-grade gate on pushes to `master` and on pull requests.

## Architecture and docs

- [Architecture overview](./docs/architecture.md)
- [Testing guide](./docs/testing.md)
- [Contributing guide](./CONTRIBUTING.md)
- [Security policy](./SECURITY.md)

## Deployment notes

`npm run build` outputs the production bundle and syncs it into `build/`. Configure `VITE_APP_URL`, the Supabase public values, and any runtime notification/payment settings before producing a deployable artifact.

## Environment highlights

See `.env.example` for the full list. The most important client-side values are:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_EDGE_FUNCTION_NAME`
- `VITE_APP_URL`
- `VITE_SUPPORT_WHATSAPP_NUMBER`
- `VITE_ENABLE_TWO_FACTOR_AUTH`
- `VITE_ALLOW_DIRECT_SUPABASE_FALLBACK`

Server-side secrets such as `SUPABASE_SERVICE_ROLE_KEY`, email provider keys, and Twilio credentials must remain outside the browser bundle.
