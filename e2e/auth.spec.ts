/**
 * E2E: Authentication and entry flows
 */
import { test, expect } from '@playwright/test';
import { seedDemoSession, signInThroughForm } from './helpers/session';

const BASE = 'http://127.0.0.1:4173';

test('app entry redirects unauthenticated users into auth with a return target', async ({ page }) => {
  await page.goto(`${BASE}/app`);
  await expect(page).toHaveURL(/\/app\/auth/);
  await expect(page).toHaveURL(/returnTo=(%2Fapp%2Ffind-ride|\/app\/find-ride)/);
});

test('app entry routes authenticated users to find-ride', async ({ page }) => {
  await seedDemoSession(page);
  await page.goto(`${BASE}/app`);
  await expect(page).toHaveURL(/\/app\/find-ride/);
  await expect(page.getByRole('heading', { name: /find a ride/i })).toBeVisible();
});

test('sign in page renders accessible form fields', async ({ page }) => {
  await page.goto(`${BASE}/app/auth`);
  await expect(page.getByLabel(/email/i)).toBeVisible();
  await expect(page.getByLabel(/password/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /submit sign in/i })).toBeVisible();
});

test('sign in with empty form shows validation feedback', async ({ page }) => {
  await page.goto(`${BASE}/app/auth`);
  await page.getByRole('button', { name: /submit sign in/i }).click();
  await expect(page.getByText(/please enter/i).first()).toBeVisible();
});

test('sign in through the form navigates into the app', async ({ page }) => {
  await signInThroughForm(page, BASE);
  await expect(page).toHaveURL(/\/app\/find-ride/);
});

test('register tab is accessible from the sign-in page', async ({ page }) => {
  await page.goto(`${BASE}/app/auth?tab=register`);
  await expect(page.getByRole('button', { name: /submit create account/i })).toBeVisible();
});

test('unknown route renders the 404 page', async ({ page }) => {
  await page.goto(`${BASE}/app/this-route-does-not-exist-xyz`);
  await expect(page.getByText('404')).toBeVisible();
  await expect(page.getByRole('link', { name: /back|home|wasel/i })).toBeVisible();
});
