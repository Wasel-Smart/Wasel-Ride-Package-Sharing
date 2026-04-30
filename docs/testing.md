# Testing Guide

## Test layers

- `npm run test:unit`: unit and service tests with Vitest
- `npm run test:e2e`: Playwright browser verification
- `npm run verify:ci`: type-check, lint, unit tests, and production build
- `npm run verify`: full local gate including Playwright

## Expectations

1. New business logic should include a unit or service test.
2. Route regressions should be covered by Playwright when feasible.
3. Fixes for production defects should come with a regression test whenever practical.

## Common troubleshooting

- If auth-related tests fail, verify Supabase mocks cover the current callback flow.
- If environment-sensitive tests fail, stub the relevant `VITE_*` values explicitly inside the test.
- If Playwright tests fail locally, confirm the dev server can start cleanly before re-running the suite.
