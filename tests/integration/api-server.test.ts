import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

const API_BASE = 'http://localhost:3000';

describe('API Server Integration', () => {
  it('GET /health returns ok status', async () => {
    const res = await fetch(`${API_BASE}/health`);
    const data = (await res.json()) as { status: string };
    expect(res.status).toBe(200);
    expect(data.status).toBe('ok');
  });

  it('GET /ready returns ready status', async () => {
    const res = await fetch(`${API_BASE}/ready`);
    const data = (await res.json()) as { status: string };
    expect(res.status).toBe(200);
    expect(data.status).toBe('ready');
  });

  it('unknown route returns 404', async () => {
    const res = await fetch(`${API_BASE}/unknown-route`);
    expect(res.status).toBe(404);
  });
});
