import type { Page } from '@playwright/test';

// Must match the STORAGE_KEY constant in src/contexts/LocalAuth.tsx
const STORAGE_KEY = process.env.VITE_LOCAL_AUTH_STORAGE_KEY ?? 'wasel_user_session';

export const demoUser = {
  id: 'demo-e2e-user',
  name: 'Demo Rider',
  email: 'demo.rider@example.test',
  phone: '+96279XXXXXXX',
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

export async function seedDemoSession(page: Page, language?: 'ar' | 'en') {
  await page.addInitScript(
    ({ key, user, language: preferredLanguage }) => {
      window.localStorage.setItem(key, JSON.stringify(user));
      if (preferredLanguage) {
        window.localStorage.setItem('wasel-language', preferredLanguage);
      }
    },
    { key: STORAGE_KEY, user: demoUser, language },
  );
}

export async function signInThroughForm(page: Page, baseUrl: string) {
  const testEmail = process.env.E2E_TEST_EMAIL ?? 'demo@example.test';
  const testPassword = process.env.E2E_TEST_PASSWORD ?? 'demo-test-password';

  await page.goto(`${baseUrl}/app/auth`);
  await page.getByLabel(/email/i).fill(testEmail);
  await page.getByLabel(/password/i).fill(testPassword);
  await page.getByRole('button', { name: /submit sign in/i }).click();
}
