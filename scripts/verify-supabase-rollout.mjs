import fs from 'node:fs';
import path from 'node:path';
import {
  operationalSeedFiles,
  requiredDocs,
  rolloutMigrations,
  rolloutSeedFiles,
} from './supabase-rollout-manifest.mjs';

const root = process.cwd();
const requiredFiles = [...rolloutMigrations, ...rolloutSeedFiles, ...requiredDocs];

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
const expectedSeedCoverage = [
  ['db/seeds/roles.seed.sql', ['insert into public.system_roles', 'insert into public.seed_execution_log']],
  ['db/seeds/cities.seed.sql', ['insert into public.cities', 'insert into public.seed_execution_log']],
  ['db/seeds/trip_types.seed.sql', ['insert into public.trip_types_catalog', 'insert into public.seed_execution_log']],
  ['db/seeds/pricing.seed.sql', ['insert into public.route_corridors', 'insert into public.pricing_rules']],
  ['db/seeds/core.seed.sql', ['insert into public.users', 'insert into public.trips', 'insert into public.bookings', 'insert into public.packages', 'insert into public.notifications']],
  ['db/seeds/automation.seed.sql', ['insert into public.route_reminders', 'insert into public.pricing_snapshots', 'insert into public.automation_jobs', 'select public.app_backfill_automation_jobs(50);']],
];

for (const [seedFile, expectedSnippets] of expectedSeedCoverage) {
  if (!exists(seedFile)) {
    fail(`Missing operational seed file: ${seedFile}`);
    continue;
  }

  const text = read(seedFile);
  const missingSnippets = expectedSnippets.filter((snippet) => !text.includes(snippet));
  if (missingSnippets.length > 0) {
    for (const snippet of missingSnippets) {
      fail(`Operational seed ${seedFile} is missing expected snippet: ${snippet}`);
    }
  } else {
    console.log(`${seedFile} covers its expected bootstrap layer.`);
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

printSection('Automation Backbone');
const automationMigration = 'src/supabase/migrations/20260404110000_route_automation_backbone.sql';
if (exists(automationMigration)) {
  const text = read(automationMigration);
  const expectedSnippets = [
    'create table if not exists public.automation_jobs',
    'create table if not exists public.route_reminders',
    'create table if not exists public.support_tickets',
    'create or replace function public.app_claim_automation_jobs',
    'create or replace function public.app_backfill_automation_jobs',
  ];

  const missingSnippets = expectedSnippets.filter((snippet) => !text.includes(snippet));
  if (missingSnippets.length > 0) {
    for (const snippet of missingSnippets) {
      fail(`Automation backbone migration is missing expected snippet: ${snippet}`);
    }
  } else {
    console.log('Automation backbone migration includes queue tables and worker-safe helper functions.');
  }
}

printSection('Operational Bootstrap Schema');
const bootstrapMigration = 'src/supabase/migrations/20260404153000_operational_bootstrap_reference_data.sql';
if (exists(bootstrapMigration)) {
  const text = read(bootstrapMigration);
  const expectedSnippets = [
    'create table if not exists public.system_roles',
    'create table if not exists public.cities',
    'create table if not exists public.trip_types_catalog',
    'create table if not exists public.route_corridors',
    'create table if not exists public.pricing_rules',
    'create table if not exists public.seed_execution_log',
    'add column if not exists trip_type_key text not null default \'wasel\'',
    'add column if not exists paired_trip_id uuid',
    'chk_trips_trip_type_key',
  ];

  const missingSnippets = expectedSnippets.filter((snippet) => !text.includes(snippet));
  if (missingSnippets.length > 0) {
    for (const snippet of missingSnippets) {
      fail(`Operational bootstrap migration is missing expected snippet: ${snippet}`);
    }
  } else {
    console.log('Operational bootstrap migration includes reference data catalogs and paired-trip lifecycle support.');
  }
}

printSection('Automation Access Hardening');
const automationAccessMigration = 'src/supabase/migrations/20260406101500_harden_automation_queue_access_and_support_rpcs.sql';
if (exists(automationAccessMigration)) {
  const text = read(automationAccessMigration);
  const expectedSnippets = [
    'drop policy if exists automation_jobs_insert_own on public.automation_jobs',
    'drop policy if exists support_tickets_insert_own on public.support_tickets',
    'drop policy if exists support_tickets_update_own on public.support_tickets',
    'drop policy if exists support_ticket_events_insert_own on public.support_ticket_events',
    'create or replace function public.app_enqueue_automation_job(',
    'create or replace function public.app_create_support_ticket(',
    'create or replace function public.app_update_support_ticket_status(',
    'grant execute on function public.app_enqueue_automation_job',
  ];

  const missingSnippets = expectedSnippets.filter((snippet) => !text.includes(snippet));
  if (missingSnippets.length > 0) {
    for (const snippet of missingSnippets) {
      fail(`Automation access hardening migration is missing expected snippet: ${snippet}`);
    }
  } else {
    console.log('Automation access hardening migration disables direct queue writes and adds atomic support ticket RPCs.');
  }
}

printSection('Auth Signup Hardening');
const authMigration = 'src/supabase/migrations/20260404133000_harden_auth_signup_trigger.sql';
if (exists(authMigration)) {
  const text = read(authMigration);
  const expectedSnippets = [
    'drop trigger if exists on_auth_user_created on auth.users',
    'drop trigger if exists on_auth_user_synced_to_canonical on auth.users',
    'create or replace function public.handle_new_user()',
    'create or replace function public.sync_auth_user_to_canonical_user()',
    'insert into public.users (auth_user_id, email, full_name, phone_number)',
  ];

  const missingSnippets = expectedSnippets.filter((snippet) => !text.includes(snippet));
  if (missingSnippets.length > 0) {
    for (const snippet of missingSnippets) {
      fail(`Auth signup hardening migration is missing expected snippet: ${snippet}`);
    }
  } else {
    console.log('Auth signup hardening migration removes the legacy trigger and reasserts canonical auth sync.');
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
for (const file of rolloutSeedFiles) {
  console.log(`psql "$SUPABASE_DB_URL" -f ${file}`);
}

if (process.exitCode && process.exitCode !== 0) {
  console.error('\nSupabase rollout verification finished with issues.');
} else {
  console.log('\nSupabase rollout pack is internally complete. Apply it to Supabase and run the smoke flows.');
}
