import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const brandDir = path.join(root, 'public', 'brand');
const publicDir = path.join(root, 'public');
const artifactDir = path.join(root, 'artifacts', 'brand');

const FULL_WIDTH = 1005;
const FULL_HEIGHT = 316;
const FULL_RATIO = FULL_WIDTH / FULL_HEIGHT;

const MARK_VIEWBOX_WIDTH = 500;
const MARK_VIEWBOX_HEIGHT = 260;
const ROUTE_PATH =
  'M44 76C78 136 91 232 149 232C191 232 202 164 225 111C239 80 263 80 277 111C300 164 311 232 353 232C411 232 424 136 458 76';

function cleanSvg(svg) {
  return `${svg.replace(/[ \t]+$/gm, '').trimEnd()}\n`;
}

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
  const markWidth = MARK_VIEWBOX_WIDTH * scale;
  const markHeight = MARK_VIEWBOX_HEIGHT * scale;
  const x = (512 - markWidth) / 2;
  const y = (512 - markHeight) / 2 + 8;

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

async function main() {
  await mkdir(brandDir, { recursive: true });
  await mkdir(artifactDir, { recursive: true });

  const darkLogo = logoSvg({ wordColor: '#06133F', id: 'logoDark' });
  const lightLogo = logoSvg({ wordColor: '#FFFFFF', id: 'logoLight' });
  const mark = markSvg();

  await writeFile(path.join(brandDir, 'wasel-logo.svg'), cleanSvg(darkLogo));
  await writeFile(path.join(brandDir, 'wasel-logo-light.svg'), cleanSvg(lightLogo));
  await writeFile(path.join(brandDir, 'wasel-mark.svg'), cleanSvg(mark));
  await writeFile(path.join(publicDir, 'favicon.svg'), cleanSvg(iconSvg()));

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
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
