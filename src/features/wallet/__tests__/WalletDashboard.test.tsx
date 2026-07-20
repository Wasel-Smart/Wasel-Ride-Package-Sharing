import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { WalletDashboard } from '../WalletDashboard';

// Mock dependency modules — paths are relative to this __tests__ folder,
// three levels up to src (../../../), matching the depth actually used by
// the modules that import them from src/features/wallet/.
vi.mock('../../../services/walletApi', () => ({
  walletApi: {
    getWallet: vi.fn(async () => ({
      wallet: {
        id: 'wallet-123',
        userId: 'user-1',
        status: 'active',
        currency: 'JOD',
        autoTopUp: false,
        autoTopUpAmount: 10,
        autoTopUpThreshold: 5,
        paymentMethods: [],
        createdAt: null,
      },
      balance: 15.5,
      pendingBalance: 0,
      rewardsBalance: 0,
      total_earned: 0,
      total_spent: 0,
      total_deposited: 0,
      currency: 'JOD',
      pinSet: false,
      autoTopUp: false,
      transactions: [],
      activeEscrows: [],
      activeRewards: [],
      subscription: null,
    })),
    getInsights: vi.fn(async () => null),
  },
  getWalletCapabilities: vi.fn(() => ({
    topUp: true,
    rewardClaim: true,
    subscription: true,
    pin: true,
    send: true,
    withdraw: true,
    autoTopUp: true,
  })),
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('../../../contexts/LocalAuth', () => ({
  useLocalAuth: () => ({
    user: { id: 'user-1' },
  }),
}));

vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    dir: 'ltr',
    t: (key: string) => key,
  }),
}));

vi.mock('../../../hooks/useIframeSafeNavigate', () => ({
  useIframeSafeNavigate: () => vi.fn(),
}));

vi.mock('../../../services/movementMembership', () => ({
  setWaselPlusActive: vi.fn(),
}));

describe('WalletDashboard Component', () => {
  it('renders successfully', async () => {
    render(
      <MemoryRouter>
        <WalletDashboard />
      </MemoryRouter>,
    );
    // Just verify the initial component render is safe
    const headings = await screen.findAllByText(/wallet|balance/i);
    expect(headings.length).toBeGreaterThan(0);
  });
});
