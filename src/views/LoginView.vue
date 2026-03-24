<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { LogIn, Eye, EyeOff } from 'lucide-vue-next';
import { authStore } from '@/stores/authStore';
import { favoritesStore } from '@/stores/favoritesStore';

const router = useRouter();
const email = ref('');
const password = ref('');
const showPassword = ref(false);
const errorMsg = ref('');
const loading = ref(false);

const handleLogin = async () => {
  if (!email.value || !password.value) {
    errorMsg.value = 'Todos los campos son requeridos';
    return;
  }
  loading.value = true;
  errorMsg.value = '';
  try {
    await authStore.login(email.value, password.value);
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
        <LogIn :size="28" style="display:inline;vertical-align:middle;margin-right:0.4rem;" />
        LOGIN
      </h1>
      <p class="auth-subtitle">Identifícate para continuar</p>

      <form @submit.prevent="handleLogin">
        <div class="auth-field">
          <label class="auth-label">Email</label>
          <input v-model="email" type="email" class="auth-input" placeholder="trainer@pokecenter.com" autocomplete="email" />
        </div>

        <div class="auth-field">
          <label class="auth-label">Contraseña</label>
          <div style="position:relative;">
            <input v-model="password" :type="showPassword ? 'text' : 'password'" class="auth-input" placeholder="••••••••" autocomplete="current-password" />
            <button type="button" @click="showPassword = !showPassword" style="position:absolute;right:0.8rem;top:50%;transform:translateY(-50%);color:var(--neon-blue);opacity:0.5;">
              <Eye v-if="!showPassword" :size="18" />
              <EyeOff v-else :size="18" />
            </button>
          </div>
        </div>

        <p v-if="errorMsg" style="color:#ef4444;font-size:0.75rem;margin-bottom:0.8rem;text-align:center;">{{ errorMsg }}</p>

        <button type="submit" class="auth-btn" :disabled="loading">
          {{ loading ? 'CONECTANDO...' : 'INICIAR SESIÓN' }}
        </button>
      </form>

      <p class="auth-footer">
        ¿No tienes cuenta?
        <RouterLink to="/signup">Regístrate aquí</RouterLink>
      </p>
    </div>
  </div>
</template>
