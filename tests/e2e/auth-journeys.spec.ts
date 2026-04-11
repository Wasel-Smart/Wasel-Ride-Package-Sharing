import { expect, test } from '@playwright/test';
import { seedDemoSession } from '../../e2e/helpers/session';

test('app entry redirects unauthenticated users into auth with a return target', async ({ page }) => {
  await page.goto('/app');
  await expect(page).toHaveURL(/\/app\/auth/);
  await expect(page.getByRole('heading', { name: /^sign in$/i })).toBeVisible();
  await expect(page).toHaveURL(/returnTo=(%2Fapp%2Ffind-ride|\/app\/find-ride)/);
});

test('app entry routes authenticated users to find-ride', async ({ page }) => {
  await seedDemoSession(page);
  await page.goto('/app');
  await expect(page).toHaveURL(/\/app\/find-ride/);
  await expect(page.getByRole('heading', { name: /find a ride|find a shared route/i })).toBeVisible();
});

test('sign in page renders accessible form fields', async ({ page }) => {
  await page.goto('/app/auth', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /continue with facebook/i })).toBeVisible();
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
  await expect(page.getByRole('heading', { name: /^sign up$/i })).toBeVisible();
  await expect(page.getByPlaceholder(/create a secure password/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /submit sign up/i })).toBeVisible();
});

test('auth page stays simple on a phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/auth', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: /submit sign in/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
  await expect(page.getByText(/sign in to continue/i)).toBeVisible();
});

test('unknown route renders the 404 page', async ({ page }) => {
  await page.goto('/app/this-route-does-not-exist-xyz', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /page not found/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /back to wasel/i })).toBeVisible();
});
