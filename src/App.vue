<script setup>
import { onMounted } from 'vue';
import NavBar from '@/components/NavBar.vue';
import { authStore } from '@/stores/authStore';
import { favoritesStore } from '@/stores/favoritesStore';

onMounted(async () => {
  if (authStore.isLoggedIn) {
    await favoritesStore.load();
  }
});
</script>

<template>
  <!-- Mist Effect Overlay -->
  <div class="mist-container">
    <div class="mist-layer mist-1"></div>
    <div class="mist-layer mist-2"></div>
    <div class="mist-layer mist-3"></div>
  </div>

  <!-- Navbar -->
  <NavBar />

  <!-- Router View -->
  <RouterView />

  <!-- Footer glow bar -->
  <div class="footer-bar"></div>
</template>

<style scoped></style>
