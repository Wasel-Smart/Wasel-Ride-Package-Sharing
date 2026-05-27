# Wasel 9+ Quality Scorecard

This scorecard defines what the application must prove before it can be called a 9+ product across product scope, architecture, UI polish, engineering reliability, and production readiness.

## Target Bar

| Component | 9+ requirement | Evidence in this repo |
|---|---|---|
| Product scope | Core rider, driver, package, bus, wallet, trust, profile, notification, safety, and operator workflows are available from the app shell. | `src/features`, `src/wasel-routes.tsx`, `mobile/src/screens` |
| Architecture | User-facing flows are backed by typed domain models, service contracts, queue ownership, API envelopes, RBAC, and documented SLOs. | `src/domain`, `src/platform`, `docs/api-contract.md`, `docs/workers-and-queues.md`, `docs/reliability-slos.md` |
| UI/content polish | English and Arabic copy render without mojibake, direction switches persist, protected surfaces have useful empty/error states, and text-integrity checks cover key routes. | `src/contexts/LanguageContext.tsx`, `src/utils/textEncoding.ts`, `tests/e2e/text-integrity.spec.ts` |
| Engineering reliability | Type checking, linting, focused unit tests, contract validation, and production build run from one documented command. | `npm run quality`, `.github/workflows/ci.yml` |
| Production readiness | Release candidates prove contracts, infra manifests, observability assets, and build output before deployment. | `npm run verify:production`, `infra/`, `docs/RELEASE_GUIDE.md` |

## Release Gate

Run this before a production release:

```bash
npm run quality
```

Run these for release-candidate browser and load verification:

```bash
npm run test:e2e
npm run test:load:smoke
```

## Known Limits

- Independent backend workers are still represented by contracts and Kubernetes manifests until the live worker deployment is enabled.
- Load checks require `k6` to be installed on the release machine.
- Native mobile production release requires completing the app-store configuration documented in `mobile/MOBILE_CONFIGURATION.md`.
