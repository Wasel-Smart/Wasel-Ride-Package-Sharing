#!/usr/bin/env node
/**
 * Wasel Supabase Backup Script
 *
 * Supports:
 *  - Supabase managed backup trigger via Management API when a personal access token is available
 *  - Logical dumps via Supabase CLI (`db dump`) using either a linked project or a direct DB URL
 *  - Fallback to `pg_dump` when a DB URL is available and the CLI path is unavailable
 *
 * Usage:
 *   node scripts/backup-database.mjs --type=full
 *   node scripts/backup-database.mjs --type=schema
 *   node scripts/backup-database.mjs --type=data
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT_DIR = process.cwd();

loadEnvFile(resolve(ROOT_DIR, '.env'));
loadEnvFile(resolve(ROOT_DIR, '.env.local'));

const requestedType = parseRequestedType(process.argv);
const backupDir = process.env.BACKUP_DIR ?? './backups';
const maxBackups = parseInt(process.env.MAX_BACKUPS ?? '30', 10);
const accessToken = process.env.SUPABASE_ACCESS_TOKEN ?? '';
const dbUrl =
  process.env.DATABASE_URL ??
  process.env.SUPABASE_DB_URL ??
  process.env.SUPABASE_DIRECT_CONNECTION_STRING ??
  '';
const projectRef = inferProjectRef();
const supabaseApi = 'https://api.supabase.com/v1';

const managedBackupEnabled = Boolean(accessToken && projectRef);

if (!projectRef) {
  console.warn('Warning: could not infer Supabase project ref from env or linked config.');
}

if (!accessToken) {
  console.warn(
    'Warning: SUPABASE_ACCESS_TOKEN is not set. Managed Supabase backups will be skipped.',
  );
}

const managedHeaders = {
  Authorization: `Bearer ${accessToken}`,
  'Content-Type': 'application/json',
};

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const content = readTextFile(filePath);
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function readTextFile(filePath) {
  return readFileSync(filePath, 'utf8');
}

function parseRequestedType(argv) {
  const rawType = argv
    .find(argument => argument.startsWith('--type='))
    ?.split('=')[1]
    ?.toLowerCase();

  if (!rawType) {
    return 'full';
  }

  if (!['full', 'schema', 'data'].includes(rawType)) {
    console.error(`Unsupported backup type "${rawType}". Use full, schema, or data.`);
    process.exit(1);
  }

  return rawType;
}

function inferProjectRef() {
  const candidates = [
    process.env.SUPABASE_PROJECT_ID,
    process.env.SUPABASE_PROJECT_REF,
    extractProjectRefFromUrl(process.env.SUPABASE_PROJECT_URL),
    extractProjectRefFromUrl(process.env.VITE_SUPABASE_URL),
    extractProjectRefFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
    extractProjectRefFromConnectionString(dbUrl),
    extractProjectRefFromJwt(process.env.VITE_SUPABASE_ANON_KEY),
    extractProjectRefFromJwt(process.env.VITE_SUPABASE_PUBLISHABLE_KEY),
    extractProjectRefFromJwt(process.env.SUPABASE_PROJECT_PUBLISHABLE_KEY),
    extractProjectRefFromJwt(process.env.SUPABASE_PUBLISHABLE_KEY),
    extractProjectRefFromJwt(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  ];

  return candidates.find(Boolean) ?? '';
}

function extractProjectRefFromUrl(value) {
  if (!value) {
    return '';
  }

  try {
    const { hostname } = new URL(value);
    const match = hostname.match(/^([a-z0-9-]+)\.supabase\.co$/i);
    return match?.[1] ?? '';
  } catch {
    return '';
  }
}

function extractProjectRefFromConnectionString(value) {
  if (!value) {
    return '';
  }

  try {
    const parsed = new URL(value);
    const directHostMatch = parsed.hostname.match(/^db\.([a-z0-9-]+)\.supabase\.co$/i);
    if (directHostMatch?.[1]) {
      return directHostMatch[1];
    }

    const poolerUserMatch = parsed.username.match(/^postgres\.([a-z0-9-]+)$/i);
    return poolerUserMatch?.[1] ?? '';
  } catch {
    return '';
  }
}

function extractProjectRefFromJwt(value) {
  if (!value || !value.includes('.')) {
    return '';
  }

  try {
    const [, payload] = value.split('.');
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
    return typeof decoded.ref === 'string' ? decoded.ref : '';
  } catch {
    return '';
  }
}

function ensureBackupDirs() {
  mkdirSync(backupDir, { recursive: true });
  mkdirSync(join(backupDir, 'full'), { recursive: true });
  mkdirSync(join(backupDir, 'schema'), { recursive: true });
  mkdirSync(join(backupDir, 'data'), { recursive: true });
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function buildDumpPath(type) {
  ensureBackupDirs();
  return join(backupDir, type, `${type}_${timestamp()}.sql`);
}

function rotateOldBackups(dir) {
  try {
    const files = readdirSync(dir)
      .filter(file => file.endsWith('.sql') || file.endsWith('.sql.gz'))
      .map(file => ({ name: file, mtime: statSync(join(dir, file)).mtimeMs }))
      .sort((left, right) => right.mtime - left.mtime);

    if (files.length <= maxBackups) {
      return;
    }

    for (const file of files.slice(maxBackups)) {
      unlinkSync(join(dir, file.name));
      console.log(`  Rotated old backup: ${file.name}`);
    }
  } catch {
    // Rotation failure is non-fatal.
  }
}

function resolveSupabaseCli() {
  const localWindowsCli = resolve(ROOT_DIR, 'node_modules', '.bin', 'supabase.cmd');
  if (existsSync(localWindowsCli)) {
    return localWindowsCli;
  }

  const localPosixCli = resolve(ROOT_DIR, 'node_modules', '.bin', 'supabase');
  if (existsSync(localPosixCli)) {
    return localPosixCli;
  }

  const globalCliCheck = spawnSync('supabase', ['--version'], {
    stdio: 'ignore',
    shell: process.platform === 'win32',
  });

  if (globalCliCheck.status === 0) {
    return 'supabase';
  }

  return '';
}

function hasPgDump() {
  const result = spawnSync('pg_dump', ['--version'], {
    stdio: 'ignore',
    shell: process.platform === 'win32',
  });
  return result.status === 0;
}

function dumpFlagsForType(type) {
  switch (type) {
    case 'schema':
      return [];
    case 'data':
      return [
        '--data-only',
        '--use-copy',
        '-x',
        'storage.buckets_vectors',
        '-x',
        'storage.vector_indexes',
      ];
    case 'full':
    default:
      return [];
  }
}

function pgDumpFlagsForType(type) {
  switch (type) {
    case 'schema':
      return ['--schema-only'];
    case 'data':
      return ['--data-only'];
    case 'full':
    default:
      return [];
  }
}

function runSupabaseCliDump(type) {
  const cli = resolveSupabaseCli();
  if (!cli) {
    return null;
  }

  const outputPath = buildDumpPath(type);
  const args = ['db', 'dump', '-f', outputPath, ...dumpFlagsForType(type)];

  if (dbUrl) {
    args.push('--db-url', dbUrl);
  } else {
    args.push('--linked');
  }

  if (process.env.SUPABASE_DB_PASSWORD) {
    args.push('--password', process.env.SUPABASE_DB_PASSWORD);
  }

  console.log(`  Creating ${type} backup via Supabase CLI...`);
  const result = spawnSync(cli, args, {
    cwd: ROOT_DIR,
    encoding: 'utf8',
    stdio: 'pipe',
    shell: false,
  });

  if (result.status === 0 && existsSync(outputPath)) {
    console.log(`  ${type} backup: ${outputPath}`);
    rotateOldBackups(join(backupDir, type));
    return outputPath;
  }

  const errorText = [result.stderr, result.stdout].filter(Boolean).join('\n').trim();
  console.warn(`  Supabase CLI backup failed for ${type}: ${errorText || 'unknown error'}`);
  return null;
}

function runPgDumpBackup(type) {
  if (!dbUrl || !hasPgDump()) {
    return null;
  }

  const outputPath = buildDumpPath(type);
  const args = [dbUrl, ...pgDumpFlagsForType(type), '-f', outputPath];

  console.log(`  Creating ${type} backup via pg_dump...`);
  const result = spawnSync('pg_dump', args, {
    cwd: ROOT_DIR,
    encoding: 'utf8',
    stdio: 'pipe',
    shell: process.platform === 'win32',
  });

  if (result.status === 0 && existsSync(outputPath)) {
    console.log(`  ${type} backup: ${outputPath}`);
    rotateOldBackups(join(backupDir, type));
    return outputPath;
  }

  const errorText = [result.stderr, result.stdout].filter(Boolean).join('\n').trim();
  console.warn(`  pg_dump backup failed for ${type}: ${errorText || 'unknown error'}`);
  return null;
}

function createLogicalBackup(type) {
  if (type === 'full') {
    return runPgDumpBackup(type) ?? runSupabaseCliDump(type);
  }

  return runSupabaseCliDump(type) ?? runPgDumpBackup(type);
}

async function triggerManagedBackup() {
  if (!managedBackupEnabled) {
    console.log('  Skipping managed backup trigger because token or project ref is missing.');
    return null;
  }

  console.log('  Triggering Supabase managed backup...');
  const response = await fetch(`${supabaseApi}/projects/${projectRef}/database/backups`, {
    method: 'POST',
    headers: managedHeaders,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Backup API failed (${response.status}): ${body}`);
  }

  const payload = await response.json();
  console.log(`  Managed backup triggered: ${payload.id ?? 'unknown'}`);
  return payload;
}

async function listManagedBackups() {
  if (!managedBackupEnabled) {
    return null;
  }

  const response = await fetch(`${supabaseApi}/projects/${projectRef}/database/backups`, {
    headers: managedHeaders,
  });

  if (!response.ok) {
    throw new Error(`Failed to list backups (${response.status})`);
  }

  return response.json();
}

async function verifyRecentManagedBackup() {
  const backups = await listManagedBackups().catch(() => null);
  if (!backups) {
    return;
  }

  const recent = Array.isArray(backups) ? backups[0] : backups.backups?.[0];
  if (!recent) {
    console.warn('  No managed backups found in Supabase project.');
    return;
  }

  console.log(
    `  Most recent managed backup: ${recent.inserted_at ?? recent.created_at ?? 'unknown'}`,
  );
}

function writeBackupMetadata(metadata) {
  ensureBackupDirs();
  const metadataPath = join(backupDir, `backup_log_${timestamp()}.json`);
  writeFileSync(
    metadataPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        requestedType,
        projectRef: projectRef || null,
        ...metadata,
      },
      null,
      2,
    ),
  );
  console.log(`  Metadata written: ${metadataPath}`);
}

function printFailureGuidance() {
  console.error('\nNo backup artifact was created.');
  console.error(
    'To create logical backups, set DATABASE_URL or SUPABASE_DB_URL, or run `supabase login` and `supabase link --project-ref <ref>` first.',
  );
  console.error(
    'To trigger Supabase managed backups through the Management API, also set SUPABASE_ACCESS_TOKEN.',
  );
}

async function main() {
  console.log(`\nWasel Database Backup - ${new Date().toISOString()}\n`);

  const logicalBackupPath = createLogicalBackup(requestedType);
  const managedBackup = await triggerManagedBackup().catch(error => {
    console.warn(`  Managed backup failed: ${error.message}`);
    return null;
  });

  await verifyRecentManagedBackup();

  writeBackupMetadata({
    managedBackupId: managedBackup?.id ?? null,
    logicalBackupPath,
  });

  if (!logicalBackupPath && !managedBackup) {
    printFailureGuidance();
    process.exit(1);
  }

  console.log('\nBackup process complete.\n');
}

main().catch(error => {
  console.error('Fatal backup error:', error.message);
  process.exit(1);
});
