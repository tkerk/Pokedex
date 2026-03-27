<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Users, Search, UserPlus, Check, X, Loader2, Clock, Swords } from 'lucide-vue-next';
import { authStore } from '@/stores/authStore';
import { apiFetch } from '@/services/api';

const router = useRouter();
const friends = ref([]);
const pendingRequests = ref([]);
const loading = ref(true);
const searchCode = ref('');
const searchResult = ref(null);
const searchError = ref('');
const searchLoading = ref(false);
const sendError = ref('');
const sendSuccess = ref('');
const challengeMsg = ref('');

const loadFriends = async () => {
  if (!authStore.isLoggedIn) { loading.value = false; return; }
  loading.value = true;
  try {
    const [f, p] = await Promise.all([
      apiFetch('/friends'),
      apiFetch('/friends/pending'),
    ]);
    friends.value = f;
    pendingRequests.value = p;
  } catch (e) { console.error(e); }
  finally { loading.value = false; }
};

const searchFriend = async () => {
  if (!searchCode.value.trim()) return;
  searchLoading.value = true;
  searchError.value = '';
  searchResult.value = null;
  try {
    const result = await apiFetch(`/friends/search/${searchCode.value.trim()}`);
    searchResult.value = result;
  } catch (e) { searchError.value = e.message; }
  finally { searchLoading.value = false; }
};

const sendRequest = async () => {
  sendError.value = '';
  sendSuccess.value = '';
  try {
    await apiFetch('/friends/request', {
      method: 'POST',
      body: JSON.stringify({ friendCode: searchCode.value.trim() }),
    });
    sendSuccess.value = '¡Solicitud enviada!';
    searchCode.value = '';
    searchResult.value = null;
    await loadFriends();
  } catch (e) { sendError.value = e.message; }
};

const acceptRequest = async (id) => {
  try {
    await apiFetch(`/friends/${id}/accept`, { method: 'PATCH' });
    await loadFriends();
  } catch (e) { console.error(e); }
};

const rejectRequest = async (id) => {
  try {
    await apiFetch(`/friends/${id}/reject`, { method: 'PATCH' });
    await loadFriends();
  } catch (e) { console.error(e); }
};

const challengeBattle = async (friendId, friendName) => {
  challengeMsg.value = '';
  try {
    await apiFetch('/battle/challenge', {
      method: 'POST',
      body: JSON.stringify({ opponentId: friendId }),
    });
    challengeMsg.value = `⚔️ ¡Reto enviado a ${friendName}!`;
    setTimeout(() => { challengeMsg.value = ''; }, 4000);
  } catch (e) {
    challengeMsg.value = `Error: ${e.message}`;
    setTimeout(() => { challengeMsg.value = ''; }, 4000);
  }
};

const acceptedFriends = () => friends.value.filter(f => f.status === 'accepted');
const pendingSent = () => friends.value.filter(f => f.status === 'pending');

onMounted(loadFriends);
</script>

