import { test, expect } from '@playwright/test';
import { seedDemoSession } from '../../e2e/helpers/session';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('wasel-language', 'en'));
});

test('landing page loads and contains Wasel branding', async ({ page }) => {
  await page.goto('/');
  const title = await page.title();
  expect(title.toLowerCase()).toContain('wasel');
});

test('unauthenticated /app renders the public landing surface', async ({ page }) => {
  await page.goto('/app');
  await expect(page.getByRole('heading', { name: /move across jordan for less/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
});

test('auth page renders email and password fields', async ({ page }) => {
  await page.goto('/app/auth');
  await expect(page.getByLabel(/email/i)).toBeVisible();
  // Use textbox role to avoid matching the "Show password" toggle button
  await expect(page.getByRole('textbox', { name: /password/i })).toBeVisible();
});

test('submitting empty auth form shows validation feedback', async ({ page }) => {
  await page.goto('/app/auth');
  await page.getByRole('button', { name: /submit sign in/i }).click();
  await expect(page.getByText(/please enter/i).first()).toBeVisible();
});

test('register tab renders create account button', async ({ page }) => {
  await page.goto('/app/auth?tab=register');
  // Actual button aria-label is "Submit sign up", not "Submit create account"
  await expect(page.getByRole('button', { name: /submit sign up/i })).toBeVisible();
});

test('authenticated user receives the signed-in landing surface', async ({ page }) => {
  await seedDemoSession(page, 'en');
  await page.goto('/app');
  await expect(page.getByRole('heading', { name: /move across jordan for less/i })).toBeVisible();
  // Use the avatar button which has a stable name "DR Demo"
  await expect(page.getByRole('button', { name: /DR Demo/i })).toBeVisible();
});

test('unknown route renders 404 with navigation link', async ({ page }) => {
  await page.goto('/app/this-route-does-not-exist-xyz');
  await expect(page.getByText('404')).toBeVisible();
  await expect(page.getByRole('link', { name: /back|home|wasel/i })).toBeVisible();
});
