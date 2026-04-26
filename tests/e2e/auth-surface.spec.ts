import { expect, test, type Page } from '@playwright/test';
import { seedConsentDecision } from '../../e2e/helpers/session';

test.beforeEach(async ({ page }) => {
  await seedConsentDecision(page);
});

async function expectOptionalAuthProviderButtons(page: Page) {
  const optionalButtons = [
    page.getByRole('button', { name: /continue with google/i }),
    page.getByRole('button', { name: /continue with facebook/i }),
  ];

  for (const button of optionalButtons) {
    if ((await button.count()) > 0) {
      await expect(button.first()).toBeVisible();
    }
  }
}

test('landing page exposes the quick auth gateway for guests', async ({ page }) => {
  await page.goto('/');
  await expectOptionalAuthProviderButtons(page);
  await expect(page.getByRole('button', { name: /continue with email/i })).toBeVisible();
});

test('auth page renders the simplified email flow', async ({ page }) => {
  await page.goto('/app/auth', { waitUntil: 'domcontentloaded' });
  await expectOptionalAuthProviderButtons(page);
  await expect(page.getByRole('textbox', { name: /email address/i })).toBeVisible();
  await expect(page.getByPlaceholder(/enter your password/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /submit sign in/i })).toBeVisible();
});

test('auth page keeps the essentials visible on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/auth', { waitUntil: 'domcontentloaded' });
  await expectOptionalAuthProviderButtons(page);
  await expect(page.getByRole('textbox', { name: /email address/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /submit sign in/i })).toBeVisible();
  await expect(page.getByText(/sign in to continue/i)).toBeVisible();
});
