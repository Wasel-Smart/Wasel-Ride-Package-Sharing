import { expect, test } from '@playwright/test';
import { seedDemoSession } from '../../e2e/helpers/session';

test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
  await seedDemoSession(page);
});

test('wallet surface exposes stored-value controls', async ({ page }) => {
  await page.goto('/app/wallet', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { level: 1, name: /wallet/i })).toBeVisible();
  await expect(page.getByRole('alert').getByText(/wallet service unavailable/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /add money/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /open payments/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /refresh wallet/i }).first()).toBeVisible();
});

test('payments surface shows backend failure clearly', async ({ page }) => {
  await page.goto('/app/payments', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: /pay for a ride or package/i })).toBeVisible();
  await expect(page.getByRole('alert').getByText(/payments unavailable/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /retry/i })).toBeVisible();
});
