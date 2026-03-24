import { apiFetch } from './api';

export const authService = {
  async register(name, email, password) {
    const data = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    localStorage.setItem('poke_token', data.token);
    localStorage.setItem('poke_user', JSON.stringify(data.user));
    return data;
  },

  async login(email, password) {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('poke_token', data.token);
    localStorage.setItem('poke_user', JSON.stringify(data.user));
    return data;
  },

  async getProfile() {
    return await apiFetch('/auth/profile');
  },

  logout() {
    localStorage.removeItem('poke_token');
    localStorage.removeItem('poke_user');
  },

  getToken() {
    return localStorage.getItem('poke_token');
  },

  getUser() {
    const user = localStorage.getItem('poke_user');
    return user ? JSON.parse(user) : null;
  },

  isLoggedIn() {
    return !!localStorage.getItem('poke_token');
  },
};
