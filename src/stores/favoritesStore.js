import { reactive } from 'vue';
import { favoritesService } from '@/services/favoritesService';
import { authStore } from '@/stores/authStore';
import { cacheFavorites, getCachedFavorites, addCachedFavorite, removeCachedFavorite } from '@/utils/offlineDB';

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
      const data = await favoritesService.getFavorites();
      this.items = data;
      // Cachear en IndexedDB
      await cacheFavorites(data).catch(() => {});
      // Pre-cache PokeAPI data for offline teams
      if (navigator.onLine) {
        data.forEach(f => {
          fetch(`https://pokeapi.co/api/v2/pokemon/${f.pokemon_id}`).catch(()=>{});
        });
      }
    } catch (e) {
      console.error('Error cargando favoritos:', e);
      // Si offline, cargar desde cache
      try {
        const cached = await getCachedFavorites();
        if (cached.length > 0) {
          this.items = cached;
          console.log('[Offline] Favoritos cargados desde cache');
        }
      } catch (ce) {
        console.error('Error leyendo cache de favoritos:', ce);
      }
    } finally {
      this.loading = false;
    }
  },

  async add(pokemonId, pokemonName) {
    if (!authStore.isLoggedIn) return;
    // Actualización optimista — el corazón cambia inmediatamente
    const optimisticFav = { pokemon_id: pokemonId, pokemon_name: pokemonName };
    this.items.push(optimisticFav);
    // Cachear en IndexedDB inmediatamente
    await addCachedFavorite(optimisticFav).catch(() => {});
    try {
      await favoritesService.addFavorite(pokemonId, pokemonName);
    } catch (e) {
      if (!e.message?.includes('offline') && navigator.onLine) {
        // Revertir si el error no es por estar offline
        this.items = this.items.filter(f => f.pokemon_id !== pokemonId);
        await removeCachedFavorite(pokemonId).catch(() => {});
        throw e;
      }
      // Si offline, la petición ya se guardó para sync posterior via api.js
      console.log('[Offline] Favorito guardado optimistamente');
    }
  },

  async remove(pokemonId) {
    if (!authStore.isLoggedIn) return;
    // Actualización optimista
    const backup = [...this.items];
    this.items = this.items.filter(f => f.pokemon_id !== pokemonId);
    // Actualizar cache IndexedDB inmediatamente
    await removeCachedFavorite(pokemonId).catch(() => {});
    try {
      await favoritesService.removeFavorite(pokemonId);
    } catch (e) {
      if (!e.message?.includes('offline') && navigator.onLine) {
        this.items = backup;
        await addCachedFavorite(backup.find(f => f.pokemon_id === pokemonId)).catch(() => {});
        throw e;
      }
      console.log('[Offline] Favorito eliminado optimistamente');
    }
  },

  clear() {
    this.items = [];
  },
});
