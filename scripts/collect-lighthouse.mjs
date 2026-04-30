#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { URL } from 'node:url';
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, 'dist');
const OUTPUT_DIR = path.join(ROOT, '.lighthouseci');
const CONFIG_PATH = path.join(ROOT, 'src', 'lighthouserc.json');

const MIME_TYPES = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

function readConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function ensureDir(directoryPath) {
  fs.rmSync(directoryPath, { recursive: true, force: true });
  fs.mkdirSync(directoryPath, { recursive: true });
}

function toOutputSlug(routePath, runIndex) {
  const normalizedRoute = routePath === '/' ? 'index' : routePath.replace(/^\/+/, '');
  const slug = normalizedRoute.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'index';
  return `lhr-${slug}-run-${runIndex + 1}.json`;
}

function resolveStaticFile(routePath) {
  const cleanPath = routePath.split('?')[0];
  const relativePath = cleanPath === '/' ? 'index.html' : cleanPath.replace(/^\/+/, '');
  const directPath = path.join(DIST_DIR, relativePath);

  if (fs.existsSync(directPath) && fs.statSync(directPath).isFile()) {
    return directPath;
  }

  const htmlPath = `${directPath}.html`;
  if (fs.existsSync(htmlPath) && fs.statSync(htmlPath).isFile()) {
    return htmlPath;
  }

  return path.join(DIST_DIR, 'index.html');
}

function getSummary(lhr) {
  return {
    performance: lhr.categories?.performance?.score ?? null,
    accessibility: lhr.categories?.accessibility?.score ?? null,
    bestPractices: lhr.categories?.['best-practices']?.score ?? null,
    seo: lhr.categories?.seo?.score ?? null,
    pwa: lhr.categories?.pwa?.score ?? null,
  };
}

function createStaticServer() {
  return http.createServer((request, response) => {
    try {
      const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');
      const filePath = resolveStaticFile(requestUrl.pathname);
      const extension = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES.get(extension) ?? 'application/octet-stream';
      const body = fs.readFileSync(filePath);

      response.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
      });
      response.end(body);
    } catch {
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Internal Server Error');
    }
  });
}

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to determine Lighthouse server port.');
  }

  return address.port;
}

async function main() {
  if (!fs.existsSync(DIST_DIR)) {
    throw new Error('dist/ is missing. Run npm run build before collecting Lighthouse results.');
  }

  const config = readConfig();
  const collectConfig = config?.ci?.collect ?? {};
  const routePaths = Array.isArray(collectConfig.url)
    ? collectConfig.url.map((rawUrl) => new URL(rawUrl).pathname || '/')
    : ['/'];
  const numberOfRuns = Math.max(1, Number(collectConfig.numberOfRuns) || 1);
  const chromeFlags = String(collectConfig.settings?.chromeFlags ?? '--no-sandbox --disable-gpu')
    .split(/\s+/)
    .filter(Boolean);

  ensureDir(OUTPUT_DIR);

  const server = createStaticServer();
  const port = await listen(server);
  const chrome = await launch({
    chromeFlags: ['--headless=new', ...chromeFlags],
  });

  const manifest = [];

  try {
    for (const routePath of routePaths) {
      console.log(`Collecting Lighthouse for ${routePath}...`);
      let representativeLhr = null;

      for (let runIndex = 0; runIndex < numberOfRuns; runIndex += 1) {
        const targetUrl = `http://127.0.0.1:${port}${routePath}`;
        const runnerResult = await lighthouse(targetUrl, {
          port: chrome.port,
          logLevel: 'error',
          output: 'json',
        });

        if (!runnerResult?.lhr) {
          throw new Error(`Lighthouse did not return a report for ${targetUrl}`);
        }

        representativeLhr = runnerResult.lhr;
        const reportFile = toOutputSlug(routePath, runIndex);
        fs.writeFileSync(
          path.join(OUTPUT_DIR, reportFile),
          JSON.stringify(runnerResult.lhr, null, 2),
        );
      }

      manifest.push({
        url: `http://127.0.0.1:${port}${routePath}`,
        isRepresentativeRun: true,
        summary: representativeLhr ? getSummary(representativeLhr) : null,
      });
    }
  } finally {
    await chrome.kill().catch(() => undefined);
    await new Promise((resolve) => server.close(() => resolve()));
  }

  fs.writeFileSync(path.join(OUTPUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Lighthouse reports written to ${path.relative(ROOT, OUTPUT_DIR)}`);
}

try {
  await main();
  process.exit(0);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
