import { expect, test, type Page } from '@playwright/test';
import { seedDemoSession } from '../../e2e/helpers/session';

test.describe.configure({ timeout: 120_000 });

const guestRoutes = ['/', '/app/privacy', '/app/terms'] as const;
const authRoutes = [
  '/app/find-ride',
  '/app/offer-ride',
  '/app/my-trips',
  '/app/bus',
  '/app/packages',
  '/app/raje3',
  '/app/services/corporate',
  '/app/services/school',
  '/app/innovation-hub',
  '/app/analytics',
  '/app/mobility-os',
  '/app/ai-intelligence',
  '/app/wallet',
  '/app/payments',
  '/app/profile',
  '/app/settings',
  '/app/notifications',
  '/app/trust',
  '/app/driver',
  '/app/safety',
  '/app/moderation',
] as const;

async function expectHealthySurface(page: Page) {
  await expect(page.getByText(/this page could not be loaded/i)).toHaveCount(0);
  const hasRenderableShell = await page.evaluate(() =>
    document.body.childElementCount > 0 && document.body.querySelector('*') !== null,
  );
  expect(hasRenderableShell).toBe(true);
}

async function gotoAuthedSurface(page: Page, route: string) {
  await seedDemoSession(page);
  await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
}

test.describe('Route surfaces', () => {
  for (const route of guestRoutes) {
    test(`guest route renders without app shell failure: ${route}`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await expectHealthySurface(page);
    });
  }

  for (const route of authRoutes) {
    test(`authenticated route renders without app shell failure: ${route}`, async ({ page }) => {
      await gotoAuthedSurface(page, route);
      await expectHealthySurface(page);
    });
  }
});
