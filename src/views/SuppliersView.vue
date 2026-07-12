<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { catalogService } from "../services/catalogService";

const { t } = useI18n();
const suppliers = ref([]);
const loading = ref(false);
const creating = ref(false);
const deletingSupplier = ref(false);
const supplierDialog = ref(false);
const deleteSupplierDialog = ref(false);
const supplierFormRef = ref(null);
const search = ref("");
const supplierItemsPerPage = ref(10);
const supplierPage = ref(1);
const error = ref("");
const formError = ref("");
const successMessage = ref("");
const successSnackbar = ref(false);
const editingSupplierId = ref(null);
const supplierToDelete = ref(null);

const supplierForm = reactive({
  name: "",
  sector: "",
  email: "",
  phone: "",
  address: "",
  note: "",
});

const supplierHeaders = computed(() => [
  { title: t("pages.suppliers.company"), key: "name" },
  { title: t("pages.suppliers.sector"), key: "sector" },
  { title: t("pages.suppliers.email"), key: "email" },
  { title: t("pages.suppliers.phone"), key: "phone" },
  { title: t("pages.suppliers.status"), key: "status" },
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
  email: (value) =>
    !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value)) || t("validation.email"),
};

function getCreatedTime(item) {
  return new Date(item.created_at || 0).getTime();
}

const tableSuppliers = computed(() => {
  const searchText = search.value.trim().toLowerCase();

  return suppliers.value
    .map((supplier) => ({
      ...supplier,
      sector: supplier.sector || "-",
      email: supplier.email || "-",
      phone: supplier.phone || "-",
      status: supplier.is_active === false ? "Pasif" : "Aktif",
    }))
    .filter((supplier) => {
      if (!searchText) {
        return true;
      }

      return [
        supplier.name,
        supplier.sector,
        supplier.email,
        supplier.phone,
      ].some((field) => String(field).toLowerCase().includes(searchText));
    })
    .sort((a, b) => getCreatedTime(b) - getCreatedTime(a));
});

const supplierPageCount = computed(() => {
  if (supplierItemsPerPage.value === -1) {
    return 1;
  }

  return Math.max(1, Math.ceil(tableSuppliers.value.length / supplierItemsPerPage.value));
});

const supplierPaginationText = computed(() => {
  const total = tableSuppliers.value.length;

  if (total === 0) {
    return "Gösterilecek kayıt yok.";
  }

  if (supplierItemsPerPage.value === -1) {
    return `${total} kaydın tamamı gösteriliyor.`;
  }

  const start = (supplierPage.value - 1) * supplierItemsPerPage.value + 1;
  const end = Math.min(supplierPage.value * supplierItemsPerPage.value, total);

  return `${total} kayıttan ${start}-${end} arası gösteriliyor.`;
});

watch([search, supplierItemsPerPage], () => {
  supplierPage.value = 1;
});

watch(supplierPageCount, (pageCount) => {
  if (supplierPage.value > pageCount) {
    supplierPage.value = pageCount;
  }
});

function resetSupplierForm() {
  editingSupplierId.value = null;
  supplierForm.name = "";
  supplierForm.sector = "";
  supplierForm.email = "";
  supplierForm.phone = "";
  supplierForm.address = "";
  supplierForm.note = "";
  formError.value = "";
  supplierFormRef.value?.resetValidation();
}

function openSupplierDialog() {
  resetSupplierForm();
  supplierDialog.value = true;
}

function openEditSupplierDialog(item) {
  const supplier = item?.raw || item;

  resetSupplierForm();
  editingSupplierId.value = supplier.id;
  supplierForm.name = supplier.name || "";
  supplierForm.sector = supplier.sector === "-" ? "" : supplier.sector || "";
  supplierForm.email = supplier.email === "-" ? "" : supplier.email || "";
  supplierForm.phone = supplier.phone === "-" ? "" : supplier.phone || "";
  supplierForm.address = supplier.address || "";
  supplierForm.note = supplier.note || "";
  supplierDialog.value = true;
}

function closeSupplierDialog() {
  supplierDialog.value = false;
  resetSupplierForm();
}

function openDeleteSupplierDialog(item) {
  supplierToDelete.value = item?.raw || item;
  deleteSupplierDialog.value = true;
}

function closeDeleteSupplierDialog() {
  supplierToDelete.value = null;
  deleteSupplierDialog.value = false;
}

function getErrorMessage(error) {
  const data = error.response?.data;

  if (!data) {
    return "Tedarikçi kaydedilirken bağlantı sorunu oluştu.";
  }

  if (typeof data === "string") {
    return data;
  }

  const firstKey = Object.keys(data)[0];
  const firstValue = data[firstKey];
  const message = Array.isArray(firstValue) ? firstValue[0] : firstValue;

  return `${firstKey}: ${message}`;
}

