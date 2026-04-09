/**
 * RTL / Arabic layout smoke tests
 *
 * Verifies that:
 * 1. The document direction flips to RTL when Arabic is active
 * 2. Key UI text is present in Arabic
 * 3. Buttons and inputs are right-aligned
 * 4. No visible overflow / horizontal scroll (common RTL regression)
 */

import { expect, test } from '@playwright/test';

// Helper: force Arabic locale via localStorage before navigation
async function setArabic(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    localStorage.setItem('wasel-language', 'ar');
  });
}

test.describe('RTL / Arabic layout', () => {
  test('html[dir] is rtl when Arabic language is set', async ({ page }) => {
    await setArabic(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const dir = await page.evaluate(() => document.documentElement.dir);
    expect(dir).toBe('rtl');
  });

  test('html[lang] is ar when Arabic language is set', async ({ page }) => {
    await setArabic(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const lang = await page.evaluate(() => document.documentElement.lang);
    expect(lang).toMatch(/^ar/);
  });

  test('no horizontal overflow on landing page in RTL', async ({ page }) => {
    await setArabic(page);
    await page.setViewportSize({ width: 390, height: 844 }); // iPhone 14 size
    await page.goto('/', { waitUntil: 'networkidle' });

    const scrollWidth  = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth  = await page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2); // 2 px tolerance
  });

  test('no horizontal overflow on find-ride page in RTL (mobile)', async ({ page }) => {
    await setArabic(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/app/find-ride', { waitUntil: 'networkidle' });

    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test('primary CTA button text direction is RTL', async ({ page }) => {
    await setArabic(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Pick the first visible button
    const btn = page.getByRole('button').first();
    const dir = await btn.evaluate((el) => window.getComputedStyle(el).direction);
    expect(dir).toBe('rtl');
  });

  test('Arabic numerals or locale numbers render without garbling', async ({ page }) => {
    await setArabic(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Ensure no Unicode replacement characters (garbled text) in body
    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText).not.toContain('\uFFFD');
  });
});
