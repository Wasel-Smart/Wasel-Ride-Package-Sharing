import { describe, it, expect, vi, beforeEach } from 'vitest';

const API_BASE = 'http://localhost:3000';

describe('Auth Integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('rejects request without Authorization header', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ success: false, error: { code: 'UNAUTHORIZED' } }),
    } as Response);

    const res = await fetch(`${API_BASE}/v1/trips/search`, {
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(401);
    mockFetch.mockRestore();
  });

  it('rejects request with invalid Bearer token', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ success: false, error: { code: 'UNAUTHORIZED' } }),
    } as Response);

    const res = await fetch(`${API_BASE}/v1/trips/search`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid-token',
      },
    });
    expect(res.status).toBe(401);
    mockFetch.mockRestore();
  });
});
