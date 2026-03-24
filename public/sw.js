const CACHE_STATIC_NAME = 'appShell_v2';
const CACHE_DYNAMIC_NAME = 'dynamic_v2.0';
const CACHE_IMAGES_NAME = 'images_v1.0';

// Archivos del App Shell que se cachean al instalar
const APP_SHELL_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico'
];

// 1. INSTALL — Cachear App Shell y rutas fijas
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC_NAME).then((cache) => {
      console.log('[SW] Cacheando App Shell');
      return cache.addAll(APP_SHELL_FILES);
    })
  );
  self.skipWaiting();
});

// 2. ACTIVATE — Eliminar cachés viejos
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_STATIC_NAME, CACHE_DYNAMIC_NAME, CACHE_IMAGES_NAME];

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('[SW] Eliminando caché viejo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// 3. FETCH — Network First + Caché Dinámico + Imágenes Offline
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Estrategia especial para imágenes de Pokémon (PokeAPI artwork)
  if (url.hostname === 'raw.githubusercontent.com' || url.pathname.includes('/sprites/')) {
    event.respondWith(
      caches.open(CACHE_IMAGES_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(event.request).then((networkResponse) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          }).catch(() => {
            // Si no hay internet y no está en caché, retornar vacío
            return new Response('', { status: 404 });
          });
        });
      })
    );
    return;
  }

  // Estrategia para peticiones a la PokeAPI (caché dinámico)
  if (url.hostname === 'pokeapi.co') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const cloned = networkResponse.clone();
          caches.open(CACHE_DYNAMIC_NAME).then((cache) => {
            cache.put(event.request, cloned);
          });
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // Estrategia para el App Shell y archivos estáticos (Network First)
  event.respondWith(
    fetch(event.request)
      .then((respuesta) => {
        // Si hay respuesta de red, guardar en caché dinámico si no existe
        caches.match(event.request).then((cache) => {
          if (cache === undefined) {
            caches.open(CACHE_DYNAMIC_NAME).then((cacheDyn) => {
              cacheDyn.put(event.request, respuesta.clone());
            });
          }
        });
        return respuesta;
      })
      .catch(() => {
        // Sin internet: servir desde caché
        return caches.match(event.request);
      })
  );
});
