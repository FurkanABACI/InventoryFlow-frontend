import { defineStore } from "pinia";
import { i18n } from "../plugins/i18n";

const LOCALE_KEY = "inventoryflow_locale";
const THEME_KEY = "inventoryflow_theme";

export const useSettingsStore = defineStore("settings", {
  state: () => ({
    locale: localStorage.getItem(LOCALE_KEY) || "tr",
    theme: localStorage.getItem(THEME_KEY) || "system",
    systemTheme: window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light",
  }),

  getters: {
    effectiveTheme: (state) =>
      state.theme === "system" ? state.systemTheme : state.theme,
    isDark: (state) =>
      (state.theme === "system" ? state.systemTheme : state.theme) === "dark",
    vuetifyThemeName: (state) =>
      (state.theme === "system" ? state.systemTheme : state.theme) === "dark"
        ? "inventoryDark"
        : "inventoryLight",
  },

  actions: {
    applyPreferences() {
      i18n.global.locale.value = this.locale;
      document.documentElement.lang = this.locale;
      document.documentElement.classList.toggle("theme-dark", this.isDark);
      document.documentElement.dataset.theme = this.theme;
      document.documentElement.dataset.effectiveTheme = this.effectiveTheme;
    },

    watchSystemTheme() {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

      const updateSystemTheme = (event) => {
        this.systemTheme = event.matches ? "dark" : "light";
        this.applyPreferences();
      };

      mediaQuery.addEventListener("change", updateSystemTheme);
    },

    setLocale(locale) {
      this.locale = locale;
      localStorage.setItem(LOCALE_KEY, locale);
      this.applyPreferences();
    },

    toggleLocale() {
      this.setLocale(this.locale === "tr" ? "en" : "tr");
    },

    setTheme(theme) {
      this.theme = theme;
      localStorage.setItem(THEME_KEY, theme);
      this.applyPreferences();
    },

    toggleTheme() {
      const nextTheme = {
        light: "dark",
        dark: "system",
        system: "light",
      }[this.theme];

      this.setTheme(nextTheme);
    },
  },
});
