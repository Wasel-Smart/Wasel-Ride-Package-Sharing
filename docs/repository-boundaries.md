# Repository Boundaries

This repository is a product monorepo. Keep source files in canonical source roots and keep generated output, local tool state, and vendored SDK exports out of git.

## Canonical Source Roots

- `src/`: Vite web app source. This is the main TypeScript compilation boundary in `tsconfig.json`.
- `backend/`: independent backend services and backend-only shared modules.
- `mobile/`: React Native mobile app source.
- `macos/`: native macOS app source.
- `supabase/`: database migrations, seeds, config, and edge functions.
- `infra/`: infrastructure-as-code, Kubernetes, Redis, and observability config.
- `api/`: hosted API entry points.
- `tests/` and `e2e/`: unit, integration, load, and browser tests.
- `scripts/`: checked-in automation scripts only. Generated reports and temporary scripts belong under ignored artifact folders.
- `docs/`: hand-written operational and architecture docs only.

## Non-Source Folders

These should stay untracked:

- build output: `build/`, `dist/`, `.vite/`, `.next/`, `.playwright-dist/`
- test output: `coverage/`, `test-results/`, `playwright-report/`
- local artifacts: `artifacts/`, `review-artifacts/`
- local tool state: `.agents/`, `.codex/`, `.kilo/`, `.run/`, `.vercel/`, `.idea/`, `.vscode/`
- nested checkout copies: `Wasel-Ride-Package-Sharing/`
- vendored SDK exports under `docs/*.framework/`, `docs/*.bundle/`, `docs/DocSets/`, and `docs/Samples/`

## Service Boundary Rule

The app currently has both `src/services/` and root `services/`. Treat `src/services/` as the frontend-facing service layer because it is included by the root `tsconfig.json`.

Root `services/` should only contain one of the following:

- compatibility shims that are still imported by tests or legacy callers
- shared service modules that are intentionally excluded from the browser build
- files being actively migrated into `src/services/` or `backend/`

Before adding a new service file, choose the target:

- browser/client workflow: `src/services/`
- backend runtime workflow: `backend/services/`
- shared domain model with no runtime side effects: `src/domain/` or a dedicated shared package

If a root `services/` file duplicates a `src/services/` file, document the owner in the file header or remove the duplicate during the next functional change.
