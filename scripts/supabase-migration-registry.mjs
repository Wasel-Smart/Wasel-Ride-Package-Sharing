import path from 'node:path';

export const migrationCatalog = [
  {
    sequence: 1,
    path: 'src/supabase/migrations/20260210_complete_schema.sql',
    description: 'Initial complete schema for core tables',
    status: 'applied',
    phase: 'historical',
    category: 'schema',
    naming: 'legacy',
  },
  {
    sequence: 2,
    path: 'src/supabase/migrations/20260223000000_production_schema.sql',
    description: 'Production hardening and RLS policies',
    status: 'applied',
    phase: 'historical',
    category: 'security',
    naming: 'canonical',
  },
  {
    sequence: 3,
    path: 'src/supabase/migrations/20260224_additional_tables.sql',
    description: 'Package tracking and wallet transactions',
    status: 'applied',
    phase: 'historical',
    category: 'schema',
    naming: 'legacy',
  },
  {
    sequence: 4,
    path: 'src/supabase/migrations/20260224_postgis_functions.sql',
    description: 'PostGIS spatial functions for route matching',
    status: 'applied',
    phase: 'historical',
    category: 'functions',
    naming: 'legacy',
  },
  {
    sequence: 5,
    path: 'src/supabase/migrations/20260224_wasel_complete_schema.sql',
    description: 'Consolidated schema snapshot for reference',
    status: 'applied',
    phase: 'historical',
    category: 'snapshot',
    naming: 'legacy',
  },
  {
    sequence: 6,
    path: 'src/supabase/migrations/20260224000000_production_backend_schema.sql',
    description: 'Backend service layer tables',
    status: 'applied',
    phase: 'historical',
    category: 'schema',
    naming: 'canonical',
  },
  {
    sequence: 7,
    path: 'src/supabase/migrations/20260224000001_backup_configuration.sql',
    description: 'Backup schedules and retention configuration',
    status: 'applied',
    phase: 'historical',
    category: 'operations',
    naming: 'canonical',
  },
  {
    sequence: 8,
    path: 'src/supabase/migrations/20260302_regionalization_schema.sql',
    description: 'Region, corridor, and zone tables',
    status: 'applied',
    phase: 'historical',
    category: 'schema',
    naming: 'legacy',
  },
  {
    sequence: 9,
    path: 'src/supabase/migrations/20260310_security_performance_fixes.sql',
    description: 'Security and indexing fixes',
    status: 'applied',
    phase: 'historical',
    category: 'security',
    naming: 'legacy',
  },
  {
    sequence: 10,
    path: 'src/supabase/migrations/20260320000000_w_mobility_platform_complete.sql',
    description: 'Mobility OS, Raje3, and corporate accounts',
    status: 'applied',
    phase: 'historical',
    category: 'schema',
    naming: 'canonical',
  },
  {
    sequence: 11,
    path: 'src/supabase/migrations/20260326080000_legacy_public_table_cutover.sql',
    description:
      'Preserve conflicting legacy public tables before canonical runtime tables are created',
    status: 'ready',
    phase: 'rollout',
    category: 'schema',
    naming: 'canonical',
  },
  {
    sequence: 12,
    path: 'src/supabase/migrations/20260327090000_production_operating_model.sql',
    description: 'Operating model, pricing, and service workflows',
    status: 'ready',
    phase: 'rollout',
    category: 'schema',
    naming: 'canonical',
  },
  {
    sequence: 13,
    path: 'src/supabase/migrations/20260327110000_notifications_runtime_contract.sql',
    description: 'Canonical notifications runtime table aligned with current app usage',
    status: 'ready',
    phase: 'rollout',
    category: 'runtime-contract',
    naming: 'canonical',
  },
  {
    sequence: 14,
    path: 'src/supabase/migrations/20260401093000_database_hardening.sql',
    description: 'Integrity constraints, default-payment safety, and audit indexes',
    status: 'ready',
    phase: 'rollout',
    category: 'hardening',
    naming: 'canonical',
  },
  {
    sequence: 15,
    path: 'src/supabase/migrations/20260401113000_unified_backend_contract.sql',
    description: 'Canonical user backfill, auth sync trigger, and 2FA fields',
    status: 'ready',
    phase: 'rollout',
    category: 'runtime-contract',
    naming: 'canonical',
  },
  {
    sequence: 16,
    path: 'src/supabase/migrations/20260401133000_align_canonical_rls_policies.sql',
    description: 'Explicit canonical insert/update/delete policies aligned with app fallback paths',
    status: 'ready',
    phase: 'rollout',
    category: 'security',
    naming: 'canonical',
  },
  {
    sequence: 17,
    path: 'src/supabase/migrations/20260401143000_harden_rpc_execute_permissions.sql',
    description:
      'Restrict privileged RPC execution and set safe search paths on security-definer functions',
    status: 'ready',
    phase: 'rollout',
    category: 'security',
    naming: 'canonical',
  },
  {
    sequence: 18,
    path: 'src/supabase/migrations/20260401183000_growth_and_demand_alerts.sql',
    description: 'Demand capture persistence for ride, bus, and package growth flows',
    status: 'ready',
    phase: 'rollout',
    category: 'schema',
    naming: 'canonical',
  },
  {
    sequence: 19,
    path: 'src/supabase/migrations/20260401193000_referrals_and_growth_events.sql',
    description: 'Referral attribution and growth event persistence',
    status: 'ready',
    phase: 'rollout',
    category: 'schema',
    naming: 'canonical',
  },
  {
    sequence: 20,
    path: 'src/supabase/migrations/20260401213000_expand_runtime_contract_tables.sql',
    description:
      'Add the remaining trip, booking, and package columns required by the live app runtime contract',
    status: 'ready',
    phase: 'rollout',
    category: 'runtime-contract',
    naming: 'canonical',
  },
  {
    sequence: 21,
    path: 'src/supabase/migrations/20260401223000_communications_runtime_contract.sql',
    description: 'Persist communication preferences and outbound delivery queue rows',
    status: 'ready',
    phase: 'rollout',
    category: 'runtime-contract',
    naming: 'canonical',
  },
  {
    sequence: 22,
    path: 'src/supabase/migrations/20260401233000_communication_delivery_operations.sql',
    description:
      'Add retries, idempotency, and processor operation fields for outbound communications',
    status: 'ready',
    phase: 'rollout',
    category: 'hardening',
    naming: 'canonical',
  },
  {
    sequence: 23,
    path: 'src/supabase/migrations/20260404110000_route_automation_backbone.sql',
    description:
      'Queue-backed reminders, support SLA automation, pricing snapshots, and worker-safe automation job helpers',
    status: 'ready',
    phase: 'rollout',
    category: 'runtime-contract',
    naming: 'canonical',
  },
  {
    sequence: 24,
    path: 'src/supabase/migrations/20260404133000_harden_auth_signup_trigger.sql',
    description:
      'Remove the legacy auth profile trigger path, backfill canonical users from auth, and keep signup bound to public.users',
    status: 'ready',
    phase: 'rollout',
    category: 'security',
    naming: 'canonical',
  },
  {
    sequence: 25,
    path: 'src/supabase/migrations/20260404153000_operational_bootstrap_reference_data.sql',
    description:
      'Add operational catalogs for roles, cities, trip types, route corridors, pricing rules, and seed execution logging',
    status: 'ready',
    phase: 'rollout',
    category: 'schema',
    naming: 'canonical',
  },
  {
    sequence: 26,
    path: 'src/supabase/migrations/20260406101500_harden_automation_queue_access_and_support_rpcs.sql',
    description:
      'Lock down direct client automation queue inserts and move support ticket writes behind atomic RPCs',
    status: 'ready',
    phase: 'rollout',
    category: 'security',
    naming: 'canonical',
  },
  {
    sequence: 27,
    path: 'src/supabase/migrations/20260409113000_wallet_and_runtime_integrity_hardening.sql',
    description: 'Finalize wallet and runtime integrity constraints and wallet access indexes',
    status: 'ready',
    phase: 'rollout',
    category: 'hardening',
    naming: 'canonical',
  },
  {
    sequence: 28,
    path: 'src/supabase/migrations/20260409120000_production_security_and_queue_hardening.sql',
    description:
      'Move 2FA secrets into a private schema, null legacy public secret columns, and add atomic communication queue claiming',
    status: 'ready',
    phase: 'rollout',
    category: 'security',
    naming: 'canonical',
  },
  {
    sequence: 29,
    path: 'src/supabase/migrations/20260409153000_runtime_performance_indexes.sql',
    description: 'Add expression indexes for auth-linked runtime and RLS lookup paths',
    status: 'ready',
    phase: 'rollout',
    category: 'performance',
    naming: 'canonical',
  },
  {
    sequence: 30,
    path: 'src/supabase/migrations/20260410110000_reassert_auth_signup_user_sync.sql',
    description:
      'Reassert canonical auth.users to public.users sync and recover missing phone numbers for signup-triggered users',
    status: 'ready',
    phase: 'rollout',
    category: 'security',
    naming: 'canonical',
  },
  {
    sequence: 31,
    path: 'src/supabase/migrations/20260413120000_wallet_fintech_rebuild.sql',
    description:
      'Rebuild the wallet fintech ledger, escrow, payout, subscription, and step-up runtime tables',
    status: 'ready',
    phase: 'rollout',
    category: 'schema',
    naming: 'canonical',
  },
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
  'src/supabase/migrations/MIGRATION_STANDARDS.md',
];

