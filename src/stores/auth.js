import { defineStore } from "pinia";
import { authService } from "../services/authService";
import { i18n } from "../plugins/i18n";

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
      state.user?.full_name || state.user?.username || i18n.global.t("auth.fallbackUser"),
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
    roleLabel: (state) => state.user?.role_label || i18n.global.t("roles.department"),
    canManageInventory: (state) => {
      if (typeof state.user?.can_manage_inventory === "boolean") {
        return state.user.can_manage_inventory;
      }

      return Boolean(state.user?.is_superuser || state.user?.is_staff);
    },
    isAdmin: (state) => {
      if (state.user?.role) {
        return state.user.role === "admin";
      }

      return Boolean(state.user?.is_superuser);
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
          i18n.global.t("auth.loginFailed");
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
