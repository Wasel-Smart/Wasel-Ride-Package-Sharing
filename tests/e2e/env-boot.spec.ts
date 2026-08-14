/**
 * Smoke test: verifies the app shows a config error page — not a blank screen
 * or a JS crash — when critical env vars are missing.
 *
 * This is the exact failure mode that caused the Vercel outage: the app
 * silently received an empty VITE_SUPABASE_URL and rendered nothing.
 */
import { expect, test } from '@playwright/test';

test('app shows config error when VITE_SUPABASE_URL is missing', async ({ page }) => {
  await page.addInitScript(() => {
    Object.assign(window, {
      __WASEL_E2E_CONFIG__: { supabaseUrl: '', anonKey: '' },
    });
  });

  await page.goto('/');

  // main.tsx renders a "Configuration Error" heading when env vars are absent.
  await expect(page.getByRole('heading', { name: /configuration error/i })).toBeVisible({
    timeout: 10_000,
  });

  // The page must NOT be blank — body must have visible text.
  const bodyText = await page.locator('body').innerText();
  expect(bodyText.trim().length).toBeGreaterThan(0);
});
