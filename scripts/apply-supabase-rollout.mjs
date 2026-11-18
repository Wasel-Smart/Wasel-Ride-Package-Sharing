import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import {
  rolloutMigrations,
  rolloutSeedFiles,
  smokeCheckSeedFiles,
} from './supabase-rollout-manifest.mjs';

const root = process.cwd();
const connectionString = process.env.SUPABASE_DB_URL;
const projectRef = process.env.SUPABASE_PROJECT_REF;
const environment = (process.env.SUPABASE_ENVIRONMENT ?? '').trim().toLowerCase();
const withSeeds = process.argv.includes('--with-seeds');
const withSmokeChecks = process.argv.includes('--with-smoke-checks');
const applyChanges = process.argv.includes('--apply');
const allowProduction = process.argv.includes('--allow-production');
const confirmNoPriorRolloutMigrations = process.argv.includes('--confirm-no-prior-rollout-migrations');
const confirmedProjectRef = process.argv
  .find(argument => argument.startsWith('--confirm-project-ref='))
  ?.slice('--confirm-project-ref='.length);

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!connectionString) fail('SUPABASE_DB_URL is not set. Export it before running the rollout.');
if (!projectRef || !/^[a-z0-9]{20}$/.test(projectRef)) {
  fail('SUPABASE_PROJECT_REF must be set to the 20-character target Supabase project ref.');
}
if (applyChanges && confirmedProjectRef !== projectRef) {
  fail('Applying migrations requires --confirm-project-ref=<SUPABASE_PROJECT_REF>.');
}
if (applyChanges && environment === 'production' && !allowProduction) {
  fail('Production rollout requires the explicit --allow-production flag.');
}

let connectionUrl;
try {
  connectionUrl = new URL(connectionString);
} catch {
  fail('SUPABASE_DB_URL is not a valid PostgreSQL connection URL.');
}
if (!['postgres:', 'postgresql:'].includes(connectionUrl.protocol)) {
  fail('SUPABASE_DB_URL must use the postgres:// or postgresql:// protocol.');
}

const databaseName = decodeURIComponent(connectionUrl.pathname.replace(/^\/+/, ''));
const databaseUser = decodeURIComponent(connectionUrl.username);
if (!databaseName || !databaseUser || !connectionUrl.hostname) {
  fail('SUPABASE_DB_URL must include a host, database name, and username.');
}

const directProjectRef = connectionUrl.hostname.match(/^db\.([a-z0-9]{20})\.supabase\.co$/)?.[1];
const poolerProjectRef = databaseUser.match(/\.([a-z0-9]{20})$/)?.[1];
if ((directProjectRef ?? poolerProjectRef) !== projectRef) {
  fail('The database connection host/user does not prove it belongs to SUPABASE_PROJECT_REF.');
}

// Credentials are passed through the child environment, never command-line arguments.
const psqlEnvironment = {
  ...process.env,
  PGHOST: connectionUrl.hostname,
  PGPORT: connectionUrl.port || '5432',
  PGDATABASE: databaseName,
  PGUSER: databaseUser,
  PGSSLMODE: connectionUrl.searchParams.get('sslmode') || 'require',
};
if (connectionUrl.password) psqlEnvironment.PGPASSWORD = decodeURIComponent(connectionUrl.password);
const connectTimeout = connectionUrl.searchParams.get('connect_timeout');
if (connectTimeout) psqlEnvironment.PGCONNECT_TIMEOUT = connectTimeout;
const applicationName = connectionUrl.searchParams.get('application_name');
if (applicationName) psqlEnvironment.PGAPPNAME = applicationName;
const postgresOptions = connectionUrl.searchParams.get('options');
if (postgresOptions) psqlEnvironment.PGOPTIONS = postgresOptions;

if (!applyChanges) {
  console.log(`Dry run only. Target project: ${projectRef} (${environment || 'environment not specified'}).`);
  console.log(`Would inspect and apply ${rolloutMigrations.length} migration file(s).`);
  if (withSeeds) console.log(`Would apply ${rolloutSeedFiles.length} seed file(s).`);
  if (withSmokeChecks) console.log(`Would run ${smokeCheckSeedFiles.length} smoke-check file(s).`);
  console.log('No database changes were made. Use --apply with explicit project confirmation to execute.');
  process.exit(0);
}

const versionCheck = spawnSync('psql', ['--version'], { stdio: 'ignore' });
if (versionCheck.error) fail('psql is not available in PATH. Install the PostgreSQL client.');

