import { reactive } from 'vue';
import { favoritesService } from '@/services/favoritesService';
import { authStore } from '@/stores/authStore';

const LOCAL_KEY = 'poke_favorites_local';

function saveLocal(items) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
  } catch (e) { /* ignore quota errors */ }
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export const favoritesStore = reactive({
  items: [],
  loading: false,

  get ids() {
    return this.items.map(f => f.pokemon_id);
  },

  isFavorite(pokemonId) {
    return this.ids.includes(pokemonId);
  },

  async load() {
    if (!authStore.isLoggedIn) {
      this.items = [];
      return;
    }
    this.loading = true;
    try {
      const serverItems = await favoritesService.getFavorites();
      // Si el servidor respondió con datos válidos (no offline)
      if (Array.isArray(serverItems)) {
        this.items = serverItems;
        saveLocal(this.items);
      }
    } catch (e) {
      console.error('Error cargando favoritos:', e);
      // Si falla la carga, usar datos locales como respaldo
      this.items = loadLocal();
    } finally {
      this.loading = false;
    }
  },

  async add(pokemonId, pokemonName) {
    if (!authStore.isLoggedIn) return;

    // ── Update optimista: agregar localmente ANTES de la petición ──
    const alreadyExists = this.items.some(f => f.pokemon_id === pokemonId);
    if (!alreadyExists) {
      this.items.push({ pokemon_id: pokemonId, pokemon_name: pokemonName });
      saveLocal(this.items);
    }

    try {
      const result = await favoritesService.addFavorite(pokemonId, pokemonName);

      // Si fue guardado offline, mantener el estado optimista
      if (result && result.offline) {
        console.log('[Favoritos] Guardado offline, ícono actualizado optimísticamente');
        return;
      }

      // Si el servidor respondió ok, recargar para sincronizar
      await this.load();
    } catch (e) {
      // Si hay error de red, mantener el update optimista
      if (!navigator.onLine) {
        console.log('[Favoritos] Sin conexión, manteniendo update optimista');
        return;
      }
      // Si hay otro error, revertir
      this.items = this.items.filter(f => f.pokemon_id !== pokemonId);
      saveLocal(this.items);
      console.error('Error agregando favorito:', e);
      throw e;
    }
  },

  async remove(pokemonId) {
    if (!authStore.isLoggedIn) return;

    // ── Update optimista: remover localmente ANTES de la petición ──
    const backup = [...this.items];
    this.items = this.items.filter(f => f.pokemon_id !== pokemonId);
    saveLocal(this.items);

    try {
      const result = await favoritesService.removeFavorite(pokemonId);

      if (result && result.offline) {
        console.log('[Favoritos] Eliminación guardada offline');
        return;
      }
    } catch (e) {
      if (!navigator.onLine) {
        console.log('[Favoritos] Sin conexión, manteniendo eliminación optimista');
        return;
      }
      // Revertir si hay error
      this.items = backup;
      saveLocal(this.items);
      console.error('Error eliminando favorito:', e);
      throw e;
    }
  },

  clear() {
    this.items = [];
    saveLocal([]);
  },
});
