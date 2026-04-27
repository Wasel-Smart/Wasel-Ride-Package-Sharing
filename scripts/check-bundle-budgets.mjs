#!/usr/bin/env node

import { gzipSync } from 'node:zlib';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import budgetConfig from '../.size-limit.js';

const rootDir = process.cwd();
const distDir = join(rootDir, 'dist');
const verbose = process.argv.includes('--verbose');

function parseLimit(limit) {
  const [value, unit = 'B'] = limit.trim().split(/\s+/);
  const amount = Number(value);
  const normalizedUnit = unit.toUpperCase();

  if (normalizedUnit === 'KB') {
    return amount * 1024;
  }
  if (normalizedUnit === 'MB') {
    return amount * 1024 * 1024;
  }
  return amount;
}

function wildcardToRegex(pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`);
}

function walkFiles(directory) {
  if (!existsSync(directory)) {
    return [];
  }

  const entries = readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(absolutePath));
      continue;
    }
    files.push(absolutePath);
  }

  return files;
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function getMeasuredSize(filePath, useGzip) {
  const fileBuffer = readFileSync(filePath);
  return useGzip ? gzipSync(fileBuffer).length : statSync(filePath).size;
}

function run() {
  if (!existsSync(distDir)) {
    console.error('dist directory is missing. Run `npm run build` first.');
    process.exit(1);
  }

  const allFiles = walkFiles(distDir).map((filePath) => relative(rootDir, filePath).replace(/\\/g, '/'));
  const results = budgetConfig.map((budget) => {
    const pattern = wildcardToRegex(budget.path);
    const matches = allFiles.filter((filePath) => pattern.test(filePath));
    const limitBytes = parseLimit(budget.limit);
    const totalBytes = matches.reduce((sum, filePath) => {
      return sum + getMeasuredSize(join(rootDir, filePath), Boolean(budget.gzip));
    }, 0);

    return {
      ...budget,
      limitBytes,
      totalBytes,
      matches,
      ok: matches.length > 0 && totalBytes <= limitBytes,
    };
  });

  let hasFailure = false;

  for (const result of results) {
    const status = result.ok ? 'OK' : 'FAIL';
    const summary = `${status} ${result.name}: ${formatBytes(result.totalBytes)} / ${formatBytes(result.limitBytes)}`;
    console.log(summary);

    if (verbose) {
      for (const match of result.matches) {
        const measuredSize = getMeasuredSize(join(rootDir, match), Boolean(result.gzip));
        console.log(`  - ${match}: ${formatBytes(measuredSize)}`);
      }
    }

    if (!result.ok) {
      hasFailure = true;
      if (result.matches.length === 0) {
        console.log(`  - No files matched ${result.path}`);
      }
    }
  }

  if (hasFailure) {
    process.exit(1);
  }
}

run();
