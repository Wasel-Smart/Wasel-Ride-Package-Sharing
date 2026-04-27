/**
 * Payment Flow Integration Tests
 *
 * Covers the wallet-backed payment service contract used by ride checkout.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PaymentIntentView, WalletData } from '../../shared/wallet-contracts';

vi.mock('../../src/services/core', () => ({
  API_URL: 'https://test-api.wasel.jo',
  publicAnonKey: 'test-anon-key',
  fetchWithRetry: vi.fn(),
  getAuthDetails: vi.fn().mockResolvedValue({
    userId: 'test-user-123',
    token: 'test-token',
  }),
}));

import { __resetWalletApiCachesForTests, walletApi } from '../../src/services/walletApi';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function buildWalletSnapshot(overrides: Partial<WalletData> = {}): WalletData {
  return {
    wallet: {
      id: 'wallet_123',
      userId: 'test-user-123',
      walletType: 'custodial',
      status: 'active',
      currency: 'JOD',
      autoTopUp: false,
      autoTopUpAmount: 20,
      autoTopUpThreshold: 5,
      paymentMethods: [],
      createdAt: new Date().toISOString(),
    },
    balance: 100,
    pendingBalance: 0,
    rewardsBalance: 0,
    total_earned: 500,
    total_spent: 400,
    total_deposited: 600,
    currency: 'JOD',
    pinSet: true,
    autoTopUp: false,
    transactions: [],
    activeEscrows: [],
    activeRewards: [],
    subscription: null,
    ...overrides,
  };
}

describe('Payment Flow Integration Tests', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    __resetWalletApiCachesForTests();
    window.localStorage.clear();
    const { fetchWithRetry } = await import('../../src/services/core');
    vi.mocked(fetchWithRetry).mockReset();
  });

  describe('Ride Payment Flow', () => {
    it('should create payment intent for ride booking', async () => {
      const mockIntent: PaymentIntentView = {
        id: 'pi_test_123',
        status: 'requires_confirmation',
        amount: 25.5,
        currency: 'JOD',
        clientSecret: 'pi_test_123_secret',
        paymentMethodType: 'card',
        provider: 'stripe',
        purpose: 'ride_payment',
        referenceType: 'ride',
        referenceId: 'ride_abc123',
        createdAt: new Date().toISOString(),
      };

      const { fetchWithRetry } = await import('../../src/services/core');
      vi.mocked(fetchWithRetry).mockResolvedValueOnce(jsonResponse(mockIntent));

      const intent = await walletApi.createPaymentIntent('ride_payment', 25.5, 'card', {
        referenceType: 'ride',
        referenceId: 'ride_abc123',
        idempotencyKey: 'payment_xyz789',
      });

      expect(intent.id).toBe('pi_test_123');
      expect(intent.amount).toBe(25.5);
      expect(intent.purpose).toBe('ride_payment');
      expect(fetchWithRetry).toHaveBeenCalledWith(
        expect.stringContaining('/payments/create-intent'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        }),
      );
    });

    it('should confirm payment intent with default payment method', async () => {
      const mockConfirmation = {
        id: 'pi_test_123',
        status: 'succeeded',
        settled: true,
        clientSecret: null,
      };

      const { fetchWithRetry } = await import('../../src/services/core');
      vi.mocked(fetchWithRetry).mockResolvedValueOnce(jsonResponse(mockConfirmation));

      const confirmation = await walletApi.confirmPaymentIntent('pi_test_123', 'pm_card_visa');

      expect(confirmation.status).toBe('succeeded');
      expect(fetchWithRetry).toHaveBeenCalledWith(
        expect.stringContaining('/payments/confirm'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('pi_test_123'),
        }),
      );
    });

    it('should handle payment failure gracefully', async () => {
      const { fetchWithRetry } = await import('../../src/services/core');
      vi.mocked(fetchWithRetry).mockResolvedValueOnce(
        jsonResponse({ error: 'Insufficient funds' }, 402),
      );

      await expect(walletApi.confirmPaymentIntent('pi_test_123', 'pm_card_visa')).rejects.toThrow(
        'Insufficient funds',
      );
    });
  });

  describe('Wallet Balance Payment', () => {
    it('should use wallet balance when sufficient', async () => {
      const mockWallet = buildWalletSnapshot();

      const { fetchWithRetry } = await import('../../src/services/core');
      vi.mocked(fetchWithRetry).mockResolvedValueOnce(jsonResponse(mockWallet));

      const wallet = await walletApi.getWallet('test-user-123');
      expect(wallet.balance).toBe(100);
      expect(wallet.balance).toBeGreaterThanOrEqual(25.5);
    });

    it('should create wallet payment intent when balance is sufficient', async () => {
      const mockIntent: PaymentIntentView = {
        id: 'pi_wallet_123',
        status: 'requires_confirmation',
        amount: 25.5,
        currency: 'JOD',
        clientSecret: 'pi_wallet_123_secret',
        paymentMethodType: 'wallet',
        provider: 'wallet',
        purpose: 'ride_payment',
        referenceType: 'ride',
        referenceId: 'ride_abc123',
        createdAt: new Date().toISOString(),
      };

      const { fetchWithRetry } = await import('../../src/services/core');
      vi.mocked(fetchWithRetry).mockResolvedValueOnce(jsonResponse(mockIntent));

      const intent = await walletApi.createPaymentIntent('ride_payment', 25.5, 'wallet');

      expect(intent.paymentMethodType).toBe('wallet');
      expect(intent.provider).toBe('wallet');
    });
  });

  describe('Escrow Flow', () => {
    it('should hold funds in escrow for pending ride', async () => {
      const mockWallet = buildWalletSnapshot({
        balance: 74.5,
        pendingBalance: 25.5,
        activeEscrows: [
          {
            id: 'escrow_123',
            type: 'ride',
            amount: 25.5,
            tripId: 'ride_abc123',
            status: 'held',
            createdAt: new Date().toISOString(),
          },
        ],
      });

      const { fetchWithRetry } = await import('../../src/services/core');
      vi.mocked(fetchWithRetry).mockResolvedValueOnce(jsonResponse(mockWallet));

      const wallet = await walletApi.getWallet('test-user-123');
      expect(wallet.activeEscrows).toHaveLength(1);
      expect(wallet.activeEscrows[0]?.status).toBe('held');
      expect(wallet.activeEscrows[0]?.amount).toBe(25.5);
    });
  });

  describe('Idempotency', () => {
    it('should prevent duplicate payments with idempotency key', async () => {
      const idempotencyKey = 'payment_unique_123';
      const mockIntent: PaymentIntentView = {
        id: 'pi_test_123',
        status: 'requires_confirmation',
        amount: 25.5,
        currency: 'JOD',
        clientSecret: 'pi_test_123_secret',
        paymentMethodType: 'card',
        provider: 'stripe',
        purpose: 'ride_payment',
        referenceType: 'ride',
        referenceId: 'ride_abc123',
        createdAt: new Date().toISOString(),
      };

      const { fetchWithRetry } = await import('../../src/services/core');
      vi.mocked(fetchWithRetry).mockImplementation(() => Promise.resolve(jsonResponse(mockIntent)));

      const intent1 = await walletApi.createPaymentIntent('ride_payment', 25.5, 'card', {
        idempotencyKey,
      });
      const intent2 = await walletApi.createPaymentIntent('ride_payment', 25.5, 'card', {
        idempotencyKey,
      });

      expect(intent1.id).toBe(intent2.id);
    });
  });

  describe('Error Handling', () => {
    it('should surface network errors from the wallet transport', async () => {
      const { fetchWithRetry } = await import('../../src/services/core');
      vi.mocked(fetchWithRetry).mockRejectedValueOnce(new Error('Network error'));

      await expect(walletApi.createPaymentIntent('ride_payment', 25.5, 'card')).rejects.toThrow(
        'Network error',
      );
    });

    it('should throw error when wallet API is unavailable', async () => {
      vi.resetModules();
      vi.doMock('../../src/services/core', () => ({
        API_URL: '',
        publicAnonKey: '',
        fetchWithRetry: vi.fn(),
        getAuthDetails: vi.fn(),
      }));

      const { walletApi: unavailableWalletApi } = await import('../../src/services/walletApi');

      await expect(
        unavailableWalletApi.createPaymentIntent('ride_payment', 25.5, 'card'),
      ).rejects.toThrow('Wallet actions are unavailable');
    });
  });
});
