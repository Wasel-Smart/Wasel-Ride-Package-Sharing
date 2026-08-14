import { expect, test } from '@playwright/test';
import { seedDemoSession } from '../../e2e/helpers/session';

test('app boots in isolated local E2E mode without production credentials', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('wasel-language', 'en'));
  await seedDemoSession(page);
  await page.goto('/app/packages', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('button', { name: /send package/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /configuration error/i })).toHaveCount(0);
});
