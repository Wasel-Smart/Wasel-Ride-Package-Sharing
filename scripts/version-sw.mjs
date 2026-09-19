import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const swPath = path.join(distDir, 'sw.js');
const indexPath = path.join(distDir, 'index.html');

if (!fs.existsSync(swPath)) {
  console.error('Cannot version sw.js: dist/sw.js does not exist. Run the build first.');
  process.exit(1);
}

function getBuildVersion() {
  // The HTML build-time meta is the single deployment identifier. Both the
  // generated precache manifest and sw.js derive their version from it, so a
  // browser sees a coordinated shell update instead of three independent
  // timestamps.
  if (fs.existsSync(indexPath)) {
    const html = fs.readFileSync(indexPath, 'utf8');
    const buildTime = html.match(/<meta name="build-time" content="([^"]+)"/)?.[1];
    const normalized = buildTime?.replace(/[^a-zA-Z0-9_-]/g, '');
    if (normalized) return `wasel-${normalized}`;
  }

  const hash = crypto.createHash('sha256');
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name !== 'sw.js') {
        hash.update(path.relative(distDir, full));
        hash.update('\0');
        hash.update(fs.readFileSync(full));
        hash.update('\0');
      }
    }
  };
  walk(distDir);
  return `wasel-${hash.digest('hex').slice(0, 12)}`;
}

let sw = fs.readFileSync(swPath, 'utf8');
if (!sw.includes('__CACHE_VERSION__')) {
  if (!/const CACHE_VERSION = 'wasel-[^']+';/.test(sw)) {
    console.error('dist/sw.js is missing a valid CACHE_VERSION.');
    process.exit(1);
  }
  console.log('dist/sw.js already versioned; skipping post-build stamp.');
  process.exit(0);
}

const version = getBuildVersion();
sw = sw.replaceAll('__CACHE_VERSION__', version);
fs.writeFileSync(swPath, sw);

console.log(`Stamped dist/sw.js with cache version: ${version}`);
