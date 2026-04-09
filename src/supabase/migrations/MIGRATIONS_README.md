# Wasel Database Migrations

This folder contains all Supabase SQL migrations for the Wasel platform.

## Important Rules

1. Never edit an existing migration file once it has been applied.
2. Always create a new file for schema changes using the timestamp naming convention below.
3. Test migrations locally against a Supabase dev project before running on production.
4. Migrations run in filename order.

---

## Naming Convention

```text
YYYYMMDDHHMMSS_short_description.sql
```

Example: `20260401120000_add_driver_rating_column.sql`

---

## Applied Migration Sequence

| # | File | Description | Status |
|---|------|-------------|--------|
| 01 | `20260210_complete_schema.sql` | Initial complete schema for core tables | Applied |
| 02 | `20260223000000_production_schema.sql` | Production hardening and RLS policies | Applied |
| 03 | `20260224_additional_tables.sql` | Package tracking and wallet transactions | Applied |
| 04 | `20260224_postgis_functions.sql` | PostGIS spatial functions for route matching | Applied |
| 05 | `20260224_wasel_complete_schema.sql` | Consolidated schema snapshot for reference | Applied |
| 06 | `20260224000000_production_backend_schema.sql` | Backend service layer tables | Applied |
| 07 | `20260224000001_backup_configuration.sql` | Backup schedules and retention configuration | Applied |
| 08 | `20260302_regionalization_schema.sql` | Region, corridor, and zone tables | Applied |
| 09 | `20260310_security_performance_fixes.sql` | Security and indexing fixes | Applied |
| 10 | `20260320000000_w_mobility_platform_complete.sql` | Mobility OS, Raje3, and corporate accounts | Applied |
| 11 | `20260326080000_legacy_public_table_cutover.sql` | Preserve conflicting legacy public tables before canonical runtime tables are created | Ready |
| 12 | `20260327090000_production_operating_model.sql` | Operating model, pricing, and service workflows | Ready |
| 13 | `20260327110000_notifications_runtime_contract.sql` | Canonical notifications runtime table aligned with current app usage | Ready |
| 14 | `20260401093000_database_hardening.sql` | Integrity constraints, default-payment safety, and audit indexes | Ready |
| 15 | `20260401113000_unified_backend_contract.sql` | Canonical user backfill, auth sync trigger, and 2FA fields | Ready |
| 16 | `20260401133000_align_canonical_rls_policies.sql` | Explicit canonical insert/update/delete policies aligned with app fallback paths | Ready |
| 17 | `20260401143000_harden_rpc_execute_permissions.sql` | Restrict privileged RPC execution and set safe search paths on security-definer functions | Ready |
| 18 | `20260401183000_growth_and_demand_alerts.sql` | Demand capture persistence for ride, bus, and package growth flows | Ready |
| 19 | `20260401193000_referrals_and_growth_events.sql` | Referral attribution and growth event persistence | Ready |
| 20 | `20260401213000_expand_runtime_contract_tables.sql` | Add the remaining trip, booking, and package columns required by the live app runtime contract | Ready |
| 21 | `20260401223000_communications_runtime_contract.sql` | Persist communication preferences and outbound delivery queue rows | Ready |
| 22 | `20260401233000_communication_delivery_operations.sql` | Add retries, idempotency, and processor operation fields for outbound communications | Ready |
| 23 | `20260404110000_route_automation_backbone.sql` | Queue-backed reminders, support SLA automation, pricing snapshots, and worker-safe automation job helpers | Ready |
| 24 | `20260404133000_harden_auth_signup_trigger.sql` | Remove the legacy auth profile trigger path, backfill canonical users from auth, and keep signup bound to `public.users` | Ready |
| 25 | `20260404153000_operational_bootstrap_reference_data.sql` | Add operational catalogs for roles, cities, trip types, route corridors, pricing rules, and seed execution logging | Ready |
| 26 | `20260406101500_harden_automation_queue_access_and_support_rpcs.sql` | Lock down direct client automation queue inserts and move support ticket writes behind atomic RPCs | Ready |
| 27 | `20260409120000_production_security_and_queue_hardening.sql` | Move 2FA secrets into a private schema, null legacy public secret columns, and add atomic communication queue claiming | Ready |

---

## Live Cutover Sequence

For older production projects that still have legacy `public.users`, `public.trips`,
`public.bookings`, or `public.vehicles` tables, apply the runtime cutover in this order:

1. `20260326080000_legacy_public_table_cutover.sql`
2. `20260327090000_production_operating_model.sql`
3. `20260327110000_notifications_runtime_contract.sql`
4. `20260401093000_database_hardening.sql`
5. `20260401113000_unified_backend_contract.sql`
6. `20260401133000_align_canonical_rls_policies.sql`
7. `20260401143000_harden_rpc_execute_permissions.sql`
8. `20260401183000_growth_and_demand_alerts.sql`
9. `20260401193000_referrals_and_growth_events.sql`
10. `20260401213000_expand_runtime_contract_tables.sql`
11. `20260401223000_communications_runtime_contract.sql`
12. `20260401233000_communication_delivery_operations.sql`
13. `20260404110000_route_automation_backbone.sql`
14. `20260404133000_harden_auth_signup_trigger.sql`
15. `20260404153000_operational_bootstrap_reference_data.sql`
16. `20260406101500_harden_automation_queue_access_and_support_rpcs.sql`
17. `20260409120000_production_security_and_queue_hardening.sql`
18. `db/seeds/roles.seed.sql`
19. `db/seeds/cities.seed.sql`
20. `db/seeds/trip_types.seed.sql`
21. `db/seeds/pricing.seed.sql`
22. `db/seeds/core.seed.sql`
23. `db/seeds/automation.seed.sql`
24. `src/supabase/seeds/mock_engine_smoke_checks.sql`

---

## Overlapping Files

Several files from `20260224` share the same date prefix because multiple schema areas were developed in parallel.
Future migrations must use full `YYYYMMDDHHMMSS` timestamps to avoid collisions.

---

## How to Apply a New Migration

```bash
supabase db push
```

Or manually:

```bash
psql "$SUPABASE_DB_URL" -f migrations/20260401120000_my_change.sql
```

Or apply the full production rollout pack from the project root:

```bash
npm run apply:supabase-rollout
```

To apply only the operational seed pipeline:

```bash
npm run seed
```

## Seed Packs

Operational bootstrap seed assets now live in `db/seeds/`.

- `roles.seed.sql`
- `cities.seed.sql`
- `trip_types.seed.sql`
- `pricing.seed.sql`
- `core.seed.sql`
- `automation.seed.sql`

Smoke checks remain in `src/supabase/seeds/`.

- `mock_engine_smoke_checks.sql`

The legacy `mock_engine_launch_pack.sql` is retained only as a historical reference pack.

---

## Reference Schema Files

| File | Purpose |
|------|---------|
| `schema.sql` | Full current schema snapshot for reference only |
| `ai_schema.sql` | AI and intelligence layer schema reference |

---

## Rollback Policy

Supabase does not support automatic rollbacks. Before any destructive migration:

1. Take a manual backup from the Supabase dashboard.
2. Prepare a compensating migration that undoes the change.
3. Keep the rollback migration ready before production rollout.
