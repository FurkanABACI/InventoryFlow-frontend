<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { productService } from "../services/productService";
import { requisitionService } from "../services/requisitionService";
import { useAuthStore } from "../stores/auth";

const authStore = useAuthStore();
const router = useRouter();
const { t } = useI18n();
const requests = ref([]);
const products = ref([]);
const loading = ref(false);
const creating = ref(false);
const delivering = ref(false);
const requestDialog = ref(false);
const requestFormRef = ref(null);
const error = ref("");
const formError = ref("");
const successMessage = ref("");
const successSnackbar = ref(false);
const triedSubmit = ref(false);
const itemsPerPage = ref(10);
const requestPage = ref(1);
const requestStep = ref(1);

const requestForm = reactive({
  department: "",
  requester_name: "",
  note: "",
  request_items: [
    {
      item_type: "existing",
      product: "",
      product_search: "",
      requested_product_name: "",
      requested_product_note: "",
      quantity: 1,
    },
  ],
});

const requestHeaders = computed(() => [
  { title: t("pages.requisitions.department"), key: "department" },
  { title: t("pages.requisitions.requester"), key: "requester_name" },
  { title: t("pages.requisitions.items"), key: "itemsPreview" },
  { title: t("pages.requisitions.itemCount"), key: "itemsCount" },
  { title: t("pages.requisitions.totalQuantity"), key: "total_quantity" },
  { title: t("pages.requisitions.status"), key: "status" },
  { title: t("pages.requisitions.date"), key: "createdDate" },
  { title: t("pages.products.actions"), key: "actions", sortable: false, align: "end" },
]);

const itemsPerPageOptions = computed(() => [
  { title: t("common.records10"), value: 10 },
  { title: t("common.records25"), value: 25 },
  { title: t("common.records50"), value: 50 },
  { title: t("common.allRecords"), value: -1 },
]);

const rules = {
  required: (value) =>
    Boolean(String(value ?? "").trim()) || t("validation.required"),
  positiveQuantity: (value) =>
    Number(value) > 0 || t("validation.positiveQuantity"),
  wholeNumber: (value) =>
    Number.isInteger(Number(value)) || t("validation.wholeQuantity"),
};

const selectableProducts = computed(() =>
  products.value.filter((product) => product.is_active !== false),
);

const isDepartmentUser = computed(
  () => authStore.userRole === "department" && !authStore.canManageInventory,
);

const tableRequests = computed(() =>
  requests.value
    .map((request) => ({
      ...request,
      itemsCount: request.items?.length || 0,
      itemsPreview: (request.items || [])
        .map((item) => item.product_name || item.requested_product_name)
        .slice(0, 2)
        .join(", "),
      createdDate: request.created_at
        ? new Date(request.created_at).toLocaleDateString("tr-TR")
        : "-",
    }))
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)),
);

const requestPageCount = computed(() => {
  if (itemsPerPage.value === -1) {
    return 1;
  }

  return Math.max(
    1,
    Math.ceil(tableRequests.value.length / itemsPerPage.value),
  );
});

const requestPaginationText = computed(() => {
  const total = tableRequests.value.length;

  if (total === 0) {
    return t("common.noRecordsToShow");
  }

  if (itemsPerPage.value === -1) {
    return t("common.allRecordsShown", { total });
  }

  const start = (requestPage.value - 1) * itemsPerPage.value + 1;
  const end = Math.min(requestPage.value * itemsPerPage.value, total);

  return t("common.recordsRangeShown", { total, start, end });
});

function getTableItem(item) {
  return item?.raw || item;
}

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

function openRequestDetail(item) {
  const request = getTableItem(item);
  router.push({ name: "requisition-detail", params: { id: request.id } });
}

