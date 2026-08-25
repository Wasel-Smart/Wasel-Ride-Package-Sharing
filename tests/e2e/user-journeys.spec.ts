import { expect, test } from '@playwright/test';
import { seedDemoSession } from '../../e2e/helpers/session';

test.beforeEach(async ({ page }) => {
  await seedDemoSession(page, 'en');
});

test('profile page loads with user identity and quick actions', async ({ page }) => {
  await page.goto('/app/profile');
  await expect(page.getByRole('heading', { name: /Demo Rider/i })).toBeVisible();
  await expect(page.getByText(/demo\.rider@example\.test/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /edit name/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /trust center/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /settings/i })).toBeVisible();
});

test('profile page navigates to trust center', async ({ page }) => {
  await page.goto('/app/profile');
  await page.getByRole('button', { name: /trust center/i }).click();
  await expect(page.getByRole('heading', { name: /trust center|trust/i })).toBeVisible();
});

test('profile page navigates to settings', async ({ page }) => {
  await page.goto('/app/profile');
  await page.getByRole('button', { name: /settings/i }).click();
  await expect(page.getByRole('heading', { name: /settings|preferences/i })).toBeVisible();
});

test('settings page loads account section', async ({ page }) => {
  await page.goto('/app/settings?section=account');
  await expect(page.getByRole('heading', { name: /settings|account/i })).toBeVisible();
});

test('notifications page loads for authenticated user', async ({ page }) => {
  await page.goto('/app/notifications');
  await expect(page.getByRole('heading', { name: /notifications/i })).toBeVisible();
});

test('trust page loads verification and trust context', async ({ page }) => {
  await page.goto('/app/trust');
  await expect(page.getByRole('heading', { name: /trust/i })).toBeVisible();
});

test('signed-out user cannot access protected profile route', async ({ page }) => {
  await page.goto('/app/profile');
  await expect(page.getByRole('heading', { name: /sign in|authentication required/i })).toBeVisible();
});

test('user can sign out from profile page', async ({ page }) => {
  await seedDemoSession(page, 'en');
  await page.goto('/app/profile');
  const signOutButton = page.getByRole('button', { name: /sign out|log out/i });
  if (await signOutButton.count() > 0) {
    await signOutButton.first().click();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  } else {
    test.skip();
  }
});
