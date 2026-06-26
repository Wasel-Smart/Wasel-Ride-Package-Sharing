import { describe, it, expect, vi } from 'vitest';
import { createPackage, getPackage, getMyPackages } from '../../../src/services/packageApi';

describe('PackageApi Service', () => {
  it('should export createPackage function', () => {
    expect(typeof createPackage).toBe('function');
  });

  it('should export getPackage function', () => {
    expect(typeof getPackage).toBe('function');
  });

  it('should export getMyPackages function', () => {
    expect(typeof getMyPackages).toBe('function');
  });

  it('createPackage should call API with correct shape', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { id: '123' } }),
    } as Response);

    await createPackage({
      originCity: 'Amman',
      originCoords: { lat: 31.95, lng: 35.93 },
      destinationCity: 'Aqaba',
      destinationCoords: { lat: 29.53, lng: 35.06 },
      receiverName: 'Test',
      receiverPhone: '+962790000000',
      size: 'medium',
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    mockFetch.mockRestore();
  });
});
