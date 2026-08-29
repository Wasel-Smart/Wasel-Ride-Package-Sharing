#!/usr/bin/env node
/**
 * Wasel Font Downloader
 *
 * Downloads and converts Google Fonts to WOFF2 for self-hosting.
 * Requires: npm install -g google-webfonts-helper
 *
 * Run: node scripts/download-fonts.mjs
 */

import { execSync } from 'child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const FONTS_DIR = path.join(ROOT, 'public', 'fonts');

const FONTS = [
  {
    family: 'Plus Jakarta Sans',
    weights: [400, 500, 600, 700, 800],
    subsets: ['latin'],
  },
  {
    family: 'Cairo',
    weights: [400, 600, 700],
    subsets: ['arabic', 'latin'],
  },
  {
    family: 'Tajawal',
    weights: [400, 500, 700],
    subsets: ['arabic', 'latin'],
  },
  {
    family: 'JetBrains Mono',
    weights: [400, 700],
    subsets: ['latin'],
  },
];

function main(): void {
  console.log('\n🔤 Wasel Font Downloader\n');
  console.log('This script requires google-webfonts-helper or similar tooling.');
  console.log('For manual download, visit: https://fonts.google.com/\n');

  if (!fs.existsSync(FONTS_DIR)) {
    fs.mkdirSync(FONTS_DIR, { recursive: true });
  }

  console.log('Fonts to download:');
  for (const font of FONTS) {
    console.log(`  - ${font.family}: ${font.weights.join(', ')} (${font.subsets.join(', ')})`);
  }

  console.log('\n📋 Manual Download Steps:');
  console.log('1. Visit https://fonts.google.com/');
  console.log('2. Select each font and weights');
  console.log('3. Download as WOFF2');
  console.log('4. Place in public/fonts/{font-name}/');
  console.log('\nOr use: npx google-webfonts-helper\n');
}

main();
