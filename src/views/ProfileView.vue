<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { User, Copy, Check, Loader2, LogOut, Bell } from 'lucide-vue-next';
import { authStore } from '@/stores/authStore';
import { favoritesStore } from '@/stores/favoritesStore';
import { apiFetch } from '@/services/api';
import { pushManager } from '@/services/pushManager';

const router = useRouter();
const profile = ref(null);
const loading = ref(true);
const copied = ref(false);
const pushStatus = ref('Verificando...');

const loadProfile = async () => {
  if (!authStore.isLoggedIn) { loading.value = false; return; }
  loading.value = true;
  try {
    profile.value = await apiFetch('/auth/profile');
  } catch (e) { console.error(e); }
  finally { loading.value = false; }
};

const checkPushStatus = () => {
  if (!('Notification' in window)) {
    pushStatus.value = 'No soportado';
    return;
  }
  if (Notification.permission === 'granted') {
    pushStatus.value = 'Activadas';
  } else if (Notification.permission === 'denied') {
    pushStatus.value = 'Bloqueadas en navegador';
  } else {
    pushStatus.value = 'Falta permiso';
  }
};

const forcePush = async () => {
  pushStatus.value = 'Conectando...';
  // Esto forzará el requester de Notification del navegador si está en 'default'
  const success = await pushManager.init();
  if (success) {
    pushStatus.value = 'Activadas';
  } else {
    pushStatus.value = Notification.permission === 'denied' ? 'Bloqueadas en navegador' : 'Error al suscribir';
  }
};

const copyCode = async () => {
  if (!profile.value?.friend_code) return;
  try {
    await navigator.clipboard.writeText(profile.value.friend_code);
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 2000);
  } catch (e) {
    const el = document.createElement('textarea');
    el.value = profile.value.friend_code;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 2000);
  }
};

const handleLogout = () => {
  authStore.logout();
  favoritesStore.clear();
  router.push('/');
};

onMounted(() => {
  loadProfile();
  checkPushStatus();
});
</script>

<template>
  <div class="app-container" style="padding-bottom:3rem;">
    <div class="section-header">
      <h1 class="section-title neon-text-green">
        <User :size="36" style="display:inline;vertical-align:middle;margin-right:0.5rem;" />
        PERFIL
      </h1>
      <p class="section-subtitle">DATOS DE ENTRENADOR</p>
    </div>

    <div v-if="!authStore.isLoggedIn" class="empty-state">
      <User :size="80" class="empty-state__icon" />
      <h2 class="empty-state__title">Inicia sesión</h2>
      <button @click="router.push('/login')" class="auth-btn" style="max-width:250px;margin:1.5rem auto 0;">LOGIN</button>
    </div>

    <div v-else-if="loading" class="loader-wrapper">
      <Loader2 :size="56" class="spin" />
    </div>

    <div v-else-if="profile" style="max-width:500px;margin:0 auto;">
      <!-- Avatar -->
      <div style="text-align:center;margin-bottom:2rem;">
        <div style="width:100px;height:100px;border-radius:50%;border:3px solid var(--neon-green);margin:0 auto 1rem;display:flex;align-items:center;justify-content:center;font-size:2.5rem;background:rgba(0,255,0,0.05);">
          🎮
        </div>
        <h2 style="font-size:1.8rem;text-transform:uppercase;font-weight:900;letter-spacing:0.08em;">{{ profile.name }}</h2>
        <p style="font-size:0.7rem;color:rgba(255,255,255,0.4);">{{ profile.email }}</p>
      </div>

      <!-- Friend Code -->
      <div style="border:2px solid var(--neon-green);padding:1.5rem;text-align:center;margin-bottom:2rem;background:rgba(0,255,0,0.03);">
        <label style="font-size:0.65rem;letter-spacing:0.2em;color:var(--neon-blue);text-transform:uppercase;display:block;margin-bottom:0.8rem;">CÓDIGO DE AMIGO</label>
        <div style="display:flex;align-items:center;justify-content:center;gap:1rem;">
          <span style="font-size:2rem;font-weight:900;letter-spacing:0.3em;color:var(--neon-green);font-family:monospace;">{{ profile.friend_code }}</span>
          <button @click="copyCode" class="pagination__btn" style="padding:0.4rem 0.8rem;font-size:0.65rem;">
            <Check v-if="copied" :size="14" />
            <Copy v-else :size="14" />
            {{ copied ? 'COPIADO' : 'COPIAR' }}
          </button>
        </div>
        <p style="font-size:0.55rem;color:rgba(255,255,255,0.3);margin-top:0.8rem;">Comparte este código para que otros entrenadores te agreguen</p>
      </div>

      <!-- Info Grid -->
      <div class="modal-info-grid" style="margin-bottom:2rem;">
        <div class="modal-info-box">
          <div class="modal-info-label">Estado</div>
          <div class="modal-info-value" style="color:#22c55e;">● Online</div>
        </div>
        <div class="modal-info-box">
          <div class="modal-info-label">Miembro desde</div>
          <div class="modal-info-value">{{ new Date(profile.created_at).toLocaleDateString('es') }}</div>
        </div>
      </div>

      <!-- Push Status -->
      <div style="border:2px solid var(--neon-blue);padding:1.5rem;text-align:center;margin-bottom:2rem;background:rgba(0,100,255,0.03);">
        <label style="font-size:0.65rem;letter-spacing:0.2em;color:var(--neon-blue);text-transform:uppercase;display:block;margin-bottom:0.8rem;">NOTIFICACIONES PUSH</label>
        <p style="font-size:0.75rem;margin-bottom:1rem;color:rgba(255,255,255,0.7);">
          Estado: <span :style="pushStatus === 'Activadas' ? 'color:#22c55e;font-weight:bold;' : 'color:#ef4444;font-weight:bold;'">{{ pushStatus }}</span>
        </p>
        <button @click="forcePush" class="pagination__btn" style="padding:0.6rem 1.2rem;font-size:0.75rem;width:100%;max-width:250px;">
          <Bell :size="16" style="display:inline;vertical-align:middle;margin-right:0.3rem;" />
          FORZAR ACTIVACIÓN
        </button>
      </div>

      <!-- Logout -->
      <button @click="handleLogout" class="auth-btn" style="background:transparent;border:2px solid #ef4444;color:#ef4444;">
        <LogOut :size="16" style="display:inline;vertical-align:middle;margin-right:0.3rem;" />
        CERRAR SESIÓN
      </button>
    </div>
  </div>
</template>
