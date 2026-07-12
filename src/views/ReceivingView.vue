<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { catalogService } from "../services/catalogService";
import { productService } from "../services/productService";
import { receivingService } from "../services/receivingService";

const { t } = useI18n();
const receipts = ref([]);
const suppliers = ref([]);
const products = ref([]);
const categories = ref([]);
const loading = ref(false);
const creating = ref(false);
const creatingProduct = ref(false);
const receiptDialog = ref(false);
const quickProductDialog = ref(false);
const receiptFormRef = ref(null);
const quickProductFormRef = ref(null);
const error = ref("");
const formError = ref("");
const quickProductError = ref("");
const successMessage = ref("");
const successSnackbar = ref(false);
const triedSubmit = ref(false);
const quickProductTargetIndex = ref(0);
const receiptItemsPerPage = ref(10);
const receiptPage = ref(1);

const receiptForm = reactive({
  supplier: "",
  document_no: "",
  note: "",
  receipt_items: [
    {
      product: "",
      quantity: 1,
      unit_cost: "",
    },
  ],
});

const quickProductForm = reactive({
  name: "",
  sku: "",
  category: "",
  price: "",
  low_stock_threshold: 5,
});

const receiptHeaders = computed(() => [
  { title: t("pages.receiving.supplier"), key: "supplier_name" },
  { title: t("pages.receiving.documentNo"), key: "document_no" },
  { title: t("pages.receiving.itemCount"), key: "itemsCount" },
  { title: t("pages.receiving.totalQuantity"), key: "totalQuantity" },
  { title: t("pages.receiving.date"), key: "receivedDate" },
  { title: t("pages.products.actions"), key: "actions", sortable: false, align: "end" },
]);

const itemsPerPageOptions = [
  { title: "10 kayıt", value: 10 },
  { title: "25 kayıt", value: 25 },
  { title: "50 kayıt", value: 50 },
  { title: "Tüm kayıtlar", value: -1 },
];

const rules = {
  required: (value) => Boolean(String(value ?? "").trim()) || t("validation.required"),
  sku: (value) =>
    !String(value ?? "").includes(" ") || t("validation.skuNoSpace"),
  positivePrice: (value) =>
    Number(value) > 0 || t("validation.positivePrice"),
  nonNegativeMoney: (value) =>
    Number(value) >= 0 || t("validation.nonNegativeCost"),
  nonNegativeNumber: (value) =>
    Number(value) >= 0 || t("validation.nonNegative"),
  positiveQuantity: (value) =>
    Number(value) > 0 || t("validation.positiveQuantity"),
  wholeNumber: (value) =>
    Number.isInteger(Number(value)) || t("validation.wholeQuantity"),
};

function getCreatedTime(item) {
  return new Date(item.received_at || item.created_at || 0).getTime();
}

function getTableItem(item) {
  return item?.raw || item;
}

const tableReceipts = computed(() =>
  receipts.value
    .map((receipt) => ({
      ...receipt,
      document_no: receipt.document_no || "-",
      itemsCount: receipt.items?.length || 0,
      totalQuantity: (receipt.items || []).reduce(
        (total, item) => total + Number(item.quantity || 0),
        0,
      ),
      receivedDate: receipt.received_at
        ? new Date(receipt.received_at).toLocaleDateString("tr-TR")
        : "-",
    }))
    .sort((a, b) => getCreatedTime(b) - getCreatedTime(a)),
);

const receiptPageCount = computed(() => {
  if (receiptItemsPerPage.value === -1) {
    return 1;
  }

  return Math.max(1, Math.ceil(tableReceipts.value.length / receiptItemsPerPage.value));
});

const receiptPaginationText = computed(() => {
  const total = tableReceipts.value.length;

  if (total === 0) {
    return "Gösterilecek kayıt yok.";
  }

  if (receiptItemsPerPage.value === -1) {
    return `${total} kaydın tamamı gösteriliyor.`;
  }

  const start = (receiptPage.value - 1) * receiptItemsPerPage.value + 1;
  const end = Math.min(receiptPage.value * receiptItemsPerPage.value, total);

  return `${total} kayıttan ${start}-${end} arası gösteriliyor.`;
});

const activeSuppliers = computed(() =>
  suppliers.value.filter((supplier) => supplier.is_active !== false),
);

const activeCategories = computed(() =>
  categories.value.filter((category) => category.is_active !== false),
);

const selectableProducts = computed(() =>
  products.value.filter((product) => product.is_active !== false),
);

