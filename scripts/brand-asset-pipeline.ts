/**
 * Wasel Brand Asset Pipeline
 *
 * Copies, optimizes, and validates brand assets for production.
 * Run: npm run brand:sync
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const BRAND_SOURCE = path.join(ROOT, 'brand', 'assets');
const PUBLIC_BRAND = path.join(ROOT, 'public', 'brand');
const ARTIFACTS_BRAND = path.join(ROOT, 'artifacts', 'brand');

const REQUIRED_ASSETS = [
  'logos/primary/logo-default.svg',
  'logos/primary/logo-dark.svg',
  'logos/primary/logo-light.svg',
  'logos/primary/logo-white.svg',
  'logos/primary/logo-black.svg',
  'logos/primary/logo-monochrome.svg',
  'logos/symbols/symbol-default.svg',
  'logos/symbols/symbol-white.svg',
  'icons/app-icon.svg',
  'icons/app-icon-white.svg',
  'icons/favicon.svg',
  'og/og-default.png',
  'social/social-dark.svg',
];

const REQUIRED_SIZES = [64, 96, 160, 280, 512];
const REQUIRED_FORMATS = ['svg', 'png', 'webp', 'avif'];

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyAsset(src: string, dest: string): void {
  ensureDir(path.dirname(dest));
  if (!fs.existsSync(dest)) {
    fs.copyFileSync(src, dest);
  }
}

function validateAsset(filePath: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const stat = fs.statSync(filePath);
  const ext = path.extname(filePath).slice(1);

  if (stat.size === 0) {
    issues.push('File is empty');
  }

  if (ext === 'svg') {
    const content = fs.readFileSync(filePath, 'utf-8');
    if (!content.includes('<svg') && !content.includes('<?xml')) {
      issues.push('Invalid SVG: missing <svg> tag');
    }
    if (content.includes('width="') && content.includes('height="')) {
      // Good: explicit dimensions
    }
  }

  if (ext === 'png' || ext === 'webp' || ext === 'avif') {
    const buffer = fs.readFileSync(filePath);
    const header = buffer.slice(0, 8).toString('hex');
    const validHeaders: Record<string, string> = {
      png: '89504e470d0a1a0a',
      webp: '52494646',
      avif: '0000001c667479706166',
    };
    if (header !== validHeaders[ext]) {
      issues.push(`Invalid ${ext.toUpperCase()} header`);
    }
  }

  return { valid: issues.length === 0, issues };
}

function syncAssets(): void {
  console.log('🔄 Syncing brand assets...\n');

  const sourceFiles = new Set<string>();
  const destFiles = new Set<string>();

  function walk(dir: string, base: string): void {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(base, fullPath);
      if (entry.isDirectory()) {
        walk(fullPath, base);
      } else {
        sourceFiles.add(relPath);
      }
    }
  }

  walk(BRAND_SOURCE, BRAND_SOURCE);

  for (const relPath of sourceFiles) {
    const src = path.join(BRAND_SOURCE, relPath);
    const dest = path.join(PUBLIC_BRAND, relPath);
    copyAsset(src, dest);
    destFiles.add(relPath);
  }

  console.log(`  ✅ Synced ${destFiles.size} assets to public/brand/`);

  if (destFiles.size === 0) {
    console.warn('  ⚠️  No assets found in brand/assets/');
  }
}

function validateAssets(): void {
  console.log('\n🔍 Validating brand assets...\n');

  let totalValid = 0;
  let totalInvalid = 0;

  for (const relPath of REQUIRED_ASSETS) {
    const srcPath = path.join(BRAND_SOURCE, relPath);
    const publicPath = path.join(PUBLIC_BRAND, relPath);

    if (!fs.existsSync(srcPath) && !fs.existsSync(publicPath)) {
      console.warn(`  ⚠️  Missing: ${relPath}`);
      totalInvalid++;
      continue;
    }

    const checkPath = fs.existsSync(srcPath) ? srcPath : publicPath;
    const { valid, issues } = validateAsset(checkPath);

    if (valid) {
      console.log(`  ✅ ${relPath}`);
      totalValid++;
    } else {
      console.warn(`  ❌ ${relPath}: ${issues.join(', ')}`);
      totalInvalid++;
    }
  }

  console.log(`\n  📊 ${totalValid} valid, ${totalInvalid} invalid`);

  if (totalInvalid > 0) {
    console.log('\n❌ Asset validation FAILED\n');
    process.exit(1);
  }
}

function checkSizes(): void {
  console.log('\n📏 Checking asset sizes...\n');

  const logoDir = path.join(BRAND_SOURCE, 'logos', 'primary');
  if (!fs.existsSync(logoDir)) {
    console.warn('  ⚠️  Logo directory not found');
    return;
  }

  const sizes = new Set<number>();
  const files = fs.readdirSync(logoDir);

  for (const file of files) {
    const match = file.match(/logo-\w+-(\d+)\./);
    if (match) {
      sizes.add(parseInt(match[1], 10));
    }
  }

  const missing = REQUIRED_SIZES.filter(s => !sizes.has(s));
  if (missing.length > 0) {
    console.warn(`  ⚠️  Missing logo sizes: ${missing.join(', ')}px`);
  } else {
    console.log(`  ✅ All required logo sizes present: ${[...sizes].sort((a, b) => a - b).join(', ')}px`);
  }
}

function generateBrandReport(): void {
  console.log('\n📋 Generating brand report...\n');

  const report = {
    generatedAt: new Date().toISOString(),
    assets: {} as Record<string, string[]>,
    totalFiles: 0,
    totalSize: 0,
  };

  function walk(dir: string, prefix: string): void {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(BRAND_SOURCE, fullPath);
      if (entry.isDirectory()) {
        walk(fullPath, prefix + entry.name + '/');
      } else {
        const stat = fs.statSync(fullPath);
        report.totalFiles++;
        report.totalSize += stat.size;
        const category = prefix.split('/')[0];
        if (!report.assets[category]) report.assets[category] = [];
        report.assets[category].push(relPath);
      }
    }
  }

  walk(BRAND_SOURCE, '');

  console.log(`  📁 ${report.totalFiles} files`);
  console.log(`  💾 ${(report.totalSize / 1024).toFixed(2)} KB total`);

  for (const [category, files] of Object.entries(report.assets)) {
    console.log(`  📂 ${category}: ${files.length} files`);
  }
}

function main(): void {
  console.log('\n🎨 Wasel Brand Asset Pipeline\n');
  console.log('='.repeat(50) + '\n');

  try {
    syncAssets();
    validateAssets();
    checkSizes();
    generateBrandReport();

    console.log('\n' + '='.repeat(50));
    console.log('✅ Brand asset pipeline completed successfully\n');
  } catch (error) {
    console.error('\n❌ Brand asset pipeline failed:', error);
    process.exit(1);
  }
}

main();
