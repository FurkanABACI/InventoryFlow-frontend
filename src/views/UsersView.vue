<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { userService } from "../services/userService";

const users = ref([]);
const loading = ref(false);
const saving = ref(false);
const deletingUser = ref(false);
const userDialog = ref(false);
const deleteUserDialog = ref(false);
const userFormRef = ref(null);
const search = ref("");
const itemsPerPage = ref(10);
const userPage = ref(1);
const error = ref("");
const formError = ref("");
const successMessage = ref("");
const successSnackbar = ref(false);
const editingUserId = ref(null);
const userToDelete = ref(null);

const userForm = reactive({
  username: "",
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  role: "department",
  department: "",
  is_active: true,
});

const userHeaders = [
  { title: "Kullanıcı", key: "full_name" },
  { title: "Kullanıcı adı", key: "username" },
  { title: "Rol", key: "role_label" },
  { title: "Birim", key: "department_value" },
  { title: "Durum", key: "status" },
  { title: "İşlemler", key: "actions", sortable: false, align: "end" },
];

const roleOptions = [
  { title: "Birim Kullanıcısı", value: "department" },
  { title: "İdari İşler", value: "operations" },
  { title: "Admin", value: "admin" },
];

const itemsPerPageOptions = [
  { title: "10 kayıt", value: 10 },
  { title: "25 kayıt", value: 25 },
  { title: "50 kayıt", value: 50 },
  { title: "Tüm kayıtlar", value: -1 },
];

const rules = {
  required: (value) => Boolean(String(value ?? "").trim()) || "Bu alan zorunludur.",
  password: (value) =>
    editingUserId.value ||
    String(value ?? "").length >= 6 ||
    "Şifre en az 6 karakter olmalıdır.",
  email: (value) =>
    !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value)) || "Geçerli bir e-posta yaz.",
};

const tableUsers = computed(() => {
  const searchText = search.value.trim().toLowerCase();

  return users.value
    .map((user) => ({
      ...user,
      role_label: user.role_label || "-",
      department_value: user.department_value || "-",
      status: user.is_active ? "Aktif" : "Pasif",
    }))
    .filter((user) => {
      if (!searchText) {
        return true;
      }

      return [
        user.full_name,
        user.username,
        user.email,
        user.role_label,
        user.department_value,
      ].some((field) => String(field).toLowerCase().includes(searchText));
    });
});

const pageCount = computed(() => {
  if (itemsPerPage.value === -1) {
    return 1;
  }

  return Math.max(1, Math.ceil(tableUsers.value.length / itemsPerPage.value));
});

const paginationText = computed(() => {
  const total = tableUsers.value.length;

  if (total === 0) {
    return "Gösterilecek kullanıcı yok.";
  }

  if (itemsPerPage.value === -1) {
    return `${total} kullanıcının tamamı gösteriliyor.`;
  }

  const start = (userPage.value - 1) * itemsPerPage.value + 1;
  const end = Math.min(userPage.value * itemsPerPage.value, total);

  return `${total} kullanıcıdan ${start}-${end} arası gösteriliyor.`;
});

watch([search, itemsPerPage], () => {
  userPage.value = 1;
});

watch(pageCount, (count) => {
  if (userPage.value > count) {
    userPage.value = count;
  }
});

function getTableItem(item) {
  return item?.raw || item;
}

function resetUserForm() {
  editingUserId.value = null;
  userForm.username = "";
  userForm.first_name = "";
  userForm.last_name = "";
  userForm.email = "";
  userForm.password = "";
  userForm.role = "department";
  userForm.department = "";
  userForm.is_active = true;
  formError.value = "";
  userFormRef.value?.resetValidation();
}

function openUserDialog() {
  resetUserForm();
  userDialog.value = true;
}

function openEditUserDialog(item) {
  const user = getTableItem(item);

  resetUserForm();
  editingUserId.value = user.id;
  userForm.username = user.username || "";
  userForm.first_name = user.first_name || "";
  userForm.last_name = user.last_name || "";
  userForm.email = user.email || "";
  userForm.role = user.role_value || "department";
  userForm.department = user.department_value === "-" ? "" : user.department_value || "";
  userForm.is_active = user.is_active !== false;
  userDialog.value = true;
}

function closeUserDialog() {
  userDialog.value = false;
  resetUserForm();
}

function openDeleteUserDialog(item) {
  userToDelete.value = getTableItem(item);
  deleteUserDialog.value = true;
}

function closeDeleteUserDialog() {
  userToDelete.value = null;
  deleteUserDialog.value = false;
}

