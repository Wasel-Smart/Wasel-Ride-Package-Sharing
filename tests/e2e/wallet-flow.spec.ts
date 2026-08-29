import { test, expect } from '@playwright/test';
import { seedDemoSession } from '../../e2e/helpers/session';

test.beforeEach(async ({ page }) => {
  await seedDemoSession(page, 'en');
});

test('wallet page renders heading and available balance', async ({ page }) => {
  await page.goto('/app/wallet');
  await expect(page.getByRole('heading', { name: /wasel wallet/i })).toBeVisible();
  await expect(page.getByText(/^Available$/i)).toBeVisible();
  await expect(page.getByText(/wallet unavailable/i)).toHaveCount(0);
});

test('/app/payments redirects to wallet', async ({ page }) => {
  await page.goto('/app/payments');
  await page.waitForURL(/\/app\/wallet/);
  expect(page.url()).toContain('/app/wallet');
});

test('wallet page shows transaction history section', async ({ page }) => {
  await page.goto('/app/wallet');
  await expect(page.getByText(/transaction|history|activity/i).first()).toBeVisible();
});

test('wallet top-up button is visible when edge API is unavailable', async ({ page }) => {
  await page.goto('/app/wallet');
  // Top-up button should render even in local-fallback mode; it will surface
  // a backend-unavailable error on click rather than hiding the action entirely.
  await expect(page.getByRole('button', { name: /top.?up|add funds/i }).first()).toBeVisible();
});
