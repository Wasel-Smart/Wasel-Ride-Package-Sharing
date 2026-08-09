/**
 * Smoke test: verifies the app shows a config error page — not a blank screen
 * or a JS crash — when critical env vars are missing.
 *
 * This is the exact failure mode that caused the Vercel outage: the app
 * silently received an empty VITE_SUPABASE_URL and rendered nothing.
 */
import { expect, test } from '@playwright/test';

test('app shows config error when VITE_SUPABASE_URL is missing', async ({ page }) => {
  // Intercept the HTML and strip the env vars injected by Vite so the
  // browser-side guard in main.tsx sees them as missing.
  await page.route('**/*', async (route, request) => {
    if (request.resourceType() === 'document') {
      const response = await route.fetch();
      let body = await response.text();
      // Blank out the two critical vars that main.tsx checks at boot time.
      body = body
        .replace(/VITE_SUPABASE_URL\s*=\s*["'][^"']*["']/g, 'VITE_SUPABASE_URL=""')
        .replace(/VITE_SUPABASE_ANON_KEY\s*=\s*["'][^"']*["']/g, 'VITE_SUPABASE_ANON_KEY=""');
      await route.fulfill({ response, body });
    } else {
      await route.continue();
    }
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
