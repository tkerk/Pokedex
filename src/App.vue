<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import NavBar from '@/components/NavBar.vue';
import { authStore } from '@/stores/authStore';
import { favoritesStore } from '@/stores/favoritesStore';
import { pushManager } from '@/services/pushManager';
import { syncOfflineRequestsNow } from '@/services/api';

let heartbeatInterval = null;
const foregroundNotification = ref(null);
let notifTimeout = null;

const startHeartbeat = () => {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  const token = localStorage.getItem('poke_token');
  if (!token) return;

  const ping = () => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/heartbeat`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  };

  ping();
  heartbeatInterval = setInterval(ping, 30000);
};

const showForegroundNotif = (payload) => {
  foregroundNotification.value = payload;
  clearTimeout(notifTimeout);
  notifTimeout = setTimeout(() => {
    foregroundNotification.value = null;
  }, 6000);
};

onMounted(async () => {
  // Escuchar cuando regresa el internet en 1er plano para sincronizar al instante
  window.addEventListener('online', () => {
    console.log('[App] Conexión recuperada, forzando sync...');
    syncOfflineRequestsNow();
  });

  if (authStore.isLoggedIn) {
    await favoritesStore.load();
    startHeartbeat();
    // Inicializar push notifications
    await pushManager.init();
    pushManager.listenForMessages((payload) => {
      showForegroundNotif(payload);
    });
  }
});

onUnmounted(() => {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
});
</script>

<template>
  <div class="mist-container">
    <div class="mist-layer mist-1"></div>
    <div class="mist-layer mist-2"></div>
    <div class="mist-layer mist-3"></div>
  </div>
  <NavBar />

  <!-- Foreground Push Notification Toast -->
  <Transition name="slide-down">
    <div v-if="foregroundNotification" class="push-toast" @click="foregroundNotification = null">
      <div class="push-toast__icon">🔔</div>
      <div class="push-toast__content">
        <p class="push-toast__title">{{ foregroundNotification.title }}</p>
        <p class="push-toast__body">{{ foregroundNotification.body }}</p>
      </div>
      <button class="push-toast__close" @click.stop="foregroundNotification = null">✕</button>
    </div>
  </Transition>

  <RouterView />
  <div class="footer-bar"></div>
</template>

<style scoped>
.push-toast {
  position: fixed;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 0.8rem;
  background: linear-gradient(135deg, rgba(0, 20, 0, 0.95), rgba(0, 40, 20, 0.95));
  border: 1px solid var(--neon-green, #39FF14);
  box-shadow: 0 0 20px rgba(57, 255, 20, 0.3), 0 8px 32px rgba(0, 0, 0, 0.5);
  padding: 1rem 1.2rem;
  max-width: 420px;
  width: calc(100% - 2rem);
  cursor: pointer;
  backdrop-filter: blur(10px);
}

.push-toast__icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.push-toast__content {
  flex: 1;
  min-width: 0;
}

.push-toast__title {
  font-size: 0.8rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--neon-green, #39FF14);
  margin-bottom: 0.15rem;
}

.push-toast__body {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.7);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.push-toast__close {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.4);
  padding: 0.3rem;
  flex-shrink: 0;
}

.push-toast__close:hover {
  color: #ef4444;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-down-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-100%);
}

.slide-down-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-100%);
}
</style>
