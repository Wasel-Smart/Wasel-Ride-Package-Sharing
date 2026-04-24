import type { Page } from '@playwright/test';

const STORAGE_KEY = 'wasel_local_user_v2';
const WALLET_SNAPSHOT_STORAGE_KEY = 'wasel-wallet-snapshot-v2:demo-e2e-user';

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

const demoWalletSnapshot = {
  storedAt: Date.now(),
  snapshot: {
    data: {
      wallet: {
        id: 'wallet-demo-e2e',
        userId: demoUser.id,
        walletType: 'custodial',
        status: 'active',
        currency: 'JOD',
        autoTopUp: false,
        autoTopUpAmount: 20,
        autoTopUpThreshold: 5,
        paymentMethods: [
          {
            id: 'pm-demo-card',
            type: 'card',
            provider: 'stripe',
            label: 'Visa ending 4242',
            last4: '4242',
            expiryMonth: 12,
            expiryYear: 2030,
            isDefault: true,
          },
        ],
        createdAt: '2026-03-01T00:00:00.000Z',
      },
      balance: 145.75,
      pendingBalance: 18,
      rewardsBalance: 12,
      total_earned: 520,
      total_spent: 386.25,
      total_deposited: 640,
      currency: 'JOD',
      pinSet: true,
      autoTopUp: false,
      transactions: [
        {
          id: 'tx-demo-topup',
          type: 'deposit',
          description: 'Wallet deposit settled',
          amount: 80,
          currency: 'JOD',
          status: 'posted',
          createdAt: '2026-04-15T09:00:00.000Z',
          referenceType: 'wallet_topup',
          referenceId: 'topup-demo-1',
        },
        {
          id: 'tx-demo-ride',
          type: 'ride_payment',
          description: 'Ride payment to Aqaba',
          amount: -24.25,
          currency: 'JOD',
          status: 'posted',
          createdAt: '2026-04-16T11:30:00.000Z',
          referenceType: 'trip',
          referenceId: 'trip-demo-1',
        },
      ],
      activeEscrows: [
        {
          id: 'escrow-demo-1',
          type: 'ride',
          amount: 18,
          tripId: 'trip-demo-2',
          status: 'held',
          createdAt: '2026-04-17T08:30:00.000Z',
          expectedReleaseAt: '2026-04-17T11:30:00.000Z',
        },
      ],
      activeRewards: [
        {
          id: 'reward-demo-1',
          description: 'Loyal rider reward',
          amount: 5,
          expirationDate: '2026-05-31T23:59:59.000Z',
        },
      ],
      subscription: null,
    },
    meta: {
      source: 'edge-api',
      degraded: false,
      fetchedAt: '2026-04-17T08:30:00.000Z',
    },
  },
};

export async function seedDemoSession(page: Page) {
  await page.addInitScript(
    ({ key, user, walletSnapshotKey, walletSnapshot }) => {
      window.localStorage.setItem(key, JSON.stringify(user));
      window.localStorage.setItem(walletSnapshotKey, JSON.stringify(walletSnapshot));
    },
    {
      key: STORAGE_KEY,
      user: demoUser,
      walletSnapshotKey: WALLET_SNAPSHOT_STORAGE_KEY,
      walletSnapshot: demoWalletSnapshot,
    },
  );

  await page.goto('/e2e-seed.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ key, user, walletSnapshotKey, walletSnapshot }) => {
      window.localStorage.setItem(key, JSON.stringify(user));
      window.localStorage.setItem(walletSnapshotKey, JSON.stringify(walletSnapshot));
    },
    {
      key: STORAGE_KEY,
      user: demoUser,
      walletSnapshotKey: WALLET_SNAPSHOT_STORAGE_KEY,
      walletSnapshot: demoWalletSnapshot,
    },
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
