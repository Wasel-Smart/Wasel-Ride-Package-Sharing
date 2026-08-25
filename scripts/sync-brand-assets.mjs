#!/usr/bin/env node
/**
 * Wasel Brand Asset Sync
 *
 * Copies brand assets from brand/assets/ to public/brand/ and artifacts/brand/.
 * Run: npm run brand:sync
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'brand', 'assets');
const DESTINATIONS = [
  path.join(ROOT, 'public', 'brand'),
  path.join(ROOT, 'artifacts', 'brand'),
];

function copyRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function main() {
  console.log('\n🔄 Syncing brand assets...\n');

  let totalFiles = 0;

  for (const dest of DESTINATIONS) {
    if (!fs.existsSync(SOURCE)) {
      console.error(`  ❌ Source directory not found: ${SOURCE}`);
      process.exit(1);
    }

    copyRecursive(SOURCE, dest);
    const count = fs.readdirSync(dest, { recursive: true }).filter(f => !fs.statSync(path.join(dest, f)).isDirectory()).length;
    console.log(`  ✅ ${dest}: ${count} files`);
    totalFiles += count;
  }

  console.log(`\n📊 Total: ${totalFiles} files synced\n`);
}

main();
