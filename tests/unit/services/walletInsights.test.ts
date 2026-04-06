/**
 * walletApi — Pure logic unit tests
 *
 * Tests the pure helper functions that live inside walletApi.ts
 * without requiring network or Supabase: describeTransaction,
 * toWalletTransaction, buildInsightsFromTransactions, normalizePaymentMethod,
 * currencyFromWallet, and toNumber — exercised via the exported public API
 * using full Supabase mocks (edge API disabled so we hit all local paths).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const {
  mockFetch,
  mockRpc,
  mockMaybeSingle,
  mockOrder,
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
  const mockInsert = vi.fn();
  const mockSelect = vi.fn();
  const mockEq = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();

  function builder(): any {
    return { select: mockSelect, eq: mockEq, order: mockOrder, maybeSingle: mockMaybeSingle, insert: mockInsert, update: mockUpdate, delete: mockDelete };
  }

  const mockDb = {
    from: vi.fn(() => builder()),
    rpc: (...args: any[]) => mockRpc(...args),
  };

  return { mockFetch, mockRpc, mockMaybeSingle, mockOrder, mockInsert, mockSelect, mockEq, mockUpdate, mockDelete, mockDb };
});

vi.mock('../../../src/services/core', () => ({
  API_URL: '',
  publicAnonKey: '',
  fetchWithRetry: (...a: any[]) => mockFetch(...a),
  getAuthDetails: vi.fn().mockResolvedValue({ token: 'tok', userId: 'u1' }),
  supabase: mockDb,
}));

import { walletApi } from '../../../src/services/walletApi';

// ── Helpers ───────────────────────────────────────────────────────────────────

function walletRow(overrides = {}) {
  return {
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
    ...overrides,
  };
}

function setupDirectDb(txRows: any[] = [], pmRows: any[] = [], walletOverrides = {}) {
  mockDb.from.mockImplementation(() => ({
    select: mockSelect,
    eq: mockEq,
    order: mockOrder,
    maybeSingle: mockMaybeSingle,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  }));

  mockSelect.mockImplementation(() => ({
    select: mockSelect,
    eq: mockEq,
    order: mockOrder,
    maybeSingle: mockMaybeSingle,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  }));

  mockEq.mockImplementation(() => ({
    select: mockSelect,
    eq: mockEq,
    order: mockOrder,
    maybeSingle: mockMaybeSingle,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  }));

  // First maybeSingle call → wallet row
  mockMaybeSingle.mockResolvedValueOnce({ data: walletRow(walletOverrides), error: null });

  // First order call → transactions
  mockOrder
    .mockResolvedValueOnce({ data: txRows, error: null })
    // Second order call (payment methods)
    .mockImplementationOnce(() => ({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder,
      maybeSingle: mockMaybeSingle,
    }))
    .mockResolvedValueOnce({ data: pmRows, error: null });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── getWallet ─────────────────────────────────────────────────────────────────

describe('walletApi.getWallet() — direct Supabase path', () => {
  it('returns a well-shaped WalletData object', async () => {
    setupDirectDb([], []);
    const data = await walletApi.getWallet('u1');
    expect(data.balance).toBe(100);
    expect(data.pendingBalance).toBe(5);
    expect(data.wallet.status).toBe('active');
    expect(data.currency).toBe('JOD');
    expect(data.pinSet).toBe(false);
  });

  it('defaults currency to JOD when currency_code is absent', async () => {
    setupDirectDb([], [], { currency_code: null });
    const data = await walletApi.getWallet('u1');
    expect(data.currency).toBe('JOD');
  });

  it('pinSet is true when pin_hash is present', async () => {
    setupDirectDb([], [], { pin_hash: 'hashed-pin' });
    const data = await walletApi.getWallet('u1');
    expect(data.pinSet).toBe(true);
  });

  it('autoTopUp reflects wallet flag', async () => {
    setupDirectDb([], [], { auto_top_up_enabled: true });
    const data = await walletApi.getWallet('u1');
    expect(data.autoTopUp).toBe(true);
  });
});

// ── Transaction normalization ─────────────────────────────────────────────────

describe('walletApi transaction normalization', () => {
  it('credit transactions have positive amounts', async () => {
    setupDirectDb(
      [{ transaction_id: 'tx-1', amount: 50, direction: 'credit', transaction_type: 'add_funds', transaction_status: 'posted', created_at: '2026-04-01T00:00:00.000Z', metadata: null }],
      [],
    );
    const data = await walletApi.getWallet('u1');
    expect(data.transactions[0]!.amount).toBeGreaterThan(0);
    expect(data.transactions[0]!.amount).toBe(50);
  });

  it('debit transactions have negative amounts', async () => {
    setupDirectDb(
      [{ transaction_id: 'tx-2', amount: 15, direction: 'debit', transaction_type: 'ride_payment', transaction_status: 'posted', created_at: '2026-04-01T00:00:00.000Z', metadata: null }],
      [],
    );
    const data = await walletApi.getWallet('u1');
    expect(data.transactions[0]!.amount).toBeLessThan(0);
    expect(data.transactions[0]!.amount).toBe(-15);
  });

  it('uses metadata description when available', async () => {
    setupDirectDb(
      [{ transaction_id: 'tx-3', amount: 10, direction: 'credit', transaction_type: 'driver_earning', transaction_status: 'posted', created_at: '2026-04-01T00:00:00.000Z', metadata: { description: 'Custom label' } }],
      [],
    );
    const data = await walletApi.getWallet('u1');
    expect(data.transactions[0]!.description).toBe('Custom label');
  });

  it('falls back to type-based description when metadata is null', async () => {
    setupDirectDb(
      [{ transaction_id: 'tx-4', amount: 10, direction: 'credit', transaction_type: 'add_funds', transaction_status: 'posted', created_at: '2026-04-01T00:00:00.000Z', metadata: null }],
      [],
    );
    const data = await walletApi.getWallet('u1');
    expect(data.transactions[0]!.description).toBe('Wallet top-up');
  });

  it('fall back descriptions for all known transaction types', async () => {
    const types = [
      ['transfer_funds', 'credit', 'Wallet transfer received'],
      ['transfer_funds', 'debit', 'Wallet transfer sent'],
      ['withdrawal', 'debit', 'Wallet withdrawal'],
      ['driver_earning', 'credit', 'Driver earnings'],
      ['ride_payment', 'debit', 'Ride payment'],
      ['package_payment', 'debit', 'Package payment'],
    ];

    for (const [type, direction, expected] of types) {
      setupDirectDb(
        [{ transaction_id: `tx-${type}`, amount: 5, direction, transaction_type: type, transaction_status: 'posted', created_at: '2026-04-01T00:00:00.000Z', metadata: null }],
        [],
      );
      const data = await walletApi.getWallet('u1');
      expect(data.transactions[0]!.description).toBe(expected);
    }
  });

  it('computes total_earned and total_spent correctly', async () => {
    setupDirectDb(
      [
        { transaction_id: 'tx-a', amount: 40, direction: 'credit', transaction_type: 'add_funds', transaction_status: 'posted', created_at: '2026-04-01T00:00:00.000Z', metadata: null },
        { transaction_id: 'tx-b', amount: 12.5, direction: 'debit', transaction_type: 'ride_payment', transaction_status: 'posted', created_at: '2026-04-01T00:00:00.000Z', metadata: null },
      ],
      [],
    );
    const data = await walletApi.getWallet('u1');
    expect(data.total_earned).toBe(40);
    expect(data.total_spent).toBe(12.5);
  });

  it('computes total_deposited from add_funds credit transactions', async () => {
    setupDirectDb(
      [
        { transaction_id: 'tx-d1', amount: 30, direction: 'credit', transaction_type: 'add_funds', transaction_status: 'posted', created_at: '2026-04-01T00:00:00.000Z', metadata: null },
        { transaction_id: 'tx-d2', amount: 20, direction: 'credit', transaction_type: 'add_funds', transaction_status: 'posted', created_at: '2026-04-01T00:00:00.000Z', metadata: null },
        { transaction_id: 'tx-d3', amount: 10, direction: 'credit', transaction_type: 'driver_earning', transaction_status: 'posted', created_at: '2026-04-01T00:00:00.000Z', metadata: null },
      ],
      [],
    );
    const data = await walletApi.getWallet('u1');
    expect(data.total_deposited).toBe(50);
  });
});

// ── getTransactions with pagination ──────────────────────────────────────────

describe('walletApi.getTransactions() — pagination', () => {
  function txRow(id: string, type: string) {
    return { transaction_id: id, amount: 10, direction: 'credit', transaction_type: type, transaction_status: 'posted', created_at: '2026-04-01T00:00:00.000Z', metadata: null };
  }

  it('returns page 1 limited to specified count', async () => {
    const rows = Array.from({ length: 5 }, (_, i) => txRow(`tx-${i}`, 'add_funds'));
    setupDirectDb(rows, []);
    const result = await walletApi.getTransactions('u1', 1, 3);
    expect((result as any).transactions).toHaveLength(3);
    expect((result as any).page).toBe(1);
  });

  it('returns page 2 correctly', async () => {
    const rows = Array.from({ length: 5 }, (_, i) => txRow(`tx-${i}`, 'add_funds'));
    setupDirectDb(rows, []);
    const result = await walletApi.getTransactions('u1', 2, 3);
    expect((result as any).transactions).toHaveLength(2);
    expect((result as any).page).toBe(2);
  });

  it('filters by type when provided', async () => {
    const rows = [
      txRow('tx-1', 'add_funds'),
      txRow('tx-2', 'ride_payment'),
      txRow('tx-3', 'add_funds'),
    ];
    setupDirectDb(rows, []);
    const result = await walletApi.getTransactions('u1', 1, 10, 'add_funds');
    expect((result as any).transactions).toHaveLength(2);
    expect((result as any).transactions.every((t: any) => t.type === 'add_funds')).toBe(true);
  });
});

// ── getRewards ────────────────────────────────────────────────────────────────

describe('walletApi.getRewards()', () => {
  it('returns empty rewards array in direct mode', async () => {
    const result = await walletApi.getRewards('u1');
    expect((result as any).rewards).toEqual([]);
  });
});

// ── getSubscription ───────────────────────────────────────────────────────────

describe('walletApi.getSubscription()', () => {
  it('returns null subscription in direct mode', async () => {
    const result = await walletApi.getSubscription('u1');
    expect((result as any).subscription).toBeNull();
  });
});

// ── setPin / verifyPin — require edge API ─────────────────────────────────────

describe('walletApi.setPin() / verifyPin() — require edge API', () => {
  it('setPin throws when edge API is unavailable', async () => {
    await expect(walletApi.setPin('u1', '1234')).rejects.toThrow('wallet backend');
  });

  it('verifyPin throws when edge API is unavailable', async () => {
    await expect(walletApi.verifyPin('u1', '1234')).rejects.toThrow('wallet backend');
  });
});

// ── claimReward — requires edge API ──────────────────────────────────────────

describe('walletApi.claimReward()', () => {
  it('throws when edge API is unavailable', async () => {
    await expect(walletApi.claimReward('u1', 'rwd-1')).rejects.toThrow('wallet backend');
  });
});

// ── subscribe — requires edge API ────────────────────────────────────────────

describe('walletApi.subscribe()', () => {
  it('throws when edge API is unavailable', async () => {
    await expect(walletApi.subscribe('u1', 'Plus', 9.99)).rejects.toThrow('wallet backend');
  });
});

// ── sendMoney via RPC ─────────────────────────────────────────────────────────

describe('walletApi.sendMoney() — RPC path', () => {
  it('calls transfer RPC and returns success', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null });
    setupDirectDb([], []);
    const result = await walletApi.sendMoney('u1', 'u2', 15, 'Coffee');
    expect(mockRpc).toHaveBeenCalledWith('app_transfer_wallet_funds', expect.objectContaining({
      p_from_user_id: 'u1',
      p_to_user_id: 'u2',
      p_amount: 15,
    }));
    expect((result as any).success).toBe(true);
  });
});
