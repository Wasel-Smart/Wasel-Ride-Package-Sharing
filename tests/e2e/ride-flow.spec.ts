import { test, expect } from '@playwright/test';
import { seedDemoSession } from '../../e2e/helpers/session';

test.beforeEach(async ({ page }) => {
  await seedDemoSession(page, 'en');
});

test('find-ride page renders search interface', async ({ page }) => {
  await page.goto('/app/find-ride');
  await expect(page.getByRole('heading', { name: /book a ride/i })).toBeVisible();
  await expect(page.getByTestId('find-ride-search')).toBeVisible();
});

test('find-ride search returns results', async ({ page }) => {
  await page.goto('/app/find-ride');
  await expect(page.getByTestId('find-ride-search')).toBeVisible();
  await page.getByTestId('find-ride-search').click();
  await expect(page.getByRole('button', { name: /view details/i }).first()).toBeVisible();
});

test('offer-ride page renders the form', async ({ page }) => {
  await page.goto('/app/offer-ride');
  await expect(page.getByTestId('offer-ride-step-1')).toBeVisible();
  await expect(page.locator('input[type="date"]')).toBeVisible();
});

test('offer-ride full flow posts a connected trip', async ({ page }) => {
  await page.goto('/app/offer-ride');
  await expect(page.getByTestId('offer-ride-step-1')).toBeVisible();
  await page.locator('input[type="date"]').fill('2026-05-01');
  await page.getByTestId('offer-ride-step-1').click();
  await page.getByPlaceholder(/toyota camry 2023/i).fill('Toyota Camry 2024');
  await page.getByTestId('offer-ride-step-2').click();
  await page.getByTestId('offer-ride-submit').click();
  await expect(page.getByRole('heading', { name: /ride offer is live/i })).toBeVisible();
});

test('booking a seat surfaces the local-fallback result', async ({ page }) => {
  await page.goto('/app/find-ride');
  await expect(page.getByTestId('find-ride-search')).toBeVisible();
  await page.getByTestId('find-ride-search').click();
  await page.getByRole('button', { name: /view details/i }).first().click();
  await page.getByRole('button', { name: /^reserve seat$/i }).click();
  // The local-fallback result surfaces as a status banner; wait for that first
  // (it is the source of truth), then confirm the trip-detail modal has closed.
  await expect(page.getByRole('status')).toContainText(/request sent|seat confirmed/i);
  await expect(page.getByRole('heading', { name: /trip details/i })).not.toBeVisible();
});
