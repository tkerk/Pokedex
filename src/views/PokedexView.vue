<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Search, ChevronLeft, ChevronRight, Loader2, Filter, X } from 'lucide-vue-next';
import { pokeService } from '@/services/pokeService';
import { authStore } from '@/stores/authStore';
import { favoritesStore } from '@/stores/favoritesStore';
import { getTypeClass, padId, getArtwork, generationNames, capitalize } from '@/utils/helpers';

const router = useRouter();
const pokemonList = ref([]);
const loading = ref(true);
const searchQuery = ref('');
const searchLoading = ref(false);
const offset = ref(0);
const limit = 20;
const totalCount = ref(0);
const showFilters = ref(false);

const selectedType = ref('');
const selectedGen = ref('');
const sortBy = ref('number');
const types = ref([]);
const generations = ref([]);
const filteredByApi = ref(null);
let debounceTimer = null;

const fetchPokemon = async () => {
  loading.value = true;
  try {
    const data = await pokeService.getPokemonList(limit, offset.value);
    pokemonList.value = data.results;
    totalCount.value = data.count;
  } catch (error) {
    console.error('Error fetching pokemon:', error);
  } finally {
    loading.value = false;
  }
};

const loadFilters = async () => {
  try {
    const [t, g] = await Promise.all([pokeService.getTypes(), pokeService.getGenerations()]);
    types.value = t;
    generations.value = g;
  } catch (e) { console.error('Error cargando filtros:', e); }
};

const filterByType = async () => {
  if (!selectedType.value) { filteredByApi.value = null; fetchPokemon(); return; }
  loading.value = true;
  try {
    const list = await pokeService.getPokemonByType(selectedType.value);
    const details = await Promise.all(
      list.slice(0, 40).map(async (p) => {
        const res = await fetch(p.url);
        return res.json();
      })
    );
    filteredByApi.value = details;
  } catch (e) { console.error(e); } finally { loading.value = false; }
};

const filterByGen = async () => {
  if (!selectedGen.value) { filteredByApi.value = null; fetchPokemon(); return; }
  loading.value = true;
  try {
    const species = await pokeService.getPokemonByGeneration(selectedGen.value);
    const details = await Promise.all(
      species.slice(0, 40).map(async (s) => {
        const id = s.url.split('/').filter(Boolean).pop();
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
        return res.json();
      })
    );
    filteredByApi.value = details;
  } catch (e) { console.error(e); } finally { loading.value = false; }
};

watch(selectedType, () => { selectedGen.value = ''; filterByType(); });
watch(selectedGen, () => { selectedType.value = ''; filterByGen(); });

// Búsqueda en tiempo real con debounce
watch(searchQuery, (val) => {
  clearTimeout(debounceTimer);
  if (!val.trim()) {
    filteredByApi.value = null;
    return;
  }
  debounceTimer = setTimeout(() => doSearch(), 400);
});

const doSearch = async () => {
  const q = searchQuery.value.trim();
  if (!q) return;
  searchLoading.value = true;
  try {
    const result = await pokeService.searchPokemon(q);
    filteredByApi.value = result ? [result] : [];
  } catch (e) {
    // Pokemon no encontrado — no es un error crítico
    filteredByApi.value = [];
  } finally {
    searchLoading.value = false;
  }
};

const clearSearch = () => {
  searchQuery.value = '';
  filteredByApi.value = null;
  selectedType.value = '';
  selectedGen.value = '';
  fetchPokemon();
};

const displayedPokemon = computed(() => {
  let list = filteredByApi.value !== null ? filteredByApi.value : pokemonList.value;
  if (searchQuery.value && filteredByApi.value === null) {
    list = list.filter(
      (p) => p.name.toLowerCase().includes(searchQuery.value.toLowerCase()) || p.id.toString() === searchQuery.value
    );
  }
  if (sortBy.value === 'name') {
    list = [...list].sort((a, b) => a.name.localeCompare(b.name));
  } else {
    list = [...list].sort((a, b) => a.id - b.id);
  }
  return list;
});

const nextBatch = () => { offset.value += limit; fetchPokemon(); };
const prevBatch = () => { if (offset.value > 0) { offset.value -= limit; fetchPokemon(); } };
const goToDetail = (id) => router.push(`/pokemon/${id}`);

const toggleFav = async (pokemon) => {
  if (!authStore.isLoggedIn) { router.push('/login'); return; }
  if (favoritesStore.isFavorite(pokemon.id)) {
    await favoritesStore.remove(pokemon.id);
  } else {
    await favoritesStore.add(pokemon.id, pokemon.name);
  }
};

onMounted(() => {
  fetchPokemon();
  loadFilters();
  if (authStore.isLoggedIn) favoritesStore.load();
});
</script>

