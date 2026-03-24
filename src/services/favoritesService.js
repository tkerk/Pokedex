import { apiFetch } from './api';

export const favoritesService = {
  async getFavorites() {
    return await apiFetch('/favorites');
  },

  async addFavorite(pokemonId, pokemonName) {
    return await apiFetch('/favorites', {
      method: 'POST',
      body: JSON.stringify({ pokemonId, pokemonName }),
    });
  },

  async removeFavorite(pokemonId) {
    return await apiFetch(`/favorites/${pokemonId}`, {
      method: 'DELETE',
    });
  },
};
