import { describe, it, expect, vi } from 'vitest';
import { searchTrips, getTripDetails, createTrip } from '../../../src/services/tripApi';

describe('TripApi Service', () => {
  it('should export searchTrips function', () => {
    expect(typeof searchTrips).toBe('function');
  });

  it('should export getTripDetails function', () => {
    expect(typeof getTripDetails).toBe('function');
  });

  it('should export createTrip function', () => {
    expect(typeof createTrip).toBe('function');
  });

  it('searchTrips should accept filters object', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [], meta: { total: 0, page: 1, limit: 20 } }),
    } as Response);

    await searchTrips({ originCity: 'Amman', destinationCity: 'Aqaba' });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    mockFetch.mockRestore();
  });
});
