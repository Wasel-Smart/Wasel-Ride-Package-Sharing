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
const confirmedProjectRef = process.argv
  .find((argument) => argument.startsWith('--confirm-project-ref='))
  ?.slice('--confirm-project-ref='.length);

if (!connectionString) {
  console.error('SUPABASE_DB_URL is not set. Export it before running the rollout.');
  process.exit(1);
}

if (!projectRef || !/^[a-z0-9]{20}$/.test(projectRef)) {
  console.error('SUPABASE_PROJECT_REF must be set to the 20-character target Supabase project ref.');
  process.exit(1);
}

if (applyChanges && confirmedProjectRef !== projectRef) {
  console.error('Applying migrations requires --confirm-project-ref=<SUPABASE_PROJECT_REF>.');
  process.exit(1);
}

if (applyChanges && environment === 'production' && !allowProduction) {
  console.error('Production rollout requires the explicit --allow-production flag.');
  process.exit(1);
}

let connectionUrl;
try {
  connectionUrl = new URL(connectionString);
} catch {
  console.error('SUPABASE_DB_URL is not a valid PostgreSQL connection URL.');
  process.exit(1);
}

if (!['postgres:', 'postgresql:'].includes(connectionUrl.protocol)) {
  console.error('SUPABASE_DB_URL must use the postgres:// or postgresql:// protocol.');
  process.exit(1);
}

const databaseName = decodeURIComponent(connectionUrl.pathname.replace(/^\/+/, '');
const databaseUser = decodeURIComponent(connectionUrl.username);
if (!databaseName || !databaseUser) {
  console.error('SUPABASE_DB_URL must include a database name and username.');
  process.exit(1);
}

// Keep database credentials out of the psql process argument list. Passing the
// full connection URL as argv can expose its password through process inspection.
const psqlEnvironment = {
  ...process.env,
  PGHOST: connectionUrl.hostname,
  PGPORT: connectionUrl.port || '5432',
  PGDATABASE: databaseName,
  PGUSER: databaseUser,
  PGSSLMODE: connectionUrl.searchParams.get('sslmode') || 'require',
};
if (connectionUrl.password) {
  psqlEnvironment.PGPASSWORD = decodeURIComponent(connectionUrl.password);
}
const connectionTimeout = connectionUrl.searchParams.get('connect_timeout');
if (connectionTimeout) {
  psqlEnvironment.PGCONNECT_TIMEOUT = connectionTimeout;
}
const applicationName = connectionUrl.searchParams.get('application_name');
if (applicationName) {
  psqlEnvironment.PGAPPNAME = applicationName;
}
const postgresOptions = connectionUrl.searchParams.get('options');
if (postgresOptions) {
  psqlEnvironment.PGOPTIONS = postgresOptions;
}

const directProjectRef = connectionUrl.hostname.match(/^db\.([a-z0-9]{20})\.supabase\.co$/)?.[1];
const poolerProjectRef = decodeURIComponent(connectionUrl.username).match(/\.([a-z0-9]{20})$/)?.[1];
const connectionProjectRef = directProjectRef ?? poolerProjectRef;
if (!connectionProjectRef || connectionProjectRef !== projectRef) {
  console.error('The database connection host/user does not prove it belongs to SUPABASE_PROJECT_REF.');
  process.exit(1);
}

if (!applyChanges) {
  console.log(`Dry run only. Target project: ${projectRef} (${environment || 'environment not specified'}).`);
  console.log(`Would apply ${rolloutMigrations.length} migration file(s).`);
  if (withSeeds) console.log(`Would apply ${rolloutSeedFiles.length} seed file(s).`);
  if (withSmokeChecks) console.log(`Would run ${smokeCheckSeedFiles.length} smoke-check file(s).`);
  console.log('No database changes were made. Re-run with --apply and explicit project confirmation to execute.');
  process.exit(0);
}

const versionCheck = spawnSync('psql', ['--version'], { stdio: 'ignore' });
if (versionCheck.error) {
  console.error(
    'psql is not available in PATH. Install the PostgreSQL client or run the SQL files another way.',
  );
  process.exit(1);
}

function applyFile(relativePath) {
  const absolutePath = path.join(root, relativePath);
  console.log(`\nApplying ${relativePath}`);
  const result = spawnSync(
    'psql',
    ['-v', 'ON_ERROR_STOP=1', '-f', absolutePath],
    { stdio: 'inherit', env: psqlEnvironment },
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

for (const migration of rolloutMigrations) {
  applyFile(migration);
}

if (withSeeds) {
  for (const seed of rolloutSeedFiles) {
    applyFile(seed);
  }
}

if (withSmokeChecks) {
  for (const seed of smokeCheckSeedFiles) {
    applyFile(seed);
  }
}

console.log('\nSupabase rollout applied successfully.');
