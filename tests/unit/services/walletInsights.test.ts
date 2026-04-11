import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockFetch,
  mockRpc,
  mockMaybeSingle,
  mockOrder,
  mockLimit,
  mockInsert,
  mockSelect,
  mockEq,
  mockUpdate,
  mockDelete,
  mockDb,
} = vi.hoisted(() => {
  const mockFetch = vi.fn();
  const mockRpc = vi.fn();
  const mockMaybeSingle = vi.fn();
  const mockOrder = vi.fn();
  const mockLimit = vi.fn();
  const mockInsert = vi.fn();
  const mockSelect = vi.fn();
  const mockEq = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();

  function builder(): any {
    return {
      select: mockSelect,
      eq: mockEq,
      order: mockOrder,
      limit: mockLimit,
      maybeSingle: mockMaybeSingle,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    };
  }

  const mockDb = {
    from: vi.fn(() => builder()),
    rpc: (...args: any[]) => mockRpc(...args),
  };

  return {
    mockFetch,
    mockRpc,
    mockMaybeSingle,
    mockOrder,
    mockLimit,
    mockInsert,
    mockSelect,
    mockEq,
    mockUpdate,
    mockDelete,
    mockDb,
  };
});

vi.mock('../../../src/services/core', () => ({
  API_URL: '',
  publicAnonKey: '',
  fetchWithRetry: (...a: any[]) => mockFetch(...a),
  getAuthDetails: vi.fn().mockResolvedValue({ token: 'tok', userId: 'u1' }),
  isEdgeFunctionAvailable: vi.fn(() => false),
  supabase: mockDb,
}));

import { __resetWalletApiCachesForTests, walletApi } from '../../../src/services/walletApi';

function createBuilder() {
  return {
    select: mockSelect,
    eq: mockEq,
    order: mockOrder,
    limit: mockLimit,
    maybeSingle: mockMaybeSingle,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  };
}

function setupWalletReads(args?: {
  wallet?: Record<string, unknown>;
  transactions?: Array<Record<string, unknown>>;
  paymentMethods?: Array<Record<string, unknown>>;
}) {
  mockDb.from.mockImplementation(() => createBuilder());
  mockSelect.mockImplementation(() => createBuilder());
  mockEq.mockImplementation(() => createBuilder());
  mockInsert.mockImplementation(() => createBuilder());
  mockUpdate.mockImplementation(() => createBuilder());
  mockDelete.mockImplementation(() => createBuilder());
  mockMaybeSingle.mockResolvedValue({
    data: {
      wallet_id: 'w-1',
      user_id: 'u1',
      balance: 100,
      pending_balance: 5,
      wallet_status: 'active',
      currency_code: 'JOD',
      auto_top_up_enabled: false,
      auto_top_up_amount: 20,
      auto_top_up_threshold: 5,
      pin_hash: null,
      created_at: '2026-01-01T00:00:00.000Z',
      ...(args?.wallet ?? {}),
    },
    error: null,
  });
  mockLimit.mockResolvedValue({
    data: args?.transactions ?? [],
    error: null,
  });
  mockOrder
    .mockImplementationOnce(() => createBuilder())
    .mockResolvedValueOnce({ data: args?.paymentMethods ?? [], error: null });
}

describe('walletApi direct fallback insights and pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetWalletApiCachesForTests();
    window.localStorage.removeItem('wasel-movement-membership');
  });

  it('builds wallet insights from cached wallet transactions', async () => {
    setupWalletReads({
      transactions: [
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
          amount: 15,
          direction: 'debit',
          transaction_type: 'ride_payment',
          transaction_status: 'posted',
          created_at: '2026-04-02T10:00:00.000Z',
          metadata: { description: 'Ride payment' },
        },
      ],
    });

    const insights = await walletApi.getInsights('u1');

    expect(insights.totalTransactions).toBe(2);
    expect(insights.thisMonthEarned).toBeGreaterThanOrEqual(0);
    expect(mockMaybeSingle).toHaveBeenCalledTimes(1);
  });

  it('marks fallback insights as degraded metadata', async () => {
    setupWalletReads({
      transactions: [
        {
          transaction_id: 'tx-1',
          amount: 20,
          direction: 'credit',
          transaction_type: 'add_funds',
          transaction_status: 'posted',
          created_at: '2026-04-01T10:00:00.000Z',
          metadata: { description: 'Wallet top-up' },
        },
      ],
    });

    const snapshot = await walletApi.getInsightsSnapshot('u1');

    expect(snapshot.data.totalTransactions).toBe(1);
    expect(snapshot.meta.degraded).toBe(true);
    expect(snapshot.meta.source).toBe('direct-supabase');
  });

  it('paginates transactions from the cached wallet payload in fallback mode', async () => {
    setupWalletReads({
      transactions: Array.from({ length: 4 }, (_, index) => ({
        transaction_id: `tx-${index + 1}`,
        amount: 10 + index,
        direction: index % 2 === 0 ? 'credit' : 'debit',
        transaction_type: index % 2 === 0 ? 'add_funds' : 'ride_payment',
        transaction_status: 'posted',
        created_at: `2026-04-0${index + 1}T10:00:00.000Z`,
        metadata: null,
      })),
    });

    const page1 = await walletApi.getTransactions('u1', 1, 2);
    const page2 = await walletApi.getTransactions('u1', 2, 2);

    expect(page1.transactions).toHaveLength(2);
    expect(page2.transactions).toHaveLength(2);
    expect(page1.total).toBe(4);
  });

  it('requires the backend for pin management when edge APIs are unavailable', async () => {
    await expect(walletApi.setPin('u1', '1234')).rejects.toThrow('Wallet PIN management requires the wallet backend.');
    await expect(walletApi.verifyPin('u1', '1234')).rejects.toThrow('Wallet PIN verification requires the wallet backend.');
  });

  it('uses the transfer RPC in fallback mode and returns a refreshed wallet payload', async () => {
    setupWalletReads();
    mockRpc.mockResolvedValue({ data: null, error: null });

    const result = await walletApi.sendMoney('u1', 'u2', 20, 'Split');

    expect(mockRpc).toHaveBeenCalledWith('app_transfer_wallet_funds', {
      p_from_user_id: 'u1',
      p_to_user_id: 'u2',
      p_amount: 20,
      p_payment_method: 'wallet',
    });
    expect(result.success).toBe(true);
  });
});
