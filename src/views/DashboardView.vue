<script setup>
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useProductsStore } from '../stores/products'
import { receivingService } from '../services/receivingService'
import { requisitionService } from '../services/requisitionService'
import { stockService } from '../services/stockService'

const productsStore = useProductsStore()
const { products, count, loading, totalStock } = storeToRefs(productsStore)
const { locale, t } = useI18n()
const receipts = ref([])
const requests = ref([])
const movements = ref([])
const dashboardLoading = ref(false)

const lowStockCount = computed(() =>
  products.value.filter(
    (product) => Number(product.stock || 0) <= Number(product.low_stock_threshold || 0),
  ).length,
)

const pendingRequestCount = computed(() =>
  requests.value.filter((request) => request.status === 'pending').length,
)

const purchaseNeededCount = computed(() =>
  requests.value.filter((request) => request.status === 'purchase_needed').length,
)

const recentProducts = computed(() =>
  [...products.value]
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 5),
)

const recentReceipts = computed(() =>
  [...receipts.value]
    .sort((a, b) => new Date(b.received_at || b.created_at || 0) - new Date(a.received_at || a.created_at || 0))
    .slice(0, 4),
)

const recentMovements = computed(() =>
  [...movements.value]
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 5),
)

function formatDate(value) {
  if (!value) {
    return '-'
  }

  return new Date(value).toLocaleDateString(locale.value === 'tr' ? 'tr-TR' : 'en-US')
}

async function fetchDashboardData() {
  dashboardLoading.value = true

  try {
    const [receiptData, requestData, movementData] = await Promise.all([
      receivingService.list(),
      requisitionService.list(),
      stockService.movements(),
    ])

    receipts.value = receiptData.results || receiptData
    requests.value = requestData.results || requestData
    movements.value = movementData.results || movementData
  } finally {
    dashboardLoading.value = false
  }
}

onMounted(() => {
  productsStore.fetchProducts()
  fetchDashboardData()
})
</script>

<template>
  <section class="space-y-6">
    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      <RouterLink :to="{ name: 'products' }" class="inventory-card inventory-stat-card p-6">
        <p class="text-sm font-medium text-slate-500">{{ t('pages.dashboard.totalProducts') }}</p>
        <div class="inventory-stat-row mt-3">
          <p class="text-3xl font-bold text-slate-950">{{ count }}</p>
          <span class="inventory-stat-badge rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
            {{ t('common.activeList') }}
          </span>
        </div>
      </RouterLink>

      <RouterLink :to="{ name: 'products' }" class="inventory-card inventory-stat-card p-6">
        <p class="text-sm font-medium text-slate-500">{{ t('pages.dashboard.totalStock') }}</p>
        <div class="inventory-stat-row mt-3">
          <p class="text-3xl font-bold text-slate-950">{{ totalStock }}</p>
          <span class="inventory-stat-badge rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            {{ t('common.warehouse') }}
          </span>
        </div>
      </RouterLink>

      <RouterLink :to="{ name: 'low-stock' }" class="inventory-card inventory-stat-card p-6">
        <p class="text-sm font-medium text-slate-500">{{ t('pages.dashboard.lowStock') }}</p>
        <div class="inventory-stat-row mt-3">
          <p class="text-3xl font-bold text-slate-950">{{ lowStockCount }}</p>
          <span class="inventory-stat-badge rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
            {{ loading ? t('common.checking') : t('common.tracking') }}
          </span>
        </div>
      </RouterLink>

      <RouterLink :to="{ name: 'requisitions' }" class="inventory-card inventory-stat-card p-6">
        <p class="text-sm font-medium text-slate-500">{{ t('pages.dashboard.pendingRequests') }}</p>
        <div class="inventory-stat-row mt-3">
          <p class="text-3xl font-bold text-slate-950">{{ pendingRequestCount }}</p>
          <span class="inventory-stat-badge rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
            {{ t('common.delivery') }}
          </span>
        </div>
      </RouterLink>

      <RouterLink :to="{ name: 'requisitions' }" class="inventory-card inventory-stat-card p-6">
        <p class="text-sm font-medium text-slate-500">{{ t('pages.dashboard.purchaseNeeded') }}</p>
        <div class="inventory-stat-row mt-3">
          <p class="text-3xl font-bold text-slate-950">{{ purchaseNeededCount }}</p>
          <span class="inventory-stat-badge rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
            {{ t('common.procurement') }}
          </span>
        </div>
      </RouterLink>

      <RouterLink :to="{ name: 'receiving' }" class="inventory-card inventory-stat-card p-6">
        <p class="text-sm font-medium text-slate-500">{{ t('pages.dashboard.receiving') }}</p>
        <div class="inventory-stat-row mt-3">
          <p class="text-3xl font-bold text-slate-950">{{ receipts.length }}</p>
          <span class="inventory-stat-badge rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
            {{ t('common.inbound') }}
          </span>
        </div>
      </RouterLink>
    </div>

    <div class="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
      <article class="inventory-card overflow-hidden">
        <div class="border-b border-slate-200 px-6 py-5">
          <h2 class="font-bold text-slate-950">{{ t('pages.dashboard.recentMovements') }}</h2>
          <p class="mt-1 text-sm text-slate-500">{{ t('pages.dashboard.recentMovementsText') }}</p>
        </div>

        <div v-if="dashboardLoading" class="px-6 py-8 text-sm text-slate-500">
          {{ t('common.loadingMovements') }}
        </div>

        <div v-else-if="recentMovements.length === 0" class="px-6 py-8 text-sm text-slate-500">
          {{ t('common.noMovements') }}
        </div>

        <div v-else class="divide-y divide-slate-100">
          <div
            v-for="movement in recentMovements"
            :key="movement.id"
            class="flex items-center justify-between gap-4 px-6 py-4 transition hover:bg-slate-50"
          >
            <div>
              <p class="font-semibold text-slate-950">{{ movement.product_name }}</p>
              <p class="text-sm text-slate-500">{{ movement.sku }} · {{ formatDate(movement.created_at) }}</p>
            </div>
            <span
              class="rounded-full px-3 py-1 text-xs font-bold"
              :class="movement.movement_type === 'in' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'"
            >
              {{ movement.movement_type === 'in' ? '+' : '-' }}{{ movement.quantity }}
            </span>
          </div>
        </div>
      </article>

      <article class="inventory-card overflow-hidden">
        <div class="border-b border-slate-200 px-6 py-5">
          <h2 class="font-bold text-slate-950">{{ t('pages.dashboard.recentReceipts') }}</h2>
          <p class="mt-1 text-sm text-slate-500">{{ t('pages.dashboard.recentReceiptsText') }}</p>
        </div>

        <div v-if="dashboardLoading" class="px-6 py-8 text-sm text-slate-500">
          {{ t('common.loadingReceipts') }}
        </div>

        <div v-else-if="recentReceipts.length === 0" class="px-6 py-8 text-sm text-slate-500">
          {{ t('common.noReceipts') }}
        </div>

        <div v-else class="divide-y divide-slate-100">
          <div
            v-for="receipt in recentReceipts"
            :key="receipt.id"
            class="px-6 py-4 transition hover:bg-slate-50"
          >
            <p class="font-semibold text-slate-950">{{ receipt.supplier_name }}</p>
            <p class="mt-1 text-sm text-slate-500">
              {{ receipt.document_no || t('common.noDocument') }} · {{ formatDate(receipt.received_at) }}
            </p>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
