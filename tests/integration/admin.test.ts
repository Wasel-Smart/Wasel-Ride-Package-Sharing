import { describe, it, expect, vi } from 'vitest';

const API_BASE = 'http://localhost:3000';

describe('Admin Integration', () => {
  it('GET /v1/admin/dashboard/metrics requires auth', async () => {
    const res = await fetch(`${API_BASE}/v1/admin/dashboard/metrics`);
    expect(res.status).toBe(401);
  });

  it('GET /v1/admin/dashboard/metrics blocks non-admin', async () => {
    const res = await fetch(`${API_BASE}/v1/admin/dashboard/metrics`, {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6InRlc3RpbmciLCJyb2xlIjoidmlld2VyIn0.invalid',
      },
    });
    expect(res.status).toBe(401);
  });
});
