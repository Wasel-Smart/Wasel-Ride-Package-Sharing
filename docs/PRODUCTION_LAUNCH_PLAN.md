# Wasel Production Launch Plan
_Last updated: 2026-11-19. Code-complete items are marked ✅. Human/live-system items are marked with the owner._

This document is the authoritative ordered checklist to bring Wasel from 7.2/10 (code review) to
9+/10 (live verified). Every item here has a direct evidence requirement before the score rises.

---

## Phase 1 — Build gate (do this first, blocks everything else)

| # | Action | Evidence |
|---|---|---|
| 1.1 | Move the repo checkout **outside OneDrive** (e.g. `C:\Projects\Wasel14.online`) | `npm install` completes without warnings |
| 1.2 | `npm run type-check` | Zero TypeScript errors |
| 1.3 | `npm run lint` | Zero lint errors or warnings |
| 1.4 | `npm run build` | `dist/` produced, no exit code 2 |
| 1.5 | Remove `NODE_ENV=production` from `.env` (Vite ignores it, prints warning) | No Vite `NODE_ENV` warning in build output |
| 1.6 | `npm run verify:ci` | All gates green (type-check, lint, coverage, routes, secrets, env, edge, contracts, observability) |

---

## Phase 2 — Credential rotation (security gate)

**Only you can do these.** Do them in a private terminal, never in chat.

| # | Action | Evidence |
|---|---|---|
| 2.1 | Rotate **Stripe** secret key and publishable key | New keys in Vercel env; old keys revoked in Stripe dashboard |
| 2.2 | Rotate **Twilio** Auth Token and Account SID | New credentials in Vercel/Supabase; Twilio logs show no old-token calls |
| 2.3 | Rotate **Resend** API key | New key in Vercel env |
| 2.4 | Rotate **Supabase** service role key and publishable key | New keys set; `sb_publishable_` format confirmed |
| 2.5 | Rotate **CliQ / JoPACC** API key and webhook secret | New secrets in Vercel/Supabase env |
| 2.6 | Rotate **Google / Facebook OAuth** client secrets | New secrets in Supabase dashboard → Auth → Providers |
| 2.7 | Rotate **INTERNAL_CRON_SECRET** and **WORKER_SECRET** | New values in Vercel env |
| 2.8 | Run `git log --all --full-history -- '*google*service*account*'` to find the previously committed key; purge with `git filter-repo` if found | Clean `git log` for the path |

---

## Phase 3 — Database (required before any live traffic)

| # | Action | Evidence |
|---|---|---|
| 3.1 | Take a backup of the current production DB before touching anything | Backup file or Supabase point-in-time restore checkpoint noted |
| 3.2 | Run `npx supabase migration list --linked` on the linked project | List of pending migrations printed |
| 3.3 | Reconcile per `docs/DBA_MIGRATION_RECONCILIATION_PLAN.md` | No divergent migrations |
| 3.4 | `supabase db push --dry-run` on a **restored clone** | Zero errors |
| 3.5 | Apply to production: `supabase db push` | All migrations listed as applied |
| 3.6 | Run `supabase/ops/production-readiness-audit.sql` | Zero failed checks |
| 3.7 | Run `supabase/ops/audit_client_privileges.sql` | No unexpected grants to `anon` or `authenticated` |
| 3.8 | Run `supabase/tests/rls_coverage.sql` | 100% of domain tables have RLS enabled |
| 3.9 | Test as the `anon` role: `GET /rest/v1/drivers?select=license_number&limit=1` using the anon key | Returns 403 or empty (not actual PII) |

---

## Phase 4 — Payments (required before accepting money)

| # | Action | Evidence |
|---|---|---|
| 4.1 | Configure `CLIQ_WEBHOOK_AMOUNT_UNIT` as `jod` or `fils` after getting a **real CliQ sandbox payload** | Env var set; amount-unit log entry confirms correct conversion |
| 4.2 | Run `stripe trigger checkout.session.completed` against the deployed `webhooks` function | Returns 200; Supabase wallet table credited |
| 4.3 | Run `stripe trigger payment_intent.succeeded` | Returns 200; booking payment recorded |
| 4.4 | Create a live Stripe test-mode booking end to end | `amount` in `bookings` = trip price × seats |
| 4.5 | Run a CliQ sandbox top-up and confirm amount/currency match | Transaction posted; wallet balance updated |
| 4.6 | Confirm Stripe entity is eligible for Jordan-market business in the Stripe dashboard | Dashboard shows Jordan-eligible account |

