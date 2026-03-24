import { reactive } from 'vue';
import { favoritesService } from '@/services/favoritesService';
import { authStore } from '@/stores/authStore';

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
      this.items = await favoritesService.getFavorites();
    } catch (e) {
      console.error('Error cargando favoritos:', e);
    } finally {
      this.loading = false;
    }
  },

  async add(pokemonId, pokemonName) {
    if (!authStore.isLoggedIn) return;
    try {
      await favoritesService.addFavorite(pokemonId, pokemonName);
      await this.load();
    } catch (e) {
      console.error('Error agregando favorito:', e);
      throw e;
    }
  },

  async remove(pokemonId) {
    if (!authStore.isLoggedIn) return;
    try {
      await favoritesService.removeFavorite(pokemonId);
      this.items = this.items.filter(f => f.pokemon_id !== pokemonId);
    } catch (e) {
      console.error('Error eliminando favorito:', e);
      throw e;
    }
  },

  clear() {
    this.items = [];
  },
});
