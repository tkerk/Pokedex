const DB_NAME = 'pokedex-offline-db';
const DB_VERSION = 2;
const STORE_NAME = 'offline-requests';
const TEAMS_CACHE_STORE = 'teams-cache';
const FAVORITES_CACHE_STORE = 'favorites-cache';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(TEAMS_CACHE_STORE)) {
        db.createObjectStore(TEAMS_CACHE_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(FAVORITES_CACHE_STORE)) {
        db.createObjectStore(FAVORITES_CACHE_STORE, { keyPath: 'pokemon_id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ─── Offline Requests Queue ───
export async function saveOfflineRequest(url, method, headers, body) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.add({ url, method, headers, body, timestamp: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllOfflineRequests() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteOfflineRequest(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function registerSync() {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const reg = await navigator.serviceWorker.ready;
    await reg.sync.register('sync-offline-requests');
    console.log('[Offline] Sync registrado');
  }
}

// ─── Teams Cache ───
export async function cacheTeams(teams) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TEAMS_CACHE_STORE, 'readwrite');
    const store = tx.objectStore(TEAMS_CACHE_STORE);
    store.clear();
    teams.forEach((team) => store.put(team));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedTeams() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TEAMS_CACHE_STORE, 'readonly');
    const store = tx.objectStore(TEAMS_CACHE_STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function addCachedTeam(team) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TEAMS_CACHE_STORE, 'readwrite');
    const store = tx.objectStore(TEAMS_CACHE_STORE);
    store.put(team);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function removeCachedTeam(teamId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TEAMS_CACHE_STORE, 'readwrite');
    const store = tx.objectStore(TEAMS_CACHE_STORE);
    store.delete(teamId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Favorites Cache ───
export async function cacheFavorites(favorites) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FAVORITES_CACHE_STORE, 'readwrite');
    const store = tx.objectStore(FAVORITES_CACHE_STORE);
    store.clear();
    favorites.forEach((fav) => store.put(fav));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedFavorites() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FAVORITES_CACHE_STORE, 'readonly');
    const store = tx.objectStore(FAVORITES_CACHE_STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function addCachedFavorite(fav) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FAVORITES_CACHE_STORE, 'readwrite');
    const store = tx.objectStore(FAVORITES_CACHE_STORE);
    store.put(fav);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function removeCachedFavorite(pokemonId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FAVORITES_CACHE_STORE, 'readwrite');
    const store = tx.objectStore(FAVORITES_CACHE_STORE);
    store.delete(pokemonId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
