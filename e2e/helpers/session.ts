import type { Page } from '@playwright/test';

// Must match the STORAGE_KEY constant in src/contexts/LocalAuth.tsx
const STORAGE_KEY = 'wasel_user_session';

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
  joinedAt: '2026-03-01',
  emailVerified: true,
  phoneVerified: true,
  twoFactorEnabled: false,
  trustScore: 92,
  backendMode: 'supabase',
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
  await page.goto(`${baseUrl}/app/auth`);
  await page.getByLabel(/email/i).fill('demo@wasel.jo');
  await page.getByLabel(/password/i).fill('demo123');
  await page.getByRole('button', { name: /submit sign in/i }).click();
}
