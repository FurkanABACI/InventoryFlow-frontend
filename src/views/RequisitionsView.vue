<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { productService } from "../services/productService";
import { requisitionService } from "../services/requisitionService";
import { useAuthStore } from "../stores/auth";

const authStore = useAuthStore();
const router = useRouter();
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

const requestHeaders = [
  { title: "Birim", key: "department" },
  { title: "Talep eden", key: "requester_name" },
  { title: "Ürünler", key: "itemsPreview" },
  { title: "Kalem", key: "itemsCount" },
  { title: "Toplam adet", key: "total_quantity" },
  { title: "Durum", key: "status" },
  { title: "Tarih", key: "createdDate" },
  { title: "İşlemler", key: "actions", sortable: false, align: "end" },
];

const itemsPerPageOptions = [
  { title: "10 kayıt", value: 10 },
  { title: "25 kayıt", value: 25 },
  { title: "50 kayıt", value: 50 },
  { title: "Tüm kayıtlar", value: -1 },
];

const rules = {
  required: (value) =>
    Boolean(String(value ?? "").trim()) || "Bu alan zorunludur.",
  positiveQuantity: (value) =>
    Number(value) > 0 || "Miktar 0'dan büyük olmalıdır.",
  wholeNumber: (value) =>
    Number.isInteger(Number(value)) || "Miktar tam sayı olmalıdır.",
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
    return "Gösterilecek kayıt yok.";
  }

  if (itemsPerPage.value === -1) {
    return `${total} kaydın tamamı gösteriliyor.`;
  }

  const start = (requestPage.value - 1) * itemsPerPage.value + 1;
  const end = Math.min(requestPage.value * itemsPerPage.value, total);

  return `${total} kayıttan ${start}-${end} arası gösteriliyor.`;
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
    return "Talep işlemi sırasında bağlantı sorunu oluştu.";
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
    return selectableProducts.value.slice(0, 8);
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
    .slice(0, 8);
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
    error.value = "Talepler yüklenemedi.";
  } finally {
    loading.value = false;
  }
}

