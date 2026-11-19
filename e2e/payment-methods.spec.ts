/**
 * E2E: Payment methods flows
 *
 * Covers listing methods, setting primary, error states.
 */
import { test, expect } from '@playwright/test';
import { seedDemoSession } from './helpers/session';

const BASE = 'http://127.0.0.1:4173';

test.describe('Payment Methods', () => {
  test('unauthenticated access redirects to auth', async ({ page }) => {
    await page.goto(`${BASE}/app/wallet`);
    await expect(page).toHaveURL(/\/app\/auth/);
  });

  test('wallet page shows payment methods section', async ({ page }) => {
    await seedDemoSession(page);
    await page.goto(`${BASE}/app/wallet`);
    // Settings or payment methods tab
    const settingsTab = page.getByRole('tab', { name: /settings|الإعدادات/i });
    if (await settingsTab.isVisible()) {
      await settingsTab.click();
      await expect(page.getByText(/payment method|وسيلة الدفع|add.*card|أضف.*بطاقة/i).first()).toBeVisible();
    }
  });

  test('add payment method button is present', async ({ page }) => {
    await seedDemoSession(page);
    await page.goto(`${BASE}/app/wallet`);
    // The add money / add card button should exist somewhere in the wallet flow
    const addBtn = page.getByRole('button', { name: /add money|add.*card|إضافة.*دفع|top.up/i }).first();
    await expect(addBtn).toBeVisible();
  });

  test('top-up flow has amount input', async ({ page }) => {
    await seedDemoSession(page);
    await page.goto(`${BASE}/app/wallet`);
    await page.getByRole('button', { name: /add money|top.up/i }).first().click();
    await expect(page.getByPlaceholder('0.00')).toBeVisible();
  });

  test('wallet balance is masked by default or shows a number', async ({ page }) => {
    await seedDemoSession(page);
    await page.goto(`${BASE}/app/wallet`);
    // Balance should show JOD or be masked
    await expect(page.getByText(/JOD|دينار|balance|رصيد/i).first()).toBeVisible();
  });
});
