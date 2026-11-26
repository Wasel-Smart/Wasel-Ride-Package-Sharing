import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchWithRetryMock } = vi.hoisted(() => ({ fetchWithRetryMock: vi.fn() }));

vi.mock('../core', () => ({
  API_URL: 'https://edge.example.test/functions/v1',
  createEdgeHeaders: vi.fn(() => new Headers()),
  fetchWithRetry: fetchWithRetryMock,
  getAuthDetails: vi.fn(async () => ({ token: 'test-token', userId: 'test-user' })),
}));

import { createConnectedPackage, getConnectedPackages } from '../journeyLogistics';

describe('createConnectedPackage submission failures', () => {
  beforeEach(() => {
    localStorage.clear();
    fetchWithRetryMock.mockReset();
  });

  it('does not create a local matched package when the server rejects submission', async () => {
    fetchWithRetryMock.mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: 'Service unavailable' }),
    });

    await expect(createConnectedPackage({
      from: 'Amman',
      to: 'Aqaba',
      weight: '<1 kg',
      note: '',
    })).rejects.toThrow('Package request failed: Service unavailable');

    expect(getConnectedPackages()).toEqual([]);
  });

  it('does not save a package when the request cannot reach the server', async () => {
    fetchWithRetryMock.mockRejectedValue(new TypeError('Network unavailable'));

    await expect(createConnectedPackage({
      from: 'Amman',
      to: 'Aqaba',
      weight: '<1 kg',
      note: '',
    })).rejects.toThrow('Network unavailable');

    expect(getConnectedPackages()).toEqual([]);
  });
});
