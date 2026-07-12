import { createVuetify } from 'vuetify'
import {
  VAlert,
  VApp,
  VBtn,
  VCard,
  VCardActions,
  VCardSubtitle,
  VCardText,
  VCardTitle,
  VChip,
  VDataTable,
  VDivider,
  VDialog,
  VForm,
  VProgressLinear,
  VSnackbar,
  VTextField,
} from 'vuetify/components'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import 'vuetify/styles'

export default createVuetify({
  components: {
    VAlert,
    VApp,
    VBtn,
    VCard,
    VCardActions,
    VCardSubtitle,
    VCardText,
    VCardTitle,
    VChip,
    VDataTable,
    VDivider,
    VDialog,
    VForm,
    VProgressLinear,
    VSnackbar,
    VTextField,
  },
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi,
    },
  },
  theme: {
    defaultTheme: 'inventoryLight',
    themes: {
      inventoryLight: {
        dark: false,
        colors: {
          background: '#f7f8fa',
          surface: '#ffffff',
          primary: '#2563eb',
          secondary: '#0f766e',
          error: '#dc2626',
          warning: '#d97706',
          success: '#16a34a',
        },
      },
      inventoryDark: {
        dark: true,
        colors: {
          background: '#101522',
          surface: '#151c2b',
          primary: '#60a5fa',
          secondary: '#2dd4bf',
          error: '#f87171',
          warning: '#fbbf24',
          success: '#34d399',
        },
      },
    },
  },
})