function resetReceiptForm() {
  receiptForm.supplier = "";
  receiptForm.document_no = "";
  receiptForm.note = "";
  receiptForm.receipt_items = [
    {
      product: "",
      quantity: 1,
      unit_cost: "",
    },
  ];
  triedSubmit.value = false;
  formError.value = "";
  receiptFormRef.value?.resetValidation();
}

function openReceiptDialog() {
  resetReceiptForm();
  receiptDialog.value = true;
}

function closeReceiptDialog() {
  receiptDialog.value = false;
  resetReceiptForm();
}

function resetQuickProductForm() {
  quickProductForm.name = "";
  quickProductForm.sku = "";
  quickProductForm.category = "";
  quickProductForm.price = "";
  quickProductForm.low_stock_threshold = 5;
  quickProductError.value = "";
  quickProductFormRef.value?.resetValidation();
}

function openQuickProductDialog(index) {
  if (!receiptForm.supplier) {
    formError.value = "Önce ürünlerin geldiği tedarikçiyi seç, sonra yeni ürün kartı oluştur.";
    return;
  }

  quickProductTargetIndex.value = index;
  resetQuickProductForm();
  quickProductDialog.value = true;
}

function closeQuickProductDialog() {
  quickProductDialog.value = false;
  resetQuickProductForm();
}

function addReceiptItem() {
  receiptForm.receipt_items.push({
    product: "",
    quantity: 1,
    unit_cost: "",
  });
}

function removeReceiptItem(index) {
  if (receiptForm.receipt_items.length === 1) {
    return;
  }

  receiptForm.receipt_items.splice(index, 1);
}

function getErrorMessage(error) {
  const data = error.response?.data;

  if (!data) {
    return "Mal kabul kaydedilirken bağlantı sorunu oluştu.";
  }

  if (typeof data === "string") {
    return data;
  }

  const firstKey = Object.keys(data)[0];
  const firstValue = data[firstKey];
  const message = Array.isArray(firstValue) ? firstValue[0] : firstValue;

  return `${firstKey}: ${message}`;
}

function hasValidReceiptItems() {
  return receiptForm.receipt_items.every(
    (item) =>
      item.product &&
      Number(item.quantity) > 0 &&
      Number.isInteger(Number(item.quantity)) &&
      Number(item.unit_cost) >= 0,
  );
}

async function fetchPageData() {
  loading.value = true;
  error.value = "";

  try {
    const [receiptData, supplierData, categoryData, productData] = await Promise.all([
      receivingService.list(),
      catalogService.suppliers(),
      catalogService.categories(),
      productService.list(),
    ]);

    receipts.value = receiptData.results || receiptData;
    suppliers.value = supplierData.results || supplierData;
    categories.value = categoryData.results || categoryData;
    products.value = productData.results || productData;
  } catch {
    error.value = "Mal kabul verileri yüklenemedi.";
  } finally {
    loading.value = false;
  }
}

async function submitQuickProduct() {
  quickProductError.value = "";
  const result = await quickProductFormRef.value?.validate();
  const supplierId = Number(receiptForm.supplier);

  if (!supplierId) {
    quickProductError.value = "Ürünü hangi tedarikçiden aldığını bilmek için önce tedarikçi seç.";
    return;
  }

  if (!result?.valid || !quickProductForm.category) {
    quickProductError.value = "Ürün adı, SKU, kategori ve satış/list fiyatını kontrol et.";
    return;
  }

  creatingProduct.value = true;

  try {
    const product = await productService.create({
      name: quickProductForm.name.trim(),
      sku: quickProductForm.sku.trim().toUpperCase(),
      category: Number(quickProductForm.category),
      supplier: supplierId,
      supplier_ids: [supplierId],
      price: quickProductForm.price,
      stock: 0,
      low_stock_threshold: Number(quickProductForm.low_stock_threshold),
    });

    await fetchPageData();
    receiptForm.receipt_items[quickProductTargetIndex.value].product = product.id;
    successMessage.value = "Ürün kartı oluşturuldu ve mal kabul satırında seçildi.";
    successSnackbar.value = true;
    closeQuickProductDialog();
  } catch (error) {
    quickProductError.value = getErrorMessage(error);
  } finally {
    creatingProduct.value = false;
  }
}

