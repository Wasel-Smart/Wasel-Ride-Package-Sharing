import { expect, test } from '@playwright/test';
import { seedDemoSession } from '../../e2e/helpers/session';

test.describe('Visual regression', () => {
  test('landing matches the Wasel redesign shell', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.setViewportSize({ width: 1440, height: 1200 });
    await expect(page).toHaveScreenshot('landing-page.png', {
      animations: 'disabled',
      fullPage: true,
    });
  });

  test('find ride matches the shared system', async ({ page }) => {
    await seedDemoSession(page);
    await page.goto('/app/find-ride', { waitUntil: 'networkidle' });
    await page.setViewportSize({ width: 1440, height: 1400 });
    await expect(page).toHaveScreenshot('find-ride-page.png', {
      animations: 'disabled',
      fullPage: true,
    });
  });

  test('settings matches the shared system', async ({ page }) => {
    await seedDemoSession(page);
    await page.goto('/app/settings', { waitUntil: 'networkidle' });
    await page.setViewportSize({ width: 1440, height: 1200 });
    await expect(page).toHaveScreenshot('settings-page.png', {
      animations: 'disabled',
      fullPage: true,
    });
  });
});
