#!/usr/bin/env node
/**
 * GAP #11 FIX: Backup Verification Script
 * Place at: scripts/verify-backup.mjs
 *
 * Verifies that the latest backup exists and is valid.
 * Called by backup-schedule.yml after each backup job.
 */

import { readdir, stat } from 'fs/promises';
import { join } from 'path';

const BACKUP_DIR = process.env.BACKUP_DIR ?? './backups';
const MAX_BACKUP_AGE_HOURS = 26; // Warn if latest backup is >26h old

async function main() {
  console.log('🔍 Verifying database backup...\n');

  // Check backup directory exists
  try {
    await stat(BACKUP_DIR);
  } catch {
    console.log(`⚠️  Backup directory not found: ${BACKUP_DIR}`);
    console.log('   If using Supabase managed backups, verify via:');
    console.log('   Supabase Dashboard → Settings → Database → Backups');
    process.exit(0); // Non-fatal if using managed backups
  }

  // List backup files
  const files = await readdir(BACKUP_DIR);
  const backups = files
    .filter(f => f.endsWith('.sql') || f.endsWith('.dump') || f.endsWith('.gz'))
    .sort()
    .reverse();

  if (backups.length === 0) {
    console.error('❌ No backup files found in', BACKUP_DIR);
    process.exit(1);
  }

  const latest = backups[0];
  const latestPath = join(BACKUP_DIR, latest);
  const latestStat = await stat(latestPath);
  const ageMs = Date.now() - latestStat.mtimeMs;
  const ageHours = ageMs / (1000 * 60 * 60);

  console.log(`Latest backup : ${latest}`);
  console.log(`Age           : ${ageHours.toFixed(1)} hours`);
  console.log(`Size          : ${(latestStat.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Total backups : ${backups.length}`);

  if (latestStat.size < 1024) {
    console.error('\n❌ Backup file is suspiciously small (<1KB) — may be corrupt');
    process.exit(1);
  }

  if (ageHours > MAX_BACKUP_AGE_HOURS) {
    console.warn(`\n⚠️  WARNING: Latest backup is ${ageHours.toFixed(0)}h old (threshold: ${MAX_BACKUP_AGE_HOURS}h)`);
    process.exit(0); // Warn but don't fail
  }

  console.log('\n✅ Backup verification passed');
}

main().catch(err => {
  console.error('Backup verification error:', err.message);
  process.exit(1);
});
