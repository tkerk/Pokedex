const CACHE_STATIC_NAME = 'appShell_v5';
const CACHE_DYNAMIC_NAME = 'dynamic_v5.0';
const CACHE_IMAGES_NAME = 'images_v4.0';
const OFFLINE_QUEUE_STORE = 'offline-requests';
const OFFLINE_DB_NAME = 'pokedex-offline-db';
const OFFLINE_DB_VERSION = 2; // Sincronizado con utils/offlineDB.js

const APP_SHELL_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/Logo.png'
];

// ─── IndexedDB helpers ───
function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(OFFLINE_QUEUE_STORE)) {
        db.createObjectStore(OFFLINE_QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getAllPendingRequests() {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_QUEUE_STORE, 'readonly');
    const store = tx.objectStore(OFFLINE_QUEUE_STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function deletePendingRequest(id) {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_QUEUE_STORE, 'readwrite');
    const store = tx.objectStore(OFFLINE_QUEUE_STORE);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ─── 1. INSTALL ───
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC_NAME).then((cache) => {
      console.log('[SW] Cacheando App Shell');
      return cache.addAll(APP_SHELL_FILES);
    })
  );
  self.skipWaiting();
});

// ─── 2. ACTIVATE ───
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

// ─── 3. FETCH ───
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) return;

  // Imágenes Pokémon → Cache First
  if (url.hostname === 'raw.githubusercontent.com' || url.pathname.includes('/sprites/')) {
    event.respondWith(
      caches.open(CACHE_IMAGES_NAME).then((cache) => {
        return cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response.ok) {
              cache.put(event.request, response.clone());
            }
            return response;
          }).catch(() => new Response('', { status: 404 }));
        });
      })
    );
    return;
  }

  // PokeAPI → Network First con caché
  if (url.hostname === 'pokeapi.co') {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response.ok) {
          const cloned = response.clone();
          caches.open(CACHE_DYNAMIC_NAME).then((cache) => {
            cache.put(event.request, cloned);
          });
        }
        return response;
      }).catch(() => {
        return caches.match(event.request);
      })
    );
    return;
  }

  // Archivos estáticos → Network First
  event.respondWith(
    fetch(event.request).then((response) => {
      if (response.ok) {
        const cloned = response.clone();
        caches.open(CACHE_DYNAMIC_NAME).then((cache) => {
          cache.put(event.request, cloned);
        });
      }
      return response;
    }).catch(() => {
      return caches.match(event.request);
    })
  );
});

// ─── 4. BACKGROUND SYNC ───
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-requests') {
    console.log('[SW] Ejecutando sync de peticiones pendientes...');
    event.waitUntil(replayPendingRequests());
  }
});

async function replayPendingRequests() {
  try {
    const pending = await getAllPendingRequests();
    if (pending.length === 0) return;
    
    console.log(`[SW] ${pending.length} peticiones pendientes`);

    let syncSuccess = true;

    for (const item of pending) {
      try {
        const response = await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body ? JSON.stringify(item.body) : undefined,
        });

        if (response.ok) {
          await deletePendingRequest(item.id);
          console.log('[SW] Petición sincronizada:', item.url);
        } else {
          syncSuccess = false;
        }
      } catch (err) {
        console.log('[SW] Petición aún sin conexión:', item.url);
        syncSuccess = false;
      }
    }

    if (!syncSuccess) {
      throw new Error('Sync incompleto o sin internet, reprogramando para más tarde');
    }
  } catch (err) {
    console.error('[SW] Error en sync:', err);
    throw err; // El API de Sync REQUIERE que este evento retorne un error para usar su backoff natural
  }
}

// ─── 5. PUSH NOTIFICATIONS ───
self.addEventListener('push', (event) => {
  console.log('[SW] Push recibido');

  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { title: 'Pokédex TK', body: event.data ? event.data.text() : 'Nueva notificación' };
  }

  const title = payload.title || 'Pokédex TK';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/Logo.png',
    badge: payload.badge || '/Logo.png',
    tag: payload.tag || 'default',
    data: payload.data || {},
    vibrate: [200, 100, 200],
    actions: [],
    requireInteraction: true,
  };

  // Agregar acciones según tipo de notificación
  if (payload.data?.type === 'friend_request') {
    options.actions = [
      { action: 'view', title: '👀 Ver solicitud' },
      { action: 'dismiss', title: '❌ Ignorar' },
    ];
  } else if (payload.data?.type === 'battle_challenge') {
    options.actions = [
      { action: 'view', title: '⚔️ Ver reto' },
      { action: 'dismiss', title: '❌ Ignorar' },
    ];
  }

  event.waitUntil(
    self.registration.showNotification(title, options).then(() => {
      // Enviar mensaje a los clientes activos (foreground)
      return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'PUSH_RECEIVED',
            payload: payload,
          });
        });
      });
    })
  );
});

// ─── 6. NOTIFICATION CLICK ───
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click:', event.action);
  event.notification.close();

  if (event.action === 'dismiss') return;

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Si ya hay una ventana abierta, navegar a la URL
      const client = clients.find((c) => c.visibilityState === 'visible');
      if (client) {
        client.navigate(urlToOpen);
        return client.focus();
      }
      // Si no, abrir una nueva
      return self.clients.openWindow(urlToOpen);
    })
  );
});
