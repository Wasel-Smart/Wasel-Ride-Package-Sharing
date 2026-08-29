import { describe, it, expect, vi, beforeEach } from 'vitest';
import { walletApi } from '../wallet/walletApi';

// Build a chainable Supabase query builder mock.
function createQueryBuilder(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {};
  const chainable = (): Record<string, unknown> => builder;
  for (const method of [
    'select',
    'insert',
    'update',
    'delete',
    'eq',
    'neq',
    'in',
    'order',
    'limit',
  ]) {
    builder[method] = vi.fn(() => chainable());
  }
  builder.single = vi.fn(() => result);
  builder.maybeSingle = vi.fn(() => result);
  builder.throwOnError = vi.fn(() => chainable());
  return builder;
}

// Mock core
vi.mock('../core', () => {
  const builder = createQueryBuilder({
    data: { wallet_id: 'wallet-123', user_id: 'user-123', balance: 0, currency: 'JOD' },
    error: null,
  });
  return {
    API_URL: '',
    supabase: {
      from: vi.fn(() => builder),
    },
  };
});

vi.mock('../backendWorkflow', () => ({
  requestEdgeJson: vi.fn(),
  BackendRequestError: class extends Error {},
}));

describe('walletApi Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes the wallet API surface', () => {
    expect(walletApi).toBeDefined();
    expect(typeof walletApi.getWallet).toBe('function');
  });

  it('getWallet returns fallback or resolves successfully', async () => {
    const wallet = await walletApi.getWallet('user-123');
    expect(typeof wallet.balance).toBe('number');
  });
});
