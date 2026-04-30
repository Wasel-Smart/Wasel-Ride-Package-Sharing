import { expect, test, type Page } from '@playwright/test';
import { gotoAuthedRoute, seedTestSession } from '../../e2e/helpers/session';

test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
  await seedTestSession(page);
});

async function failSupabaseRestRequest(
  page: Page,
  table: 'packages' | 'trips',
  method: 'GET' | 'POST',
) {
  await page.route(`**/rest/v1/${table}*`, async route => {
    if (route.request().method() === method) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: `Forced ${table} failure for E2E coverage.` }),
      });
      return;
    }

    await route.continue();
  });
}

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

test('find ride falls back to local catalog results when backend search fails in test mode', async ({ page }) => {
  await failSupabaseRestRequest(page, 'trips', 'GET');
  await gotoAuthedRoute(page, '/app/find-ride?from=Amman&to=Irbid&search=1');
  await expect(page).toHaveURL(/\/app\/find-ride/);
  const searchButton = page.getByRole('button', { name: /^search rides$/i });
  await expect(searchButton).toBeVisible();
  await searchButton.click({ force: true });
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /available rides/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /request amman to irbid/i })).toBeVisible();
});

test('offer ride stops when the backend cannot create the ride', async ({ page }) => {
  await failSupabaseRestRequest(page, 'trips', 'POST');
  await gotoAuthedRoute(page, '/app/offer-ride');
  await expect(page.getByRole('heading', { name: /offer a ride/i })).toBeVisible();
  const dateInput = page.locator('input[type="date"]');
  await dateInput.fill('2026-05-01');
  await dateInput.blur();
  const stepOneButton = page.getByTestId('offer-ride-step-1');
  await expect(stepOneButton).toBeEnabled();
  await stepOneButton.click({ force: true });
  const carModelInput = page.getByTestId('offer-ride-car-model');
  await expect(carModelInput).toBeVisible();
  await carModelInput.fill('Toyota Camry 2024');
  await carModelInput.blur();
  const stepTwoButton = page.getByTestId('offer-ride-step-2');
  await expect(stepTwoButton).toBeEnabled();
  await stepTwoButton.click({ force: true });
  const submitButton = page.getByTestId('offer-ride-submit');
  await expect(submitButton).toBeVisible();
  await expect(submitButton).toBeEnabled();
  await submitButton.click({ force: true });
  await expect(page.getByText(/ride could not be created right now\. please try again\./i)).toBeVisible();
});

test('packages flow stops when the backend cannot create tracking', async ({ page }) => {
  await failSupabaseRestRequest(page, 'packages', 'POST');
  await gotoAuthedRoute(page, '/app/packages');
  await expect(page.getByTestId('package-recipient-name')).toBeVisible();
  await page.getByTestId('package-recipient-name').fill('Receiver Test');
  await page.getByTestId('package-recipient-phone').fill('+962790000888');
  const createRequestButton = page.getByTestId('package-create-request');
  await expect(createRequestButton).toBeVisible();
  await expect(createRequestButton).toBeEnabled();
  await createRequestButton.click({ force: true });
  await expect(page.getByText(/package request could not be created right now\. please try again\./i)).toBeVisible();
});

test('packages page reflows key surfaces on a phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 });
  await gotoAuthedRoute(page, '/app/packages', { waitUntil: 'networkidle' });

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
