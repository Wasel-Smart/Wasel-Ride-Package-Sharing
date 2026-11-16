#!/usr/bin/env node
/**
 * scripts/reconcile-migrations.mjs
 *
 * Detects drift between local migration files and the linked Supabase project.
 * Runs read-only against the local filesystem and (optionally) the Supabase CLI.
 *
 * Usage:
 *   node scripts/reconcile-migrations.mjs           (local-only check)
 *   node scripts/reconcile-migrations.mjs --linked  (also query linked project)
 */

import { readdirSync, readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const MIGRATIONS_DIR = resolve(ROOT, 'supabase/migrations');
const ROLLBACK_DIR = resolve(MIGRATIONS_DIR, 'rollback');
const LINKED = process.argv.includes('--linked');

const errors = [];
const warnings = [];
const passed = [];

function fail(msg) { errors.push(`  ✗ ${msg}`); }
function warn(msg) { warnings.push(`  ⚠ ${msg}`); }
function pass(msg) { passed.push(`  ✓ ${msg}`); }

// ─── 1. Enumerate local migrations ─────────────────────────────────────────────
const migrationFiles = readdirSync(MIGRATIONS_DIR)
  .filter(f => f.endsWith('.sql') && /^\d{14}_/.test(f))
  .sort();

const migrationVersions = new Set(migrationFiles.map(f => f.slice(0, 14)));

console.log(`\nFound ${migrationFiles.length} local migration(s).`);

// ─── 2. Every migration must have a rollback ───────────────────────────────────
for (const file of migrationFiles) {
  const rollbackFile = join(ROLLBACK_DIR, `${file.replace(/\.sql$/, '_rollback.sql')}`);
  if (existsSync(rollbackFile)) {
    pass(`Rollback exists for ${file}`);
  } else {
    warn(`No rollback script for ${file} — add one in supabase/migrations/rollback/`);
  }
}

// ─── 3. No duplicate version prefixes ──────────────────────────────────────────
const versionCounts = new Map();
for (const file of migrationFiles) {
  const v = file.slice(0, 14);
  versionCounts.set(v, (versionCounts.get(v) || 0) + 1);
}
for (const [v, count] of versionCounts.entries()) {
  if (count > 1) {
    fail(`Duplicate migration version ${v} — ${count} files share this prefix`);
  }
}
if (versionCounts.size === migrationFiles.length) {
  pass('All migration versions are unique');
}

// ─── 4. Every migration is wrapped in BEGIN/COMMIT if destructive ─────────────
const destructiveKeywords = ['DROP', 'DELETE', 'TRUNCATE', 'ALTER TABLE', 'RENAME'];
for (const file of migrationFiles) {
  const content = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
  const isDestructive = destructiveKeywords.some(k => content.includes(k));
  const hasTransaction = /BEGIN\s*;?/i.test(content) && /COMMIT\s*;?/i.test(content);
  if (isDestructive && !hasTransaction) {
    warn(`${file} contains destructive SQL without BEGIN/COMMIT — wrap in a transaction`);
  }
}
if (errors.length === 0 && warnings.filter(w => w.includes('without BEGIN/COMMIT')).length === 0) {
  pass('All destructive migrations use transactions');
}

// ─── 5. Linked project comparison (optional) ───────────────────────────────────
if (LINKED) {
  console.log('\n[Linked project comparison]');
  try {
    const output = execSync('supabase migration list --linked', {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    });

    const appliedVersions = new Set();
    const localOnly = [];
    const remoteOnly = [];
    for (const line of output.split('\n')) {
      const versionMatch = line.match(/^\s*(\d{14})\b/);
      if (!versionMatch) continue;
      const version = versionMatch[1];
      const columns = line.split('|').map((part) => part.trim());
      const localColumn = columns[0] || '';
      const remoteColumn = columns[1] || '';
      if (/^\d{14}$/.test(localColumn)) migrationVersions.add(localColumn);
      if (/^\d{14}$/.test(remoteColumn)) appliedVersions.add(remoteColumn);
    }

    for (const v of migrationVersions) {
      if (!appliedVersions.has(v)) localOnly.push(v);
    }
    for (const v of appliedVersions) {
      if (!migrationVersions.has(v)) remoteOnly.push(v);
    }

    localOnly.forEach((v) => warn(`Migration ${v} is local-only (not yet applied to linked project)`));
    remoteOnly.forEach((v) => warn(`Migration ${v} is applied remotely but missing locally — fetch or reconcile`));
    if (appliedVersions.size > 0) pass(`Linked project has ${appliedVersions.size} applied migration version(s)`);
    if (localOnly.length || remoteOnly.length) {
      warn('Linked migration history is not reconciled. Do not run `supabase db push` until DBA reconciliation is complete.');
    }
  } catch (err) {
    warn(`Could not query linked project: ${err.message}. Run \`supabase migration list --linked\` manually.`);
  }
}

// ─── Summary ───────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(60));
console.log('MIGRATION RECONCILIATION SUMMARY');
console.log('─'.repeat(60));

if (passed.length) {
  console.log(`\n✅ Passed (${passed.length}):`);
  passed.forEach(m => console.log(m));
}
if (warnings.length) {
  console.log(`\n⚠️  Warnings (${warnings.length}):`);
  warnings.forEach(m => console.log(m));
}
if (errors.length) {
  console.log(`\n❌ Errors (${errors.length}):`);
  errors.forEach(m => console.log(m));
}

console.log('\n' + '─'.repeat(60));

const blocked = errors.length > 0;
if (blocked) {
  console.log('\n🚫 MIGRATION RECONCILIATION BLOCKED — resolve errors before deploying.\n');
  process.exit(1);
} else if (warnings.length > 0) {
  console.log('\n⚠️  MIGRATION RECONCILIATION OK WITH WARNINGS — review before deploying.\n');
} else {
  console.log('\n🚀 ALL MIGRATION CHECKS PASSED.\n');
}
