import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { useWalletDashboardController } from '../useWalletDashboardController';
import type { WalletData } from '../../../services/wallet/walletTypes';

// Mock conventions match src/features/wallet/__tests__/WalletDashboard.test.tsx
// (paths are relative to this __tests__ folder — three levels up to src/).

const navigateMock = vi.fn();
vi.mock('../../../hooks/useIframeSafeNavigate', () => ({
  useIframeSafeNavigate: () => navigateMock,
}));

const toastMock = { success: vi.fn(), error: vi.fn(), info: vi.fn() };
vi.mock('sonner', () => ({ toast: toastMock }));

let mockAuthUser: { id: string } | null = { id: 'user-1' };
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockAuthUser }),
}));

vi.mock('../../../contexts/LocalAuth', () => ({
  useLocalAuth: () => ({ user: null }),
}));

vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', dir: 'ltr', t: (key: string) => key }),
}));

vi.mock('../../../utils/supabase/info', () => ({
  projectId: 'test-project',
  publicAnonKey: 'test-anon-key',
}));

vi.mock('../../../services/movementMembership', () => ({
  setWaselPlusActive: vi.fn(),
}));

const walletApiMocks = vi.hoisted(() => ({
  getWallet: vi.fn(),
  getInsights: vi.fn(),
  topUp: vi.fn(),
  withdraw: vi.fn(),
  sendMoney: vi.fn(),
  setPin: vi.fn(),
  claimReward: vi.fn(),
  setAutoTopUp: vi.fn(),
  subscribe: vi.fn(),
}));
vi.mock('../../../services/wallet/walletApi', () => ({
  walletApi: walletApiMocks,
  getWalletCapabilities: vi.fn(() => ({
    topUp: true, rewardClaim: true, subscription: true, pin: true,
    send: true, withdraw: true, autoTopUp: true,
  })),
}));

function makeWallet(overrides: Partial<WalletData> = {}): WalletData {
  return {
    wallet: {
      id: 'w1', userId: 'user-1', status: 'active', currency: 'JOD',
      autoTopUp: false, autoTopUpAmount: 20, autoTopUpThreshold: 5,
      paymentMethods: [], createdAt: null,
    },
    balance: 100, pendingBalance: 0, rewardsBalance: 0,
    total_earned: 0, total_spent: 0, total_deposited: 0,
    currency: 'JOD', pinSet: false, autoTopUp: false,
    transactions: [], activeEscrows: [], activeRewards: [],
    subscription: null,
    ...overrides,
  };
}

function renderController(initialPath = '/app/wallet') {
  return renderHook(() => useWalletDashboardController(), {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={[initialPath]}>{children}</MemoryRouter>
    ),
  });
}

