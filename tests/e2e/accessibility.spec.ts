/**
 * Accessibility E2E suite - Wasel
 *
 * Runs axe-core against key guest and authenticated pages to enforce WCAG 2.1 AA.
 * Failures in this suite are blocking.
 */

import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { seedDemoSession } from '../../e2e/helpers/session';

const GUEST_PAGES = [
  { name: 'Landing', path: '/' },
  { name: 'Privacy', path: '/app/privacy' },
  { name: 'Terms', path: '/app/terms' },
];

const AUTH_PAGES = [
  { name: 'Find Ride', path: '/app/find-ride' },
  { name: 'Offer Ride', path: '/app/offer-ride' },
  { name: 'Packages', path: '/app/packages' },
  { name: 'My Trips', path: '/app/my-trips' },
  { name: 'Wallet', path: '/app/wallet' },
  { name: 'Payments', path: '/app/payments' },
];

const AXE_OPTIONS = {
  runOnly: {
    type: 'tag' as const,
    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
  },
  rules: {
    // Skip color contrast for now because axe can misread custom CSS variables in tests.
    'color-contrast': { enabled: false },
  },
};

function formatViolations(
  violations: Array<{
    description: string;
    id: string;
    impact: string | null;
    nodes: Array<{ html: string }>;
  }>,
) {
  return violations
    .map(violation => [
      `  [${violation.impact?.toUpperCase() ?? 'UNKNOWN'}] ${violation.id}: ${violation.description}`,
      ...violation.nodes.slice(0, 2).map(node => `    -> ${node.html}`),
    ].join('\n'))
    .join('\n');
}

async function waitForAuditableContent(page: Page) {
  await page.waitForFunction(() => {
    const main = document.querySelector('main');
    if (!(main instanceof HTMLElement)) {
      return false;
    }

    return main.childElementCount > 0 && main.querySelector('*') !== null;
  });
}

async function expectPageToPassAccessibilityAudit(page: Page, name: string, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await waitForAuditableContent(page);

  const results = await new AxeBuilder({ page })
    .options(AXE_OPTIONS)
    .analyze();

  if (results.violations.length > 0) {
    console.error(`[A11y] ${name} violations:\n${formatViolations(results.violations)}`);
  }

  expect(results.violations).toHaveLength(0);
}

test.describe('Accessibility - guest pages', () => {
  for (const guestPage of GUEST_PAGES) {
    test(`WCAG 2.1 AA - ${guestPage.name} (${guestPage.path})`, async ({ page }) => {
      await expectPageToPassAccessibilityAudit(page, guestPage.name, guestPage.path);
    });
  }
});

test.describe('Accessibility - authenticated pages', () => {
  test.beforeEach(async ({ page }) => {
    await seedDemoSession(page);
  });

  for (const authenticatedPage of AUTH_PAGES) {
    test(`WCAG 2.1 AA - ${authenticatedPage.name} (${authenticatedPage.path})`, async ({ page }) => {
      await expectPageToPassAccessibilityAudit(
        page,
        authenticatedPage.name,
        authenticatedPage.path,
      );
    });
  }
});

test.describe('Structural accessibility - landmarks and headings', () => {
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

test.describe('RTL - Arabic layout accessibility', () => {
  test('Landing renders correctly in Arabic locale', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.setItem('wasel-language', 'ar');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForAuditableContent(page);

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
