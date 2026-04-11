# Wasel Database Migrations

This directory is maintained from the canonical registry in `scripts/supabase-migration-registry.mjs`.
The rollout script, verification script, tests, and this README all derive from that registry.

## Operating Rules

1. Never edit an applied migration.
2. New rollout migrations must use the canonical filename pattern `YYYYMMDDHHMMSS_description.sql`.
3. Keep one responsibility per migration: schema, backfill, hardening, or seed-support.
4. Separate durable schema changes from data backfills unless the migration would be invalid without the data step.
5. Prefer deterministic SQL only. Avoid time-dependent constraints, environment-sensitive defaults, and hidden runtime-owned DDL.
6. Run `npm run verify:supabase-rollout` after any migration change.

## Naming Convention

```text
YYYYMMDDHHMMSS_short_description.sql
```

Example: `20260401120000_add_driver_rating_column.sql`

Historical files that predate the current standards remain frozen and explicitly tracked as legacy exceptions:
- `20260210_complete_schema.sql`
- `20260224_additional_tables.sql`
- `20260224_postgis_functions.sql`
- `20260224_wasel_complete_schema.sql`
- `20260302_regionalization_schema.sql`
- `20260310_security_performance_fixes.sql`

## Migration Inventory

| # | File | Category | Description | Status |
|---|------|----------|-------------|--------|
| 01 | `20260210_complete_schema.sql` | schema | Initial complete schema for core tables | Applied |
| 02 | `20260223000000_production_schema.sql` | security | Production hardening and RLS policies | Applied |
| 03 | `20260224_additional_tables.sql` | schema | Package tracking and wallet transactions | Applied |
| 04 | `20260224_postgis_functions.sql` | functions | PostGIS spatial functions for route matching | Applied |
| 05 | `20260224_wasel_complete_schema.sql` | snapshot | Consolidated schema snapshot for reference | Applied |
| 06 | `20260224000000_production_backend_schema.sql` | schema | Backend service layer tables | Applied |
| 07 | `20260224000001_backup_configuration.sql` | operations | Backup schedules and retention configuration | Applied |
| 08 | `20260302_regionalization_schema.sql` | schema | Region, corridor, and zone tables | Applied |
| 09 | `20260310_security_performance_fixes.sql` | security | Security and indexing fixes | Applied |
| 10 | `20260320000000_w_mobility_platform_complete.sql` | schema | Mobility OS, Raje3, and corporate accounts | Applied |
| 11 | `20260326080000_legacy_public_table_cutover.sql` | schema | Preserve conflicting legacy public tables before canonical runtime tables are created | Ready |
| 12 | `20260327090000_production_operating_model.sql` | schema | Operating model, pricing, and service workflows | Ready |
| 13 | `20260327110000_notifications_runtime_contract.sql` | runtime-contract | Canonical notifications runtime table aligned with current app usage | Ready |
| 14 | `20260401093000_database_hardening.sql` | hardening | Integrity constraints, default-payment safety, and audit indexes | Ready |
| 15 | `20260401113000_unified_backend_contract.sql` | runtime-contract | Canonical user backfill, auth sync trigger, and 2FA fields | Ready |
| 16 | `20260401133000_align_canonical_rls_policies.sql` | security | Explicit canonical insert/update/delete policies aligned with app fallback paths | Ready |
| 17 | `20260401143000_harden_rpc_execute_permissions.sql` | security | Restrict privileged RPC execution and set safe search paths on security-definer functions | Ready |
| 18 | `20260401183000_growth_and_demand_alerts.sql` | schema | Demand capture persistence for ride, bus, and package growth flows | Ready |
| 19 | `20260401193000_referrals_and_growth_events.sql` | schema | Referral attribution and growth event persistence | Ready |
| 20 | `20260401213000_expand_runtime_contract_tables.sql` | runtime-contract | Add the remaining trip, booking, and package columns required by the live app runtime contract | Ready |
| 21 | `20260401223000_communications_runtime_contract.sql` | runtime-contract | Persist communication preferences and outbound delivery queue rows | Ready |
| 22 | `20260401233000_communication_delivery_operations.sql` | hardening | Add retries, idempotency, and processor operation fields for outbound communications | Ready |
| 23 | `20260404110000_route_automation_backbone.sql` | runtime-contract | Queue-backed reminders, support SLA automation, pricing snapshots, and worker-safe automation job helpers | Ready |
| 24 | `20260404133000_harden_auth_signup_trigger.sql` | security | Remove the legacy auth profile trigger path, backfill canonical users from auth, and keep signup bound to public.users | Ready |
| 25 | `20260404153000_operational_bootstrap_reference_data.sql` | schema | Add operational catalogs for roles, cities, trip types, route corridors, pricing rules, and seed execution logging | Ready |
| 26 | `20260406101500_harden_automation_queue_access_and_support_rpcs.sql` | security | Lock down direct client automation queue inserts and move support ticket writes behind atomic RPCs | Ready |
| 27 | `20260409113000_wallet_and_runtime_integrity_hardening.sql` | hardening | Finalize wallet and runtime integrity constraints and wallet access indexes | Ready |
| 28 | `20260409120000_production_security_and_queue_hardening.sql` | security | Move 2FA secrets into a private schema, null legacy public secret columns, and add atomic communication queue claiming | Ready |
| 29 | `20260409153000_runtime_performance_indexes.sql` | performance | Add expression indexes for auth-linked runtime and RLS lookup paths | Ready |
| 30 | `20260410110000_reassert_auth_signup_user_sync.sql` | security | Reassert canonical auth.users to public.users sync and recover missing phone numbers for signup-triggered users | Ready |

## Rollout Sequence

Apply the rollout set in this exact order for production cutover projects:

### Migrations

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
17. `20260409113000_wallet_and_runtime_integrity_hardening.sql`
18. `20260409120000_production_security_and_queue_hardening.sql`
19. `20260409153000_runtime_performance_indexes.sql`
20. `20260410110000_reassert_auth_signup_user_sync.sql`

### Seeds

1. `db/seeds/roles.seed.sql`
2. `db/seeds/cities.seed.sql`
3. `db/seeds/trip_types.seed.sql`
4. `db/seeds/pricing.seed.sql`
5. `db/seeds/core.seed.sql`
6. `db/seeds/automation.seed.sql`
7. `src/supabase/seeds/mock_engine_smoke_checks.sql`

## Seed Packs

Operational bootstrap seed assets live in `db/seeds/`:

- `roles.seed.sql`
- `cities.seed.sql`
- `trip_types.seed.sql`
- `pricing.seed.sql`
- `core.seed.sql`
- `automation.seed.sql`

Smoke checks remain in `src/supabase/seeds/`.

## Commands

Apply the canonical rollout pack:

```bash
npm run apply:supabase-rollout
```

Apply the rollout pack plus seeds:

```bash
npm run apply:supabase-rollout -- --with-seeds
```

Regenerate this README from the migration registry:

```bash
npm run sync:supabase-migration-docs
```

## Reference Files

| File | Purpose |
|------|---------|
| `schema.sql` | Full current schema snapshot for reference only |
| `ai_schema.sql` | AI and intelligence layer schema reference |
| `MIGRATION_STANDARDS.md` | Rules for new migration authoring and review |

## Rollback Policy

Supabase does not support automatic rollbacks. Before any destructive migration:

1. Take a manual backup from the Supabase dashboard.
2. Prepare a compensating migration before rollout.
3. Keep rollback SQL reviewed and ready before production execution.

