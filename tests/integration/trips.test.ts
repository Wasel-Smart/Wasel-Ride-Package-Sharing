import { describe, it, expect, vi, beforeEach } from 'vitest';

const API_BASE = 'http://localhost:3000';

describe('Trips Integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('POST /v1/trips requires auth header', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ success: false, error: { code: 'UNAUTHORIZED' } }),
    } as Response);

    const res = await fetch(`${API_BASE}/v1/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'carpooling' }),
    });
    expect(res.status).toBe(401);
    mockFetch.mockRestore();
  });

  it('GET /v1/trips/search requires auth header', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ success: false, error: { code: 'UNAUTHORIZED' } }),
    } as Response);

    const res = await fetch(`${API_BASE}/v1/trips/search`);
    expect(res.status).toBe(401);
    mockFetch.mockRestore();
  });

  it('GET /v1/trips/:id requires auth header', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ success: false, error: { code: 'UNAUTHORIZED' } }),
    } as Response);

    const res = await fetch(`${API_BASE}/v1/trips/some-id`);
    expect(res.status).toBe(401);
    mockFetch.mockRestore();
  });
});
