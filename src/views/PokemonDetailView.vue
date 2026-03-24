<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ChevronLeft, ChevronRight, Loader2, Zap, Swords, ArrowRight } from 'lucide-vue-next';
import { pokeService } from '@/services/pokeService';
import { authStore } from '@/stores/authStore';
import { favoritesStore } from '@/stores/favoritesStore';
import {
  getTypeClass, getArtworkById, getSpanishText, getSpanishGenus,
  generationNames, capitalize, padId
} from '@/utils/helpers';

const route = useRoute();
const router = useRouter();

const pokemon = ref(null);
const species = ref(null);
const evolutions = ref([]);
const loading = ref(true);

const loadPokemon = async () => {
  loading.value = true;
  try {
    const id = route.params.id;
    const [pokeData, speciesData] = await Promise.all([
      pokeService.getPokemonDetail(id),
      pokeService.getSpecies(id),
    ]);

    pokemon.value = pokeData;
    species.value = speciesData;

    // Cadena evolutiva
    if (speciesData.evolution_chain?.url) {
      evolutions.value = await pokeService.getEvolutionChain(speciesData.evolution_chain.url);
    }
  } catch (e) {
    console.error('Error cargando Pokémon:', e);
  } finally {
    loading.value = false;
  }
};

const description = () => {
  if (!species.value) return '';
  return getSpanishText(species.value.flavor_text_entries, 'flavor_text')
    .replace(/\n|\f/g, ' ');
};

const genus = () => species.value ? getSpanishGenus(species.value.genera) : '';

const habitat = () => species.value?.habitat?.name || 'Desconocido';
const color = () => species.value?.color?.name || '';
const generation = () => {
  const gen = species.value?.generation?.name;
  return generationNames[gen]?.name || capitalize(gen || '');
};
const region = () => {
  const gen = species.value?.generation?.name;
  return generationNames[gen]?.region || '';
};

const toggleFav = async () => {
  if (!authStore.isLoggedIn) { router.push('/login'); return; }
  if (favoritesStore.isFavorite(pokemon.value.id)) {
    await favoritesStore.remove(pokemon.value.id);
  } else {
    await favoritesStore.add(pokemon.value.id, pokemon.value.name);
  }
};

const goToEvolution = (id) => {
  router.push(`/pokemon/${id}`);
};

const prevPokemon = () => {
  const id = pokemon.value?.id;
  if (id > 1) router.push(`/pokemon/${id - 1}`);
};
const nextPokemon = () => {
  const id = pokemon.value?.id;
  router.push(`/pokemon/${id + 1}`);
};

onMounted(() => {
  loadPokemon();
  if (authStore.isLoggedIn) favoritesStore.load();
});

// Recargar cuando cambia la ruta (para navegación entre evoluciones)
import { watch } from 'vue';
watch(() => route.params.id, () => {
  if (route.params.id) loadPokemon();
});
</script>

