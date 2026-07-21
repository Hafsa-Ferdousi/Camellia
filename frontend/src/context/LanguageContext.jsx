import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { STORAGE_KEY } from "../i18n";
import { getPricing } from "../api/settings";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const { i18n } = useTranslation();
  const [language, setLanguageState] = useState(i18n.language?.startsWith("bn") ? "bn" : "en");

  // If the user hasn't already picked a language, fall back to the
  // admin-configured site default instead of just browser detection.
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    getPricing()
      .then(({ data }) => {
        if (data.defaultLanguage && data.defaultLanguage !== i18n.language) {
          i18n.changeLanguage(data.defaultLanguage);
          setLanguageState(data.defaultLanguage);
        }
      })
      .catch(() => {});
  }, [i18n]);

  const setLanguage = useCallback((lng) => {
    i18n.changeLanguage(lng);
    setLanguageState(lng);
  }, [i18n]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
