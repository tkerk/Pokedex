<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Swords, Plus, Trash2, Loader2, Search, X, ToggleLeft, ToggleRight } from 'lucide-vue-next';
import { authStore } from '@/stores/authStore';
import { favoritesStore } from '@/stores/favoritesStore';
import { apiFetch } from '@/services/api';
import { pokeService } from '@/services/pokeService';
import { padId, getTypeClass, getArtworkById } from '@/utils/helpers';

const router = useRouter();
const teams = ref([]);
const loading = ref(true);

// Crear equipo
const showCreate = ref(false);
const teamName = ref('');
const selectedMembers = ref([]);
const searchQuery = ref('');
const searchResults = ref([]);
const searchLoading = ref(false);
const createError = ref('');
let debounce = null;

const loadTeams = async () => {
  if (!authStore.isLoggedIn) { loading.value = false; return; }
  loading.value = true;
  try {
    const data = await apiFetch('/teams');
    teams.value = data;
  } catch (e) { console.error(e); }
  finally { loading.value = false; }
};

// Buscar Pokémon para agregar al equipo (búsqueda global + fuzzy)
const doSearch = async () => {
  if (!searchQuery.value.trim()) { searchResults.value = []; return; }
  searchLoading.value = true;
  try {
    const results = await pokeService.searchPokemonFuzzy(searchQuery.value.trim());
    searchResults.value = results;
  } catch (e) { searchResults.value = []; }
  finally { searchLoading.value = false; }
};

// Debounce search
const onSearchInput = () => {
  clearTimeout(debounce);
  debounce = setTimeout(doSearch, 400);
};

const addMember = (pokemon) => {
  if (selectedMembers.value.length >= 6) return;
  if (selectedMembers.value.find(m => m.id === pokemon.id)) return;
  selectedMembers.value.push({ id: pokemon.id, name: pokemon.name });
  searchQuery.value = '';
  searchResults.value = [];
};

const addFromFavorite = (fav) => {
  if (selectedMembers.value.length >= 6) return;
  if (selectedMembers.value.find(m => m.id === fav.pokemon_id)) return;
  selectedMembers.value.push({ id: fav.pokemon_id, name: fav.pokemon_name });
};

const removeMember = (idx) => {
  selectedMembers.value.splice(idx, 1);
};

const createTeam = async () => {
  createError.value = '';
  if (!teamName.value.trim()) { createError.value = 'Nombre requerido'; return; }
  if (selectedMembers.value.length !== 6) { createError.value = 'Selecciona exactamente 6 Pokémon'; return; }

  try {
    const members = selectedMembers.value.map(m => ({ pokemonId: m.id, pokemonName: m.name }));
    await apiFetch('/teams', {
      method: 'POST',
      body: JSON.stringify({ teamName: teamName.value, members }),
    });
    teamName.value = '';
    selectedMembers.value = [];
    showCreate.value = false;
    await loadTeams();
  } catch (e) { createError.value = e.message; }
};

const deleteTeam = async (teamId) => {
  try {
    await apiFetch(`/teams/${teamId}`, { method: 'DELETE' });
    teams.value = teams.value.filter(t => t.id !== teamId);
  } catch (e) { console.error(e); }
};

const toggleActive = async (teamId) => {
  try {
    const updated = await apiFetch(`/teams/${teamId}/toggle`, { method: 'PATCH' });
    const idx = teams.value.findIndex(t => t.id === teamId);
    if (idx !== -1) teams.value[idx].is_active = updated.is_active;
  } catch (e) { console.error(e); }
};

onMounted(() => {
  loadTeams();
  if (authStore.isLoggedIn) favoritesStore.load();
});
</script>

