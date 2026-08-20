import { expect, test } from '@playwright/test';
import { seedDemoSession } from '../../e2e/helpers/session';

test.beforeEach(async ({ page }) => {
  await seedDemoSession(page, 'en');
});

test('find ride confirms the local-fallback booking outcome clearly', async ({ page }) => {
  await page.goto('/app/find-ride');
  await expect(page.getByTestId('find-ride-search')).toBeVisible();
  await page.getByTestId('find-ride-search').click();
  await page.getByRole('button', { name: /view details/i }).first().click();
  await page.getByRole('button', { name: /^reserve seat$/i }).click();
  // After booking the button label changes — wait for that before checking the page
  await expect(
    page.getByRole('button', { name: /open in my trips|reserving seat/i }),
  ).toBeVisible({ timeout: 10000 });
  // Close the modal so the page-level status banner is reachable
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: /trip details/i })).not.toBeVisible();
  await expect(page.getByRole('status')).toContainText(/request sent|seat confirmed/i);
});

test('offer ride posts a connected trip', async ({ page }) => {
  await page.goto('/app/offer-ride');
  await expect(page.getByTestId('offer-ride-step-1')).toBeVisible();
  await page.locator('input[type="date"]').fill('2026-05-01');
  await page.getByTestId('offer-ride-step-1').click();
  await page.getByPlaceholder(/toyota camry 2023/i).fill('Toyota Camry 2024');
  await page.getByTestId('offer-ride-step-2').click();
  await page.getByTestId('offer-ride-submit').click();
  await expect(page.getByRole('heading', { name: /ride offer is live/i })).toBeVisible();
});

test('bus flow reports an unavailable secure reservation clearly', async ({ page }) => {
  await page.goto('/app/bus');
  await expect(page.getByText(/reserve your seat/i)).toBeVisible();
  await page.getByRole('button', { name: /reserve seat/i }).click();
  await expect(
    page.getByRole('status').filter({ hasText: /session expired|could not be confirmed/i }),
  ).toBeVisible();
});

test('packages flow creates tracking', async ({ page }) => {
  await page.goto('/app/packages');
  await page.getByTestId('package-recipient-name').fill('Receiver Test');
  await page.getByTestId('package-recipient-phone').fill('+962790000888');
  await page.getByTestId('package-create-request').click();
  await expect(page.getByRole('heading', { name: /package request created/i })).toBeVisible();
  await expect(page.getByText('Tracking ID', { exact: true })).toBeVisible();
  await expect(page.getByText('Handoff code', { exact: true })).toBeVisible();
});

test('wallet stays available in local fallback mode', async ({ page }) => {
  await page.goto('/app/wallet');
  await expect(page.getByText(/wallet unavailable/i)).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /wasel wallet/i })).toBeVisible();
  await expect(page.getByText(/^Available$/i)).toBeVisible();
});
