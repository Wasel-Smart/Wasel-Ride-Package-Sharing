# Testing Guide

## Test layers

- `npm run test:unit`: unit and service tests with Vitest
- `npm run test:e2e`: Playwright browser verification
- `npm run verify:contracts`: OpenAPI and infrastructure contract validation
- `npm run verify:ci`: type-check, lint, unit tests, and production build
- `npm run verify`: full local gate including Playwright
- `npm run test:load:smoke`: k6 smoke profile for high-level latency checks

## Expectations

1. New business logic should include a unit or service test.
2. Route regressions should be covered by Playwright when feasible.
3. Fixes for production defects should come with a regression test whenever practical.
4. Infra and contract changes should keep `npm run verify:contracts` green.
5. Environment examples, topology overlays, and worker manifests are treated as contract assets and validated in CI.

## Common troubleshooting

- If auth-related tests fail, verify Supabase mocks cover the current callback flow.
- If environment-sensitive tests fail, stub the relevant `VITE_*` values explicitly inside the test.
- If Playwright tests fail locally, confirm the dev server can start cleanly before re-running the suite.
- If contract validation fails, inspect `docs/openapi` and `infra/` for missing or renamed required assets.
