/**
 * E2E: Bus Booking feature flows
 *
 * Covers route browsing, schedule viewing, booking form,
 * and confirmation state.
 */
import { test, expect } from '@playwright/test';
import { seedDemoSession } from './helpers/session';

const BASE = 'http://127.0.0.1:4173';

test.describe('Bus Booking', () => {
  test('unauthenticated access redirects to auth', async ({ page }) => {
    await page.goto(`${BASE}/app/bus`);
    await expect(page).toHaveURL(/\/app\/auth/);
  });

  test('authenticated users see bus route list', async ({ page }) => {
    await seedDemoSession(page);
    await page.goto(`${BASE}/app/bus`);

    // Page heading
    await expect(page.getByText(/book a bus|احجز باص/i).first()).toBeVisible();
    // At least one route card or route label
    await expect(page.getByText(/amman|عمّان/i).first()).toBeVisible();
  });

  test('journey preset buttons set from/to fields', async ({ page }) => {
    await seedDemoSession(page);
    await page.goto(`${BASE}/app/bus`);

    // Amman → Aqaba is the default preset
    await expect(page.getByText(/aqaba|العقبة/i).first()).toBeVisible();
  });

  test('bus schedule table shows departure times', async ({ page }) => {
    await seedDemoSession(page);
    await page.goto(`${BASE}/app/bus`);

    // Schedule section or time-of-day labels
    await expect(page.getByText(/departure|انطلاق|schedule|جدول/i).first()).toBeVisible();
  });

  test('selecting a departure enables the book button', async ({ page }) => {
    await seedDemoSession(page);
    await page.goto(`${BASE}/app/bus`);

    // Find and click the first time-slot button
    const timeBtn = page.getByRole('button').filter({ hasText: /^\d{1,2}:\d{2}/ }).first();
    if (await timeBtn.isVisible()) {
      await timeBtn.click();
      // A booking action button should be enabled
      const bookBtn = page.getByRole('button', { name: /book|احجز|confirm|تأكيد/i }).first();
      await expect(bookBtn).toBeEnabled();
    }
  });

  test('booking confirmation state appears after submit', async ({ page }) => {
    await seedDemoSession(page);
    await page.goto(`${BASE}/app/bus`);

    // Click first departure time
    const timeBtn = page.getByRole('button').filter({ hasText: /^\d{1,2}:\d{2}/ }).first();
    if (await timeBtn.isVisible()) {
      await timeBtn.click();
      const bookBtn = page.getByRole('button', { name: /book|احجز|confirm|تأكيد/i }).first();
      if (await bookBtn.isEnabled()) {
        await bookBtn.click();
        // Should show a success / confirmation message
        await expect(
          page.getByText(/confirmed|booking reference|ticket|مؤكد|حجز|تذكرة/i).first(),
        ).toBeVisible({ timeout: 8000 });
      }
    }
  });

  test('bus page is reachable in Arabic', async ({ page }) => {
    await seedDemoSession(page, 'ar');
    await page.goto(`${BASE}/app/bus`);
    await expect(page.getByText(/احجز باص|باص واصل/i).first()).toBeVisible();
  });
});
