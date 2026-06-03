# Wasel Full-System Audit - 2026-06-03

## Executive Scorecard

| Area | Before | After current pass | Target |
| --- | ---: | ---: | ---: |
| Product clarity | 6.4 | 8.2 | 9.0+ |
| UI/visual consistency | 7.1 | 8.0 | 9.0+ |
| Mobile experience | 7.0 | 7.8 | 9.0+ |
| Performance posture | 7.2 | 8.1 | 9.0+ |
| Accessibility posture | 7.4 | 8.1 | 9.0+ |
| Security posture | 6.8 | 8.0 | 9.0+ |
| Maintainability | 7.0 | 7.8 | 9.0+ |

## Critical Issues

1. A Google OAuth `client_secret_*.json` file was tracked in the repository root.
   Impact: Anyone with repo access or history access could recover the secret. Deleting the file prevents future propagation, but the credential must be revoked and replaced in Google Cloud.

2. Startup health checks ran from the entry module before first paint settled.
   Impact: Supabase auth, Edge Function, and database probes can compete with initial render/network work and worsen FCP/LCP on slow devices.

3. Payment Edge Function validation was under-specified.
   Impact: Auth was checked, but payment amount, currency, redirect URLs, rate limiting, and error leakage needed tighter controls.

4. Root `_headers` applied immutable cache semantics too broadly.
   Impact: HTML or shell responses can become stale after deployment, making rollbacks and emergency fixes unreliable.

5. CSP allowed `unsafe-eval`.
   Impact: Increases XSS blast radius and weakens browser hardening. Production Vite builds should not require eval.

## High-Impact Improvements Implemented

1. Repositioned landing copy around the clearest value proposition: employee transport, approvals, live trip management, and spend control.
2. Added first-viewport trust signals for verified drivers, secure payments, and privacy controls.
3. Deferred backend health checks until after first paint/idle time.
4. Added Vite manual chunks for React, UI, Supabase, payments, query, and visualization dependencies.
5. Removed `unsafe-eval` from deployment CSP headers.
6. Scoped immutable cache headers to assets and brand files.
7. Added Gitleaks to the security workflow.
8. Deleted the tracked OAuth client secret JSON from the working tree.
9. Hardened `stripe-payments-v2` with rate limiting, amount bounds, currency allow-list, redirect validation, and generic error responses.

## Security Risks

1. Revoke the exposed Google OAuth credential and audit Git history for any additional private keys.
2. Confirm Supabase RLS policies against every public table using role-based tests before production launch.
3. Replace permissive CORS on payment-related functions with a configured origin allow-list.
4. Add webhook replay/idempotency handling for all Stripe events that mutate booking/payment state.
5. Ensure service-role keys are only used server-side and never bundled into Vite or mobile clients.
6. Consider CSP nonces/hashes in a future pass to remove `unsafe-inline`.

## UX Blockers

1. Landing page had too many parallel claims and mode choices before explaining the product outcome.
2. Several route/service cards lacked explicit accessible names beyond visible text.
3. Some heading styles used viewport-driven display sizing and tight letter spacing, increasing mobile text risk.
4. Trust, privacy, and payment confidence appeared too late relative to conversion actions.

## Performance Bottlenecks

1. Entry-module health checks were network-heavy for first load.
2. Large feature files remain in several domains, especially bus, trust, trips, maps, and operations.
3. Visualization/map dependencies need route-level isolation and should not leak into the first route.
4. Service worker caching needs continued verification to avoid stale-shell behavior after deploys.

## Code Smells And Technical Debt

1. Several components exceed 20-50 KB and combine presentation, state, and domain logic.
2. Legacy comments and mojibake text in router/styles reduce maintainability.
3. The app has both generic UI and Wasel-specific UI primitives; ownership boundaries should be clarified.
4. Edge Functions use mixed Stripe SDK versions and validation styles.
5. There are multiple local generated/build artifacts and docs samples that increase audit noise.

## Prioritized Roadmap

1. Rotate exposed OAuth credentials and run a full historical secret scan.
2. Add RLS regression tests for all public Supabase tables and storage buckets.
3. Split large feature pages into controller hooks, pure view components, and domain services.
4. Add Playwright + axe coverage for the landing page, auth, booking, wallet, trust center, and mobile nav.
5. Replace remaining inline landing styles with Wasel design-system primitives.
6. Build route-level loading/empty/error components for every feature domain.
7. Add bundle budget checks and Lighthouse CI for `/`, `/app/find-ride`, `/app/wallet`, and `/app/trust`.
8. Normalize Edge Function validation, CORS, rate limiting, and response envelopes.
9. Add telemetry dashboards for conversion funnel, payment failures, auth failures, and RLS denials.
10. Remove stale generated artifacts and document repo ownership boundaries.
