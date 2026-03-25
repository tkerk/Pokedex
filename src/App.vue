<script setup>
import { onMounted, onUnmounted } from 'vue';
import NavBar from '@/components/NavBar.vue';
import { authStore } from '@/stores/authStore';
import { favoritesStore } from '@/stores/favoritesStore';

let heartbeatInterval = null;

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

onMounted(async () => {
  if (authStore.isLoggedIn) {
    await favoritesStore.load();
    startHeartbeat();
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
  <RouterView />
  <div class="footer-bar"></div>
</template>

<style scoped></style>
