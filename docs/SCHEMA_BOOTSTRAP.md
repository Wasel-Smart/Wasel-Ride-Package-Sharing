# Schema Bootstrap Notes (P0 #242)

## Problem
A clean `schema.sql` application failed on a new Supabase project because:

1. `trips` referenced `recurring_trips(id)` before `recurring_trips` was created.
2. `bookings` had an invalid `CHECK` constraint that used a subquery (`no_self_booking`). Postgres rejects subqueries in CHECK constraints.

## Fix Applied
- Migration `20261119000000_fix_bootstrap_order_and_self_booking.sql`:
  - Drops the invalid CHECK if present.
  - Installs a race-safe `prevent_self_booking()` trigger (uses `FOR UPDATE` on the trip row).
  - Ensures the FK from `trips.recurring_trip_id` exists when possible.

## Required Order for Clean Bootstrap
When writing or regenerating the monolithic `schema.sql`:

1. Create `profiles`, `vehicles`
2. Create `recurring_trips`
3. Create `trips` (with `recurring_trip_id UUID` column, **no inline FK**)
4. Create `trip_stops`, `bookings` (no subquery CHECK)
5. `ALTER TABLE trips ADD CONSTRAINT ... FOREIGN KEY (recurring_trip_id) ...`
6. Create the `prevent_self_booking` trigger
7. Then the rest of the tables, indexes, RLS, etc.

## Verification Checklist
- [ ] Apply all migrations (or the fixed schema) on a **brand-new empty** Supabase project
- [ ] Confirm zero errors
- [ ] Attempt to insert a booking where `passenger_id = driver_id` and confirm it is rejected
- [ ] Add a CI job that runs the clean bootstrap

See also: `PRODUCTION_READINESS.md` and issue #242.
