import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();

const renders = [
  { output: 'public/favicon-16x16.png', size: 16, mode: 'mark' },
  { output: 'public/favicon-32x32.png', size: 32, mode: 'mark' },
  { output: 'public/apple-touch-icon.png', size: 180, mode: 'mark' },
  { output: 'public/icon-192.png', size: 192, mode: 'mark' },
  { output: 'public/icon-512.png', size: 512, mode: 'mark' },
  { output: 'public/brand/wasellogo-64.png', size: 64, mode: 'mark' },
  { output: 'public/brand/wasellogo-96.png', size: 96, mode: 'mark' },
  { output: 'public/brand/wasellogo-160.png', size: 160, mode: 'mark' },
  { output: 'public/brand/wasellogo-280.png', size: 280, mode: 'mark' },
  { output: 'public/brand/wasellogo-512.png', size: 512, mode: 'mark' },
  { output: 'src/assets/wasellogo.png', size: 512, mode: 'mark' },
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const cleanSvgMarkup = await fs.readFile(path.join(root, 'public/brand/wasel-mark-clean.svg'), 'utf8');
const nestedLogoSvg = ({
  x,
  y,
  width,
  height,
}) =>
  cleanSvgMarkup.replace(
    '<svg',
    `<svg x="${x}" y="${y}" width="${width}" height="${height}"`,
  );

function buildSvgVariants() {
  const nested = nestedLogoSvg({ x: 42, y: 92, width: 428, height: 332 });
  const plain512 = nestedLogoSvg({ x: 50, y: 90, width: 412, height: 320 });

  return {
    brandTile: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none" role="img" aria-labelledby="title desc">
  <title id="title">Wasel primary logo</title>
  <desc id="desc">The standalone Wasel W mark on a transparent background.</desc>
  ${plain512}
</svg>`,
    darkTile: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none" role="img" aria-labelledby="title desc">
  <title id="title">Wasel logo</title>
  <desc id="desc">The standalone Wasel W mark on a transparent background.</desc>
  ${plain512}
</svg>`,
    lightTile: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none" role="img" aria-labelledby="title desc">
  <title id="title">Wasel logo</title>
  <desc id="desc">The standalone Wasel W mark on a transparent background.</desc>
  ${plain512}
</svg>`,
    favicon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  ${plain512}
</svg>`,
  };
}

function buildMarkup(mode, size) {
  const logoScale = mode === 'mark' ? 0.82 : 1;

  return `<!doctype html>
  <html>
    <body style="margin:0;display:grid;place-items:center;width:${size}px;height:${size}px;overflow:hidden;background:transparent">
      <div id="brand-image" style="display:grid;place-items:center;width:${size}px;height:${size}px;transform:scale(${logoScale});">
        ${cleanSvgMarkup}
      </div>
    </body>
  </html>`;
}

function buildOgSocialCardMarkup() {
  return `<!doctype html>
  <html>
    <body style="margin:0;width:1200px;height:630px;overflow:hidden;background:transparent;display:grid;place-items:center">
      <div style="width:520px;height:404px;display:grid;place-items:center;">
        ${cleanSvgMarkup}
      </div>
    </body>
  </html>`;
}

const svgVariants = buildSvgVariants();
await fs.writeFile(path.join(root, 'public/brand/wasel-mark.svg'), svgVariants.brandTile);
await fs.writeFile(path.join(root, 'public/brand/wasel-mark-clean-dark.svg'), svgVariants.darkTile);
await fs.writeFile(path.join(root, 'public/brand/wasel-mark-clean-light.svg'), svgVariants.lightTile);
await fs.writeFile(path.join(root, 'public/favicon.svg'), svgVariants.favicon);

for (const render of renders) {
  const outputPath = path.join(root, render.output);

  await page.setViewportSize({ width: render.size, height: render.size });
  await page.setContent(buildMarkup(render.mode, render.size));

  await page.screenshot({
    path: outputPath,
    omitBackground: true,
  });
}

await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(buildOgSocialCardMarkup());
await page.screenshot({
  path: path.join(root, 'public/brand/og-social-card.png'),
});

await browser.close();
