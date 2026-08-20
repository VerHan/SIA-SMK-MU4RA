/* ============================================================
   Service Worker — Smart PWA Caching Strategy
   
   - Network-First for HTML/Navigation & API (always fresh on deploy)
   - Stale-While-Revalidate for static assets
   - Safe offline fallback
   ============================================================ */

const CACHE_NAME = 'sia-smk-mu4ra-v2';

/* Assets static offline baseline */
const STATIC_ASSETS = [
  '/manifest.json',
  '/favicon.svg',
];

/* Install — skip waiting immediately */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

/* Activate — clean up all previous cache versions */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

/* Fetch strategy */
self.addEventListener('fetch', (event) => {
  const { request } = event;

  /* Skip non-GET and chrome-extension requests */
  if (request.method !== 'GET' || !request.url.startsWith('http')) return;

  const url = new URL(request.url);

  /* 1. API Requests -> Network First */
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  /* 2. Navigation / HTML Requests -> Network First (Critical for avoiding White Screen on new deploy) */
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return caches.match('/');
        })
    );
    return;
  }

  /* 3. Static Assets (JS / CSS / Images) -> Stale While Revalidate / Cache First */
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      const fetchPromise = fetch(request).then(networkResponse => {
        if (networkResponse.ok && request.url.startsWith(self.location.origin)) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
