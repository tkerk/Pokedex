<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { UserPlus, Eye, EyeOff } from 'lucide-vue-next';
import { authStore } from '@/stores/authStore';
import { favoritesStore } from '@/stores/favoritesStore';

const router = useRouter();
const name = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const showPassword = ref(false);
const errorMsg = ref('');
const loading = ref(false);

const handleSignup = async () => {
  if (!name.value || !email.value || !password.value || !confirmPassword.value) {
    errorMsg.value = 'Todos los campos son requeridos';
    return;
  }
  if (password.value !== confirmPassword.value) {
    errorMsg.value = 'Las contraseñas no coinciden';
    return;
  }
  if (password.value.length < 6) {
    errorMsg.value = 'La contraseña debe tener al menos 6 caracteres';
    return;
  }
  loading.value = true;
  errorMsg.value = '';
  try {
    await authStore.register(name.value, email.value, password.value);
    await favoritesStore.load();
    router.push('/');
  } catch (error) {
    errorMsg.value = error.message;
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="scanlines"></div>

      <h1 class="auth-title">
        <UserPlus :size="28" style="display:inline;vertical-align:middle;margin-right:0.4rem;" />
        SIGNUP
      </h1>
      <p class="auth-subtitle">Crea tu cuenta de entrenador</p>

      <form @submit.prevent="handleSignup">
        <div class="auth-field">
          <label class="auth-label">Nombre</label>
          <input v-model="name" type="text" class="auth-input" placeholder="Ash Ketchum" autocomplete="name" />
        </div>

        <div class="auth-field">
          <label class="auth-label">Email</label>
          <input v-model="email" type="email" class="auth-input" placeholder="trainer@pokecenter.com" autocomplete="email" />
        </div>

        <div class="auth-field">
          <label class="auth-label">Contraseña</label>
          <div style="position:relative;">
            <input v-model="password" :type="showPassword ? 'text' : 'password'" class="auth-input" placeholder="••••••••" autocomplete="new-password" />
            <button type="button" @click="showPassword = !showPassword" style="position:absolute;right:0.8rem;top:50%;transform:translateY(-50%);color:var(--neon-blue);opacity:0.5;">
              <Eye v-if="!showPassword" :size="18" />
              <EyeOff v-else :size="18" />
            </button>
          </div>
        </div>

        <div class="auth-field">
          <label class="auth-label">Confirmar Contraseña</label>
          <input v-model="confirmPassword" :type="showPassword ? 'text' : 'password'" class="auth-input" placeholder="••••••••" autocomplete="new-password" />
        </div>

        <p v-if="errorMsg" style="color:#ef4444;font-size:0.75rem;margin-bottom:0.8rem;text-align:center;">{{ errorMsg }}</p>

        <button type="submit" class="auth-btn" :disabled="loading">
          {{ loading ? 'CREANDO CUENTA...' : 'CREAR CUENTA' }}
        </button>
      </form>

      <p class="auth-footer">
        ¿Ya tienes cuenta?
        <RouterLink to="/login">Inicia sesión</RouterLink>
      </p>
    </div>
  </div>
</template>
