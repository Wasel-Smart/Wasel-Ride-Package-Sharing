import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
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
  API_URL: '',
  publicAnonKey: '',
  fetchWithRetry: (...args: any[]) => mockFetchWithRetry(...args),
  getAuthDetails: vi.fn().mockResolvedValue({ token: 'token-123', userId: 'user-123' }),
  isEdgeFunctionAvailable: vi.fn(() => false),
  supabase: mockDb,
}));

import { __resetWalletApiCachesForTests, walletApi } from '../../../src/services/walletApi';

describe('walletApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetWalletApiCachesForTests();
    window.localStorage.removeItem('wasel-movement-membership');

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
    mockLimit.mockResolvedValueOnce({
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
    });
    mockOrder
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

  it('exposes wallet reliability metadata for fallback reads', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        wallet_id: 'wallet-1',
        user_id: 'user-123',
        balance: 50,
        pending_balance: 0,
        wallet_status: 'active',
        currency_code: 'JOD',
      },
      error: null,
    });
    mockLimit.mockResolvedValueOnce({ data: [], error: null });
    mockOrder
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

    const snapshot = await walletApi.getWalletSnapshot('user-123');

    expect(snapshot.data.balance).toBe(50);
    expect(snapshot.meta.source).toBe('direct-supabase');
    expect(snapshot.meta.degraded).toBe(true);
  });

  it('persists a fresh wallet snapshot for fast reopen flows', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        wallet_id: 'wallet-1',
        user_id: 'user-123',
        balance: 88,
        pending_balance: 0,
        wallet_status: 'active',
        currency_code: 'JOD',
      },
      error: null,
    });
    mockLimit.mockResolvedValueOnce({ data: [], error: null });
    mockOrder
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

    const snapshot = await walletApi.getWalletSnapshot('user-123');
    const persistedSnapshot = walletApi.getPersistedWalletSnapshot('user-123');

    expect(snapshot.data.balance).toBe(88);
    expect(persistedSnapshot?.data.balance).toBe(88);
    expect(persistedSnapshot?.meta.source).toBe('direct-supabase');
  });

  it('times out stalled direct wallet reads instead of hanging forever', async () => {
    vi.useFakeTimers();

    try {
      mockMaybeSingle.mockImplementationOnce(() => new Promise(() => {}));

      const snapshotPromise = walletApi.getWalletSnapshot('user-123');
      const timedOutAssertion = expect(snapshotPromise).rejects.toThrow(
        'Wallet fallback read timed out after 4000ms',
      );

      await vi.advanceTimersByTimeAsync(4_000);

      await timedOutAssertion;
    } finally {
      vi.useRealTimers();
    }
  });

  it('reuses the last persisted wallet snapshot when a direct fallback read stalls', async () => {
    vi.useFakeTimers();

    try {
      mockMaybeSingle.mockResolvedValueOnce({
        data: {
          wallet_id: 'wallet-1',
          user_id: 'user-123',
          balance: 88,
          pending_balance: 0,
          wallet_status: 'active',
          currency_code: 'JOD',
        },
        error: null,
      });
      mockLimit.mockResolvedValueOnce({ data: [], error: null });
      mockOrder
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

      const initialSnapshot = await walletApi.getWalletSnapshot('user-123');
      expect(initialSnapshot.data.balance).toBe(88);
      expect(walletApi.getPersistedWalletSnapshot('user-123')?.data.balance).toBe(88);

      await vi.advanceTimersByTimeAsync(15_001);

      mockMaybeSingle.mockImplementationOnce(() => new Promise(() => {}));

      const recoveredSnapshotPromise = walletApi.getWalletSnapshot('user-123');

      await vi.advanceTimersByTimeAsync(4_000);

      const recoveredSnapshot = await recoveredSnapshotPromise;
      expect(recoveredSnapshot.data.balance).toBe(88);
      expect(recoveredSnapshot.meta.degraded).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('blocks wallet transfers when the secure wallet backend is unavailable', async () => {
    await expect(walletApi.sendMoney('user-123', 'user-999', 20, 'Ride split')).rejects.toThrow(
      'Wallet actions are temporarily read-only while the secure payment service reconnects.',
    );
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('blocks new subscriptions when the secure wallet backend is unavailable', async () => {
    await expect(walletApi.subscribe('user-123', 'Wasel Corridor Pass', 39, 'amman-irbid')).rejects.toThrow(
      'Wallet actions are temporarily read-only while the secure payment service reconnects.',
    );
  });
});