async function submitReceipt() {
  triedSubmit.value = true;
  formError.value = "";
  const result = await receiptFormRef.value?.validate();

  if (!receiptForm.supplier) {
    formError.value = "Önce ürünlerin geldiği tedarikçiyi seç.";
    return;
  }

  if (!result?.valid || !hasValidReceiptItems()) {
    formError.value = "Ürün, miktar ve birim maliyet alanlarını kontrol et.";
    return;
  }

  creating.value = true;

  try {
    await receivingService.create({
      supplier: Number(receiptForm.supplier),
      document_no: receiptForm.document_no.trim(),
      note: receiptForm.note.trim(),
      receipt_items: receiptForm.receipt_items.map((item) => ({
        product: Number(item.product),
        quantity: Number(item.quantity),
        unit_cost: item.unit_cost,
      })),
    });
    await fetchPageData();
    successMessage.value = "Mal kabul kaydedildi. Ürün stokları güncellendi.";
    successSnackbar.value = true;
    closeReceiptDialog();
  } catch (error) {
    formError.value = getErrorMessage(error);
  } finally {
    creating.value = false;
  }
}

watch(
  () => receiptForm.supplier,
  () => {
    receiptForm.receipt_items = [
      {
        product: "",
        quantity: 1,
        unit_cost: "",
      },
    ];
  },
);

watch(receiptItemsPerPage, () => {
  receiptPage.value = 1;
});

