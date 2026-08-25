// __CACHE_VERSION__ is replaced at build time (scripts/version-sw.mjs) with a
// value unique to that deployment. This is what makes the browser detect a
// byte-diff in this file on every deploy and actually re-run install/activate
// instead of running the SW that was first installed weeks ago on a phone
// forever. Do not hardcode a static string here again.
const CACHE_VERSION = '__CACHE_VERSION__';

// Safety: if the placeholder was never replaced (broken build pipeline),
// unregister self immediately so we never poison the cache with a bad version.
if (CACHE_VERSION === '__CACHE_VERSION__') {
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', (event) => {
    event.waitUntil(
      caches.keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .then(() => self.registration.unregister())
        .then(() => self.clients.claim())
    );
  });
  // Stop processing — do not register any fetch handler.
  throw new Error('[Wasel SW] Build placeholder not replaced. SW self-destructed.');
}
const PRECACHE = `${CACHE_VERSION}-precache`;
const RUNTIME = `${CACHE_VERSION}-runtime`;
const MAX_RUNTIME_CACHE_ENTRIES = 80;
const NETWORK_TIMEOUT_MS = 8000;

// Deliberately NOT precaching '/' or '/index.html' here. The navigation
// document must always come from the network when possible (handleNavigation
// already does that and stores the freshest successful response in RUNTIME).
// Precaching it at install time meant a phone that installed this SW once
// would keep serving that one snapshot's HTML - with asset hashes that no
// longer exist on the server after later deploys - every time the network
// hiccuped, which is what produced app_mount_timeout on mobile.
const PRECACHE_STATIC = [
  '/offline.html',
  '/initial-locale.js',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-192.webp',
  '/icon-512.webp',
  '/robots.txt',
  '/sitemap.xml',
];