export const migrationReadmePath = 'src/supabase/migrations/MIGRATIONS_README.md';
export const migrationDirectory = 'src/supabase/migrations';
export const canonicalMigrationPattern = /^\d{14}_[a-z0-9_]+\.sql$/;

export function getMigrationFileName(relativePath) {
  return path.basename(relativePath);
}

export function getMigrationTimestamp(relativePath) {
  const match = getMigrationFileName(relativePath).match(/^(\d{14})_/);
  return match ? match[1] : null;
}

export const historicalMigrations = migrationCatalog.filter(
  migration => migration.phase === 'historical',
);
export const rolloutMigrations = migrationCatalog
  .filter(migration => migration.phase === 'rollout')
  .map(migration => migration.path);

function renderMigrationTable(migrations) {
  return [
    '| # | File | Category | Description | Status |',
    '|---|------|----------|-------------|--------|',
    ...migrations.map(
      migration =>
        `| ${String(migration.sequence).padStart(2, '0')} | \`${getMigrationFileName(migration.path)}\` | ${migration.category} | ${migration.description} | ${capitalize(migration.status)} |`,
    ),
  ].join('\n');
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function renderSequence(items) {
  return items.map((item, index) => `${index + 1}. \`${item}\``).join('\n');
}

export function renderMigrationReadme() {
  const legacyNamingFiles = historicalMigrations
    .filter(migration => migration.naming === 'legacy')
    .map(migration => `- \`${getMigrationFileName(migration.path)}\``)
    .join('\n');

  return `# Wasel Database Migrations

This directory is maintained from the canonical registry in \`scripts/supabase-migration-registry.mjs\`.
The rollout script, verification script, tests, and this README all derive from that registry.

## Operating Rules

1. Never edit an applied migration.
2. New rollout migrations must use the canonical filename pattern \`YYYYMMDDHHMMSS_description.sql\`.
3. Keep one responsibility per migration: schema, backfill, hardening, or seed-support.
4. Separate durable schema changes from data backfills unless the migration would be invalid without the data step.
5. Prefer deterministic SQL only. Avoid time-dependent constraints, environment-sensitive defaults, and hidden runtime-owned DDL.
6. Run \`npm run verify:supabase-rollout\` after any migration change.

## Naming Convention

\`\`\`text
YYYYMMDDHHMMSS_short_description.sql
\`\`\`

Example: \`20260401120000_add_driver_rating_column.sql\`

Historical files that predate the current standards remain frozen and explicitly tracked as legacy exceptions:
${legacyNamingFiles}

## Migration Inventory

${renderMigrationTable(migrationCatalog)}

## Rollout Sequence

Apply the rollout set in this exact order for production cutover projects:

### Migrations

${renderSequence(rolloutMigrations.map(getMigrationFileName))}

### Seeds

${renderSequence(rolloutSeedFiles)}

## Seed Packs

Operational bootstrap seed assets live in \`db/seeds/\`:

- \`roles.seed.sql\`
- \`cities.seed.sql\`
- \`trip_types.seed.sql\`
- \`pricing.seed.sql\`
- \`core.seed.sql\`
- \`automation.seed.sql\`

Smoke checks remain in \`src/supabase/seeds/\`.

## Commands

Apply the canonical rollout pack:

\`\`\`bash
npm run apply:supabase-rollout
\`\`\`

Apply the rollout pack plus seeds:

\`\`\`bash
npm run apply:supabase-rollout -- --with-seeds
\`\`\`

Regenerate this README from the migration registry:

\`\`\`bash
npm run sync:supabase-migration-docs
\`\`\`

## Reference Files

| File | Purpose |
|------|---------|
| \`schema.sql\` | Full current schema snapshot for reference only |
| \`ai_schema.sql\` | AI and intelligence layer schema reference |
| \`MIGRATION_STANDARDS.md\` | Rules for new migration authoring and review |

## Rollback Policy

Supabase does not support automatic rollbacks. Before any destructive migration:

1. Take a manual backup from the Supabase dashboard.
2. Prepare a compensating migration before rollout.
3. Keep rollback SQL reviewed and ready before production execution.
`;
}
