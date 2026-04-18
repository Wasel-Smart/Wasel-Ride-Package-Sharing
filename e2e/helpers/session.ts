import type { Page } from '@playwright/test';

const STORAGE_KEY = 'wasel_local_user_v2';

export const demoUser = {
  id: 'demo-e2e-user',
  name: 'Demo Rider',
  email: 'demo.rider@wasel.jo',
  phone: '+962790000999',
  role: 'both',
  balance: 145.75,
  rating: 4.8,
  trips: 18,
  verified: true,
  sanadVerified: true,
  verificationLevel: 'level_3',
  walletStatus: 'active',
  avatar: undefined,
  joinedAt: '2026-03-01',
  emailVerified: true,
  phoneVerified: true,
  twoFactorEnabled: false,
  trustScore: 92,
  backendMode: 'demo',
};

export async function seedDemoSession(page: Page) {
  await page.addInitScript(
    ({ key, user }) => {
      window.localStorage.setItem(key, JSON.stringify(user));
    },
    { key: STORAGE_KEY, user: demoUser },
  );
}

export async function signInThroughForm(page: Page, baseUrl: string) {
  const testEmail = process.env.E2E_TEST_EMAIL || 'demo@wasel.jo';
  const testPassword = process.env.E2E_TEST_PASSWORD || 'demo123';
  
  await page.goto(`${baseUrl}/app/auth`);
  await page.getByLabel(/email/i).fill(testEmail);
  await page.getByLabel(/password/i).fill(testPassword);
  await page.getByRole('button', { name: /submit sign in/i }).click();
}
