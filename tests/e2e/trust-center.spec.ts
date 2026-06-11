import { test, expect } from '@playwright/test';

test.describe('Trust Center Page', () => {
  test('should load trust center page', async ({ page }) => {
    await page.goto('http://127.0.0.1:3002/app/trust');
    
    await expect(page.locator('text=Trust Center')).toBeVisible({ timeout: 10000 });
  });

  test('should show trust metrics', async ({ page }) => {
    await page.goto('http://127.0.0.1:3002/app/trust');
    
    await expect(page.locator('text=/Trust score|درجة الثقة/')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=/Checks done|التحقق المكتمل/')).toBeVisible({ timeout: 10000 });
  });

  test('should show verification steps', async ({ page }) => {
    await page.goto('http://127.0.0.1:3002/app/trust');
    
    await expect(page.locator('text=/Identity|الهوية/')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=/Email|البريد/')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=/Phone|الهاتف/')).toBeVisible({ timeout: 10000 });
  });

  test('should allow refreshing trust status', async ({ page }) => {
    await page.goto('http://127.0.0.1:3002/app/trust');
    
    const refreshButton = page.locator('button:has-text("Refresh"), button:has-text("تحديث")').first();
    await expect(refreshButton).toBeVisible({ timeout: 10000 });
    
    await refreshButton.click();
    await expect(page.locator('text=/Refreshing|يتم التحديث/')).toBeVisible({ timeout: 2000 });
  });
});
