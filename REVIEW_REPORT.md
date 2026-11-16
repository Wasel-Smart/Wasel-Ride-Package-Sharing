# Wasel Quality & Release-Readiness Review

**Updated:** 2026-11-15. This is a local code review; no production deployment or live-provider verification was performed.
**Status: code remediation complete; three operational actions remain before production go-live.** The local fixes below close the profile Data API exposure, prevent fictitious Mobility OS booking success, retire the duplicate Stripe implementation, and strengthen CI gates. Live database replay is unavailable in this environment because the local Docker daemon is not running. CliQ's amount unit still requires a signed sandbox payload and provider configuration before top-ups can be credited.

## 2026-11-10 follow-up

| Area | Change | Verification state |
|---|---|---|
| **Client matching safety** | Removed the obsolete browser-side ride matcher that queried dropped trip columns, called an unsupported RPC, and could assign an arbitrary available driver. Matching remains on the dedicated server-side worker. | App TypeScript check passes; no match flow or production worker was executed. |
| **Growth data privacy** | Growth event cache is now partitioned by user; the legacy unscoped cache is cleared. Analytics resolves a user scope before querying, checks database errors, and selects only fields needed for aggregation. | App TypeScript check passes. No account-switch/browser or live RLS behavior was exercised. |
| **Demand alert privacy** | Demand alert browser storage is partitioned by signed-in user; the legacy shared cache is cleared. Supabase reads and inserts now require a resolved user scope and filter by that user. The ride alert action prompts unauthenticated users to sign in instead of throwing. | App TypeScript check and `git diff --check` pass. No account-switch/browser or live RLS behavior was exercised. |
| **Deployment safety** | Pinned Supabase CLI to `2.122.1`; pass the selected hosted project ref explicitly; added a migration dry run; select distinct staging credentials without production fallback; deploy the named edge function; scope PR write permission to preview only; smoke-test the selected environment URL. | Workflow YAML and Supabase TOML parse; `git diff --check` clean. No workflow run, migration, or deployment performed. Staging GitHub environment still needs its separate credentials, project ref, and URL. |
| **Analytics evidence labels** | Corridor rows now require observed activity before using that label; empty corridors use launch estimates. Session-level observations are no longer described as platform-wide production aggregates, and savings/value are labeled as projections or tracked values. | App TypeScript check passes; no test suite or production metrics query run. |
| **Release guidance** | Replaced outdated branch/release claims with the workflow's actual preview, staging, production, reviewer, and rollback paths. | Documentation reviewed locally; no deployment performed. |
| **Database privacy** | New migration revokes client access to `public.profiles`, removes broad policies, and adds a restrictive self-read policy. The RLS SQL gate now checks profile table and column privileges. | Migration and live SQL gate not applied locally or in production; Docker unavailable. |
| **Mobility OS** | Booking UI is disabled until payment authorization/confirmation exists; the endpoint fails closed and client errors no longer create local success records. | E2E regression updated; execution pending. |
| **CliQ** | Webhook amount conversion now requires an explicit `CLIQ_WEBHOOK_AMOUNT_UNIT` (`jod` or `fils`) and reports held/mismatched payments accurately. | Unit conversion cases added; actual unit must be confirmed in CliQ sandbox. |
| **Stripe** | `stripe-payments-v2` is reduced to a 410 compatibility endpoint; the deploy workflow publishes the stub, while the main backend remains authoritative. | Local source updated; deploy workflow has not run. |
| **CI** | Added mobile type/lint/unit checks and raised the regular web coverage gate to 30/25/20/28, matching the current Vitest ratchet. | Workflow not run in this session. |
| **Docs** | Updated wiring, Stripe endpoint, Mobility OS, and deployment guidance. | File review only. |

---

## Historical changes (October 2026)

| Area | Fix |
|---|---|
| **Security — webhook JWT gate** | Dedicated `supabase/functions/webhooks/` function with `verify_jwt = false`. Provider signature checks now run before any auth. `supabase/config.toml` updated. |
| **Security — password policy** | `minimum_password_length` raised from 8 → 12. |
| **Testing — edge functions** | Deno handler tests cover Stripe, CliQ, Resend, Twilio, and Send-SMS signature/configuration paths. This review adds current Resend/Svix format and replay/tamper cases; these tests still need to pass in CI and against configured provider callbacks. |
| **Testing — excluded suites** | `tests/database/**` and `tests/utils/pricing/**` removed from vitest exclude list — they now run in CI. |
| **CI — translation drift** | `verify-translations.mjs` now exits 1 on drift (was always 0). `translations` job added to CI and gates the build. |
| **CI — deno lint + test** | `deno-lint` CI job now runs `deno lint supabase/functions/` AND `deno test` for webhook handlers. |
| **CI — Lighthouse** | `lighthouse` CI job added. `@lhci/cli` added to devDependencies. `lighthouserc.js` updated with `startServerCommand`. |
| **CI — npm audit** | Removed `continue-on-error: true` from `npm audit` — high-severity vulnerabilities now block the security workflow. |
| **DX — pre-commit hook** | Replaced full `lint + typecheck + test:unit` with `lint-staged` — only staged files are checked, keeping commits fast. |
| **DX — lint-staged** | Added `lint-staged` config to `package.json` and as a devDependency. |
| **DX — .gitattributes** | Added `.gitattributes` enforcing LF line endings for all text files — fixes Windows/Linux CRLF churn. |
| **Docker — .dockerignore** | Added `scripts/`, `mobile/`, `.kilo/`, `artifacts/`, `brand/`, `infra/`, `tests/`, `e2e/`, all env templates, and sensitive docs to `.dockerignore`. |
| **Docs — testing.md** | Corrected coverage thresholds (70/75/80 → 75/80/85/85) and fixed non-existent `npm run test:coverage` command. |

