// ─── Wasel Service Worker ─────────────────────────────────────────────────────
// Strategy: precache shell + assets; network-first for navigation;
//           cache-first for images/fonts; stale-while-revalidate for scripts.
// Push:     handles Web Push notifications for trip and package events.
// Sync:     background-sync queue for offline booking actions.
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_VERSION = 'wasel-v11-20260411';
const PRECACHE = `${CACHE_VERSION}-precache`;
const RUNTIME  = `${CACHE_VERSION}-runtime`;
const STATIC   = `${CACHE_VERSION}-static`;

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/favicon.svg',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/brand/wasel-mark-clean.svg',
  '/brand/wasel-mark.svg',
  '/brand/wasel-mark-clean-dark.svg',
  '/brand/wasel-mark-clean-light.svg',
  '/brand/og-social-card.png',
  '/brand/wasellogo-64.png',
  '/brand/wasellogo-96.png',
  '/brand/wasellogo-160.png',
  '/brand/wasellogo-280.png',
];

// Cache static assets for 30 days
const STATIC_CACHE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

// ─── Install ─────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

// ─── Activate ────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => ![PRECACHE, RUNTIME, STATIC].includes(name))
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  // Handle static assets with long-term caching
  if (url.pathname.startsWith('/assets/') || url.pathname.includes('-') && (url.pathname.endsWith('.js') || url.pathname.endsWith('.css'))) {
    event.respondWith(cacheFirstWithExpiry(request));
    return;
  }

  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'worker'
  ) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  event.respondWith(networkFirst(request));
});

// ─── Push notifications ───────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: 'Wasel', body: 'You have a new update.', tag: 'wasel-default', url: '/' };

  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/favicon-32x32.png',
    tag: data.tag ?? 'wasel-notification',
    renotify: false,
    requireInteraction: false,
    silent: false,
    data: { url: data.url ?? '/' },
    actions: data.actions ?? [],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// ─── Notification click ───────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url ?? '/';
  const actionUrl = event.action ? (event.notification.data?.[event.action] ?? targetUrl) : targetUrl;
  const absoluteUrl = new URL(actionUrl, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const existingClient = clients.find(
          (c) => c.url === absoluteUrl && 'focus' in c,
        );

        if (existingClient) {
          return existingClient.focus();
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(absoluteUrl);
        }
      }),
  );
});

// ─── Background sync ─────────────────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'wasel-offline-queue') {
    event.waitUntil(drainOfflineQueue());
  }
});

async function drainOfflineQueue() {
  try {
    const cache = await caches.open(RUNTIME);
    const keys = await cache.keys();
    const queueKeys = keys.filter((req) => req.url.includes('__offline-queue__'));

    await Promise.allSettled(
      queueKeys.map(async (req) => {
        const cached = await cache.match(req);
        if (!cached) return;

        let parsed;
        try {
          const body = await cached.text();
          parsed = JSON.parse(body);
        } catch {
          // Malformed queue entry — remove it so it doesn't block future syncs
          await cache.delete(req);
          return;
        }

        const { url, method, headers: hdrs, payload } = parsed;
        if (!url || typeof url !== 'string') {
          await cache.delete(req);
          return;
        }

        const response = await fetch(url, {
          method: method ?? 'POST',
          headers: { 'Content-Type': 'application/json', ...hdrs },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          await cache.delete(req);
        }
      }),
    );
  } catch {
    /* Silently retry on next sync */
  }
}

// ─── Message handler ─────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ─── Fetch strategies ─────────────────────────────────────────────────────────

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

async function cacheFirstWithExpiry(request) {
  const cache = await caches.open(STATIC);
  const cached = await cache.match(request);
  
  if (cached) {
    const cachedDate = cached.headers.get('date');
    if (cachedDate) {
      const age = Date.now() - new Date(cachedDate).getTime();
      if (age < STATIC_CACHE_MAX_AGE) {
        return cached;
      }
    }
  }

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return cached ?? new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(RUNTIME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
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

  if (cached) return cached;

  const networkResponse = await networkPromise;
  return networkResponse ?? new Response('Unavailable', { status: 503, statusText: 'Unavailable' });
}