async function fetchSuppliers() {
  loading.value = true;
  error.value = "";

  try {
    const data = await catalogService.suppliers();
    suppliers.value = data.results || data;
  } catch {
    error.value = "Tedarikçiler yüklenemedi.";
  } finally {
    loading.value = false;
  }
}

async function submitSupplier() {
  formError.value = "";
  const result = await supplierFormRef.value?.validate();

  if (!result?.valid) {
    formError.value = "Firma adı ve e-posta alanlarını kontrol et.";
    return;
  }

  creating.value = true;

  try {
    const payload = {
      name: supplierForm.name.trim(),
      sector: supplierForm.sector.trim(),
      email: supplierForm.email.trim(),
      phone: supplierForm.phone.trim(),
      address: supplierForm.address.trim(),
      note: supplierForm.note.trim(),
    };

    if (editingSupplierId.value) {
      await catalogService.updateSupplier(editingSupplierId.value, payload);
      successMessage.value = "Tedarikçi bilgileri güncellendi.";
    } else {
      await catalogService.createSupplier(payload);
      successMessage.value = "Tedarikçi anlaşmalı firma listesine eklendi.";
    }

    await fetchSuppliers();
    successSnackbar.value = true;
    closeSupplierDialog();
  } catch (error) {
    formError.value = getErrorMessage(error);
  } finally {
    creating.value = false;
  }
}

async function deleteSupplier() {
  if (!supplierToDelete.value) {
    return;
  }

  deletingSupplier.value = true;

  try {
    await catalogService.deactivateSupplier(supplierToDelete.value.id);
    await fetchSuppliers();
    successMessage.value = "Tedarikçi aktif listeden kaldırıldı.";
    successSnackbar.value = true;
    closeDeleteSupplierDialog();
  } catch (error) {
    formError.value = getErrorMessage(error);
  } finally {
    deletingSupplier.value = false;
  }
}

