#!/usr/bin/env node

/**
 * Bundle Optimization Script
 * 
 * Analyzes the production build and provides recommendations
 * for reducing chunk sizes below the 200KB budget.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const BUDGET_KB = 200;
const BUDGET_BYTES = BUDGET_KB * 1024;

function collectJsFiles(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectJsFiles(fullPath);
    }
    return entry.name.endsWith('.js') ? [fullPath] : [];
  });
}

function analyzeBundle() {
  const assetsDir = path.join(ROOT, 'dist', 'assets');
  
  if (!fs.existsSync(assetsDir)) {
    console.error('❌ No dist/assets directory found. Run `npm run build` first.');
    process.exit(1);
  }

  const chunks = collectJsFiles(assetsDir)
    .map((filePath) => {
      const size = fs.statSync(filePath).size;
      const name = path.basename(filePath);
      return {
        name,
        path: filePath,
        bytes: size,
        kb: (size / 1024).toFixed(2),
        overBudget: size > BUDGET_BYTES,
      };
    })
    .sort((a, b) => b.bytes - a.bytes);

  const totalBytes = chunks.reduce((sum, chunk) => sum + chunk.bytes, 0);
  const overBudget = chunks.filter((c) => c.overBudget);

  console.log('\n📦 Bundle Analysis\n');
  console.log(`Total JS: ${(totalBytes / 1024).toFixed(0)} KB`);
  console.log(`Chunks: ${chunks.length}`);
  console.log(`Budget: ${BUDGET_KB} KB per chunk\n`);

  if (overBudget.length === 0) {
    console.log('✅ All chunks are within budget!\n');
    return true;
  }

  console.log(`⚠️  ${overBudget.length} chunk(s) over budget:\n`);
  overBudget.forEach((chunk) => {
    const excess = ((chunk.bytes - BUDGET_BYTES) / 1024).toFixed(1);
    console.log(`  ${chunk.name}`);
    console.log(`    Size: ${chunk.kb} KB (${excess} KB over budget)`);
  });

  console.log('\n💡 Recommendations:\n');
  console.log('  1. Review vite.config.ts manualChunks strategy');
  console.log('  2. Consider lazy loading heavy features');
  console.log('  3. Check for duplicate dependencies');
  console.log('  4. Use dynamic imports for large libraries\n');

  return false;
}

const success = analyzeBundle();
process.exit(success ? 0 : 1);
