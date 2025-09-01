/**
 * Centralized Localization System
 * 
 * Loads translations from JSON files organized by language and namespace
 * Provides type-safe translation functions with fallback support
 */

interface Translations {
  [key: string]: any;
}

interface LoadedTranslations {
  [locale: string]: {
    [namespace: string]: Translations;
  };
}

// Cache for loaded translations
let translationCache: LoadedTranslations = {};

/**
 * Load translations for a specific locale and namespace
 */
export async function loadTranslations(locale: string, namespace: string): Promise<Translations> {
  // Normalize locale (e.g., 'es-AR' -> 'es')
  const normalizedLocale = locale.startsWith('es') ? 'es' : 'en';
  
  // Check cache first
  if (translationCache[normalizedLocale]?.[namespace]) {
    return translationCache[normalizedLocale][namespace];
  }

  try {
    // Dynamic import of JSON translation file
    const translations = await import(`@/locales/${normalizedLocale}/${namespace}.json`);
    
    // Initialize cache structure
    if (!translationCache[normalizedLocale]) {
      translationCache[normalizedLocale] = {};
    }
    
    // Cache the translations
    translationCache[normalizedLocale][namespace] = translations.default || translations;
    
    return translationCache[normalizedLocale][namespace];
  } catch (error) {
    console.warn(`Failed to load translations for ${locale}/${namespace}:`, error);
    
    // Fallback to English if Spanish fails
    if (normalizedLocale === 'es') {
      try {
        const fallbackTranslations = await import(`@/locales/en/${namespace}.json`);
        return fallbackTranslations.default || fallbackTranslations;
      } catch (fallbackError) {
        console.error(`Failed to load fallback translations for ${namespace}:`, fallbackError);
      }
    }
    
    return {};
  }
}

/**
 * Get a nested translation value using dot notation
 */
export function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

/**
 * Translation function that supports nested keys and interpolation
 */
export function createTranslationFunction(translations: Translations) {
  return (key: string, params?: Record<string, any>): string => {
    let value = getNestedValue(translations, key);
    
    if (value === undefined) {
      console.warn(`Translation missing for key: ${key}`);
      return key; // Return key as fallback
    }
    
    // Handle string interpolation
    if (typeof value === 'string' && params) {
      Object.keys(params).forEach(param => {
        value = value.replace(new RegExp(`{${param}}`, 'g'), params[param]);
      });
    }
    
    return value;
  };
}

/**
 * Hook-like function for use in components
 */
export function useTranslations(locale: string, namespace: string) {
  const [translations, setTranslations] = React.useState<Translations>({});
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      try {
        const data = await loadTranslations(locale, namespace);
        if (mounted) {
          setTranslations(data);
          setLoading(false);
        }
      } catch (error) {
        console.error(`Error loading translations for ${locale}/${namespace}:`, error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadData();
    
    return () => {
      mounted = false;
    };
  }, [locale, namespace]);

  return {
    t: createTranslationFunction(translations),
    loading,
    translations
  };
}

/**
 * Preload translations for better performance
 */
export async function preloadTranslations(locale: string, namespaces: string[]) {
  const promises = namespaces.map(namespace => 
    loadTranslations(locale, namespace).catch(error => {
      console.warn(`Failed to preload ${locale}/${namespace}:`, error);
      return {};
    })
  );
  
  await Promise.all(promises);
}

// Add React import for the hook
import React from 'react';

export default {
  loadTranslations,
  getNestedValue,
  createTranslationFunction,
  useTranslations,
  preloadTranslations
};