async function submitRequest() {
  formError.value = "";
  triedSubmit.value = true;
  const result = await requestFormRef.value?.validate();

  if (!result?.valid || !hasValidRequestItems()) {
    formError.value =
      "Birim, talep eden kişi, ürün bilgisi ve miktar alanlarını kontrol et.";
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
    successMessage.value = "Talep oluşturuldu.";
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
    successMessage.value = "Talep teslim edildi. Stoklar güncellendi.";
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
          <h2 class="font-bold text-slate-950">Talepler</h2>
          <p class="text-sm text-slate-500">
            Birimlerin ürün isteklerini aç, stok uygunsa teslim ederek stoktan
            düş.
          </p>
        </div>

        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          variant="flat"
          @click="openRequestDialog"
        >
          Yeni talep
        </v-btn>
      </div>

      <v-divider />

      <div class="flex justify-end px-6 py-5">
        <label class="inventory-native-field w-full sm:w-[210px]">
          <span class="inventory-native-label">Gösterilecek kayıt</span>
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
        loading-text="Talepler yükleniyor..."
        no-data-text="Kayıtlı talep bulunamadı."
      >
        <template #item.status="{ item }">
          <span
            class="inline-flex min-w-[118px] justify-center rounded-full border px-3 py-1.5 text-xs font-bold"
            :class="getStatusClass(getTableItem(item).status)"
          >
            {{ getTableItem(item).status_label }}
          </span>
        </template>

        <template #item.itemsPreview="{ item }">
          <span class="text-sm font-medium text-slate-700">
            {{ getTableItem(item).itemsPreview || "Ürün bilgisi yok" }}
          </span>
        </template>

        <template #item.actions="{ item }">
          <div class="flex justify-end gap-1">
            <v-btn
              aria-label="Talep detayını görüntüle"
              class="inventory-row-action"
              icon="mdi-eye-outline"
              size="small"
              title="Talep detayını görüntüle"
              variant="text"
              @click="openRequestDetail(item)"
            />
            <v-btn
              v-if="getTableItem(item).status === 'pending'"
              aria-label="Talebi teslim et"
              class="inventory-row-action"
              icon="mdi-truck-check-outline"
              size="small"
              title="Stoktan teslim et"
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
              <p class="inventory-empty-state__title">Henüz talep yok</p>
              <p class="inventory-empty-state__text">
                Bir birim ürün istediğinde talep kaydı açarak teslim sürecini
                takip edebilirsin.
              </p>
              <v-btn
                class="mt-4"
                color="primary"
                prepend-icon="mdi-plus"
                variant="flat"
                @click="openRequestDialog"
              >
                İlk talebi oluştur
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
      <v-card class="inventory-card overflow-hidden" elevation="0">
        <v-card-title class="px-6 pt-6 text-lg font-bold text-slate-950">
          Yeni ürün talebi
        </v-card-title>

        <v-card-subtitle class="px-6 text-slate-500">
          Birimin istediği ürünleri seç; stok varsa teslim aşamasında otomatik
          düşülür.
        </v-card-subtitle>

        <v-card-text class="px-6 pt-5">
          <v-alert v-if="formError" class="mb-4" type="error" variant="tonal">
            {{ formError }}
          </v-alert>

          <v-form ref="requestFormRef" @submit.prevent="submitRequest">
            <div class="grid gap-x-5 gap-y-5 sm:grid-cols-2">
              <div>
                <span class="inventory-field-label">Birim</span>
                <v-text-field
                  v-model="requestForm.department"
                  class="inventory-field"
                  aria-label="Birim"
                  placeholder="Örn: Yazılım"
                  hint="Talebi açan departman veya ekip."
                  persistent-hint
                  variant="outlined"
                  density="comfortable"
                  :disabled="isDepartmentUser && Boolean(authStore.userDepartment)"
                  :rules="[rules.required]"
                />
              </div>

              <div>
                <span class="inventory-field-label">Talep eden</span>
                <v-text-field
                  v-model="requestForm.requester_name"
                  class="inventory-field"
                  aria-label="Talep eden"
                  placeholder="Örn: Ayşe Demir"
                  hint="Talebi ileten kişi veya sorumlu."
                  persistent-hint
                  variant="outlined"
                  density="comfortable"
                  :rules="[rules.required]"
                />
              </div>

              <label class="inventory-native-field sm:col-span-2">
                <span class="inventory-native-label">Not</span>
                <textarea
                  v-model="requestForm.note"
                  class="inventory-native-textarea"
                  placeholder="Örn: Yeni başlayan geliştiriciler için laptop talebi."
                />
              </label>
            </div>

            <div class="mt-6 space-y-3">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <h3 class="font-bold text-slate-950">İstenen ürünler</h3>
                  <p class="text-sm text-slate-500">
                    Aynı talep içinde birden fazla ürün istenebilir.
                  </p>
                </div>

                <v-btn
                  color="primary"
                  prepend-icon="mdi-plus"
                  variant="tonal"
                  @click="addRequestItem"
                >
                  Kalem ekle
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
                      Ürün tipi
                    </p>
                    <div class="inline-flex w-full rounded-lg border border-slate-200 bg-slate-50 p-1 sm:w-auto">
                    <button
                      type="button"
                      class="flex-1 rounded-md px-3 py-1.5 text-sm font-bold transition sm:flex-none"
                      :class="item.item_type === 'existing' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-950'"
                      @click="setRequestItemType(item, 'existing')"
                    >
                      Mevcut ürün
                    </button>
                    <button
                      type="button"
                      class="flex-1 rounded-md px-3 py-1.5 text-sm font-bold transition sm:flex-none"
                      :class="item.item_type === 'custom' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-950'"
                      @click="setRequestItemType(item, 'custom')"
                    >
                      Ürün listede yok
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
                    Sil
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
                              Stok: {{ getSelectedProduct(item).stock }}
                            </span>
                            <span class="rounded-md bg-white px-2.5 py-1 text-xs font-bold text-blue-700">
                              {{ getSelectedProduct(item).category_name || "Kategori yok" }}
                            </span>
                            <span class="rounded-md bg-white px-2.5 py-1 text-xs font-bold text-blue-700">
                              {{ getSelectedProduct(item).supplier_name || "Tedarikçi yok" }}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          class="inline-flex shrink-0 items-center justify-center rounded-md border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100 hover:text-blue-900"
                          @click="clearSelectedProduct(item)"
                        >
                          Değiştir
                        </button>
                      </div>
                    </div>

                    <div v-else>
                      <span class="inventory-field-label">Ürün ara</span>
                      <v-text-field
                        v-model="item.product_search"
                        class="inventory-field"
                        aria-label="Ürün ara"
                        clearable
                        placeholder="Ürün adı, SKU, kategori veya tedarikçi yaz"
                        prepend-inner-icon="mdi-magnify"
                        variant="outlined"
                        density="comfortable"
                        hide-details
                        @click:clear="clearSelectedProduct(item)"
                      />

                      <div class="mt-3 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50">
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
                                  {{ product.category_name || "Kategori yok" }}
                                </span>
                                <span class="rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">
                                  {{ product.supplier_name || "Tedarikçi yok" }}
                                </span>
                              </span>
                            </span>
                            <span class="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                              stok {{ product.stock }}
                            </span>
                          </span>
                        </button>

                        <div
                          v-if="getFilteredProducts(item).length === 0"
                          class="px-3 py-4 text-sm font-semibold text-slate-500"
                        >
                          Aramaya uygun ürün bulunamadı.
                        </div>
                      </div>
                    </div>

                    <p
                      v-if="triedSubmit && !item.product"
                      class="inventory-error-text"
                    >
                      Ürün seçilmelidir.
                    </p>
                  </div>

                  <div v-else class="grid gap-3 lg:grid-cols-2">
                    <div>
                      <span class="inventory-field-label">Talep edilen ürün</span>
                      <v-text-field
                        v-model="item.requested_product_name"
                        class="inventory-field"
                        aria-label="Talep edilen ürün"
                        placeholder="Örn: Porselen yemek tabağı"
                        variant="outlined"
                        density="comfortable"
                        :rules="[rules.required]"
                      />
                    </div>

                    <div>
                      <span class="inventory-field-label">Açıklama</span>
                      <v-text-field
                        v-model="item.requested_product_note"
                        class="inventory-field"
                        aria-label="Açıklama"
                        placeholder="Örn: Yemekhane için dayanıklı model"
                        variant="outlined"
                        density="comfortable"
                        hide-details
                      />
                    </div>
                  </div>

                  <div class="w-full sm:w-40">
                    <span class="inventory-field-label">Miktar</span>
                    <v-text-field
                      v-model.number="item.quantity"
                      class="inventory-field"
                      aria-label="Miktar"
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

        <v-card-actions class="gap-2 px-6 pb-6 pt-1">
          <v-btn variant="text" @click="closeRequestDialog"> Vazgeç </v-btn>
          <v-btn
            color="primary"
            :loading="creating"
            variant="flat"
            @click="submitRequest"
          >
            Talebi kaydet
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="successSnackbar" color="success" timeout="3000">
      {{ successMessage }}
    </v-snackbar>
  </section>
</template>
