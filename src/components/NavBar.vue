<script setup>
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { BookOpen, Heart, LogIn, UserPlus, LogOut, User, Swords, Users } from 'lucide-vue-next';
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
      <RouterLink to="/" class="navbar__brand">POKÉDEX TK</RouterLink>
      <div class="navbar__links">
        <RouterLink to="/" class="navbar__link" :class="{ 'navbar__link--active': route.path === '/' }">
          <BookOpen :size="16" /><span>Pokédex</span>
        </RouterLink>
        <RouterLink to="/favorites" class="navbar__link" :class="{ 'navbar__link--active': route.path === '/favorites' }">
          <Heart :size="16" /><span>Favoritos</span>
        </RouterLink>
        <RouterLink to="/teams" class="navbar__link" :class="{ 'navbar__link--active': route.path === '/teams' }">
          <Swords :size="16" /><span>Equipos</span>
        </RouterLink>
        <RouterLink to="/friends" class="navbar__link" :class="{ 'navbar__link--active': route.path === '/friends' }">
          <Users :size="16" /><span>Amigos</span>
        </RouterLink>

        <template v-if="authStore.isLoggedIn">
          <RouterLink to="/profile" class="navbar__link" :class="{ 'navbar__link--active': route.path === '/profile' }" style="color:var(--neon-green);">
            <User :size="16" /><span>{{ authStore.user?.name }}</span>
          </RouterLink>
          <button @click="handleLogout" class="navbar__link" style="cursor:pointer;">
            <LogOut :size="16" /><span>Salir</span>
          </button>
        </template>

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
