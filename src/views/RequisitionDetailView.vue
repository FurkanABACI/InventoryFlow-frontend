<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { productService } from "../services/productService";
import { requisitionService } from "../services/requisitionService";
import { useAuthStore } from "../stores/auth";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { locale, t } = useI18n();
const request = ref(null);
const products = ref([]);
const loading = ref(false);
const delivering = ref(false);
const linking = ref(false);
const error = ref("");
const successMessage = ref("");
const successSnackbar = ref(false);
const linkDialog = ref(false);
const selectedItem = ref(null);
const selectedProduct = ref("");
const productSearch = ref("");

const items = computed(() => request.value?.items || []);

const canManageInventory = computed(() => authStore.canManageInventory);

const canDeliverRequest = computed(
  () =>
    canManageInventory.value &&
    request.value?.status !== "fulfilled" &&
    request.value?.status !== "cancelled" &&
    (request.value?.status === "pending" || request.value?.can_fulfill),
);

const selectableProducts = computed(() =>
  products.value.filter((product) => product.is_active !== false),
);

const filteredProducts = computed(() => {
  const searchText = productSearch.value.trim().toLowerCase();

  if (!searchText) {
    return selectableProducts.value.slice(0, 6);
  }

  return selectableProducts.value
    .filter((product) =>
      [
        product.name,
        product.sku,
        product.category_name,
        product.supplier_name,
      ].some((field) =>
        String(field || "")
          .toLowerCase()
          .includes(searchText),
      ),
    )
    .slice(0, 6);
});

const totalQuantity = computed(() =>
  items.value.reduce((total, item) => total + Number(item.quantity || 0), 0),
);

const deliveredQuantity = computed(() =>
  items.value.reduce(
    (total, item) => total + Number(item.delivered_quantity || 0),
    0,
  ),
);

const pendingQuantity = computed(() =>
  Math.max(totalQuantity.value - deliveredQuantity.value, 0),
);

const completionPercent = computed(() => {
  if (!totalQuantity.value) {
    return 0;
  }

  return Math.round((deliveredQuantity.value / totalQuantity.value) * 100);
});

const lowStockItemCount = computed(
  () =>
    items.value.filter(
      (item) =>
        item.has_product_card &&
        Number(item.current_stock || 0) < Number(item.quantity || 0),
    ).length,
);

const uncatalogedItemCount = computed(
  () => items.value.filter((item) => !item.has_product_card).length,
);

const requestDate = computed(() => {
  if (!request.value?.created_at) {
    return "-";
  }

  return new Date(request.value.created_at).toLocaleString(
    locale.value === "tr" ? "tr-TR" : "en-US",
  );
});

const fulfilledDate = computed(() => {
  if (!request.value?.fulfilled_at) {
    return t("pages.requisitions.notFulfilledYet");
  }

  return new Date(request.value.fulfilled_at).toLocaleString(
    locale.value === "tr" ? "tr-TR" : "en-US",
  );
});

function getStatusClass(status) {
  if (status === "fulfilled") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "purchase_needed") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "cancelled") {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }

  return "border-blue-200 bg-blue-50 text-blue-700";
}

function getStatusText(status, fallback) {
  const statusMap = {
    pending: "pages.requisitions.statusPending",
    purchase_needed: "pages.requisitions.statusPurchaseNeeded",
    fulfilled: "pages.requisitions.statusFulfilled",
    cancelled: "pages.requisitions.statusCancelled",
  };

  return statusMap[status] ? t(statusMap[status]) : fallback;
}

