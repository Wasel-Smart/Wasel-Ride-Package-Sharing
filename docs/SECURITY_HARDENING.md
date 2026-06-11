# Security hardening guide

This document covers the security posture of the Wasel platform and the controls in place.

---

## Secrets management

- All secrets live in `.env` files **which are never committed**. The `.gitignore` blocks all `.env.*` variants except `.example` and `.template` files.
- The `postinstall` script activates a pre-commit git hook (`.githooks/pre-commit`) that hard-blocks any attempt to stage `.env` files, certificates, or private keys.
- GitHub secret scanning and push protection should be enabled on the repository.
- Secret references in code use `import.meta.env.VITE_*` (browser-safe, build-time) or `process.env.*` (server/edge, never exposed to the bundle).

## Environment variable hygiene

- `.env.example` documents every required variable with a placeholder — **never a real value**.
- Server-only secrets (`STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, Twilio auth tokens) are never prefixed with `VITE_` and therefore cannot leak into the browser bundle.
- `VITE_ALLOW_DIRECT_SUPABASE_FALLBACK` defaults to `false` and must only be enabled for explicit fallback drills, never in production.

## Transport security

- All external API routes are versioned under `/v1/`.
- Public-facing routes use gateway-level rate limiting.
- Write-heavy real-time endpoints (location updates) are throttled via `src/platform/geo-stream.ts`.
- Static hosting headers are hardened in `docker/nginx.conf`: HSTS, X-Frame-Options, COOP, CORP, Permissions-Policy, and CSP directives.

## Client-side security

- CSRF protection initialised at app startup (`src/utils/csrf.ts`).
- Client-side rate limiting with automatic TTL cleanup (`src/utils/security.ts`).
- Input sanitisation and strict validators for URLs, emails, and phone numbers (`src/utils/validation.ts`).
- Password strength scoring with user feedback (`src/utils/security.ts`).
- Browser code never depends on service-role or provider secret keys.

## Authentication

- Supabase Auth is the identity provider with refresh-token rotation enabled.
- Role-based access checks exist at the gateway and service boundary, not only in the UI (`src/platform/rbac.ts`).
- 2FA scaffolding (setup, verify, disable) is built and can be enabled via feature flag.

## Observability and incident response

- Security-relevant failures emit structured logs with request and trace identifiers.
- Critical auth, payment, and trust flows are visible in Sentry and the monitoring dashboard.
- See [docs/observability.md](./observability.md) and [PRODUCTION_RUNBOOK.md](./PRODUCTION_RUNBOOK.md) for alerting setup.

## CI security controls

- CodeQL scanning runs on every push to `master` and every PR.
- Dependency vulnerability scanning runs via GitHub Dependabot (daily for npm, weekly for Actions).
- Bundle size limits prevent accidental inclusion of large dependencies.

## Reporting vulnerabilities

Do not open public GitHub issues for security problems.
Use the private [GitHub Security Advisory](https://github.com/Wasel-Smart/Wasel-Ride-Package-Sharing/security/advisories/new) flow.
Include: description, reproduction steps, affected routes or services, and recommended mitigations.
