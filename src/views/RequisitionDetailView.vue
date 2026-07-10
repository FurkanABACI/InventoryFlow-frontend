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

const pendingQuantity = computed(() =>
  Math.max(totalQuantity.value - deliveredQuantity.value, 0),
);

const completionPercent = computed(() => {
  if (!totalQuantity.value) {
    return 0;
  }

  return Math.round((deliveredQuantity.value / totalQuantity.value) * 100);
});

const lowStockItemCount = computed(() =>
  items.value.filter(
    (item) =>
      item.has_product_card &&
      Number(item.current_stock || 0) < Number(item.quantity || 0),
  ).length,
);

const uncatalogedItemCount = computed(() =>
  items.value.filter((item) => !item.has_product_card).length,
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
  if (!item.has_product_card) {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }

  if (Number(item.current_stock || 0) < Number(item.quantity || 0)) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
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
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div class="min-w-0">
        <button
          type="button"
          class="mb-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          @click="router.push({ name: 'requisitions' })"
        >
          <span class="grid h-6 w-6 place-items-center rounded-md bg-slate-100">
            <v-icon icon="mdi-arrow-left" size="18" />
          </span>
          Listeye dön
        </button>
        <h2 class="text-lg font-bold text-slate-950">Talep detayı</h2>
        <p class="text-sm text-slate-500">
          İstenen ürünleri, teslim durumunu ve stok uygunluğunu tek ekranda takip et.
        </p>
      </div>
    </div>

    <v-alert v-if="error" type="error" variant="tonal">
      {{ error }}
    </v-alert>

    <v-progress-linear v-if="loading" color="primary" indeterminate />

    <template v-else-if="request">
      <section class="inventory-card overflow-hidden">
        <div class="border-b border-slate-200 bg-white px-5 py-4">
          <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div class="min-w-0">
              <div class="mb-2 flex flex-wrap items-center gap-2">
                <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                  Talep #{{ request.id }}
                </span>
                <span
                  class="inline-flex rounded-full border px-2.5 py-1 text-xs font-bold"
                  :class="getStatusClass(request.status)"
                >
                  {{ request.status_label }}
                </span>
              </div>
              <h3 class="text-lg font-bold text-slate-950">
                {{ request.department }}
              </h3>
              <p class="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                {{ request.requester_name }} tarafından açılan bu talepte
                {{ items.length }} kalem ürün ve toplam {{ totalQuantity }} adet istek bulunuyor.
              </p>
            </div>

            <div class="grid gap-2 text-sm sm:grid-cols-2 lg:min-w-[340px]">
              <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p class="text-xs font-semibold text-slate-500">Açılış tarihi</p>
                <p class="mt-1 font-semibold text-slate-900">{{ requestDate }}</p>
              </div>
              <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p class="text-xs font-semibold text-slate-500">Teslim tarihi</p>
                <p class="mt-1 font-semibold text-slate-900">{{ fulfilledDate }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="grid gap-0 divide-y divide-slate-200 md:grid-cols-4 md:divide-x md:divide-y-0">
          <div class="px-5 py-3.5">
            <p class="text-xs font-semibold text-slate-500">Toplam adet</p>
            <p class="mt-1 text-xl font-bold text-slate-950">
              {{ totalQuantity }}
            </p>
          </div>

          <div class="px-5 py-3.5">
            <p class="text-xs font-semibold text-slate-500">Teslim edilen</p>
            <p class="mt-1 text-xl font-bold text-emerald-700">
              {{ deliveredQuantity }}
            </p>
          </div>

          <div class="px-5 py-3.5">
            <p class="text-xs font-semibold text-slate-500">Bekleyen adet</p>
            <p class="mt-1 text-xl font-bold text-slate-950">
              {{ pendingQuantity }}
            </p>
          </div>

          <div class="px-5 py-3.5">
            <p class="text-xs font-semibold text-slate-500">Stok uyarısı</p>
            <p
              class="mt-1 text-xl font-bold"
              :class="lowStockItemCount || uncatalogedItemCount ? 'text-amber-700' : 'text-emerald-700'"
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
              <h3 class="font-bold text-slate-950">İstenen ürünler</h3>
              <p class="text-sm text-slate-500">
                Her ürün için istenen miktar, teslim edilen adet ve mevcut stok durumu.
              </p>
            </div>
          </div>

          <div class="divide-y divide-slate-100">
            <article
              v-for="item in items"
              :key="item.id"
              class="px-5 py-4 transition hover:bg-slate-50"
            >
              <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <h4 class="font-bold text-slate-950">
                      {{ item.product_name }}
                    </h4>
                    <span class="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                      {{ item.sku }}
                    </span>
                  </div>
                  <p class="mt-2 text-sm text-slate-500">
                    {{ item.quantity }} adet istendi,
                    {{ item.delivered_quantity }} adet teslim edildi.
                    <span v-if="item.requested_product_note">
                      Not: {{ item.requested_product_note }}
                    </span>
                  </p>
                </div>

                <div class="grid grid-cols-3 gap-2 sm:min-w-[320px]">
                  <div class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-right">
                    <p class="text-xs font-semibold text-slate-500">İstenen</p>
                    <p class="mt-1 text-base font-bold text-slate-950">{{ item.quantity }}</p>
                  </div>
                  <div class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-right">
                    <p class="text-xs font-semibold text-slate-500">Teslim</p>
                    <p class="mt-1 text-base font-bold text-slate-950">{{ item.delivered_quantity }}</p>
                  </div>
                  <div
                    class="rounded-lg border px-3 py-2 text-right"
                    :class="getStockClass(item)"
                  >
                    <p class="text-xs font-semibold">Stok</p>
                    <p class="mt-1 text-base font-bold">
                      {{ item.has_product_card ? item.current_stock : "Kart bekliyor" }}
                    </p>
                  </div>
                </div>
              </div>

              <div class="mt-3">
                <div class="mb-2 flex items-center justify-between gap-3 text-xs font-bold">
                  <span class="text-slate-500">Teslim ilerlemesi</span>
                  <span class="text-slate-700">
                    {{ item.delivered_quantity }} / {{ item.quantity }}
                  </span>
                </div>
                <v-progress-linear
                  color="primary"
                  height="6"
                  rounded
                  :model-value="Number(item.quantity || 0) ? (Number(item.delivered_quantity || 0) / Number(item.quantity || 0)) * 100 : 0"
                />
              </div>
            </article>
          </div>
        </v-card>

        <aside class="space-y-3">
          <article class="inventory-card p-4">
            <p class="text-xs font-semibold text-slate-500">Genel ilerleme</p>
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
            <p class="text-xs font-semibold text-slate-500">Stok değerlendirmesi</p>
            <p
              class="mt-2 text-base font-bold"
              :class="lowStockItemCount || uncatalogedItemCount ? 'text-amber-700' : 'text-emerald-700'"
            >
              {{
                uncatalogedItemCount
                  ? `${uncatalogedItemCount} kalem için ürün kartı bekleniyor`
                  : lowStockItemCount
                    ? `${lowStockItemCount} kalemde stok yetersiz`
                    : "Tüm kalemlerde stok uygun"
              }}
            </p>
            <p class="mt-2 text-sm leading-6 text-slate-500">
              Stok yetersizse talep teslim aşamasında tedarik bekliyor durumuna alınır.
            </p>
          </article>

          <article class="inventory-card p-4">
            <p class="text-xs font-semibold text-slate-500">Not</p>
            <p class="mt-2 text-sm leading-6 text-slate-700">
              {{ request.note || "Bu talep için not girilmemiş." }}
            </p>
          </article>
        </aside>
      </section>
    </template>
  </section>
</template>
