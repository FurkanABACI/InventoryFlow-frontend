<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useProductsStore } from "../stores/products";
import { catalogService } from "../services/catalogService";

const productsStore = useProductsStore();
const { products, loading, creating, error } = storeToRefs(productsStore);
const search = ref("");
const itemsPerPage = ref(10);
const productPage = ref(1);
const productFormRef = ref(null);
const productDialog = ref(false);
const deleteProductDialog = ref(false);
const quickCategoryFormRef = ref(null);
const quickCategoryDialog = ref(false);
const quickSupplierFormRef = ref(null);
const quickSupplierDialog = ref(false);
const formError = ref("");
const quickCategoryError = ref("");
const quickSupplierError = ref("");
const successMessage = ref("");
const successSnackbar = ref(false);
const triedSubmit = ref(false);
const creatingCategory = ref(false);
const creatingSupplier = ref(false);
const deletingProduct = ref(false);
const categories = ref([]);
const suppliers = ref([]);
const editingProductId = ref(null);
const productToDelete = ref(null);

const productForm = reactive({
  name: "",
  sku: "",
  category: "",
  supplier: "",
  price: "",
  low_stock_threshold: 5,
});

const quickSupplierForm = reactive({
  name: "",
  sector: "",
  email: "",
  phone: "",
});

const quickCategoryForm = reactive({
  name: "",
  description: "",
});

const productHeaders = [
  { title: "Ürün", key: "name" },
  { title: "SKU", key: "sku" },
  { title: "Kategori", key: "categoryName" },
  { title: "Tedarikçi", key: "supplierName" },
  { title: "Stok", key: "stock" },
  { title: "Satış fiyatı", key: "price" },
  { title: "İşlemler", key: "actions", sortable: false, align: "end" },
];

const itemsPerPageOptions = [
  { title: "10 kayıt", value: 10 },
  { title: "25 kayıt", value: 25 },
  { title: "50 kayıt", value: 50 },
  { title: "Tüm kayıtlar", value: -1 },
];

function getCreatedTime(item) {
  return new Date(item.created_at || 0).getTime();
}

const rules = {
  required: (value) => Boolean(String(value ?? "").trim()) || "Bu alan zorunludur.",
  sku: (value) =>
    !String(value ?? "").includes(" ") || "SKU boşluk içermemelidir.",
  positivePrice: (value) =>
    Number(value) > 0 || "Satış/list fiyatı 0'dan büyük olmalıdır.",
  nonNegativeNumber: (value) =>
    Number(value) >= 0 || "Bu değer negatif olamaz.",
  wholeNumber: (value) =>
    Number.isInteger(Number(value)) || "Bu alana tam sayı girilmelidir.",
  email: (value) =>
    !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value)) || "Geçerli bir e-posta yaz.",
};

function getStockStatus(product) {
  const stock = Number(product.stock || 0);
  const threshold = Number(product.low_stock_threshold || 0);

  if (stock === 0) {
    return {
      color: "error",
      text: "Stok yok",
    };
  }

  if (stock <= threshold) {
    return {
      color: "warning",
      text: "Düşük stok",
    };
  }

  return {
    color: "success",
    text: "Yeterli",
  };
}

function getTableItem(item) {
  return item?.raw || item;
}

function getStockChipColor(item) {
  const product = getTableItem(item);
  return product.stockStatusColor || getStockStatus(product).color;
}

function getStockChipText(item) {
  const product = getTableItem(item);
  return product.stockStatusText || getStockStatus(product).text;
}

function getStockChipValue(item, value) {
  const product = getTableItem(item);
  return value ?? product.stock ?? 0;
}

