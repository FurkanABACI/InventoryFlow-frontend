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
    userRole: (state) => {
      if (state.user?.role) {
        return state.user.role;
      }

      if (state.user?.is_superuser) {
        return "admin";
      }

      if (state.user?.is_staff) {
        return "operations";
      }

      return "department";
    },
    userDepartment: (state) => state.user?.department || "",
    roleLabel: (state) => state.user?.role_label || "Birim Kullanıcısı",
    canManageInventory: (state) => {
      if (typeof state.user?.can_manage_inventory === "boolean") {
        return state.user.can_manage_inventory;
      }

      return Boolean(state.user?.is_superuser || state.user?.is_staff);
    },
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
