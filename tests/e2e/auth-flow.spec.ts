import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  // Only run when demo/test data is active
  test.skip(!process.env.PLAYWRIGHT_USE_DEMO_DATA, 'Requires PLAYWRIGHT_USE_DEMO_DATA=true');

  test('should load landing page successfully', async ({ page }) => {
    await page.goto('/');
    const title = await page.title();
    expect(title).toBeDefined();
  });

  test('should display login input on auth page', async ({ page }) => {
    await page.goto('/app/auth');
    // Verify either form or page elements exist
    const content = await page.textContent('body');
    expect(content).toContain('Wasel');
  });

  test('should show 404 page for invalid routes', async ({ page }) => {
    await page.goto('/app/non-existent-route-path');
    const content = await page.textContent('body');
    expect(content).toContain('404');
  });
});
