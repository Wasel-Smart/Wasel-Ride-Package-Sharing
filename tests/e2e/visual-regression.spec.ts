import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 812 },
];

const PAGES = [
  { name: 'home', url: '/', waitFor: '[data-testid="home-page"]' },
  { name: 'find-ride', url: '/find-ride', waitFor: '[data-testid="find-ride-page"]' },
  { name: 'offer-ride', url: '/offer-ride', waitFor: '[data-testid="offer-ride-page"]' },
  { name: 'wallet', url: '/wallet', waitFor: '[data-testid="wallet-page"]' },
  { name: 'trips', url: '/trips', waitFor: '[data-testid="trips-page"]' },
  { name: 'auth', url: '/auth', waitFor: '[data-testid="auth-page"]' },
];

for (const page of PAGES) {
  for (const viewport of VIEWPORTS) {
    test.describe(`Visual Regression: ${page.name} @${viewport.name}`, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } });

      test('matches baseline screenshot', async ({ page: p }) => {
        await p.goto(page.url);
        await p.waitForSelector(page.waitFor, { timeout: 30_000 });
        await p.waitForTimeout(500);
        await expect(p).toHaveScreenshot(`${page.name}-${viewport.name}.png`, {
          fullPage: true,
          maxDiffPixelRatio: 0.02,
        });
      });
    });
  }
}
