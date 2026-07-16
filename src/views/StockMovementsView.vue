<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { stockService } from "../services/stockService";

const { t } = useI18n();
const movements = ref([]);
const loading = ref(false);
const error = ref("");
const itemsPerPage = ref(10);
const movementPage = ref(1);

const movementHeaders = computed(() => [
  { title: t("pages.stockMovements.product"), key: "product_name" },
  { title: "SKU", key: "sku" },
  { title: t("pages.stockMovements.type"), key: "movement_type" },
  { title: t("pages.stockMovements.quantity"), key: "quantity" },
  { title: t("pages.stockMovements.source"), key: "source" },
  { title: t("pages.stockMovements.date"), key: "createdDate" },
]);

const itemsPerPageOptions = computed(() => [
  { title: t("common.records10"), value: 10 },
  { title: t("common.records25"), value: 25 },
  { title: t("common.records50"), value: 50 },
  { title: t("common.allRecords"), value: -1 },
]);

const tableMovements = computed(() =>
  movements.value
    .map((movement) => ({
      ...movement,
      source: getSourceText(movement),
      createdDate: movement.created_at
        ? new Date(movement.created_at).toLocaleString("tr-TR")
        : "-",
    }))
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)),
);

const movementPageCount = computed(() => {
  if (itemsPerPage.value === -1) {
    return 1;
  }

  return Math.max(1, Math.ceil(tableMovements.value.length / itemsPerPage.value));
});

const movementPaginationText = computed(() => {
  const total = tableMovements.value.length;

  if (total === 0) {
    return t("common.noRecordsToShow");
  }

  if (itemsPerPage.value === -1) {
    return t("common.allRecordsShown", { total });
  }

  const start = (movementPage.value - 1) * itemsPerPage.value + 1;
  const end = Math.min(movementPage.value * itemsPerPage.value, total);

  return t("common.recordsRangeShown", { total, start, end });
});

function getTableItem(item) {
  return item?.raw || item;
}

function getSourceText(movement) {
  if (movement.source_type === "goods_receipt") {
    return t("common.sourceGoodsReceipt", { id: movement.source_id });
  }

  if (movement.source_type === "stock_request") {
    return t("common.sourceStockRequest", { id: movement.source_id });
  }

  return movement.source_type || "-";
}

function getMovementBadgeClass(type) {
  if (type === "in") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-rose-200 bg-rose-50 text-rose-700";
}

async function fetchMovements() {
  loading.value = true;
  error.value = "";

  try {
    const data = await stockService.movements();
    movements.value = data.results || data;
  } catch {
    error.value = t("pages.stockMovements.loading");
  } finally {
    loading.value = false;
  }
}

watch(itemsPerPage, () => {
  movementPage.value = 1;
});

watch(movementPageCount, (pageCount) => {
  if (movementPage.value > pageCount) {
    movementPage.value = pageCount;
  }
});

onMounted(() => {
  fetchMovements();
});
</script>

<template>
  <section class="space-y-4">
    <v-alert v-if="error" type="error" variant="tonal">
      {{ error }}
    </v-alert>

    <v-card class="inventory-card overflow-hidden" elevation="0">
      <div class="inventory-section-header flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="font-bold text-slate-950">{{ t('pages.stockMovements.title') }}</h2>
          <p class="text-sm text-slate-500">
            {{ t('pages.stockMovements.subtitle') }}
          </p>
        </div>
      </div>

      <v-divider />

      <div class="flex justify-end px-6 py-5">
        <label class="inventory-native-field w-full sm:w-[210px]">
          <span class="inventory-native-label">{{ t("common.recordsToShow") }}</span>
          <select v-model.number="itemsPerPage" class="inventory-native-select">
            <option
              v-for="option in itemsPerPageOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.title }}
            </option>
          </select>
        </label>
      </div>

      <v-divider />

      <v-data-table
        class="inventory-products-table"
        :headers="movementHeaders"
        :items="tableMovements"
        :items-per-page="itemsPerPage"
        :loading="loading"
        :page="movementPage"
        hide-default-footer
        item-value="id"
        :loading-text="t('pages.stockMovements.loading')"
        :no-data-text="t('pages.stockMovements.noData')"
      >
        <template #item.movement_type="{ item }">
          <span
            class="inline-flex min-w-[86px] justify-center rounded-full border px-3 py-1.5 text-xs font-bold"
            :class="getMovementBadgeClass(getTableItem(item).movement_type)"
          >
            {{ getTableItem(item).movement_type_label }}
          </span>
        </template>

        <template #item.quantity="{ item }">
          <span class="font-bold text-slate-900">
            {{ getTableItem(item).movement_type === "out" ? "-" : "+" }}{{ getTableItem(item).quantity }}
          </span>
        </template>

        <template #no-data>
          <div class="inventory-empty-state">
            <div>
              <div class="inventory-empty-state__icon">H</div>
              <p class="inventory-empty-state__title">{{ t('pages.stockMovements.emptyTitle') }}</p>
              <p class="inventory-empty-state__text">
                {{ t('pages.stockMovements.emptyText') }}
              </p>
            </div>
          </div>
        </template>

        <template #bottom>
          <div
            v-if="tableMovements.length"
            class="flex flex-col gap-3 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <p class="text-sm text-slate-500">
              {{ movementPaginationText }}
            </p>

            <v-pagination
              v-if="movementPageCount > 1"
              v-model="movementPage"
              :length="movementPageCount"
              :total-visible="5"
              density="comfortable"
              rounded="circle"
            />
          </div>
        </template>
      </v-data-table>
    </v-card>
  </section>
</template>
