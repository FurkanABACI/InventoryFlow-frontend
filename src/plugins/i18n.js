import { createI18n } from "vue-i18n";
import { messages } from "../i18n/messages";

const savedLocale = localStorage.getItem("inventoryflow_locale") || "tr";

export const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: "tr",
  messages,
});

export default i18n;
