import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const publicDir = path.join(root, 'public');
const outputPath = path.join(distDir, 'precache-manifest.json');

if (!fs.existsSync(distDir)) {
  console.error('Cannot generate PWA manifest: /dist does not exist. Run build first.');
  process.exit(1);
}

const indexPath = path.join(distDir, 'index.html');
const html = fs.readFileSync(indexPath, 'utf8');

const assetUrls = new Set();

const scriptRe = /<script[^>]+src=["']([^"']+)["'][^>]*>/g;
let match;
while ((match = scriptRe.exec(html)) !== null) {
  assetUrls.add(match[1]);
}

const modulePreloadRe = /<link[^>]+rel=["']modulepreload["'][^>]+href=["']([^"']+)["'][^>]*>/g;
while ((match = modulePreloadRe.exec(html)) !== null) {
  assetUrls.add(match[1]);
}

const cssRe = /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["'][^>]*>/g;
while ((match = cssRe.exec(html)) !== null) {
  assetUrls.add(match[1]);
}

const preloadImageRe = /<link[^>]+rel=["']preload["'][^>]+as=["']image["'][^>]+href=["']([^"']+)["'][^>]*>/g;
while ((match = preloadImageRe.exec(html)) !== null) {
  assetUrls.add(match[1]);
}

// '/' and '/index.html' are intentionally excluded - see public/sw.js for
// why the navigation document must never be locked into the precache.
const staticAssets = [
  '/offline.html',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/robots.txt',
  '/sitemap.xml',
];

for (const url of staticAssets) {
  assetUrls.add(url);
}

// Do not add every generated asset here. Route chunks are intentionally lazy;
// precaching all of them turns a small first visit into a full application
// download and makes service-worker updates slow on mobile networks. Assets
// referenced by the initial HTML are already included above; later routes use
// the runtime cache once visited.

const manifest = {
  version: `wasel-${Date.now()}`,
  urls: Array.from(assetUrls).sort(),
};

fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
console.log(`Generated ${outputPath} with ${manifest.urls.length} assets.`);