function getErrorMessage(error) {
  const data = error.response?.data;

  if (!data) {
    return "Kullanıcı işlemi sırasında bağlantı sorunu oluştu.";
  }

  if (typeof data === "string") {
    return data;
  }

  const firstKey = Object.keys(data)[0];
  const firstValue = data[firstKey];
  const message = Array.isArray(firstValue) ? firstValue[0] : firstValue;

  return `${firstKey}: ${message}`;
}

async function fetchUsers() {
  loading.value = true;
  error.value = "";

  try {
    const data = await userService.list();
    users.value = data.results || data;
  } catch {
    error.value = "Kullanıcılar yüklenemedi.";
  } finally {
    loading.value = false;
  }
}

async function submitUser() {
  formError.value = "";
  const result = await userFormRef.value?.validate();

  if (!result?.valid) {
    formError.value = "Kullanıcı adı, rol ve şifre alanlarını kontrol et.";
    return;
  }

  saving.value = true;

  try {
    const payload = {
      username: userForm.username.trim(),
      first_name: userForm.first_name.trim(),
      last_name: userForm.last_name.trim(),
      email: userForm.email.trim(),
      role: userForm.role,
      department: userForm.department.trim(),
      is_active: userForm.is_active,
    };

    if (userForm.password) {
      payload.password = userForm.password;
    }

    if (editingUserId.value) {
      await userService.update(editingUserId.value, payload);
      successMessage.value = "Kullanıcı bilgileri güncellendi.";
    } else {
      await userService.create(payload);
      successMessage.value = "Yeni kullanıcı sisteme eklendi.";
    }

    await fetchUsers();
    successSnackbar.value = true;
    closeUserDialog();
  } catch (error) {
    formError.value = getErrorMessage(error);
  } finally {
    saving.value = false;
  }
}

async function deactivateUser() {
  if (!userToDelete.value) {
    return;
  }

  deletingUser.value = true;

  try {
    await userService.deactivate(userToDelete.value.id);
    await fetchUsers();
    successMessage.value = "Kullanıcı pasif duruma alındı.";
    successSnackbar.value = true;
    closeDeleteUserDialog();
  } catch (error) {
    formError.value = getErrorMessage(error);
  } finally {
    deletingUser.value = false;
  }
}

