<script setup>
import { watch } from 'vue'
import { useTheme } from 'vuetify'
import { useSettingsStore } from './stores/settings'

const theme = useTheme()
const settingsStore = useSettingsStore()

settingsStore.applyPreferences()
settingsStore.watchSystemTheme()

watch(
  () => settingsStore.vuetifyThemeName,
  (themeName) => {
    theme.global.name.value = themeName
  },
  { immediate: true },
)
</script>

<template>
  <v-app :class="{ 'inventory-dark': settingsStore.isDark }">
    <router-view />
  </v-app>
</template>
