import { createRouter, createWebHistory } from 'vue-router';
import PokedexView from '@/views/PokedexView.vue';
import FavoritesView from '@/views/FavoritesView.vue';
import LoginView from '@/views/LoginView.vue';
import SignupView from '@/views/SignupView.vue';
import PokemonDetailView from '@/views/PokemonDetailView.vue';
import TeamsView from '@/views/TeamsView.vue';
import FriendsView from '@/views/FriendsView.vue';
import ProfileView from '@/views/ProfileView.vue';

const routes = [
  { path: '/', name: 'Pokedex', component: PokedexView },
  { path: '/pokemon/:id', name: 'PokemonDetail', component: PokemonDetailView },
  { path: '/favorites', name: 'Favorites', component: FavoritesView },
  { path: '/teams', name: 'Teams', component: TeamsView },
  { path: '/friends', name: 'Friends', component: FriendsView },
  { path: '/profile', name: 'Profile', component: ProfileView },
  { path: '/login', name: 'Login', component: LoginView },
  { path: '/signup', name: 'Signup', component: SignupView },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
