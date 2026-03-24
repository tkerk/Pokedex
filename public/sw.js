const CACHE_STATIC_NAME = 'appShell_v1';
const CACHE_DYNAMIC_NAME = 'dynamic_v1.0';

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_STATIC_NAME).then((cache) => {
            return cache.addAll([
                '/',
                '/index.html',
                '/src/main.js',
                '/src/App.vue',
                '/favicon.ico'
            ]);
        })
    );
    self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
    if (event.request.method === "GET") {
        const resp = fetch(event.request)
            .then((respuesta) => {
                caches.match(event.request).then(cache => {
                    if (cache === undefined) {
                        caches.open(CACHE_DYNAMIC_NAME).then(cacheDyn => {
                            cacheDyn.put(event.request, respuesta.clone());
                        });
                    }
                });

                return respuesta;
            })
            .catch(error => {
                return caches.match(event.request);
            });

        event.respondWith(resp);
    }
});

self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_STATIC_NAME, CACHE_DYNAMIC_NAME];

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('Eliminando viejo caché:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});
