import { expect, test } from '@playwright/test';
import { seedDemoSession } from '../../e2e/helpers/session';

test('guest landing routes email entry into auth with return target', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /calmer way to read movement/i })).toBeVisible();
  await page.getByRole('button', { name: /continue with email/i }).first().click();
  await expect(page).toHaveURL(/\/app\/auth\?tab=signin&returnTo=%2Fapp%2Ffind-ride/);
});

test('authenticated landing sends riders into find ride search', async ({ page }) => {
  await seedDemoSession(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /explore routes/i }).click();
  await expect(page).toHaveURL(/\/app\/find-ride/);
  await expect(page.getByRole('heading', { name: /find a ride|find a shared route/i })).toBeVisible();
});

test('authenticated landing can open packages from the primary action rail', async ({ page }) => {
  await seedDemoSession(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /send a package/i }).click();
  await expect(page).toHaveURL(/\/app\/packages/);
  await expect(page.getByTestId('package-recipient-name')).toBeVisible();
});
