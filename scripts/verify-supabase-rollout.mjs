import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const requiredFiles = [
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
  'src/supabase/seeds/mock_engine_launch_pack.sql',
  'src/supabase/seeds/mock_engine_smoke_checks.sql',
  'docs/MOCK_ENGINE_LAUNCH_PACK.md',
  'docs/LAUNCH_REHEARSAL_CHECKLIST.md',
  'docs/PRODUCTION_CUTOVER_CHECKLIST.md',
  'docs/REAL_USER_TEST_MATRIX.md',
  'docs/COMMUNICATIONS_DELIVERY_RUNBOOK.md',
];

const rolloutMigrations = requiredFiles.filter((file) => file.includes('/migrations/'));
const rolloutSeeds = requiredFiles.filter((file) => file.includes('/seeds/'));

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function printSection(title) {
  console.log(`\n${title}`);
  console.log('-'.repeat(title.length));
}

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exitCode = 1;
}

printSection('Supabase Rollout Verification');

const missingFiles = requiredFiles.filter((file) => !exists(file));
if (missingFiles.length > 0) {
  for (const file of missingFiles) {
    fail(`Missing required rollout artifact: ${file}`);
  }
} else {
  console.log('All required rollout files are present.');
}

printSection('Migration Order');
for (const file of rolloutMigrations) {
  console.log(file);
}

const migrationNames = rolloutMigrations.map((file) => path.basename(file));
const sortedNames = [...migrationNames].sort();
if (JSON.stringify(migrationNames) !== JSON.stringify(sortedNames)) {
  fail('Rollout migrations are not listed in timestamp order.');
} else {
  console.log('Rollout migrations are in timestamp order.');
}

printSection('Migration Bookkeeping');
if (exists('src/supabase/migrations/MIGRATIONS_README.md')) {
  const readme = read('src/supabase/migrations/MIGRATIONS_README.md');
  for (const name of migrationNames) {
    if (!readme.includes(name)) {
      fail(`MIGRATIONS_README.md does not reference ${name}`);
    }
  }
  console.log('Migration README references all rollout migrations.');
} else {
  fail('Missing src/supabase/migrations/MIGRATIONS_README.md');
}

printSection('Policy Coverage');
const rlsMigration = 'src/supabase/migrations/20260401133000_align_canonical_rls_policies.sql';
if (exists(rlsMigration)) {
  const text = read(rlsMigration);
  const expectedPolicies = [
    'users_self_or_admin_insert',
    'drivers_self_or_admin_insert',
    'trips_driver_or_admin_insert',
    'bookings_owner_insert',
    'packages_sender_insert',
    'payment_methods_owner_admin_insert',
    'notifications_insert_own',
  ];

  const missingPolicies = expectedPolicies.filter((policy) => !text.includes(policy));
  if (missingPolicies.length > 0) {
    for (const policy of missingPolicies) {
      fail(`Canonical RLS alignment is missing expected policy ${policy}`);
    }
  } else {
    console.log('Canonical insert-policy coverage looks complete for rollout flows.');
  }
}

printSection('RPC Hardening');
const rpcMigration = 'src/supabase/migrations/20260401143000_harden_rpc_execute_permissions.sql';
if (exists(rpcMigration)) {
  const text = read(rpcMigration);
  const expectedSnippets = [
    'revoke execute on function public.app_add_wallet_funds',
    'revoke execute on function public.app_transfer_wallet_funds',
    'grant execute on function public.app_add_wallet_funds',
    'grant execute on function public.app_transfer_wallet_funds',
    'set search_path = public, pg_temp',
  ];

  const missingSnippets = expectedSnippets.filter((snippet) => !text.includes(snippet));
  if (missingSnippets.length > 0) {
    for (const snippet of missingSnippets) {
      fail(`RPC hardening migration is missing expected snippet: ${snippet}`);
    }
  } else {
    console.log('RPC hardening migration includes revoke/grant and search_path controls.');
  }
}

printSection('Seed Pack Coverage');
const seedFile = 'src/supabase/seeds/mock_engine_launch_pack.sql';
if (exists(seedFile)) {
  const text = read(seedFile);
  const expectedTables = [
    'insert into public.users',
    'insert into public.drivers',
    'insert into public.vehicles',
    'insert into public.trips',
    'insert into public.bookings',
    'insert into public.packages',
    'insert into public.package_events',
    'insert into public.transactions',
    'insert into public.notifications',
  ];

  const missingTables = expectedTables.filter((snippet) => !text.includes(snippet));
  if (missingTables.length > 0) {
    for (const snippet of missingTables) {
      fail(`Mock seed pack is missing expected insert block: ${snippet}`);
    }
  } else {
    console.log('Mock launch pack covers the core application engine tables.');
  }
}

printSection('Communications Runtime');
const communicationsMigration = 'src/supabase/migrations/20260401233000_communication_delivery_operations.sql';
if (exists(communicationsMigration)) {
  const text = read(communicationsMigration);
  const expectedSnippets = [
    'attempts_count integer not null default 0',
    'idempotency_key text',
    'communication_deliveries_retry_queue_idx',
  ];

  const missingSnippets = expectedSnippets.filter((snippet) => !text.includes(snippet));
  if (missingSnippets.length > 0) {
    for (const snippet of missingSnippets) {
      fail(`Communication operations migration is missing expected snippet: ${snippet}`);
    }
  } else {
    console.log('Communication delivery operations migration includes retry and idempotency support.');
  }
}

printSection('Environment Readiness');
const envHints = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
];

for (const key of envHints) {
  if (!process.env[key]) {
    console.log(`Warning: ${key} is not set in the current shell.`);
  } else {
    console.log(`${key} is present in the current shell.`);
  }
}

printSection('Next Commands');
for (const file of rolloutMigrations) {
  console.log(`psql "$SUPABASE_DB_URL" -f ${file}`);
}
for (const file of rolloutSeeds) {
  console.log(`psql "$SUPABASE_DB_URL" -f ${file}`);
}

if (process.exitCode && process.exitCode !== 0) {
  console.error('\nSupabase rollout verification finished with issues.');
} else {
  console.log('\nSupabase rollout pack is internally complete. Apply it to Supabase and run the smoke flows.');
}
