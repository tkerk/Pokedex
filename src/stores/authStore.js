import { reactive } from 'vue';
import { authService } from '@/services/authService';

export const authStore = reactive({
  user: authService.getUser(),
  token: authService.getToken(),

  get isLoggedIn() {
    return !!this.token;
  },

  setSession(user, token) {
    this.user = user;
    this.token = token;
  },

  async login(email, password) {
    const data = await authService.login(email, password);
    this.setSession(data.user, data.token);
    return data;
  },

  async register(name, email, password) {
    const data = await authService.register(name, email, password);
    this.setSession(data.user, data.token);
    return data;
  },

  logout() {
    authService.logout();
    this.user = null;
    this.token = null;
  },
});
