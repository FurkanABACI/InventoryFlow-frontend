import { defineStore } from "pinia";
import { authService } from "../services/authService";

const TOKEN_KEY = "inventoryflow_token";
const USER_KEY = "inventoryflow_user";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: localStorage.getItem(TOKEN_KEY),
    user: JSON.parse(localStorage.getItem(USER_KEY) || "null"),
    loading: false,
    error: null,
  }),

  getters: {
    isAuthenticated: (state) => Boolean(state.token),
    userFullName: (state) =>
      state.user?.full_name || state.user?.username || "Kullanici",
  },

  actions: {
    async login(credentials) {
      this.loading = true;
      this.error = null;

      try {
        const data = await authService.login(credentials);
        const token = data.token || data.key;
        const user = data.user || null;

        this.setSession(token, user);
        return data;
      } catch (error) {
        this.error =
          error.response?.data?.detail ||
          "Giriş yapılamadı bilgilerinizi kontrol edin.";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async logout() {
      try {
        await authService.logout();
      } finally {
        this.clearSession();
      }
    },

    setSession(token, user) {
      this.token = token;
      this.user = user;

      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    },

    clearSession() {
      this.token = null;
      this.user = null;

      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    },
  },
});
