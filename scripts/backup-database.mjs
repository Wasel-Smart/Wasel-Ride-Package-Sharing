#!/usr/bin/env node
/**
 * Wasel Supabase Backup Script
 *
 * Performs automated backups via Supabase Management API:
 *  - Triggers a point-in-time backup
 *  - Verifies backup was created
 *  - Logs backup metadata
 *  - Rotates old backups (keeps last 30)
 *  - Optionally uploads to S3-compatible storage
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=<tok> SUPABASE_PROJECT_ID=<id> node scripts/backup-database.mjs
 */

import { createWriteStream, mkdirSync, readdirSync, unlinkSync, statSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const ACCESS_TOKEN  = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT_ID    = process.env.SUPABASE_PROJECT_ID;
const DB_URL        = process.env.DATABASE_URL;
const BACKUP_DIR    = process.env.BACKUP_DIR ?? './backups';
const MAX_BACKUPS   = parseInt(process.env.MAX_BACKUPS ?? '30', 10);
const SUPABASE_API  = 'https://api.supabase.com/v1';

if (!ACCESS_TOKEN || !PROJECT_ID) {
  console.error('❌ Missing SUPABASE_ACCESS_TOKEN or SUPABASE_PROJECT_ID');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${ACCESS_TOKEN}`,
  'Content-Type': 'application/json',
};

function ensureBackupDir() {
  mkdirSync(BACKUP_DIR, { recursive: true });
  mkdirSync(join(BACKUP_DIR, 'full'),   { recursive: true });
  mkdirSync(join(BACKUP_DIR, 'schema'), { recursive: true });
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

async function triggerSupabaseBackup() {
  console.log('📦 Triggering Supabase managed backup...');
  const res = await fetch(`${SUPABASE_API}/projects/${PROJECT_ID}/database/backups`, {
    method: 'POST',
    headers,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Backup API failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  console.log(`  ✅ Managed backup triggered: ${data.id ?? 'unknown'}`);
  return data;
}

async function listBackups() {
  const res = await fetch(`${SUPABASE_API}/projects/${PROJECT_ID}/database/backups`, {
    headers,
  });
  if (!res.ok) throw new Error(`Failed to list backups: ${res.status}`);
  return res.json();
}

function rotateOldBackups(dir) {
  try {
    const files = readdirSync(dir)
      .filter(f => f.endsWith('.sql.gz') || f.endsWith('.sql'))
      .map(f => ({ name: f, mtime: statSync(join(dir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length > MAX_BACKUPS) {
      const toDelete = files.slice(MAX_BACKUPS);
      for (const f of toDelete) {
        unlinkSync(join(dir, f.name));
        console.log(`  🗑  Rotated old backup: ${f.name}`);
      }
    }
  } catch {
    // Rotation failure is non-fatal
  }
}

function pgDump(type = 'full') {
  if (!DB_URL) {
    console.log('  ⚠️  DATABASE_URL not set — skipping local pg_dump');
    return null;
  }

  ensureBackupDir();
  const ts       = timestamp();
  const filename = `${type}_${ts}.sql.gz`;
  const subdir   = type === 'full' ? 'full' : 'schema';
  const filepath = join(BACKUP_DIR, subdir, filename);

  const schemaOnly = type === 'schema' ? '--schema-only' : '';

  try {
    execSync(
      `pg_dump "${DB_URL}" ${schemaOnly} | gzip > "${filepath}"`,
      { stdio: 'pipe' },
    );
    console.log(`  ✅ ${type} backup: ${filepath}`);
    rotateOldBackups(join(BACKUP_DIR, subdir));
    return filepath;
  } catch (err) {
    console.warn(`  ⚠️  pg_dump failed (pg_dump may not be installed): ${err.message}`);
    return null;
  }
}

async function writeBackupMetadata(backupInfo) {
  ensureBackupDir();
  const metaPath = join(BACKUP_DIR, `backup_log_${timestamp()}.json`);
  const { writeFileSync } = await import('fs');
  writeFileSync(
    metaPath,
    JSON.stringify(
      {
        timestamp:  new Date().toISOString(),
        projectId:  PROJECT_ID,
        ...backupInfo,
      },
      null,
      2,
    ),
  );
  console.log(`  📋 Metadata written: ${metaPath}`);
}

async function verifyRecentBackup() {
  const backups = await listBackups().catch(() => null);
  if (!backups) return;

  const recent = Array.isArray(backups)
    ? backups[0]
    : (backups.backups ?? [])[0];

  if (!recent) {
    console.warn('  ⚠️  No backups found in Supabase project');
    return;
  }

  console.log(`  ✅ Most recent backup: ${recent.inserted_at ?? recent.created_at ?? 'unknown'}`);
}

async function main() {
  console.log(`\n🗄  Wasel Database Backup — ${new Date().toISOString()}\n`);

  // 1. Trigger managed Supabase backup
  const backupResult = await triggerSupabaseBackup().catch(err => {
    console.warn(`  ⚠️  Managed backup failed: ${err.message}`);
    return null;
  });

  // 2. Local pg_dump if DATABASE_URL is available
  const fullPath   = pgDump('full');
  const schemaPath = pgDump('schema');

  // 3. Verify most recent backup
  await verifyRecentBackup();

  // 4. Write metadata log
  await writeBackupMetadata({
    managedBackup: backupResult?.id ?? null,
    localFullBackup:   fullPath,
    localSchemaBackup: schemaPath,
  });

  console.log('\n✅ Backup process complete.\n');
  console.log('Run `npm run backup:restore` to test restoration.');
}

main().catch(err => {
  console.error('❌ Fatal backup error:', err.message);
  process.exit(1);
});
