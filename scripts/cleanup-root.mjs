#!/usr/bin/env node
/**
 * scripts/cleanup-root.mjs
 *
 * Moves stray root-level files to their canonical locations and removes
 * debug/screenshot artifacts that have no place in the repo root.
 *
 * Run: node scripts/cleanup-root.mjs [--dry-run]
 *
 * Stray files identified:
 *   Root SQL files      → supabase/migrations/
 *   Root .bat/.sh       → scripts/
 *   MobilityOSPage.tsx  → src/features/mobility-os/ (duplicate)
 *   design-tokens.ts    → src/styles/ (duplicate of src/styles/design-tokens.ts)
 *   i18n.ts             → src/locales/ (duplicate)
 *   service.ts          → docs/ (duplicate of docs/service.ts)
 *   *.png screenshots   → DELETE (debug artifacts)
 *   arabic-full-route-leaks.json → DELETE (debug artifact)
 *   wasel-planning-with-ai-b7cd624ecbce.json → DELETE (duplicate of docs/)
 *   skills-lock.json    → DELETE (not a standard package manager file)
 */

import { existsSync, renameSync, unlinkSync, copyFileSync } from 'fs';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const DRY = process.argv.includes('--dry-run');

function log(action, from, to = '') {
  const arrow = to ? ` → ${to}` : '';
  console.log(`  [${action}] ${from}${arrow}`);
}

function move(from, to) {
  const src = join(ROOT, from);
  const dst = join(ROOT, to);
  if (!existsSync(src)) return;
  if (existsSync(dst)) {
    log('SKIP (dest exists)', from, to);
    return;
  }
  if (DRY) { log('MOVE (dry)', from, to); return; }
  renameSync(src, dst);
  log('MOVED', from, to);
}

function remove(path) {
  const full = join(ROOT, path);
  if (!existsSync(full)) return;
  if (DRY) { log('DELETE (dry)', path); return; }
  unlinkSync(full);
  log('DELETED', path);
}

console.log(`\nWasel root hygiene cleanup${DRY ? ' (DRY RUN)' : ''}\n`);

// ── SQL files that belong in supabase/migrations/ ────────────────────────────
move(
  '20260725023554_add_driver_locations_and_update_notifications.sql',
  'supabase/migrations/20260725023554_add_driver_locations_and_update_notifications.sql',
);
// schema.sql at root is a duplicate of supabase/schema.sql
remove('schema.sql');

// ── Shell/bat scripts that belong in scripts/ ─────────────────────────────────
move('deploy-notification-worker.bat', 'scripts/deploy-notification-worker.bat');
move('deploy-notification-worker.sh',  'scripts/deploy-notification-worker.sh');
move('verify-database-migration.bat',  'scripts/verify-database-migration.bat');
move('verify-database-migration.sh',   'scripts/verify-database-migration.sh');
move('verify-notification-worker.bat', 'scripts/verify-notification-worker.bat');
move('verify-notification-worker.sh',  'scripts/verify-notification-worker.sh');
move('deploy.production.sh',           'scripts/deploy.production.sh');

// ── Duplicate source files ────────────────────────────────────────────────────
// MobilityOSPage.tsx — already exists in src/features/mobility-os/
remove('MobilityOSPage.tsx');
// design-tokens.ts — duplicate of src/styles/design-tokens.ts
remove('design-tokens.ts');
// i18n.ts — duplicate of src/locales/ setup
remove('i18n.ts');
// service.ts — duplicate of docs/service.ts
remove('service.ts');

// ── Debug / screenshot artifacts ─────────────────────────────────────────────
remove('ChatGPT Image Jul 10, 2026, 04_55_00 AM.png');
remove('find-ride-ar-check.png');
remove('screenshot.png');
remove('arabic-full-route-leaks.json');
remove('wasel-planning-with-ai-b7cd624ecbce.json');
remove('skills-lock.json');

// ── Misc ──────────────────────────────────────────────────────────────────────
// common.json — unclear purpose, likely a stray translation export
// Keep it but flag for review
log('REVIEW', 'common.json', '(unclear purpose — may be a stray translation export)');

console.log('\nDone. Run `git status` to review changes.\n');