<template>
  <div class="app-container" style="padding-bottom:3rem;">
    <!-- Loading -->
    <div v-if="loading" class="loader-wrapper">
      <Loader2 :size="56" class="spin" />
      <p class="loader-text">CARGANDO DATOS...</p>
    </div>

    <div v-else-if="pokemon">
      <!-- Back + Nav -->
      <div style="display:flex;justify-content:space-between;align-items:center;padding:1.5rem 0;">
        <button @click="router.push('/')" class="pagination__btn" style="font-size:0.7rem;padding:0.4rem 1rem;">
          <ChevronLeft :size="14" /> VOLVER
        </button>
        <div style="display:flex;gap:0.5rem;">
          <button @click="prevPokemon" :disabled="pokemon.id <= 1" class="pagination__btn" style="padding:0.4rem 0.8rem;">
            <ChevronLeft :size="16" />
          </button>
          <button @click="nextPokemon" class="pagination__btn" style="padding:0.4rem 0.8rem;">
            <ChevronRight :size="16" />
          </button>
        </div>
      </div>

      <!-- Main Grid -->
      <div class="modal-grid">
        <!-- Left Column: Image + Basic Info -->
        <div style="display:flex;flex-direction:column;align-items:center;">
          <div class="modal-img-wrapper" style="width:260px;height:260px;">
            <div class="modal-img-glow"></div>
            <img
              :src="getArtworkById(pokemon.id)"
              :alt="pokemon.name"
              class="modal-img"
              referrerpolicy="no-referrer"
            />
          </div>

          <h1 class="modal-name" style="font-size:2.5rem;">{{ pokemon.name }}</h1>
          <p class="section-subtitle" style="margin-bottom:0.8rem;">#{{ padId(pokemon.id) }} — {{ genus() }}</p>

          <div class="type-badges" style="justify-content:center;margin-bottom:1rem;">
            <span
              v-for="t in pokemon.types"
              :key="t.type.name"
              class="type-badge"
              :class="getTypeClass(t.type.name)"
              style="font-size:0.75rem;padding:0.3rem 0.7rem;"
            >{{ t.type.name }}</span>
          </div>

          <!-- Fav Button -->
          <button class="auth-btn" style="max-width:280px;margin-bottom:1.5rem;" @click="toggleFav">
            {{ favoritesStore.isFavorite(pokemon.id) ? '❤️ EN FAVORITOS' : '🤍 AGREGAR A FAVORITOS' }}
          </button>

          <!-- Species Info -->
          <div class="modal-info-grid" style="width:100%;max-width:300px;">
            <div class="modal-info-box">
              <div class="modal-info-label">Altura</div>
              <div class="modal-info-value">{{ pokemon.height / 10 }}m</div>
            </div>
            <div class="modal-info-box">
              <div class="modal-info-label">Peso</div>
              <div class="modal-info-value">{{ pokemon.weight / 10 }}kg</div>
            </div>
            <div class="modal-info-box">
              <div class="modal-info-label">Color</div>
              <div class="modal-info-value">{{ capitalize(color()) }}</div>
            </div>
            <div class="modal-info-box">
              <div class="modal-info-label">Hábitat</div>
              <div class="modal-info-value">{{ capitalize(habitat()) }}</div>
            </div>
            <div class="modal-info-box">
              <div class="modal-info-label">Generación</div>
              <div class="modal-info-value">{{ generation() }}</div>
            </div>
            <div class="modal-info-box">
              <div class="modal-info-label">Región</div>
              <div class="modal-info-value">{{ region() }}</div>
            </div>
          </div>
        </div>

        <!-- Right Column: Stats + Description + Abilities -->
        <div style="display:flex;flex-direction:column;gap:2rem;">
          <!-- Description -->
          <div>
            <h3 class="neon-text-blue" style="font-size:0.75rem;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:0.8rem;">
              📝 Descripción
            </h3>
            <p style="font-size:0.85rem;color:rgba(255,255,255,0.7);line-height:1.7;">{{ description() }}</p>
          </div>

          <!-- Stats -->
          <div>
            <h3 class="neon-text-blue" style="font-size:0.75rem;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:0.8rem;">
              ⚡ Estadísticas
            </h3>
            <div v-for="stat in pokemon.stats" :key="stat.stat.name" class="stat-item">
              <div class="stat-header">
                <span class="stat-name">{{ stat.stat.name.replace(/-/g, ' ') }}</span>
                <span class="stat-value">{{ stat.base_stat }}</span>
              </div>
              <div class="stat-bar-bg">
                <div class="stat-bar-fill" :style="{ width: (stat.base_stat / 255) * 100 + '%' }"></div>
              </div>
            </div>
          </div>

          <!-- Abilities -->
          <div>
            <h3 class="neon-text-blue" style="font-size:0.75rem;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:0.8rem;">
              🛡️ Habilidades
            </h3>
            <div style="display:flex;flex-wrap:wrap;gap:0.5rem;">
              <span
                v-for="a in pokemon.abilities"
                :key="a.ability.name"
                style="border:1px solid var(--neon-green);color:var(--neon-green);padding:0.3rem 0.7rem;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.08em;"
              >
                {{ a.ability.name.replace(/-/g, ' ') }}
                <span v-if="a.is_hidden" style="color:rgba(255,255,255,0.3);margin-left:0.3rem;">(oculta)</span>
              </span>
            </div>
          </div>

          <!-- Moves (top 20) -->
          <div>
            <h3 class="neon-text-blue" style="font-size:0.75rem;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:0.8rem;">
              ⚔️ Movimientos ({{ pokemon.moves.length }} total)
            </h3>
            <div style="display:flex;flex-wrap:wrap;gap:0.35rem;max-height:200px;overflow-y:auto;">
              <span
                v-for="m in pokemon.moves.slice(0, 30)"
                :key="m.move.name"
                style="border:1px solid var(--border-dim);color:rgba(255,255,255,0.5);padding:0.2rem 0.5rem;font-size:0.6rem;text-transform:uppercase;letter-spacing:0.05em;"
              >{{ m.move.name.replace(/-/g, ' ') }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Evolution Chain -->
      <div v-if="evolutions.length > 1" style="margin-top:3rem;border-top:2px solid var(--border-dim);padding-top:2rem;">
        <h3 class="neon-text-green" style="font-size:1rem;letter-spacing:0.15em;text-transform:uppercase;text-align:center;margin-bottom:1.5rem;">
          🔗 Cadena Evolutiva
        </h3>
        <div style="display:flex;justify-content:center;align-items:center;gap:0.5rem;flex-wrap:wrap;">
          <template v-for="(evo, i) in evolutions" :key="evo.id">
            <div
              @click="goToEvolution(evo.id)"
              style="cursor:pointer;text-align:center;padding:1rem;border:2px solid var(--border-dim);transition:border-color 0.3s;"
              :style="evo.id === pokemon.id ? 'border-color:var(--neon-green);' : ''"
              class="poke-card"
            >
              <img
                :src="evo.image"
                :alt="evo.name"
                style="width:80px;height:80px;object-fit:contain;filter:drop-shadow(0 0 6px rgba(0,255,255,0.3));"
                referrerpolicy="no-referrer"
              />
              <p style="font-size:0.7rem;text-transform:uppercase;margin-top:0.5rem;font-weight:700;">{{ evo.name }}</p>
              <p style="font-size:0.55rem;color:rgba(0,255,255,0.4);">#{{ padId(evo.id) }}</p>
            </div>
            <ArrowRight v-if="i < evolutions.length - 1" :size="24" style="color:var(--neon-green);flex-shrink:0;" />
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
