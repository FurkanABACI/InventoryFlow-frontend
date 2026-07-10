<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { receivingService } from "../services/receivingService";

const route = useRoute();
const router = useRouter();
const receipt = ref(null);
const loading = ref(false);
const error = ref("");

const items = computed(() => receipt.value?.items || []);

const totalQuantity = computed(() =>
  items.value.reduce((total, item) => total + Number(item.quantity || 0), 0),
);

const totalCost = computed(() =>
  items.value.reduce(
    (total, item) => total + Number(item.quantity || 0) * Number(item.unit_cost || 0),
    0,
  ),
);

const receivedDate = computed(() => {
  if (!receipt.value?.received_at) {
    return "-";
  }

  return new Date(receipt.value.received_at).toLocaleString("tr-TR");
});

function formatMoney(value) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(Number(value || 0));
}

async function fetchReceipt() {
  loading.value = true;
  error.value = "";

  try {
    receipt.value = await receivingService.detail(route.params.id);
  } catch {
    error.value = "Mal kabul detayı yüklenemedi.";
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchReceipt();
});
</script>

<template>
  <section class="space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <button
          type="button"
          class="mb-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          @click="router.push({ name: 'receiving' })"
        >
          <span class="grid h-6 w-6 place-items-center rounded-md bg-slate-100">
            <v-icon icon="mdi-arrow-left" size="18" />
          </span>
          Listeye dön
        </button>
        <h2 class="text-xl font-bold text-slate-950">Mal kabul detayı</h2>
        <p class="text-sm text-slate-500">
          Bu kayıtta depoya hangi ürünlerin girdiğini ve maliyetlerini incele.
        </p>
      </div>
    </div>

    <v-alert v-if="error" type="error" variant="tonal">
      {{ error }}
    </v-alert>

    <v-progress-linear v-if="loading" color="primary" indeterminate />

    <template v-else-if="receipt">
      <div class="grid gap-4 md:grid-cols-3">
        <article class="inventory-card p-5">
          <p class="text-sm font-medium text-slate-500">Tedarikçi</p>
          <p class="mt-2 text-lg font-bold text-slate-950">
            {{ receipt.supplier_name }}
          </p>
          <p class="mt-1 text-sm text-slate-500">
            {{ receipt.document_no || "Belge no girilmemiş" }}
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
          <p class="text-sm font-medium text-slate-500">Toplam maliyet</p>
          <p class="mt-2 text-3xl font-bold text-slate-950">
            {{ formatMoney(totalCost) }}
          </p>
          <p class="mt-1 text-sm text-slate-500">
            {{ receivedDate }}
          </p>
        </article>
      </div>

      <v-card class="inventory-card overflow-hidden" elevation="0">
        <div class="inventory-section-header border-b border-slate-200">
          <h3 class="font-bold text-slate-950">Gelen ürünler</h3>
          <p class="text-sm text-slate-500">
            Her satır bu mal kabul sırasında stoğa eklenen ürünü gösterir.
          </p>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200 text-sm">
            <thead class="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
              <tr>
                <th class="px-6 py-4">Ürün</th>
                <th class="px-6 py-4">SKU</th>
                <th class="px-6 py-4 text-right">Miktar</th>
                <th class="px-6 py-4 text-right">Birim maliyet</th>
                <th class="px-6 py-4 text-right">Satır toplamı</th>
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
                  {{ formatMoney(item.unit_cost) }}
                </td>
                <td class="px-6 py-4 text-right font-bold text-slate-900">
                  {{ formatMoney(Number(item.quantity || 0) * Number(item.unit_cost || 0)) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </v-card>

      <v-card class="inventory-card p-5" elevation="0">
        <p class="text-sm font-medium text-slate-500">Not</p>
        <p class="mt-2 text-sm leading-6 text-slate-700">
          {{ receipt.note || "Bu mal kabul için not girilmemiş." }}
        </p>
      </v-card>
    </template>
  </section>
</template>