<template>
  <div class="app-container" style="padding-bottom:3rem;">
    <div class="section-header">
      <h1 class="section-title neon-text-green">
        <Swords :size="36" style="display:inline;vertical-align:middle;margin-right:0.5rem;" />
        EQUIPOS
      </h1>
      <p class="section-subtitle">ARMA TU ESCUADRÓN DE COMBATE</p>
    </div>

    <!-- Not logged in -->
    <div v-if="!authStore.isLoggedIn" class="empty-state">
      <Swords :size="80" class="empty-state__icon" />
      <h2 class="empty-state__title">Inicia sesión</h2>
      <p class="empty-state__text">Necesitas una cuenta para crear equipos</p>
      <button @click="router.push('/login')" class="auth-btn" style="max-width:250px;margin:1.5rem auto 0;">LOGIN</button>
    </div>

    <template v-else>
      <!-- Create Toggle -->
      <button @click="showCreate = !showCreate" class="auth-btn" style="max-width:300px;margin-bottom:2rem;">
        <Plus :size="18" style="display:inline;vertical-align:middle;margin-right:0.3rem;" />
        {{ showCreate ? 'CANCELAR' : 'CREAR EQUIPO' }}
      </button>

      <!-- Create Form -->
      <Transition name="fade">
        <div v-if="showCreate" style="border:1px solid var(--neon-green);padding:1.5rem;margin-bottom:2rem;background:rgba(0,255,0,0.02);">
          <div class="auth-field">
            <label class="auth-label">NOMBRE DEL EQUIPO</label>
            <input v-model="teamName" class="auth-input" placeholder="Ej: Team Rocket" />
          </div>

          <!-- Selected Members -->
          <label class="auth-label" style="margin-top:1rem;">MIEMBROS ({{ selectedMembers.length }}/6)</label>
          <div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:1rem;min-height:50px;">
            <div v-for="(m, i) in selectedMembers" :key="m.id" style="display:flex;align-items:center;gap:0.3rem;border:1px solid var(--neon-blue);padding:0.3rem 0.6rem;">
              <img :src="getArtworkById(m.id)" style="width:30px;height:30px;" referrerpolicy="no-referrer" />
              <span style="font-size:0.65rem;text-transform:uppercase;">{{ m.name }}</span>
              <button @click="removeMember(i)" style="color:red;font-size:0.7rem;"><X :size="12" /></button>
            </div>
          </div>

          <!-- Favoritos rápidos -->
          <div v-if="favoritesStore.items.length > 0" style="margin-bottom:1rem;">
            <label class="auth-label">AGREGAR DESDE FAVORITOS</label>
            <div style="display:flex;flex-wrap:wrap;gap:0.4rem;">
              <button v-for="fav in favoritesStore.items" :key="fav.pokemon_id" @click="addFromFavorite(fav)"
                :disabled="selectedMembers.length >= 6 || selectedMembers.find(m => m.id === fav.pokemon_id)"
                style="border:1px solid var(--border-dim);padding:0.2rem 0.5rem;font-size:0.6rem;text-transform:uppercase;cursor:pointer;"
                :style="selectedMembers.find(m => m.id === fav.pokemon_id) ? 'opacity:0.3;' : 'color:var(--neon-green);'">
                {{ fav.pokemon_name }}
              </button>
            </div>
          </div>

          <!-- Buscar Pokémon -->
          <label class="auth-label">BUSCAR POKÉMON</label>
          <div class="search-box" style="margin-bottom:0.5rem;">
            <Search :size="18" />
            <input v-model="searchQuery" @input="onSearchInput" placeholder="Buscar por nombre o número..." />
          </div>
          <div v-if="searchResults.length > 0" style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:1rem;">
            <div v-for="p in searchResults" :key="p.id" @click="addMember(p)" style="cursor:pointer;border:1px solid var(--neon-green);padding:0.5rem;display:flex;align-items:center;gap:0.4rem;">
              <img :src="getArtworkById(p.id)" style="width:40px;height:40px;" referrerpolicy="no-referrer" />
              <div>
                <p style="font-size:0.7rem;text-transform:uppercase;font-weight:700;">{{ p.name }}</p>
                <p style="font-size:0.55rem;color:var(--neon-blue);">#{{ padId(p.id) }}</p>
              </div>
            </div>
          </div>

          <p v-if="createError" style="color:#ef4444;font-size:0.75rem;margin-bottom:0.5rem;">{{ createError }}</p>
          <button @click="createTeam" class="auth-btn" :disabled="selectedMembers.length !== 6">GUARDAR EQUIPO</button>
        </div>
      </Transition>

      <!-- Loading -->
      <div v-if="loading" class="loader-wrapper">
        <Loader2 :size="56" class="spin" />
      </div>

      <!-- Empty -->
      <div v-else-if="teams.length === 0 && !showCreate" class="empty-state">
        <Swords :size="80" class="empty-state__icon" />
        <h2 class="empty-state__title">Sin equipos</h2>
        <p class="empty-state__text">Crea tu primer equipo de 6 Pokémon</p>
      </div>

      <!-- Teams List -->
      <div v-else style="display:grid;gap:1.5rem;">
        <div v-for="team in teams" :key="team.id" style="border:2px solid var(--border-dim);padding:1.2rem;position:relative;"
          :style="team.is_active ? 'border-color:var(--neon-green);' : ''">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
            <div>
              <h3 style="font-size:1rem;text-transform:uppercase;letter-spacing:0.1em;font-weight:800;">{{ team.team_name }}</h3>
              <span style="font-size:0.55rem;color:rgba(255,255,255,0.3);" :style="team.is_active ? 'color:var(--neon-green);' : ''">
                {{ team.is_active ? '● ACTIVO' : '○ INACTIVO' }}
              </span>
            </div>
            <div style="display:flex;gap:0.5rem;">
              <button @click="toggleActive(team.id)" class="pagination__btn" style="padding:0.3rem 0.6rem;font-size:0.6rem;">
                {{ team.is_active ? 'DESACTIVAR' : 'ACTIVAR' }}
              </button>
              <button @click="deleteTeam(team.id)" style="color:#ef4444;padding:0.3rem;">
                <Trash2 :size="16" />
              </button>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(6, 1fr);gap:0.5rem;">
            <div v-for="member in team.members" :key="member.id" style="text-align:center;">
              <img :src="getArtworkById(member.pokemon_id)" style="width:60px;height:60px;object-fit:contain;filter:drop-shadow(0 0 4px rgba(0,255,255,0.3));" referrerpolicy="no-referrer" />
              <p style="font-size:0.55rem;text-transform:uppercase;margin-top:0.2rem;">{{ member.pokemon_name }}</p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
