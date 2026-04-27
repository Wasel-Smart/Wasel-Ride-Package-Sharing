import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCreateTrip = vi.fn();
const mockFetchWithRetry = vi.fn();
const mockGetAuthDetails = vi.fn();
const mockUpdateDirectPackageStatus = vi.fn();
const mockGetDirectPackageByTrackingId = vi.fn();
const memoryStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    clear: () => { store = {}; },
    removeItem: (key: string) => { delete store[key]; },
  };
})();

vi.mock('../../../src/services/trips', () => ({
  tripsAPI: {
    createTrip: (...args: any[]) => mockCreateTrip(...args),
  },
}));

vi.mock('../../../src/services/core', () => ({
  API_URL: 'https://test.supabase.co/functions/v1/server',
  fetchWithRetry: (...args: any[]) => mockFetchWithRetry(...args),
  getAuthDetails: () => mockGetAuthDetails(),
}));

vi.mock('../../../src/services/directSupabase', () => ({
  createDirectPackage: vi.fn(),
  getDirectPackageByTrackingId: (...args: any[]) => mockGetDirectPackageByTrackingId(...args),
  updateDirectPackageStatus: (...args: any[]) => mockUpdateDirectPackageStatus(...args),
}));

import {
  createConnectedPackage,
  createConnectedRide,
  getConnectedPackages,
  getConnectedRides,
  getPackageByTrackingId,
  updatePackageVerification,
} from '../../../src/services/journeyLogistics';

function response(data: any, ok = true) {
  return {
    ok,
    json: async () => data,
  };
}

