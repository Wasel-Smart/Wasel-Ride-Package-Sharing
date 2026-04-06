import { expect, test } from '@playwright/test';
import { seedDemoSession } from '../../e2e/helpers/session';

test.beforeEach(async ({ page }) => {
  await seedDemoSession(page);
});

test('find ride books a seat', async ({ page }) => {
  await page.goto('/app/find-ride', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /find a ride|find a shared route/i })).toBeVisible();
  await page.getByTestId('find-ride-search').click();
  await page.getByRole('button', { name: /book seat/i }).first().click();
  await page.getByRole('button', { name: /reserve this seat/i }).click();
  await expect(page.getByText(/saved in your trips|for approval/i)).toBeVisible();
});

test('offer ride posts a connected trip', async ({ page }) => {
  await page.goto('/app/offer-ride');
  await expect(page.getByRole('heading', { name: /offer route/i })).toBeVisible();
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
  await page.getByTestId('bus-confirm-booking').click();
  await expect(page.getByText(/seat confirmed/i)).toBeVisible();
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