function getStockBadgeClass(item) {
  const color = getStockChipColor(item);

  if (color === "error") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (color === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

const tableProducts = computed(() => {
  const searchText = search.value.trim().toLowerCase();

  return products.value
    .map((product) => {
      const stockStatus = getStockStatus(product);

      return {
        ...product,
        categoryName: product.category_name || product.category?.name || product.category || "-",
        supplierName: product.supplier_name || product.supplier?.name || product.supplier || "-",
        stockStatusColor: stockStatus.color,
        stockStatusText: stockStatus.text,
      };
    })
    .filter((product) => {
      if (!searchText) {
        return true;
      }

      return [
        product.name,
        product.sku,
        product.categoryName,
        product.supplierName,
      ].some((field) => String(field).toLowerCase().includes(searchText));
    })
    .sort((a, b) => getCreatedTime(b) - getCreatedTime(a));
});

const productPageCount = computed(() => {
  if (itemsPerPage.value === -1) {
    return 1;
  }

  return Math.max(1, Math.ceil(tableProducts.value.length / itemsPerPage.value));
});

const productPaginationText = computed(() => {
  const total = tableProducts.value.length;

  if (total === 0) {
    return "Gösterilecek kayıt yok.";
  }

  if (itemsPerPage.value === -1) {
    return `${total} kaydın tamamı gösteriliyor.`;
  }

  const start = (productPage.value - 1) * itemsPerPage.value + 1;
  const end = Math.min(productPage.value * itemsPerPage.value, total);

  return `${total} kayıttan ${start}-${end} arası gösteriliyor.`;
});

const activeCategories = computed(() =>
  categories.value.filter((category) => category.is_active !== false),
);

const activeSuppliers = computed(() =>
  suppliers.value.filter((supplier) => supplier.is_active !== false),
);

watch([search, itemsPerPage], () => {
  productPage.value = 1;
});

watch(productPageCount, (pageCount) => {
  if (productPage.value > pageCount) {
    productPage.value = pageCount;
  }
});

function resetProductForm() {
  editingProductId.value = null;
  productForm.name = "";
  productForm.sku = "";
  productForm.category = "";
  productForm.supplier = "";
  productForm.price = "";
  productForm.low_stock_threshold = 5;
  formError.value = "";
  triedSubmit.value = false;
  productFormRef.value?.resetValidation();
}

function openProductDialog() {
  resetProductForm();
  productDialog.value = true;
}

function openEditProductDialog(item) {
  const product = getTableItem(item);

  resetProductForm();
  editingProductId.value = product.id;
  productForm.name = product.name || "";
  productForm.sku = product.sku || "";
  productForm.category = product.category?.id || product.category || "";
  productForm.supplier = product.supplier?.id || product.supplier || "";
  productForm.price = product.price || "";
  productForm.low_stock_threshold = product.low_stock_threshold ?? 5;
  productDialog.value = true;
}

function closeProductDialog() {
  productDialog.value = false;
  resetProductForm();
}

function openDeleteProductDialog(item) {
  productToDelete.value = getTableItem(item);
  deleteProductDialog.value = true;
}

function closeDeleteProductDialog() {
  productToDelete.value = null;
  deleteProductDialog.value = false;
}

function resetQuickCategoryForm() {
  quickCategoryForm.name = "";
  quickCategoryForm.description = "";
  quickCategoryError.value = "";
  quickCategoryFormRef.value?.resetValidation();
}

function openQuickCategoryDialog() {
  resetQuickCategoryForm();
  quickCategoryDialog.value = true;
}

function closeQuickCategoryDialog() {
  quickCategoryDialog.value = false;
  resetQuickCategoryForm();
}

function resetQuickSupplierForm() {
  quickSupplierForm.name = "";
  quickSupplierForm.sector = "";
  quickSupplierForm.email = "";
  quickSupplierForm.phone = "";
  quickSupplierError.value = "";
  quickSupplierFormRef.value?.resetValidation();
}

function openQuickSupplierDialog() {
  resetQuickSupplierForm();
  quickSupplierDialog.value = true;
}

function closeQuickSupplierDialog() {
  quickSupplierDialog.value = false;
  resetQuickSupplierForm();
}

function getErrorMessage(error) {
  const data = error.response?.data;

  if (!data) {
    return "Ürün kaydedilirken bağlantı sorunu oluştu. Lütfen tekrar dene.";
  }

  if (typeof data === "string") {
    return data;
  }

  const firstKey = Object.keys(data)[0];
  const firstValue = data[firstKey];
  const message = Array.isArray(firstValue) ? firstValue[0] : firstValue;

  return `${firstKey}: ${message}`;
}

async function fetchCatalogData() {
  try {
    const [categoryData, supplierData] = await Promise.all([
      catalogService.categories(),
      catalogService.suppliers(),
    ]);

    categories.value = categoryData.results || categoryData;
    suppliers.value = supplierData.results || supplierData;
  } catch {
    formError.value = "Kategori ve tedarikçi bilgileri yüklenemedi.";
  }
}

async function submitQuickCategory() {
  quickCategoryError.value = "";
  const result = await quickCategoryFormRef.value?.validate();

  if (!result?.valid) {
    quickCategoryError.value = "Kategori adını kontrol et.";
    return;
  }

  creatingCategory.value = true;

  try {
    const category = await catalogService.createCategory({
      name: quickCategoryForm.name.trim(),
      description: quickCategoryForm.description.trim(),
    });

    await fetchCatalogData();
    productForm.category = category.id;
    successMessage.value = "Kategori eklendi ve ürün formunda seçildi.";
    successSnackbar.value = true;
    closeQuickCategoryDialog();
  } catch (error) {
    quickCategoryError.value = getErrorMessage(error);
  } finally {
    creatingCategory.value = false;
  }
}

async function submitQuickSupplier() {
  quickSupplierError.value = "";
  const result = await quickSupplierFormRef.value?.validate();

  if (!result?.valid) {
    quickSupplierError.value = "Firma adı ve e-posta alanlarını kontrol et.";
    return;
  }

  creatingSupplier.value = true;

  try {
    const supplier = await catalogService.createSupplier({
      name: quickSupplierForm.name.trim(),
      sector: quickSupplierForm.sector.trim(),
      email: quickSupplierForm.email.trim(),
      phone: quickSupplierForm.phone.trim(),
      address: "",
      note: "Ürün ekleme formundan hızlı oluşturuldu.",
    });

    await fetchCatalogData();
    productForm.supplier = supplier.id;
    successMessage.value = "Tedarikçi eklendi ve ürün formunda seçildi.";
    successSnackbar.value = true;
    closeQuickSupplierDialog();
  } catch (error) {
    quickSupplierError.value = getErrorMessage(error);
  } finally {
    creatingSupplier.value = false;
  }
}

async function submitProduct() {
  formError.value = "";
  triedSubmit.value = true;
  const result = await productFormRef.value?.validate();

  if (!result?.valid || !productForm.category || !productForm.supplier) {
    formError.value = "Ürün adı, SKU, kategori, tedarikçi ve satış/list fiyatını eksiksiz doldur.";
    return;
  }

  const payload = {
    name: productForm.name.trim(),
    sku: productForm.sku.trim().toUpperCase(),
    category: Number(productForm.category),
    supplier: Number(productForm.supplier),
    price: productForm.price,
    stock: 0,
    low_stock_threshold: Number(productForm.low_stock_threshold),
  };

  try {
    if (editingProductId.value) {
      const { stock, ...updatePayload } = payload;
      await productsStore.updateProduct(editingProductId.value, updatePayload);
      successMessage.value = "Ürün bilgileri güncellendi.";
    } else {
      await productsStore.createProduct(payload);
      successMessage.value = "Ürün başarıyla eklendi. Liste güncellendi.";
    }

    successSnackbar.value = true;
    closeProductDialog();
  } catch (error) {
    formError.value = getErrorMessage(error);
  }
}

async function deleteProduct() {
  if (!productToDelete.value) {
    return;
  }

  deletingProduct.value = true;

  try {
    await productsStore.deactivateProduct(productToDelete.value.id);
    successMessage.value = "Ürün listeden kaldırıldı.";
    successSnackbar.value = true;
    closeDeleteProductDialog();
  } catch (error) {
    formError.value = getErrorMessage(error);
  } finally {
    deletingProduct.value = false;
  }
}

onMounted(() => {
  productsStore.fetchProducts();
  fetchCatalogData();
});
</script>

<template>
  <section class="space-y-4">
    <v-alert v-if="error" type="error" variant="tonal">
      {{ error }}
    </v-alert>

    <v-card
      class="inventory-card overflow-hidden"
      elevation="0"
    >
      <div
        class="inventory-section-header flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2 class="font-bold text-slate-950">Ürünler</h2>
          <p class="text-sm text-slate-500">
            {{ tableProducts.length }} ürün listeleniyor
          </p>
        </div>

        <v-btn
          class="self-start sm:self-auto"
          color="primary"
          prepend-icon="mdi-plus"
          variant="flat"
          @click="openProductDialog"
        >
          Yeni ürün
        </v-btn>
      </div>

      <v-divider />

      <div
        class="grid gap-4 px-6 py-5 lg:grid-cols-[minmax(0,1fr)_210px] lg:items-start"
      >
        <div>
          <span class="inventory-field-label">Ürün, SKU veya tedarikçi ara</span>
          <v-text-field
            v-model="search"
            class="inventory-field"
            aria-label="Ürün, SKU veya tedarikçi ara"
            placeholder="Örn: monitör, MON-001 veya tedarikçi adı"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="comfortable"
            clearable
            hide-details
          />
        </div>

        <label class="inventory-native-field">
          <span class="inventory-native-label">
            Gösterilecek kayıt
          </span>
          <select
            v-model.number="itemsPerPage"
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
        :headers="productHeaders"
        :items="tableProducts"
        :loading="loading"
        :page="productPage"
        :items-per-page="itemsPerPage"
        hide-default-footer
        item-value="id"
        loading-text="Ürünler yükleniyor..."
        no-data-text="Bu aramaya uygun ürün bulunamadı."
      >
        <template #item.stock="{ item, value }">
          <span
            class="inline-flex min-w-[132px] items-center justify-center whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-bold"
            :class="getStockBadgeClass(item)"
          >
            {{ getStockChipValue(item, value) }} stok · {{ getStockChipText(item) }}
          </span>
        </template>

        <template #item.actions="{ item }">
          <div class="flex justify-end gap-1">
            <v-btn
              aria-label="Ürünü düzenle"
              class="inventory-row-action"
              icon="mdi-pencil"
              size="small"
              title="Ürünü düzenle"
              variant="text"
              @click="openEditProductDialog(item)"
            />
            <v-btn
              aria-label="Ürünü sil"
              class="inventory-row-action inventory-row-action--danger"
              icon="mdi-delete-outline"
              size="small"
              title="Ürünü sil"
              variant="text"
              @click="openDeleteProductDialog(item)"
            />
          </div>
        </template>

        <template #no-data>
          <div class="inventory-empty-state">
            <div>
              <div class="inventory-empty-state__icon">Ü</div>
              <p class="inventory-empty-state__title">Henüz ürün kaydı yok</p>
              <p class="inventory-empty-state__text">
                İlk ürünü ekleyerek stok, kategori ve tedarikçi takibini başlatabilirsin.
              </p>
              <v-btn
                class="mt-4"
                color="primary"
                prepend-icon="mdi-plus"
                variant="flat"
                @click="openProductDialog"
              >
                İlk ürünü ekle
              </v-btn>
            </div>
          </div>
        </template>

        <template #bottom>
          <div
            v-if="tableProducts.length"
            class="flex flex-col gap-3 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <p class="text-sm text-slate-500">
              {{ productPaginationText }}
            </p>

            <v-pagination
              v-if="productPageCount > 1"
              v-model="productPage"
              :length="productPageCount"
              :total-visible="5"
              density="comfortable"
              rounded="circle"
            />
          </div>
        </template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="productDialog" max-width="760">
      <v-card class="inventory-card overflow-hidden" elevation="0">
        <v-card-title class="px-6 pt-6 text-lg font-bold text-slate-950">
          {{ editingProductId ? "Ürün kartını düzenle" : "Yeni ürün kartı oluştur" }}
        </v-card-title>

        <v-card-subtitle class="px-6 text-slate-500">
          Ürünün katalog bilgisini düzenle. Stok girişi mal kabul ekranından yapılır.
        </v-card-subtitle>

        <v-card-text class="px-6 pt-5">
          <v-alert v-if="formError" class="mb-4" type="error" variant="tonal">
            {{ formError }}
          </v-alert>

          <v-form ref="productFormRef" @submit.prevent="submitProduct">
            <div class="grid gap-x-5 gap-y-5 sm:grid-cols-2">
              <div>
                <span class="inventory-field-label">Ürün adı</span>
                <v-text-field
                  v-model="productForm.name"
                  class="inventory-field"
                  aria-label="Ürün adı"
                  placeholder="Örn: 27 Inch Monitor"
                  hint="Kullanıcının listede göreceği açık ürün adı."
                  persistent-hint
                  variant="outlined"
                  density="comfortable"
                  :rules="[rules.required]"
                />
              </div>

              <div>
                <span class="inventory-field-label">SKU</span>
                <v-text-field
                  v-model="productForm.sku"
                  class="inventory-field"
                  aria-label="SKU"
                  placeholder="Örn: KEY-001"
                  hint="Boşluk kullanma. Kaydedilirken büyük harfe çevrilir."
                  persistent-hint
                  variant="outlined"
                  density="comfortable"
                  :rules="[rules.required, rules.sku]"
                />
              </div>

              <label class="inventory-native-field">
                <span class="mb-1.5 flex items-center justify-between gap-3">
                  <span class="inventory-native-label mb-0">
                    Kategori
                  </span>
                  <button
                    type="button"
                    class="inline-flex h-7 items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                    title="Yeni kategori ekle"
                    @click="openQuickCategoryDialog"
                  >
                    + Ekle
                  </button>
                </span>
                <select
                  v-model="productForm.category"
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
                <p
                  v-if="triedSubmit && !productForm.category"
                  class="inventory-error-text"
                >
                  Kategori seçilmelidir.
                </p>
                <p v-else class="inventory-help-text">
                  Ürünü doğru rafta göstermek için kategori seç.
                </p>
              </label>

              <label class="inventory-native-field">
                <span class="mb-1.5 flex items-center justify-between gap-3">
                  <span class="inventory-native-label mb-0">
                    Tedarikçi
                  </span>
                  <button
                    type="button"
                    class="inline-flex h-7 items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                    title="Yeni tedarikçi ekle"
                    @click="openQuickSupplierDialog"
                  >
                    + Ekle
                  </button>
                </span>
                <select
                  v-model="productForm.supplier"
                  class="inventory-native-select"
                >
                  <option value="" disabled>Tedarikçi seç</option>
                  <option
                    v-for="supplier in activeSuppliers"
                    :key="supplier.id"
                    :value="supplier.id"
                  >
                    {{ supplier.name }}
                  </option>
                </select>
                <p
                  v-if="triedSubmit && !productForm.supplier"
                  class="inventory-error-text"
                >
                  Tedarikçi seçilmelidir.
                </p>
                <p v-else class="inventory-help-text">
                  Satın alma takibi için tedarikçi bilgisi gerekir.
                </p>
              </label>

              <div>
                <span class="inventory-field-label">Satış / liste fiyatı</span>
                <v-text-field
                  v-model="productForm.price"
                  class="inventory-field"
                  aria-label="Satış liste fiyatı"
                  placeholder="Örn: 1250.00"
                  hint="Ürünün ekranda görünecek liste fiyatı. Alış maliyeti mal kabulde girilir."
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

              <div>
                <span class="inventory-field-label">Düşük stok eşiği</span>
                <v-text-field
                  v-model.number="productForm.low_stock_threshold"
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
          <v-btn variant="text" @click="closeProductDialog">
            Vazgeç
          </v-btn>
          <v-btn
            color="primary"
            :loading="creating"
            variant="flat"
            @click="submitProduct"
          >
            {{ editingProductId ? "Değişiklikleri kaydet" : "Ürünü kaydet" }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteProductDialog" max-width="520">
      <v-card class="inventory-card overflow-hidden" elevation="0">
        <v-card-title class="px-6 pt-6 text-lg font-bold text-slate-950">
          Ürünü listeden kaldır
        </v-card-title>

        <v-card-text class="px-6 pt-4 text-slate-600">
          <strong>{{ productToDelete?.name }}</strong> ürününü aktif listeden kaldırmak istiyor musun?
          Eski mal kabul kayıtları korunur.
        </v-card-text>

        <v-card-actions class="gap-2 px-6 pb-6 pt-1">
          <v-btn variant="text" @click="closeDeleteProductDialog">
            Vazgeç
          </v-btn>
          <v-btn
            color="error"
            :loading="deletingProduct"
            variant="flat"
            @click="deleteProduct"
          >
            Ürünü kaldır
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="quickCategoryDialog" max-width="620">
      <v-card class="inventory-card overflow-hidden" elevation="0">
        <v-card-title class="px-6 pt-6 text-lg font-bold text-slate-950">
          Hızlı kategori ekle
        </v-card-title>

        <v-card-subtitle class="px-6 text-slate-500">
          Ürünü kaydederken listede olmayan ürün grubunu ekle.
        </v-card-subtitle>

        <v-card-text class="px-6 pt-5">
          <v-alert
            v-if="quickCategoryError"
            class="mb-4"
            type="error"
            variant="tonal"
          >
            {{ quickCategoryError }}
          </v-alert>

          <v-form ref="quickCategoryFormRef" @submit.prevent="submitQuickCategory">
            <div class="grid gap-y-5">
              <div>
                <span class="inventory-field-label">Kategori adı</span>
                <v-text-field
                  v-model="quickCategoryForm.name"
                  class="inventory-field"
                  aria-label="Kategori adı"
                  placeholder="Örn: Temizlik ürünleri"
                  hint="Ürünleri daha kolay gruplamak için kısa ve açık bir ad yaz."
                  persistent-hint
                  variant="outlined"
                  density="comfortable"
                  :rules="[rules.required]"
                />
              </div>

              <label class="inventory-native-field">
                <span class="inventory-native-label">Açıklama</span>
                <textarea
                  v-model="quickCategoryForm.description"
                  class="inventory-native-textarea"
                  placeholder="Örn: Deterjan, bez, kağıt havlu gibi düzenli tüketilen ürünler."
                />
              </label>
            </div>
          </v-form>
        </v-card-text>

        <v-card-actions class="gap-2 px-6 pb-6 pt-1">
          <v-btn variant="text" @click="closeQuickCategoryDialog">
            Vazgeç
          </v-btn>
          <v-btn
            color="primary"
            :loading="creatingCategory"
            variant="flat"
            @click="submitQuickCategory"
          >
            Kategoriyi ekle
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="quickSupplierDialog" max-width="620">
      <v-card class="inventory-card overflow-hidden" elevation="0">
        <v-card-title class="px-6 pt-6 text-lg font-bold text-slate-950">
          Hızlı tedarikçi ekle
        </v-card-title>

        <v-card-subtitle class="px-6 text-slate-500">
          Ürünü kaydederken listede olmayan anlaşmalı firmayı ekle.
        </v-card-subtitle>

        <v-card-text class="px-6 pt-5">
          <v-alert
            v-if="quickSupplierError"
            class="mb-4"
            type="error"
            variant="tonal"
          >
            {{ quickSupplierError }}
          </v-alert>

          <v-form ref="quickSupplierFormRef" @submit.prevent="submitQuickSupplier">
            <div class="grid gap-x-5 gap-y-5 sm:grid-cols-2">
              <div class="sm:col-span-2">
                <span class="inventory-field-label">Firma adı</span>
                <v-text-field
                  v-model="quickSupplierForm.name"
                  class="inventory-field"
                  aria-label="Firma adı"
                  placeholder="Örn: B Kırtasiye"
                  hint="Yeni ürünün bağlı olacağı tedarikçi adı."
                  persistent-hint
                  variant="outlined"
                  density="comfortable"
                  :rules="[rules.required]"
                />
              </div>

              <div>
                <span class="inventory-field-label">Hizmet alanı</span>
                <v-text-field
                  v-model="quickSupplierForm.sector"
                  class="inventory-field"
                  aria-label="Hizmet alanı"
                  placeholder="Örn: Kırtasiye"
                  variant="outlined"
                  density="comfortable"
                />
              </div>

              <div>
                <span class="inventory-field-label">Telefon</span>
                <v-text-field
                  v-model="quickSupplierForm.phone"
                  class="inventory-field"
                  aria-label="Telefon"
                  placeholder="Örn: 0212 000 00 00"
                  variant="outlined"
                  density="comfortable"
                />
              </div>

              <div class="sm:col-span-2">
                <span class="inventory-field-label">E-posta</span>
                <v-text-field
                  v-model="quickSupplierForm.email"
                  class="inventory-field"
                  aria-label="E-posta"
                  placeholder="Örn: satis@bkirtasiye.com"
                  variant="outlined"
                  density="comfortable"
                  :rules="[rules.email]"
                />
              </div>
            </div>
          </v-form>
        </v-card-text>

        <v-card-actions class="gap-2 px-6 pb-6 pt-1">
          <v-btn variant="text" @click="closeQuickSupplierDialog">
            Vazgeç
          </v-btn>
          <v-btn
            color="primary"
            :loading="creatingSupplier"
            variant="flat"
            @click="submitQuickSupplier"
          >
            Tedarikçiyi ekle
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="successSnackbar" color="success" timeout="3000">
      {{ successMessage }}
    </v-snackbar>
  </section>
</template>