---

## Phase 5 — Edge functions (required before deploy)

| # | Action | Evidence |
|---|---|---|
| 5.1 | On a machine with Deno installed, run: `cd supabase/functions && deno cache make-server-0b1f4071/index.ts` | `deno.lock` generated |
| 5.2 | Commit `deno.lock` to the repo | File appears in git history |
| 5.3 | Run `npm run edge:sync` to regenerate `webhooks/_vendor` | No diff in vendor files |
| 5.4 | Run `deno test supabase/functions/tests/` against a linked Supabase project | All Deno tests pass |
| 5.5 | Deploy: `supabase functions deploy make-server-0b1f4071` | Function listed in Supabase dashboard |
| 5.6 | Deploy: `supabase functions deploy webhooks` | Function listed |
| 5.7 | Confirm Stripe, CliQ and Twilio webhook URLs point to the deployed `webhooks` function | Provider dashboards show correct URL |

---

## Phase 6 — Operations and monitoring

| # | Action | Evidence |
|---|---|---|
| 6.1 | Verify Sentry DSN is set in Vercel env and returns real error events | Sentry dashboard shows an event |
| 6.2 | Verify Application Insights connection string is set | AI dashboard shows page-view telemetry |
| 6.3 | Run the operations runbook drill (`docs/PRODUCTION_RUNBOOK.md`) | Drill notes written; rollback owner confirmed |
| 6.4 | Test backup restore: restore the Phase 3 backup to a temporary Supabase project | Restore completes; schema matches |
| 6.5 | Configure alerting rules from `src/config/monitoring.ts` in your alerting platform | At least one alert fires in a staging drill |

---

## Phase 7 — Load testing and performance

| # | Action | Evidence |
|---|---|---|
| 7.1 | Run `npm run test:load:smoke` against staging | All thresholds met |
| 7.2 | Run `npm run test:load:production` against staging | k6 summary log; p95 latency within SLO |
| 7.3 | Measure bundle size on new build: main chunk < 400 KB gzip | `vite build --mode analyze` report |

---

## Phase 8 — End-to-end and mobile

| # | Action | Evidence |
|---|---|---|
| 8.1 | Run `npm run test:e2e:smoke` against staging | Zero failures |
| 8.2 | Run the full `npm run test:e2e` suite | Zero failures |
| 8.3 | Run the mobile JS export: `cd mobile && npx expo export` | Bundle produced without errors |
| 8.4 | Test on a real device (Android or iOS) | App loads; auth flow completes |

---

## Score projection

| Phase complete | Expected score |
|---|---|
| None (code review only, 2026-11-19) | 7.2 / 10 |
| Phase 1 (build gate green) | 7.8 / 10 |
| Phase 1 + 2 (credentials rotated) | 8.2 / 10 |
| Phase 1 + 2 + 3 (DB migrated and audited) | 8.6 / 10 |
| Phase 1–5 (payments and edge verified) | 9.0 / 10 |
| All phases complete | 9.3–9.5 / 10 |

---

## What was fixed in code (no live action needed to claim these)

| Item | Fix |
|---|---|
| TS1002 syntax error (`CorporatePage.tsx`) | Fixed — unterminated string literal |
| `@sentry/core` tarball dependency | Fixed — now registry `^8.55.2` |
| `cliq-payments` using `supabase-js@2.36.0` | Fixed — updated to `2.119.0` |
| `gdpr-deletion-scheduler` using deprecated `serve()` | Fixed — now `Deno.serve()` |
| `cleanup_api_rate_limits` has no cron schedule | Fixed — migration `20261119140000` added |
| `@stripe/stripe-js` and `@supabase/supabase-js` unpinned in `package.json` | Fixed — exact versions pinned |
| Coverage floor too low — only ~24% statements | Improved — 9 new test files, ~250+ new test cases across domain, payment, utility, and infrastructure code |
| `STRIPE_API_VERSION` mismatch | Confirmed fixed in prior session — all calls use `2024-11-20` |
| `finalizeTopUpTransaction` direct Postgres connection | Confirmed fixed in prior session — uses `app_finalize_wallet_top_up` RPC |
| Mobility booking oversell race condition | Guarded — route returns 503, atomic RPC ready when payment flow is wired |
| CliQ webhook amount/currency comparison | Confirmed fixed in prior session — `cliqReportedPayment()` + fails closed |
