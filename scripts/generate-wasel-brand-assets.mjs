import { mkdir, readFile, writeFile } from 'node:fs/promises';
<<<<<<< HEAD
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);

function loadPackage(packageName) {
  const candidates = [
    packageName,
    path.join(
      process.env.USERPROFILE ?? '',
      '.cache',
      'codex-runtimes',
      'codex-primary-runtime',
      'dependencies',
      'node',
      'node_modules',
      '.pnpm',
      packageName === 'sharp' ? 'sharp@0.34.5' : `${packageName}@1.61.0`,
      'node_modules',
      packageName,
    ),
    path.join(
      process.env.USERPROFILE ?? '',
      '.cache',
      'codex-runtimes',
      'codex-primary-runtime',
      'dependencies',
      'node',
      'node_modules',
      packageName,
    ),
  ];

  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {
      // Try the next known install location.
    }
  }

  throw new Error(`${packageName} is required to render brand assets. Run npm install or use the Codex bundled runtime.`);
}

const sharp = loadPackage('sharp');
=======
import path from 'node:path';
import { chromium } from 'playwright';
>>>>>>> 3f91593102061af94f82b9db9416273735742bdf

const root = process.cwd();
const brandDir = path.join(root, 'public', 'brand');
const publicDir = path.join(root, 'public');
const artifactDir = path.join(root, 'artifacts', 'brand');
<<<<<<< HEAD
const srcAssetsDir = path.join(root, 'src', 'assets');
const mobileAssetsDir = path.join(root, 'mobile', 'assets', 'images');
const androidResDir = path.join(root, 'mobile', 'android', 'app', 'src', 'main', 'res');

const FULL_WIDTH = 1120;
const FULL_HEIGHT = 360;
const FULL_RATIO = FULL_WIDTH / FULL_HEIGHT;

const MARK_VIEWBOX_WIDTH = 720;
const MARK_VIEWBOX_HEIGHT = 300;

const P = {
  midnight: '#040C18',
  navy: '#071827',
  navy2: '#0B2034',
  white: '#FFFFFF',
  ink: '#06133F',
  blue: '#1EA1FF',
  cyan: '#55E9FF',
  amber: '#FFB23A',
  orange: '#FF6A1F',
  green: '#2FEA7A',
  mint: '#7AF5B2',
};
=======

const FULL_WIDTH = 1005;
const FULL_HEIGHT = 316;
const FULL_RATIO = FULL_WIDTH / FULL_HEIGHT;

const MARK_VIEWBOX_WIDTH = 500;
const MARK_VIEWBOX_HEIGHT = 260;
const ROUTE_PATH =
  'M44 76C78 136 91 232 149 232C191 232 202 164 225 111C239 80 263 80 277 111C300 164 311 232 353 232C411 232 424 136 458 76';
>>>>>>> 3f91593102061af94f82b9db9416273735742bdf

function cleanSvg(svg) {
  return `${svg.replace(/[ \t]+$/gm, '').trimEnd()}\n`;
}

