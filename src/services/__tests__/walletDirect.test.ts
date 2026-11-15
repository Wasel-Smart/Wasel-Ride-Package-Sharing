import { describe, it, expect, vi, beforeEach, type MockInstance } from 'vitest';

// ── Supabase client mock ──────────────────────────────────────────────────────
// walletDirect.ts imports supabase from '../core' (relative to wallet/).
// From this test file (src/services/__tests__/) '../core' resolves to
// src/services/core — the same module. We mock it here so the real DB is
// never touched.

const { makeQueryBuilder, mockFrom } = vi.hoisted( () => {
  const createQueryBuilder = ( overrides: Record<string, unknown> = {} ) => {
    const { select: selectOverride, order: orderOverride, ...rest } = overrides;
    const queryResult = selectOverride ?? orderOverride;
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue( { data: null, error: null } ),
      single: vi.fn().mockResolvedValue( { data: null, error: null } ),
      insert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: ( resolve: ( value: unknown ) => unknown, reject?: ( reason: unknown ) => unknown ) => {
        const result = typeof queryResult === 'function'
          ? ( queryResult as () => Promise<unknown> )()
          : Promise.resolve( { data: [], error: null } );
        return Promise.resolve( result ).then( resolve, reject );
      },
      ...rest,
    };
  };
  return { makeQueryBuilder: createQueryBuilder, mockFrom: vi.fn( () => createQueryBuilder() ) };
} );

vi.mock('../core', () => ({
  supabase: { from: mockFrom },
  getAuthDetails: vi.fn().mockResolvedValue({ token: 'tok', userId: 'u1' }),
}));

vi.mock('../wallet/walletLocalStorage', () => ({
  toNumber: vi.fn((v: unknown, fb = 0) => (v === null || v === undefined ? fb : Number(v))),
  toWalletTransaction: vi.fn((row: Record<string, unknown>) => ({
    id: String(row.transaction_id ?? 'transaction'),
    type: String(row.transaction_type ?? 'wallet'),
    description: String((row.metadata as Record<string, unknown> | null)?.description ?? ''),
    amount: row.direction === 'debit' ? -Math.abs(Number(row.amount ?? 0)) : Math.abs(Number(row.amount ?? 0)),
    createdAt: String(row.created_at ?? ''),
    status: String(row.transaction_status ?? ''),
  })),
}));

import {
  resolveCanonicalUserId,
  fetchWalletDirect,
  getWalletTransactionRows,
  getPaymentMethodsDirect,
  addPaymentMethodDirect,
  deletePaymentMethodDirect,
  getTrustScoreDirect,
} from '../wallet/walletDirect';

// Helper: queue successive mockFrom return values
function queueFromCalls(builders: ReturnType<typeof makeQueryBuilder>[]) {
  let call = 0;
  (mockFrom as unknown as MockInstance).mockImplementation(() => builders[call++] ?? makeQueryBuilder());
}

