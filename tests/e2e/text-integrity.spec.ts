import { expect, test, type Page } from '@playwright/test';
import { seedDemoSession } from '../../e2e/helpers/session';

const suspiciousTextPattern =
  /Ãƒ|Ã‚Â·|Ã¢â‚¬Â¢|Ã°Å¸|Ã˜Â§Ã™|Ã™â€¦Ã˜|Ã¢â€ â€™|Ã¢â‚¬â€|Ã¢â€â‚¬/u;

async function setArabic(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('wasel-language', 'ar');
  });
}

async function gotoAuthedSurface(page: Page, route: string) {
  await seedDemoSession(page);
  await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(1_000);
}

async function expectNoVisibleMojibake(page: Page) {
  const bodyText = await page.evaluate(() => document.body.innerText);
  expect(bodyText).not.toContain('\uFFFD');
  expect(bodyText).not.toMatch(suspiciousTextPattern);
}

test.describe('Text integrity', () => {
  test('notification center renders Arabic copy without mojibake', async ({ page }) => {
    await setArabic(page);
    await gotoAuthedSurface(page, '/app/notifications');

    await expect(page.getByRole('heading', { name: 'مركز الإشعارات' })).toBeVisible();
    await expectNoVisibleMojibake(page);
  });

  test('settings page renders Arabic labels without mojibake', async ({ page }) => {
    await setArabic(page);
    await gotoAuthedSurface(page, '/app/settings');

    await expectNoVisibleMojibake(page);
  });
});
