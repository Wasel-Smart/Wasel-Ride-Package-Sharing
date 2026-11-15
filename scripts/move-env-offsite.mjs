#!/usr/bin/env node
// scripts/move-env-offsite.mjs
//
// Moves real .env files out of the OneDrive-synced project folder to
// %USERPROFILE%\.wasel-secrets\ and replaces them with symlinks.
//
// Usage:
//   node scripts/move-env-offsite.mjs
//   node scripts/move-env-offsite.mjs --dry-run

import fs from 'fs';
import path from 'path';
import os from 'os';
const DRY_RUN = process.argv.includes('--dry-run');
const REPO_ROOT = process.cwd();
const SECRETS_DIR = path.join(os.homedir(), '.wasel-secrets');

const ENV_FILES = [
  '.env',
  '.env.local',
  '.env.production',
  '.env.production.local',
];

if (DRY_RUN) {
  console.log('[dry-run] No files will be moved.\n');
}

// Create the secrets directory outside OneDrive
if (!DRY_RUN) {
  fs.mkdirSync(SECRETS_DIR, { recursive: true });
  console.log(`Created secrets dir: ${SECRETS_DIR}`);
} else {
  console.log(`Would create: ${SECRETS_DIR}`);
}

let moved = 0;
let skipped = 0;

for (const file of ENV_FILES) {
  const src = path.join(REPO_ROOT, file);
  const dest = path.join(SECRETS_DIR, file);

  if (!fs.existsSync(src)) {
    console.log(`  skip (not found): ${file}`);
    skipped++;
    continue;
  }

  const stat = fs.lstatSync(src);
  if (stat.isSymbolicLink()) {
    console.log(`  skip (already a symlink): ${file}`);
    skipped++;
    continue;
  }

  if (DRY_RUN) {
    console.log(`  would move: ${src} → ${dest}`);
    console.log(`  would symlink: ${src} → ${dest}`);
    moved++;
    continue;
  }

  // Move the real file out of the repo tree
  fs.copyFileSync(src, dest);
  fs.unlinkSync(src);

  // Create a symlink back so existing tooling still works
  // On Windows, symlinks require Developer Mode or admin rights.
  // Fall back to writing a .env that sources the offsite file if symlink fails.
  try {
    fs.symlinkSync(dest, src);
    console.log(`  moved + symlinked: ${file}`);
  } catch {
    // Symlink failed (Windows without Developer Mode) — write a pointer file instead
    fs.writeFileSync(
      src,
      `# This file is managed by scripts/move-env-offsite.mjs\n# Real values are at: ${dest}\n# Copy that file here to use locally, or enable Developer Mode for symlinks.\n`,
    );
    console.log(`  moved (pointer written, symlink failed): ${file}`);
    console.log(`  Real file is at: ${dest}`);
  }

  moved++;
}

console.log(`\nDone. Moved: ${moved}, Skipped: ${skipped}`);

if (!DRY_RUN && moved > 0) {
  console.log(`\nReal env files are now at: ${SECRETS_DIR}`);
  console.log('They are outside the OneDrive sync tree.');
  console.log('\nNext steps:');
  console.log('  1. Exclude ~/.wasel-secrets from any cloud backup if desired');
  console.log('  2. Mark C-02 as resolved in SECURITY_AUDIT_FINDINGS.md');
  console.log('  3. Confirm .env is not tracked: git ls-files .env');
}
