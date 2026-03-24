<script setup>
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { BookOpen, Heart, LogIn, UserPlus, LogOut, User } from 'lucide-vue-next';
import { authStore } from '@/stores/authStore';
import { favoritesStore } from '@/stores/favoritesStore';

const route = useRoute();
const router = useRouter();

const handleLogout = () => {
  authStore.logout();
  favoritesStore.clear();
  router.push('/');
};
</script>

<template>
  <nav class="navbar">
    <div class="navbar__inner">
      <RouterLink to="/" class="navbar__brand">POKÉDEX</RouterLink>
      <div class="navbar__links">
        <RouterLink to="/" class="navbar__link" :class="{ 'navbar__link--active': route.path === '/' }">
          <BookOpen :size="16" /><span>Pokédex</span>
        </RouterLink>
        <RouterLink to="/favorites" class="navbar__link" :class="{ 'navbar__link--active': route.path === '/favorites' }">
          <Heart :size="16" /><span>Favoritos</span>
        </RouterLink>

        <!-- Cuando HAY sesión -->
        <template v-if="authStore.isLoggedIn">
          <span class="navbar__link" style="color:var(--neon-green);cursor:default;">
            <User :size="16" /><span>{{ authStore.user?.name }}</span>
          </span>
          <button @click="handleLogout" class="navbar__link" style="cursor:pointer;">
            <LogOut :size="16" /><span>Salir</span>
          </button>
        </template>

        <!-- Cuando NO hay sesión -->
        <template v-else>
          <RouterLink to="/login" class="navbar__link" :class="{ 'navbar__link--active': route.path === '/login' }">
            <LogIn :size="16" /><span>Login</span>
          </RouterLink>
          <RouterLink to="/signup" class="navbar__link" :class="{ 'navbar__link--active': route.path === '/signup' }">
            <UserPlus :size="16" /><span>Signup</span>
          </RouterLink>
        </template>
      </div>
    </div>
  </nav>
</template>