---

## Remaining production work

1. **Rotate all credentials at the providers** — no code change can invalidate a live key.
   Rotate: Stripe, Twilio, Supabase service role, Google OAuth, Facebook OAuth, Resend,
   SendGrid, Vercel token, worker secrets. See `SECURITY_CHECKLIST.md` for the full table with provider links.
   Generate new worker secrets: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
2. **Purge git history** — run `bash scripts/purge-git-history.sh` after rotating the Google service account key.
   Then enable GitHub Secret Scanning + Push Protection (GitHub → Settings → Security).
3. **Move real env files out of OneDrive** — run `npm run secrets:move-offsite` (calls `scripts/move-env-offsite.mjs`).
4. **Set observability env vars in Vercel** — `VITE_SENTRY_DSN` and `VITE_APP_INSIGHTS_CONNECTION_STRING`.
   Both require a redeploy after setting (Vite inlines `VITE_*` at build time).
5. **Deploy migrations and edge functions** through the protected deployment workflow, then verify profile reads/writes as anon and authenticated users and run payment smoke tests.
6. **Configure `CLIQ_WEBHOOK_AMOUNT_UNIT`** only after checking an actual signed sandbox event.
7. **Configure the isolated staging GitHub environment** with its own Supabase project ref, database password, scoped token, and staging URL.

---

## Remaining improvements (not blockers)

- Twilio webhook authentication still allows a query-string token until
  `TWILIO_WEBHOOK_REQUIRE_SIGNATURE=true` is enabled after validating the
  provider-side signature URL and secret.
- Confirm `finalizeTopUpTransaction` dedupes on Stripe `event.id` and that
  `verifyStripeWebhookSignature` enforces a timestamp tolerance.
- Keep the 30/25/20/28 coverage ratchet moving toward the 85% release target; current coverage remains substantially below target.
- Add end-to-end payment authorization and settlement for Mobility OS before re-enabling its booking action.
- Add OTLP distributed tracing export via `VITE_OTEL_EXPORTER_OTLP_ENDPOINT`.

## Current readiness rating

**8.1/10 overall (code); 8.5+ once the three operational actions below are completed.**

What improved since the last review (Dec 2026):
- **H-02 resolved** — Twilio webhook HMAC enforcement confirmed in code; `check-observability-config.mjs` now also verifies `TWILIO_AUTH_TOKEN` is present in CI
- **M-01 partially resolved** — `scripts/check-observability-config.mjs` added; `observability-gate` CI job warns on missing/placeholder Sentry DSN and AppInsights connection string; deploy workflow should run without `--warn-only` to hard-block
- **Coverage gate raised** — CI and vitest thresholds raised from 20/25/30/28 → 25/32/38/35 (branches/functions/lines/statements)
- **New targeted tests** — `paymentStatusExtract.test.ts` (14 cases), `appInsightsPlaceholder.test.ts` (10 cases), `cliqReportedPayment.test.ts` (11 cases) covering the payment status extraction path, observability placeholder detection, and CliQ amount unit conversion
- **Security gate CI job** — `security-gate` job fails CI if `SECURITY_CHECKLIST.md` still has open ❌ items, making unresolved critical/high findings visible on every PR

What is already at 8.5+ level:
- Architecture, domain contracts, queue topology, worker framework, outbox pattern
- Test suite: settlement ledger, RBAC matrix, ride/package lifecycles, payment service, price calculator, error handling, fallback strategy — all with edge cases
- CI: 17+ jobs including RLS static + live, deno lint + test, translation drift, route contract, Lighthouse, visual regression, observability gate, security gate
- Security primitives: CSRF, DB-backed distributed rate limiting, sanitization, circuit breaker, SSRF protection, constant-time secret comparison
- Documentation: OpenAPI spec, architecture, SLOs, runbook, security model, wiring guide

The three remaining operational actions (none are code problems):

1. **Rotate all credentials at providers** — run through `SECURITY_CHECKLIST.md` (C-01, C-02, H-01)
2. **Purge git history** — `bash scripts/purge-git-history.sh` (after rotating Google service account key)
3. **Move env files off OneDrive** — `npm run secrets:move-offsite`

Plus set `VITE_SENTRY_DSN` and `VITE_APP_INSIGHTS_CONNECTION_STRING` in Vercel and redeploy.
