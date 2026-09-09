jest.mock('../lib/config', () => ({
  waselMobileConfig: {
    hasSupabase: true,
    apiUrl: 'https://wasel14.online',
    authRedirectUrl: 'wasel://auth/callback',
  },
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

jest.mock('../services/offline', () => ({
  offlineService: {
    isDeviceOnline: jest.fn().mockReturnValue(true),
    queueOfflineAction: jest.fn(),
    cacheActiveRide: jest.fn(),
    getCachedActiveRide: jest.fn().mockResolvedValue(null),
    cacheRideHistory: jest.fn(),
    getCachedRideHistory: jest.fn().mockResolvedValue(null),
    cacheDriverInfo: jest.fn(),
    getCachedDriverInfo: jest.fn().mockResolvedValue(null),
  },
}));

jest.mock('../lib/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    request: jest.fn(),
  },
}));

jest.mock('../services/auth', () => ({
  mobileAuth: {
    getUser: jest.fn().mockReturnValue({ id: 'user-1' }),
    getAccessToken: jest.fn().mockReturnValue('test-token'),
  },
}));

import { RideLifecycleService, type RideRequest } from '../services/ride';

beforeAll(() => {
  process.env.EXPO_PUBLIC_API_URL = 'https://api.test.wasel';
});

afterAll(() => {
  delete process.env.EXPO_PUBLIC_API_URL;
});

describe('RideLifecycleService', () => {
  let service: RideLifecycleService;

  const validRequest: RideRequest = {
    origin: { latitude: 31.95, longitude: 35.91, address: 'Amman' },
    destination: { latitude: 31.96, longitude: 35.88, address: 'Aqaba' },
    seats: 2,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RideLifecycleService();
  });

  describe('requestRide', () => {
    it('returns error when user is not authenticated', async () => {
      const { mobileAuth } = require('../services/auth');
      mobileAuth.getUser.mockReturnValueOnce(null);

      const result = await service.requestRide(validRequest);
      expect(result.error).toEqual(new Error('User not authenticated'));
    });

    it('queues action when offline', async () => {
      const { offlineService } = require('../services/offline');
      offlineService.isDeviceOnline.mockReturnValueOnce(false);

      const result = await service.requestRide(validRequest);
      expect(result.error).toBeDefined();
      expect(offlineService.queueOfflineAction).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'RIDE_REQUEST' }),
      );
    });

    it('sends request to API and returns ride on success', async () => {
      const { apiClient } = require('../lib/api');
      apiClient.post.mockResolvedValueOnce({
        data: { ride: { id: 'ride-1', status: 'requested', origin_address: 'Amman' } },
        error: null,
        status: 200,
      });

      const result = await service.requestRide(validRequest);
      expect(result.ride).toBeDefined();
      expect(result.ride?.id).toBe('ride-1');
      expect(apiClient.post).toHaveBeenCalledWith(
        expect.stringContaining('/trips'),
        expect.objectContaining({ from: 'Amman', to: 'Aqaba', seats: 2 }),
      );
    });

    it('returns error on API failure', async () => {
      const { apiClient } = require('../lib/api');
      apiClient.post.mockResolvedValueOnce({ data: null, error: new Error('Server error'), status: 500 });

      const result = await service.requestRide(validRequest);
      expect(result.error).toBeDefined();
    });
  });

  describe('cancelRide', () => {
    it('queues action when offline', async () => {
      const { offlineService } = require('../services/offline');
      offlineService.isDeviceOnline.mockReturnValueOnce(false);

      const result = await service.cancelRide('ride-1', 'Changed my mind');
      expect(result).toEqual({});
      expect(offlineService.queueOfflineAction).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'RIDE_CANCEL', payload: { rideId: 'ride-1', reason: 'Changed my mind' } }),
      );
    });

    it('sends cancel request to API on success', async () => {
      const { apiClient } = require('../lib/api');
      apiClient.post.mockResolvedValueOnce({ data: {}, error: null, status: 200 });

      const result = await service.cancelRide('ride-1');
      expect(result).toEqual({});
      expect(apiClient.post).toHaveBeenCalledWith(
        expect.stringContaining('/cancellations/bookings'),
        expect.objectContaining({ bookingId: 'ride-1', reason: 'Cancelled from mobile' }),
      );
    });
  });

  describe('rateRide', () => {
    it('queues action when offline', async () => {
      const { offlineService } = require('../services/offline');
      offlineService.isDeviceOnline.mockReturnValueOnce(false);

      const result = await service.rateRide('ride-1', 5, 'Great ride');
      expect(result).toEqual({});
      expect(offlineService.queueOfflineAction).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'RIDE_RATING' }),
      );
    });

    it('sends rating to API on success', async () => {
      const { apiClient } = require('../lib/api');
      apiClient.post.mockResolvedValueOnce({ data: {}, error: null, status: 200 });

      const result = await service.rateRide('ride-1', 5, 'Great ride');
      expect(result).toEqual({});
    });
  });

  describe('getActiveRide', () => {
    it('returns cached ride when offline', async () => {
      const { offlineService } = require('../services/offline');
      offlineService.isDeviceOnline.mockReturnValueOnce(false);
      const cachedRide = { id: 'ride-1', status: 'requested' };
      offlineService.getCachedActiveRide.mockResolvedValueOnce(cachedRide);

      const ride = await service.getActiveRide();
      expect(ride).toEqual(cachedRide);
    });

    it('returns null when no active ride online', async () => {
      const { apiClient } = require('../lib/api');
      apiClient.get.mockResolvedValueOnce({
        data: { ride: null },
        error: null,
        status: 200,
      });

      const ride = await service.getActiveRide();
      expect(ride).toBeNull();
    });
  });

  describe('getRideHistory', () => {
    it('returns cached history when offline', async () => {
      const { offlineService } = require('../services/offline');
      offlineService.isDeviceOnline.mockReturnValueOnce(false);
      offlineService.getCachedRideHistory.mockResolvedValueOnce([{ id: 'ride-1' }]);

      const rides = await service.getRideHistory();
      expect(rides).toHaveLength(1);
    });

    it('returns rides from API on success', async () => {
      const { apiClient } = require('../lib/api');
      apiClient.get.mockResolvedValueOnce({
        data: { rides: [{ id: 'ride-1', status: 'completed', origin_address: 'Amman' }] },
        error: null,
        status: 200,
      });

      const rides = await service.getRideHistory();
      expect(rides).toHaveLength(1);
      expect(rides[0].id).toBe('ride-1');
    });
  });

  describe('subscribe', () => {
    it('notifies listeners with current state', () => {
      const listener = jest.fn();
      const unsubscribe = service.subscribe(listener);
      expect(listener).toHaveBeenCalledWith(null);
      unsubscribe();
    });

    it('unsubscribes properly', () => {
      const listener = jest.fn();
      const unsubscribe = service.subscribe(listener);
      unsubscribe();
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});
