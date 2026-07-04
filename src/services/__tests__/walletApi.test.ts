import { describe, it, expect, vi, beforeEach } from 'vitest';
import { walletApi } from '../walletApi';

// Mock core
vi.mock('../core', () => {
  const mockSingle = vi.fn(async () => ({ data: null, error: null }));
  const mockSelect = vi.fn(() => ({ single: mockSingle }));
  const mockFrom = vi.fn(() => ({ select: mockSelect }));
  
  return {
    API_URL: '',
    supabase: {
      from: mockFrom,
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
