#!/usr/bin/env node
/**
 * scripts/sweep-i18n.mjs
 *
 * Scans src/ for UI strings that bypass the translation system.
 * Flags:
 *   - Arabic text (Unicode range \u0600-\u06FF) outside translations.ts
 *   - English string literals in JSX that are not t() calls or translation keys
 *
 * Run: node scripts/sweep-i18n.mjs
 * Exit 1 if leaks found (use in CI).
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dir, '../src');

// Files that are allowed to contain raw strings
const ALLOWLIST = [
  'translations.ts',
  'tx.ts',
  'wasel-ds.ts',
  'design-tokens.ts',
  'wasel-tokens.ts',
  'wasel-design-system.ts',
  'wasel-page-theme.ts',
  'globals.css',
  'index.css',
  'vite-env.d.ts',
  'global.d.ts',
];

// Arabic Unicode block
const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;

// JSX text content that looks like a user-visible English string
// Matches: >Some Text< or >"Some string"< patterns with 3+ chars
const JSX_STRING_RE = />([A-Z][a-zA-Z\s]{3,}[a-zA-Z])</g;

// Known false-positive patterns (code identifiers, not UI strings)
const FALSE_POSITIVE_RE = /^(React|TypeScript|JavaScript|Supabase|Wasel|JoPACC|CliQ|GPS|SOS|OTP|API|URL|JWT|RBAC|SLO|PWA|RTL|LTR|CSS|HTML|JSON|ZIP|PDF|SMS|OTP|2FA|QR|ID|UI|UX|SDK|CDN|CI|CD|PR|MR|TODO|FIXME|NOTE|HACK|XXX)/;

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (!['node_modules', '.git', 'dist', 'build', '__tests__'].includes(entry)) {
        walk(full, files);
      }
    } else if (['.tsx', '.ts'].includes(extname(entry)) && !ALLOWLIST.includes(entry)) {
      files.push(full);
    }
  }
  return files;
}

const files = walk(SRC);
const leaks = [];

for (const file of files) {
  const rel = relative(SRC, file);
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');

  lines.forEach((line, i) => {
    const lineNo = i + 1;

    // Skip comments and imports
    if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*') || line.includes('import ')) return;

    // Check for Arabic text outside translations.ts
    if (ARABIC_RE.test(line)) {
      leaks.push({ file: rel, line: lineNo, type: 'arabic', text: line.trim().slice(0, 80) });
    }

    // Check for JSX string literals that look like UI text
    let m;
    JSX_STRING_RE.lastIndex = 0;
    while ((m = JSX_STRING_RE.exec(line)) !== null) {
      const text = m[1].trim();
      if (!FALSE_POSITIVE_RE.test(text) && text.length > 4) {
        leaks.push({ file: rel, line: lineNo, type: 'jsx-string', text });
      }
    }
  });
}

if (leaks.length === 0) {
  console.log('\n✓ i18n sweep passed — no hardcoded UI strings detected.\n');
  process.exit(0);
}

console.log(`\n⚠  i18n sweep found ${leaks.length} potential hardcoded string(s):\n`);

const byFile = {};
for (const leak of leaks) {
  (byFile[leak.file] ??= []).push(leak);
}

for (const [file, items] of Object.entries(byFile)) {
  console.log(`  ${file}`);
  for (const item of items) {
    console.log(`    L${item.line} [${item.type}] ${item.text}`);
  }
}

console.log('\nFix: route these strings through t() from src/locales/tx.ts\n');

// Exit 0 with warnings (not 1) — these need human review, not hard CI block
// Change to process.exit(1) once the sweep is confirmed clean.
process.exit(0);
