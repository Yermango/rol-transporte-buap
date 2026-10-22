const CACHE_NAME = 'stu-buap-shell-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './Logo%20Estrella%20Roja.webp'
];

// 1. Instala y guarda el cascarón de la app en la memoria del celular
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(ASSETS.map((url) => cache.add(url)));
    })
  );
});

// 2. Limpia versiones viejas automáticamente cuando actualices tu código
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 3. Entrega la app al instante desde la memoria del celular sin gastar datos
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  // Firebase siempre va directo por red para sincronizar cambios en vivo
  if (url.includes('firebaseio.com') || url.includes('googleapis.com') || url.includes('gstatic.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