<template>
  <div class="app-container" style="padding-bottom:3rem;">
    <div class="section-header">
      <h1 class="section-title neon-text-green">POKÉDEX</h1>
      <p class="section-subtitle">NEURAL LINK ESTABLISHED</p>
    </div>

    <!-- Search -->
    <div class="search-wrapper">
      <div class="search-glow"></div>
      <div class="search-box">
        <Search :size="22" />
        <input v-model="searchQuery" type="text" placeholder="BUSCAR POR NOMBRE O NÚMERO..." />
        <button v-if="searchQuery" @click="clearSearch" style="color:var(--neon-green);padding:0.5rem;">
          <X :size="18" />
        </button>
      </div>
    </div>

    <!-- Filter Toggle + Sort -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
      <button @click="showFilters = !showFilters" class="pagination__btn" style="font-size:0.7rem;padding:0.4rem 1rem;">
        <Filter :size="14" /> {{ showFilters ? 'OCULTAR FILTROS' : 'MOSTRAR FILTROS' }}
      </button>
      <div style="display:flex;gap:0.5rem;align-items:center;">
        <span style="font-size:0.6rem;color:rgba(255,255,255,0.3);letter-spacing:0.1em;text-transform:uppercase;">Ordenar:</span>
        <button @click="sortBy = 'number'" class="pagination__btn" :style="sortBy === 'number' ? 'background:var(--neon-blue);color:#000;' : ''" style="font-size:0.6rem;padding:0.3rem 0.8rem;">#NUM</button>
        <button @click="sortBy = 'name'" class="pagination__btn" :style="sortBy === 'name' ? 'background:var(--neon-blue);color:#000;' : ''" style="font-size:0.6rem;padding:0.3rem 0.8rem;">A-Z</button>
      </div>
    </div>

    <!-- Filters -->
    <Transition name="fade">
      <div v-if="showFilters" style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:2rem;padding:1.2rem;border:1px solid var(--border-dim);background:rgba(255,255,255,0.02);">
        <div>
          <label class="auth-label">TIPO</label>
          <select v-model="selectedType" class="auth-input" style="cursor:pointer;">
            <option value="">Todos</option>
            <option v-for="t in types" :key="t.name" :value="t.name">{{ capitalize(t.name) }}</option>
          </select>
        </div>
        <div>
          <label class="auth-label">GENERACIÓN</label>
          <select v-model="selectedGen" class="auth-input" style="cursor:pointer;">
            <option value="">Todas</option>
            <option v-for="(g, i) in generations" :key="g.name" :value="i + 1">
              {{ generationNames[g.name]?.name || capitalize(g.name) }}
            </option>
          </select>
        </div>
      </div>
    </Transition>

    <!-- Loading -->
    <div v-if="loading || searchLoading" class="loader-wrapper">
      <Loader2 :size="56" class="spin" />
      <p class="loader-text">ESCANEANDO...</p>
    </div>
    <!-- No results -->
    <div v-else-if="displayedPokemon.length === 0" class="empty-state">
      <Search :size="60" class="empty-state__icon" />
      <h2 class="empty-state__title">Sin resultados</h2>
      <p class="empty-state__text">Pokémon no encontrado. Verifica el nombre o número</p>
    </div>
    <!-- Grid -->
    <div v-else class="poke-grid">
      <div v-for="pokemon in displayedPokemon" :key="pokemon.id" class="poke-card" @click="goToDetail(pokemon.id)">
        <span class="poke-card__id">#{{ padId(pokemon.id) }}</span>
        <button class="poke-card__fav-btn" @click.stop="toggleFav(pokemon)" :title="favoritesStore.isFavorite(pokemon.id) ? 'Quitar' : 'Agregar'">
          {{ favoritesStore.isFavorite(pokemon.id) ? '❤️' : '🤍' }}
        </button>
        <div class="poke-card__img-wrapper">
          <div class="poke-card__img-glow"></div>
          <img :src="getArtwork(pokemon)" :alt="pokemon.name" class="poke-card__img" loading="lazy" referrerpolicy="no-referrer" />
        </div>
        <h2 class="poke-card__name">{{ pokemon.name }}</h2>
        <div class="type-badges">
          <span v-for="t in pokemon.types" :key="t.type.name" class="type-badge" :class="getTypeClass(t.type.name)">{{ t.type.name }}</span>
        </div>
        <div class="scanlines"></div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="!loading && !searchQuery && filteredByApi === null" class="pagination">
      <button class="pagination__btn" :disabled="offset === 0" @click="prevBatch">
        <ChevronLeft :size="18" /> PREV
      </button>
      <span class="pagination__sector">SECTOR {{ Math.floor(offset / limit) + 1 }}</span>
      <button class="pagination__btn" @click="nextBatch">NEXT <ChevronRight :size="18" /></button>
    </div>
  </div>
</template>
