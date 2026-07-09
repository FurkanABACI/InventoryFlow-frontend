<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const formRef = ref(null)

const form = reactive({
  username: '',
  password: '',
})

const usernamePattern = /^[A-Za-z0-9@.+_-]+$/

const required = (message) => (value) => Boolean(String(value ?? '').trim()) || message
const minLength = (min, message) => (value) => String(value ?? '').trim().length >= min || message
const maxLength = (max, message) => (value) => String(value ?? '').length <= max || message

const usernameRules = [
  required('Kullanıcı adı zorunludur.'),
  minLength(3, 'Kullanıcı adı en az 3 karakter olmalıdır.'),
  maxLength(150, 'Kullanıcı adı en fazla 150 karakter olabilir.'),
  (value) => usernamePattern.test(String(value ?? '').trim()) || 'Kullanıcı adı yalnızca harf, rakam ve @ . + _ - karakterlerini içerebilir.',
]

const passwordRules = [
  required('Şifre zorunludur.'),
  (value) => String(value ?? '').length >= 6 || 'Şifre en az 6 karakter olmalıdır.',
  maxLength(128, 'Şifre en fazla 128 karakter olabilir.'),
]

async function handleSubmit() {
  const result = await formRef.value.validate()

  if (!result.valid) {
    return
  }

  try {
    await authStore.login({
      username: form.username.trim(),
      password: form.password,
    })
    router.push({ name: 'dashboard' })
  } finally {
    form.password = ''
  }
}
</script>

<template>
  <main class="grid min-h-screen bg-slate-100 lg:grid-cols-[minmax(0,1fr)_460px]">
    <section class="relative flex items-center overflow-hidden px-6 py-12 sm:px-10 lg:px-16">
      <div class="absolute inset-0 bg-slate-50" />
      <div class="max-w-2xl">
        <p class="relative text-sm font-bold uppercase tracking-wide text-blue-600">InventoryFlow</p>
        <h1 class="relative mt-4 text-4xl font-bold leading-tight text-slate-950 sm:text-5xl">
          Stok akışını tek panelden yönet
        </h1>
        <p class="relative mt-5 max-w-xl text-base leading-7 text-slate-600">
          Ürünleri, tedarikçileri ve kritik stokları daha hızlı takip etmek için hesabına giriş yap.
        </p>
      </div>
    </section>

    <section class="flex items-center border-t border-slate-200 bg-white px-6 py-10 shadow-sm lg:border-l lg:border-t-0">
      <v-card class="inventory-card w-full px-6 py-5" elevation="0">
        <v-card-title class="px-0 text-xl font-bold text-slate-950">Hesabına giriş yap</v-card-title>
        <v-card-subtitle class="px-0 pb-5 text-slate-500">
          Yetkili kullanıcı bilgilerinle devam et.
        </v-card-subtitle>

        <v-card-text class="px-0">
          <v-alert
            v-if="authStore.error"
            type="error"
            variant="tonal"
            class="mb-4"
          >
            {{ authStore.error }}
          </v-alert>

          <v-form ref="formRef" class="space-y-3" validate-on="submit" @submit.prevent="handleSubmit">
            <div>
              <span class="inventory-field-label">Kullanıcı adı</span>
              <v-text-field
                v-model="form.username"
                class="inventory-field"
                aria-label="Kullanıcı adı"
                placeholder="Örn: admin"
                hint="Backend tarafında oluşturulan kullanıcı adını yaz."
                persistent-hint
                prepend-inner-icon="mdi-account-outline"
                variant="outlined"
                autocomplete="username"
                :rules="usernameRules"
              />
            </div>

            <div>
              <span class="inventory-field-label">Şifre</span>
              <v-text-field
                v-model="form.password"
                class="inventory-field"
                aria-label="Şifre"
                placeholder="Hesabının şifresini yaz"
                hint="Şifre ekranda tutulmaz; giriş denemesi sonrası alan temizlenir."
                persistent-hint
                prepend-inner-icon="mdi-lock-outline"
                variant="outlined"
                type="password"
                autocomplete="current-password"
                :rules="passwordRules"
              />
            </div>

            <v-btn
              block
              color="primary"
              size="large"
              type="submit"
              :loading="authStore.loading"
            >
              Giriş yap
            </v-btn>
          </v-form>
        </v-card-text>
      </v-card>
    </section>
  </main>
</template>
