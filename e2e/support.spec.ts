/**
 * E2E: Support & Safety flows
 *
 * Covers support ticket creation, safety page, and help access.
 */
import { test, expect } from '@playwright/test';
import { seedDemoSession } from './helpers/session';

const BASE = 'http://127.0.0.1:4173';

test.describe('Support', () => {
  test('support page is reachable when authenticated', async ({ page }) => {
    await seedDemoSession(page);
    await page.goto(`${BASE}/app/support`);
    await expect(page.getByText(/support|الدعم|help|مساعدة/i).first()).toBeVisible();
  });

  test('safety page is accessible without authentication', async ({ page }) => {
    await page.goto(`${BASE}/app/safety`);
    // Safety page should be public (emergency help available without login)
    await expect(page.getByText(/safety|الأمان|emergency|طوارئ/i).first()).toBeVisible();
  });

  test('safety page shows emergency contact', async ({ page }) => {
    await page.goto(`${BASE}/app/safety`);
    // Emergency/help banner is always visible
    await expect(page.getByText(/emergency|طوارئ|911|help.*line|خط المساعدة/i).first()).toBeVisible();
  });

  test('support form has topic selector', async ({ page }) => {
    await seedDemoSession(page);
    await page.goto(`${BASE}/app/support`);
    // Topic dropdown or category buttons
    await expect(page.getByRole('combobox').first().or(
      page.getByText(/ride issue|مشكلة مشوار|payment|الدفع|general|عام/i).first()
    )).toBeVisible();
  });

  test('safety page renders in Arabic', async ({ page }) => {
    await page.goto(`${BASE}/app/safety`);
    await page.evaluate(() => window.localStorage.setItem('wasel-language', 'ar'));
    await page.reload();
    await expect(page.getByText(/الأمان|طوارئ|مساعدة/i).first()).toBeVisible();
  });
});
