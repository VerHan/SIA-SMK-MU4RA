/* ============================================================
   Service Worker — Offline Caching Strategy
   
   Cache-first untuk static assets (CSS, JS, fonts, images)
   Network-first untuk API calls (data selalu fresh)
   ============================================================ */

const CACHE_NAME = 'sia-smk-mu4ra-v1';

/* Assets yang di-cache saat install */
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
];

/* Install — cache static assets */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* Activate — hapus cache lama */
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

/* Fetch — strategi cache */
self.addEventListener('fetch', (event) => {
  const { request } = event;

  /* Skip non-GET requests */
  if (request.method !== 'GET') return;

  /* Network-first untuk API/data requests */
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  /* Cache-first untuk static assets */
  event.respondWith(
    caches.match(request)
      .then(cached => cached || fetch(request))
  );
});