<<<<<<< HEAD
function markDefs(id) {
  return `
    <linearGradient id="${id}-left" x1="74" y1="102" x2="374" y2="260" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${P.blue}"/>
      <stop offset="0.48" stop-color="${P.cyan}"/>
      <stop offset="1" stop-color="${P.blue}"/>
    </linearGradient>
    <linearGradient id="${id}-center" x1="338" y1="78" x2="456" y2="278" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${P.orange}"/>
      <stop offset="0.54" stop-color="${P.amber}"/>
      <stop offset="1" stop-color="${P.orange}"/>
    </linearGradient>
    <linearGradient id="${id}-right" x1="398" y1="260" x2="646" y2="102" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${P.green}"/>
      <stop offset="0.52" stop-color="${P.mint}"/>
      <stop offset="1" stop-color="${P.green}"/>
    </linearGradient>
    <radialGradient id="${id}-hub" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(360 150) rotate(90) scale(68)">
      <stop offset="0" stop-color="#FFF7B1"/>
      <stop offset="0.42" stop-color="${P.amber}"/>
      <stop offset="1" stop-color="${P.orange}"/>
    </radialGradient>
    <filter id="${id}-glow-blue" x="-28%" y="-45%" width="156%" height="190%" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="0" stdDeviation="12" flood-color="${P.blue}" flood-opacity="0.38"/>
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#03101D" flood-opacity="0.18"/>
    </filter>
    <filter id="${id}-glow-amber" x="-34%" y="-34%" width="168%" height="178%" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="0" stdDeviation="13" flood-color="${P.amber}" flood-opacity="0.4"/>
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#261001" flood-opacity="0.16"/>
    </filter>
    <filter id="${id}-glow-green" x="-28%" y="-45%" width="156%" height="190%" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="0" stdDeviation="12" flood-color="${P.green}" flood-opacity="0.38"/>
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#03150D" flood-opacity="0.16"/>
    </filter>
    <filter id="${id}-dot-glow" x="-80%" y="-80%" width="260%" height="260%" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="0" stdDeviation="7" flood-color="${P.cyan}" flood-opacity="0.5"/>
    </filter>`;
}

function node({ x, y, fill, id }) {
  return `
    <g filter="url(#${id}-dot-glow)">
      <circle cx="${x}" cy="${y}" r="17" fill="${fill}" opacity="0.24"/>
      <circle cx="${x}" cy="${y}" r="10" fill="${fill}"/>
      <circle cx="${x - 3}" cy="${y - 3}" r="4" fill="${P.white}" opacity="0.74"/>
    </g>`;
}

function markGroup(id) {
  const leftPath = 'M104 76C43 119 32 225 91 258C154 293 235 252 279 190C311 145 338 124 369 146';
  const centerPath =
    'M370 70C311 76 276 117 281 166C287 225 350 247 395 219C434 195 433 141 392 132C358 124 334 147 336 177C339 213 382 231 421 207C466 180 473 108 430 78C396 54 338 60 308 96';
  const centerTail = 'M421 207C427 249 398 276 342 282';
  const rightPath = 'M351 146C382 124 409 145 441 190C485 252 566 293 629 258C688 225 677 119 616 76';

  return `
    <g fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M145 238L360 150L575 238" stroke="${P.cyan}" stroke-width="2" opacity="0.22"/>
      <path d="M126 92L360 150L594 92" stroke="${P.green}" stroke-width="2" opacity="0.18"/>
      <path d="M360 150V264" stroke="${P.amber}" stroke-width="2" opacity="0.22"/>
      <path d="${leftPath}" stroke="url(#${id}-left)" stroke-width="48" filter="url(#${id}-glow-blue)"/>
      <path d="${leftPath}" stroke="${P.cyan}" stroke-width="11" opacity="0.52"/>
      <path d="${rightPath}" stroke="url(#${id}-right)" stroke-width="48" filter="url(#${id}-glow-green)"/>
      <path d="${rightPath}" stroke="${P.mint}" stroke-width="11" opacity="0.5"/>
      <path d="${centerPath}" stroke="url(#${id}-center)" stroke-width="50" filter="url(#${id}-glow-amber)"/>
      <path d="${centerTail}" stroke="url(#${id}-center)" stroke-width="50" filter="url(#${id}-glow-amber)"/>
      <path d="${centerPath}" stroke="#FFD775" stroke-width="12" opacity="0.55"/>
      <path d="${centerTail}" stroke="#FFD775" stroke-width="12" opacity="0.52"/>
    </g>
    ${node({ x: 104, y: 76, fill: P.cyan, id })}
    ${node({ x: 145, y: 238, fill: P.cyan, id })}
    ${node({ x: 342, y: 282, fill: P.amber, id })}
    ${node({ x: 360, y: 150, fill: 'url(#' + id + '-hub)', id })}
    ${node({ x: 575, y: 238, fill: P.mint, id })}
    ${node({ x: 616, y: 76, fill: P.mint, id })}`;
}

function markSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${MARK_VIEWBOX_WIDTH}" height="${MARK_VIEWBOX_HEIGHT}" viewBox="0 0 ${MARK_VIEWBOX_WIDTH} ${MARK_VIEWBOX_HEIGHT}" fill="none" role="img" aria-labelledby="wasel-mark-title">
  <title id="wasel-mark-title">Wasel connected route mark</title>
  <defs>${markDefs('mark')}</defs>
  <g transform="translate(0 8)">
    ${markGroup('mark')}
  </g>
</svg>`;
}

function logoSvg({ wordColor, id = 'logo' }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${FULL_WIDTH}" height="${FULL_HEIGHT}" viewBox="0 0 ${FULL_WIDTH} ${FULL_HEIGHT}" fill="none" role="img" aria-labelledby="${id}-title">
  <title id="${id}-title">Wasel bilingual logo</title>
  <defs>${markDefs(id)}</defs>
  <g transform="translate(8 24) scale(0.82)">
    ${markGroup(id)}
  </g>
  <g fill="${wordColor}">
    <text x="604" y="166" font-family="'Plus Jakarta Sans', 'Inter', 'Segoe UI', Arial, sans-serif" font-size="116" font-weight="800" letter-spacing="0">wasel</text>
    <text x="596" y="280" font-family="'Noto Sans Arabic', 'Cairo', 'Tajawal', 'Segoe UI', Arial, sans-serif" font-size="116" font-weight="900" letter-spacing="0">واصل</text>
  </g>
</svg>`;
}

function iconSvg(size = 512) {
  const scale = 0.62;
=======
function routeDefs(id) {
  return `
    <linearGradient id="${id}-route" x1="22" y1="76" x2="480" y2="205" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#1478F2"/>
      <stop offset="0.46" stop-color="#19BCE4"/>
      <stop offset="1" stop-color="#38CE62"/>
    </linearGradient>
    <filter id="${id}-shadow" x="-8%" y="-16%" width="116%" height="132%" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#06133F" flood-opacity="0.14"/>
    </filter>`;
}

function routeMark({ id = 'wasel', shadow = true } = {}) {
  const filter = shadow ? ` filter="url(#${id}-shadow)"` : '';

  return `
    <g${filter}>
      <path d="${ROUTE_PATH}" fill="none" stroke="url(#${id}-route)" stroke-width="31" stroke-linecap="round" stroke-linejoin="round"/>
    </g>`;
}

function markSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${MARK_VIEWBOX_WIDTH}" height="${MARK_VIEWBOX_HEIGHT}" viewBox="0 0 ${MARK_VIEWBOX_WIDTH} ${MARK_VIEWBOX_HEIGHT}" fill="none">
  <defs>${routeDefs('mark')}</defs>
  ${routeMark({ id: 'mark' })}
</svg>
`;
}

function logoSvg({ wordColor, id = 'logo' }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${FULL_WIDTH}" height="${FULL_HEIGHT}" viewBox="0 0 ${FULL_WIDTH} ${FULL_HEIGHT}" fill="none">
  <defs>${routeDefs(id)}</defs>
  <g transform="translate(34 38) scale(0.88)">
    ${routeMark({ id })}
  </g>
  <text x="480" y="213" fill="${wordColor}" font-family="'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif" font-size="155" font-weight="800" letter-spacing="0">wasel</text>
</svg>
`;
}