function getStockClass(item) {
  if (!item.has_product_card) {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }

  if (Number(item.current_stock || 0) < Number(item.quantity || 0)) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function getErrorMessage(error) {
  const data = error.response?.data;

  if (!data) {
    return t("pages.requisitions.connectionError");
  }

  if (data.detail) {
    return data.detail;
  }

  if (typeof data === "string") {
    return data;
  }

  const firstKey = Object.keys(data)[0];
  const firstValue = data[firstKey];
  const message = Array.isArray(firstValue) ? firstValue[0] : firstValue;

  return `${firstKey}: ${message}`;
}

async function fetchRequest() {
  loading.value = true;
  error.value = "";

  try {
    request.value = await requisitionService.detail(route.params.id);
  } catch {
    error.value = t("pages.requisitions.detailLoadError");
  } finally {
    loading.value = false;
  }
}

async function fetchProducts() {
  try {
    products.value = await productService.all();
  } catch {
    error.value = t("pages.products.loadError");
  }
}

function openLinkDialog(item) {
  selectedItem.value = item;
  selectedProduct.value = "";
  productSearch.value = item.product_name || item.requested_product_name || "";
  linkDialog.value = true;
}

function closeLinkDialog() {
  linkDialog.value = false;
  selectedItem.value = null;
  selectedProduct.value = "";
  productSearch.value = "";
}

function chooseProduct(product) {
  selectedProduct.value = product.id;
  productSearch.value = `${product.name} - ${product.sku}`;
}

async function linkItemProduct() {
  if (!selectedItem.value || !selectedProduct.value) {
    error.value = t("pages.requisitions.selectProductToLink");
    return;
  }

  linking.value = true;
  error.value = "";

  try {
    request.value = await requisitionService.linkItemProduct(
      request.value.id,
      selectedItem.value.id,
      selectedProduct.value,
    );
    successMessage.value = t("pages.requisitions.linkSuccess");
    successSnackbar.value = true;
    closeLinkDialog();
  } catch (error) {
    error.value = getErrorMessage(error);
  } finally {
    linking.value = false;
  }
}

async function fulfillRequest() {
  delivering.value = true;
  error.value = "";

  try {
    request.value = await requisitionService.fulfill(request.value.id);
    successMessage.value = t("pages.requisitions.fulfillSuccess");
    successSnackbar.value = true;
  } catch (error) {
    await fetchRequest();
    error.value = getErrorMessage(error);
  } finally {
    delivering.value = false;
  }
}

onMounted(() => {
  fetchRequest();
  fetchProducts();
});
</script>

<template>
  <section class="space-y-4">
    <div
      class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
    >
      <div class="min-w-0">
        <button
          type="button"
          class="mb-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          @click="router.push({ name: 'requisitions' })"
        >
          <span class="grid h-6 w-6 place-items-center rounded-md bg-slate-100">
            <v-icon icon="mdi-arrow-left" size="18" />
          </span>
          {{ t('common.backToList') }}
        </button>
        <h2 class="text-lg font-bold text-slate-950">{{ t('pages.requisitions.detailTitle') }}</h2>
        <p class="text-sm text-slate-500">
          {{ t('pages.requisitions.detailSubtitle') }}
        </p>
      </div>

      <v-btn
        v-if="canDeliverRequest"
        class="sm:mt-9"
        color="primary"
        prepend-icon="mdi-truck-check-outline"
        variant="flat"
        :loading="delivering"
        @click="fulfillRequest"
      >
        {{ t('pages.requisitions.deliver') }}
      </v-btn>
    </div>

    <v-alert v-if="error" type="error" variant="tonal">
      {{ error }}
    </v-alert>

    <v-progress-linear v-if="loading" color="primary" indeterminate />

    <template v-else-if="request">
      <section class="inventory-card overflow-hidden">
        <div class="border-b border-slate-200 bg-white px-5 py-4">
          <div
            class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"
          >
            <div class="min-w-0">
              <div class="mb-2 flex flex-wrap items-center gap-2">
                <span
                  class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600"
                >
                  {{ t('pages.requisitions.requestNo', { id: request.id }) }}
                </span>
                <span
                  class="inline-flex rounded-full border px-2.5 py-1 text-xs font-bold"
                  :class="getStatusClass(request.status)"
                >
                  {{ getStatusText(request.status, request.status_label) }}
                </span>
              </div>
              <h3 class="text-lg font-bold text-slate-950">
                {{ request.department }}
              </h3>
              <p class="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                {{ t('pages.requisitions.summary', { requester: request.requester_name, items: items.length, quantity: totalQuantity }) }}
              </p>
            </div>

            <div class="grid gap-2 text-sm sm:grid-cols-2 lg:min-w-[340px]">
              <div
                class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5"
              >
                <p class="text-xs font-semibold text-slate-500">
                  {{ t('pages.requisitions.openedAt') }}
                </p>
                <p class="mt-1 font-semibold text-slate-900">
                  {{ requestDate }}
                </p>
              </div>
              <div
                class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5"
              >
                <p class="text-xs font-semibold text-slate-500">
                  {{ t('pages.requisitions.fulfilledAt') }}
                </p>
                <p class="mt-1 font-semibold text-slate-900">
                  {{ fulfilledDate }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div
          class="grid gap-0 divide-y divide-slate-200 md:grid-cols-4 md:divide-x md:divide-y-0"
        >
          <div class="px-5 py-3.5">
            <p class="text-xs font-semibold text-slate-500">{{ t('pages.requisitions.totalQuantity') }}</p>
            <p class="mt-1 text-xl font-bold text-slate-950">
              {{ totalQuantity }}
            </p>
          </div>

          <div class="px-5 py-3.5">
            <p class="text-xs font-semibold text-slate-500">{{ t('pages.requisitions.deliveredQuantity') }}</p>
            <p class="mt-1 text-xl font-bold text-emerald-700">
              {{ deliveredQuantity }}
            </p>
          </div>

          <div class="px-5 py-3.5">
            <p class="text-xs font-semibold text-slate-500">{{ t('pages.requisitions.pendingQuantity') }}</p>
            <p class="mt-1 text-xl font-bold text-slate-950">
              {{ pendingQuantity }}
            </p>
          </div>

          <div class="px-5 py-3.5">
            <p class="text-xs font-semibold text-slate-500">{{ t('pages.requisitions.stockWarning') }}</p>
            <p
              class="mt-1 text-xl font-bold"
              :class="
                lowStockItemCount || uncatalogedItemCount
                  ? 'text-amber-700'
                  : 'text-emerald-700'
              "
            >
              {{ lowStockItemCount + uncatalogedItemCount }}
            </p>
          </div>
        </div>
      </section>

      <section class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <v-card class="inventory-card overflow-hidden" elevation="0">
          <div class="border-b border-slate-200 px-5 py-4">
            <div>
              <h3 class="font-bold text-slate-950">{{ t('pages.requisitions.requestedItems') }}</h3>
              <p class="text-sm text-slate-500">
                {{ t('pages.requisitions.requestedItemsText') }}
              </p>
            </div>
          </div>

          <div class="divide-y divide-slate-100">
            <article
              v-for="item in items"
              :key="item.id"
              class="px-5 py-4 transition hover:bg-slate-50"
            >
              <div
                class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
              >
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <h4 class="font-bold text-slate-950">
                      {{ item.product_name }}
                    </h4>
                    <span
                      class="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600"
                    >
                      {{ item.sku }}
                    </span>
                  </div>
                  <p class="mt-2 text-sm text-slate-500">
                    {{ t('pages.requisitions.itemRequested', { quantity: item.quantity, delivered: item.delivered_quantity }) }}
                    <span v-if="item.requested_product_note">
                      {{ t('pages.requisitions.note') }}: {{ item.requested_product_note }}
                    </span>
                  </p>

                  <button
                    v-if="canManageInventory && !item.has_product_card"
                    type="button"
                    class="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800 transition hover:bg-amber-100"
                    @click="openLinkDialog(item)"
                  >
                    <v-icon icon="mdi-link-variant" size="18" />
                    {{ t('pages.requisitions.linkProduct') }}
                  </button>
                </div>

                <div class="grid grid-cols-3 gap-2 sm:min-w-[320px]">
                  <div
                    class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-right"
                  >
                    <p class="text-xs font-semibold text-slate-500">{{ t('pages.requisitions.requested') }}</p>
                    <p class="mt-1 text-base font-bold text-slate-950">
                      {{ item.quantity }}
                    </p>
                  </div>
                  <div
                    class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-right"
                  >
                    <p class="text-xs font-semibold text-slate-500">{{ t('pages.requisitions.delivered') }}</p>
                    <p class="mt-1 text-base font-bold text-slate-950">
                      {{ item.delivered_quantity }}
                    </p>
                  </div>
                  <div
                    class="rounded-lg border px-3 py-2 text-right"
                    :class="getStockClass(item)"
                  >
                    <p class="text-xs font-semibold">{{ t('pages.requisitions.stock') }}</p>
                    <p class="mt-1 text-base font-bold">
                      {{
                        item.has_product_card
                          ? item.current_stock
                          : t('pages.requisitions.waitingCard')
                      }}
                    </p>
                  </div>
                </div>
              </div>

              <div class="mt-3">
                <div
                  class="mb-2 flex items-center justify-between gap-3 text-xs font-bold"
                >
                  <span class="text-slate-500">{{ t('pages.requisitions.progress') }}</span>
                  <span class="text-slate-700">
                    {{ item.delivered_quantity }} / {{ item.quantity }}
                  </span>
                </div>
                <v-progress-linear
                  color="primary"
                  height="6"
                  rounded
                  :model-value="
                    Number(item.quantity || 0)
                      ? (Number(item.delivered_quantity || 0) /
                          Number(item.quantity || 0)) *
                        100
                      : 0
                  "
                />
              </div>
            </article>
          </div>
        </v-card>

        <aside class="space-y-3">
          <article class="inventory-card p-4">
            <p class="text-xs font-semibold text-slate-500">{{ t('pages.requisitions.overallProgress') }}</p>
            <div class="mt-3 flex items-end justify-between gap-3">
              <p class="text-2xl font-bold text-slate-950">
                %{{ completionPercent }}
              </p>
              <p class="pb-0.5 text-sm font-semibold text-slate-500">
                {{ deliveredQuantity }} / {{ totalQuantity }}
              </p>
            </div>
            <v-progress-linear
              class="mt-3"
              color="primary"
              height="8"
              rounded
              :model-value="completionPercent"
            />
          </article>

          <article class="inventory-card p-4">
            <p class="text-xs font-semibold text-slate-500">
              {{ t('pages.requisitions.stockReview') }}
            </p>
            <p
              class="mt-2 text-base font-bold"
              :class="
                lowStockItemCount || uncatalogedItemCount
                  ? 'text-amber-700'
                  : 'text-emerald-700'
              "
            >
              {{
                uncatalogedItemCount
                  ? t('pages.requisitions.waitingProductCard', { count: uncatalogedItemCount })
                  : lowStockItemCount
                    ? t('pages.requisitions.shortageCount', { count: lowStockItemCount })
                    : t('pages.requisitions.allStockReady')
              }}
            </p>
            <p class="mt-2 text-sm leading-6 text-slate-500">
              {{ t('pages.requisitions.stockReviewText') }}
            </p>
          </article>

          <article class="inventory-card p-4">
            <p class="text-xs font-semibold text-slate-500">{{ t('pages.requisitions.note') }}</p>
            <p class="mt-2 text-sm leading-6 text-slate-700">
              {{ request.note || t('pages.requisitions.noNote') }}
            </p>
          </article>
        </aside>
      </section>
    </template>

    <v-dialog v-model="linkDialog" max-width="720">
      <v-card class="inventory-card overflow-hidden" elevation="0">
        <v-card-title class="px-6 pt-6 text-lg font-bold text-slate-950">
          {{ t('pages.requisitions.linkProduct') }}
        </v-card-title>

        <v-card-subtitle class="px-6 text-slate-500">
          {{ t('pages.requisitions.linkProductText') }}
        </v-card-subtitle>

        <v-card-text class="px-6 pt-5">
          <div
            v-if="selectedItem"
            class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"
          >
            <p class="text-xs font-bold uppercase text-amber-700">
              {{ t('pages.requisitions.requestedProduct') }}
            </p>
            <p class="mt-1 font-bold text-amber-950">
              {{
                selectedItem.product_name || selectedItem.requested_product_name
              }}
            </p>
            <p
              v-if="selectedItem.requested_product_note"
              class="mt-1 text-sm text-amber-800"
            >
              {{ selectedItem.requested_product_note }}
            </p>
          </div>

          <span class="inventory-field-label">{{ t('pages.requisitions.searchProduct') }}</span>
          <v-text-field
            v-model="productSearch"
            class="inventory-field"
            :aria-label="t('pages.requisitions.searchProduct')"
            clearable
            :placeholder="t('pages.requisitions.searchProductPlaceholder')"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="comfortable"
            hide-details
            @click:clear="selectedProduct = ''"
          />

          <div class="mt-3 rounded-lg border border-slate-200 bg-slate-50">
            <button
              v-for="product in filteredProducts"
              :key="product.id"
              type="button"
              class="w-full border-b border-slate-200 px-3 py-3 text-left last:border-b-0 hover:bg-white"
              :class="
                Number(selectedProduct) === Number(product.id)
                  ? 'bg-blue-50'
                  : ''
              "
              @click="chooseProduct(product)"
            >
              <span
                class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"
              >
                <span class="min-w-0">
                  <span
                    class="block text-sm font-bold leading-5 text-slate-900"
                  >
                    {{ product.name }}
                  </span>
                  <span class="mt-1 flex flex-wrap gap-1.5">
                    <span
                      class="rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-slate-600"
                    >
                      SKU: {{ product.sku }}
                    </span>
                    <span
                      class="rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-slate-600"
                    >
                      {{ product.category_name || t("common.noCategory") }}
                    </span>
                    <span
                      class="rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-slate-600"
                    >
                      {{ product.supplier_name || t("common.noSupplier") }}
                    </span>
                  </span>
                </span>
                <span
                  class="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700"
                >
                  {{ t("common.stockLabel", { stock: product.stock }) }}
                </span>
              </span>
            </button>

            <div
              v-if="filteredProducts.length === 0"
              class="px-3 py-4 text-sm font-semibold text-slate-500"
            >
              {{ t('pages.requisitions.noSearchResult') }}
            </div>
          </div>
        </v-card-text>

        <v-card-actions class="gap-2 border-t border-slate-200 px-6 py-4">
          <v-btn variant="text" @click="closeLinkDialog">{{ t('common.cancel') }}</v-btn>
          <v-spacer />
          <v-btn
            color="primary"
            variant="flat"
            :disabled="!selectedProduct"
            :loading="linking"
            @click="linkItemProduct"
          >
            {{ t('pages.requisitions.bind') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="successSnackbar" color="success" timeout="3000">
      {{ successMessage }}
    </v-snackbar>
  </section>
</template>