function fetchWithTimeout(request, timeoutMs = NETWORK_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(request, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

const API_PATTERNS = [
  '/api/',
  '/functions/',
  '/rest/',
  '/auth/',
  '/storage/',
  '/realtime/',
];

function isSafeUrl(url) {
  try {
    const parsed = new URL(url, self.location.origin);
    return parsed.origin === self.location.origin;
  } catch {
    return false;
  }
}

function sanitizeNotificationText(text) {
  if (typeof text !== 'string') return String(text ?? '');
  return text.replace(/[\r\n\t\x00-\x1f]/g, ' ').slice(0, 200);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
      caches.open(PRECACHE)
      .then((cache) => cache.addAll(PRECACHE_STATIC))
      .then(() =>
        fetchWithTimeout(new Request('/precache-manifest.json'), 8000)
          .then((response) => (response.ok ? response.json() : null))
          .catch(() => null),
      )
      .then((manifest) => {
        if (manifest && Array.isArray(manifest.urls)) {
          const extraUrls = manifest.urls.filter((url) => !PRECACHE_STATIC.includes(url));
          if (extraUrls.length > 0) {
            return caches.open(PRECACHE).then((cache) => cache.addAll(extraUrls));
          }
        }
      })
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => ![PRECACHE, RUNTIME].includes(name))
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isApiRequest(request)) {
    event.respondWith(networkOnly(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  // Hashed JS/CSS bundles: always network-first so mobile never serves a
  // stale chunk hash that no longer exists on the server (app_mount_timeout).
  // The content-hash in the filename is the cache-busting mechanism; we do
  // not need stale-while-revalidate here.
  if (url.pathname.startsWith('/assets/') && (url.pathname.endsWith('.js') || url.pathname.endsWith('.css'))) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (request.destination === 'image' || request.destination === 'font') {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.destination === 'script' || request.destination === 'style' || request.destination === 'worker') {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  event.respondWith(networkFirst(request));
});

async function handleNavigation(request) {
  try {
    if (!isSafeUrl(request.url)) return (await caches.match(request)) || caches.match('/offline.html');

    const response = await fetchWithTimeout(request);

    if (response && response.ok) {
      const cache = await caches.open(RUNTIME);
      await cache.put(request, response.clone());
      await trimRuntimeCache(cache);
    }

    return response;
  } catch {
    // Only fall back to a cached navigation response that was itself stored
    // from a real, successful, recent network fetch (see handleNavigation's
    // own cache.put above / the runtime cache in general) - never to a
    // permanently precached snapshot, since that snapshot's asset hashes can
    // point at files a later deploy has already deleted from the server.
    const cachedPage = await caches.match(request);
    if (cachedPage) return cachedPage;

    const cachedRoot = await caches.match('/');
    if (cachedRoot) return cachedRoot;

    return caches.match('/offline.html');
  }
}

async function networkFirst(request) {
  try {
    if (!isSafeUrl(request.url)) return caches.match(request) || new Response('Offline', { status: 503, statusText: 'Offline' });

    const response = await fetchWithTimeout(request);

    if (response && response.ok) {
      const cache = await caches.open(RUNTIME);
      await cache.put(request, response.clone());
      await trimRuntimeCache(cache);
    }

    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  if (!isSafeUrl(request.url)) return cached || new Response('Offline', { status: 503, statusText: 'Offline' });

  const response = await fetchWithTimeout(request);
  if (response && response.ok) {
    const cache = await caches.open(RUNTIME);
    await cache.put(request, response.clone());
    await trimRuntimeCache(cache);
  }

  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME);
  const cached = await cache.match(request);

  if (!isSafeUrl(request.url)) return cached || new Response('Unavailable', { status: 503, statusText: 'Unavailable' });

  const networkPromise = fetchWithTimeout(request)
    .then(async (response) => {
      if (response && response.ok) {
        await cache.put(request, response.clone());
        await trimRuntimeCache(cache);
      }
      return response;
    })
    .catch(() => null);

  return cached || networkPromise || new Response('Unavailable', { status: 503, statusText: 'Unavailable' });
}

async function trimRuntimeCache(cache) {
  const keys = await cache.keys();
  const overflow = keys.length - MAX_RUNTIME_CACHE_ENTRIES;
  if (overflow <= 0) return;
  await Promise.all(keys.slice(0, overflow).map((key) => cache.delete(key)));
}

async function networkOnly(request) {
  try {
    if (!isSafeUrl(request.url)) return new Response('Offline', { status: 503, statusText: 'Offline' });

    const response = await fetchWithTimeout(request, 15000);
    return response;
  } catch {
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

function isApiRequest(request) {
  const url = new URL(request.url);
  return API_PATTERNS.some((pattern) => url.pathname.startsWith(pattern));
}

self.addEventListener('message', (event) => {
  if (event.origin !== self.location.origin) return;

  const data = event.data;
  if (data === 'SKIP_WAITING' || (data && data.type === 'SKIP_WAITING')) {
    self.skipWaiting();
  }
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};

  try {
    payload = event.data.json();
  } catch {
    payload = { body: event.data.text() };
  }

  if (!payload || typeof payload !== 'object') return;

  const title = sanitizeNotificationText(payload.title || 'Wasel');
  const options = {
    body: sanitizeNotificationText(payload.body || ''),
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: payload.data || {},
    vibrate: [200, 100, 200],
    tag: 'wasel-notification',
    renotify: true,

    actions: [
      { action: 'open', title: 'Open' },
      { action: 'close', title: 'Close' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const rawTargetUrl = event.notification.data?.url || '/';
  const targetUrl = (typeof rawTargetUrl === 'string' && rawTargetUrl.startsWith('/')) ? rawTargetUrl.replace(/[\r\n]/g, '').slice(0, 500) : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existingClient = clients.find((client) => client.url.includes(targetUrl));

      if (existingClient) {
        existingClient.postMessage({ type: 'NAVIGATE', url: targetUrl });
        return existingClient.focus();
      }

      return self.clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'wasel-background-sync') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'BACKGROUND_SYNC' });
        });
      })
    );
  }
});
