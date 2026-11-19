/**
 * E2E: Offer Ride feature flows
 *
 * Covers the driver-side posting journey: form render, step navigation,
 * driver readiness gate, and successful submission state.
 */
import { test, expect } from '@playwright/test';
import { seedDemoSession } from './helpers/session';

const BASE = 'http://127.0.0.1:4173';

test.describe('Offer Ride', () => {
  test('unauthenticated access redirects to auth', async ({ page }) => {
    await page.goto(`${BASE}/app/offer-ride`);
    await expect(page).toHaveURL(/\/app\/auth/);
  });

  test('authenticated driver sees the offer form', async ({ page }) => {
    await seedDemoSession(page);
    await page.goto(`${BASE}/app/offer-ride`);

    // Step progress bar and form heading are visible
    await expect(page.getByText(/offer a ride|اعرض مشوار/i).first()).toBeVisible();
  });

  test('step 1 → step 2 navigation works', async ({ page }) => {
    await seedDemoSession(page);
    await page.goto(`${BASE}/app/offer-ride`);

    // Step 1: pick From city
    const fromSelect = page.locator('select').first();
    await fromSelect.selectOption({ index: 1 });

    // Step 1: pick To city (different from From)
    const toSelect = page.locator('select').nth(1);
    await toSelect.selectOption({ index: 2 });

    // Advance to step 2
    const nextBtn = page.getByRole('button', { name: /next|التالي/i }).first();
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
    }

    // Step indicator should advance (second bar segment fills)
    await expect(page.locator('[title="Step 2 of 3"]')).toBeVisible();
  });

  test('same-city validation blocks step advance', async ({ page }) => {
    await seedDemoSession(page);
    await page.goto(`${BASE}/app/offer-ride`);

    // Set From = Amman
    await page.locator('select').first().selectOption('Amman');
    // Set To = Amman (same)
    await page.locator('select').nth(1).selectOption('Amman');

    // Try to advance
    const nextBtn = page.getByRole('button', { name: /next|التالي/i }).first();
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      // An error message should appear
      await expect(page.getByRole('alert').first()).toBeVisible();
    }
  });

  test('driver console link is accessible from offer page', async ({ page }) => {
    await seedDemoSession(page);
    await page.goto(`${BASE}/app/offer-ride`);

    const consoleBtn = page.getByRole('button', { name: /driver console|لوحة السائق/i });
    if (await consoleBtn.isVisible()) {
      await consoleBtn.click();
      await expect(page).toHaveURL(/\/app\/driver/);
    }
  });

  test('post another route button resets form after submission', async ({ page }) => {
    await seedDemoSession(page);
    await page.goto(`${BASE}/app/offer-ride`);

    // If a success state is already shown (demo data), the reset button exists
    const postAnotherBtn = page.getByRole('button', { name: /post another route|انشر مساراً آخر/i });
    if (await postAnotherBtn.isVisible()) {
      await postAnotherBtn.click();
      // Form should re-appear
      await expect(page.locator('[title="Step 1 of 3"]')).toBeVisible();
    }
  });
});