describe('useWalletDashboardController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = { id: 'user-1' };
    walletApiMocks.getWallet.mockResolvedValue(makeWallet());
    walletApiMocks.getInsights.mockResolvedValue({ totalTransactions: 0 });
  });

  describe('load lifecycle', () => {
    it('loads the wallet on mount and hydrates auto-top-up fields from it', async () => {
      walletApiMocks.getWallet.mockResolvedValue(
        makeWallet({ wallet: { ...makeWallet().wallet, autoTopUp: true, autoTopUpAmount: 40, autoTopUpThreshold: 8 } }),
      );

      const { result } = renderController();

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(walletApiMocks.getWallet).toHaveBeenCalledWith('user-1');
      expect(result.current.walletData?.balance).toBe(100);
      expect(result.current.autoTopUpEnabled).toBe(true);
      expect(result.current.autoTopUpAmount).toBe('40');
      expect(result.current.autoTopUpThreshold).toBe('8');
      expect(result.current.walletUnavailable).toBe(false);
    });

    it('redirects to auth and skips fetching when there is no signed-in user', async () => {
      mockAuthUser = null;
      const { result } = renderController();

      await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/app/auth?returnTo=/app/wallet'));
      expect(walletApiMocks.getWallet).not.toHaveBeenCalled();
      expect(result.current.shouldRedirectToAuth).toBe(true);
    });

    it('marks the wallet unavailable (without throwing) when the fetch fails', async () => {
      walletApiMocks.getWallet.mockRejectedValue(new Error('backend down'));
      const { result } = renderController();

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.walletData).toBeNull();
      expect(result.current.walletUnavailable).toBe(true);
    });
  });

  describe('handleTopUp', () => {
    it('rejects an invalid amount without calling the API', async () => {
      const { result } = renderController();
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => result.current.setTopUpAmount('0'));
      await act(async () => { await result.current.handleTopUp(); });

      expect(toastMock.error).toHaveBeenCalledWith('Enter a valid amount');
      expect(walletApiMocks.topUp).not.toHaveBeenCalled();
    });

    it('redirects to checkout and does NOT refetch the wallet when a checkoutUrl is returned', async () => {
      const originalLocation = window.location;
      const assignSpy = vi.fn();
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: { ...originalLocation, assign: assignSpy },
      });
      walletApiMocks.topUp.mockResolvedValue({ payment: { checkoutUrl: 'https://checkout.example/abc' } });

      const { result } = renderController();
      await waitFor(() => expect(result.current.loading).toBe(false));
      walletApiMocks.getWallet.mockClear();

      act(() => result.current.setTopUpAmount('25'));
      await act(async () => { await result.current.handleTopUp(); });

      expect(assignSpy).toHaveBeenCalledWith('https://checkout.example/abc');
      expect(walletApiMocks.getWallet).not.toHaveBeenCalled();
      Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
    });

    it('shows a success toast, resets the form, and refetches when there is no checkoutUrl', async () => {
      walletApiMocks.topUp.mockResolvedValue({ success: true });

      const { result } = renderController();
      await waitFor(() => expect(result.current.loading).toBe(false));
      walletApiMocks.getWallet.mockClear();

      act(() => result.current.setTopUpAmount('25'));
      await act(async () => { await result.current.handleTopUp(); });

      expect(walletApiMocks.topUp).toHaveBeenCalledWith('user-1', 25, 'card');
      expect(result.current.topUpAmount).toBe('');
      expect(result.current.showTopUp).toBe(false);
      expect(walletApiMocks.getWallet).toHaveBeenCalled();
    });

    it('surfaces the API error via toast and leaves the form open on failure', async () => {
      walletApiMocks.topUp.mockRejectedValue(new Error('Card declined'));

      const { result } = renderController();
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => result.current.setTopUpAmount('25'));
      await act(async () => { await result.current.handleTopUp(); });

      expect(toastMock.error).toHaveBeenCalledWith('Card declined');
      expect(result.current.showTopUp).toBe(true); // not closed on failure
    });
  });

  describe('handleWithdraw', () => {
    it('requires both an amount and a bank account before calling the API', async () => {
      const { result } = renderController();
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => result.current.setWithdrawAmount('50'));
      await act(async () => { await result.current.handleWithdraw(); }); // no bank account yet

      expect(toastMock.error).toHaveBeenCalledWith('Enter bank account');
      expect(walletApiMocks.withdraw).not.toHaveBeenCalled();
    });

    it('withdraws successfully and resets the form', async () => {
      walletApiMocks.withdraw.mockResolvedValue({ success: true });
      const { result } = renderController();
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.setWithdrawAmount('50');
        result.current.setWithdrawBank('JO00BANK123');
      });
      await act(async () => { await result.current.handleWithdraw(); });

      expect(walletApiMocks.withdraw).toHaveBeenCalledWith('user-1', 50, 'JO00BANK123', 'bank_transfer');
      expect(result.current.withdrawAmount).toBe('');
      expect(result.current.withdrawBank).toBe('');
      expect(result.current.showWithdraw).toBe(false);
    });
  });

  describe('handleAutoTopUpToggle — optimistic update', () => {
    it('applies the change immediately and confirms it on success', async () => {
      walletApiMocks.setAutoTopUp.mockResolvedValue({ success: true });
      const { result } = renderController();
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => { await result.current.handleAutoTopUpToggle(true); });

      expect(result.current.autoTopUpEnabled).toBe(true);
      expect(toastMock.success).toHaveBeenCalledWith('Auto top-up enabled');
    });

    it('reverts the optimistic update and shows an error toast on failure', async () => {
      walletApiMocks.setAutoTopUp.mockRejectedValue(new Error('rls denied'));
      const { result } = renderController();
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.autoTopUpEnabled).toBe(false);

      await act(async () => { await result.current.handleAutoTopUpToggle(true); });

      // Reverted back to false after the failed API call.
      expect(result.current.autoTopUpEnabled).toBe(false);
      expect(toastMock.error).toHaveBeenCalledWith('rls denied');
    });
  });

  describe('capability gating', () => {
    it('handleSetPin rejects a non-4-digit PIN before calling the API', async () => {
      const { result } = renderController();
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => result.current.setPinValue('12'));
      await act(async () => { await result.current.handleSetPin(); });

      expect(toastMock.error).toHaveBeenCalledWith('PIN must be 4 digits');
      expect(walletApiMocks.setPin).not.toHaveBeenCalled();
    });

    it('handleSetPin succeeds with a valid 4-digit PIN', async () => {
      walletApiMocks.setPin.mockResolvedValue({ success: true });
      const { result } = renderController();
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => result.current.setPinValue('1234'));
      await act(async () => { await result.current.handleSetPin(); });

      expect(walletApiMocks.setPin).toHaveBeenCalledWith('user-1', '1234');
      expect(toastMock.success).toHaveBeenCalledWith('PIN set successfully');
      expect(result.current.showPinSetup).toBe(false);
    });
  });

  describe('query-param side effects', () => {
    it('shows a success toast and refetches when ?payment=success is present', async () => {
      const { result } = renderController('/app/wallet?payment=success');
      await waitFor(() => expect(result.current.loading).toBe(false));

      await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Payment completed. Wallet balance is refreshing.'));
      expect(walletApiMocks.getWallet.mock.calls.length).toBeGreaterThanOrEqual(2); // initial load + refetch
    });

    it('shows an info toast without refetching when ?payment=cancelled is present', async () => {
      const { result } = renderController('/app/wallet?payment=cancelled');
      await waitFor(() => expect(result.current.loading).toBe(false));

      await waitFor(() => expect(toastMock.info).toHaveBeenCalledWith('Payment was cancelled before completion.'));
    });
  });
});