function iconSvg(size = 512) {
  const scale = 0.66;
>>>>>>> 3f91593102061af94f82b9db9416273735742bdf
  const markWidth = MARK_VIEWBOX_WIDTH * scale;
  const markHeight = MARK_VIEWBOX_HEIGHT * scale;
  const x = (512 - markWidth) / 2;
  const y = (512 - markHeight) / 2 + 8;

<<<<<<< HEAD
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none" width="${size}" height="${size}" role="img" aria-labelledby="wasel-icon-title">
  <title id="wasel-icon-title">Wasel app icon</title>
  <defs>
    ${markDefs('icon')}
    <radialGradient id="icon-glow-a" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(118 120) rotate(45) scale(310)">
      <stop stop-color="${P.blue}" stop-opacity="0.36"/>
      <stop offset="1" stop-color="${P.blue}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="icon-glow-b" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(388 386) rotate(45) scale(300)">
      <stop stop-color="${P.green}" stop-opacity="0.3"/>
      <stop offset="1" stop-color="${P.green}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="icon-glow-c" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(260 196) rotate(45) scale(240)">
      <stop stop-color="${P.amber}" stop-opacity="0.22"/>
      <stop offset="1" stop-color="${P.amber}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="${P.midnight}"/>
  <rect width="512" height="512" rx="112" fill="url(#icon-glow-a)"/>
  <rect width="512" height="512" rx="112" fill="url(#icon-glow-b)"/>
  <rect width="512" height="512" rx="112" fill="url(#icon-glow-c)"/>
  <g transform="translate(${x} ${y}) scale(${scale})">
    ${markGroup('icon')}
  </g>
</svg>`;
}

function ogSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" fill="none">
  <defs>
    ${markDefs('og')}
    <radialGradient id="og-blue" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(230 132) rotate(45) scale(500)">
      <stop stop-color="${P.blue}" stop-opacity="0.22"/>
      <stop offset="1" stop-color="${P.blue}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="og-amber" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(628 170) rotate(45) scale(460)">
      <stop stop-color="${P.amber}" stop-opacity="0.18"/>
      <stop offset="1" stop-color="${P.amber}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="og-green" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(980 472) rotate(45) scale(480)">
      <stop stop-color="${P.green}" stop-opacity="0.2"/>
      <stop offset="1" stop-color="${P.green}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="${P.midnight}"/>
  <rect width="1200" height="630" fill="url(#og-blue)"/>
  <rect width="1200" height="630" fill="url(#og-amber)"/>
  <rect width="1200" height="630" fill="url(#og-green)"/>
  <g transform="translate(96 108) scale(1.28)">
    ${markGroup('og')}
  </g>
  <text x="92" y="508" fill="${P.white}" font-family="'Plus Jakarta Sans', 'Inter', 'Segoe UI', Arial, sans-serif" font-size="112" font-weight="800" letter-spacing="0">wasel</text>
  <text x="422" y="508" fill="${P.white}" font-family="'Noto Sans Arabic', 'Cairo', 'Tajawal', 'Segoe UI', Arial, sans-serif" font-size="112" font-weight="900" letter-spacing="0">واصل</text>
  <text x="94" y="568" fill="rgba(255,255,255,0.72)" font-family="'Plus Jakarta Sans', 'Inter', 'Segoe UI', Arial, sans-serif" font-size="34" font-weight="700" letter-spacing="0">Connected routes across Jordan</text>
</svg>`;
}

function previewSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1365 768" fill="none">
  <rect width="1365" height="768" fill="#FFFFFF"/>
  <g transform="translate(126 204)">
    ${logoSvg({ wordColor: P.ink, id: 'preview' })}
  </g>
  <g transform="translate(92 610)">
    <rect x="0" y="0" width="156" height="72" rx="16" fill="${P.midnight}"/>
    <rect x="188" y="0" width="156" height="72" rx="16" fill="${P.blue}"/>
    <rect x="376" y="0" width="156" height="72" rx="16" fill="${P.cyan}"/>
    <rect x="564" y="0" width="156" height="72" rx="16" fill="${P.amber}"/>
    <rect x="752" y="0" width="156" height="72" rx="16" fill="${P.orange}"/>
    <rect x="940" y="0" width="156" height="72" rx="16" fill="${P.green}"/>
    <rect x="1128" y="0" width="156" height="72" rx="16" fill="${P.mint}"/>
    <text x="0" y="112" fill="${P.ink}" font-family="'Plus Jakarta Sans', 'Inter', 'Segoe UI', Arial, sans-serif" font-size="28" font-weight="700">Midnight</text>
    <text x="188" y="112" fill="${P.ink}" font-family="'Plus Jakarta Sans', 'Inter', 'Segoe UI', Arial, sans-serif" font-size="28" font-weight="700">Route Blue</text>
    <text x="376" y="112" fill="${P.ink}" font-family="'Plus Jakarta Sans', 'Inter', 'Segoe UI', Arial, sans-serif" font-size="28" font-weight="700">Link Cyan</text>
    <text x="564" y="112" fill="${P.ink}" font-family="'Plus Jakarta Sans', 'Inter', 'Segoe UI', Arial, sans-serif" font-size="28" font-weight="700">Hub Amber</text>
    <text x="752" y="112" fill="${P.ink}" font-family="'Plus Jakarta Sans', 'Inter', 'Segoe UI', Arial, sans-serif" font-size="28" font-weight="700">Signal Orange</text>
    <text x="940" y="112" fill="${P.ink}" font-family="'Plus Jakarta Sans', 'Inter', 'Segoe UI', Arial, sans-serif" font-size="28" font-weight="700">Arrival Green</text>
    <text x="1128" y="112" fill="${P.ink}" font-family="'Plus Jakarta Sans', 'Inter', 'Segoe UI', Arial, sans-serif" font-size="28" font-weight="700">Mint</text>
  </g>
</svg>`;
}

async function renderSvg(svg, filePath, width, height) {
  const sizedSvg = /^<svg\b[^>]*\bwidth=/.test(svg)
    ? svg
    : svg.replace('<svg ', `<svg width="${width}" height="${height}" `);

  await sharp(Buffer.from(sizedSvg)).resize(width, height).png().toFile(filePath);
=======
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none" width="${size}" height="${size}">
  <defs>
    ${routeDefs('icon')}
    <radialGradient id="icon-glow-a" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(132 118) rotate(45) scale(260)">
      <stop stop-color="#1EA1FF" stop-opacity="0.42"/>
      <stop offset="1" stop-color="#1EA1FF" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="icon-glow-b" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(382 386) rotate(45) scale(260)">
      <stop stop-color="#38CE62" stop-opacity="0.34"/>
      <stop offset="1" stop-color="#38CE62" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="#040C18"/>
  <rect width="512" height="512" rx="112" fill="url(#icon-glow-a)"/>
  <rect width="512" height="512" rx="112" fill="url(#icon-glow-b)"/>
  <g transform="translate(${x} ${y}) scale(${scale})">
    ${routeMark({ id: 'icon' })}
  </g>
</svg>
`;
}

