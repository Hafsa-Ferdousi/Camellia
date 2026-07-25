import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enCommon from "./locales/en/common.json";
import enNav from "./locales/en/nav.json";
import enFooter from "./locales/en/footer.json";
import enHome from "./locales/en/home.json";
import enProducts from "./locales/en/products.json";
import enCart from "./locales/en/cart.json";
import enAuth from "./locales/en/auth.json";
import enCheckout from "./locales/en/checkout.json";
import enOrders from "./locales/en/orders.json";
import enPages from "./locales/en/pages.json";
import enAdmin from "./locales/en/admin.json";
import bnCommon from "./locales/bn/common.json";
import bnNav from "./locales/bn/nav.json";
import bnFooter from "./locales/bn/footer.json";
import bnHome from "./locales/bn/home.json";
import bnProducts from "./locales/bn/products.json";
import bnCart from "./locales/bn/cart.json";
import bnAuth from "./locales/bn/auth.json";
import bnCheckout from "./locales/bn/checkout.json";
import bnOrders from "./locales/bn/orders.json";
import bnPages from "./locales/bn/pages.json";
import bnAdmin from "./locales/bn/admin.json";

export const STORAGE_KEY = "camellia_language";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon, nav: enNav, footer: enFooter, home: enHome, products: enProducts, cart: enCart, auth: enAuth, checkout: enCheckout, orders: enOrders, pages: enPages, admin: enAdmin },
      bn: { common: bnCommon, nav: bnNav, footer: bnFooter, home: bnHome, products: bnProducts, cart: bnCart, auth: bnAuth, checkout: bnCheckout, orders: bnOrders, pages: bnPages, admin: bnAdmin },
    },
    fallbackLng: "en",
    supportedLngs: ["en", "bn"],
    ns: ["common", "nav", "footer", "home", "products", "cart", "auth", "checkout", "orders", "pages", "admin"],
    defaultNS: "common",
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: STORAGE_KEY,
      caches: ["localStorage"],
    },
  });

export default i18n;
