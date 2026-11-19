# Wasel14.online - Master Task: production readiness audit

Started 2026-10-11. One master task. Priority order: build/CI/deploy, security and credentials,
database authorization, payments, backend, end-to-end tests, performance/accessibility/reliability.

## How to read this file

Evidence levels used below:

- **READ**: confirmed by code or migration inspection.
- **EDITED**: a change was written; check later verification records for execution status.
- **TO RUN**: needs the listed live or production check before it counts as done.

This audit is historical and partially superseded by the 2026-11-03 local verification summarized in `REVIEW_REPORT.md`. Live database and provider checks remain open.

## Tier 0 - build and deploy

| ID | Finding | Evidence | State |
|---|---|---|---|
| D1 | `package.json` and `package-lock.json` depend on `@sentry/core` as `file:sentry-core-8.55.2.tgz`. The tarball is not in the repo root, so `npm ci` (the Vercel `installCommand`) fails with ENOENT on any clean checkout. | READ: `package.json`, `package-lock.json` head, ENOENT on the path | FIXED 2026-11-19: `@sentry/core: ^8.55.2` now references the npm registry. No tarball remains. |
| D2 | The newest build log (`build-output.log`, Oct 9) ends `exit code: 2`: TS2322 in `src/utils/monitoring.ts` and `src/config/monitoring.ts`, TS2339 `setMeasurement` not on `Scope`, and ~40 errors in `CorridorGlobeScene.tsx` (`three` has no exported `Vector3`, `mesh`/`group` not in JSX). | READ: log vs current source | FIXED: monitoring files fixed in prior session; CorridorGlobeScene casts through `unknown`; `CorporatePage.tsx` TS1002 fixed 2026-11-19. TO RUN: `npm run type-check` on a clean checkout outside OneDrive. |
| D3 | `.env` sets `NODE_ENV=production`; Vite warns and ignores it (`build-cutover.log`). | DOCUMENTED: Vite ignores this variable (it uses `MODE`/`import.meta.env.MODE` instead). The `.env` file cannot be edited from this session. Remove `NODE_ENV=production` from `.env` manually — it has no effect on the build but generates a Vite warning. |
| D4 | Bundle: main chunk 1.16 MB (355 KB gzip), globe chunk 940 KB. | READ: `build-cutover.log` | OPEN (Tier 6) |

D1 fix: `@sentry/react` and `@sentry/browser` already pull in `@sentry/core`. Find out why the tarball
was introduced before removing it (it looks like a workaround for a bad install), then
`npm pkg set "dependencies.@sentry/core=^8.55.2"` and `npm install` to regenerate the lockfile.

D2 three errors: they say `@types/three` / R3F types did not resolve at build time. The repo lives
under OneDrive and `SECURITY_AUDIT_FINDINGS.md` already records interrupted installs there. Delete
`node_modules`, reinstall outside OneDrive, rerun `tsc` before changing `CorridorGlobeScene.tsx`.

## Tier 1 - security and credentials

| ID | Finding | State |
|---|---|---|
| S1 | Credential rotation (Stripe, Twilio, Resend, SendGrid, Supabase service role, OAuth, Vercel, worker secrets) and git-history purge of the committed Google service-account key are still listed as pending in `REVIEW_REPORT.md`. Only the owner can do these. `.env*`, `.env.production` and `vercel-env-variables.txt` sit in the working folder; they were not opened. | OPEN, human action |
| S2 | Earlier audit items verified against current code: A1 module link (index imports and `webhooks.ts` exports now match), A2 (`verify_jwt = false`, webhooks in their own function), B1 refund needs `payments:refund`, B3 reserved metadata keys and user-scoped idempotency, B4 anonymous and web3 sign-in off. | READ: closed in code; deploy state TO RUN |
| S3 | Twilio callbacks require the provider signature and reject URL-token fallback. The exact provider callback URL still needs a live check. | CODE FIXED; LIVE CALLBACK UNVERIFIED |
| S4 | `supabase-js@2` is imported unpinned from esm.sh; the Stripe SDK is 12.12.0 with `apiVersion` 2024-11-20 while raw Stripe calls use 2026-02-25.clover. | FIXED 2026-11-19: all edge functions use `esm.sh/@supabase/supabase-js@2.119.0`. `cliq-payments/index.ts` was using `npm:@supabase/supabase-js@2.36.0` (very old) — updated to `2.119.0`. Raw Stripe calls now also use `STRIPE_API_VERSION = '2024-11-20'` (confirmed in shared.ts). `deno.lock` still missing — run `deno cache` to generate it. |

## Tier 2 - database authorization

| ID | Finding | State |
|---|---|---|
| A1 | `20260720054123` grants `anon` SELECT on `public.drivers` (rows carry `license_number`, `background_check_status`). Safe only if RLS blocks anon; the later PII view targets `driver_profiles`, a different table. | OPEN, TO RUN with the anon key |
| A3 | Booking, rating, payment, review, moderation, chat participant, and live-trip queries were aligned to canonical `booking_id`/`passenger_id`/`booking_status` columns. Verify against linked `information_schema.columns` after migration reconciliation. | CODE FIXED; LIVE SCHEMA VERIFY OPEN |

## Tier 3 - payments and transaction integrity

