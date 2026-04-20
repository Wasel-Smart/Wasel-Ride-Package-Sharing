import { expect, test } from '@playwright/test';

test('guest landing routes email entry into auth with return target', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /open the network first/i })).toBeVisible();
  const emailButton = page.getByRole('button', { name: /continue with email/i }).first();
  await expect(emailButton).toBeVisible();
  await emailButton.focus();
  await emailButton.press('Enter');
  await expect(page).toHaveURL(/\/app\/auth\?tab=signin&returnTo=%2Fapp%2Ffind-ride%3Ffrom%3DAmman%26to%3DIrbid%26search%3D1/);
});
