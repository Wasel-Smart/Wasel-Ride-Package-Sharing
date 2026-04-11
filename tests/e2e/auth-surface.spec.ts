import { expect, test } from '@playwright/test';

test('landing page exposes the quick auth gateway for guests', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /continue with facebook/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /continue with email/i })).toBeVisible();
});

test('auth page renders the simplified email flow', async ({ page }) => {
  await page.goto('/app/auth', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /continue with facebook/i })).toBeVisible();
  await expect(page.getByRole('textbox', { name: /email address/i })).toBeVisible();
  await expect(page.getByPlaceholder(/enter your password/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /submit sign in/i })).toBeVisible();
});

test('auth page keeps the essentials visible on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/auth', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /submit sign in/i })).toBeVisible();
  await expect(page.getByText(/sign in to continue/i)).toBeVisible();
});