function resetRequestForm() {
  requestForm.department = isDepartmentUser.value
    ? authStore.userDepartment
    : "";
  requestForm.requester_name = "";
  requestForm.note = "";
  requestForm.request_items = [
    {
      item_type: "existing",
      product: "",
      product_search: "",
      requested_product_name: "",
      requested_product_note: "",
      quantity: 1,
    },
  ];
  formError.value = "";
  triedSubmit.value = false;
  requestStep.value = 1;
  requestFormRef.value?.resetValidation();
}

function openRequestDialog() {
  resetRequestForm();
  requestDialog.value = true;
}

function closeRequestDialog() {
  requestDialog.value = false;
  resetRequestForm();
}

function addRequestItem() {
  requestForm.request_items.push({
    item_type: "existing",
    product: "",
    product_search: "",
    requested_product_name: "",
    requested_product_note: "",
    quantity: 1,
  });
}

function removeRequestItem(index) {
  if (requestForm.request_items.length === 1) {
    return;
  }

  requestForm.request_items.splice(index, 1);
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

function hasValidRequestItems() {
  return requestForm.request_items.every(
    (item) =>
      (item.item_type === "existing"
        ? item.product
        : String(item.requested_product_name ?? "").trim()) &&
      Number(item.quantity) > 0 &&
      Number.isInteger(Number(item.quantity)),
  );
}

function setRequestItemType(item, type) {
  item.item_type = type;

  if (type === "existing") {
    item.requested_product_name = "";
    item.requested_product_note = "";
    return;
  }

  item.product = "";
  item.product_search = "";
}

function getProductTitle(product) {
  if (!product) {
    return "";
  }

  return `${product.name} - ${product.sku}`;
}

function getSelectedProduct(item) {
  return selectableProducts.value.find(
    (product) => Number(product.id) === Number(item.product),
  );
}

function getFilteredProducts(item) {
  const searchText = String(item.product_search || "").trim().toLowerCase();

  if (!searchText) {
    return selectableProducts.value.slice(0, 4);
  }

  return selectableProducts.value
    .filter((product) =>
      [
        product.name,
        product.sku,
        product.category_name,
        product.supplier_name,
        getProductTitle(product),
      ].some((field) => String(field || "").toLowerCase().includes(searchText)),
    )
    .slice(0, 4);
}

function goToRequestItems() {
  formError.value = "";

  if (!String(requestForm.department ?? "").trim()) {
    formError.value = t("pages.requisitions.departmentRequired");
    return;
  }

  if (!String(requestForm.requester_name ?? "").trim()) {
    formError.value = t("pages.requisitions.requesterRequired");
    return;
  }

  requestStep.value = 2;
}

function goToRequestInfo() {
  formError.value = "";
  requestStep.value = 1;
}

function selectProduct(item, product) {
  item.product = product.id;
  item.product_search = getProductTitle(product);
}

function clearSelectedProduct(item) {
  item.product = "";
  item.product_search = "";
}

async function fetchPageData() {
  loading.value = true;
  error.value = "";

  try {
    const [requestData, productData] = await Promise.all([
      requisitionService.list(),
      productService.all(),
    ]);

    requests.value = requestData.results || requestData;
    products.value = productData;
  } catch {
    error.value = t("pages.requisitions.loading");
  } finally {
    loading.value = false;
  }
}

async function submitRequest() {
  formError.value = "";
  triedSubmit.value = true;
  const result = await requestFormRef.value?.validate();

  if (!result?.valid || !hasValidRequestItems()) {
    formError.value = t("pages.requisitions.formValidationError");
    return;
  }

  creating.value = true;

  try {
    await requisitionService.create({
      department: requestForm.department.trim(),
      requester_name: requestForm.requester_name.trim(),
      note: requestForm.note.trim(),
      request_items: requestForm.request_items.map((item) => {
        if (item.item_type === "existing") {
          return {
            product: Number(item.product),
            quantity: Number(item.quantity),
          };
        }

        return {
          product: null,
          requested_product_name: item.requested_product_name.trim(),
          requested_product_note: item.requested_product_note.trim(),
          quantity: Number(item.quantity),
        };
      }),
    });
    await fetchPageData();
    successMessage.value = t("pages.requisitions.createSuccess");
    successSnackbar.value = true;
    closeRequestDialog();
  } catch (error) {
    formError.value = getErrorMessage(error);
  } finally {
    creating.value = false;
  }
}

async function fulfillRequest(item) {
  const request = getTableItem(item);
  delivering.value = true;
  error.value = "";

  try {
    await requisitionService.fulfill(request.id);
    await fetchPageData();
    successMessage.value = t("pages.requisitions.fulfillSuccess");
    successSnackbar.value = true;
  } catch (error) {
    await fetchPageData();
    error.value = getErrorMessage(error);
  } finally {
    delivering.value = false;
  }
}

watch(itemsPerPage, () => {
  requestPage.value = 1;
});

watch(requestPageCount, (pageCount) => {
  if (requestPage.value > pageCount) {
    requestPage.value = pageCount;
  }
});

onMounted(() => {
  fetchPageData();
});
</script>

<template>
  <section class="space-y-4">
    <v-alert v-if="error" type="error" variant="tonal">
      {{ error }}
    </v-alert>

    <v-card class="inventory-card overflow-hidden" elevation="0">
      <div
        class="inventory-section-header flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2 class="font-bold text-slate-950">{{ t('pages.requisitions.title') }}</h2>
          <p class="text-sm text-slate-500">
            {{ t('pages.requisitions.subtitle') }}
          </p>
        </div>

        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          variant="flat"
          @click="openRequestDialog"
        >
          {{ t('pages.requisitions.newRequest') }}
        </v-btn>
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
        :headers="requestHeaders"
        :items="tableRequests"
        :items-per-page="itemsPerPage"
        :loading="loading"
        :page="requestPage"
        hide-default-footer
        item-value="id"
        :loading-text="t('pages.requisitions.loading')"
        :no-data-text="t('pages.requisitions.noData')"
      >
        <template #item.status="{ item }">
          <span
            class="inline-flex min-w-[118px] justify-center rounded-full border px-3 py-1.5 text-xs font-bold"
            :class="getStatusClass(getTableItem(item).status)"
          >
            {{ getStatusText(getTableItem(item).status, getTableItem(item).status_label) }}
          </span>
        </template>

        <template #item.itemsPreview="{ item }">
          <span class="text-sm font-medium text-slate-700">
            {{ getTableItem(item).itemsPreview || t('pages.requisitions.noProductInfo') }}
          </span>
        </template>

        <template #item.actions="{ item }">
          <div class="flex justify-end gap-1">
            <v-btn
              :aria-label="t('pages.requisitions.detail')"
              class="inventory-row-action"
              icon="mdi-eye-outline"
              size="small"
              :title="t('pages.requisitions.detail')"
              variant="text"
              @click="openRequestDetail(item)"
            />
            <v-btn
              v-if="authStore.canManageInventory && (getTableItem(item).status === 'pending' || getTableItem(item).can_fulfill)"
              :aria-label="t('pages.requisitions.deliver')"
              class="inventory-row-action"
              icon="mdi-truck-check-outline"
              size="small"
              :title="t('pages.requisitions.deliver')"
              variant="text"
              :loading="delivering"
              @click="fulfillRequest(item)"
            />
          </div>
        </template>

        <template #no-data>
          <div class="inventory-empty-state">
            <div>
              <div class="inventory-empty-state__icon">T</div>
              <p class="inventory-empty-state__title">{{ t("pages.requisitions.emptyTitle") }}</p>
              <p class="inventory-empty-state__text">
                {{ t("pages.requisitions.emptyText") }}
              </p>
              <v-btn
                class="mt-4"
                color="primary"
                prepend-icon="mdi-plus"
                variant="flat"
                @click="openRequestDialog"
              >
                {{ t("pages.requisitions.createFirst") }}
              </v-btn>
            </div>
          </div>
        </template>

        <template #bottom>
          <div
            v-if="tableRequests.length"
            class="flex flex-col gap-3 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <p class="text-sm text-slate-500">
              {{ requestPaginationText }}
            </p>

            <v-pagination
              v-if="requestPageCount > 1"
              v-model="requestPage"
              :length="requestPageCount"
              :total-visible="5"
              density="comfortable"
              rounded="circle"
            />
          </div>
        </template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="requestDialog" max-width="920">
      <v-card
        class="inventory-card flex max-h-[86vh] flex-col overflow-hidden"
        elevation="0"
      >
        <v-card-title class="shrink-0 px-6 pt-6 text-lg font-bold text-slate-950">
          {{ t("pages.requisitions.formTitle") }}
        </v-card-title>

        <v-card-subtitle class="shrink-0 px-6 text-slate-500">
          {{ t("pages.requisitions.formSubtitle") }}
        </v-card-subtitle>

        <v-card-text class="min-h-0 flex-1 overflow-y-auto px-6 pt-5">
          <v-alert v-if="formError" class="mb-4" type="error" variant="tonal">
            {{ formError }}
          </v-alert>

          <div class="mb-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              class="rounded-lg border px-4 py-3 text-left transition"
              :class="requestStep === 1 ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white text-slate-600'"
              @click="goToRequestInfo"
            >
              <span class="block text-xs font-bold uppercase">{{ t("common.step", { number: 1 }) }}</span>
              <span class="mt-1 block text-sm font-bold">{{ t("pages.requisitions.requestInfo") }}</span>
            </button>
            <button
              type="button"
              class="rounded-lg border px-4 py-3 text-left transition"
              :class="requestStep === 2 ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white text-slate-600'"
              @click="goToRequestItems"
            >
              <span class="block text-xs font-bold uppercase">{{ t("common.step", { number: 2 }) }}</span>
              <span class="mt-1 block text-sm font-bold">{{ t("pages.requisitions.itemLines") }}</span>
            </button>
          </div>

          <v-form ref="requestFormRef" @submit.prevent="submitRequest">
            <div
              v-if="requestStep === 1"
              class="grid gap-x-5 gap-y-5 sm:grid-cols-2"
            >
              <div>
                <span class="inventory-field-label">{{ t("pages.requisitions.department") }}</span>
                <v-text-field
                  v-model="requestForm.department"
                  class="inventory-field"
                  :aria-label="t('pages.requisitions.department')"
                  :placeholder="t('pages.requisitions.departmentPlaceholder')"
                  :hint="t('pages.requisitions.departmentHint')"
                  persistent-hint
                  variant="outlined"
                  density="comfortable"
                  :disabled="isDepartmentUser && Boolean(authStore.userDepartment)"
                  :rules="[rules.required]"
                />
              </div>

              <div>
                <span class="inventory-field-label">{{ t("pages.requisitions.requester") }}</span>
                <v-text-field
                  v-model="requestForm.requester_name"
                  class="inventory-field"
                  :aria-label="t('pages.requisitions.requester')"
                  :placeholder="t('pages.requisitions.requesterPlaceholder')"
                  :hint="t('pages.requisitions.requesterHint')"
                  persistent-hint
                  variant="outlined"
                  density="comfortable"
                  :rules="[rules.required]"
                />
              </div>

              <label class="inventory-native-field sm:col-span-2">
                <span class="inventory-native-label">{{ t("common.note") }}</span>
                <textarea
                  v-model="requestForm.note"
                  class="inventory-native-textarea"
                  :placeholder="t('pages.requisitions.notePlaceholder')"
                />
              </label>
            </div>

            <div v-if="requestStep === 2" class="space-y-3">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <h3 class="font-bold text-slate-950">{{ t("pages.requisitions.requestedItemsTitle") }}</h3>
                  <p class="text-sm text-slate-500">
                    {{ t("pages.requisitions.requestedItemsSubtitle") }}
                  </p>
                </div>

                <v-btn
                  color="primary"
                  prepend-icon="mdi-plus"
                  variant="tonal"
                  @click="addRequestItem"
                >
                  {{ t("pages.requisitions.addLine") }}
                </v-btn>
              </div>

              <div
                v-for="(item, index) in requestForm.request_items"
                :key="index"
                class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p class="mb-2 text-xs font-bold uppercase text-slate-500">
                      {{ t("pages.requisitions.itemType") }}
                    </p>
                    <div class="inline-flex w-full rounded-lg border border-slate-200 bg-slate-50 p-1 sm:w-auto">
                    <button
                      type="button"
                      class="flex-1 rounded-md px-3 py-1.5 text-sm font-bold transition sm:flex-none"
                      :class="item.item_type === 'existing' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-950'"
                      @click="setRequestItemType(item, 'existing')"
                    >
                      {{ t("pages.requisitions.existingProduct") }}
                    </button>
                    <button
                      type="button"
                      class="flex-1 rounded-md px-3 py-1.5 text-sm font-bold transition sm:flex-none"
                      :class="item.item_type === 'custom' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-950'"
                      @click="setRequestItemType(item, 'custom')"
                    >
                      {{ t("pages.requisitions.customProduct") }}
                    </button>
                    </div>
                  </div>

                  <v-btn
                    :disabled="requestForm.request_items.length === 1"
                    class="self-start sm:self-auto"
                    color="error"
                    size="small"
                    variant="text"
                    @click="removeRequestItem(index)"
                  >
                    {{ t("common.delete") }}
                  </v-btn>
                </div>

                <div class="space-y-4">
                  <div v-if="item.item_type === 'existing'" class="space-y-3">
                    <div
                      v-if="getSelectedProduct(item)"
                      class="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3"
                    >
                      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div class="min-w-0">
                          <p class="text-base font-bold leading-6 text-blue-950">
                            {{ getSelectedProduct(item).name }}
                          </p>
                          <div class="mt-2 flex flex-wrap gap-2">
                            <span class="rounded-md bg-white px-2.5 py-1 text-xs font-bold text-blue-700">
                              SKU: {{ getSelectedProduct(item).sku }}
                            </span>
                            <span class="rounded-md bg-white px-2.5 py-1 text-xs font-bold text-blue-700">
                              {{ t("common.stockLabel", { stock: getSelectedProduct(item).stock }) }}
                            </span>
                            <span class="rounded-md bg-white px-2.5 py-1 text-xs font-bold text-blue-700">
                              {{ getSelectedProduct(item).category_name || t("common.noCategory") }}
                            </span>
                            <span class="rounded-md bg-white px-2.5 py-1 text-xs font-bold text-blue-700">
                              {{ getSelectedProduct(item).supplier_name || t("common.noSupplier") }}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          class="inline-flex shrink-0 items-center justify-center rounded-md border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100 hover:text-blue-900"
                          @click="clearSelectedProduct(item)"
                        >
                          {{ t("common.change") }}
                        </button>
                      </div>
                    </div>

                    <div v-else>
                      <span class="inventory-field-label">{{ t("pages.requisitions.searchProduct") }}</span>
                      <v-text-field
                        v-model="item.product_search"
                        class="inventory-field"
                        :aria-label="t('pages.requisitions.searchProduct')"
                        clearable
                        :placeholder="t('pages.requisitions.searchProductPlaceholder')"
                        prepend-inner-icon="mdi-magnify"
                        variant="outlined"
                        density="comfortable"
                        hide-details
                        @click:clear="clearSelectedProduct(item)"
                      />

                      <div class="mt-3 rounded-lg border border-slate-200 bg-slate-50">
                        <button
                          v-for="product in getFilteredProducts(item)"
                          :key="product.id"
                          type="button"
                          class="w-full border-b border-slate-200 px-3 py-3 text-left last:border-b-0 hover:bg-white"
                          @click="selectProduct(item, product)"
                        >
                          <span class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <span class="min-w-0">
                              <span class="block text-sm font-bold leading-5 text-slate-900">
                                {{ product.name }}
                              </span>
                              <span class="mt-1 flex flex-wrap gap-1.5">
                                <span class="rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">
                                  SKU: {{ product.sku }}
                                </span>
                                <span class="rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">
                                  {{ product.category_name || t("common.noCategory") }}
                                </span>
                                <span class="rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">
                                  {{ product.supplier_name || t("common.noSupplier") }}
                                </span>
                              </span>
                            </span>
                            <span class="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                              {{ t("common.stockLabel", { stock: product.stock }) }}
                            </span>
                          </span>
                        </button>

                        <div
                          v-if="getFilteredProducts(item).length === 0"
                          class="px-3 py-4 text-sm font-semibold text-slate-500"
                        >
                          {{ t("pages.requisitions.searchNoResult") }}
                        </div>
                      </div>
                    </div>

                    <p
                      v-if="triedSubmit && !item.product"
                      class="inventory-error-text"
                    >
                      {{ t("pages.requisitions.productRequired") }}
                    </p>
                  </div>

                  <div v-else class="grid gap-3 lg:grid-cols-2">
                    <div>
                      <span class="inventory-field-label">{{ t("pages.requisitions.requestedProduct") }}</span>
                      <v-text-field
                        v-model="item.requested_product_name"
                        class="inventory-field"
                        :aria-label="t('pages.requisitions.requestedProduct')"
                        :placeholder="t('pages.requisitions.requestedProductPlaceholder')"
                        variant="outlined"
                        density="comfortable"
                        :rules="[rules.required]"
                      />
                    </div>

                    <div>
                      <span class="inventory-field-label">{{ t("common.description") }}</span>
                      <v-text-field
                        v-model="item.requested_product_note"
                        class="inventory-field"
                        :aria-label="t('common.description')"
                        :placeholder="t('pages.requisitions.requestedProductNotePlaceholder')"
                        variant="outlined"
                        density="comfortable"
                        hide-details
                      />
                    </div>
                  </div>

                  <div class="w-full sm:w-40">
                    <span class="inventory-field-label">{{ t("pages.requisitions.quantity") }}</span>
                    <v-text-field
                      v-model.number="item.quantity"
                      class="inventory-field"
                      :aria-label="t('pages.requisitions.quantity')"
                      placeholder="5"
                      type="number"
                      min="1"
                      step="1"
                      variant="outlined"
                      density="comfortable"
                      :rules="[rules.positiveQuantity, rules.wholeNumber]"
                      hide-details="auto"
                    />
                  </div>
                </div>
              </div>
            </div>
          </v-form>
        </v-card-text>

        <v-card-actions class="shrink-0 gap-2 border-t border-slate-200 bg-white px-6 py-4">
          <v-btn variant="text" @click="closeRequestDialog">{{ t("common.cancel") }}</v-btn>
          <v-spacer />
          <v-btn
            v-if="requestStep === 2"
            variant="text"
            @click="goToRequestInfo"
          >
            {{ t("common.back") }}
          </v-btn>
          <v-btn
            v-if="requestStep === 1"
            color="primary"
            variant="flat"
            @click="goToRequestItems"
          >
            {{ t("pages.requisitions.goToProducts") }}
          </v-btn>
          <v-btn
            v-else
            color="primary"
            :loading="creating"
            variant="flat"
            @click="submitRequest"
          >
            {{ t("pages.requisitions.saveRequest") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="successSnackbar" color="success" timeout="3000">
      {{ successMessage }}
    </v-snackbar>
  </section>
</template>
