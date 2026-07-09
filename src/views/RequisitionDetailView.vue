<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { requisitionService } from "../services/requisitionService";

const route = useRoute();
const router = useRouter();
const request = ref(null);
const loading = ref(false);
const error = ref("");

const items = computed(() => request.value?.items || []);

const totalQuantity = computed(() =>
  items.value.reduce((total, item) => total + Number(item.quantity || 0), 0),
);

const deliveredQuantity = computed(() =>
  items.value.reduce(
    (total, item) => total + Number(item.delivered_quantity || 0),
    0,
  ),
);

const requestDate = computed(() => {
  if (!request.value?.created_at) {
    return "-";
  }

  return new Date(request.value.created_at).toLocaleString("tr-TR");
});

const fulfilledDate = computed(() => {
  if (!request.value?.fulfilled_at) {
    return "Henüz teslim edilmedi";
  }

  return new Date(request.value.fulfilled_at).toLocaleString("tr-TR");
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

function getStockClass(item) {
  if (Number(item.current_stock || 0) < Number(item.quantity || 0)) {
    return "text-amber-700";
  }

  return "text-emerald-700";
}

async function fetchRequest() {
  loading.value = true;
  error.value = "";

  try {
    request.value = await requisitionService.detail(route.params.id);
  } catch {
    error.value = "Talep detayı yüklenemedi.";
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchRequest();
});
</script>

<template>
  <section class="space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <button
          type="button"
          class="mb-2 inline-flex items-center gap-1 text-sm font-bold text-slate-500 transition hover:text-blue-700"
          @click="router.push({ name: 'requisitions' })"
        >
          <v-icon icon="mdi-arrow-left" size="18" />
          Taleplere dön
        </button>
        <h2 class="text-xl font-bold text-slate-950">Talep detayı</h2>
        <p class="text-sm text-slate-500">
          Bu talepte hangi ürünlerin istendiğini, miktarları ve teslim durumunu incele.
        </p>
      </div>
    </div>

    <v-alert v-if="error" type="error" variant="tonal">
      {{ error }}
    </v-alert>

    <v-progress-linear v-if="loading" color="primary" indeterminate />

    <template v-else-if="request">
      <div class="grid gap-4 md:grid-cols-4">
        <article class="inventory-card p-5">
          <p class="text-sm font-medium text-slate-500">Birim</p>
          <p class="mt-2 text-lg font-bold text-slate-950">
            {{ request.department }}
          </p>
          <p class="mt-1 text-sm text-slate-500">
            {{ request.requester_name }}
          </p>
        </article>

        <article class="inventory-card p-5">
          <p class="text-sm font-medium text-slate-500">Durum</p>
          <span
            class="mt-3 inline-flex rounded-full border px-3 py-1.5 text-xs font-bold"
            :class="getStatusClass(request.status)"
          >
            {{ request.status_label }}
          </span>
          <p class="mt-2 text-sm text-slate-500">
            {{ fulfilledDate }}
          </p>
        </article>

        <article class="inventory-card p-5">
          <p class="text-sm font-medium text-slate-500">Toplam adet</p>
          <p class="mt-2 text-3xl font-bold text-slate-950">
            {{ totalQuantity }}
          </p>
          <p class="mt-1 text-sm text-slate-500">
            {{ items.length }} kalem ürün
          </p>
        </article>

        <article class="inventory-card p-5">
          <p class="text-sm font-medium text-slate-500">Teslim edilen</p>
          <p class="mt-2 text-3xl font-bold text-slate-950">
            {{ deliveredQuantity }}
          </p>
          <p class="mt-1 text-sm text-slate-500">
            {{ requestDate }}
          </p>
        </article>
      </div>

      <v-card class="inventory-card overflow-hidden" elevation="0">
        <div class="inventory-section-header border-b border-slate-200">
          <h3 class="font-bold text-slate-950">İstenen ürünler</h3>
          <p class="text-sm text-slate-500">
            Her satır bu talep içinde istenen ürünü ve stok durumunu gösterir.
          </p>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200 text-sm">
            <thead class="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
              <tr>
                <th class="px-6 py-4">Ürün</th>
                <th class="px-6 py-4">SKU</th>
                <th class="px-6 py-4 text-right">İstenen</th>
                <th class="px-6 py-4 text-right">Teslim edilen</th>
                <th class="px-6 py-4 text-right">Mevcut stok</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr
                v-for="item in items"
                :key="item.id"
                class="transition hover:bg-slate-50"
              >
                <td class="px-6 py-4 font-semibold text-slate-900">
                  {{ item.product_name }}
                </td>
                <td class="px-6 py-4 text-slate-600">
                  {{ item.sku }}
                </td>
                <td class="px-6 py-4 text-right font-bold text-slate-900">
                  {{ item.quantity }}
                </td>
                <td class="px-6 py-4 text-right text-slate-600">
                  {{ item.delivered_quantity }}
                </td>
                <td class="px-6 py-4 text-right font-bold" :class="getStockClass(item)">
                  {{ item.current_stock }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </v-card>

      <v-card class="inventory-card p-5" elevation="0">
        <p class="text-sm font-medium text-slate-500">Not</p>
        <p class="mt-2 text-sm leading-6 text-slate-700">
          {{ request.note || "Bu talep için not girilmemiş." }}
        </p>
      </v-card>
    </template>
  </section>
</template>
