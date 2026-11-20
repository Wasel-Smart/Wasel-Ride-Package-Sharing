import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCreateTrip = vi.fn();
const mockFetchWithRetry = vi.fn();
const mockGetAuthDetails = vi.fn();
const memoryStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    clear: () => { store = {}; },
    removeItem: (key: string) => { delete store[key]; },
    dump: () => Object.values(store).join(' '),
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
  supabase: null,
}));

import {
  createConnectedPackage,
  createConnectedRide,
  getConnectedPackages,
  getConnectedRides,
  getPackageByTrackingId,
  openPackageDispute,
  rotatePackageHandoffCodes,
  updatePackageVerification,
} from '../../../src/services/journeyLogistics';

function response(data: any, ok = true) {
  return {
    ok,
    status: ok ? 200 : 400,
    json: async () => data,
  };
}

describe('journeyLogistics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('window', { localStorage: memoryStorage } as any);
    memoryStorage.clear();
    mockGetAuthDetails.mockResolvedValue({ token: 'token-123', userId: 'user-123' });
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

  it('creates packages with server-generated tracking IDs and one-time OTPs', async () => {
    mockFetchWithRetry.mockResolvedValueOnce(response({
      package: {
        id: 'pkg-remote',
        tracking_code: 'WSL-PKG-123456789ABC',
        from: 'Amman',
        to: 'Aqaba',
        status: 'searching',
        payment_status: 'unpaid',
        handoffCode: '123456',
        deliveryCode: '654321',
        created_at: '2026-03-27T00:00:00Z',
      },
    }));

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
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer token-123' }),
      }),
    );
    expect(created.trackingId).toBe('WSL-PKG-123456789ABC');
    expect(created.handoffCode).toBe('123456');
    expect(created.deliveryCode).toBe('654321');
    expect(created.syncState).toBe('synced');
    expect(memoryStorage.dump()).not.toContain('123456');
    expect(memoryStorage.dump()).not.toContain('654321');
  });

  it('passes a preferred trip to the server for authoritative assignment', async () => {
    mockFetchWithRetry.mockResolvedValueOnce(response({
      package: {
        id: 'pkg-assigned',
        tracking_code: 'WSL-PKG-ASSIGNED123',
        from: 'Amman',
        to: 'Irbid',
        status: 'matched',
        trip_id: 'trip-2',
        payment_status: 'unpaid',
        handoffCode: '234567',
        deliveryCode: '765432',
        created_at: '2026-03-27T00:00:00Z',
      },
    }));

    const created = await createConnectedPackage({
      from: 'Amman',
      to: 'Irbid',
      weight: '1 kg',
      note: 'Documents',
      preferredRideId: 'trip-2',
    });

    expect(created.status).toBe('matched');
    expect(created.matchedRideId).toBe('trip-2');
    const [, request] = mockFetchWithRetry.mock.calls[0];
    expect(JSON.parse(request.body).preferredRideId).toBe('trip-2');
  });

  it('requires server OTPs and private evidence for package custody transitions', async () => {
    mockFetchWithRetry
      .mockResolvedValueOnce(response({
        package: {
          id: 'pkg-verify',
          tracking_code: 'WSL-PKG-VERIFY123',
          from: 'Amman',
          to: 'Aqaba',
          status: 'matched',
          trip_id: 'trip-verify',
          payment_status: 'held',
          handoffCode: '123456',
          deliveryCode: '654321',
          created_at: '2026-03-27T00:00:00Z',
        },
      }))
      .mockResolvedValueOnce(response({
        package: {
          id: 'pkg-verify',
          tracking_code: 'WSL-PKG-VERIFY123',
          from: 'Amman',
          to: 'Aqaba',
          status: 'matched',
          trip_id: 'trip-verify',
          sender_code_shared_at: '2026-03-27T01:00:00Z',
          payment_status: 'held',
          created_at: '2026-03-27T00:00:00Z',
        },
      }))
      .mockResolvedValueOnce(response({
        package: {
          id: 'pkg-verify',
          tracking_code: 'WSL-PKG-VERIFY123',
          from: 'Amman',
          to: 'Aqaba',
          status: 'in_transit',
          trip_id: 'trip-verify',
          pickup_verified_at: '2026-03-27T02:00:00Z',
          payment_status: 'held',
          created_at: '2026-03-27T00:00:00Z',
        },
      }))
      .mockResolvedValueOnce(response({
        package: {
          id: 'pkg-verify',
          tracking_code: 'WSL-PKG-VERIFY123',
          from: 'Amman',
          to: 'Aqaba',
          status: 'delivered',
          trip_id: 'trip-verify',
          pickup_verified_at: '2026-03-27T02:00:00Z',
          delivery_verified_at: '2026-03-27T03:00:00Z',
          payment_status: 'released',
          created_at: '2026-03-27T00:00:00Z',
        },
      }));

    const created = await createConnectedPackage({
      from: 'Amman',
      to: 'Aqaba',
      weight: '1 kg',
      note: 'Passport',
    });

    const shared = await updatePackageVerification(created.trackingId, 'share_code');
    expect(shared?.verification.senderCodeSharedAt).toBeTruthy();

    const pickedUp = await updatePackageVerification(created.trackingId, 'confirm_pickup', '123456');
    expect(pickedUp?.status).toBe('in_transit');
    expect(pickedUp?.verification.riderPickupConfirmedAt).toBeTruthy();

    const delivered = await updatePackageVerification(
      created.trackingId,
      'confirm_delivery',
      '654321',
      'pkg-verify/delivery.jpg',
    );
    expect(delivered?.status).toBe('delivered');
    expect(delivered?.verification.receiverDeliveryConfirmedAt).toBeTruthy();

    expect(mockFetchWithRetry).toHaveBeenCalledTimes(4);
    expect(mockFetchWithRetry.mock.calls[1][1].method).toBe('PATCH');
    expect(JSON.parse(mockFetchWithRetry.mock.calls[2][1].body).code).toBe('123456');
    expect(JSON.parse(mockFetchWithRetry.mock.calls[3][1].body)).toMatchObject({
      action: 'confirm_delivery',
      code: '654321',
      evidencePath: 'pkg-verify/delivery.jpg',
    });
  });

  it('rotates one-time handoff codes through the authenticated server', async () => {
    mockFetchWithRetry
      .mockResolvedValueOnce(response({
        package: {
          id: 'pkg-rotate',
          tracking_code: 'WSL-PKG-ROTATE123',
          from: 'Amman',
          to: 'Aqaba',
          status: 'matched',
          trip_id: 'trip-rotate',
          payment_status: 'unpaid',
          handoffCode: '123456',
          deliveryCode: '654321',
          created_at: '2026-03-27T00:00:00Z',
        },
      }))
      .mockResolvedValueOnce(response({
        package: {
          id: 'pkg-rotate',
          tracking_code: 'WSL-PKG-ROTATE123',
          from: 'Amman',
          to: 'Aqaba',
          status: 'matched',
          trip_id: 'trip-rotate',
          payment_status: 'unpaid',
          handoffCode: '234567',
          deliveryCode: '765432',
          created_at: '2026-03-27T00:00:00Z',
        },
      }));

    const created = await createConnectedPackage({
      from: 'Amman',
      to: 'Aqaba',
      weight: '1 kg',
      note: 'Small parcel',
    });
    const codes = await rotatePackageHandoffCodes(created.trackingId);

    expect(codes).toEqual({ handoffCode: '234567', deliveryCode: '765432' });
    expect(mockFetchWithRetry.mock.calls[1][1].method).toBe('POST');
    expect(mockFetchWithRetry.mock.calls[1][0]).toContain('/rotate-codes');
  });

  it('opens disputes through the server and records the frozen state', async () => {
    mockFetchWithRetry
      .mockResolvedValueOnce(response({
        package: {
          id: 'pkg-dispute',
          tracking_code: 'WSL-PKG-DISPUTE12',
          from: 'Amman',
          to: 'Aqaba',
          status: 'matched',
          trip_id: 'trip-dispute',
          payment_status: 'held',
          handoffCode: '123456',
          deliveryCode: '654321',
          created_at: '2026-03-27T00:00:00Z',
        },
      }))
      .mockResolvedValueOnce(response({
        package: {
          id: 'pkg-dispute',
          tracking_code: 'WSL-PKG-DISPUTE12',
          from: 'Amman',
          to: 'Aqaba',
          status: 'disputed',
          trip_id: 'trip-dispute',
          payment_status: 'disputed',
          created_at: '2026-03-27T00:00:00Z',
        },
      }));

    const created = await createConnectedPackage({
      from: 'Amman',
      to: 'Aqaba',
      weight: '1 kg',
      note: 'Fragile item',
    });
    const updated = await openPackageDispute(created.trackingId, 'Package arrived damaged');

    expect(updated?.status).toBe('disputed');
    expect(updated?.paymentStatus).toBe('disputed');
    expect(mockFetchWithRetry.mock.calls[1][1].method).toBe('POST');
    expect(JSON.parse(mockFetchWithRetry.mock.calls[1][1].body)).toEqual({
      reason: 'Package arrived damaged',
    });
  });

  it('loads tracking only from the authenticated server, not browser cache', async () => {
    mockFetchWithRetry.mockResolvedValueOnce(response({
      package: {
        id: 'pkg-remote',
        tracking_code: 'WSL-PKG-TRACK123',
        from: 'Amman',
        to: 'Dead Sea',
        status: 'delivered',
        payment_status: 'released',
        created_at: '2026-03-27T00:00:00Z',
      },
    }));

    const found = await getPackageByTrackingId('wsl-pkg-track123');

    expect(found?.trackingId).toBe('WSL-PKG-TRACK123');
    expect(found?.status).toBe('delivered');
    expect(mockFetchWithRetry).toHaveBeenCalledWith(
      expect.stringContaining('/packages/track/WSL-PKG-TRACK123'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token-123' }),
      }),
    );
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
});
