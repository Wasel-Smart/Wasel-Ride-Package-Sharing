import { expect, test, type Page } from '@playwright/test';
import { seedConsentDecision, seedTestSession } from '../../e2e/helpers/session';

const guestRoutes = ['/', '/app/privacy', '/app/terms'];
const authRoutes = [
  '/app/find-ride',
  '/app/offer-ride',
  '/app/my-trips',
  '/app/packages',
  '/app/wallet',
  '/app/payments',
];

async function expectHealthySurface(page: Page) {
  await page.waitForTimeout(600);
  await expect(page.getByText(/this page could not be loaded/i)).toHaveCount(0);
  await expect(page.getByRole('heading').first()).toBeVisible();
  await expect(page.locator('main[role="main"], main').first()).toBeVisible();
}

async function gotoAuthedSurface(page: Page, route: string) {
  await seedTestSession(page);
  await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(1_000);
}

test.describe.configure({ mode: 'serial' });

test.describe('Core route smoke', () => {
  for (const route of guestRoutes) {
    test(`guest route renders without app error: ${route}`, async ({ page }) => {
      await seedConsentDecision(page);
      await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await expectHealthySurface(page);
    });
  }

  for (const route of authRoutes) {
    test(`authenticated route renders without app error: ${route}`, async ({ page }) => {
      await gotoAuthedSurface(page, route);
      await expect(page).not.toHaveURL(/\/app\/auth(?:\?|$)/);
      await expectHealthySurface(page);
    });
  }
});
