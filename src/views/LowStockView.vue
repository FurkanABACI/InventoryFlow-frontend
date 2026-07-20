<script setup>
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useProductsStore } from '../stores/products'

const productsStore = useProductsStore()
const { products, loading, error } = storeToRefs(productsStore)
const { t } = useI18n()

onMounted(() => {
  productsStore.fetchLowStock()
})
</script>

<template>
  <section class="space-y-4">
    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
    >
      {{ error }}
    </v-alert>

    <v-card class="inventory-card overflow-hidden" elevation="0">
      <div class="border-b border-slate-200 px-6 py-5">
        <h2 class="font-bold text-slate-950">{{ t('pages.lowStock.title') }}</h2>
        <p class="text-sm text-slate-500">{{ t('pages.lowStock.subtitle') }}</p>
      </div>

      <v-progress-linear v-if="loading" indeterminate color="primary" />

      <div v-else-if="products.length === 0" class="inventory-empty-state">
        <div>
          <div class="inventory-empty-state__icon">✓</div>
          <p class="inventory-empty-state__title">{{ t('pages.lowStock.emptyTitle') }}</p>
          <p class="inventory-empty-state__text">
            {{ t('pages.lowStock.emptyText') }}
          </p>
        </div>
      </div>

      <ul v-else class="divide-y divide-slate-100">
        <li
          v-for="product in products"
          :key="product.id"
          class="flex items-center justify-between gap-4 px-6 py-5 transition hover:bg-slate-50"
        >
          <div>
            <p class="font-semibold text-slate-950">{{ product.name }}</p>
            <p class="text-sm text-slate-500">{{ t("pages.products.productCode") }}: {{ product.sku || t("pages.products.noProductCode") }}</p>
          </div>

          <v-chip color="warning" variant="tonal">
            {{ product.stock }} {{ t('pages.lowStock.stockSuffix') }}
          </v-chip>
        </li>
      </ul>
    </v-card>
  </section>
</template>
