import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockCoreConfig,
  mockFetchWithRetry,
  mockRpc,
  mockSingle,
  mockMaybeSingle,
  mockSelect,
  mockEq,
  mockOrder,
  mockLimit,
  mockInsert,
  mockUpdate,
  mockDelete,
  mockDb,
} = vi.hoisted(() => {
  const mockCoreConfig = {
    API_URL: '',
    publicAnonKey: '',
  };
  const mockFetchWithRetry = vi.fn();
  const mockRpc = vi.fn();
  const mockSingle = vi.fn();
  const mockMaybeSingle = vi.fn();
  const mockSelect = vi.fn();
  const mockEq = vi.fn();
  const mockOrder = vi.fn();
  const mockLimit = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();

  function createQueryBuilder() {
    return {
      select: mockSelect,
      eq: mockEq,
      order: mockOrder,
      limit: mockLimit,
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    };
  }

  const mockDb = {
    from: vi.fn(() => createQueryBuilder()),
    rpc: (...args: any[]) => mockRpc(...args),
  };

  return {
    mockCoreConfig,
    mockFetchWithRetry,
    mockRpc,
    mockSingle,
    mockMaybeSingle,
    mockSelect,
    mockEq,
    mockOrder,
    mockLimit,
    mockInsert,
    mockUpdate,
    mockDelete,
    mockDb,
  };
});

vi.mock('../../../src/services/core', () => ({
  get API_URL() {
    return mockCoreConfig.API_URL;
  },
  get publicAnonKey() {
    return mockCoreConfig.publicAnonKey;
  },
  fetchWithRetry: (...args: any[]) => mockFetchWithRetry(...args),
  getAuthDetails: vi.fn().mockResolvedValue({ token: 'token-123', userId: 'user-123' }),
  supabase: mockDb,
}));

import { walletApi } from '../../../src/services/walletApi';

describe('walletApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCoreConfig.API_URL = '';
    mockCoreConfig.publicAnonKey = '';

    const createQueryBuilder = () => {
      const builder = {
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
        limit: mockLimit,
        single: mockSingle,
        maybeSingle: mockMaybeSingle,
        insert: mockInsert,
        update: mockUpdate,
        delete: mockDelete,
      };

      return builder;
    };

    mockDb.from.mockImplementation(() => createQueryBuilder());
    mockSelect.mockImplementation(() => createQueryBuilder());
    mockEq.mockImplementation(() => createQueryBuilder());
    mockOrder.mockImplementation(() => createQueryBuilder());
    mockLimit.mockImplementation(() => Promise.resolve({ data: [], error: null }));
    mockSingle.mockResolvedValue({ data: null, error: null });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockInsert.mockImplementation(() => createQueryBuilder());
    mockUpdate.mockImplementation(() => createQueryBuilder());
    mockDelete.mockImplementation(() => createQueryBuilder());
  });

  it('falls back to direct Supabase wallet reads when the edge wallet API is unavailable', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        wallet_id: 'wallet-1',
        user_id: 'user-123',
        balance: 145.5,
        pending_balance: 12,
        wallet_status: 'active',
        currency_code: 'JOD',
        auto_top_up_enabled: true,
        auto_top_up_amount: 25,
        auto_top_up_threshold: 8,
      },
      error: null,
    });
    mockOrder
      .mockResolvedValueOnce({
        data: [
          {
            transaction_id: 'tx-1',
            amount: 40,
            direction: 'credit',
            transaction_type: 'add_funds',
            transaction_status: 'posted',
            created_at: '2026-04-01T10:00:00.000Z',
            metadata: { description: 'Wallet top-up' },
          },
          {
            transaction_id: 'tx-2',
            amount: 12.5,
            direction: 'debit',
            transaction_type: 'ride_payment',
            transaction_status: 'posted',
            created_at: '2026-04-01T12:00:00.000Z',
            metadata: { description: 'Ride payment' },
          },
        ],
        error: null,
      })
      .mockImplementationOnce(() => ({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
        limit: mockLimit,
        single: mockSingle,
        maybeSingle: mockMaybeSingle,
        insert: mockInsert,
        update: mockUpdate,
        delete: mockDelete,
      }))
      .mockResolvedValueOnce({
        data: [{ payment_method_id: 'pm-1', provider: 'stripe', method_type: 'card' }],
        error: null,
      });

    const wallet = await walletApi.getWallet('user-123');

    expect(wallet.balance).toBe(145.5);
    expect(wallet.pendingBalance).toBe(12);
    expect(wallet.autoTopUp).toBe(true);
    expect(wallet.transactions).toHaveLength(2);
    expect(wallet.total_deposited).toBe(40);
    expect(wallet.total_spent).toBe(12.5);
  });

  it('uses the backend RPC to transfer wallet funds when edge endpoints are unavailable', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    mockMaybeSingle.mockResolvedValue({
      data: {
        wallet_id: 'wallet-1',
        user_id: 'user-123',
        balance: 60,
        pending_balance: 0,
        wallet_status: 'active',
        currency_code: 'JOD',
      },
      error: null,
    });
    mockOrder
      .mockResolvedValueOnce({ data: [], error: null })
      .mockImplementationOnce(() => ({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
        limit: mockLimit,
        single: mockSingle,
        maybeSingle: mockMaybeSingle,
        insert: mockInsert,
        update: mockUpdate,
        delete: mockDelete,
      }))
      .mockResolvedValueOnce({ data: [], error: null });

    const result = await walletApi.sendMoney('user-123', 'user-999', 20, 'Ride split');

    expect(mockRpc).toHaveBeenCalledWith('app_transfer_wallet_funds', {
      p_from_user_id: 'user-123',
      p_to_user_id: 'user-999',
      p_amount: 20,
      p_payment_method: 'wallet',
    });
    expect(result.success).toBe(true);
  });

  it('fails closed for wallet top-ups when the secure checkout backend is unavailable', async () => {
    await expect(walletApi.topUp('user-123', 25, 'card')).rejects.toThrow(
      'Secure wallet top-up is unavailable because the checkout backend is not configured.',
    );

    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockFetchWithRetry).not.toHaveBeenCalled();
  });

  it('does not bypass Stripe when the wallet top-up route is missing', async () => {
    vi.resetModules();
    mockCoreConfig.API_URL = 'https://api.wasel.test';
    mockCoreConfig.publicAnonKey = 'anon-key';
    mockFetchWithRetry.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Route not found' }),
    });
    const { walletApi: walletApiWithEdge } = await import('../../../src/services/walletApi');

    await expect(walletApiWithEdge.topUp('user-123', 25, 'card')).rejects.toThrow(
      'Secure wallet top-up is unavailable because the checkout backend is not configured.',
    );

    expect(mockFetchWithRetry).toHaveBeenCalledWith(
      'https://api.wasel.test/wallet/user-123/top-up',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
