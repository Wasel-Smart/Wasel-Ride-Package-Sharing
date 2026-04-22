import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const BRAND_VERSION = '20260422-premium';
const SYMBOL_VIEWBOX = '0 0 392 288';

const renders = [
  { output: 'public/favicon-16x16.png', size: 16 },
  { output: 'public/favicon-32x32.png', size: 32 },
  { output: 'public/apple-touch-icon.png', size: 180 },
  { output: 'public/icon-192.png', size: 192 },
  { output: 'public/icon-512.png', size: 512 },
  { output: 'public/brand/wasellogo-64.png', size: 64 },
  { output: 'public/brand/wasellogo-96.png', size: 96 },
  { output: 'public/brand/wasellogo-160.png', size: 160 },
  { output: 'public/brand/wasellogo-280.png', size: 280 },
  { output: 'public/brand/wasellogo-512.png', size: 512 },
  { output: 'src/assets/wasellogo.png', size: 512 },
];

function buildBrandSymbolInner() {
  return `
  <g fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path
      d="M84 86C97 129 112 188 142 242C148 253 159 256 166 245L196 145L226 245C233 256 244 253 250 242C280 188 295 129 308 86"
      stroke="#E59C36"
      stroke-width="30"
    />
    <path
      d="M84 86C97 129 112 188 142 242C148 253 159 256 166 245L196 145L226 245C233 256 244 253 250 242C280 188 295 129 308 86"
      stroke="#FFD39A"
      stroke-opacity="0.72"
      stroke-width="10"
    />
    <path d="M76 64L84 86M196 108L196 130M316 64L308 86" stroke="#28323D" stroke-width="7" />
  </g>

  <g transform="translate(76 52)">
    <circle r="12.5" fill="#28323D" />
    <circle r="7.7" fill="#FFF7EA" />
    <circle r="2.6" fill="#E59C36" />
  </g>

  <g transform="translate(196 96)">
    <circle r="15.5" fill="#28323D" />
    <circle r="9.6" fill="#FFF7EA" />
    <circle r="4.2" fill="#E59C36" />
  </g>

  <g transform="translate(316 52)">
    <circle r="12.5" fill="#28323D" />
    <circle r="7.7" fill="#FFF7EA" />
    <circle r="2.6" fill="#E59C36" />
  </g>`;
}

function buildMonochromeSymbolInner() {
  return `
  <g fill="none" stroke="#17212B" stroke-linecap="round" stroke-linejoin="round">
    <path
      d="M84 86C97 129 112 188 142 242C148 253 159 256 166 245L196 145L226 245C233 256 244 253 250 242C280 188 295 129 308 86"
      stroke-width="30"
    />
    <path d="M76 64L84 86M196 108L196 130M316 64L308 86" stroke-width="7" />
    <circle cx="76" cy="52" r="12.5" stroke-width="6" />
    <circle cx="196" cy="96" r="15.5" stroke-width="6" />
    <circle cx="316" cy="52" r="12.5" stroke-width="6" />
  </g>`;
}

function buildSymbolSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SYMBOL_VIEWBOX}" fill="none" role="img" aria-labelledby="title desc" preserveAspectRatio="xMidYMid meet">
  <title id="title">Wasel route W symbol</title>
  <desc id="desc">A flat premium W mark with a hub node, two endpoint nodes, and warm amber route strokes.</desc>
  ${buildBrandSymbolInner()}
</svg>`;
}

function buildMonochromeSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SYMBOL_VIEWBOX}" fill="none" role="img" aria-labelledby="title desc" preserveAspectRatio="xMidYMid meet">
  <title id="title">Wasel monochrome symbol</title>
  <desc id="desc">A one-color version of the Wasel route W mark for print, embossing, and low-fidelity reproduction.</desc>
  ${buildMonochromeSymbolInner()}
</svg>`;
}

function buildBadgeSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none" role="img" aria-labelledby="title desc">
  <title id="title">Wasel app badge</title>
  <desc id="desc">A graphite app badge built from the Wasel route W symbol.</desc>
  <rect x="52" y="52" width="408" height="408" rx="112" fill="#10161D" />
  <rect x="52" y="52" width="408" height="408" rx="112" stroke="#F8E5C1" stroke-opacity="0.2" stroke-width="8" />
  <rect x="63" y="63" width="386" height="386" rx="101" stroke="#FFFFFF" stroke-opacity="0.06" stroke-width="2" />
  <g transform="translate(96 138) scale(0.82)">
    ${buildBrandSymbolInner()}
  </g>
