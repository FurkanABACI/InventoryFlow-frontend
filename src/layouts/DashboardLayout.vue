<script setup>
import { computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const menuItems = [
  { title: 'Panel', icon: 'P', to: '/' },
  { title: 'Ürünler', icon: 'Ü', to: '/products' },
  { title: 'Tedarikçiler', icon: 'T', to: '/suppliers' },
  { title: 'Mal kabul', icon: 'M', to: '/receiving' },
  { title: 'Talepler', icon: 'İ', to: '/requisitions' },
  { title: 'Hareketler', icon: 'H', to: '/stock-movements' },
  { title: 'Düşük stok', icon: 'S', to: '/low-stock' },
]

const pageTitle = computed(() => {
  if (route.meta.title) {
    return route.meta.title
  }

  const activeItem = menuItems.find((item) => item.to === route.path || route.path.startsWith(`${item.to}/`))
  return activeItem?.title || 'InventoryFlow'
})

function isMenuItemActive(item) {
  return route.path === item.to || route.path.startsWith(`${item.to}/`)
}

async function handleLogout() {
  await authStore.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="min-h-screen bg-slate-100 text-slate-900">
    <aside class="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white shadow-sm lg:block">
      <div class="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
        <div class="grid h-10 w-10 place-items-center rounded-lg bg-blue-600 text-sm font-bold text-white">
          IF
        </div>
        <div>
          <p class="font-bold leading-5">InventoryFlow</p>
          <p class="text-xs text-slate-500">Stok yönetimi</p>
        </div>
      </div>

      <nav class="space-y-1 p-3">
        <RouterLink
          v-for="item in menuItems"
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
          <span>{{ item.title }}</span>
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
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">InventoryFlow</p>
              <h1 class="text-lg font-bold">{{ pageTitle }}</h1>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <span class="hidden text-sm text-slate-600 sm:inline">{{ authStore.userFullName }}</span>
            <button
              type="button"
              class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              @click="handleLogout"
            >
              Çıkış
            </button>
          </div>
        </div>

        <nav class="flex gap-2 overflow-x-auto border-t border-slate-100 px-4 py-2 lg:hidden">
          <RouterLink
            v-for="item in menuItems"
            :key="item.to"
            :to="item.to"
            class="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold text-slate-600"
            :class="{ 'bg-blue-50 text-blue-700': isMenuItemActive(item) }"
          >
            {{ item.title }}
          </RouterLink>
        </nav>
      </header>

      <main class="mx-auto max-w-7xl px-5 py-5 sm:px-7 sm:py-7">
        <router-view />
      </main>
    </div>
  </div>
</template>
