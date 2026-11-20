# Package tracking and escrow hardening

## Architecture

Package payments use the existing double-entry wallet ledger and `public.escrow_accounts`. This rollout does not introduce a second package-specific financial ledger.

The migration `20261120100000_package_tracking_escrow_hardening.sql` adds:
- A constrained package payment state.
- A private `private.package_handoff_secrets` table containing only HMAC-SHA-256 pickup/delivery OTP hashes, failed-attempt counters, and lock state. The Edge Function requires a high-entropy `PACKAGE_OTP_PEPPER` secret (at least 32 characters), which must be configured in Supabase Function Secrets before deployment.
- Participant-readable, client-append-only package timeline events.
- A trigger that blocks authenticated clients from creating packages directly or changing assignment, tracking, custody, evidence, or financial state.
- A dispute RPC that freezes held package escrow in the existing ledger by moving the escrow state to `cancelled`; the wallet refund flow must then resolve the dispute.

The server package workflow now also generates random tracking IDs and one-time pickup/delivery OTPs, auto-matches waiting requests when an eligible trip is published, and assigns a selected trip only after checking driver approval, route, departure time and remaining package slots. It reserves one slot for an unpaid request. Unpaid reservations expire after 15 minutes; the migration schedules a five-minute cleanup job when `pg_cron` is available. Payment attempts extend the reservation while active and are reconciled/cancelled after their 30-minute expiry. Verify the scheduled job exists in `cron.job` on the target project. OTP hashes are HMAC-SHA-256 using the required server-only pepper.

The wallet service changes add:
- Package beneficiary resolution through the package's assigned trip and driver.
- Sender ownership, assigned-trip, payment-state, and fee-amount checks before package escrow is funded.
- Idempotent lookup by payment-intent ID before creating a second escrow.
- A delivery-evidence and no-dispute gate before package escrow can be released.
- Refund eligibility for cancelled/disputed package escrow only.

## Critical remaining implementation

The database and wallet-service guards are not the whole package workflow. Before enabling package payments:
1. Configure `PACKAGE_OTP_PEPPER` as a random, high-entropy Supabase Edge Function secret. The package creation endpoint generates pickup and delivery OTPs on the server, stores only peppered hashes in the private table, and returns the codes once to the sender.
2. The package tracking endpoint must require authentication and verify sender, recipient, or assigned-driver participation. It must not expose OTP hashes or private contact data publicly.
3. Pickup and delivery endpoints must verify the OTP server-side, rate-limit failures, enforce the assigned-driver identity, and update package state atomically.
4. Delivery evidence must be uploaded to a private Storage bucket through a signed upload URL. The server must verify that the object exists before marking delivery verified.
5. The package UI must collect the driver/receiver-provided OTP and evidence; it must not mark status complete from a local button press.
6. The unified wallet payment-intent endpoint must be called with `purpose=package_payment`, `reference_type=package`, and the canonical package ID. The signed provider webhook must settle the payment intent; browser code must never mark funds held.
7. Add integration tests for webhook replay, payment amount mismatch, wrong currency, unassigned package, wrong sender, invalid/locked OTP, wrong driver, missing evidence, active dispute, duplicate release, and refund after dispute.

## Rollout dependencies and production state

This migration depends on the canonical rollout migrations that create:
- `public.users`, `public.drivers`, `public.trips`, `public.packages`, and `public.package_events`;
- `public.escrow_accounts` and the wallet ledger tables;
- `public.current_user_id()` and `public.is_admin()`;
- the `package_status_v2` and `wallet_escrow_status` enums.

The connected production project currently has no canonical application tables or Auth users. Its migration history does not match the repository registry. Do not apply the package migration by itself or run the rollout script against production until the actual Vercel Supabase target is confirmed and the full baseline/rollout chain has been tested against a disposable database.

## Required verification before merge or production rollout

1. Run `npm run sync:supabase-migration-docs` and `npm run verify:supabase-rollout`.
2. Apply the complete canonical migration chain to a disposable Supabase/Postgres environment, not just this migration.
3. Verify the package secret table is not exposed through PostgREST and is inaccessible to `anon` and `authenticated`.
4. Verify clients cannot insert packages, alter package status, alter payment state, change assigned trip, change tracking identifiers, or forge timeline events.
5. Verify only the sender can create/pay for their package and only the assigned driver can verify pickup/delivery.
6. Verify wrong OTP attempts are rate-limited and locked; valid OTPs are single-use.
7. Verify missing or cross-package evidence paths are rejected.
8. Verify webhook replay cannot create duplicate wallet ledger holds or escrow accounts.
9. Verify escrow cannot be released before delivery verification, without stored evidence, or during a dispute.
10. Verify a dispute freezes held escrow and that only the payer can receive a permitted refund.
11. Run type checks, lint, unit tests, edge-function tests, RLS tests, and end-to-end package journeys.
12. Confirm the production target, backup, migration order, and compensating rollback plan before deployment.

## Current status

Database hardening, wallet-ledger package payment/release guards, authenticated package tracking, server-generated pickup/delivery OTPs, driver-only verification, private evidence upload, and participant dispute controls have been authored on a feature branch. The `PACKAGE_OTP_PEPPER` secret is not configured, the canonical database rollout has not been applied, integration tests have not passed, and the backend has not been deployed. Live package payments are not enabled by these changes. The legacy standalone payment-webhook function now returns HTTP 410 so it cannot bypass the unified wallet escrow workflow. Browser-local package tracking and fake escrow have been disabled.
