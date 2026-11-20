# Package tracking and escrow hardening

## What this rollout adds

Migration `20261120100000_package_tracking_escrow_hardening.sql` adds a server-authoritative escrow ledger for the canonical `public.packages` model.

- `public.package_escrows` records one escrow per package, with a JOD amount, payer, assigned driver account, provider payment reference, provider event reference, lifecycle status, and timestamps.
- Provider payment and event identifiers are unique, so the database rejects duplicate funding records.
- Package payment state is constrained to unpaid, pending, held, released, refunded, failed, or disputed.
- Package status transitions are constrained to the supported delivery lifecycle.
- Authenticated clients cannot directly change package assignment, delivery verification, delivery evidence, payment status, or escrow-related state.
- Package timeline events are participant-readable and client append/update/delete access is revoked.
- `record_package_escrow_payment` is service-role-only and must be called only after the payment provider signature, amount, currency, and package reference have been verified.
- `release_package_escrow` is service-role-only and requires delivered status, a delivery verification timestamp, evidence URL, and no active dispute.
- `open_package_dispute` is callable by an authenticated package participant and freezes a held escrow.

## Important integration boundary

This migration supplies database enforcement primitives. It does **not** by itself:
- configure or activate Stripe or a Jordanian payment acquirer;
- validate provider webhook signatures;
- connect the existing payment webhook handler to `record_package_escrow_payment`;
- implement server-side pickup/delivery OTP verification or evidence upload;
- replace the legacy browser `PackageTrackingService` localStorage implementation;
- deploy the migration to the live Supabase project.

Do not represent payment as held or released in the UI until the verified webhook and trusted delivery-verification paths call these database functions successfully.

## Rollout dependencies

The canonical rollout must apply the operating-model migration and runtime-contract migration before this migration, because it depends on:
- `public.users`, `public.drivers`, `public.trips`, and `public.packages`;
- `public.package_events`;
- `public.current_user_id()` and `public.is_admin()`;
- the `package_status_v2` enum.

## Required verification before merge or production rollout

1. Run `npm run sync:supabase-migration-docs` and `npm run verify:supabase-rollout`.
2. Apply the entire canonical rollout chain to a fresh disposable Supabase/Postgres database.
3. Confirm the migration applies when `package_escrows` and the new package columns do not yet exist.
4. Verify sender, recipient, assigned driver, unrelated user, and admin read access for package, escrow, and timeline records.
5. Verify authenticated clients cannot insert forged escrow rows, forge timeline events, alter package status, alter payment state, change the assigned trip, or set delivery evidence.
6. Verify duplicate provider event IDs and duplicate provider payment IDs cannot create a second escrow.
7. Verify amount mismatch, wrong currency, unassigned package, cancelled package, and missing driver account all fail closed.
8. Verify escrow cannot be released before delivery, without verification timestamp/evidence, during a dispute, or more than once.
9. Verify a participant dispute freezes held funds and blocks release.
10. Add integration tests for the real provider webhook and server-side pickup/delivery verification before declaring issue #241 complete.
11. Review the SQL against the actual production schema and prepare a backup and compensating migration before deployment.

## Current status

Code authored on a feature branch. Database execution, provider integration, end-to-end tests, and production rollout remain outstanding. This is not a claim that live package escrow is active.
