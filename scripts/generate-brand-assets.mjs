import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();

const renders = [
  { output: 'public/favicon-16x16.png', size: 16, mode: 'tile' },
  { output: 'public/favicon-32x32.png', size: 32, mode: 'tile' },
  { output: 'public/apple-touch-icon.png', size: 180, mode: 'tile' },
  { output: 'public/icon-192.png', size: 192, mode: 'tile' },
  { output: 'public/icon-512.png', size: 512, mode: 'tile' },
  { output: 'public/brand/wasellogo-64.png', size: 64, mode: 'tile' },
  { output: 'public/brand/wasellogo-96.png', size: 96, mode: 'tile' },
  { output: 'public/brand/wasellogo-160.png', size: 160, mode: 'tile' },
  { output: 'public/brand/wasellogo-280.png', size: 280, mode: 'tile' },
  { output: 'public/brand/wasellogo-512.png', size: 512, mode: 'tile' },
  { output: 'src/assets/wasellogo.png', size: 512, mode: 'tile' },
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const cleanSvgMarkup = await fs.readFile(path.join(root, 'public/brand/wasel-mark-clean.svg'), 'utf8');

function buildMarkup(mode, size) {
  const logoScale = mode === 'tile' ? 0.82 : 1;
  const tileRadius = Math.round(size * 0.15);
  const glowBlur = Math.max(18, Math.round(size * 0.1));
  const borderWidth = Math.max(1, Math.round(size * 0.004));
  const floorShadowWidth = Math.round(size * 0.44);
  const floorShadowHeight = Math.max(6, Math.round(size * 0.04));

  return `<!doctype html>
  <html>
    <body style="margin:0;display:grid;place-items:center;width:${size}px;height:${size}px;overflow:hidden;background:transparent">
      <div
        id="brand-image"
        style="
          position:relative;
          width:${size}px;
          height:${size}px;
          overflow:hidden;
          border-radius:${tileRadius}px;
          background:linear-gradient(180deg, #ffffff 0%, #eef3f8 100%);
          border:${borderWidth}px solid #dce5ee;
          box-sizing:border-box;
          box-shadow:0 ${Math.round(size * 0.035)}px ${Math.round(size * 0.08)}px rgba(89, 117, 147, 0.18);
        "
      >
        <div style="
          position:absolute;
          left:50%;
          bottom:${Math.round(size * 0.14)}px;
          width:${floorShadowWidth}px;
          height:${floorShadowHeight}px;
          transform:translateX(-50%);
          border-radius:999px;
          background:rgba(197, 210, 222, 0.72);
          filter:blur(${Math.max(6, Math.round(size * 0.012))}px);
        "></div>
        <div style="position:absolute;inset:0;background:
          radial-gradient(circle at 34% 45%, rgba(105,202,233,0.22), transparent 36%),
          radial-gradient(circle at 68% 46%, rgba(169,215,20,0.18), transparent 28%);
          filter:blur(${glowBlur}px);"></div>
        <div style="position:absolute;inset:0;display:grid;place-items:center;transform:scale(${logoScale});">
          ${cleanSvgMarkup}
        </div>
      </div>
    </body>
  </html>`;
}

for (const render of renders) {
  const outputPath = path.join(root, render.output);

  await page.setViewportSize({ width: render.size, height: render.size });
  await page.setContent(buildMarkup(render.mode, render.size));

  await page.screenshot({
    path: outputPath,
    omitBackground: true,
  });
}

await browser.close();
