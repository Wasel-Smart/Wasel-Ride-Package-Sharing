/**
 * E2E: Wallet feature flows
 */
import { test, expect } from '@playwright/test';
import { seedTestSession } from './helpers/session';

const BASE = 'http://127.0.0.1:4173';

test.describe('Wallet', () => {
  test('unauthenticated wallet access redirects to auth', async ({ page }) => {
    await page.goto(`${BASE}/app/wallet`);
    await expect(page).toHaveURL(/\/app\/auth/);
  });

  test('authenticated users can view the wallet overview', async ({ page }) => {
    await seedTestSession(page);
    await page.goto(`${BASE}/app/wallet`);
    await expect(page.getByText(/wasel wallet|available balance/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /add money/i })).toBeVisible();
    await expect(page.getByText(/recent transactions/i)).toBeVisible();
  });

  test('top-up modal opens and supports a local top-up flow', async ({ page }) => {
    await seedTestSession(page);
    await page.goto(`${BASE}/app/wallet`);

    await page.getByRole('button', { name: /add money/i }).click();
    await expect(page.getByText(/top-up amount/i)).toBeVisible();
    await page.getByPlaceholder('0.00').fill('15');
    await page.getByRole('button', { name: /top up 15 jod/i }).click();
    await expect(page.getByText(/recent transactions/i)).toBeVisible();
    await expect(page.getByText(/top up via/i).first()).toBeVisible();
  });

  test('transactions tab is reachable from the wallet shell', async ({ page }) => {
    await seedTestSession(page);
    await page.goto(`${BASE}/app/wallet`);
    await page.getByRole('tab', { name: /transactions/i }).click();
    await expect(page.getByText(/trip to aqaba|wasel delivery fee/i).first()).toBeVisible();
  });
});
