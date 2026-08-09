#!/usr/bin/env node
/**
 * scripts/verify-translations.mjs
 *
 * Validates that English and Arabic translations share the same key structure.
 * Exits 0 when balanced, 1 when drift is detected.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const TRANSLATIONS = join(__dir, '../src/locales/translations.ts');

function extractModuleExports(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const match = content.match(/export\s+const\s+translations\s*[^=]*=\s*(\{[\s\S]*\});/);
  if (!match) {
    throw new Error(`Unable to extract translations from ${filePath}`);
  }
  return new Function(`return ${match[1]};`)();
}

function flatten(obj, prefix = '', out = {}) {
  for (const k of Object.keys(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (obj[k] && typeof obj[k] === 'object') {
      flatten(obj[k], key, out);
    } else {
      out[key] = obj[k];
    }
  }
  return out;
}

function main() {
  const translations = extractModuleExports(TRANSLATIONS);
  const en = flatten(translations.en ?? {});
  const ar = flatten(translations.ar ?? {});

  const enKeys = Object.keys(en).sort();
  const arKeys = Object.keys(ar).sort();

  const missingAr = enKeys.filter(k => !(k in ar));
  const missingEn = arKeys.filter(k => !(k in en));

  if (missingAr.length === 0 && missingEn.length === 0) {
    console.log(`Translations balanced: ${enKeys.length} keys in both en and ar.`);
    return 0;
  }

  console.error(`Translation drift detected:`);
  if (missingAr.length) {
    console.error(`  Missing in ar (${missingAr.length}):`);
    missingAr.slice(0, 20).forEach(k => console.error(`    - ${k}`));
    if (missingAr.length > 20) console.error(`    ... and ${missingAr.length - 20} more`);
  }
  if (missingEn.length) {
    console.error(`  Missing in en (${missingEn.length}):`);
    missingEn.slice(0, 20).forEach(k => console.error(`    - ${k}`));
    if (missingEn.length > 20) console.error(`    ... and ${missingEn.length - 20} more`);
  }
  return 1;
}

const code = main();
if (code !== 0) process.exit(code);
