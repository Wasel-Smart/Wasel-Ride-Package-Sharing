import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearAllCaches,
  getCacheStats,
  getCachedData,
  isOnline,
  registerServiceWorker,
  skipWaitingServiceWorker,
  subscribeToOnlineStatus,
  validateServiceWorker,
} from '../../../src/utils/service-worker';

describe('service-worker utils', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('validates service worker state when unsupported or missing', async () => {
    const originalServiceWorker = navigator.serviceWorker;
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: undefined,
    });

    await expect(validateServiceWorker()).resolves.toEqual({
      registered: false,
      active: false,
      updateAvailable: false,
      scope: '',
    });

    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: originalServiceWorker,
    });
  });

  it('registers a service worker and notifies when an update finishes installing', async () => {
    const stateListeners: Array<() => void> = [];
    const updateListeners: Array<() => void> = [];
    const mockOnUpdate = vi.fn();

    const registration = {
      scope: '/',
      waiting: null,
      installing: {
        state: 'installing',
        addEventListener: vi.fn((event: string, callback: () => void) => {
          if (event === 'statechange') {
            stateListeners.push(callback);
          }
        }),
      },
      addEventListener: vi.fn((event: string, callback: () => void) => {
        if (event === 'updatefound') {
          updateListeners.push(callback);
        }
      }),
    };

    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        controller: { id: 'controller-1' },
        register: vi.fn().mockResolvedValue(registration),
        getRegistration: vi.fn().mockResolvedValue(registration),
      },
    });

    const registered = await registerServiceWorker('/sw.js', mockOnUpdate);
    registration.installing.state = 'installed';
    updateListeners[0]?.();
    stateListeners[0]?.();

    expect(registered).toBe(registration);
    expect(mockOnUpdate).toHaveBeenCalledTimes(1);
  });

  it('posts skip-waiting to the waiting worker and tracks online subscriptions without leaks', async () => {
    const postMessage = vi.fn();
    const getRegistration = vi.fn().mockResolvedValue({
      waiting: { postMessage },
    });

    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        getRegistration,
      },
    });

    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const callback = vi.fn();

    const unsubscribe = subscribeToOnlineStatus(callback);
    unsubscribe();
    await skipWaitingServiceWorker();

    expect(addSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('online', addSpy.mock.calls[0][1]);
    expect(removeSpy).toHaveBeenCalledWith('offline', addSpy.mock.calls[1][1]);
    expect(postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
  });

  it('reads cache contents, reports size stats, clears caches, and reflects online state', async () => {
    const response = new Response('cached');
    const cachesApi = {
      open: vi.fn(async (name: string) => ({
        keys: vi.fn().mockResolvedValue(name === 'assets' ? [{ url: '/a.js' }, { url: '/b.js' }] : [{ url: '/c.js' }]),
        match: vi.fn().mockResolvedValue(response),
      })),
      keys: vi.fn().mockResolvedValue(['assets', 'images']),
      delete: vi.fn().mockResolvedValue(true),
    };

    vi.stubGlobal('caches', cachesApi);
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });

    await expect(getCachedData('assets')).resolves.toBe(response);
    await expect(getCacheStats()).resolves.toEqual({
      caches: [
        { name: 'assets', size: 102400, count: 2 },
        { name: 'images', size: 51200, count: 1 },
      ],
      totalSize: 153600,
    });
    await clearAllCaches();

    expect(cachesApi.delete).toHaveBeenCalledWith('assets');
    expect(cachesApi.delete).toHaveBeenCalledWith('images');
    expect(isOnline()).toBe(true);
  });
});