watch(receiptPageCount, (pageCount) => {
  if (receiptPage.value > pageCount) {
    receiptPage.value = pageCount;
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
      <div class="inventory-section-header flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="font-bold text-slate-950">{{ t('pages.receiving.title') }}</h2>
          <p class="text-sm text-slate-500">
            {{ t('pages.receiving.subtitle') }}
          </p>
        </div>

        <v-btn color="primary" prepend-icon="mdi-plus" variant="flat" @click="openReceiptDialog">
          {{ t('pages.receiving.newReceipt') }}
        </v-btn>
      </div>

      <v-divider />

      <div class="flex justify-end px-6 py-5">
        <label class="inventory-native-field w-full sm:w-[210px]">
          <span class="inventory-native-label">
            Gösterilecek kayıt
          </span>
          <select
            v-model.number="receiptItemsPerPage"
            class="inventory-native-select"
          >
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
        :headers="receiptHeaders"
        :items="tableReceipts"
        :loading="loading"
        :page="receiptPage"
        :items-per-page="receiptItemsPerPage"
        hide-default-footer
        item-value="id"
        :loading-text="t('pages.receiving.loading')"
        :no-data-text="t('pages.receiving.noData')"
      >
        <template #item.actions="{ item }">
          <div class="flex justify-end gap-1">
            <v-btn
              :aria-label="t('pages.receiving.detail')"
              class="inventory-row-action"
              icon="mdi-eye-outline"
              size="small"
              title="Detayı gör"
              variant="text"
              :to="{ name: 'receiving-detail', params: { id: getTableItem(item).id } }"
            />
          </div>
        </template>

        <template #no-data>
          <div class="inventory-empty-state">
            <div>
              <div class="inventory-empty-state__icon">M</div>
              <p class="inventory-empty-state__title">Henüz mal kabul kaydı yok</p>
              <p class="inventory-empty-state__text">
                Tedarikçiden gelen ürünleri kaydettiğinde stoklar otomatik güncellenir ve burada geçmiş oluşur.
              </p>
              <v-btn
                class="mt-4"
                color="primary"
                prepend-icon="mdi-plus"
                variant="flat"
                @click="openReceiptDialog"
              >
                İlk mal kabulü oluştur
              </v-btn>
            </div>
          </div>
        </template>

        <template #bottom>
          <div
            v-if="tableReceipts.length"
            class="flex flex-col gap-3 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <p class="text-sm text-slate-500">
              {{ receiptPaginationText }}
            </p>

            <v-pagination
              v-if="receiptPageCount > 1"
              v-model="receiptPage"
              :length="receiptPageCount"
              :total-visible="5"
              density="comfortable"
              rounded="circle"
            />
          </div>
        </template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="receiptDialog" max-width="920">
      <v-card class="inventory-card overflow-hidden" elevation="0">
        <v-card-title class="px-6 pt-6 text-lg font-bold text-slate-950">
          Yeni mal kabul kaydı
        </v-card-title>

        <v-card-subtitle class="px-6 text-slate-500">
          Gelen ürünleri tedarikçisine göre seç; kayıt tamamlanınca stok otomatik artar.
        </v-card-subtitle>

        <v-card-text class="px-6 pt-5">
          <v-alert v-if="formError" class="mb-4" type="error" variant="tonal">
            {{ formError }}
          </v-alert>

          <v-form ref="receiptFormRef" @submit.prevent="submitReceipt">
            <div class="grid gap-x-5 gap-y-5 sm:grid-cols-2">
              <label class="inventory-native-field">
                <span class="inventory-native-label">Tedarikçi</span>
                <select v-model="receiptForm.supplier" class="inventory-native-select">
                  <option value="" disabled>Tedarikçi seç</option>
                  <option
                    v-for="supplier in activeSuppliers"
                    :key="supplier.id"
                    :value="supplier.id"
                  >
                    {{ supplier.name }}{{ supplier.sector ? ` - ${supplier.sector}` : "" }}
                  </option>
                </select>
                <p
                  v-if="triedSubmit && !receiptForm.supplier"
                  class="inventory-error-text"
                >
                  Tedarikçi seçilmelidir.
                </p>
                <p v-else class="inventory-help-text">
                  Tedarikçi ürünün geliş kaynağı olarak kaydedilir.
                </p>
              </label>

              <div>
                <span class="inventory-field-label">Belge / irsaliye no</span>
                <v-text-field
                  v-model="receiptForm.document_no"
                  class="inventory-field"
                  aria-label="Belge no"
                  placeholder="Örn: IRS-2026-001"
                  hint="Zorunlu değil; irsaliye veya fatura takibi için kullanılır."
                  persistent-hint
                  variant="outlined"
                  density="comfortable"
                />
              </div>

              <label class="inventory-native-field sm:col-span-2">
                <span class="inventory-native-label">Not</span>
                <textarea
                  v-model="receiptForm.note"
                  class="inventory-native-textarea"
                  placeholder="Örn: A Temizlik firmasından haftalık sarf malzeme teslim alındı."
                />
              </label>
            </div>

            <div class="mt-6 space-y-3">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <h3 class="font-bold text-slate-950">Gelen ürünler</h3>
                  <p class="text-sm text-slate-500">
                    Aynı mal kabul kaydına birden fazla ürün ekleyebilirsin.
                  </p>
                </div>

                <v-btn
                  color="primary"
                  prepend-icon="mdi-plus"
                  variant="tonal"
                  @click="addReceiptItem"
                >
                  Kalem ekle
                </v-btn>
              </div>

              <div
                v-for="(item, index) in receiptForm.receipt_items"
                :key="index"
                class="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[minmax(0,1fr)_120px_140px_auto]"
              >
                <label class="inventory-native-field">
                  <span class="mb-1.5 flex items-center justify-between gap-3">
                    <span class="inventory-native-label mb-0">Ürün</span>
                    <button
                      type="button"
                      class="inline-flex h-7 items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                      title="Yeni ürün kartı oluştur"
                      @click="openQuickProductDialog(index)"
                    >
                      + Ürün ekle
                    </button>
                  </span>
                  <select v-model="item.product" class="inventory-native-select">
                    <option value="" disabled>Ürün seç</option>
                    <option
                      v-for="product in selectableProducts"
                      :key="product.id"
                      :value="product.id"
                    >
                      {{ product.name }} - {{ product.sku }} (stok: {{ product.stock }})
                    </option>
                  </select>
                  <p
                    v-if="selectableProducts.length === 0"
                    class="inventory-help-text"
                  >
                    Bu tedarikçiden gelen ürünü listede bulamıyorsan hızlı ürün kartı oluştur.
                  </p>
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
                    placeholder="10"
                    type="number"
                    min="1"
                    step="1"
                    variant="outlined"
                    density="comfortable"
                    :rules="[rules.positiveQuantity, rules.wholeNumber]"
                    hide-details="auto"
                  />
                </div>

                <div>
                  <span class="inventory-field-label">Birim maliyet</span>
                  <v-text-field
                    v-model="item.unit_cost"
                    class="inventory-field"
                    aria-label="Birim maliyet"
                    placeholder="125.00"
                    prefix="₺"
                    type="number"
                    min="0"
                    step="0.01"
                    variant="outlined"
                    density="comfortable"
                    :rules="[rules.nonNegativeMoney]"
                    hide-details="auto"
                  />
                </div>

                <div class="flex items-end">
                  <v-btn
                    :disabled="receiptForm.receipt_items.length === 1"
                    color="error"
                    variant="text"
                    @click="removeReceiptItem(index)"
                  >
                    Sil
                  </v-btn>
                </div>
              </div>
            </div>
          </v-form>
        </v-card-text>

        <v-card-actions class="gap-2 px-6 pb-6 pt-1">
          <v-btn variant="text" @click="closeReceiptDialog">
            Vazgeç
          </v-btn>
          <v-btn color="primary" :loading="creating" variant="flat" @click="submitReceipt">
            Mal kabulü kaydet
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="quickProductDialog" max-width="760">
      <v-card class="inventory-card overflow-hidden" elevation="0">
        <v-card-title class="px-6 pt-6 text-lg font-bold text-slate-950">
          Hızlı ürün kartı oluştur
        </v-card-title>

        <v-card-subtitle class="px-6 text-slate-500">
          Bu ürün kartı stok girişi yapmaz; stok, mal kabulü kaydettiğinde miktar kadar artar.
        </v-card-subtitle>

        <v-card-text class="px-6 pt-5">
          <v-alert
            v-if="quickProductError"
            class="mb-4"
            type="error"
            variant="tonal"
          >
            {{ quickProductError }}
          </v-alert>

          <v-form ref="quickProductFormRef" @submit.prevent="submitQuickProduct">
            <div class="grid gap-x-5 gap-y-5 sm:grid-cols-2">
              <div>
                <span class="inventory-field-label">Ürün adı</span>
                <v-text-field
                  v-model="quickProductForm.name"
                  class="inventory-field"
                  aria-label="Ürün adı"
                  placeholder="Örn: Ülker Çikolata"
                  hint="Mal kabulde seçilecek açık ürün adı."
                  persistent-hint
                  variant="outlined"
                  density="comfortable"
                  :rules="[rules.required]"
                />
              </div>

              <div>
                <span class="inventory-field-label">SKU</span>
                <v-text-field
                  v-model="quickProductForm.sku"
                  class="inventory-field"
                  aria-label="SKU"
                  placeholder="Örn: CIK-001"
                  hint="Boşluk kullanma. Kaydedilirken büyük harfe çevrilir."
                  persistent-hint
                  variant="outlined"
                  density="comfortable"
                  :rules="[rules.required, rules.sku]"
                />
              </div>

              <label class="inventory-native-field">
                <span class="inventory-native-label">Kategori</span>
                <select
                  v-model="quickProductForm.category"
                  class="inventory-native-select"
                >
                  <option value="" disabled>Kategori seç</option>
                  <option
                    v-for="category in activeCategories"
                    :key="category.id"
                    :value="category.id"
                  >
                    {{ category.name }}
                  </option>
                </select>
                <p class="inventory-help-text">
                  Ürünün listelerde doğru grupta görünmesi için kategori seç.
                </p>
              </label>

              <div>
                <span class="inventory-field-label">Satış / liste fiyatı</span>
                <v-text-field
                  v-model="quickProductForm.price"
                  class="inventory-field"
                  aria-label="Satış liste fiyatı"
                  placeholder="Örn: 35.00"
                  hint="Alış maliyeti değil; ürün kartında görünecek fiyat."
                  persistent-hint
                  prefix="₺"
                  type="number"
                  min="0"
                  step="0.01"
                  variant="outlined"
                  density="comfortable"
                  :rules="[rules.required, rules.positivePrice]"
                />
              </div>

              <div class="sm:col-span-2">
                <span class="inventory-field-label">Düşük stok eşiği</span>
                <v-text-field
                  v-model.number="quickProductForm.low_stock_threshold"
                  class="inventory-field"
                  aria-label="Düşük stok eşiği"
                  placeholder="Örn: 5"
                  hint="Stok bu değere eşit veya altına inerse ürün kritik sayılır."
                  persistent-hint
                  type="number"
                  min="0"
                  step="1"
                  variant="outlined"
                  density="comfortable"
                  :rules="[rules.required, rules.nonNegativeNumber, rules.wholeNumber]"
                />
              </div>
            </div>
          </v-form>
        </v-card-text>

        <v-card-actions class="gap-2 px-6 pb-6 pt-1">
          <v-btn variant="text" @click="closeQuickProductDialog">
            Vazgeç
          </v-btn>
          <v-btn
            color="primary"
            :loading="creatingProduct"
            variant="flat"
            @click="submitQuickProduct"
          >
            Ürün kartını oluştur
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="successSnackbar" color="success" timeout="3000">
      {{ successMessage }}
    </v-snackbar>
  </section>
</template>
