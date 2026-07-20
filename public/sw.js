const CACHE_VERSION = 'wasel-v5';
const PRECACHE = `${CACHE_VERSION}-precache`;
const RUNTIME = `${CACHE_VERSION}-runtime`;

const PRECACHE_STATIC = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/brand/wasel-w-mark.png',
  '/brand/wasellogo-64.png',
  '/brand/wasellogo-96.png',
  '/brand/wasellogo-160.png',
  '/brand/wasellogo-280.png',
  '/brand/wasellogo-512.png',
  '/robots.txt',
  '/sitemap.xml',
];

const API_PATTERNS = [
  '/api/',
  '/functions/',
  '/rest/',
  '/auth/',
  '/storage/',
  '/realtime/',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PRECACHE)
      .then((cache) => cache.addAll(PRECACHE_STATIC))
      .then(() => fetch('/precache-manifest.json'))
      .then((response) => response.json())
      .then((manifest) => {
        if (manifest && Array.isArray(manifest.urls)) {
          const extraUrls = manifest.urls.filter((url) => !PRECACHE_STATIC.includes(url));
          if (extraUrls.length > 0) {
            return caches.open(PRECACHE).then((cache) => cache.addAll(extraUrls));
          }
        }
      })
      .then(() => self.skipWaiting())
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
    const response = await fetch(request);

    if (response && response.ok) {
      const cache = await caches.open(RUNTIME);
      cache.put(request, response.clone());
    }

    return response;
  } catch {
    const cachedPage = await caches.match(request);
    if (cachedPage) return cachedPage;

    const cachedRoot = await caches.match('/');
    if (cachedRoot) return cachedRoot;

    const cachedIndex = await caches.match('/index.html');
    if (cachedIndex) return cachedIndex;

    return caches.match('/offline.html');
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);

    if (response && response.ok) {
      const cache = await caches.open(RUNTIME);
      cache.put(request, response.clone());
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

  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(RUNTIME);
    cache.put(request, response.clone());
  }

  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || networkPromise || new Response('Unavailable', { status: 503, statusText: 'Unavailable' });
}

async function networkOnly(request) {
  try {
    const response = await fetch(request);
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
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload: { title?: string; body?: string; data?: Record<string, unknown> } = {};

  try {
    payload = event.data.json();
  } catch {
    payload = { body: event.data.text() };
  }

  const title = payload.title || 'Wasel';
  const options: NotificationOptions = {
    body: payload.body || '',
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

  const targetUrl = event.notification.data?.url || '/';

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
