#!/usr/bin/env node
/**
 * Wasel Brand Consistency Checker
 *
 * Validates that all brand colors, fonts, and tokens in the codebase
 * match the canonical brand definitions in wasel-ds.ts.
 *
 * Run: npm run brand:check
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const DEPRECATED_COLORS = {
  '#147fe4': 'Use #00E5FF (Orbit Cyan) instead',
  '#147FE4': 'Use #00E5FF (Orbit Cyan) instead',
  '#67e8ff': 'Use #00E5FF (Orbit Cyan) instead',
  '#58ddff': 'Use #66e0ff (cyanLight) or #00E5FF (Orbit Cyan) instead',
  'rgba(20, 127, 228': 'Use rgba(0, 229, 255, ...) (Orbit Cyan) instead',
  'rgba(20,155,203': 'Use rgba(0, 229, 255, ...) (Orbit Cyan) instead',
  '#149bcb': 'Use #00E5FF (Orbit Cyan) instead',
};

const BRAND_FONTS = [
  'Plus Jakarta Sans',
  'Cairo',
  'Tajawal',
  'Inter',
  'JetBrains Mono',
  'Fira Mono',
  'system-ui',
];

const EXTENSIONS = ['.ts', '.tsx', '.css', '.json', '.md'];
const EXCLUDE_DIRS = new Set(['node_modules', 'dist', 'build', '.git', 'artifacts', 'public']);

let errors = 0;
let warnings = 0;
let checkedFiles = 0;

const SAFE_COLORS = new Set([
  '#fff', '#FFFFFF', '#ffffff',
  '#000', '#000000',
  '#ef4444', '#f59e0b', '#22c55e', '#10b981',
  '#f8fbff', '#eef8ff', '#f5fbff',
  '#38beff', '#32d8a7', '#34d8a7', '#209b7d',
  '#b7abff', '#7f91ff', '#8debff', '#47d69e',
  '#ffb35c', '#ff936a',
  '#f5b11e', '#fca5a5', '#cbd5e1', '#e5e7eb',
  '#6b7280', '#9ca3af', '#94a3b8', '#64748b',
  '#f59e0b', '#eab308', '#10b981', '#22c55e',
  '#3b82f6', '#60a5fa', '#2563eb', '#1d4ed8',
  '#8b5cf6', '#c084fc', '#fbbf24',
  '#e91e63', '#ff69b4', '#25d366',
  '#4285f4', '#1877f2',
  '#f0a830', '#2060e8', '#0e5cb0',
  '#55e9ff', '#60a5fa',
  '#040c18', '#0b0f16', '#11141c', '#111827',
  '#1f2937', '#374151', '#334155', '#475569',
  '#161b26', '#1c2230', '#0c0f16',
  '#1a3a6a', '#c0c0c0', '#333', '#2ecc71', '#e0e0e0',
  '#f5f5f5', '#666',
  '#22c55e', '#ffb020', '#ff4d67', '#38bdf8',
  '#22d3ee', '#2dd4bf', '#4ade80', '#fbbf24', '#60a5fa',
  '#fcd34d', '#c084fc', '#fda4af', '#fca5a5',
  '#0b1220', '#213047',
  '#f7f1e8', '#b88a52',
  '#5e7257', '#a9b98d',
  '#0a1f3d', '#081220', '#081d39', '#0a1f3a', '#0e2240', '#132b4d',
  '#95b2c9', '#9af1cf', '#58ddff',
  '#72c70d', '#5a6b08', '#ff8a0b', '#e07500',
  '#ffbe5c', '#8fa6ff', '#ff7c8b',
]);

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const ext = path.extname(filePath);

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();

    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;

    for (const [deprecated, suggestion] of Object.entries(DEPRECATED_COLORS)) {
      if (trimmed.includes(deprecated)) {
        const relative = path.relative(ROOT, filePath);
        console.error(`  [BRAND ERROR] ${relative}:${lineNum}: Deprecated color "${deprecated}"`);
        console.error(`           ${suggestion}`);
        console.error(`           Line: ${trimmed.slice(0, 120)}`);
        errors++;
      }
    }

    if (ext === '.ts' || ext === '.tsx') {
      const hexMatches = trimmed.matchAll(/#[0-9a-fA-F]{3,8}\b/g);
      for (const match of hexMatches) {
        const color = match[0];
        if (!SAFE_COLORS.has(color) && !ALLOWED_COLORS.has(color)) {
          const relative = path.relative(ROOT, filePath);
          console.warn(`  [BRAND WARN] ${relative}:${lineNum}: Non-brand hex color "${color}"`);
          console.warn(`           Line: ${trimmed.slice(0, 120)}`);
          warnings++;
        }
      }
    }

    if (ext === '.css' || ext === '.tsx') {
      const fontStackMatches = trimmed.matchAll(/font-family:\s*([^;]+);/g);
      for (const match of fontStackMatches) {
        const stack = match[1];
        const hasNonBrand = !BRAND_FONTS.some(font =>
          stack.toLowerCase().includes(font.toLowerCase())
        ) && !stack.includes('system-ui') && !stack.includes('inherit') && !stack.includes('initial');

        if (hasNonBrand && stack.includes(',')) {
          const fonts = stack.split(',').map(f => f.trim().replace(/['"]/g, ''));
          const nonBrand = fonts.filter(f => !BRAND_FONTS.includes(f) && f !== 'system-ui' && f !== 'inherit' && f !== 'initial');
          if (nonBrand.length > 0) {
            const relative = path.relative(ROOT, filePath);
            console.warn(`  [BRAND WARN] ${relative}:${lineNum}: Non-brand fonts in stack: ${nonBrand.join(', ')}`);
            console.warn(`           Allowed: ${BRAND_FONTS.join(', ')}`);
            warnings++;
          }
        }
      }
    }
  });

  checkedFiles++;
}

const ALLOWED_COLORS = new Set([
  '#00E5FF', '#66e0ff', '#00b8d4',
  '#081D39', '#0a1f3a', '#0e2240', '#132b4d', '#050B12',
  '#72C70D', '#5a6b08',
  '#FF8A0B', '#e07500',
  '#8FA6FF',
  '#FF7C8B',
  '#FFBE5C',
  '#95B2C9',
  '#9af1cf', '#58ddff',
  '#F8FBFF', '#eef8ff', '#f5fbff',
  '#ffffff', '#000000',
  'transparent',
]);

function walk(dir) {
  if (EXCLUDE_DIRS.has(path.basename(dir))) return;

  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (EXTENSIONS.includes(path.extname(entry.name))) {
      checkFile(fullPath);
    }
  }
}

function main() {
  console.log('\n🔍 Wasel Brand Consistency Check\n');
  console.log(`Checking ${ROOT}...\n`);

  const dirsToCheck = [
    path.join(ROOT, 'src'),
    path.join(ROOT, 'brand'),
    path.join(ROOT, 'mobile'),
    path.join(ROOT, 'public'),
  ];

  for (const dir of dirsToCheck) {
    if (fs.existsSync(dir)) {
      walk(dir);
    }
  }

  console.log(`\n📊 Results: ${checkedFiles} files checked, ${errors} errors, ${warnings} warnings\n`);

  if (errors > 0) {
    console.log('❌ Brand consistency check FAILED\n');
    process.exit(1);
  } else if (warnings > 0) {
    console.log('⚠️  Brand consistency check passed with warnings\n');
    process.exit(0);
  } else {
    console.log('✅ Brand consistency check PASSED\n');
    process.exit(0);
  }
}

main();
