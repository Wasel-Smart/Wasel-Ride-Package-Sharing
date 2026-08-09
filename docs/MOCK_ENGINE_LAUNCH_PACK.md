# Mock Engine Launch Pack

This pack validates the production data contract before real traffic is enabled. It uses controlled seed data only and must not be run against a live production database after launch.

## Scope

- Seed representative riders, drivers, vehicles, trips, bookings, packages, payments, and notifications.
- Verify the Supabase runtime contract, RLS coverage, RPC grants, and worker queue assumptions.
- Exercise web, mobile, and worker flows without external customer impact.

## Preconditions

- `SUPABASE_DB_URL` points to the intended rehearsal database.
- `VITE_SUPABASE_URL` and a current public key are configured.
- Stripe, messaging, and notification providers are in test or sandbox mode.
- The target database has a verified backup or disposable rehearsal data.

## Apply Pack

```bash
psql "$SUPABASE_DB_URL" -f supabase/seeds/mock_engine_launch_pack.sql
psql "$SUPABASE_DB_URL" -f supabase/seeds/mock_engine_smoke_checks.sql
npm run verify:supabase-rollout
```

## Validation

- Sign in as a seeded rider and driver.
- Create a ride booking and confirm the booking status changes.
- Create a package handoff and confirm package events are recorded.
- Confirm wallet/payment rows are created only through approved RPC paths.
- Confirm notifications are queued and delivery attempts are idempotent.

## Exit Criteria

- No seed SQL errors.
- No RLS permission failures in expected user flows.
- No direct frontend table access regressions.
- Smoke checks pass and generated test rows are documented for cleanup.