function previewSvg() {
  const scale = 1.08;
  const x = (1365 - FULL_WIDTH * scale) / 2;
  const y = (768 - FULL_HEIGHT * scale) / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1365 768" fill="none">
  <rect width="1365" height="768" fill="#FFFFFF"/>
  <g transform="translate(${x} ${y}) scale(${scale})">
    ${logoSvg({ wordColor: '#06133F', id: 'preview' })}
  </g>
</svg>
`;
}

async function renderSvg(page, svg, filePath, width, height, { omitBackground = true } = {}) {
  await page.setViewportSize({ width, height });
  await page.setContent(
    `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800&display=swap" rel="stylesheet" />
    <style>
      html, body { margin: 0; width: ${width}px; height: ${height}px; background: transparent; overflow: hidden; }
      #asset { width: ${width}px; height: ${height}px; }
      svg { display: block; width: 100%; height: 100%; }
    </style>
  </head>
  <body>
    <div id="asset">${svg}</div>
  </body>
</html>`,
    { waitUntil: 'networkidle' },
  );
  await page.evaluate(() => document.fonts?.ready);
  await page.locator('#asset').screenshot({ path: filePath, omitBackground });
>>>>>>> 3f91593102061af94f82b9db9416273735742bdf
}

async function writeIco(pngPaths, outputPath) {
  const images = await Promise.all(pngPaths.map((pngPath) => readFile(pngPath)));
  const headerSize = 6;
  const directorySize = 16 * images.length;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  let offset = headerSize + directorySize;
  const directories = images.map((image, index) => {
    const size = Number(path.basename(pngPaths[index]).match(/(\d+)x\1/)?.[1] ?? 0);
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(image.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += image.length;
    return entry;
  });

  await writeFile(outputPath, Buffer.concat([header, ...directories, ...images]));
}

<<<<<<< HEAD
async function renderIconSet() {
  for (const size of [16, 32, 180, 192, 512]) {
    const file =
      size === 180
        ? 'apple-touch-icon.png'
        : size === 192 || size === 512
          ? `icon-${size}.png`
          : `favicon-${size}x${size}.png`;
    await renderSvg(iconSvg(size), path.join(publicDir, file), size, size);
  }

  await writeIco(
    [path.join(publicDir, 'favicon-16x16.png'), path.join(publicDir, 'favicon-32x32.png')],
    path.join(publicDir, 'favicon.ico'),
  );
}

async function renderAppAssets() {
  const appTargets = [
    [path.join(srcAssetsDir, 'icon.png'), 192, 192, iconSvg(192)],
    [path.join(srcAssetsDir, 'adaptive-icon.png'), 192, 192, iconSvg(192)],
    [path.join(srcAssetsDir, 'favicon.png'), 192, 192, iconSvg(192)],
    [path.join(srcAssetsDir, 'notification-icon.png'), 192, 192, iconSvg(192)],
    [path.join(mobileAssetsDir, 'icon.png'), 192, 192, iconSvg(192)],
    [path.join(mobileAssetsDir, 'adaptive-icon.png'), 192, 192, iconSvg(192)],
    [path.join(mobileAssetsDir, 'favicon.png'), 192, 192, iconSvg(192)],
    [path.join(mobileAssetsDir, 'notification-icon.png'), 192, 192, iconSvg(192)],
  ];

  for (const [target, width, height, svg] of appTargets) {
    await renderSvg(svg, target, width, height);
  }

  const splash = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1284 2778" fill="none">
    <rect width="1284" height="2778" fill="${P.midnight}"/>
    <radialGradient id="splash-blue" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(286 812) scale(740)">
      <stop stop-color="${P.blue}" stop-opacity="0.24"/>
      <stop offset="1" stop-color="${P.blue}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="splash-green" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(978 1806) scale(760)">
      <stop stop-color="${P.green}" stop-opacity="0.18"/>
      <stop offset="1" stop-color="${P.green}" stop-opacity="0"/>
    </radialGradient>
    <rect width="1284" height="2778" fill="url(#splash-blue)"/>
    <rect width="1284" height="2778" fill="url(#splash-green)"/>
    <g transform="translate(202 1160) scale(0.78)">
      ${logoSvg({ wordColor: P.white, id: 'splashLogo' })}
    </g>
  </svg>`;

  await renderSvg(splash, path.join(srcAssetsDir, 'splash.png'), 1284, 2778);
  await renderSvg(splash, path.join(mobileAssetsDir, 'splash.png'), 1284, 2778);

  const androidTargets = [
    ['mipmap-xhdpi', 96],
    ['mipmap-xxhdpi', 144],
    ['mipmap-xxxhdpi', 192],
  ];
  for (const [bucket, size] of androidTargets) {
    const dir = path.join(androidResDir, bucket);
    await mkdir(dir, { recursive: true });
    for (const name of ['ic_launcher.png', 'ic_launcher_foreground.png', 'ic_launcher_round.png']) {
      await renderSvg(iconSvg(size), path.join(dir, name), size, size);
    }
  }
}

