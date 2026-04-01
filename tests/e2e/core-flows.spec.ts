import { expect, test } from '@playwright/test';

const demoUser = {
  id: 'demo-user-e2e',
  name: 'E2E Rider',
  email: 'e2e@wasel.test',
  phone: '+962790000999',
  role: 'both',
  balance: 32,
  rating: 4.9,
  trips: 12,
  verified: true,
  sanadVerified: true,
  verificationLevel: 'level_3',
  walletStatus: 'active',
  avatar: undefined,
  joinedAt: '2026-01-01',
  emailVerified: true,
  phoneVerified: true,
  trustScore: 96,
  backendMode: 'demo',
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript((user) => {
    window.localStorage.setItem('wasel_local_user_v2', JSON.stringify(user));
  }, demoUser);
});

test('find ride books a seat', async ({ page }) => {
  await page.goto('/app/find-ride');
  await page.getByTestId('find-ride-search').click();
  await page.getByRole('button', { name: /book seat/i }).first().click();
  await page.getByRole('button', { name: /reserve this seat/i }).click();
  await expect(page.getByText(/is reserved\. ticket .*saved in your trips|was sent to .* for approval/i)).toBeVisible();
});

test('offer ride posts a connected trip', async ({ page }) => {
  await page.goto('/app/offer-ride');
  await page.locator('input[type="date"]').fill('2026-05-01');
  await page.getByTestId('offer-ride-step-1').click();
  await page.getByPlaceholder(/toyota camry 2023/i).fill('Toyota Camry 2024');
  await page.getByTestId('offer-ride-step-2').click();
  await page.getByTestId('offer-ride-submit').click();
  await expect(page.getByText(/ride posted/i)).toBeVisible();
});

test('bus flow reserves a seat', async ({ page }) => {
  await page.goto('/app/bus');
  await page.getByTestId('bus-confirm-booking').click();
  await expect(page.getByText(/seat confirmed/i)).toBeVisible();
});

test('packages flow creates tracking', async ({ page }) => {
  await page.goto('/app/packages');
  await page.getByTestId('package-recipient-name').fill('Receiver Test');
  await page.getByTestId('package-recipient-phone').fill('+962790000888');
  await page.getByTestId('package-create-request').click();
  await expect(page.getByText(/tracking id/i)).toBeVisible();
  await expect(page.getByText(/handoff code/i)).toBeVisible();
});
