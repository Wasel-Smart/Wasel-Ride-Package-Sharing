# Schema Bootstrap Notes (P0 #242)

## Problem
A clean `schema.sql` application failed because:
1. `trips` referenced `recurring_trips` before it was created.
2. `bookings` had an invalid subquery CHECK (`no_self_booking`).

## Fix
Migration `20261119000000_fix_bootstrap_order_and_self_booking.sql`:
- Drops the invalid CHECK if present.
- Installs race-safe `prevent_self_booking()` trigger.
- Ensures the FK exists when possible.

## Required Order for Clean Bootstrap
1. profiles, vehicles
2. recurring_trips
3. trips (recurring_trip_id column, no inline FK)
4. trip_stops, bookings (no subquery CHECK)
5. ALTER TABLE trips ADD FK
6. prevent_self_booking trigger
7. remaining tables, indexes, RLS

## Verification
- [ ] Apply on a brand-new empty Supabase project
- [ ] Confirm zero errors
- [ ] Self-booking attempt is rejected
- [ ] CI job for clean bootstrap
