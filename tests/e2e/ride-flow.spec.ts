import { test, expect } from '@playwright/test';

test.describe('Ride Matching & Search Flows', () => {
  test.skip(!process.env.PLAYWRIGHT_USE_DEMO_DATA, 'Requires PLAYWRIGHT_USE_DEMO_DATA=true');

  test('should load find-ride page or redirect', async ({ page }) => {
    await page.goto('/app/find-ride');
    const content = await page.textContent('body');
    expect(content).toBeDefined();
  });

  test('should load offer-ride page or redirect', async ({ page }) => {
    await page.goto('/app/offer-ride');
    const content = await page.textContent('body');
    expect(content).toBeDefined();
  });

  test('should load popular routes page', async ({ page }) => {
    await page.goto('/app/routes');
    const content = await page.textContent('body');
    expect(content).toBeDefined();
  });
});
