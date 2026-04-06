export const rolloutMigrations = [
  'src/supabase/migrations/20260326080000_legacy_public_table_cutover.sql',
  'src/supabase/migrations/20260327090000_production_operating_model.sql',
  'src/supabase/migrations/20260327110000_notifications_runtime_contract.sql',
  'src/supabase/migrations/20260401093000_database_hardening.sql',
  'src/supabase/migrations/20260401113000_unified_backend_contract.sql',
  'src/supabase/migrations/20260401133000_align_canonical_rls_policies.sql',
  'src/supabase/migrations/20260401143000_harden_rpc_execute_permissions.sql',
  'src/supabase/migrations/20260401183000_growth_and_demand_alerts.sql',
  'src/supabase/migrations/20260401193000_referrals_and_growth_events.sql',
  'src/supabase/migrations/20260401213000_expand_runtime_contract_tables.sql',
  'src/supabase/migrations/20260401223000_communications_runtime_contract.sql',
  'src/supabase/migrations/20260401233000_communication_delivery_operations.sql',
  'src/supabase/migrations/20260404110000_route_automation_backbone.sql',
  'src/supabase/migrations/20260404133000_harden_auth_signup_trigger.sql',
  'src/supabase/migrations/20260404153000_operational_bootstrap_reference_data.sql',
  'src/supabase/migrations/20260406101500_harden_automation_queue_access_and_support_rpcs.sql',
];

export const operationalSeedFiles = [
  'db/seeds/roles.seed.sql',
  'db/seeds/cities.seed.sql',
  'db/seeds/trip_types.seed.sql',
  'db/seeds/pricing.seed.sql',
  'db/seeds/core.seed.sql',
  'db/seeds/automation.seed.sql',
];

export const rolloutSeedFiles = [
  ...operationalSeedFiles,
  'src/supabase/seeds/mock_engine_smoke_checks.sql',
];

export const requiredDocs = [
  'docs/OPERATIONAL_SEEDING.md',
  'docs/LAUNCH_REHEARSAL_CHECKLIST.md',
  'docs/PRODUCTION_CUTOVER_CHECKLIST.md',
  'docs/REAL_USER_TEST_MATRIX.md',
  'docs/COMMUNICATIONS_DELIVERY_RUNBOOK.md',
];
