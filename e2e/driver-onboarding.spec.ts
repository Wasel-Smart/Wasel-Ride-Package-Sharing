/**
 * E2E: Driver onboarding flows
 *
 * Covers the driver setup steps, readiness gate, and driver console.
 */
import { test, expect } from '@playwright/test';
import { seedDemoSession } from './helpers/session';

const BASE = 'http://127.0.0.1:4173';

test.describe('Driver Onboarding', () => {
  test('unauthenticated access redirects to auth', async ({ page }) => {
    await page.goto(`${BASE}/app/driver`);
    await expect(page).toHaveURL(/\/app\/auth/);
  });

  test('driver console renders for approved driver', async ({ page }) => {
    await seedDemoSession(page);
    await page.goto(`${BASE}/app/driver`);
    await expect(page.getByText(/driver|سائق/i).first()).toBeVisible();
  });

  test('readiness progress shows step completion', async ({ page }) => {
    await seedDemoSession(page);
    await page.goto(`${BASE}/app/driver`);
    // Readiness steps should render (step cards with labels)
    await expect(page.getByText(/email|بريد|phone|هاتف|license|رخصة/i).first()).toBeVisible();
  });

  test('offer-ride button is enabled for approved driver', async ({ page }) => {
    await seedDemoSession(page); // driverStatus: 'approved', level_3
    await page.goto(`${BASE}/app/offer-ride`);
    // Form should render (not blocked by readiness gate)
    await expect(page.getByText(/offer a ride|اعرض مشوار/i).first()).toBeVisible();
    // No "finish checks" blocking banner
    await expect(page.getByText(/Driver approval is required/i)).not.toBeVisible();
  });

  test('driver blocked when not approved', async ({ page }) => {
    // Seed a non-approved driver
    await page.addInitScript(() => {
      const key = 'wasel_user_session';
      window.localStorage.setItem(key, JSON.stringify({
        id: 'blocked-driver',
        name: 'Pending Driver',
        email: 'pending@example.test',
        role: 'driver',
        balance: 0,
        rating: 0,
        trips: 0,
        verified: false,
        verificationLevel: 'level_1',
        walletStatus: 'active',
        driverStatus: 'pending_approval',
        joinedAt: '2026-01-01',
        emailVerified: true,
        phoneVerified: true,
        twoFactorEnabled: false,
        trustScore: 50,
        backendMode: 'local',
      }));
    });
    await page.goto(`${BASE}/app/offer-ride`);
    await expect(page.getByText(/Driver approval is required|مستنداتك قيد المراجعة/i).first()).toBeVisible();
  });
});
