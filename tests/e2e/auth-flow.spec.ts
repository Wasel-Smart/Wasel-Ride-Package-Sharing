import { test, expect } from '@playwright/test';
import { seedDemoSession } from '../../e2e/helpers/session';

test('landing page loads and contains Wasel branding', async ({ page }) => {
  await page.goto('/');
  const title = await page.title();
  expect(title.toLowerCase()).toContain('wasel');
});

test('unauthenticated /app redirects to auth with returnTo param', async ({ page }) => {
  await page.goto('/app');
  await expect(page).toHaveURL(/\/app\/auth/);
  await expect(page).toHaveURL(/returnTo=/);
});

test('auth page renders email and password fields', async ({ page }) => {
  await page.goto('/app/auth');
  await expect(page.getByLabel(/email/i)).toBeVisible();
  await expect(page.getByLabel(/password/i)).toBeVisible();
});

test('submitting empty auth form shows validation feedback', async ({ page }) => {
  await page.goto('/app/auth');
  await page.getByRole('button', { name: /submit sign in/i }).click();
  await expect(page.getByText(/please enter/i).first()).toBeVisible();
});

test('register tab renders create account button', async ({ page }) => {
  await page.goto('/app/auth?tab=register');
  await expect(page.getByRole('button', { name: /submit create account/i })).toBeVisible();
});

test('authenticated user lands on find-ride', async ({ page }) => {
  await seedDemoSession(page, 'en');
  await page.goto('/app');
  await expect(page).toHaveURL(/\/app\/find-ride/);
  await expect(page.getByRole('heading', { name: /find a ride/i })).toBeVisible();
});

test('unknown route renders 404 with navigation link', async ({ page }) => {
  await page.goto('/app/this-route-does-not-exist-xyz');
  await expect(page.getByText('404')).toBeVisible();
  await expect(page.getByRole('link', { name: /back|home|wasel/i })).toBeVisible();
});
