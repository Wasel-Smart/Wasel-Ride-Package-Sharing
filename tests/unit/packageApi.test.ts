import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as packageApi from '@/services/packageApi';

const mockApi = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock('@/utils/api', () => {
  return {
    default: mockApi,
    api: mockApi,
    getSessionUserId: vi.fn(),
  };
});

describe('packageApi.test.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createPackage sends correct payload', async () => {
    mockApi.post.mockResolvedValue({ data: { id: 'p1', tracking_number: 'TRK1' } });

    const result = await packageApi.createPackage({
      originCity: 'Amman',
      originCoords: { lat: 31.9, lng: 35.9 },
      destinationCity: 'Aqaba',
      destinationCoords: { lat: 29.5, lng: 35.0 },
      receiverName: 'Ali',
      receiverPhone: '+962770000000',
      size: 'medium',
      weight: 5,
      description: 'books',
      declaredValue: 50,
      fragile: false,
    });

    expect(result.data.id).toBe('p1');
    expect(mockApi.post).toHaveBeenCalledWith('/v1/packages', expect.objectContaining({
      originCity: 'Amman',
      destinationCity: 'Aqaba',
      receiverName: 'Ali',
      size: 'medium',
    }));
  });

  it('getPackage fetches by id', async () => {
    mockApi.get.mockResolvedValue({ data: { id: 'p1', tracking_number: 'TRK1' } });

    const result = await packageApi.getPackage('p1');
    expect(result.data.id).toBe('p1');
    expect(mockApi.get).toHaveBeenCalledWith('/v1/packages/p1');
  });

  it('getMyPackages throws when not authenticated', async () => {
    const { getSessionUserId } = await import('@/utils/api');
    getSessionUserId.mockResolvedValue(null);

    await expect(packageApi.getMyPackages()).rejects.toThrow('Not authenticated');
  });

  it('getMyPackages fetches sender packages', async () => {
    const { getSessionUserId } = await import('@/utils/api');
    getSessionUserId.mockResolvedValue('user-1');
    mockApi.get.mockResolvedValue({ data: [{ id: 'p1' }] });

    const result = await packageApi.getMyPackages();
    expect(result.data).toHaveLength(1);
    expect(mockApi.get).toHaveBeenCalledWith('/v1/packages/sender/user-1');
  });

  it('updatePackageStatus sends correct payload', async () => {
    mockApi.post.mockResolvedValue({ data: { id: 'p1', status: 'in_transit' } });

    const result = await packageApi.updatePackageStatus('p1', 'in_transit', 'carrier-1');
    expect(result.data.status).toBe('in_transit');
    expect(mockApi.post).toHaveBeenCalledWith('/v1/packages/p1/status', {
      status: 'in_transit',
      carrierId: 'carrier-1',
    });
  });

  it('updatePackageStatus without carrier', async () => {
    mockApi.post.mockResolvedValue({ data: { id: 'p1', status: 'in_transit' } });

    await packageApi.updatePackageStatus('p1', 'in_transit');
    expect(mockApi.post).toHaveBeenCalledWith('/v1/packages/p1/status', {
      status: 'in_transit',
      carrierId: undefined,
    });
  });

  it('assignToTrip links package to trip', async () => {
    mockApi.post.mockResolvedValue({ data: { id: 'p1', trip_id: 't1' } });

    await packageApi.assignToTrip('p1', 't1');
    expect(mockApi.post).toHaveBeenCalledWith('/v1/packages/p1/assign-to-trip', { tripId: 't1' });
  });
});
