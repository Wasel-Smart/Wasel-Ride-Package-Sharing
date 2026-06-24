#!/usr/bin/env node
/**
 * Wasel Automated Backup Scheduler
 *
 * Runs daily full backups at 2 AM UTC + hourly schema snapshots.
 * Run as a long-lived process (systemd, PM2, or Docker).
 *
 * Usage:
 *   node scripts/schedule-backups.mjs               # start scheduler
 *   node scripts/schedule-backups.mjs --once=full   # run once then exit
 *   node scripts/schedule-backups.mjs --once=schema
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const LOG_DIR = join(ROOT, 'backups', 'logs');
const DAILY_FULL_HOUR_UTC = 2;
const HOURLY_SCHEMA_MINUTE = 0;

function log(level, msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] [${level}] ${msg}`;
  console.log(line);
  try {
    mkdirSync(LOG_DIR, { recursive: true });
    const logFile = join(LOG_DIR, `backup-${ts.slice(0, 10)}.log`);
    writeFileSync(logFile, line + '\n', { flag: 'a' });
  } catch { /* non-fatal */ }
}

function runBackup(type) {
  log('INFO', `Starting ${type} backup...`);
  const result = spawnSync(
    'node',
    ['scripts/backup-database.mjs', `--type=${type}`],
    { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' },
  );
  if (result.status === 0) {
    log('INFO', `${type} backup completed successfully`);
  } else {
    log('ERROR', `${type} backup failed (exit ${result.status ?? 'unknown'})`);
  }
}

function msUntilNextDay(targetHourUTC) {
  const now = new Date();
  const next = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
    targetHourUTC, 0, 0, 0,
  ));
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return next.getTime() - now.getTime();
}

function msUntilNextHour(targetMinute) {
  const now = new Date();
  const next = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
    now.getUTCHours(), targetMinute, 0, 0,
  ));
  if (next <= now) next.setUTCHours(next.getUTCHours() + 1);
  return next.getTime() - now.getTime();
}

// ── one-shot mode ──────────────────────────────────────────────────────────────
const onceArg = process.argv.find((a) => a.startsWith('--once='));
if (onceArg) {
  runBackup(onceArg.split('=')[1] ?? 'full');
  process.exit(0);
}

// ── scheduler mode ─────────────────────────────────────────────────────────────
log('INFO', 'Backup scheduler started');
log('INFO', `Daily full backup at ${DAILY_FULL_HOUR_UTC}:00 UTC`);
log('INFO', `Hourly schema snapshot at :${String(HOURLY_SCHEMA_MINUTE).padStart(2, '0')}`);

const dailyDelay = msUntilNextDay(DAILY_FULL_HOUR_UTC);
log('INFO', `Next full backup in ${Math.round(dailyDelay / 60000)} minutes`);
setTimeout(() => {
  runBackup('full');
  setInterval(() => runBackup('full'), 24 * 60 * 60 * 1000);
}, dailyDelay);

const hourlyDelay = msUntilNextHour(HOURLY_SCHEMA_MINUTE);
log('INFO', `Next schema snapshot in ${Math.round(hourlyDelay / 60000)} minutes`);
setTimeout(() => {
  runBackup('schema');
  setInterval(() => runBackup('schema'), 60 * 60 * 1000);
}, hourlyDelay);

process.on('SIGINT', () => { log('INFO', 'Scheduler stopped (SIGINT)'); process.exit(0); });
process.on('SIGTERM', () => { log('INFO', 'Scheduler stopped (SIGTERM)'); process.exit(0); });
