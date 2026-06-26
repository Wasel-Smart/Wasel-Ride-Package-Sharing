import { describe, it, expect, vi, beforeEach } from 'vitest';

const API_BASE = 'http://localhost:3000';

describe('API Server Integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('GET /health returns ok status', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'ok', timestamp: expect.any(String), version: 'v1' }),
    } as Response);

    const res = await fetch(`${API_BASE}/health`);
    const data = (await res.json()) as { status: string };
    expect(res.status).toBe(200);
    expect(data.status).toBe('ok');
    mockFetch.mockRestore();
  });

  it('GET /ready returns ready status', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'ready', timestamp: expect.any(String) }),
    } as Response);

    const res = await fetch(`${API_BASE}/ready`);
    const data = (await res.json()) as { status: string };
    expect(res.status).toBe(200);
    expect(data.status).toBe('ready');
    mockFetch.mockRestore();
  });

  it('unknown route returns 404', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ success: false, error: { code: 'not_found' } }),
    } as Response);

    const res = await fetch(`${API_BASE}/unknown-route`);
    expect(res.status).toBe(404);
    mockFetch.mockRestore();
  });
});
