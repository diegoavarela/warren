/**
 * Safe Locale Text Hook
 * 
 * Prevents hydration mismatches by providing safe locale-dependent text
 * that works correctly with SSR and client-side hydration.
 */

import { useState, useEffect } from 'react';
import { useLocale } from '@/contexts/LocaleContext';

interface UseLocaleTextOptions {
  fallbackLocale?: string;
  preventHydrationMismatch?: boolean;
}

export function useLocaleText(options: UseLocaleTextOptions = {}) {
  const { fallbackLocale = 'en-US', preventHydrationMismatch = true } = options;
  const { locale, isLoading } = useLocale();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Helper function to get text safely
  const getLocalizedText = (texts: Record<string, string>, defaultText?: string) => {
    // During SSR or before hydration, use fallback
    if (!hasMounted && preventHydrationMismatch) {
      return texts[fallbackLocale] || defaultText || texts['en-US'] || Object.values(texts)[0];
    }

    // After hydration, use actual locale
    const currentLocale = locale || fallbackLocale;
    
    // Try exact match first
    if (texts[currentLocale]) {
      return texts[currentLocale];
    }

    // Try language match (e.g., 'es' for 'es-AR')
    const language = currentLocale.split('-')[0];
    const languageMatch = Object.keys(texts).find(key => key.startsWith(language));
    if (languageMatch) {
      return texts[languageMatch];
    }

    // Fallback to default or first available
    return texts[fallbackLocale] || defaultText || Object.values(texts)[0];
  };

  // Shorthand for common Spanish/English patterns
  const t = (englishText: string, spanishText: string) => {
    return getLocalizedText({
      'en-US': englishText,
      'es-AR': spanishText,
      'es-CO': spanishText,
      'es-MX': spanishText,
    });
  };

  return {
    getLocalizedText,
    t,
    currentLocale: hasMounted ? locale : fallbackLocale,
    isHydrated: hasMounted,
    isLocaleLoading: isLoading,
  };
}

export default useLocaleText;