describe('journeyLogistics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('window', { localStorage: memoryStorage } as any);
    memoryStorage.clear();
    mockGetAuthDetails.mockResolvedValue({ token: 'token-123', userId: 'user-123' });
    mockUpdateDirectPackageStatus.mockResolvedValue(null);
    mockGetDirectPackageByTrackingId.mockResolvedValue(null);
  });

  it('creates a ride through the server and stores the normalized result locally', async () => {
    mockCreateTrip.mockResolvedValue({
      id: 'trip-1',
      from_location: 'Amman',
      to_location: 'Aqaba',
      departure_date: '2026-04-01',
      departure_time: '07:00',
      available_seats: 3,
      price_per_seat: 8,
      vehicle_model: 'Toyota Camry',
      notes: 'Morning ride',
      created_at: '2026-03-27T00:00:00Z',
    });

    const created = await createConnectedRide({
      from: 'Amman',
      to: 'Aqaba',
      date: '2026-04-01',
      time: '07:00',
      seats: 3,
      price: 8,
      gender: 'mixed',
      prayer: true,
      carModel: 'Toyota Camry',
      note: 'Morning ride',
      acceptsPackages: true,
      packageCapacity: 'medium',
      packageNote: 'Small parcels only',
    });

    expect(mockCreateTrip).toHaveBeenCalledOnce();
    expect(created.id).toBe('trip-1');
    expect(created.syncState).toBe('synced');
    expect(getConnectedRides()).toHaveLength(1);
  });

  it('marks a package as matched to a rider trip when a compatible ride exists', async () => {
    mockCreateTrip.mockResolvedValue({
      id: 'trip-2',
      from_location: 'Amman',
      to_location: 'Irbid',
      departure_date: '2026-04-01',
      departure_time: '08:00',
      available_seats: 2,
      price_per_seat: 5,
      vehicle_model: 'Hyundai Elantra',
      notes: 'Morning route',
      created_at: '2026-03-27T00:00:00Z',
    });

    await createConnectedRide({
      from: 'Amman',
      to: 'Irbid',
      date: '2026-04-01',
      time: '08:00',
      seats: 2,
      price: 5,
      gender: 'mixed',
      prayer: false,
      carModel: 'Hyundai Elantra',
      note: 'Morning route',
      acceptsPackages: true,
      packageCapacity: 'medium',
      packageNote: 'Small parcels only',
    });

    mockFetchWithRetry.mockResolvedValueOnce(
      response({
        package: {
          id: 'pkg-match',
          tracking_code: 'PKG-22222',
          from: 'Amman',
          to: 'Irbid',
          status: 'matched',
          trip_id: 'trip-2',
          driver_name: 'Hyundai Captain',
          driver_phone: '+962790000123',
          created_at: '2026-03-27T00:00:00Z',
        },
      }),
    );

    const created = await createConnectedPackage({
      from: 'Amman',
      to: 'Irbid',
      weight: '1 kg',
      note: 'Documents',
    });

    expect(created.status).toBe('matched');
    expect(created.syncState).toBe('synced');
    expect(created.handoffCode).toMatch(/^HC-\d{6}$/);
    expect(created.timeline.map((step) => step.label)).toEqual([
      'Request received',
      'Matched to a rider trip',
      'Sender shared OTP handoff code',
      'Rider pickup confirmed',
      'Receiver delivery confirmed',
    ]);
  });

  it('progresses package verification from OTP handoff to final delivery', async () => {
    mockCreateTrip.mockResolvedValue({
      id: 'trip-verify',
      from_location: 'Amman',
      to_location: 'Aqaba',
      departure_date: '2026-04-01',
      departure_time: '09:00',
      available_seats: 2,
      price_per_seat: 8,
      vehicle_model: 'Toyota Camry',
      notes: 'Verification route',
      created_at: '2026-03-27T00:00:00Z',
    });

    mockFetchWithRetry.mockResolvedValueOnce(
      response({
        package: {
          id: 'pkg-verify',
          tracking_code: 'PKG-33333',
          from: 'Amman',
          to: 'Aqaba',
          status: 'matched',
          trip_id: 'trip-verify',
          created_at: '2026-03-27T00:00:00Z',
        },
      }),
    );

    await createConnectedRide({
      from: 'Amman',
      to: 'Aqaba',
      date: '2026-04-01',
      time: '09:00',
      seats: 2,
      price: 8,
      gender: 'mixed',
      prayer: false,
      carModel: 'Toyota Camry',
      note: 'Verification route',
      acceptsPackages: true,
      packageCapacity: 'medium',
      packageNote: 'Documents only',
    });

    const created = await createConnectedPackage({
      from: 'Amman',
      to: 'Aqaba',
      weight: '1 kg',
      note: 'Passport',
      recipientName: 'Lina',
      recipientPhone: '+962790000001',
    });

    mockUpdateDirectPackageStatus.mockResolvedValueOnce({
      id: 'pkg-verify',
      tracking_code: 'PKG-33333',
      from: 'Amman',
      to: 'Aqaba',
      status: 'matched',
      trip_id: 'trip-verify',
      created_at: '2026-03-27T00:00:00Z',
    });
    const codeShared = await updatePackageVerification(created.trackingId, 'share_code');
    expect(codeShared?.verification.senderCodeSharedAt).toBeTruthy();
    expect(codeShared?.timeline[2].complete).toBe(true);

    mockUpdateDirectPackageStatus.mockResolvedValueOnce({
      id: 'pkg-verify',
      tracking_code: 'PKG-33333',
      from: 'Amman',
      to: 'Aqaba',
      status: 'in_transit',
      trip_id: 'trip-verify',
      created_at: '2026-03-27T00:00:00Z',
    });
    const pickedUp = await updatePackageVerification(created.trackingId, 'confirm_pickup');
    expect(pickedUp?.status).toBe('in_transit');
    expect(pickedUp?.verification.riderPickupConfirmedAt).toBeTruthy();
    expect(pickedUp?.timeline[3].complete).toBe(true);

    mockUpdateDirectPackageStatus.mockResolvedValueOnce({
      id: 'pkg-verify',
      tracking_code: 'PKG-33333',
      from: 'Amman',
      to: 'Aqaba',
      status: 'delivered',
      trip_id: 'trip-verify',
      created_at: '2026-03-27T00:00:00Z',
    });
    const delivered = await updatePackageVerification(created.trackingId, 'confirm_delivery');
    expect(delivered?.status).toBe('delivered');
    expect(delivered?.verification.receiverDeliveryConfirmedAt).toBeTruthy();
    expect(delivered?.timeline[4].complete).toBe(true);
  });

  it('fails closed when auth or server is unavailable', async () => {
    mockGetAuthDetails.mockRejectedValue(new Error('not signed in'));

    await expect(
      createConnectedPackage({
        from: 'Amman',
        to: 'Irbid',
        weight: '<1 kg',
        note: 'Documents',
      }),
    ).rejects.toThrow('Package request could not be created right now. Please try again.');
    expect(getConnectedPackages()).toHaveLength(0);
  });

  it('rejects packages when sender and receiver cities are the same', async () => {
    await expect(
      createConnectedPackage({
        from: 'Amman',
        to: 'Amman',
        weight: '1 kg',
        note: 'Same city test',
      }),
    ).rejects.toThrow('Sender and receiver locations must be different.');
  });

  it('attempts to persist packages remotely when auth is available even without recipient details', async () => {
    mockFetchWithRetry.mockResolvedValue(
      response({
        package: {
          id: 'pkg-remote-basic',
          tracking_code: 'PKG-11111',
          from: 'Amman',
          to: 'Zarqa',
          status: 'pending',
          created_at: '2026-03-27T00:00:00Z',
        },
      })
    );

    const created = await createConnectedPackage({
      from: 'Amman',
      to: 'Zarqa',
      weight: '1',
      note: 'Documents',
    });

    expect(mockFetchWithRetry).toHaveBeenCalledWith(
      expect.stringContaining('/packages'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(created.trackingId).toBe('PKG-11111');
  });

  it('creates a package via the server when recipient details are present', async () => {
    mockFetchWithRetry.mockResolvedValue(
      response({
        package: {
          id: 'pkg-remote',
          tracking_code: 'PKG-54321',
          from: 'Amman',
          to: 'Aqaba',
          status: 'pending',
          created_at: '2026-03-27T00:00:00Z',
        },
      })
    );

    const created = await createConnectedPackage({
      from: 'Amman',
      to: 'Aqaba',
      weight: '2',
      note: 'Gift',
      recipientName: 'Sara Ali',
      recipientPhone: '+962790000000',
    });

    expect(mockFetchWithRetry).toHaveBeenCalledWith(
      expect.stringContaining('/packages'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(created.trackingId).toBe('PKG-54321');
    expect(created.syncState).toBe('synced');
  });

  it('looks up remote package tracking when local state is empty', async () => {
    mockFetchWithRetry.mockResolvedValue(
      response({
        id: 'pkg-remote',
        tracking_code: 'PKG-67890',
        from: 'Amman',
        to: 'Dead Sea',
        status: 'delivered',
        created_at: '2026-03-27T00:00:00Z',
      })
    );

    const found = await getPackageByTrackingId('pkg-67890');

    expect(found?.trackingId).toBe('PKG-67890');
    expect(found?.status).toBe('delivered');
    expect(found?.syncState).toBe('synced');
  });
});
