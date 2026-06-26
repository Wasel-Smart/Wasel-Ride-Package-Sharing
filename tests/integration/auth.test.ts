import { describe, it, expect, vi } from 'vitest';

const API_BASE = 'http://localhost:3000';

describe('Auth Integration', () => {
  it('rejects request without Authorization header', async () => {
    const res = await fetch(`${API_BASE}/v1/trips/search`, {
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(401);
  });

  it('rejects request with invalid Bearer token', async () => {
    const res = await fetch(`${API_BASE}/v1/trips/search`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid-token',
      },
    });
    expect(res.status).toBe(401);
  });
});
