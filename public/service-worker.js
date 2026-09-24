const CACHE_NAME = 'mesas-san-jose-v3';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/reset.css',
  '/css/variables.css',
  '/css/touch.css',
  '/css/layout.css',
  '/css/components.css',
  '/js/app.js',
  '/js/api.js',
  '/js/state.js',
  '/js/components/tableCard.js',
  '/js/components/tableGrid.js',
  '/js/components/actionModal.js',
  '/js/components/settingsModal.js',
  '/js/components/logsModal.js',
  '/js/components/drawerPanel.js',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/icons/icon-192.svg',
  '/assets/icons/icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Eliminando cache anterior:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Las peticiones a la API nunca se cachean estáticamente (siempre datos frescos de SQLite)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({ success: false, error: 'Sin conexión con el servidor local.' }),
          { status: 503, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
        );
      })
    );
    return;
  }

  // Estrategia Cache-First con Network Fallback para recursos estáticos PWA
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // En segundo plano actualiza el cache si hay conexión
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {/* Offline, usar cache */});
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});
