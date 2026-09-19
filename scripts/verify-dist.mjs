#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');

if (!fs.existsSync(distDir)) {
  console.error('dist/ not found. Run `npm run build` first.');
  process.exit(1);
}

const errors = [];
const warnings = [];
let dynamicChunkCount = 0;
const dynamicChunks = new Set();

// 1. Verify dist/index.html exists and references assets.
const indexPath = path.join(distDir, 'index.html');
if (!fs.existsSync(indexPath)) {
  errors.push('dist/index.html missing');
  process.exit(1);
}
const indexHtml = fs.readFileSync(indexPath, 'utf-8');

// 2. Extract referenced script/css/asset URLs.
const referencedUrls = new Set();
for (const m of indexHtml.matchAll(/(?:src|href)="(\/[^"#?]+)"/g)) {
  referencedUrls.add(m[1]);
}

// 3. Find the main entry index-*.js (script type=module) and walk dynamic imports.
const moduleEntry = [...referencedUrls].find((u) => u.startsWith('/assets/js/index-') && u.endsWith('.js'));
if (!moduleEntry) {
  errors.push('No main /assets/js/index-*.js referenced in dist/index.html');
} else {
  console.log(`Main entry: ${moduleEntry}`);
  const entryAbs = path.join(distDir, moduleEntry.replace(/^\//, ''));
  if (!fs.existsSync(entryAbs)) errors.push(`Main entry chunk missing on disk: ${moduleEntry}`);

  const entrySrc = fs.readFileSync(entryAbs, 'utf-8');

  // Vite's __vite__mapDeps list all dynamic chunks
  const depMatches = [...entrySrc.matchAll(/"(assets\/[^"]+\.js)"/g)];
  for (const m of depMatches) dynamicChunks.add('/' + m[1]);
  dynamicChunkCount = dynamicChunks.size;
  console.log(`Dynamic chunks referenced by main entry: ${dynamicChunkCount}`);

  // Track transitive chunks too.
  for (const m of entrySrc.matchAll(/"(assets\/[^"]+\.js)"/g)) {
    referencedUrls.add('/' + m[1]);
  }

  for (const url of dynamicChunks) {
    const abs = path.join(distDir, url.replace(/^\//, ''));
    if (!fs.existsSync(abs)) {
      errors.push(`Dynamic chunk missing on disk: ${url}`);
    } else {
      const src = fs.readFileSync(abs, 'utf-8');
      // Recurse one level into the chunks the dynamic chunks themselves preload.
      for (const m of src.matchAll(/"(assets\/[^"]+\.js)"/g)) {
        const inner = '/' + m[1];
        if (!referencedUrls.has(inner)) referencedUrls.add(inner);
        const innerAbs = path.join(distDir, inner.replace(/^\//, ''));
        if (!fs.existsSync(innerAbs)) errors.push(`Transitively referenced chunk missing on disk: ${inner}`);
      }
    }
  }
}

// 4. Verify every URL referenced in index.html exists on disk.
for (const url of referencedUrls) {
  if (url.startsWith('http') || url.startsWith('//') || url.startsWith('data:')) continue;
  const abs = path.join(distDir, url.replace(/^\//, ''));
  if (!fs.existsSync(abs)) errors.push(`Asset referenced by index.html missing: ${url}`);
}

// 5. Verify the HomePage chunk specifically.
const homePageChunk = [...referencedUrls, ...dynamicChunks].find((u) => /HomePage-[^/]+\.js$/.test(u));
if (homePageChunk) {
  console.log(`HomePage chunk: ${homePageChunk}`);
  if (!referencedUrls.has(homePageChunk)) referencedUrls.add(homePageChunk);
} else {
  errors.push('HomePage chunk is not referenced by the main entry or any transitive chunk');
}

// 6. Verify dist/sw.js exists and CACHE_VERSION has been stamped.
const swPath = path.join(distDir, 'sw.js');
if (!fs.existsSync(swPath)) {
  errors.push('dist/sw.js missing');
} else {
  const sw = fs.readFileSync(swPath, 'utf-8');
  if (sw.includes('__CACHE_VERSION__')) {
    errors.push('dist/sw.js still contains __CACHE_VERSION__ placeholder — stamping failed');
  }
  if (/CACHE_VERSION = 'wasel-[a-zA-Z0-9_-]+'/.test(sw)) {
    console.log('dist/sw.js CACHE_VERSION stamped OK');
  } else {
    errors.push('dist/sw.js CACHE_VERSION does not match expected wasel-<hash> pattern');
  }
}

// 7. Verify dist/manifest.webmanifest exists.
const manifestPath = path.join(distDir, 'manifest.webmanifest');
if (!fs.existsSync(manifestPath)) {
  warnings.push('dist/manifest.webmanifest missing');
}

if (errors.length) {
  console.error('\nVERIFY FAILED:');
  for (const e of errors) console.error('  ✗ ' + e);
  process.exit(1);
}
if (warnings.length) {
  console.warn('\nWARNINGS:');
  for (const w of warnings) console.warn('  ! ' + w);
}
console.log(`\nVERIFY OK: ${referencedUrls.size} assets in index.html, ${dynamicChunkCount} dynamic chunks resolved.`);