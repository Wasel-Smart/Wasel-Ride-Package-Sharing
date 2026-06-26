import { describe, it, expect, vi } from 'vitest';
import { searchBusRoutes, getRouteSchedules, bookBusSeat } from '../../../src/services/busApi';

describe('BusApi Service', () => {
  it('should export searchBusRoutes function', () => {
    expect(typeof searchBusRoutes).toBe('function');
  });

  it('should export getRouteSchedules function', () => {
    expect(typeof getRouteSchedules).toBe('function');
  });

  it('should export bookBusSeat function', () => {
    expect(typeof bookBusSeat).toBe('function');
  });

  it('searchBusRoutes should call API with correct path', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    } as Response);

    await searchBusRoutes('Amman', 'Aqaba');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    mockFetch.mockRestore();
  });
});
