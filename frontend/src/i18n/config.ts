import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { en } from './translations/en';
import { es } from './translations/es';

const languages = ['en', 'es'];

const resources = {
  en: {
    translation: en
  },
  es: {
    translation: es
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    debug: false,
    fallbackLng: 'en',
    // Remove hardcoded lng to allow auto-detection
    supportedLngs: languages,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      // Look for exact matches first, then language without region
      lookupFromPathIndex: 0,
      lookupLocalStorage: 'i18nextLng',
      // Check for Spanish variants (es, es-ES, es-MX, etc.)
      checkWhitelist: true,
      convertDetectedLanguage: (lng) => {
        // Convert any Spanish variant to 'es'
        if (lng.startsWith('es')) return 'es';
        // Convert any English variant to 'en'
        if (lng.startsWith('en')) return 'en';
        return lng;
      }
    },
    react: {
      useSuspense: false // Disable suspense to avoid loading issues
    }
  });

export default i18n;