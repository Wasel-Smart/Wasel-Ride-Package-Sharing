# Mock Engine Launch Pack

This pack gives the application engine a realistic canonical Supabase dataset
for mock launch, QA rehearsals, demos, and pre-production smoke runs.

Files:

- `src/supabase/seeds/mock_engine_launch_pack.sql`
- `src/supabase/seeds/mock_engine_smoke_checks.sql`
- `src/supabase/migrations/20260401133000_align_canonical_rls_policies.sql`

## What It Seeds

The launch pack creates a stable mock environment around the canonical schema:

- 5 users
- 2 approved drivers
- 2 active vehicles
- 3 trips across real Jordan corridors
- 2 confirmed bookings
- 3 packages across assigned, in-transit, and delivered states
- wallet balances plus transaction history
- payment methods
- verification records
- notifications
- trip presence rows for live engine surfaces

## Recommended Order

1. Apply the canonical migrations.
2. Apply `20260401133000_align_canonical_rls_policies.sql`.
3. Run `mock_engine_launch_pack.sql`.
4. Run `mock_engine_smoke_checks.sql`.
5. Start the app and exercise the main engine flows.

## Suggested Smoke Flows

Run these flows after seeding:

- Search trips from `Amman` to `Irbid`
- Open driver trips for Omar and Sara
- Load wallet and wallet insights for Lina and Omar
- Track package codes:
  - `PKG-AMM-001`
  - `PKG-AQB-002`
  - `PKG-ZRQ-003`
- Load notifications for seeded users
- Open booking lists for the seeded trips

## Mock Personas

- `Lina Haddad`: verified passenger with active wallet and package activity
- `Omar Nasser`: active driver with open and booked trips
- `Sara Khoury`: active driver with long-haul route and package flow
- `Kareem Saleh`: partially verified passenger for restricted-path testing
- `Noor Hamdan`: admin reference persona

## Important Notes

- The seed pack uses fixed UUIDs on purpose so downstream demos and smoke checks
  stay reproducible.
- `auth_user_id` is left `NULL` for seeded mock identities. This is intentional:
  the pack is for engine-state launch, not for real authentication sign-in.
- If you want these personas to be sign-in capable, create real Supabase Auth
  users first, then update `public.users.auth_user_id` to bind them.
- Wallet balances are seeded to be operationally useful for demos; they are not
  meant to represent audited accounting history.

## Engine Readiness Criteria

You can consider the mock engine ready when:

- trip search returns seeded corridors
- wallet reads return balances and transaction history
- package tracking returns assigned, in-transit, and delivered examples
- notifications render for at least one passenger and one driver
- booking views load for both passenger-side and driver-side flows
- no RLS errors appear on canonical insert/update operations used by the app