| ID | Finding | State |
|---|---|---|
| P1 | Added `app_create_ride_booking` as a service-role-only atomic reservation RPC; it verifies phone state, prices from the locked trip, allocates contiguous seats, and reserves capacity. Local migration only; verify/apply after history reconciliation. | CODE + MIGRATION ADDED; LIVE BOOKING E2E OPEN |
| P2 | The same function stored the fare as whatever was passed in (the handler passes 0), so bookings had `amount = total_price = 0`. The new function derives the fare from the locked trip row and fails closed if no price column is found. | EDITED, TO RUN |
| P3 | `finalizeTopUpTransaction` credited any pending row named by a provider callback, including debits. Now requires `add_funds` + `credit`. | EDITED (`shared.ts`) |
| P4 | `markTopUpTransactionFailed` could overwrite a `posted` row (check-then-write race). Update is now guarded with `neq posted`. | EDITED (`shared.ts`) |
| P5 | `PUT /bookings/:id` wrote any string; a passenger could confirm or complete their own booking. Now restricted to the enum, terminal states are frozen, passengers can only cancel. | EDITED (`bookings.ts`) |
| P6 | CliQ webhook credits the stored amount but never compares the amount/currency the provider reports. The checkout URL carries `amount` and `transactionId` as parameters. Add a strict match once the CliQ payload field names are confirmed. | OPEN |
| P7 | Stripe webhook handles `payment_intent.succeeded` and reconciles amount/currency before recording a booking payment. Live settlement remains unverified. | CODE FIXED; LIVE PAYMENT UNVERIFIED |
| P8 | Removed arbitrary post-create driver assignment; creation now uses the new serialized RPC and trip-owned driver mapping. Local migration only pending schema reconciliation and live tests. | CODE + MIGRATION ADDED; LIVE VERIFY OPEN |
| P9 | Both cancellation routes now call an atomic service-role RPC migration that enforces ownership/cutoff, records reason, and releases seats. Local only; migration not applied and refund execution remains separate. | CODE + MIGRATION ADDED; DEPLOY/REFUND OPEN |
| P10 | Ratings derive trip/driver from the canonical booking, resolve driver user ID for notifications, and use an aggregate summary RPC. Local only until migration reconciliation/application. | CODE + MIGRATION ADDED |
| P11 | Amount bounds are currency-agnostic (50 to 5,000,000 minor units) and three-decimal currencies (JOD, KWD, BHD, OMR) are not forced to multiples of 10 for create-intent. | FIXED: `MIN_PAYMENT_AMOUNT_MINOR=50`, `MAX_PAYMENT_AMOUNT_MINOR=5_000_000` in `shared.ts` and `src/shared/currency/currency.ts`. `toStripeMinorUnits` rounds three-decimal currencies to nearest 10. |

## Tier 4 - backend and jobs

| ID | Finding | State |
|---|---|---|
| B1 | `/mobility-os/public-snapshot` (unauthenticated) opened a privileged Postgres connection and ran DDL on every request. Now a SELECT-first path with a per-isolate memo. | EDITED (`shared.ts`) |
| B2 | `/mobility-os/booking/create`: read-then-write on a stale corridor row (oversell, `seats_booked` overwritten not incremented), client `timestamp` feeds dynamic pricing, no payment, fractional quantity allowed. Needs an atomic RPC like the ride-booking one. | GUARDED: route returns 503 until payment processing is available. `app_create_mobility_booking` RPC exists as an atomic future replacement. TO RE-ENABLE once payment flow is wired. |
| B3 | `consume_rate_limit` exists in `20261001000000` (verified); create-intent fails closed (503) if that migration is not applied in production. `cleanup_api_rate_limits` previously had no schedule. | FIXED: migration `20261119140000_cleanup_api_rate_limits_cron.sql` adds pg_cron job (daily 03:15 UTC, idempotent). TO RUN on linked project. |
| B4 | Each `finalizeTopUpTransaction` opens a direct Postgres connection (no pooler). | FIXED: `finalizeTopUpTransaction` now calls `app_finalize_wallet_top_up` RPC via the Supabase client — no direct Postgres client. See `shared.ts` line ~2340. |

## Tiers 5 and 6 - tests, performance, accessibility

Not reviewed. Coverage was reported as 20% lines against an 85% gate. Run `npm run verify:ci` and
`npm run test:e2e` before any score is claimed.

## Verification to run (needs a shell)

```
npm pkg set "dependencies.@sentry/core=^8.55.2"
rmdir /s /q node_modules          (move the repo out of OneDrive first)
npm install
npm run type-check
npm run lint
npm run build
npm run verify:ci
deno check supabase/functions/make-server-0b1f4071/index.ts
supabase db push --dry-run
npm run test:e2e:smoke
```

```sql
-- A3: which columns does bookings really have?
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'bookings' order by 1;
-- A1: test as anon with the anon key: GET /rest/v1/drivers?select=license_number&limit=1
```

After applying the booking migration, create one booking end to end and confirm `amount` is the trip
price times seats.

## Score

Local verification on 2026-11-03 is recorded in `REVIEW_REPORT.md`: production build, lint, TypeScript, 2,072 tests, route/security/env checks, Deno edge types, and API contracts passed. Coverage was 23.69% statements. Linked schema lint passed, but migrations are divergent and pending; production booking/payment and provider callback flows remain unverified. Not certified for production release.