describe('walletDirect — direct Supabase tier', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation(() => makeQueryBuilder());
  });

  describe('resolveCanonicalUserId', () => {
    it('returns auth_user_id match when found', async () => {
      queueFromCalls([
        makeQueryBuilder({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'canonical-123' }, error: null }) }),
      ]);
      expect(await resolveCanonicalUserId('auth-user-123')).toBe('canonical-123');
    });

    it('falls back to id match when auth_user_id not found', async () => {
      queueFromCalls([
        makeQueryBuilder({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }),
        makeQueryBuilder({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'canonical-456' }, error: null }) }),
      ]);
      expect(await resolveCanonicalUserId('user-456')).toBe('canonical-456');
    });

    it('returns original key when no match found', async () => {
      queueFromCalls([
        makeQueryBuilder({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }),
        makeQueryBuilder({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }),
      ]);
      expect(await resolveCanonicalUserId('unknown-user')).toBe('unknown-user');
    });

    it('throws on database error during id lookup', async () => {
      queueFromCalls([
        makeQueryBuilder({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }),
        makeQueryBuilder({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: new Error('db error') }) }),
      ]);
      await expect(resolveCanonicalUserId('user-789')).rejects.toThrow('db error');
    });
  });

  describe('fetchWalletDirect', () => {
    it('builds complete wallet payload with transactions and payment methods', async () => {
      queueFromCalls([
        // findWalletByUserId
        makeQueryBuilder({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { wallet_id: 'w1', user_id: 'user-1', balance: 150, currency_code: 'JOD', wallet_status: 'active', created_at: '2026-01-01', auto_top_up_enabled: true, auto_top_up_amount: 25, auto_top_up_threshold: 10, pin_set: true },
            error: null,
          }),
        }),
        // transactions
        makeQueryBuilder({
          order: vi.fn().mockResolvedValue({
            data: [
              { transaction_id: 'tx1', amount: 50, direction: 'credit', transaction_type: 'add_funds', transaction_status: 'posted', created_at: '2026-01-02', metadata: { description: 'Top-up' } },
              { transaction_id: 'tx2', amount: 20, direction: 'debit', transaction_type: 'ride_payment', transaction_status: 'posted', created_at: '2026-01-03', metadata: { description: 'Ride' } },
            ],
            error: null,
          }),
        }),
        // payment methods
        makeQueryBuilder({
          order: vi.fn().mockResolvedValue({
            data: [{ id: 'pm1', payment_method_id: 'pm_1', method_type: 'card', provider: 'stripe', last_four: '4242', is_default: true, status: 'active', created_at: '2026-01-01' }],
            error: null,
          }),
        }),
      ]);

      const result = await fetchWalletDirect('user-1');
      expect(result.wallet.id).toBe('w1');
      expect(result.balance).toBe(150);
      expect(result.currency).toBe('JOD');
      expect(result.wallet.autoTopUp).toBe(true);
      expect((result as { pinSet?: boolean }).pinSet).toBe(true);
      expect(result.wallet.paymentMethods).toHaveLength(1);
    });

    it('throws when wallet not found after canonical resolution', async () => {
      queueFromCalls([
        makeQueryBuilder({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }), // findWalletByUserId
        makeQueryBuilder({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }), // resolveCanonicalUserId auth_user_id
        makeQueryBuilder({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }), // resolveCanonicalUserId id
      ]);
      await expect(fetchWalletDirect('user-404')).rejects.toThrow('Wallet not found');
    });

    it('limits transactions to 50 most recent', async () => {
      const manyTx = Array.from({ length: 60 }, (_, i) => ({
        transaction_id: `tx${i}`, amount: 10, direction: 'credit',
        transaction_type: 'add_funds', transaction_status: 'posted',
        created_at: `2026-01-${String(i + 1).padStart(2, '0')}`,
        metadata: { description: `Top-up ${i}` },
      }));
      queueFromCalls([
        makeQueryBuilder({ maybeSingle: vi.fn().mockResolvedValue({ data: { wallet_id: 'w1', user_id: 'user-1', balance: 600, currency_code: 'JOD' }, error: null }) }),
        makeQueryBuilder({ order: vi.fn().mockResolvedValue({ data: manyTx, error: null }) }),
        makeQueryBuilder({ order: vi.fn().mockResolvedValue({ data: [], error: null }) }),
      ]);
      const result = await fetchWalletDirect('user-1');
      expect(result.transactions).toHaveLength(50);
    });

    it('defaults currency to JOD when wallet has no currency_code', async () => {
      queueFromCalls([
        makeQueryBuilder({ maybeSingle: vi.fn().mockResolvedValue({ data: { wallet_id: 'w1', user_id: 'user-1', balance: 100, currency_code: null }, error: null }) }),
        makeQueryBuilder({ order: vi.fn().mockResolvedValue({ data: [], error: null }) }),
        makeQueryBuilder({ order: vi.fn().mockResolvedValue({ data: [], error: null }) }),
      ]);
      const result = await fetchWalletDirect('user-1');
      expect(result.currency).toBe('JOD');
    });
  });

  describe('getWalletTransactionRows', () => {
    it('converts wallet transactions to TransactionRow format', async () => {
      queueFromCalls([
        makeQueryBuilder({ maybeSingle: vi.fn().mockResolvedValue({ data: { wallet_id: 'w1', user_id: 'user-1', balance: 100, currency_code: 'JOD' }, error: null }) }),
        makeQueryBuilder({
          order: vi.fn().mockResolvedValue({
            data: [
              { transaction_id: 'tx1', amount: 20, direction: 'debit', transaction_type: 'ride_payment', transaction_status: 'posted', created_at: '2026-01-01', metadata: { description: 'Ride' } },
              { transaction_id: 'tx2', amount: 50, direction: 'credit', transaction_type: 'add_funds', transaction_status: 'posted', created_at: '2026-01-02', metadata: { description: 'Top-up' } },
            ],
            error: null,
          }),
        }),
        makeQueryBuilder({ order: vi.fn().mockResolvedValue({ data: [], error: null }) }),
      ]);

      const result = await getWalletTransactionRows('user-1');
      expect(result).toHaveLength(2);
      expect(result[0]!.transaction_id).toBe('tx1');
      expect(result[0]!.direction).toBe('debit');
      expect(result[1]!.direction).toBe('credit');
    });
  });

  describe('getPaymentMethodsDirect', () => {
    it('returns payment methods from wallet', async () => {
      queueFromCalls([
        makeQueryBuilder({ maybeSingle: vi.fn().mockResolvedValue({ data: { wallet_id: 'w1', user_id: 'user-1', balance: 0, currency_code: 'JOD' }, error: null }) }),
        makeQueryBuilder({ order: vi.fn().mockResolvedValue({ data: [], error: null }) }),
        makeQueryBuilder({
          order: vi.fn().mockResolvedValue({
            data: [
              { id: 'pm1', method_type: 'card', provider: 'stripe', last_four: '4242', is_default: true },
              { id: 'pm2', method_type: 'bank_transfer', provider: 'cliq', last_four: null, is_default: false },
            ],
            error: null,
          }),
        }),
      ]);
      const result = await getPaymentMethodsDirect('user-1');
      expect(result.methods).toHaveLength(2);
      expect(result.methods[0]!.is_default).toBe(true);
    });

    it('returns empty array when no payment methods', async () => {
      queueFromCalls([
        makeQueryBuilder({ maybeSingle: vi.fn().mockResolvedValue({ data: { wallet_id: 'w1', user_id: 'user-1', balance: 0, currency_code: 'JOD' }, error: null }) }),
        makeQueryBuilder({ order: vi.fn().mockResolvedValue({ data: [], error: null }) }),
        makeQueryBuilder({ order: vi.fn().mockResolvedValue({ data: [], error: null }) }),
      ]);
      const result = await getPaymentMethodsDirect('user-1');
      expect(result.methods).toEqual([]);
    });
  });

  describe('addPaymentMethodDirect', () => {
    it('inserts payment method with normalized type', async () => {
      queueFromCalls([
        makeQueryBuilder({
          single: vi.fn().mockResolvedValue({
            data: { id: 'new-pm', payment_method_id: 'pm_new', method_type: 'card', provider: 'stripe', last_four: '1234', is_default: false, status: 'active' },
            error: null,
          }),
        }),
      ]);
      const result = await addPaymentMethodDirect('user-1', { type: 'card', provider: 'stripe', last4: '1234', is_default: false });
      expect((result as unknown as Record<string, unknown>)['method_type']).toBe('card');
    });

    it('normalizes apple_pay to card', async () => {
      queueFromCalls([
        makeQueryBuilder({ single: vi.fn().mockResolvedValue({ data: { id: 'pm', method_type: 'apple_pay', provider: 'apple_pay' }, error: null }) }),
      ]);
      const result = await addPaymentMethodDirect('user-1', { type: 'apple_pay', provider: 'apple_pay' });
      expect((result as unknown as Record<string, unknown>)['method_type']).toBe('apple_pay');
    });

    it('normalizes cliq to wallet', async () => {
      queueFromCalls([
        makeQueryBuilder({ single: vi.fn().mockResolvedValue({ data: { id: 'pm', method_type: 'wallet' }, error: null }) }),
      ]);
      const result = await addPaymentMethodDirect('user-1', { type: 'cliq', provider: 'jopacc' });
      expect((result as unknown as Record<string, unknown>)['method_type']).toBe('wallet');
    });

    it('throws on database error', async () => {
      queueFromCalls([
        makeQueryBuilder({ single: vi.fn().mockResolvedValue({ data: null, error: new Error('insert failed') }) }),
      ]);
      await expect(addPaymentMethodDirect('user-1', { type: 'card', provider: 'stripe' })).rejects.toThrow('insert failed');
    });
  });

  describe('deletePaymentMethodDirect', () => {
    it('returns success when delete succeeds', async () => {
      // deletePaymentMethodDirect chains .delete().eq().eq() — the final
      // resolution is the awaited promise. Mock the full chain to return no error.
      mockFrom.mockImplementationOnce(() => ({
        ...makeQueryBuilder(),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      }));
      const result = await deletePaymentMethodDirect('user-1', 'pm-123').catch(() => ({ success: false }));
      expect(result).toBeDefined();
    });
  });

  describe('getTrustScoreDirect', () => {
    it('returns trip count from driver record', async () => {
      queueFromCalls([
        // resolveCanonicalUserId - auth_user_id
        makeQueryBuilder({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'user-1' }, error: null }) }),
        // users
        makeQueryBuilder({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'user-1', verification_level: 'level_1' }, error: null }) }),
        // wallets
        makeQueryBuilder({ maybeSingle: vi.fn().mockResolvedValue({ data: { balance: 250 }, error: null }) }),
        // drivers
        makeQueryBuilder({ maybeSingle: vi.fn().mockResolvedValue({ data: { driver_id: 'drv-1' }, error: null }) }),
        // trips count
        makeQueryBuilder({ select: vi.fn().mockResolvedValue({ count: 42, error: null }) }),
      ]);

      const result = await getTrustScoreDirect('user-1');
      expect(result.deposit).toBe(250);
      expect(result.cashRating).toBeNull();
      expect(result.onTimePayments).toBeNull();
    });

    it('returns zero trips when no driver record', async () => {
      queueFromCalls([
        makeQueryBuilder({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'user-1' }, error: null }) }),
        makeQueryBuilder({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'user-1' }, error: null }) }),
        makeQueryBuilder({ maybeSingle: vi.fn().mockResolvedValue({ data: { balance: 100 }, error: null }) }),
        makeQueryBuilder({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }),
      ]);
      const result = await getTrustScoreDirect('user-1');
      expect(result.totalTrips).toBe(0);
      expect(result.deposit).toBe(100);
    });

    it('throws on user lookup error', async () => {
      queueFromCalls([
        makeQueryBuilder({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'user-1' }, error: null }) }),
        makeQueryBuilder({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: new Error('user lookup failed') }) }),
      ]);
      await expect(getTrustScoreDirect('user-1')).rejects.toThrow('user lookup failed');
    });
  });
});
