import { createContext, useContext, useCallback } from "react";

const STORAGE_LANG = "artvault_lang";
const STORAGE_CURRENCY = "artvault_currency";

const CURRENCIES = {
  EUR: { locale: "fr-BE", symbol: "€" },
  USD: { locale: "en-US", symbol: "$" },
  CNY: { locale: "zh-CN", symbol: "¥" },
};

export const DEFAULT_LANG = "fr";
export const DEFAULT_CURRENCY = "EUR";

const cache = {};

async function loadMessages(lang) {
  if (cache[lang]) return cache[lang];
  const msgs = lang === "en" ? (await import("./en.json")).default : (await import("./fr.json")).default;
  cache[lang] = msgs;
  return msgs;
}

export function loadLang() {
  return localStorage.getItem(STORAGE_LANG) || DEFAULT_LANG;
}

export function saveLang(lang) {
  localStorage.setItem(STORAGE_LANG, lang);
}

export function loadCurrency() {
  return localStorage.getItem(STORAGE_CURRENCY) || DEFAULT_CURRENCY;
}

export function saveCurrency(c) {
  localStorage.setItem(STORAGE_CURRENCY, c);
}

// Currency formatter (standalone, for use outside React)
export function formatCurrency(value, currency) {
  if (value === "" || value === null || value === undefined) return "—";
  const cfg = CURRENCIES[currency] || CURRENCIES.EUR;
  return new Intl.NumberFormat(cfg.locale, {
    style: "currency", currency, maximumFractionDigits: 0,
  }).format(+value);
}

// React context
export const I18nContext = createContext(null);
export const useI18n = () => useContext(I18nContext);

export function useT() {
  const ctx = useContext(I18nContext);
  return ctx?.t || ((key) => key);
}
