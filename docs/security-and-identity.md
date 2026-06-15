# Security And Identity

Wasel handles trust-sensitive ride, package, payment, and account activity. The production bar is not "JWT exists"; it is defense in depth across identity, routing, secrets, and abuse controls.

## Identity model

- Identity provider: Supabase Auth
- Expected runtime roles: `admin`, `operator`, `driver`, `user`
- Role checks in repo: `src/platform/rbac.ts`
- Client-safe configuration only: `VITE_*`
- Sensitive server-only material: service-role keys, provider tokens, worker secrets

## Session posture

- Browser sessions should use short-lived access tokens with refresh-token rotation.
- Sensitive mutations should be re-verified at the backend boundary, not trusted from UI state.
- Two-factor auth remains feature-flagged until the backend path is enabled and audited.

## Abuse controls

- Gateway-level rate limiting on all public write routes
- Request-level tracing for every authenticated mutation
- Throttled geo updates to prevent GPS spam
- DLQ-backed async retry for workers instead of infinite request retries

## Secrets rules

- `.env.example` documents the public and server contract without leaking real values.
- Production builds must keep `VITE_ALLOW_DIRECT_SUPABASE_FALLBACK=false`.
- Provider secrets belong in CI secrets, vaults, or deployment environment stores.

## Static delivery posture

The static container contract in `docker/nginx.conf` now includes:

- CSP
- HSTS
- permissions policy
- cross-origin hardening headers
- immutable asset caching

## Verification

- `src/utils/env.ts` validates runtime config assumptions
- `scripts/validate-env-example.mjs` guards the checked-in env contract
- `.github/workflows/security.yml` runs dependency review and CodeQL

## Threat model priorities

1. Credential theft or session misuse
2. Abuse of write-heavy package and ride endpoints
3. Leakage of operator or provider secrets into the browser bundle
4. Silent failures in payment and trust workflows without traceability
