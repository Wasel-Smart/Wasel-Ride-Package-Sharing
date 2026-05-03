/**
 * Run this once from the project root:
 *   node scripts/update-logo-assets.js
 *
 * It replaces all Wasel logo PNG files (src/assets + public/brand)
 * with the new branded W mark (transparent background).
 */

const fs = require('fs');
const path = require('path');

// ─── Read the base64 W mark from WaselLogo.tsx ────────────────────────────────
const logoSrc = fs.readFileSync(
  path.join(__dirname, '../src/components/wasel-ds/WaselLogo.tsx'),
  'utf8'
);

const match = logoSrc.match(/base64,([A-Za-z0-9+/=]+)'/);
if (!match) {
  console.error('Could not find base64 data in WaselLogo.tsx');
  process.exit(1);
}

const pngBuffer = Buffer.from(match[1], 'base64');
console.log(`Decoded W mark PNG: ${pngBuffer.length} bytes`);

// ─── Destination paths ────────────────────────────────────────────────────────
const targets = [
  'src/assets/wasellogo.png',
  'public/brand/wasellogo-64.png',
  'public/brand/wasellogo-96.png',
  'public/brand/wasellogo-160.png',
  'public/brand/wasellogo-280.png',
  'public/brand/wasellogo-512.png',
];

targets.forEach((rel) => {
  const dest = path.join(__dirname, '..', rel);
  fs.writeFileSync(dest, pngBuffer);
  console.log(`✓  Updated ${rel}`);
});

console.log('\nAll logo assets updated! Restart your dev server.');
