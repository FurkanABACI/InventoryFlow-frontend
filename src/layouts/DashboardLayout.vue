<script setup>
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { useSettingsStore } from '../stores/settings'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()
const { t } = useI18n()
const themeOptions = ['light', 'dark', 'system']
const profileMenuOpen = ref(false)

const menuItems = [
  { titleKey: 'nav.dashboard', icon: 'P', to: '/', requiresInventoryManager: true },
  { titleKey: 'nav.products', icon: 'Ü', to: '/products', requiresInventoryManager: true },
  { titleKey: 'nav.suppliers', icon: 'T', to: '/suppliers', requiresInventoryManager: true },
  { titleKey: 'nav.receiving', icon: 'M', to: '/receiving', requiresInventoryManager: true },
  { titleKey: 'nav.requisitions', icon: 'İ', to: '/requisitions' },
  { titleKey: 'nav.stockMovements', icon: 'H', to: '/stock-movements', requiresInventoryManager: true },
  { titleKey: 'nav.lowStock', icon: 'S', to: '/low-stock', requiresInventoryManager: true },
  { titleKey: 'nav.users', icon: 'K', to: '/users', requiresAdmin: true },
]

const visibleMenuItems = computed(() =>
  menuItems.filter((item) => {
    if (item.requiresAdmin) {
      return authStore.isAdmin
    }

    if (item.requiresInventoryManager) {
      return authStore.canManageInventory
    }

    return true
  }),
)

const pageTitle = computed(() => {
  const activeItem = menuItems.find((item) => item.to === route.path || route.path.startsWith(`${item.to}/`))

  if (activeItem) {
    return t(activeItem.titleKey)
  }

  if (route.name === 'receiving-detail') {
    return t('nav.receivingDetail')
  }

  if (route.name === 'requisition-detail') {
    return t('nav.requisitionDetail')
  }

  return t('app.name')
})

const userInitials = computed(() => {
  const name = authStore.userFullName || authStore.user?.username || 'IF'

  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
})

function isMenuItemActive(item) {
  return route.path === item.to || route.path.startsWith(`${item.to}/`)
}

async function handleLogout() {
  profileMenuOpen.value = false
  await authStore.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="min-h-screen bg-slate-100 text-slate-900" @click="profileMenuOpen = false">
    <aside class="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white shadow-sm lg:block">
      <div class="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
        <div class="grid h-10 w-10 place-items-center rounded-lg bg-blue-600 text-sm font-bold text-white">
          IF
        </div>
        <div>
          <p class="font-bold leading-5">{{ t('app.name') }}</p>
          <p class="text-xs text-slate-500">{{ t('app.subtitle') }}</p>
        </div>
      </div>

      <nav class="space-y-1 p-3">
        <RouterLink
          v-for="item in visibleMenuItems"
          :key="item.to"
          :to="item.to"
          class="flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
          :class="{ 'bg-blue-50 text-blue-700 shadow-sm': isMenuItemActive(item) }"
        >
          <span
            class="grid h-6 w-6 place-items-center rounded-md bg-slate-100 text-xs font-bold"
            :class="{ 'bg-blue-100': isMenuItemActive(item) }"
          >
            {{ item.icon }}
          </span>
          <span>{{ t(item.titleKey) }}</span>
        </RouterLink>
      </nav>
    </aside>

    <div class="lg:pl-64">
      <header class="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div class="flex h-16 items-center justify-between px-4 sm:px-6">
          <div class="flex items-center gap-3">
            <div class="grid h-9 w-9 place-items-center rounded-lg bg-blue-600 text-xs font-bold text-white lg:hidden">
              IF
            </div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t('app.name') }}</p>
              <h1 class="text-lg font-bold">{{ pageTitle }}</h1>
            </div>
          </div>

          <div class="relative flex items-center gap-3" @click.stop>
            <button
              type="button"
              class="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-blue-600 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              :title="authStore.userFullName || authStore.user?.username"
              @click="profileMenuOpen = !profileMenuOpen"
            >
              {{ userInitials }}
            </button>

            <div
              v-if="profileMenuOpen"
              class="absolute right-0 top-12 z-50 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl"
            >
                <div class="flex items-center gap-3 border-b border-slate-100 pb-3">
                  <div class="grid h-11 w-11 place-items-center rounded-full bg-blue-600 text-sm font-bold text-white">
                    {{ userInitials }}
                  </div>
                  <div class="min-w-0">
                    <p class="truncate text-sm font-bold text-slate-900">
                      {{ authStore.userFullName || authStore.user?.username }}
                    </p>
                    <p class="truncate text-xs text-slate-500">
                      {{ authStore.roleLabel || t('roles.department') }}
                      <span v-if="authStore.userDepartment"> · {{ authStore.userDepartment }}</span>
                    </p>
                  </div>
                </div>

                <div class="space-y-3 py-3">
                  <div>
                    <p class="mb-1.5 text-xs font-bold uppercase text-slate-500">{{ t('settings.language') }}</p>
                    <div class="grid grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                      <button
                        type="button"
                        class="rounded-md px-3 py-2 text-xl transition hover:bg-white"
                        :class="{ 'bg-white shadow-sm ring-1 ring-blue-100': settingsStore.locale === 'tr' }"
                        :title="t('settings.turkish')"
                        @click="settingsStore.setLocale('tr')"
                      >
                        🇹🇷
                      </button>
                      <button
                        type="button"
                        class="rounded-md px-3 py-2 text-xl transition hover:bg-white"
                        :class="{ 'bg-white shadow-sm ring-1 ring-blue-100': settingsStore.locale === 'en' }"
                        :title="t('settings.english')"
                        @click="settingsStore.setLocale('en')"
                      >
                        🇺🇸
                      </button>
                    </div>
                  </div>

                  <div>
                    <p class="mb-1.5 text-xs font-bold uppercase text-slate-500">{{ t('settings.theme') }}</p>
                    <div class="grid grid-cols-3 gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                      <button
                        v-for="themeOption in themeOptions"
                        :key="themeOption"
                        type="button"
                        class="rounded-md px-2 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-white"
                        :class="{ 'bg-white text-blue-700 shadow-sm': settingsStore.theme === themeOption }"
                        @click="settingsStore.setTheme(themeOption)"
                      >
                        {{ t(`settings.${themeOption}`) }}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  class="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  @click="handleLogout"
                >
                  <v-icon icon="mdi-logout" size="18" />
                  {{ t('auth.logout') }}
                </button>
              </div>
          </div>
        </div>

        <nav class="flex gap-2 overflow-x-auto border-t border-slate-100 px-4 py-2 lg:hidden">
          <RouterLink
            v-for="item in visibleMenuItems"
            :key="item.to"
            :to="item.to"
            class="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold text-slate-600"
            :class="{ 'bg-blue-50 text-blue-700': isMenuItemActive(item) }"
          >
            {{ t(item.titleKey) }}
          </RouterLink>
        </nav>
      </header>

      <main class="mx-auto max-w-7xl px-5 py-5 sm:px-7 sm:py-7">
        <router-view />
      </main>
    </div>
  </div>
</template>
