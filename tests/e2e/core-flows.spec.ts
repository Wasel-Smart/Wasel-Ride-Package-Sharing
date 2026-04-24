import { expect, test, type Page } from '@playwright/test';
import { seedDemoSession } from '../../e2e/helpers/session';

test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
  await seedDemoSession(page);
});

async function expectWithinViewport(page: Page, selector: string) {
  const locator = page.locator(selector).first();
  await expect(locator).toBeVisible();

  const box = await locator.boundingBox();
  const viewport = page.viewportSize();

  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();

  if (!box || !viewport) {
    return;
  }

  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
}

test('find ride books a seat', async ({ page }) => {
  await page.goto('/app/find-ride', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /find your ride instantly/i })).toBeVisible();
  await page.getByTestId('find-ride-search').click();
  await expect(page.getByRole('heading', { name: /premium ride matches/i })).toBeVisible();
  await page.getByTestId(/ride-request-/).first().click();
  await expect(
    page.getByText(/ride request sent\. driver matching is running now\.|ride request saved\./i),
  ).toBeVisible();
});

test('offer ride posts a connected trip', async ({ page }) => {
  await page.goto('/app/offer-ride');
  await expect(page.getByRole('heading', { name: /create ride|offer route/i })).toBeVisible();
  await page.locator('input[type="date"]').fill('2026-05-01');
  await page.getByTestId('offer-ride-step-1').click();
  await page.getByPlaceholder(/toyota camry 2023/i).fill('Toyota Camry 2024');
  await page.getByTestId('offer-ride-step-2').click();
  await page.getByTestId('offer-ride-submit').click();
  await expect(page.getByRole('heading', { name: /route is live/i })).toBeVisible();
});

test('bus flow reserves a seat', async ({ page }) => {
  await page.goto('/app/bus');
  await expect(page.getByRole('heading', { name: /wasel bus/i })).toBeVisible();
  await expect(page.getByText(/showing official jordan schedule data verified on|live bus inventory is synced for this corridor|live route api is unavailable/i)).toBeVisible();
  await expect(page.getByTestId('bus-confirm-booking')).toBeVisible();
  await page.getByTestId('bus-confirm-booking').click({ timeout: 20_000 });
  const confirmation = page.getByText(/seat confirmed/i).last();
  await confirmation.scrollIntoViewIfNeeded();
  await expect(confirmation).toBeVisible();
});

test('packages flow creates tracking', async ({ page }) => {
  await page.goto('/app/packages');
  await expect(page.getByTestId('package-recipient-name')).toBeVisible();
  await page.getByTestId('package-recipient-name').fill('Receiver Test');
  await page.getByTestId('package-recipient-phone').fill('+962790000888');
  await page.getByTestId('package-create-request').click();
  await expect(page.getByRole('heading', { name: /package request created/i })).toBeVisible();
  await expect(page.getByText(/^Tracking ID$/)).toBeVisible();
  await expect(page.getByText(/^Handoff code$/)).toBeVisible();
});

test('packages page reflows key surfaces on a phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto('/app/packages', { waitUntil: 'networkidle' });

  for (const selector of [
    '.wasel-section-head',
    '.wasel-page-brief',
    '.wasel-clarity-band',
    '.pkg-send-form-grid',
    '.pkg-send-steps-grid',
    '[data-testid="package-create-request"]',
  ]) {
    await expectWithinViewport(page, selector);
  }
});
