import { expect, test } from '@playwright/test';
import { seedDemoSession } from '../../e2e/helpers/session';

test('app entry sends guests into auth with a return target', async ({ page }) => {
  await page.goto('/app', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole('heading', { name: /book a ride, offer a ride, or send a package\./i })).toBeVisible();
  await page.getByRole('button', { name: /^sign in$/i }).first().click();
  await expect(page).toHaveURL(/\/app\/auth/);
  await expect(page).toHaveURL(/returnTo=(%2Fapp%2Ffind-ride|\/app\/find-ride)/);
  await expect(page.getByRole('heading', { name: /sign in to wasel/i })).toBeVisible();
});

test('app entry lets authenticated users open the ride flow', async ({ page }) => {
  await seedDemoSession(page);
  await page.goto('/app', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole('heading', { name: /book a ride, offer a ride, or send a package\./i })).toBeVisible();
  await page.getByRole('button', { name: /^book a ride$/i }).first().click();
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
  await page.getByRole('button', { name: /submit sign in/i }).click();
  await expect(page.getByText(/please enter/i).first()).toBeVisible();
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
  await expect(page.getByRole('heading', { name: /page not found/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /back to wasel/i })).toBeVisible();
});
