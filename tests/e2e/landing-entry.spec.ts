import { expect, test } from '@playwright/test';
import {
  APP_ENTRY_DEFAULT_ROUTE,
  buildRideSearchPath,
} from '../../src/features/home/appEntryContracts';

test('guest landing routes email entry into auth with return target', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: /book a ride, offer a ride, or send a package\./i }),
  ).toBeVisible();
  const emailButton = page.getByRole('button', { name: /continue with email/i }).first();
  await expect(emailButton).toBeVisible();
  await emailButton.focus();
  await emailButton.press('Enter');
  await expect(page).toHaveURL(/\/app\/auth\?/);

  const url = new URL(page.url());
  expect(url.pathname).toBe('/app/auth');
  expect(url.searchParams.get('tab')).toBe('signin');
  expect(url.searchParams.get('returnTo')).toBe(
    buildRideSearchPath({ ...APP_ENTRY_DEFAULT_ROUTE }),
  );
});