onMounted(() => {
  fetchUsers();
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
          <h2 class="font-bold text-slate-950">Kullanıcılar</h2>
          <p class="text-sm text-slate-500">
            Personel hesaplarını, birimlerini ve uygulama rollerini yönet.
          </p>
        </div>

        <v-btn color="primary" prepend-icon="mdi-plus" variant="flat" @click="openUserDialog">
          Yeni kullanıcı
        </v-btn>
      </div>

      <v-divider />

      <div class="grid gap-4 px-6 py-5 lg:grid-cols-[minmax(0,1fr)_210px] lg:items-start">
        <div>
          <span class="inventory-field-label">Kullanıcı ara</span>
          <v-text-field
            v-model="search"
            class="inventory-field"
            aria-label="Kullanıcı ara"
            placeholder="Örn: yemekhane, idari işler, Ayşe"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="comfortable"
            clearable
            hide-details
          />
        </div>

        <label class="inventory-native-field">
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
        :headers="userHeaders"
        :items="tableUsers"
        :items-per-page="itemsPerPage"
        :loading="loading"
        :page="userPage"
        hide-default-footer
        item-value="id"
        loading-text="Kullanıcılar yükleniyor..."
        no-data-text="Kayıtlı kullanıcı bulunamadı."
      >
        <template #item.status="{ item }">
          <span
            class="inline-flex min-w-[78px] justify-center rounded-full border px-3 py-1.5 text-xs font-bold"
            :class="getTableItem(item).is_active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-600'"
          >
            {{ getTableItem(item).status }}
          </span>
        </template>

        <template #item.actions="{ item }">
          <div class="flex justify-end gap-1">
            <v-btn
              aria-label="Kullanıcıyı düzenle"
              class="inventory-row-action"
              icon="mdi-pencil"
              size="small"
              title="Kullanıcıyı düzenle"
              variant="text"
              @click="openEditUserDialog(item)"
            />
            <v-btn
              aria-label="Kullanıcıyı pasifleştir"
              class="inventory-row-action inventory-row-action--danger"
              icon="mdi-account-off-outline"
              size="small"
              title="Kullanıcıyı pasifleştir"
              variant="text"
              @click="openDeleteUserDialog(item)"
            />
          </div>
        </template>

        <template #bottom>
          <div
            v-if="tableUsers.length"
            class="flex flex-col gap-3 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <p class="text-sm text-slate-500">
              {{ paginationText }}
            </p>

            <v-pagination
              v-if="pageCount > 1"
              v-model="userPage"
              :length="pageCount"
              :total-visible="5"
              density="comfortable"
              rounded="circle"
            />
          </div>
        </template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="userDialog" max-width="760">
      <v-card class="inventory-card overflow-hidden" elevation="0">
        <v-card-title class="px-6 pt-6 text-lg font-bold text-slate-950">
          {{ editingUserId ? "Kullanıcıyı düzenle" : "Yeni kullanıcı ekle" }}
        </v-card-title>

        <v-card-subtitle class="px-6 text-slate-500">
          Kullanıcının giriş bilgilerini, birimini ve uygulama rolünü belirle.
        </v-card-subtitle>

        <v-card-text class="px-6 pt-5">
          <v-alert v-if="formError" class="mb-4" type="error" variant="tonal">
            {{ formError }}
          </v-alert>

          <v-form ref="userFormRef" @submit.prevent="submitUser">
            <div class="grid gap-x-5 gap-y-5 sm:grid-cols-2">
              <div>
                <span class="inventory-field-label">Kullanıcı adı</span>
                <v-text-field
                  v-model="userForm.username"
                  class="inventory-field"
                  aria-label="Kullanıcı adı"
                  placeholder="Örn: yemekhane"
                  variant="outlined"
                  density="comfortable"
                  :rules="[rules.required]"
                />
              </div>

              <div>
                <span class="inventory-field-label">Şifre</span>
                <v-text-field
                  v-model="userForm.password"
                  class="inventory-field"
                  aria-label="Şifre"
                  :placeholder="editingUserId ? 'Değişmeyecekse boş bırak' : 'En az 6 karakter'"
                  type="password"
                  variant="outlined"
                  density="comfortable"
                  :rules="[rules.password]"
                />
              </div>

              <div>
                <span class="inventory-field-label">Ad</span>
                <v-text-field
                  v-model="userForm.first_name"
                  class="inventory-field"
                  aria-label="Ad"
                  placeholder="Örn: Ayşe"
                  variant="outlined"
                  density="comfortable"
                />
              </div>

              <div>
                <span class="inventory-field-label">Soyad</span>
                <v-text-field
                  v-model="userForm.last_name"
                  class="inventory-field"
                  aria-label="Soyad"
                  placeholder="Örn: Demir"
                  variant="outlined"
                  density="comfortable"
                />
              </div>

              <div>
                <span class="inventory-field-label">E-posta</span>
                <v-text-field
                  v-model="userForm.email"
                  class="inventory-field"
                  aria-label="E-posta"
                  placeholder="Örn: ayse@firma.com"
                  variant="outlined"
                  density="comfortable"
                  :rules="[rules.email]"
                />
              </div>

              <label class="inventory-native-field">
                <span class="inventory-native-label">Rol</span>
                <select v-model="userForm.role" class="inventory-native-select">
                  <option
                    v-for="role in roleOptions"
                    :key="role.value"
                    :value="role.value"
                  >
                    {{ role.title }}
                  </option>
                </select>
              </label>

              <div>
                <span class="inventory-field-label">Birim</span>
                <v-text-field
                  v-model="userForm.department"
                  class="inventory-field"
                  aria-label="Birim"
                  placeholder="Örn: Yemekhane, Yazılım"
                  variant="outlined"
                  density="comfortable"
                />
              </div>

              <v-checkbox
                v-model="userForm.is_active"
                color="primary"
                label="Kullanıcı aktif"
                hide-details
              />
            </div>
          </v-form>
        </v-card-text>

        <v-card-actions class="gap-2 px-6 pb-6 pt-1">
          <v-btn variant="text" @click="closeUserDialog">
            Vazgeç
          </v-btn>
          <v-btn color="primary" :loading="saving" variant="flat" @click="submitUser">
            {{ editingUserId ? "Değişiklikleri kaydet" : "Kullanıcıyı kaydet" }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteUserDialog" max-width="520">
      <v-card class="inventory-card overflow-hidden" elevation="0">
        <v-card-title class="px-6 pt-6 text-lg font-bold text-slate-950">
          Kullanıcıyı pasifleştir
        </v-card-title>

        <v-card-text class="px-6 pt-4 text-slate-600">
          <strong>{{ userToDelete?.full_name }}</strong> kullanıcısını pasif duruma almak istiyor musun?
          Bu kişi artık sisteme giriş yapamaz.
        </v-card-text>

        <v-card-actions class="gap-2 px-6 pb-6 pt-1">
          <v-btn variant="text" @click="closeDeleteUserDialog">
            Vazgeç
          </v-btn>
          <v-btn color="error" :loading="deletingUser" variant="flat" @click="deactivateUser">
            Kullanıcıyı pasifleştir
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="successSnackbar" color="success" timeout="3000">
      {{ successMessage }}
    </v-snackbar>
  </section>
</template>
