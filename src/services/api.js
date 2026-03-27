import { saveOfflineRequest, registerSync, getAllOfflineRequests, deleteOfflineRequest } from '@/utils/offlineDB';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const apiFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem('poke_token');

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  };

  const fullUrl = `${API_URL}${endpoint}`;

  try {
    const response = await fetch(fullUrl, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error en la petición');
    }

    return data;
  } catch (error) {
    // Si es error de red (offline), guardar en IndexedDB para sync posterior
    if (!navigator.onLine || error.message === 'Failed to fetch') {
      const method = config.method || 'GET';
      // Solo guardar mutaciones (POST, PUT, DELETE), no GETs
      if (method !== 'GET') {
        const headersObj = {};
        if (config.headers) {
          Object.entries(config.headers).forEach(([k, v]) => { headersObj[k] = v; });
        }
        const body = config.body ? JSON.parse(config.body) : null;
        await saveOfflineRequest(fullUrl, method, headersObj, body);
        await registerSync();
        console.log('[Offline] Petición guardada para sync:', fullUrl);
        return { offline: true, message: 'Guardado para sincronizar cuando haya conexión' };
      }
    }
    throw error;
  }
};

export const syncOfflineRequestsNow = async () => {
  try {
    const pending = await getAllOfflineRequests();
    if (pending.length === 0) return;
    
    console.log(`[Frontend Sync] Forzando sincronización de ${pending.length} peticiones...`);
    
    for (const req of pending) {
      try {
        const response = await fetch(req.url, {
          method: req.method,
          headers: req.headers,
          body: req.body ? JSON.stringify(req.body) : undefined,
        });
        if (response.ok) {
          await deleteOfflineRequest(req.id);
          console.log('[Frontend Sync] Exitosa:', req.url);
        }
      } catch (err) {
        console.error('[Frontend Sync] Aún sin red para:', req.url);
      }
    }
  } catch (error) {
    console.error('[Frontend Sync] Error leyendo BD offline:', error);
  }
};
