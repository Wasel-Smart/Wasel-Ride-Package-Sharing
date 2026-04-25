import type { Page } from '@playwright/test';

const STORAGE_KEY = 'wasel_local_user_v2';
const CONSENT_STORAGE_KEY = 'wasel_analytics_consent_v1';
const DEFAULT_CONSENT_DECISION = 'declined';

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
  backendMode: 'local',
};

export async function seedDemoSession(page: Page) {
  await page.addInitScript(
    ({ authKey, consentKey, consentDecision, user }) => {
      window.localStorage.setItem(consentKey, consentDecision);
      window.localStorage.setItem(authKey, JSON.stringify(user));
    },
    {
      authKey: STORAGE_KEY,
      consentKey: CONSENT_STORAGE_KEY,
      consentDecision: DEFAULT_CONSENT_DECISION,
      user: demoUser,
    },
  );

  await page.goto('/e2e-seed.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ authKey, consentKey, consentDecision, user }) => {
      window.localStorage.setItem(consentKey, consentDecision);
      window.localStorage.setItem(authKey, JSON.stringify(user));
    },
    {
      authKey: STORAGE_KEY,
      consentKey: CONSENT_STORAGE_KEY,
      consentDecision: DEFAULT_CONSENT_DECISION,
      user: demoUser,
    },
  );
}

export async function seedConsentDecision(page: Page, decision = DEFAULT_CONSENT_DECISION) {
  await page.addInitScript(
    ({ consentKey, consentDecision }) => {
      window.localStorage.setItem(consentKey, consentDecision);
    },
    {
      consentKey: CONSENT_STORAGE_KEY,
      consentDecision: decision,
    },
  );
}

export async function signInThroughForm(page: Page, baseUrl: string) {
  const testEmail = process.env.E2E_TEST_EMAIL || 'demo@wasel.jo';
  const testPassword = process.env.E2E_TEST_PASSWORD || 'demo123';
  await seedConsentDecision(page);

  await page.goto(`${baseUrl}/app/auth`);
  await page.getByLabel(/email/i).fill(testEmail);
  await page.getByLabel(/password/i).fill(testPassword);
  await page.getByRole('button', { name: /submit sign in/i }).click();
}
