/**
 * E2E: Find Ride feature flows
 */
import { test, expect } from '@playwright/test';
import { seedDemoSession } from './helpers/session';

const BASE = 'http://127.0.0.1:4173';

test.describe('Find Ride', () => {
  test('unauthenticated access redirects to auth', async ({ page }) => {
    await page.goto(`${BASE}/app/find-ride`);
    await expect(page).toHaveURL(/\/app\/auth/);
  });

  test('authenticated users can search rides and open details', async ({ page }) => {
    await seedDemoSession(page);
    await page.goto(`${BASE}/app/find-ride`);

    await expect(page.getByRole('heading', { name: /find a ride/i })).toBeVisible();
    await page.locator('select').first().selectOption('Amman');
    await page.locator('select').nth(1).selectOption('Aqaba');
    await page.getByRole('button', { name: /search rides/i }).click();

    const bookButton = page.getByRole('button', { name: /book seat/i }).first();
    await expect(bookButton).toBeVisible();
    await bookButton.click();
    await expect(page.getByText(/trip details/i)).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('same-city search shows route validation', async ({ page }) => {
    await seedDemoSession(page);
    await page.goto(`${BASE}/app/find-ride`);

    await page.locator('select').first().selectOption('Amman');
    await page.locator('select').nth(1).selectOption('Amman');
    await page.getByRole('button', { name: /search rides/i }).click();
    await expect(page.getByText(/different cities|choose different/i)).toBeVisible();
  });

  test('package tab remains available from the ride finder', async ({ page }) => {
    await seedDemoSession(page);
    await page.goto(`${BASE}/app/find-ride`);
    await page.getByRole('button', { name: /send package/i }).click();
    await expect(page.getByText(/send package|package logistics/i).first()).toBeVisible();
  });
});
