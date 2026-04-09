const CACHE_VERSION = 'wasel-v5-brand-identity';
const PRECACHE = `${CACHE_VERSION}-precache`;
const RUNTIME = `${CACHE_VERSION}-runtime`;

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
  '/brand/wasellogo-64.png',
  '/brand/wasellogo-96.png',
  '/brand/wasellogo-160.png',
  '/brand/wasellogo-280.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
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

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
