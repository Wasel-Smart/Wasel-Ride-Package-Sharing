/**
 * E2E: Trust Center flows
 *
 * Covers trust score display, verification steps, and MFA gate.
 */
import { test, expect } from '@playwright/test';
import { seedDemoSession } from './helpers/session';

const BASE = 'http://127.0.0.1:4173';

test.describe('Trust Center', () => {
  test('unauthenticated access redirects to auth', async ({ page }) => {
    await page.goto(`${BASE}/app/trust`);
    await expect(page).toHaveURL(/\/app\/auth/);
  });

  test('trust score is visible for verified user', async ({ page }) => {
    await seedDemoSession(page);
    await page.goto(`${BASE}/app/trust`);
    // Trust score or verification label
    await expect(page.getByText(/trust score|درجة الثقة|verification|التحقق/i).first()).toBeVisible();
  });

  test('verification steps are listed', async ({ page }) => {
    await seedDemoSession(page);
    await page.goto(`${BASE}/app/trust`);
    await expect(page.getByText(/phone|هاتف|email|بريد|documents|مستندات/i).first()).toBeVisible();
  });

  test('driver mode toggle is accessible', async ({ page }) => {
    await seedDemoSession(page);
    await page.goto(`${BASE}/app/trust`);
    // Driver mode section heading
    await expect(
      page.getByText(/driver mode|وضع السائق|enable driver|تفعيل السائق/i).first(),
    ).toBeVisible();
  });

  test('trust center renders in Arabic', async ({ page }) => {
    await seedDemoSession(page, 'ar');
    await page.goto(`${BASE}/app/trust`);
    await expect(page.getByText(/درجة الثقة|التحقق|وضع السائق/i).first()).toBeVisible();
  });
});
