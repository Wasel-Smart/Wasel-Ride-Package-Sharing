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

const ROOT = path.resolve(import.meta.dirname, '..');
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

const DEPRECATED_COLORS: Record<string, string> = {
  '#147fe4': 'Use #00E5FF (Orbit Cyan) instead',
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

function checkFile(filePath: string): void {
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
        if (!ALLOWED_COLORS.has(color)) {
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

function walk(dir: string): void {
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

function main(): void {
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
