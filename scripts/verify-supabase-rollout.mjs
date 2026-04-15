import fs from 'node:fs';
import path from 'node:path';
import {
  canonicalMigrationPattern,
  getMigrationFileName,
  getMigrationTimestamp,
  migrationCatalog,
  migrationDirectory,
  migrationReadmePath,
  operationalSeedFiles,
  renderMigrationReadme,
  requiredDocs,
  rolloutMigrations,
  rolloutSeedFiles,
  smokeCheckSeedFiles,
} from './supabase-migration-registry.mjs';

const root = process.cwd();

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

function validateUnique(values, label) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) {
      fail(`Duplicate ${label}: ${value}`);
      continue;
    }
    seen.add(value);
  }
}

printSection('Supabase Rollout Verification');

const migrationPaths = migrationCatalog.map((migration) => migration.path);
const migrationNames = migrationPaths.map(getMigrationFileName);
const requiredFiles = [
  ...migrationPaths,
  ...rolloutSeedFiles,
  ...smokeCheckSeedFiles,
  ...requiredDocs,
  migrationReadmePath,
];

printSection('Filesystem Coverage');
const migrationDir = path.join(root, migrationDirectory);
const actualMigrationFiles = fs
  .readdirSync(migrationDir)
  .filter((file) => file.endsWith('.sql'))
  .map((file) => `${migrationDirectory}/${file}`);

validateUnique(migrationPaths, 'registry migration path');
validateUnique(migrationNames, 'migration filename');

const missingFiles = requiredFiles.filter((file) => !exists(file));
for (const file of missingFiles) {
  fail(`Missing required rollout artifact: ${file}`);
}

const untrackedMigrationFiles = actualMigrationFiles.filter((file) => !migrationPaths.includes(file));
for (const file of untrackedMigrationFiles) {
  fail(`Migration file exists on disk but is not registered: ${file}`);
}

const missingMigrationFiles = migrationPaths.filter((file) => !actualMigrationFiles.includes(file));
for (const file of missingMigrationFiles) {
  fail(`Migration is registered but missing from disk: ${file}`);
}

if (!process.exitCode) {
  console.log('Registry coverage matches the filesystem.');
}

printSection('Naming and Ordering');
const rolloutEntries = migrationCatalog.filter((migration) => migration.phase === 'rollout');
const rolloutFileNames = rolloutEntries.map((migration) => getMigrationFileName(migration.path));
const rolloutTimestamps = rolloutEntries.map((migration) => getMigrationTimestamp(migration.path));
validateUnique(rolloutTimestamps, 'rollout migration timestamp');

for (const migration of rolloutEntries) {
  const fileName = getMigrationFileName(migration.path);
  if (!canonicalMigrationPattern.test(fileName)) {
    fail(`Rollout migration does not follow the canonical naming pattern: ${fileName}`);
  }
}

const sortedRolloutNames = [...rolloutFileNames].sort();
if (JSON.stringify(rolloutFileNames) !== JSON.stringify(sortedRolloutNames)) {
  fail('Rollout migrations are not listed in timestamp order.');
} else {
  console.log('Rollout migrations are canonically named and ordered.');
}

printSection('Registry Discipline');
const sequenceNumbers = migrationCatalog.map((migration) => migration.sequence);
const expectedSequence = Array.from({ length: migrationCatalog.length }, (_, index) => index + 1);
if (JSON.stringify(sequenceNumbers) !== JSON.stringify(expectedSequence)) {
  fail('Migration registry sequence numbers are not contiguous.');
} else {
  console.log('Migration registry sequence numbers are contiguous.');
}

for (const migration of migrationCatalog) {
  if (!migration.description || !migration.category || !migration.phase || !migration.status) {
    fail(`Migration registry entry is incomplete: ${migration.path}`);
  }
}

printSection('Documentation Sync');
const expectedReadme = `${renderMigrationReadme()}\n`;
if (!exists(migrationReadmePath)) {
  fail(`Missing ${migrationReadmePath}`);
} else if (read(migrationReadmePath) !== expectedReadme) {
  fail(
    `${migrationReadmePath} is out of sync with the registry. Run "npm run sync:supabase-migration-docs".`,
  );
} else {
  console.log('Migration README matches the registry.');
}

const seedDocs = read('docs/OPERATIONAL_SEEDING.md');
if (!seedDocs.includes('scripts/supabase-migration-registry.mjs')) {
  fail('Operational seeding docs must point contributors at the migration registry.');
} else {
  console.log('Operational seeding docs reference the migration registry.');
}

printSection('Seed Pipeline');
for (const file of operationalSeedFiles) {
  if (!exists(file)) {
    fail(`Missing operational seed file: ${file}`);
    continue;
  }

  const sql = read(file).toLowerCase();
  if (!sql.includes('begin;') || !sql.includes('commit;')) {
    fail(`Operational seed file must be transactional: ${file}`);
  }
  if (!sql.includes('insert into public.seed_execution_log')) {
    fail(`Operational seed file must log execution: ${file}`);
  }
  if (!sql.includes('on conflict')) {
    fail(`Operational seed file must be idempotent: ${file}`);
  }
}

if (!process.exitCode) {
  console.log('Operational seed files are present and follow the expected idempotent pattern.');
}

printSection('Runtime Expectations');
const walletHardening = read('src/supabase/migrations/20260409113000_wallet_and_runtime_integrity_hardening.sql');
for (const snippet of [
  'chk_wallets_non_negative_balances',
  'chk_transactions_positive_amount',
  'idx_transactions_wallet_created_desc',
]) {
  if (!walletHardening.includes(snippet)) {
    fail(`Wallet/runtime hardening migration is missing expected snippet: ${snippet}`);
  }
}

const securityHardening = read('src/supabase/migrations/20260409120000_production_security_and_queue_hardening.sql');
for (const snippet of [
  'private.user_two_factor_secrets',
  'public.app_claim_communication_deliveries',
  'communication_deliveries_claim_queue_idx',
]) {
  if (!securityHardening.includes(snippet)) {
    fail(`Security/queue hardening migration is missing expected snippet: ${snippet}`);
  }
}

if (!process.exitCode) {
  console.log('Latest rollout migrations still match the expected application contract.');
}

printSection('Next Commands');
for (const file of rolloutMigrations) {
  console.log(`psql "$SUPABASE_DB_URL" -f ${file}`);
}
for (const file of rolloutSeedFiles) {
  console.log(`psql "$SUPABASE_DB_URL" -f ${file}`);
}
for (const file of smokeCheckSeedFiles) {
  console.log(`psql "$SUPABASE_DB_URL" -f ${file}   # smoke-check only`);
}

if (process.exitCode && process.exitCode !== 0) {
  console.error('\nSupabase rollout verification finished with issues.');
} else {
  console.log('\nSupabase rollout pack is internally consistent.');
}