<template>
  <div class="app-container" style="padding-bottom:3rem;">
    <div class="section-header">
      <h1 class="section-title neon-text-green">
        <Users :size="36" style="display:inline;vertical-align:middle;margin-right:0.5rem;" />
        AMIGOS
      </h1>
      <p class="section-subtitle">RED DE ENTRENADORES</p>
    </div>

    <div v-if="!authStore.isLoggedIn" class="empty-state">
      <Users :size="80" class="empty-state__icon" />
      <h2 class="empty-state__title">Inicia sesión</h2>
      <p class="empty-state__text">Necesitas una cuenta para agregar amigos</p>
      <button @click="router.push('/login')" class="auth-btn" style="max-width:250px;margin:1.5rem auto 0;">LOGIN</button>
    </div>

    <template v-else>
      <!-- Search by Friend Code -->
      <div style="border:1px solid var(--neon-green);padding:1.5rem;margin-bottom:2rem;background:rgba(0,255,0,0.02);">
        <label class="auth-label">BUSCAR POR CÓDIGO DE AMIGO</label>
        <div class="search-box" style="margin-bottom:0.8rem;">
          <Search :size="18" />
          <input v-model="searchCode" placeholder="Ej: A1B2C3D4" @keyup.enter="searchFriend" style="text-transform:uppercase;" />
          <button @click="searchFriend" class="pagination__btn" style="margin:0.3rem;padding:0.4rem 0.8rem;font-size:0.65rem;">BUSCAR</button>
        </div>

        <div v-if="searchLoading" style="text-align:center;padding:0.5rem;">
          <Loader2 :size="24" class="spin" />
        </div>

        <div v-if="searchResult" style="display:flex;align-items:center;justify-content:space-between;border:1px solid var(--neon-blue);padding:0.8rem;margin-top:0.5rem;">
          <div>
            <p style="font-size:0.85rem;font-weight:700;text-transform:uppercase;">{{ searchResult.name }}</p>
            <p style="font-size:0.6rem;color:var(--neon-blue);">{{ searchResult.friend_code }}</p>
            <span style="font-size:0.55rem;" :style="searchResult.is_online ? 'color:#22c55e;' : 'color:rgba(255,255,255,0.3);'">
              {{ searchResult.is_online ? '● Conectado' : '○ Desconectado' }}
            </span>
          </div>
          <button @click="sendRequest" class="pagination__btn" style="padding:0.4rem 0.8rem;font-size:0.65rem;">
            <UserPlus :size="14" /> ENVIAR SOLICITUD
          </button>
        </div>

        <p v-if="searchError" style="color:#ef4444;font-size:0.7rem;margin-top:0.5rem;">{{ searchError }}</p>
        <p v-if="sendError" style="color:#ef4444;font-size:0.7rem;margin-top:0.5rem;">{{ sendError }}</p>
        <p v-if="sendSuccess" style="color:#22c55e;font-size:0.7rem;margin-top:0.5rem;">{{ sendSuccess }}</p>
      </div>

      <!-- Challenge message -->
      <Transition name="fade">
        <p v-if="challengeMsg" style="text-align:center;font-size:0.75rem;margin-bottom:1rem;padding:0.5rem;border:1px solid var(--neon-green);background:rgba(0,255,0,0.05);color:var(--neon-green);">
          {{ challengeMsg }}
        </p>
      </Transition>

      <!-- Pending Requests -->
      <div v-if="pendingRequests.length > 0" style="margin-bottom:2rem;">
        <h3 class="neon-text-blue" style="font-size:0.75rem;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:1rem;">
          📩 Solicitudes Pendientes ({{ pendingRequests.length }})
        </h3>
        <div style="display:grid;gap:0.5rem;">
          <div v-for="req in pendingRequests" :key="req.friendship_id" style="display:flex;align-items:center;justify-content:space-between;border:1px solid var(--border-dim);padding:0.8rem;">
            <div>
              <p style="font-size:0.8rem;font-weight:700;text-transform:uppercase;">{{ req.from_name }}</p>
              <p style="font-size:0.55rem;color:rgba(255,255,255,0.3);">{{ req.friend_code }}</p>
            </div>
            <div style="display:flex;gap:0.4rem;">
              <button @click="acceptRequest(req.friendship_id)" style="color:#22c55e;padding:0.3rem;"><Check :size="18" /></button>
              <button @click="rejectRequest(req.friendship_id)" style="color:#ef4444;padding:0.3rem;"><X :size="18" /></button>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loader-wrapper">
        <Loader2 :size="56" class="spin" />
      </div>

      <!-- Friends List -->
      <div v-else-if="acceptedFriends().length > 0">
        <h3 class="neon-text-blue" style="font-size:0.75rem;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:1rem;">
          👥 Amigos ({{ acceptedFriends().length }})
        </h3>
        <div style="display:grid;gap:0.5rem;">
          <div v-for="f in acceptedFriends()" :key="f.friendship_id" style="display:flex;align-items:center;justify-content:space-between;border:1px solid var(--border-dim);padding:1rem;">
            <div style="display:flex;align-items:center;gap:0.8rem;">
              <div style="width:12px;height:12px;border-radius:50%;" :style="f.is_online ? 'background:#22c55e;box-shadow:0 0 8px #22c55e;' : 'background:rgba(255,255,255,0.2);'"></div>
              <div>
                <p style="font-size:0.85rem;font-weight:700;text-transform:uppercase;">{{ f.friend_name }}</p>
                <p style="font-size:0.55rem;color:var(--neon-blue);">{{ f.friend_code }}</p>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:0.5rem;">
              <button @click="challengeBattle(f.friend_id, f.friend_name)" class="pagination__btn"
                style="padding:0.3rem 0.7rem;font-size:0.6rem;display:flex;align-items:center;gap:0.3rem;">
                <Swords :size="14" /> RETAR
              </button>
              <span style="font-size:0.6rem;" :style="f.is_online ? 'color:#22c55e;' : 'color:rgba(255,255,255,0.3);'">
                {{ f.is_online ? 'CONECTADO' : 'DESCONECTADO' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty -->
      <div v-else-if="!loading && acceptedFriends().length === 0" class="empty-state">
        <Users :size="80" class="empty-state__icon" />
        <h2 class="empty-state__title">Sin amigos aún</h2>
        <p class="empty-state__text">Comparte tu código de amigo o busca el de alguien más</p>
      </div>
    </template>
  </div>
</template>
