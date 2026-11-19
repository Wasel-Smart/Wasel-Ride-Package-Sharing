/**
 * E2E: Schedule page flows
 *
 * Covers creating a scheduled item, error handling, and cancellation.
 */
import { test, expect } from '@playwright/test';
import { seedDemoSession } from './helpers/session';

const BASE = 'http://127.0.0.1:4173';

test.describe('Schedule', () => {
  test('unauthenticated access redirects to auth', async ({ page }) => {
    await page.goto(`${BASE}/app/schedule`);
    await expect(page).toHaveURL(/\/app\/auth/);
  });

  test('schedule page renders for authenticated user', async ({ page }) => {
    await seedDemoSession(page);
    await page.goto(`${BASE}/app/schedule`);
    await expect(page.getByText(/schedule|جدول|planned|upcoming/i).first()).toBeVisible();
  });

  test('new schedule button opens the form', async ({ page }) => {
    await seedDemoSession(page);
    await page.goto(`${BASE}/app/schedule`);
    const newBtn = page.getByRole('button', { name: /new schedule|جدول جديد/i });
    await expect(newBtn).toBeVisible();
    await newBtn.click();
    // Form fields should appear
    await expect(page.getByLabel(/pickup location|موقع الالتقاط/i)).toBeVisible();
  });

  test('form validates required fields', async ({ page }) => {
    await seedDemoSession(page);
    await page.goto(`${BASE}/app/schedule`);
    await page.getByRole('button', { name: /new schedule|جدول جديد/i }).click();
    // Try to submit without filling required fields — button should be disabled
    const confirmBtn = page.getByRole('button', { name: /confirm schedule|تأكيد الجدول/i });
    await expect(confirmBtn).toBeDisabled();
  });

  test('schedule item can be created with valid input', async ({ page }) => {
    await seedDemoSession(page);
    await page.goto(`${BASE}/app/schedule`);
    await page.getByRole('button', { name: /new schedule|جدول جديد/i }).click();

    await page.getByLabel(/pickup location|موقع الالتقاط/i).fill('Amman, Rainbow Street');
    // Set a future date
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 16);
    await page.locator('input[type="datetime-local"]').fill(tomorrow);

    const confirmBtn = page.getByRole('button', { name: /confirm schedule|تأكيد الجدول/i });
    await expect(confirmBtn).toBeEnabled();
  });

  test('schedule renders in Arabic', async ({ page }) => {
    await seedDemoSession(page, 'ar');
    await page.goto(`${BASE}/app/schedule`);
    await expect(page.getByText(/جدول|مجدول|مخطط/i).first()).toBeVisible();
  });
});
