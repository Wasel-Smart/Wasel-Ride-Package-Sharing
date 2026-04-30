import { expect, test } from '@playwright/test';
import { seedConsentDecision, seedTestSession } from '../../e2e/helpers/session';

test.beforeEach(async ({ page }) => {
  await seedConsentDecision(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

async function gotoAppEntry(page: Parameters<Parameters<typeof test>[1]>[0]['page']) {
  const heroHeading = page.getByRole('heading', {
    name: /book a ride, offer a ride, or send a package\./i,
  });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.goto('/app', { waitUntil: 'domcontentloaded' });

    try {
      await expect(heroHeading).toBeVisible({ timeout: 8_000 });
      return;
    } catch (error) {
      if (attempt === 2) {
        throw error;
      }

      await page.waitForTimeout(400);
    }
  }
}

test('app entry sends guests into auth with a return target', async ({ page }) => {
  await gotoAppEntry(page);
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole('heading', { name: /book a ride, offer a ride, or send a package\./i })).toBeVisible();
  const signInButton = page.locator('main').getByRole('button', { name: /^sign in$/i }).first();
  await expect(signInButton).toBeVisible();
  await Promise.all([
    page.waitForURL(/\/app\/auth/, { timeout: 20_000 }),
    signInButton.click({ force: true }),
  ]);
  await expect(page).toHaveURL(/returnTo=(%2Fapp%2Ffind-ride|\/app\/find-ride)/);
  await expect(page.getByRole('heading', { name: /sign in to wasel/i })).toBeVisible();
});

test('app entry lets authenticated users open the ride flow', async ({ page }) => {
  await seedTestSession(page);
  await gotoAppEntry(page);
  const signInButton = page.getByRole('button', { name: /^sign in$/i });
  if ((await signInButton.count()) > 0) {
    await page.waitForTimeout(300);
    await page.reload({ waitUntil: 'domcontentloaded' });
  }
  await expect(page).toHaveURL(/\/app$/);
  await expect(signInButton).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /book a ride, offer a ride, or send a package\./i })).toBeVisible();
  const bookRideButton = page.getByRole('button', { name: /^book a ride$/i }).first();
  await expect(bookRideButton).toBeVisible();
  await bookRideButton.click({ force: true });
  await expect(page).toHaveURL(/\/app\/find-ride/);
  await expect(page.getByRole('heading', { name: /^book a ride$/i }).first()).toBeVisible();
});

test('sign in page renders accessible form fields', async ({ page }) => {
  await page.goto('/app/auth', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('textbox', { name: /email address/i })).toBeVisible();
  await expect(page.getByPlaceholder(/enter your password/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /submit sign in/i })).toBeVisible();
});

test('sign in with empty form shows validation feedback', async ({ page }) => {
  await page.goto('/app/auth', { waitUntil: 'domcontentloaded' });
  await page.locator('form.auth-landing__form').evaluate((form) => {
    (form as HTMLFormElement).requestSubmit();
  });
  await expect(page.getByText(/please enter your email address\./i)).toBeVisible();
});

test('register tab is accessible from the sign-in page', async ({ page }) => {
  await page.goto('/app/auth?tab=register', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /create your wasel account/i })).toBeVisible();
  await expect(page.getByPlaceholder(/create a secure password/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
});

test('auth page stays simple on a phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/auth', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: /submit sign in/i })).toBeVisible();
  await expect(page.locator('.auth-landing__support-bar')).toBeVisible();
  await expect(page.getByRole('heading', { name: /sign in to wasel/i })).toBeVisible();
});

test('unknown route renders the 404 page', async ({ page }) => {
  await page.goto('/app/this-route-does-not-exist-xyz', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /this page is off the live network\./i })).toBeVisible();
  await expect(page.getByRole('button', { name: /back to wasel/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /find a ride/i })).toBeVisible();
});
