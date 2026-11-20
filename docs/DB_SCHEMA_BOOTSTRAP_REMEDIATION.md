# Database bootstrap remediation

## Scope

This change repairs the legacy reference schema at `src/supabase/schema.sql`:

- Creates `recurring_trips` before `trips`, which contains its foreign key.
- Removes the unsupported subquery-based `bookings.no_self_booking` CHECK constraint.
- Enforces self-booking prevention with a `BEFORE INSERT OR UPDATE` trigger that locks the referenced trip row while checking the driver.
- Removes the synthetic admin profile seed. Admin identities must be provisioned through Supabase Auth and an audited server-side role-assignment process.

## Important limitation

This file is a reference schema, not proof that the production database or every deployed migration uses it. This change does **not** close production-readiness issue #242 by itself.

## Required verification before merge or rollout

1. Identify the canonical migration chain used by the deployed Supabase project.
2. Apply the complete migration chain to a brand-new disposable Supabase/Postgres database.
3. Confirm the schema applies without errors and that the expected tables, indexes, triggers, and RLS policies exist.
4. Test that a user can book another driver's trip.
5. Test that a driver cannot book their own trip, including an update that changes the booking's trip or passenger.
6. Test concurrent booking/driver ownership changes to confirm the trigger's row lock serializes the ownership check.
7. Run the repository type-check, lint, unit/integration tests, and CI workflows.
8. Review the migration and rollback plan before any production deployment.

Do not apply this reference schema directly to production as a substitute for reviewed migrations.
