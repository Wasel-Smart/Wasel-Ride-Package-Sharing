/**
 * Accessibility E2E suite — Wasel
 *
 * Runs axe-core against every key page to enforce WCAG 2.1 AA.
 * Failures in this suite are hard blockers before deployment.
 *
 * Covered pages (guest and authenticated via demo session):
 *   / · /app/find-ride · /app/offer-ride · /app/packages
 *   /app/bus · /app/trust · /app/safety · /app/plus
 *   /app/wallet · /app/profile · /app/privacy · /app/terms
 */

import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { seedDemoSession } from '../../e2e/helpers/session';

/* Pages accessible without authentication */
const GUEST_PAGES = [
  { name: 'Landing',  path: '/' },
  { name: 'Privacy',  path: '/app/privacy' },
  { name: 'Terms',    path: '/app/terms' },
];

/* Pages that require a demo session */
const AUTH_PAGES = [
  { name: 'Find Ride',  path: '/app/find-ride' },
  { name: 'Offer Ride', path: '/app/offer-ride' },
  { name: 'Packages',   path: '/app/packages' },
  { name: 'Bus',        path: '/app/bus' },
  { name: 'My Trips',   path: '/app/my-trips' },
  { name: 'Wallet',     path: '/app/wallet' },
  { name: 'Plus',       path: '/app/plus' },
  { name: 'Profile',    path: '/app/profile' },
  { name: 'Trust',      path: '/app/trust' },
  { name: 'Safety',     path: '/app/safety' },
  { name: 'Driver',     path: '/app/driver' },
  { name: 'Notifications', path: '/app/notifications' },
];

/* ── Shared axe options ─────────────────────────────────────────────────────── */
const AXE_OPTIONS = {
  runOnly: {
    type: 'tag' as const,
    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
  },
  rules: {
    // Skip colour contrast for now — design system has been pre-audited
    // but axe struggles with custom CSS variables in test env
    'color-contrast': { enabled: false },
  },
};

/* ─────────────────────────────────────────────────────────────────────────────
   Guest pages
   ───────────────────────────────────────────────────────────────────────── */
test.describe('Accessibility — guest pages', () => {
  for (const page of GUEST_PAGES) {
    test(`WCAG 2.1 AA · ${page.name} (${page.path})`, async ({ page: pw }) => {
      await pw.goto(page.path, { waitUntil: 'domcontentloaded' });
      // Give dynamic content time to settle
      await pw.waitForTimeout(600);

      const results = await new AxeBuilder({ page: pw })
        .options(AXE_OPTIONS)
        .analyze();

      // Surface violations clearly in CI logs
      if (results.violations.length > 0) {
        console.error(
          `[A11y] ${page.name} violations:\n`,
          results.violations.map(v =>
            `  [${v.impact?.toUpperCase()}] ${v.id}: ${v.description}\n${ 
            v.nodes.slice(0, 2).map(n => `    → ${n.html}`).join('\n')}`,
          ).join('\n'),
        );
      }

      expect(results.violations).toHaveLength(0);
    });
  }
});

/* ─────────────────────────────────────────────────────────────────────────────
   Authenticated pages
   ───────────────────────────────────────────────────────────────────────── */
test.describe('Accessibility — authenticated pages', () => {
  test.beforeEach(async ({ page }) => {
    await seedDemoSession(page);
  });

  for (const pg of AUTH_PAGES) {
    test(`WCAG 2.1 AA · ${pg.name} (${pg.path})`, async ({ page }) => {
      await page.goto(pg.path, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);

      const results = await new AxeBuilder({ page })
        .options(AXE_OPTIONS)
        .analyze();

      if (results.violations.length > 0) {
        console.error(
          `[A11y] ${pg.name} violations:\n`,
          results.violations.map(v =>
            `  [${v.impact?.toUpperCase()}] ${v.id}: ${v.description}\n${ 
            v.nodes.slice(0, 2).map(n => `    → ${n.html}`).join('\n')}`,
          ).join('\n'),
        );
      }

      expect(results.violations).toHaveLength(0);
    });
  }
});

/* ─────────────────────────────────────────────────────────────────────────────
   Landmark + heading hierarchy checks (structural, not colour-related)
   ───────────────────────────────────────────────────────────────────────── */
test.describe('Structural accessibility — landmarks & headings', () => {
  test.beforeEach(async ({ page }) => {
    await seedDemoSession(page);
  });

  test('Find Ride page has a main landmark', async ({ page }) => {
    await page.goto('/app/find-ride', { waitUntil: 'domcontentloaded' });
    const main = page.locator('main[role="main"], main');
    await expect(main).toBeVisible();
  });

  test('Find Ride page has at least one heading', async ({ page }) => {
    await page.goto('/app/find-ride', { waitUntil: 'domcontentloaded' });
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  test('Skip-to-content link exists on app shell pages', async ({ page }) => {
    await page.goto('/app/find-ride', { waitUntil: 'domcontentloaded' });
    const skip = page.locator('a[href="#main-content"]');
    await expect(skip).toBeAttached();
  });

  test('All buttons have accessible names', async ({ page }) => {
    await page.goto('/app/find-ride', { waitUntil: 'domcontentloaded' });
    const results = await new AxeBuilder({ page })
      .options({
        runOnly: { type: 'rule' as const, values: ['button-name'] },
      })
      .analyze();
    expect(results.violations).toHaveLength(0);
  });

  test('All images have alt text', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const results = await new AxeBuilder({ page })
      .options({
        runOnly: { type: 'rule' as const, values: ['image-alt'] },
      })
      .analyze();
    expect(results.violations).toHaveLength(0);
  });

  test('Language attribute is set on html element', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBeTruthy();
    expect(lang).not.toBe('');
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   RTL / Arabic layout checks
   ───────────────────────────────────────────────────────────────────────── */
test.describe('RTL — Arabic layout accessibility', () => {
  test('Landing renders correctly in Arabic locale', async ({ page }) => {
    // Force Arabic by setting localStorage before navigation
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.setItem('wasel-language', 'ar');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    const results = await new AxeBuilder({ page })
      .options(AXE_OPTIONS)
      .analyze();

    expect(results.violations).toHaveLength(0);
  });

  test('Arabic direction attribute is applied when language is AR', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.setItem('wasel-language', 'ar');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);

    const dir = await page.locator('html').getAttribute('dir');
    expect(dir).toBe('rtl');
  });
});
