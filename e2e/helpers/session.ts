import type { Page } from '@playwright/test';

const STORAGE_KEY = 'wasel_local_user_v2';
const CONSENT_STORAGE_KEY = 'wasel_analytics_consent_v1';
const SUPABASE_AUTH_STORAGE_KEY = 'wasel-auth-token';
const AUTH_PERSISTENCE_STORAGE_KEY = 'wasel_auth_persistence_v1';
const DEFAULT_CONSENT_DECISION = 'declined';
const AUTH_ROUTE_PATTERN = /\/app\/auth(?:\?|$)/;
const AUTH_ROUTE_STABILIZATION_MS = 1_500;
const AUTH_ROUTE_RETRY_DELAY_MS = 400;
const AUTH_ROUTE_ATTEMPTS = 3;
const ROUTE_RENDER_STABILIZATION_MS = 4_000;

async function landedOnBrowserErrorPage(page: Page) {
  const problemHeading = page.getByRole('heading', {
    name: /looks like there(?:'|\u2019)s a problem with this site/i,
  });
  if (await problemHeading.count()) {
    return true;
  }

  return (await page.getByText(/sent back an error/i).count()) > 0;
}

function isRetryableNavigationError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return /ERR_CONNECTION_REFUSED|ERR_CONNECTION_RESET|Navigation timeout|Target closed/i.test(error.message);
}

export const testUser = {
  id: 'test-e2e-user',
  name: 'Test Rider',
  email: 'test.rider@wasel.jo',
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

export const demoUser = testUser;

export async function seedTestSession(page: Page) {
  await page.addInitScript(
    ({ authKey, authPersistenceKey, consentKey, consentDecision, supabaseAuthKey, user }) => {
      try {
        if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') {
          return;
        }

        window.localStorage.setItem(consentKey, consentDecision);
        window.localStorage.setItem(authPersistenceKey, 'local');
        window.localStorage.setItem(authKey, JSON.stringify(user));
        window.sessionStorage.setItem(authKey, JSON.stringify(user));
        window.localStorage.removeItem(supabaseAuthKey);
        window.sessionStorage.removeItem(supabaseAuthKey);
      } catch {
        // Ignore storage errors in test environment
      }
    },
    {
      authKey: STORAGE_KEY,
      authPersistenceKey: AUTH_PERSISTENCE_STORAGE_KEY,
      consentKey: CONSENT_STORAGE_KEY,
      consentDecision: DEFAULT_CONSENT_DECISION,
      supabaseAuthKey: SUPABASE_AUTH_STORAGE_KEY,
      user: testUser,
    },
  );
}

export async function seedDemoSession(page: Page) {
  await seedTestSession(page);
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

async function routeRendersMain(page: Page, durationMs: number) {
  const deadline = Date.now() + durationMs;

  while (Date.now() < deadline) {
    if ((await page.locator('main[role="main"], main').count()) > 0) {
      return true;
    }

    await page.waitForTimeout(150);
  }

  return (await page.locator('main[role="main"], main').count()) > 0;
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
  let lastError: unknown;

  for (let attempt = 0; attempt < AUTH_ROUTE_ATTEMPTS; attempt += 1) {
    await seedTestSession(page);

    try {
      await page.goto(path, gotoOptions);
    } catch (error) {
      lastError = error;
      if (!isRetryableNavigationError(error) || attempt === AUTH_ROUTE_ATTEMPTS - 1) {
        throw error;
      }

      await page.waitForTimeout(AUTH_ROUTE_RETRY_DELAY_MS);
      continue;
    }

    if (await landedOnBrowserErrorPage(page)) {
      await page.waitForTimeout(AUTH_ROUTE_RETRY_DELAY_MS);
      continue;
    }

    if (
      (await staysAwayFromAuth(page, AUTH_ROUTE_STABILIZATION_MS))
      && (await routeRendersMain(page, ROUTE_RENDER_STABILIZATION_MS))
    ) {
      return;
    }

    await page.waitForTimeout(AUTH_ROUTE_RETRY_DELAY_MS);
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error(`Unable to render authenticated route after ${AUTH_ROUTE_ATTEMPTS} attempts: ${path}`);
}

export async function seedConsentDecision(page: Page, decision = DEFAULT_CONSENT_DECISION) {
  await page.addInitScript(
    ({ authPersistenceKey, consentKey, consentDecision }) => {
      try {
        if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') {
          return;
        }

        window.localStorage.setItem(authPersistenceKey, 'local');
        window.localStorage.setItem(consentKey, consentDecision);
      } catch {
        // Ignore storage errors in test environment
      }
    },
    {
      authPersistenceKey: AUTH_PERSISTENCE_STORAGE_KEY,
      consentKey: CONSENT_STORAGE_KEY,
      consentDecision: decision,
    },
  );
}

export async function signInThroughForm(page: Page, baseUrl: string) {
  const testEmail = process.env.E2E_TEST_EMAIL || 'qa@wasel.jo';
  const testPassword = process.env.E2E_TEST_PASSWORD || 'wasel123';
  await seedConsentDecision(page);

  await page.goto(`${baseUrl}/app/auth`);
  await page.getByLabel(/email/i).fill(testEmail);
  await page.getByLabel(/password/i).fill(testPassword);
  await page.getByRole('button', { name: /submit sign in/i }).click();
}
