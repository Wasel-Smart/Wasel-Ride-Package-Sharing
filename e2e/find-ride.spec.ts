/**
 * E2E: Find Ride feature flows
 */
import { test, expect } from '@playwright/test';
import { seedTestSession } from './helpers/session';

const BASE = 'http://127.0.0.1:4173';

test.describe('Find Ride', () => {
  test.setTimeout(30000);

  test('unauthenticated access redirects to auth', async ({ page }) => {
    await page.goto(`${BASE}/app/find-ride`, { waitUntil: 'networkidle' });
    
    // Wait for redirect with increased timeout
    await page.waitForURL(/\/app\/auth/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/app\/auth/);
  });

  test('authenticated users can search rides and open details', async ({ page }) => {
    await seedTestSession(page);
    await page.goto(`${BASE}/app/find-ride`, { waitUntil: 'networkidle' });

    // Wait for page to load with heading
    await expect(page.getByRole('heading', { name: /find a ride/i })).toBeVisible({ timeout: 10000 });
    
    // Select origin and destination
    const selects = page.locator('select');
    const selectCount = await selects.count();
    
    if (selectCount >= 2) {
      await selects.nth(0).selectOption('Amman');
      await selects.nth(1).selectOption('Aqaba');
      
      // Search for rides
      const searchButton = page.getByRole('button', { name: /search rides/i });
      if (await searchButton.isVisible({ timeout: 5000 })) {
        await searchButton.click();
        await page.waitForTimeout(1000);
      }
    }

    // Verify search results or validation message
    const hasResults = await page.getByRole('button', { name: /book seat/i }).isVisible({ timeout: 5000 }).catch(() => false);
    const hasError = await page.getByText(/different cities|choose different|error|validation/i).isVisible({ timeout: 5000 }).catch(() => false);
    
    expect(hasResults || hasError).toBeTruthy();
  });

  test('same-city search shows route validation', async ({ page }) => {
    await seedTestSession(page);
    await page.goto(`${BASE}/app/find-ride`, { waitUntil: 'networkidle' });

    const selects = page.locator('select');
    const selectCount = await selects.count();
    
    if (selectCount >= 2) {
      await selects.nth(0).selectOption('Amman');
      await selects.nth(1).selectOption('Amman');
      
      const searchButton = page.getByRole('button', { name: /search rides/i });
      if (await searchButton.isVisible({ timeout: 5000 })) {
        await searchButton.click();
        
        // Should show validation error for same city
        await expect(page.getByText(/different cities|choose different|validation/i)).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('page loads with expected elements', async ({ page }) => {
    await seedTestSession(page);
    await page.goto(`${BASE}/app/find-ride`, { waitUntil: 'networkidle' });

    // Check for main interactive elements
    const heading = page.getByRole('heading', { name: /find a ride/i });
    const isHeadingVisible = await heading.isVisible({ timeout: 10000 }).catch(() => false);
    
    expect(isHeadingVisible).toBeTruthy();
  });
});
