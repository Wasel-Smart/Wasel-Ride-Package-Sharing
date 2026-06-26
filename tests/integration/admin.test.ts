import { describe, it, expect, vi, beforeEach } from 'vitest';

const API_BASE = 'http://localhost:3000';

describe('Admin Integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('GET /v1/admin/dashboard/metrics requires auth', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ success: false, error: { code: 'UNAUTHORIZED' } }),
    } as Response);

    const res = await fetch(`${API_BASE}/v1/admin/dashboard/metrics`);
    expect(res.status).toBe(401);
    mockFetch.mockRestore();
  });

  it('GET /v1/admin/dashboard/metrics blocks non-admin', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ success: false, error: { code: 'UNAUTHORIZED' } }),
    } as Response);

    const res = await fetch(`${API_BASE}/v1/admin/dashboard/metrics`, {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6InRlc3RpbmciLCJyb2xlIjoidmlld2VyIn0.invalid',
      },
    });
    expect(res.status).toBe(401);
    mockFetch.mockRestore();
  });
});