</svg>`;
}

function buildPrimaryLockupSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 920 240" fill="none" role="img" aria-labelledby="title desc">
  <title id="title">Wasel primary lockup</title>
  <desc id="desc">The primary Wasel lockup pairing the route W symbol with a custom-led wordmark.</desc>
  <g transform="translate(6 14) scale(0.72)">
    ${buildBrandSymbolInner()}
  </g>
  <g fill="none" stroke="#17212B" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" transform="translate(342 66)">
    <path d="M10 11C14 24 19 46 28 58C32 63 38 61 42 52L48 30L54 52C58 61 64 63 68 58C77 46 82 24 86 11" />
  </g>
  <text
    x="418"
    y="126"
    fill="#17212B"
    font-family="'Montserrat','Segoe UI',sans-serif"
    font-size="88"
    font-weight="800"
    letter-spacing="-5"
  >
    asel
  </text>
</svg>`;
}

function buildMarkup(svgMarkup, size) {
  return `<!doctype html>
  <html>
    <body style="margin:0;display:grid;place-items:center;width:${size}px;height:${size}px;overflow:hidden;background:transparent">
      <div style="width:${size}px;height:${size}px;display:grid;place-items:center">
        ${svgMarkup}
      </div>
    </body>
  </html>`;
}

function buildOgSocialCardMarkup(lockupSvg) {
  return `<!doctype html>
  <html>
    <body style="margin:0;width:1200px;height:630px;overflow:hidden;background:#F7F0E6;display:grid;place-items:center;font-family:'Montserrat','Segoe UI',sans-serif">
      <div style="position:relative;width:100%;height:100%;display:grid;place-items:center;background:
        radial-gradient(circle at 16% 20%, rgba(229,156,54,0.14), transparent 26%),
        radial-gradient(circle at 82% 18%, rgba(23,33,43,0.08), transparent 20%),
        linear-gradient(180deg, rgba(255,255,255,0.45), rgba(255,255,255,0));">
        <div style="display:grid;gap:20px;place-items:center">
          <div style="width:720px;height:auto">
            ${lockupSvg}
          </div>
          <div style="color:#6F6659;font-size:20px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase">
            Live mobility network
          </div>
        </div>
      </div>
    </body>
  </html>`;
}

async function writeOutputs() {
  const symbolSvg = buildSymbolSvg();
  const lockupSvg = buildPrimaryLockupSvg();
  const badgeSvg = buildBadgeSvg();
  const monochromeSvg = buildMonochromeSvg();

  await fs.writeFile(path.join(root, 'public/brand/wasel-route-w-symbol.svg'), symbolSvg);
  await fs.writeFile(path.join(root, 'public/brand/wasel-mark-clean.svg'), symbolSvg);
  await fs.writeFile(path.join(root, 'public/brand/wasel-mark.svg'), symbolSvg);
  await fs.writeFile(path.join(root, 'public/brand/wasel-mark-clean-dark.svg'), symbolSvg);
  await fs.writeFile(path.join(root, 'public/brand/wasel-mark-clean-light.svg'), symbolSvg);
  await fs.writeFile(path.join(root, 'public/brand/wasel-main-network-logo.svg'), lockupSvg);
  await fs.writeFile(path.join(root, 'public/brand/wasel-mark-monochrome.svg'), monochromeSvg);
  await fs.writeFile(path.join(root, 'public/brand/wasel-route-w-badge.svg'), badgeSvg);
  await fs.writeFile(path.join(root, 'public/favicon.svg'), badgeSvg);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  for (const render of renders) {
    const outputPath = path.join(root, render.output);
    await page.setViewportSize({ width: render.size, height: render.size });
    await page.setContent(buildMarkup(badgeSvg, render.size));
    await page.screenshot({
      path: outputPath,
      omitBackground: true,
    });
  }

  await page.setViewportSize({ width: 1200, height: 630 });
  await page.setContent(buildOgSocialCardMarkup(lockupSvg));
  await page.screenshot({
    path: path.join(root, 'public/brand/og-social-card.png'),
  });

  await browser.close();
}

await writeOutputs();

console.log(`Generated Wasel premium brand assets (${BRAND_VERSION}).`);
