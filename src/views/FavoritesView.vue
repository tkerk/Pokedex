<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Heart, Loader2, Ghost } from 'lucide-vue-next';
import { authStore } from '@/stores/authStore';
import { favoritesStore } from '@/stores/favoritesStore';
import { pokeService } from '@/services/pokeService';
import { getTypeClass, padId, getArtworkById } from '@/utils/helpers';

const router = useRouter();
const favoritePokemons = ref([]);
const loading = ref(true);

const loadFavorites = async () => {
  if (!authStore.isLoggedIn) {
    loading.value = false;
    return;
  }
  loading.value = true;
  try {
    await favoritesStore.load();
    // Cargar detalles de cada favorito desde PokeAPI
    const details = await Promise.all(
      favoritesStore.items.map(async (fav) => {
        const data = await pokeService.getPokemonDetail(fav.pokemon_id);
        return data;
      })
    );
    favoritePokemons.value = details;
  } catch (error) {
    console.error('Error cargando favoritos:', error);
  } finally {
    loading.value = false;
  }
};

const removeFavorite = async (id) => {
  await favoritesStore.remove(id);
  favoritePokemons.value = favoritePokemons.value.filter(p => p.id !== id);
};

const goToDetail = (id) => router.push(`/pokemon/${id}`);

onMounted(() => {
  loadFavorites();
});
</script>

<template>
  <div class="app-container" style="padding-bottom:3rem;">
    <div class="section-header">
      <h1 class="section-title neon-text-green">
        <Heart :size="36" style="display:inline;vertical-align:middle;margin-right:0.5rem;" />
        FAVORITOS
      </h1>
      <p class="section-subtitle">TU COLECCIÓN PERSONAL</p>
    </div>

    <!-- Not logged in -->
    <div v-if="!authStore.isLoggedIn" class="empty-state">
      <Ghost :size="80" class="empty-state__icon" />
      <h2 class="empty-state__title">Inicia sesión</h2>
      <p class="empty-state__text">Necesitas iniciar sesión para ver tus favoritos</p>
      <button @click="router.push('/login')" class="auth-btn" style="max-width:250px;margin:1.5rem auto 0;">LOGIN</button>
    </div>

    <!-- Loading -->
    <div v-else-if="loading" class="loader-wrapper">
      <Loader2 :size="56" class="spin" />
      <p class="loader-text">CARGANDO FAVORITOS...</p>
    </div>

    <!-- Empty -->
    <div v-else-if="favoritePokemons.length === 0" class="empty-state">
      <Ghost :size="80" class="empty-state__icon" />
      <h2 class="empty-state__title">Sin favoritos aún</h2>
      <p class="empty-state__text">Agrega Pokémon a tus favoritos desde la Pokédex</p>
    </div>

    <!-- Grid -->
    <div v-else class="poke-grid">
      <div
        v-for="pokemon in favoritePokemons"
        :key="pokemon.id"
        class="poke-card"
        @click="goToDetail(pokemon.id)"
      >
        <span class="poke-card__id">#{{ padId(pokemon.id) }}</span>

        <button class="poke-card__fav-btn" @click.stop="removeFavorite(pokemon.id)" title="Quitar de favoritos">
          ❤️
        </button>

        <div class="poke-card__img-wrapper">
          <div class="poke-card__img-glow"></div>
          <img
            :src="getArtworkById(pokemon.id)"
            :alt="pokemon.name"
            class="poke-card__img"
            loading="lazy"
            referrerpolicy="no-referrer"
          />
        </div>

        <h2 class="poke-card__name">{{ pokemon.name }}</h2>

        <div class="type-badges">
          <span
            v-for="t in pokemon.types"
            :key="t.type.name"
            class="type-badge"
            :class="getTypeClass(t.type.name)"
          >{{ t.type.name }}</span>
        </div>

        <div class="scanlines"></div>
      </div>
    </div>
  </div>
</template>
