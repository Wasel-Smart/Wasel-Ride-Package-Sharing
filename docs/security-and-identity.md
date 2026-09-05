# Security And Identity

Wasel handles trust-sensitive ride, package, payment, and account activity. The production bar is not "JWT exists" — it is defense in depth across identity, routing, secrets, and abuse controls.

---

## Identity model

- Identity provider: Supabase Auth
- Expected runtime roles: `admin`, `operator`, `driver`, `user`
- Role checks: `src/platform/rbac.ts`
- Client-safe configuration only: `VITE_*` prefixed vars
- Sensitive server-only material: service-role keys, provider tokens, worker secrets

## Session posture

- Browser sessions use short-lived JWTs (1h expiry) with refresh-token rotation
- Sensitive mutations are re-verified at the backend boundary, not trusted from UI state
- Sessions stored in httpOnly cookies in production; localStorage fallback in development only
- Two-factor auth is feature-flagged — backend path not yet enabled and audited

## RBAC

Role checks are enforced at two layers:

1. **API gateway** — every request is authenticated and the role is resolved before routing
2. **Service boundary** — `assertPermission(role, action)` in `src/platform/rbac.ts` throws `"Role 'X' is not allowed to perform 'Y'"` on violation

| Role | Capabilities |
|---|---|
| `admin` | Full platform access, user management, ops dashboard |
| `operator` | Corridor management, driver oversight, reporting |
| `driver` | Trip management, package acceptance, earnings |
| `user` | Ride booking, package sending, wallet, profile |

## RLS posture

Row-level security is enforced on all Postgres tables. Policies are defined in `supabase/migrations/` and audited via `scripts/audit-rls-policies.sql`.

- The `anon` role has no write access to any domain table
- The `service_role` key never enters the browser bundle
- `VITE_ALLOW_DIRECT_SUPABASE_FALLBACK=false` must be set in all production builds
- RLS policies are validated in CI via `scripts/implement-rls-policies.sql`

## Abuse controls

- Gateway-level rate limiting on all public write routes (`src/utils/distributedRateLimit.ts`)
- Request-level tracing for every authenticated mutation
- Throttled geo updates to prevent GPS spam (`src/platform/geo-stream.ts`)
- CSRF protection on all state-changing operations
- DLQ-backed async retry for workers instead of infinite request retries
- Circuit breaker pattern on external service calls (`src/utils/circuitBreaker.ts`)

## Secrets rules

- `.env.example` documents the public and server contract without leaking real values
- `scripts/check-env-exposure.mjs` validates no server secrets are in `VITE_*` vars
- `scripts/validate-no-secrets.mjs` scans for hardcoded credentials before deploy
- `.gitleaks.toml` + CI `secret-scan` job runs on every push
- Provider secrets belong in CI secrets, vaults, or deployment environment stores

## Static delivery posture

The static container contract in `docker/nginx.conf` includes:

- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- Permissions policy
- Cross-origin hardening headers
- Immutable asset caching

## Threat model table

| Threat | Mitigation | Status |
|---|---|---|
| Credential theft / session misuse | Short-lived JWTs, refresh-token rotation, httpOnly cookies | ✅ Production |
| Abuse of write-heavy endpoints | Gateway rate limiting, CSRF on mutations, request tracing | ✅ Production |
| Secrets leaking into browser bundle | `VITE_*` enforcement, `check-env-exposure.mjs` | ✅ Production |
| Silent payment / trust failures | Structured error envelopes, Sentry capture, DLQ alerting | ✅ Production |
| Unauthorized data access | Postgres RLS on all tables, RBAC at gateway + service boundary | ✅ Production |
| GPS spam / location abuse | Geo-stream throttling in `src/platform/geo-stream.ts` | ✅ Production |
| Hardcoded secrets in source | `.gitleaks.toml`, `validate-no-secrets.mjs`, CI secret-scan job | ✅ Production |
| Cascading failures from external services | Circuit breaker in `src/utils/circuitBreaker.ts` | ✅ Production |
| MFA bypass | MFA feature-flagged; enable with `VITE_ENABLE_TWO_FACTOR_AUTH=true` | ✅ Backend live, UI opt-in |
| Committed secrets in git history | Google service account key committed — rotation + history purge required | 🔴 Outstanding |

## Secrets rotation checklist

See [CREDENTIAL_ROTATION_GUIDE.md](./CREDENTIAL_ROTATION_GUIDE.md) for the full rotation procedure.

Outstanding manual actions:

1. **Rotate the Google service account key** — committed to git history in `docs/wasel-planning-with-ai.json`; purge with `git filter-repo` or BFG
2. **Rotate `COMMUNICATION_WORKER_SECRET` and `COMMUNICATION_WEBHOOK_TOKEN`** — real values were present in `.env` inside the OneDrive sync tree
3. **Move `.env` outside OneDrive sync** or exclude the project folder from OneDrive sync

## Verification

- `src/utils/env.ts` — validates runtime config assumptions on startup
- `scripts/validate-env-example.mjs` — guards the checked-in env contract
- `scripts/validate-no-secrets.mjs` — scans for hardcoded credentials
- `.github/workflows/security.yml` — runs dependency review and CodeQL
- `.github/workflows/secret-scan.yml` — runs on every push
