const mockMmkvStore = new Map<string, string>();

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getString: (key: string) => mockMmkvStore.get(key),
    set: (key: string, value: string) => {
      mockMmkvStore.set(key, value);
    },
    delete: (key: string) => {
      mockMmkvStore.delete(key);
    },
    getAllKeys: () => Array.from(mockMmkvStore.keys()),
  })),
}));

let mockNetInfoListener:
  | ((state: { isConnected: boolean | null; isInternetReachable?: boolean | null }) => void)
  | undefined;

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
    addEventListener: jest.fn((cb: (state: any) => void) => {
      mockNetInfoListener = cb;
      return () => {
        mockNetInfoListener = undefined;
      };
    }),
  },
}));

jest.mock('../services/auth', () => ({
  mobileAuth: {
    getAccessToken: jest.fn(),
    getUser: jest.fn(),
  },
}));

import { mobileAuth } from '../services/auth';
import { offlineService } from '../services/offline';

const QUEUE_KEY = '@wasel:offline_queue';

function goOnline() {
  mockNetInfoListener?.({ isConnected: true, isInternetReachable: true });
}
function goOffline() {
  mockNetInfoListener?.({ isConnected: false, isInternetReachable: false });
}

async function flushMicrotasks() {
  await new Promise(resolve => setTimeout(resolve, 0));
}

