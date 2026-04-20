/**
 * Service Worker Utilities & Validation
 * Handles service worker registration, updates, and offline support
 */

/**
 * Service Worker registration status
 */
export type SWStatus = 'checking' | 'registered' | 'updated' | 'obsolete' | 'error';

/**
 * Service Worker configuration
 */
export interface ServiceWorkerConfig {
  enabled: boolean;
  scope: string;
  routes: Array<{
    pattern: RegExp | string;
    strategy: 'cache-first' | 'network-first' | 'stale-while-revalidate';
    cacheName?: string;
  }>;
  cacheFirstRoutes: string[];
  networkFirstRoutes: string[];
  precachAssets: string[];
}

/**
 * Default Service Worker configuration
 */
export const DEFAULT_SW_CONFIG: ServiceWorkerConfig = {
  enabled: import.meta.env.PROD,
  scope: '/',
  routes: [
    {
      pattern: '/api/',
      strategy: 'network-first',
    },
    {
      pattern: /\.(js|css|woff2?)$/,
      strategy: 'cache-first',
      cacheName: 'static-assets',
    },
    {
      pattern: /\.(png|jpg|svg|webp)$/,
      strategy: 'cache-first',
      cacheName: 'images',
    },
  ],
  cacheFirstRoutes: [
    '/assets/',
    '/brand/',
  ],
  networkFirstRoutes: [
    '/api/',
    '/',
  ],
  precachAssets: [
    '/',
    '/offline.html',
    '/manifest.json',
  ],
};

/**
 * Validate service worker is installed correctly
 */
export async function validateServiceWorker(): Promise<{
  registered: boolean;
  active: boolean;
  updateAvailable: boolean;
  scope: string;
}> {
  if (!('serviceWorker' in navigator)) {
    return {
      registered: false,
      active: false,
      updateAvailable: false,
      scope: '',
    };
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();

    if (!registration) {
      return {
        registered: false,
        active: false,
        updateAvailable: false,
        scope: '',
      };
    }

    return {
      registered: true,
      active: !!registration.active,
      updateAvailable: !!registration.waiting,
      scope: registration.scope,
    };
  } catch (error) {
    console.error('[SW] Validation failed:', error);
    return {
      registered: false,
      active: false,
      updateAvailable: false,
      scope: '',
    };
  }
}

/**
 * Register service worker with safe error handling
 */
export async function registerServiceWorker(
  scriptUrl: string = '/sw.js',
  onUpdate?: () => void,
): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[SW] Service workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(scriptUrl, {
      scope: '/',
      updateViaCache: 'none', // Always check for updates
    });

    console.warn('[SW] Registered successfully', registration.scope);

    // Monitor for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;

      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker available - notify user
            console.warn('[SW] Update available');
            onUpdate?.();
          }
        });
      }
    });

    return registration;
  } catch (error) {
    console.error('[SW] Registration failed:', error);
    return null;
  }
}

/**
 * Skip waiting service worker (for updates)
 */
export async function skipWaitingServiceWorker(): Promise<void> {
  const registration = await navigator.serviceWorker.getRegistration();

  if (registration?.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
}

/**
 * Check if app is online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Listen for online/offline events
 */
export function subscribeToOnlineStatus(
  callback: (isOnline: boolean) => void,
): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Return unsubscribe function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

/**
 * Get cached service worker data
 */
export async function getCachedData(cacheName: string): Promise<Response | undefined> {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    const firstKey = keys[0];
    return firstKey ? cache.match(firstKey) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Clear all caches
 */
export async function clearAllCaches(): Promise<void> {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
    console.warn('[SW] All caches cleared');
  } catch (error) {
    console.error('[SW] Failed to clear caches:', error);
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  caches: Array<{ name: string; size: number; count: number }>;
  totalSize: number;
}> {
  try {
    const cacheNames = await caches.keys();
    const stats: Array<{ name: string; size: number; count: number }> = [];
    let totalSize = 0;

    for (const name of cacheNames) {
      const cache = await caches.open(name);
      const keys = await cache.keys();
      const size = keys.length * 1024 * 50; // Rough estimate
      stats.push({ name, size, count: keys.length });
      totalSize += size;
    }

    return { caches: stats, totalSize };
  } catch {
    return { caches: [], totalSize: 0 };
  }
}

/**
 * Service Worker lifecycle hook for React components
 */
export function useServiceWorker() {
  return {
    register: registerServiceWorker,
    skipWaiting: skipWaitingServiceWorker,
    isOnline,
    subscribeOnline: subscribeToOnlineStatus,
    clear: clearAllCaches,
    stats: getCacheStats,
    validate: validateServiceWorker,
  };
}
