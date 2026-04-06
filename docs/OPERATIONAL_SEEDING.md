# Operational Seeding

This project now boots from a modular operational seed pipeline under `db/seeds/`.
The goal is simple: after migrations and seeding, the platform should be ready to
exercise real product flows without manual dashboard setup.

## What Gets Seeded

The seed pipeline is layered and idempotent:

1. `roles.seed.sql`
   Seeds the canonical operational roles: `admin`, `driver`, and `rider`.
2. `cities.seed.sql`
   Seeds the launch geography: `Amman`, `Irbid`, `Aqaba`, and `Zarqa`.
3. `trip_types.seed.sql`
   Seeds `Wasel` and `Raje3`, including the auto-return planning model.
4. `pricing.seed.sql`
   Seeds high-demand corridors plus pricing rules for one-way and return-aware trips.
5. `core.seed.sql`
   Seeds realistic users, drivers, vehicles, trips, bookings, packages, wallets, and notifications.
6. `automation.seed.sql`
   Seeds route reminders, demand alerts, pricing snapshots, support tickets, referrals, growth events, and worker jobs.

Each seed file is transaction-wrapped and uses stable keys plus `ON CONFLICT`
upserts so it can be run repeatedly without duplicating operational data.

## Commands

Apply only the modular seed pipeline:

```bash
npm run seed
```

Apply migrations and then seeds in one rollout:

```bash
npm run apply:supabase-rollout -- --with-seeds
```

Run just the operational seeds without smoke-check selects:

```bash
node scripts/run-seeds.mjs --skip-smoke-checks
```

## Verification Queries

After seeding, these checks should all return data:

```sql
select count(*) from public.system_roles;
select count(*) from public.cities;
select count(*) from public.trip_types_catalog;
select count(*) from public.route_corridors;
select count(*) from public.pricing_rules;
select count(*) from public.trips where trip_type_key = 'raje3';
select count(*) from public.automation_jobs where job_status = 'queued';
select seed_name, seed_status, executed_at
from public.seed_execution_log
order by executed_at desc;
```

## Safe Extension Rules

1. Add schema in a new migration, never by editing an old migration.
2. Add new reference data to the smallest seed layer that owns it.
3. Prefer fixed IDs or stable natural keys for seed rows.
4. Always use `ON CONFLICT` or deterministic update logic.
5. Keep each seed file internally transactional with `begin` and `commit`.
6. If a new automation flow needs queue rows, seed both the source record and the derived worker job contract.
7. If you add a new seed file, update:
   - `scripts/supabase-rollout-manifest.mjs`
   - `scripts/verify-supabase-rollout.mjs`
   - `tests/database/operationalSeeding.test.ts`

## Operational Notes

- `trip_type_key = 'wasel'` represents one-way execution.
- `trip_type_key = 'raje3'` plus a shared `lifecycle_group_id` and `paired_trip_id`
  represents the return-aware lifecycle.
- `automation.seed.sql` calls `public.app_backfill_automation_jobs(50)` so reminder
  and support jobs self-initialize after the source data lands.
- The legacy mock launch pack under `src/supabase/seeds/` remains in the repo for
  historical reference, but the operational bootstrap source of truth is now `db/seeds/`.