function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function migrationRecord(relativePath) {
  const absolutePath = path.resolve(root, relativePath);
  if (!absolutePath.startsWith(`${root}${path.sep}`) || !fs.existsSync(absolutePath)) {
    fail(`Migration file is missing or outside the repository: ${relativePath}`);
  }
  const checksum = createHash('sha256').update(fs.readFileSync(absolutePath)).digest('hex');
  return { relativePath, absolutePath: absolutePath.split(path.sep).join('/'), checksum };
}

const migrationRecords = rolloutMigrations.map(migrationRecord);
const script = [
  '\\set ON_ERROR_STOP on',
  'select pg_advisory_lock(74192831, 20261119);',
  'create schema if not exists wasel_migration_meta;',
  'revoke all on schema wasel_migration_meta from public, anon, authenticated;',
  `create table if not exists wasel_migration_meta.migration_ledger (
    migration_name text primary key,
    checksum_sha256 text not null,
    status text not null check (status in ('started', 'applied')),
    started_at timestamptz not null default now(),
    applied_at timestamptz,
    executor text not null default current_user,
    constraint migration_ledger_applied_timestamp_check
      check ((status = 'applied' and applied_at is not null) or (status = 'started' and applied_at is null))
  );`,
  ');',
  "select count(*) = 0 as migration_ledger_empty from wasel_migration_meta.migration_ledger \\gset",
  "\\if :migration_ledger_empty",
  confirmNoPriorRolloutMigrations
    ? "\\echo Empty migration ledger explicitly confirmed; proceeding with first-time rollout."
    : "\\echo ERROR: empty migration ledger. Verify migration history and rerun with --confirm-no-prior-rollout-migrations.",
  ...(!confirmNoPriorRolloutMigrations ? ["\\quit 3"] : []),
  "\\endif",
];

for (const migration of migrationRecords) {
  const name = sqlLiteral(migration.relativePath);
  const checksum = sqlLiteral(migration.checksum);
  script.push(
    `select exists (
      select 1 from wasel_migration_meta.migration_ledger
      where migration_name = ${name} and checksum_sha256 = ${checksum} and status = 'applied'
    ) as migration_already_applied \\gset`,
    '\\if :migration_already_applied',
    `\\echo Skipping already-applied migration: ${migration.relativePath}`,
    '\\else',
    `do $migration_guard$
      begin
        if exists (
          select 1 from wasel_migration_meta.migration_ledger
          where migration_name = ${name}
        ) then
          raise exception 'Migration % has a prior started record or checksum mismatch. Reconcile manually; automatic retry is blocked.', ${name};
        end if;
      end
    $migration_guard$;`,
    `insert into wasel_migration_meta.migration_ledger (migration_name, checksum_sha256, status)
      values (${name}, ${checksum}, 'started');`,
    `\\echo Applying migration: ${migration.relativePath}`,
    `\\i ${migration.absolutePath.split(path.sep).join('/')}`,
    `update wasel_migration_meta.migration_ledger
      set status = 'applied', applied_at = now()
      where migration_name = ${name} and checksum_sha256 = ${checksum} and status = 'started';`,
    '\\endif',
  );
}
script.push('select pg_advisory_unlock(74192831, 20261119);');

function appendSqlFile(relativePath, label) {
  const absolutePath = path.resolve(root, relativePath);
  if (!absolutePath.startsWith(`${root}${path.sep}`) || !fs.existsSync(absolutePath)) {
    fail(`SQL file is missing or outside the repository: ${relativePath}`);
  }
  script.push(`\\echo ${label}: ${relativePath}`, `\\i ${absolutePath.split(path.sep).join('/')}`);
}

if (withSeeds) {
  for (const seed of rolloutSeedFiles) appendSqlFile(seed, 'Applying operational seed');
}
if (withSmokeChecks) {
  for (const seed of smokeCheckSeedFiles) appendSqlFile(seed, 'Running smoke check');
}

const result = spawnSync('psql', ['-X', '-v', 'ON_ERROR_STOP=1'], {
  input: `${script.join('\n')}\n`,
  stdio: ['pipe', 'inherit', 'inherit'],
  env: psqlEnvironment,
});
if (result.error) fail(`Failed to start psql: ${result.error.message}`);
if (result.status !== 0) {
  console.error('Rollout stopped. Any migration left in started state requires manual inspection before retry.');
  process.exit(result.status ?? 1);
}
console.log('Supabase rollout applied successfully. Migration ledger and advisory lock completed.');
