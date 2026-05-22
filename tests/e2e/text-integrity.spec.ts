import { expect, test } from '@playwright/test';
import { seedDemoSession } from '../../e2e/helpers/session';

const suspiciousTextPattern =
  /\u00C3|\u00C2\u00B7|\u00E2\u20AC\u00A2|\u00F0\u0178|(?:[\u00D8\u00D9][\u0080-\uFFFF]){2,}|\u00E2\u2020\u2019|\u00E2\u20AC\u201D|\u00E2\u201D\u20AC/u;

async function setArabic(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    localStorage.setItem('wasel-language', 'ar');
  });
}

async function gotoAuthedSurface(
  page: import('@playwright/test').Page,
  route: string,
) {
  await seedDemoSession(page);
  await page.goto(route, { waitUntil: 'commit', timeout: 60_000 });
  await expect(page.getByRole('main')).toBeVisible();
  await page.waitForTimeout(1_000);
}

async function expectNoVisibleMojibake(page: import('@playwright/test').Page) {
  const bodyText = await page.evaluate(() => document.body.innerText);
  expect(bodyText).not.toContain('\uFFFD');
  expect(bodyText).not.toMatch(suspiciousTextPattern);
}

test.describe('Text integrity', () => {
  test('notification center renders Arabic copy without mojibake', async ({ page }) => {
    await setArabic(page);
    await gotoAuthedSurface(page, '/app/notifications');

    await expectNoVisibleMojibake(page);
  });

  test('settings page renders Arabic labels without mojibake', async ({ page }) => {
    await setArabic(page);
    await gotoAuthedSurface(page, '/app/settings');

    await expectNoVisibleMojibake(page);
  });
});
