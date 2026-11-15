# Wasel readiness scorecard

Rule: a score rises only when its evidence exists. "I read the code" is worth at most
a 7. A 9 needs an executed run, a deployed check, or a signed-off human action.

Last review: 2026-11-15. The repository's prior `REVIEW_REPORT.md` and this
scorecard contain different snapshots; use the latest dated evidence below.
No production dashboard, provider sandbox, hosted migration, or live user flow
was accessed during this review. A repository check must not be reported as a
production sign-off.

## Current evidence (2026-11-15)

- App, test, and API TypeScript checks passed during `npm run verify:ci`.
- The verification command did not produce a result for lint or subsequent
  gates in this review. Coverage, edge tests, build, and end-to-end checks are
  therefore not marked green.
- `REVIEW_REPORT.md` (updated 2026-11-10) records unresolved external gates:
  credential rotation/history review, production/staging configuration,
  database migration application, CliQ amount-unit confirmation, and provider
  payment smoke tests.
- This is an evidence-limited code review, not a live readiness certification.

**Current evidence-based overall rating: 6.5/10.** Do not raise this score
until the release gates below have current, reproducible evidence.

| Aspect | Now | Needed for 9 | Evidence required |
|---|---|---|---|
| Payments | 5 | Booking and top-up flows proven end to end in Stripe test mode and the CliQ sandbox | Test-mode run log; CliQ amount unit (JOD vs fils) confirmed from a real sandbox payload |
| Security | 6 | RLS reviewed table by table; secrets rotated; webhooks deployed and returning 200 | RLS review notes; rotation checklist signed; `stripe trigger checkout.session.completed` returns 200 |
| Testing and CI | 5 | `npm run verify` green on a clean checkout; edge tests run in CI | CI run URL; coverage report |
| Architecture | 6 | One authoritative payment path; legacy per-domain functions retired or documented | Deleted or archived functions; updated `docs/architecture.md` |
| Maintainability | 6.5 | `scripts/` pruned; one lockfile per package; duplicate docs archived | Smaller `scripts/`; `CLEANUP_PLAN.md` items closed |
| Operations | 4 | Rotation done, runbook drill done, alerting live, restore tested | Drill notes; alert fired in staging; backup restore log |
| Scalability | 6 | k6 production profile passes against staging at the target load | k6 summary against staging |
| Product fit | 8.5 | Jordan and Iraq flows verified with real providers | Provider sandbox runs |

## Verified by reading (2026-10-17)

- Stripe webhook: signature check with a 300 s timestamp tolerance; top-up crediting is
  idempotent (row lock plus `posted` check in `finalizeTopUpTransaction`).
- Booking card payments: amount and currency reconciled in `finalizeBookingPayment`.
- Refunds: gated by `payments:refund`, ownership-checked, amount capped server-side.
- Runtime admin routes (`apply-migrations`): off unless `ENABLE_RUNTIME_ADMIN_ENDPOINTS`
  is set, and they also need the worker secret.
- `webhooks/_vendor/**` is generated from `make-server-0b1f4071`; run `npm run edge:sync`
  after editing handlers there.

## Changed on 2026-10-17

- Card amounts now use per-currency Stripe minor units (`toStripeMinorUnits`). Before, any
  three-decimal currency other than JOD (KWD, BHD, OMR, TND) was billed at one tenth.
  Unknown currencies (IQD) now fail closed instead of guessing.
- Twilio delivery receipts now verify `X-Twilio-Signature`. Before, the handler required a
  URL token that the StatusCallback URL no longer carries, so receipts were rejected.
  Signature verification is mandatory; configure the signing secret and set
  `TWILIO_WEBHOOK_PUBLIC_URL` if a proxy rewrites the URL.
- Added Deno tests for both changes in `supabase/functions/tests/webhooks.test.ts`.

## Open: needs the owner

1. Rotate every provider credential; purge git history if a secret was ever committed.
2. Run `npm run edge:sync`, then `npm run verify`, and fix what fails.
3. Deploy `webhooks` and confirm Stripe, CliQ and Twilio callbacks return 200.
4. Confirm the Stripe account entity is eligible for a Jordan-market business.

## Open: code

- Pin `@supabase/supabase-js` and the Stripe SDK; commit a `deno.lock`.
- Pool Postgres connections in `finalizeTopUpTransaction` (one new client per webhook).
- Retire or document the legacy per-domain edge functions that overlap `make-server`.
- Add a test that every non-public route rejects an anonymous request.
- Review RLS migrations against `is_anonymous` and role tables.
- Fix mojibake in comments (`shared.ts` has `â”€â”€` where `──` was intended).

## Changed on 2026-11-08

- Stripe SDK calls and raw API requests now share the SDK-supported `2024-11-20`
  API version. A Deno regression test verifies the raw request header.

## Changed on 2026-11-09

- Outbox batches now persist expiring claim tokens across RPC calls. The worker
  verifies claims on completion, enforces a dispatch timeout, avoids storing
  upstream response bodies, and surfaces events that have no worker route.
- Notification event handling now deduplicates by recipient and outbox event,
  retries database write failures, rejects external action URLs, and returns a
  non-success response when a supported event has no completed side effect.
- These changes are code-reviewed only: migrations have not been applied and
  the linked Supabase project is inactive. Do not raise production readiness
  scores until the database migration, Deno suites, and deployed worker are
  verified.
