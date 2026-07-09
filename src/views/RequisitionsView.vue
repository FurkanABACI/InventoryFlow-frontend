<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { productService } from "../services/productService";
import { requisitionService } from "../services/requisitionService";

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
      product: "",
      quantity: 1,
    },
  ],
});

const requestHeaders = [
  { title: "Birim", key: "department" },
  { title: "Talep eden", key: "requester_name" },
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

const tableRequests = computed(() =>
  requests.value
    .map((request) => ({
      ...request,
      itemsCount: request.items?.length || 0,
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

function resetRequestForm() {
  requestForm.department = "";
  requestForm.requester_name = "";
  requestForm.note = "";
  requestForm.request_items = [
    {
      product: "",
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
    product: "",
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
      item.product &&
      Number(item.quantity) > 0 &&
      Number.isInteger(Number(item.quantity)),
  );
}

async function fetchPageData() {
  loading.value = true;
  error.value = "";

  try {
    const [requestData, productData] = await Promise.all([
      requisitionService.list(),
      productService.list(),
    ]);

    requests.value = requestData.results || requestData;
    products.value = productData.results || productData;
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
      "Birim, talep eden kişi, ürün ve miktar alanlarını kontrol et.";
    return;
  }

  creating.value = true;

  try {
    await requisitionService.create({
      department: requestForm.department.trim(),
      requester_name: requestForm.requester_name.trim(),
      note: requestForm.note.trim(),
      request_items: requestForm.request_items.map((item) => ({
        product: Number(item.product),
        quantity: Number(item.quantity),
      })),
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

        <template #item.actions="{ item }">
          <div class="flex justify-end gap-1">
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
                class="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[minmax(0,1fr)_140px_auto]"
              >
                <label class="inventory-native-field">
                  <span class="inventory-native-label">Ürün</span>
                  <select
                    v-model="item.product"
                    class="inventory-native-select"
                  >
                    <option value="" disabled>Ürün seç</option>
                    <option
                      v-for="product in selectableProducts"
                      :key="product.id"
                      :value="product.id"
                    >
                      {{ product.name }} - {{ product.sku }} (stok:
                      {{ product.stock }})
                    </option>
                  </select>
                  <p
                    v-if="triedSubmit && !item.product"
                    class="inventory-error-text"
                  >
                    Ürün seçilmelidir.
                  </p>
                </label>

                <div>
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

                <div class="flex items-end">
                  <v-btn
                    :disabled="requestForm.request_items.length === 1"
                    color="error"
                    variant="text"
                    @click="removeRequestItem(index)"
                  >
                    Sil
                  </v-btn>
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
