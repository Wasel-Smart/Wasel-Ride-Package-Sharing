import { spawnSync } from 'node:child_process';
import path from 'node:path';
import {
  rolloutMigrations,
  rolloutSeedFiles,
  smokeCheckSeedFiles,
} from './supabase-rollout-manifest.mjs';

const root = process.cwd();
const connectionString = process.env.SUPABASE_DB_URL;
const withSeeds = process.argv.includes('--with-seeds');
const withSmokeChecks = process.argv.includes('--with-smoke-checks');

if (!connectionString) {
  console.error('SUPABASE_DB_URL is not set. Export it before running the rollout.');
  process.exit(1);
}

const versionCheck = spawnSync('psql', ['--version'], { stdio: 'ignore' });
if (versionCheck.error) {
  console.error('psql is not available in PATH. Install the PostgreSQL client or run the SQL files another way.');
  process.exit(1);
}

function applyFile(relativePath) {
  const absolutePath = path.join(root, relativePath);
  console.log(`\nApplying ${relativePath}`);
  const result = spawnSync(
    'psql',
    [connectionString, '-v', 'ON_ERROR_STOP=1', '-f', absolutePath],
    { stdio: 'inherit' },
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
