import { expect, test } from '@playwright/test';
import { gotoAuthedRoute, seedDemoSession } from '../../e2e/helpers/session';

test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
  await seedDemoSession(page);
});

test('wallet surface exposes stored-value controls', async ({ page }) => {
  await gotoAuthedRoute(page, '/app/wallet');

  await expect(page.getByRole('heading', { level: 1, name: /wallet/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /add money/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /open payments/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /refresh wallet/i }).first()).toBeVisible();

  const walletFailureAlert = page.getByRole('alert').getByText(/wallet service unavailable/i);
  if ((await walletFailureAlert.count()) > 0) {
    await expect(walletFailureAlert).toBeVisible();
    return;
  }

  await expect(page.getByText(/live wallet/i)).toBeVisible();
});

test('payments surface shows backend failure clearly', async ({ page }) => {
  await gotoAuthedRoute(page, '/app/payments');

  await expect(page.getByRole('heading', { name: /pay for a ride or package/i })).toBeVisible();
  const paymentsFailureAlert = page.getByRole('alert').getByText(/payments unavailable/i);
  if ((await paymentsFailureAlert.count()) > 0) {
    await expect(paymentsFailureAlert).toBeVisible();
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible();
    return;
  }

  await expect(page.getByRole('heading', { name: /start payment/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /start payment/i })).toBeVisible();
});