onMounted(() => {
  fetchSuppliers();
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
          <h2 class="font-bold text-slate-950">{{ t('pages.suppliers.title') }}</h2>
          <p class="text-sm text-slate-500">
            {{ t('pages.suppliers.subtitle') }}
          </p>
        </div>

        <v-btn color="primary" prepend-icon="mdi-plus" variant="flat" @click="openSupplierDialog">
          {{ t('pages.suppliers.newSupplier') }}
        </v-btn>
      </div>

      <v-divider />

      <div
        class="grid gap-4 px-6 py-5 lg:grid-cols-[minmax(0,1fr)_210px] lg:items-start"
      >
        <div>
          <span class="inventory-field-label">{{ t('pages.suppliers.searchLabel') }}</span>
          <v-text-field
            v-model="search"
            class="inventory-field"
            :aria-label="t('pages.suppliers.searchLabel')"
            :placeholder="t('pages.suppliers.searchPlaceholder')"
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
            v-model.number="supplierItemsPerPage"
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
        :headers="supplierHeaders"
        :items="tableSuppliers"
        :loading="loading"
        :page="supplierPage"
        :items-per-page="supplierItemsPerPage"
        hide-default-footer
        item-value="id"
        :loading-text="t('pages.suppliers.loading')"
        :no-data-text="t('pages.suppliers.noData')"
      >
        <template #item.actions="{ item }">
          <div class="flex justify-end gap-1">
            <v-btn
              aria-label="Tedarikçiyi düzenle"
              class="inventory-row-action"
              icon="mdi-pencil"
              size="small"
              title="Tedarikçiyi düzenle"
              variant="text"
              @click="openEditSupplierDialog(item)"
            />
            <v-btn
              aria-label="Tedarikçiyi sil"
              class="inventory-row-action inventory-row-action--danger"
              icon="mdi-delete-outline"
              size="small"
              title="Tedarikçiyi sil"
              variant="text"
              @click="openDeleteSupplierDialog(item)"
            />
          </div>
        </template>

        <template #no-data>
          <div class="inventory-empty-state">
            <div>
              <div class="inventory-empty-state__icon">T</div>
              <p class="inventory-empty-state__title">Henüz tedarikçi yok</p>
              <p class="inventory-empty-state__text">
                Anlaşmalı firmaları ekleyerek ürün girişlerini ve mal kabul kayıtlarını daha düzenli takip edebilirsin.
              </p>
              <v-btn
                class="mt-4"
                color="primary"
                prepend-icon="mdi-plus"
                variant="flat"
                @click="openSupplierDialog"
              >
                İlk tedarikçiyi ekle
              </v-btn>
            </div>
          </div>
        </template>

        <template #bottom>
          <div
            v-if="tableSuppliers.length"
            class="flex flex-col gap-3 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <p class="text-sm text-slate-500">
              {{ supplierPaginationText }}
            </p>

            <v-pagination
              v-if="supplierPageCount > 1"
              v-model="supplierPage"
              :length="supplierPageCount"
              :total-visible="5"
              density="comfortable"
              rounded="circle"
            />
          </div>
        </template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="supplierDialog" max-width="720">
      <v-card class="inventory-card overflow-hidden" elevation="0">
        <v-card-title class="px-6 pt-6 text-lg font-bold text-slate-950">
          {{ editingSupplierId ? "Tedarikçiyi düzenle" : "Yeni tedarikçi ekle" }}
        </v-card-title>

        <v-card-subtitle class="px-6 text-slate-500">
          Anlaşma yapılan firmanın iletişim, adres ve hizmet bilgilerini kaydet.
        </v-card-subtitle>

        <v-card-text class="px-6 pt-5">
          <v-alert v-if="formError" class="mb-4" type="error" variant="tonal">
            {{ formError }}
          </v-alert>

          <v-form ref="supplierFormRef" @submit.prevent="submitSupplier">
            <div class="grid gap-x-5 gap-y-5 sm:grid-cols-2">
              <div>
                <span class="inventory-field-label">Firma adı</span>
                <v-text-field
                  v-model="supplierForm.name"
                  class="inventory-field"
                  aria-label="Firma adı"
                  placeholder="Örn: A Temizlik Hizmetleri"
                  hint="Listede görünecek resmi veya anlaşmalı firma adı."
                  persistent-hint
                  variant="outlined"
                  density="comfortable"
                  :rules="[rules.required]"
                />
              </div>

              <div>
                <span class="inventory-field-label">Hizmet alanı</span>
                <v-text-field
                  v-model="supplierForm.sector"
                  class="inventory-field"
                  aria-label="Hizmet alanı"
                  placeholder="Örn: Temizlik, kırtasiye"
                  hint="Firmanın düzenli ürün sağladığı alan."
                  persistent-hint
                  variant="outlined"
                  density="comfortable"
                />
              </div>

              <div>
                <span class="inventory-field-label">E-posta</span>
                <v-text-field
                  v-model="supplierForm.email"
                  class="inventory-field"
                  aria-label="E-posta"
                  placeholder="Örn: satis@atedarik.com"
                  variant="outlined"
                  density="comfortable"
                  :rules="[rules.email]"
                />
              </div>

              <div>
                <span class="inventory-field-label">Telefon</span>
                <v-text-field
                  v-model="supplierForm.phone"
                  class="inventory-field"
                  aria-label="Telefon"
                  placeholder="Örn: 0212 000 00 00"
                  variant="outlined"
                  density="comfortable"
                />
              </div>

              <label class="inventory-native-field sm:col-span-2">
                <span class="inventory-native-label">Adres</span>
                <textarea
                  v-model="supplierForm.address"
                  class="inventory-native-textarea"
                  placeholder="Firmanın adresi veya teslimat notu"
                />
              </label>

              <label class="inventory-native-field sm:col-span-2">
                <span class="inventory-native-label">Not</span>
                <textarea
                  v-model="supplierForm.note"
                  class="inventory-native-textarea"
                  placeholder="Örn: Haftalık temizlik ürünleri bu firmadan alınır."
                />
              </label>
            </div>
          </v-form>
        </v-card-text>

        <v-card-actions class="gap-2 px-6 pb-6 pt-1">
          <v-btn variant="text" @click="closeSupplierDialog">
            Vazgeç
          </v-btn>
          <v-btn color="primary" :loading="creating" variant="flat" @click="submitSupplier">
            {{ editingSupplierId ? "Değişiklikleri kaydet" : "Tedarikçiyi kaydet" }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteSupplierDialog" max-width="520">
      <v-card class="inventory-card overflow-hidden" elevation="0">
        <v-card-title class="px-6 pt-6 text-lg font-bold text-slate-950">
          Tedarikçiyi listeden kaldır
        </v-card-title>

        <v-card-text class="px-6 pt-4 text-slate-600">
          <strong>{{ supplierToDelete?.name }}</strong> tedarikçisini aktif listeden kaldırmak istiyor musun?
          Eski ürün ve mal kabul kayıtları korunur.
        </v-card-text>

        <v-card-actions class="gap-2 px-6 pb-6 pt-1">
          <v-btn variant="text" @click="closeDeleteSupplierDialog">
            Vazgeç
          </v-btn>
          <v-btn
            color="error"
            :loading="deletingSupplier"
            variant="flat"
            @click="deleteSupplier"
          >
            Tedarikçiyi kaldır
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="successSnackbar" color="success" timeout="3000">
      {{ successMessage }}
    </v-snackbar>
  </section>
</template>
