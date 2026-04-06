import { expect, test } from '@playwright/test';

test('guest landing routes email entry into auth with return target', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /calmer way to read movement/i })).toBeVisible();
  await page.getByRole('button', { name: /continue with email/i }).first().click();
  await expect(page).toHaveURL(/\/app\/auth\?tab=signin&returnTo=%2Fapp%2Ffind-ride/);
});
