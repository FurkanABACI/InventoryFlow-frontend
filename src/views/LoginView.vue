<script setup>
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "../stores/auth";
import { useSettingsStore } from "../stores/settings";

const router = useRouter();
const authStore = useAuthStore();
const settingsStore = useSettingsStore();
const { t } = useI18n();
const formRef = ref(null);

const form = reactive({
  username: "",
  password: "",
});

const usernamePattern = /^[A-Za-z0-9@.+_-]+$/;

const required = (message) => (value) =>
  Boolean(String(value ?? "").trim()) || message;
const minLength = (min, message) => (value) =>
  String(value ?? "").trim().length >= min || message;
const maxLength = (max, message) => (value) =>
  String(value ?? "").length <= max || message;

const usernameRules = [
  required(t("auth.usernameRequired")),
  minLength(3, t("auth.usernameMin")),
  maxLength(150, t("auth.usernameMax")),
  (value) =>
    usernamePattern.test(String(value ?? "").trim()) ||
    t("auth.usernamePattern"),
];

const passwordRules = [
  required(t("auth.passwordRequired")),
  (value) => String(value ?? "").length >= 6 || t("auth.passwordMin"),
  maxLength(128, t("auth.passwordMax")),
];

async function handleSubmit() {
  const result = await formRef.value.validate();

  if (!result.valid) {
    return;
  }

  try {
    await authStore.login({
      username: form.username.trim(),
      password: form.password,
    });
    router.push({ name: "dashboard" });
  } finally {
    form.password = "";
  }
}
</script>

<template>
  <main
    class="grid min-h-screen bg-slate-100 lg:grid-cols-[minmax(0,1fr)_460px]"
  >
    <section
      class="relative flex items-center overflow-hidden px-6 py-12 sm:px-10 lg:px-16"
    >
      <div class="absolute inset-0 bg-slate-50" />
      <div class="absolute right-6 top-6 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-100"
          :title="t('settings.language')"
          @click="settingsStore.toggleLocale"
        >
          {{
            settingsStore.locale === "tr"
              ? t("settings.english")
              : t("settings.turkish")
          }}
        </button>
        <div
          class="flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm"
        >
          <button
            v-for="themeOption in ['light', 'dark', 'system']"
            :key="themeOption"
            type="button"
            class="rounded-md px-2.5 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
            :class="{
              'bg-blue-50 text-blue-700': settingsStore.theme === themeOption,
            }"
            :title="t('settings.theme')"
            @click="settingsStore.setTheme(themeOption)"
          >
            {{ t(`settings.${themeOption}`) }}
          </button>
        </div>
      </div>
      <div class="max-w-2xl">
        <p
          class="relative text-sm font-bold uppercase tracking-wide text-blue-600"
        >
          {{ t("app.name") }}
        </p>
        <h1
          class="relative mt-4 text-4xl font-bold leading-tight text-slate-950 sm:text-5xl"
        >
          {{ t("auth.heroTitle") }}
        </h1>
        <p class="relative mt-5 max-w-xl text-base leading-7 text-slate-600">
          {{ t("auth.heroText") }}
        </p>
      </div>
    </section>

    <section
      class="flex items-center border-t border-slate-200 bg-white px-6 py-10 shadow-sm lg:border-l lg:border-t-0"
    >
      <v-card class="inventory-card w-full px-6 py-5" elevation="0">
        <v-card-title class="px-0 text-xl font-bold text-slate-950">{{
          t("auth.loginTitle")
        }}</v-card-title>
        <v-card-subtitle class="px-0 pb-5 text-slate-500">
          {{ t("auth.loginSubtitle") }}
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

          <v-form
            ref="formRef"
            class="space-y-3"
            validate-on="submit"
            @submit.prevent="handleSubmit"
          >
            <div>
              <span class="inventory-field-label">{{
                t("auth.username")
              }}</span>
              <v-text-field
                v-model="form.username"
                class="inventory-field"
                :aria-label="t('auth.username')"
                :placeholder="t('auth.usernamePlaceholder')"
                :hint="t('auth.usernameHint')"
                persistent-hint
                prepend-inner-icon="mdi-account-outline"
                variant="outlined"
                autocomplete="username"
                :rules="usernameRules"
              />
            </div>

            <div>
              <span class="inventory-field-label">{{
                t("auth.password")
              }}</span>
              <v-text-field
                v-model="form.password"
                class="inventory-field"
                :aria-label="t('auth.password')"
                :placeholder="t('auth.passwordPlaceholder')"
                :hint="t('auth.passwordHint')"
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
              {{ t("auth.submit") }}
            </v-btn>
          </v-form>
        </v-card-text>
      </v-card>
    </section>
  </main>
</template>
