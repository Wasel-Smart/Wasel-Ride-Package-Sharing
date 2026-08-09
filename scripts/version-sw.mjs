import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const swPath = path.join(distDir, 'sw.js');

if (!fs.existsSync(swPath)) {
  console.error('Cannot version sw.js: dist/sw.js does not exist. Run the build first.');
  process.exit(1);
}

// A version tied to actual build content (short hash of the built JS/CSS file
// list + timestamp) rather than a hand-edited constant. This guarantees
// dist/sw.js is byte-different on every deploy, which is what makes browsers
// (including Safari/WebKit on iOS) actually detect the update and re-run
// install/activate instead of running whatever SW first landed on a phone
// weeks or months ago.
const assetsDir = path.join(distDir, 'assets');
let fingerprint = '';
if (fs.existsSync(assetsDir)) {
  const walk = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? walk(full) : [full];
    });
  const files = walk(assetsDir).sort();
  const hash = crypto.createHash('sha256');
  for (const file of files) hash.update(path.relative(distDir, file));
  fingerprint = hash.digest('hex').slice(0, 12);
}

const version = `wasel-${fingerprint || Date.now()}`;

let sw = fs.readFileSync(swPath, 'utf8');
if (!sw.includes('__CACHE_VERSION__')) {
  console.error(
    'dist/sw.js does not contain the __CACHE_VERSION__ placeholder. ' +
      'Check public/sw.js has not been reverted to a hardcoded CACHE_VERSION.',
  );
  process.exit(1);
}
sw = sw.replaceAll('__CACHE_VERSION__', version);
fs.writeFileSync(swPath, sw);

console.log(`Stamped dist/sw.js with cache version: ${version}`);
