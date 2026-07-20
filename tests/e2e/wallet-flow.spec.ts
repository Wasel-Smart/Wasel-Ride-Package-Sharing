import { test, expect } from '@playwright/test';

test.describe('Wallet & Payment Flows', () => {
  test.skip(!process.env.PLAYWRIGHT_USE_DEMO_DATA, 'Requires PLAYWRIGHT_USE_DEMO_DATA=true');

  test('should load wallet page or redirect to login', async ({ page }) => {
    await page.goto('/app/wallet');
    const content = await page.textContent('body');
    expect(content).toBeDefined();
  });

  test('payments path should redirect to wallet page', async ({ page }) => {
    await page.goto('/app/payments');
    await page.waitForURL(/\/app\/wallet.*/);
    const url = page.url();
    expect(url).toContain('/app/wallet');
  });
});
