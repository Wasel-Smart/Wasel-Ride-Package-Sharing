import { expect, test } from '@playwright/test';
import { seedDemoSession } from '../../e2e/helpers/session';

test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
  await seedDemoSession(page);
});

test('wallet surface exposes stored-value controls', async ({ page }) => {
  await page.goto('/app/wallet', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: /wallet/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /add money/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /withdraw/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /^send$/i })).toBeVisible();
});

test('payments surface creates and confirms a payment intent', async ({ page }) => {
  await page.goto('/app/payments', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: /move value with explicit payment flows/i })).toBeVisible();
  await expect(page.getByText(/wallet keeps your balance/i)).toBeVisible();

  await page.getByRole('button', { name: /create payment intent/i }).click();
  await expect(page.getByText(/payment lifecycle/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /confirm payment/i })).toBeVisible();

  await page.getByRole('button', { name: /confirm payment/i }).click();
  await expect(page.getByText(/payment settled successfully/i)).toBeVisible();
});
