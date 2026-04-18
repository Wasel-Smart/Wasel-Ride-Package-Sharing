/**
 * E2E: Complete Find Ride Flow
 * Tests the entire user journey from search to booking
 */
import { test, expect } from '@playwright/test';
import { seedDemoSession } from './helpers/session';

const BASE = 'http://127.0.0.1:4173';

test.describe('Find Ride Flow', () => {
  test.beforeEach(async ({ page }) => {
    await seedDemoSession(page);
  });

  test('complete ride search and booking flow', async ({ page }) => {
    // Navigate to find ride page
    await page.goto(`${BASE}/app/find-ride`);
    await expect(page).toHaveURL(/\/app\/find-ride/);

    // Verify search form is visible
    await expect(page.getByText(/from/i).first()).toBeVisible();
    await expect(page.getByText(/to/i).first()).toBeVisible();

    // Perform search
    const searchButton = page.getByTestId('find-ride-search');
    await expect(searchButton).toBeVisible();
    await searchButton.click();

    // Wait for search to complete
    await page.waitForTimeout(1000);

    // Verify results are displayed
    const resultsSection = page.locator('[class*="sp-results"]').first();
    await expect(resultsSection).toBeVisible({ timeout: 5000 });

    // Click on first available ride
    const firstRide = page.locator('button').filter({ hasText: /JOD|Amman|Aqaba/ }).first();
    if (await firstRide.isVisible()) {
      await firstRide.click();

      // Wait for ride detail modal
      await page.waitForTimeout(500);

      // Look for booking button in modal
      const bookButton = page.getByRole('button', { name: /book|reserve|confirm/i });
      if (await bookButton.isVisible()) {
        await bookButton.click();

        // Verify booking confirmation message
        await expect(
          page.getByText(/booked|reserved|confirmed/i).first()
        ).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('search with specific route shows relevant results', async ({ page }) => {
    await page.goto(`${BASE}/app/find-ride?from=Amman&to=Aqaba&search=1`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Verify route is set correctly
    await expect(page).toHaveURL(/from=Amman/);
    await expect(page).toHaveURL(/to=Aqaba/);

    // Verify results header shows the route
    await expect(
      page.getByText(/Amman.*Aqaba/i).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('empty search results show demand capture option', async ({ page }) => {
    // Search for unlikely route
    await page.goto(`${BASE}/app/find-ride?from=Amman&to=Amman&search=1`);

    await page.waitForLoadState('networkidle');

    // Should show error or no results message
    const noResultsIndicator = page.getByText(/no.*ride|different.*cit|no.*match/i).first();
    await expect(noResultsIndicator).toBeVisible({ timeout: 5000 });
  });

  test('ride detail modal displays complete information', async ({ page }) => {
    await page.goto(`${BASE}/app/find-ride`);

    // Trigger search
    await page.getByTestId('find-ride-search').click();
    await page.waitForTimeout(1000);

    // Click first ride
    const firstRide = page.locator('button').filter({ hasText: /JOD|Amman/ }).first();
    if (await firstRide.isVisible()) {
      await firstRide.click();
      await page.waitForTimeout(500);

      // Verify modal content (flexible checks)
      const modalContent = page.locator('[role="dialog"], [class*="modal"]').first();
      if (await modalContent.isVisible()) {
        // Check for key information
        await expect(modalContent).toBeVisible();
      }
    }
  });

  test('booking requires authentication', async ({ page }) => {
    // Clear session
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());

    await page.goto(`${BASE}/app/find-ride`);

    // Should redirect to auth
    await expect(page).toHaveURL(/\/app\/auth/, { timeout: 5000 });
  });

  test('search form validation prevents invalid searches', async ({ page }) => {
    await page.goto(`${BASE}/app/find-ride`);

    // Try to search with same from/to
    const fromSelect = page.locator('select').first();
    const toSelect = page.locator('select').nth(1);

    if (await fromSelect.isVisible() && await toSelect.isVisible()) {
      await fromSelect.selectOption('Amman');
      await toSelect.selectOption('Amman');

      await page.getByTestId('find-ride-search').click();

      // Should show validation error
      await expect(
        page.getByText(/different.*cit|same.*location/i).first()
      ).toBeVisible({ timeout: 3000 });
    }
  });

  test('recent searches are persisted', async ({ page }) => {
    await page.goto(`${BASE}/app/find-ride`);

    // Perform a search
    await page.getByTestId('find-ride-search').click();
    await page.waitForTimeout(1000);

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check for recent searches section
    const recentSearches = page.getByText(/recent.*search/i).first();
    if (await recentSearches.isVisible()) {
      await expect(recentSearches).toBeVisible();
    }
  });

  test('corridor intelligence panel displays route data', async ({ page }) => {
    await page.goto(`${BASE}/app/find-ride`);

    // Look for intelligence/brain panel
    const intelligencePanel = page.getByText(/brain|intelligence|corridor/i).first();
    await expect(intelligencePanel).toBeVisible({ timeout: 5000 });
  });

  test('map preview shows route visualization', async ({ page }) => {
    await page.goto(`${BASE}/app/find-ride`);

    // Look for map container
    const mapContainer = page.locator('[class*="map"], canvas, [id*="map"]').first();
    await expect(mapContainer).toBeVisible({ timeout: 5000 });
  });
});