describe('OfflineService', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockMmkvStore.clear();
    process.env.EXPO_PUBLIC_API_URL = 'https://api.wasel14.online';
    (mobileAuth.getAccessToken as jest.Mock).mockReturnValue('token-123');
    (mobileAuth.getUser as jest.Mock).mockReturnValue({ id: 'user-1' });
    goOnline();
    await Promise.resolve();
  });

  describe('queueOfflineAction', () => {
    it('skips a duplicate action already in the persisted dedup cache', async () => {
      await offlineService.queueOfflineAction({ type: 'ISSUE_REPORT', payload: { note: 'pothole' } });
      await offlineService.queueOfflineAction({ type: 'ISSUE_REPORT', payload: { note: 'pothole' } });

      expect((await offlineService.getStats()).queueSize).toBe(1);
    });

    it('drops the oldest queued action once the queue is full', async () => {
      const seeded = Array.from({ length: 100 }, (_, i) => ({
        id: `seed-${i}`,
        type: 'ISSUE_REPORT',
        payload: { n: i },
        timestamp: i,
        retries: 0,
      }));
      mockMmkvStore.set(QUEUE_KEY, JSON.stringify(seeded));

      await offlineService.queueOfflineAction({ type: 'RIDE_REQUEST', payload: { from: 'A', to: 'B' } });

      expect((await offlineService.getStats()).queueSize).toBe(100);
    });
  });

  describe('syncOfflineQueue', () => {
    it('does not attempt to sync while offline', async () => {
      goOffline();
      await offlineService.queueOfflineAction({ type: 'ISSUE_REPORT', payload: { note: 'x' } });
      global.fetch = jest.fn();

      await offlineService.syncOfflineQueue();

      expect(global.fetch).not.toHaveBeenCalled();
      expect((await offlineService.getStats()).queueSize).toBe(1);
    });

    it('does nothing when the queue is empty', async () => {
      global.fetch = jest.fn();

      await offlineService.syncOfflineQueue();

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('removes an action from the queue once it syncs successfully', async () => {
      await offlineService.queueOfflineAction({ type: 'ISSUE_REPORT', payload: { note: 'broken light' } });
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

      await offlineService.syncOfflineQueue();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.wasel14.online/reports',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-Idempotency-Key': expect.any(String),
            Authorization: 'Bearer token-123',
          }),
        }),
      );
      expect((await offlineService.getStats()).queueSize).toBe(0);
    });

    it('treats a 409 idempotent replay as success', async () => {
      await offlineService.queueOfflineAction({ type: 'ISSUE_REPORT', payload: { note: 'dup' } });
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 409 });

      await offlineService.syncOfflineQueue();

      expect((await offlineService.getStats()).queueSize).toBe(0);
    });

    it('keeps a failed action in the queue with an incremented retry count', async () => {
      await offlineService.queueOfflineAction({ type: 'ISSUE_REPORT', payload: { note: 'server down' } });
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, statusText: 'Server Error' });

      await offlineService.syncOfflineQueue();

      expect((await offlineService.getStats()).queueSize).toBe(1);
    });

    it('discards an action once it exceeds the max retry count', async () => {
      const nearlyExhausted = [
        { id: 'a1', type: 'ISSUE_REPORT', payload: { note: 'x' }, timestamp: 1, retries: 5 },
      ];
      mockMmkvStore.set(QUEUE_KEY, JSON.stringify(nearlyExhausted));
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, statusText: 'Server Error' });

      await offlineService.syncOfflineQueue();

      expect((await offlineService.getStats()).queueSize).toBe(0);
    });

    it('builds a normalized trip payload for a queued ride request lacking from/to', async () => {
      await offlineService.queueOfflineAction({
        type: 'RIDE_REQUEST',
        payload: {
          origin_address: 'Amman',
          dest_address: 'Zarqa',
          origin_lat: 31.9,
          origin_lng: 35.9,
          dest_lat: 32.0,
          dest_lng: 36.0,
          seats: 2,
          notes: 'n',
        },
      });
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

      await offlineService.syncOfflineQueue();

      const [, options] = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.from).toBe('Amman');
      expect(body.to).toBe('Zarqa');
      expect(body.origin_lat).toBe(31.9);
      expect(body.dest_lat).toBe(32.0);
    });

    it('fails and retries a RIDE_CANCEL queued without a bookingId or rideId', async () => {
      await offlineService.queueOfflineAction({ type: 'RIDE_CANCEL', payload: { reason: 'changed my mind' } });
      global.fetch = jest.fn();

      await offlineService.syncOfflineQueue();

      expect(global.fetch).not.toHaveBeenCalled();
      expect((await offlineService.getStats()).queueSize).toBe(1);
    });

    it('fails a queued PROFILE_UPDATE when there is no authenticated user', async () => {
      (mobileAuth.getUser as jest.Mock).mockReturnValue(null);
      await offlineService.queueOfflineAction({ type: 'PROFILE_UPDATE', payload: { name: 'New Name' } });
      global.fetch = jest.fn();

      await offlineService.syncOfflineQueue();

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('fails every queued action when there is no access token', async () => {
      (mobileAuth.getAccessToken as jest.Mock).mockReturnValue(null);
      await offlineService.queueOfflineAction({ type: 'ISSUE_REPORT', payload: { note: 'x' } });
      global.fetch = jest.fn();

      await offlineService.syncOfflineQueue();

      expect(global.fetch).not.toHaveBeenCalled();
      expect((await offlineService.getStats()).queueSize).toBe(1);
    });

    it('refuses to sync against a disallowed API host', async () => {
      process.env.EXPO_PUBLIC_API_URL = 'http://169.254.169.254';
      await offlineService.queueOfflineAction({ type: 'ISSUE_REPORT', payload: { note: 'x' } });
      global.fetch = jest.fn();

      await offlineService.syncOfflineQueue();

      expect(global.fetch).not.toHaveBeenCalled();
      expect((await offlineService.getStats()).queueSize).toBe(1);
    });

    it('automatically syncs the queue when connectivity is restored', async () => {
      goOffline();
      await offlineService.queueOfflineAction({ type: 'ISSUE_REPORT', payload: { note: 'auto sync me' } });
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

      goOnline();
      await flushMicrotasks();

      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('cacheData / getCachedData', () => {
    it('returns cached data before it expires', async () => {
      await offlineService.cacheData('foo', { a: 1 }, 1000);
      const result = await offlineService.getCachedData<{ a: number }>('foo');
      expect(result).toEqual({ a: 1 });
    });

    it('returns null and evicts the entry once it has expired', async () => {
      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
      await offlineService.cacheData('bar', { b: 2 }, 500);
      nowSpy.mockReturnValue(1_000_000 + 600);

      const result = await offlineService.getCachedData('bar');

      expect(result).toBeNull();
      nowSpy.mockRestore();
    });

    it('returns null for a key that was never cached', async () => {
      const result = await offlineService.getCachedData('nope');
      expect(result).toBeNull();
    });
  });

  describe('clearCache / clearOfflineQueue', () => {
    it('removes only cache entries, not the offline queue, on clearCache', async () => {
      await offlineService.queueOfflineAction({ type: 'ISSUE_REPORT', payload: { note: 'x' } });
      await offlineService.cacheData('foo', { a: 1 });

      await offlineService.clearCache();

      const stats = await offlineService.getStats();
      expect(stats.cacheSize).toBe(0);
      expect(stats.queueSize).toBe(1);
    });

    it('empties the offline queue on clearOfflineQueue', async () => {
      await offlineService.queueOfflineAction({ type: 'ISSUE_REPORT', payload: { note: 'x' } });

      await offlineService.clearOfflineQueue();

      expect((await offlineService.getStats()).queueSize).toBe(0);
    });
  });

  describe('network state', () => {
    it('reports the current online state to a new subscriber immediately', () => {
      goOnline();
      const cb = jest.fn();
      const unsubscribe = offlineService.subscribeToNetworkState(cb);

      expect(cb).toHaveBeenCalledWith(true);
      unsubscribe();
    });

    it('stops notifying a subscriber after it unsubscribes', () => {
      const cb = jest.fn();
      const unsubscribe = offlineService.subscribeToNetworkState(cb);
      cb.mockClear();
      unsubscribe();

      goOffline();

      expect(cb).not.toHaveBeenCalled();
      goOnline();
    });
  });
});
