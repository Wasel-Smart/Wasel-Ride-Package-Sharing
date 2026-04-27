import type { Page } from '@playwright/test';

const STORAGE_KEY = 'wasel_local_user_v2';
const CONSENT_STORAGE_KEY = 'wasel_analytics_consent_v1';
const SUPABASE_AUTH_STORAGE_KEY = 'wasel-auth-token';
const DEFAULT_CONSENT_DECISION = 'declined';
const AUTH_ROUTE_PATTERN = /\/app\/auth(?:\?|$)/;
const AUTH_ROUTE_STABILIZATION_MS = 1_500;
const AUTH_ROUTE_RETRY_DELAY_MS = 400;
const AUTH_ROUTE_ATTEMPTS = 3;

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
    ({ authKey, consentKey, consentDecision, supabaseAuthKey, user }) => {
      try {
        if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') {
          return;
        }

        window.localStorage.setItem(consentKey, consentDecision);
        window.localStorage.setItem(authKey, JSON.stringify(user));
        window.localStorage.removeItem(supabaseAuthKey);
      } catch {}
    },
    {
      authKey: STORAGE_KEY,
      consentKey: CONSENT_STORAGE_KEY,
      consentDecision: DEFAULT_CONSENT_DECISION,
      supabaseAuthKey: SUPABASE_AUTH_STORAGE_KEY,
      user: demoUser,
    },
  );
}

async function staysAwayFromAuth(page: Page, durationMs: number) {
  const deadline = Date.now() + durationMs;

  while (Date.now() < deadline) {
    if (AUTH_ROUTE_PATTERN.test(page.url())) {
      return false;
    }

    await page.waitForTimeout(150);
  }

  return !AUTH_ROUTE_PATTERN.test(page.url());
}

export async function gotoAuthedRoute(
  page: Page,
  path: string,
  options?: { timeout?: number; waitUntil?: 'commit' | 'domcontentloaded' | 'load' | 'networkidle' },
) {
  const gotoOptions = {
    waitUntil: 'domcontentloaded' as const,
    ...options,
  };

  for (let attempt = 0; attempt < AUTH_ROUTE_ATTEMPTS; attempt += 1) {
    await seedDemoSession(page);
    await page.goto(path, gotoOptions);

    if (await staysAwayFromAuth(page, AUTH_ROUTE_STABILIZATION_MS)) {
      return;
    }

    await page.waitForTimeout(AUTH_ROUTE_RETRY_DELAY_MS);
  }
}

export async function seedConsentDecision(page: Page, decision = DEFAULT_CONSENT_DECISION) {
  await page.addInitScript(
    ({ consentKey, consentDecision }) => {
      try {
        if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') {
          return;
        }

        window.localStorage.setItem(consentKey, consentDecision);
      } catch {}
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