async function main() {
  await mkdir(brandDir, { recursive: true });
  await mkdir(artifactDir, { recursive: true });
  await mkdir(srcAssetsDir, { recursive: true });
  await mkdir(mobileAssetsDir, { recursive: true });

  const darkLogo = logoSvg({ wordColor: P.ink, id: 'logoDark' });
  const lightLogo = logoSvg({ wordColor: P.white, id: 'logoLight' });
=======
async function main() {
  await mkdir(brandDir, { recursive: true });
  await mkdir(artifactDir, { recursive: true });

  const darkLogo = logoSvg({ wordColor: '#06133F', id: 'logoDark' });
  const lightLogo = logoSvg({ wordColor: '#FFFFFF', id: 'logoLight' });
>>>>>>> 3f91593102061af94f82b9db9416273735742bdf
  const mark = markSvg();

  await writeFile(path.join(brandDir, 'wasel-logo.svg'), cleanSvg(darkLogo));
  await writeFile(path.join(brandDir, 'wasel-logo-light.svg'), cleanSvg(lightLogo));
  await writeFile(path.join(brandDir, 'wasel-mark.svg'), cleanSvg(mark));
  await writeFile(path.join(publicDir, 'favicon.svg'), cleanSvg(iconSvg()));

<<<<<<< HEAD
  for (const width of [64, 96, 160, 280, 512]) {
    const height = Math.round(width / FULL_RATIO);
    await renderSvg(lightLogo, path.join(brandDir, `wasellogo-${width}.png`), width, height);
  }

  await renderSvg(lightLogo, path.join(brandDir, 'wasel-logo-transparent.png'), FULL_WIDTH, FULL_HEIGHT);
  await renderSvg(darkLogo, path.join(brandDir, 'wasel-logo-dark.png'), FULL_WIDTH, FULL_HEIGHT);
  await renderSvg(mark, path.join(brandDir, 'wasel-w-mark.png'), 720, 300);
  await renderSvg(ogSvg(), path.join(brandDir, 'wasel-og-image.png'), 1200, 630);
  await renderSvg(previewSvg(), path.join(artifactDir, 'wasel-brand-system-preview.png'), 1365, 768);

  await renderIconSet();
  await renderAppAssets();
=======
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ deviceScaleFactor: 1 });

  for (const width of [64, 96, 160, 280, 512]) {
    const height = Math.round(width / FULL_RATIO);
    await renderSvg(page, lightLogo, path.join(brandDir, `wasellogo-${width}.png`), width, height);
  }

  await renderSvg(page, lightLogo, path.join(brandDir, 'wasel-logo-transparent.png'), FULL_WIDTH, FULL_HEIGHT);
  await renderSvg(page, darkLogo, path.join(brandDir, 'wasel-logo-dark.png'), FULL_WIDTH, FULL_HEIGHT);
  await renderSvg(page, mark, path.join(brandDir, 'wasel-w-mark.png'), 400, 316);
  await renderSvg(page, previewSvg(), path.join(artifactDir, 'wasel-logo-v2-preview.png'), 1365, 768, {
    omitBackground: false,
  });

  for (const size of [16, 32, 180, 192, 512]) {
    const file =
      size === 180
        ? 'apple-touch-icon.png'
        : size === 192 || size === 512
          ? `icon-${size}.png`
          : `favicon-${size}x${size}.png`;
    await renderSvg(page, iconSvg(size), path.join(publicDir, file), size, size, {
      omitBackground: false,
    });
  }

  await browser.close();

  await writeIco(
    [path.join(publicDir, 'favicon-16x16.png'), path.join(publicDir, 'favicon-32x32.png')],
    path.join(publicDir, 'favicon.ico'),
  );
>>>>>>> 3f91593102061af94f82b9db9416273735742bdf
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
