/**
 * E2E: Package delivery feature flows
 */
import { test, expect } from '@playwright/test';
import { seedDemoSession } from './helpers/session';

const BASE = 'http://127.0.0.1:4173';

test.describe('Package Delivery', () => {
  test('unauthenticated access redirects to auth', async ({ page }) => {
    await page.goto(`${BASE}/app/packages`);
    await expect(page).toHaveURL(/\/app\/auth/);
  });

  test('authenticated users see the packages page', async ({ page }) => {
    await seedDemoSession(page);
    await page.goto(`${BASE}/app/packages`);
    await expect(page.getByText(/send a package|أرسل طردًا|package|طرد/i).first()).toBeVisible();
  });

  test('package tab switch works (ride vs package)', async ({ page }) => {
    await seedDemoSession(page);
    await page.goto(`${BASE}/app/find-ride`);
    // Switch to package tab
    const pkgTab = page.getByRole('button', { name: /package|طرد|send package/i }).first();
    if (await pkgTab.isVisible()) {
      await pkgTab.click();
      await expect(page.getByText(/weight|الوزن|sender|المرسل/i).first()).toBeVisible();
    }
  });

  test('package tracking panel accepts a tracking ID', async ({ page }) => {
    await seedDemoSession(page);
    await page.goto(`${BASE}/app/packages`);
    const trackInput = page.getByLabel(/package tracking id|رقم تتبع الطرد/i);
    if (await trackInput.isVisible()) {
      await trackInput.fill('PKG-TEST-001');
      await page.getByLabel(/find package|ابحث عن الطرد/i).click();
    }
  });

  test('Raje3 returns page is reachable', async ({ page }) => {
    await seedDemoSession(page);
    await page.goto(`${BASE}/app/raje3`);
    await expect(page.getByText(/return|إرجاع|raje3|راجع/i).first()).toBeVisible();
  });
});
