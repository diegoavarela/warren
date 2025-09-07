/**
 * Admin Portal Translation System
 * 
 * Provides translation functionality compatible with shared components
 */

import { useState, useEffect } from 'react';
import { useTranslations, createTranslationFunction } from '@/lib/locales/loader';

/**
 * Translation hook for admin portal components
 * Compatible with Warren's translation system
 */
export function useTranslation(locale: string = 'en-US') {
  const { t, loading, translations } = useTranslations(locale, 'common');
  
  return {
    t,
    loading,
    translations
  };
}

/**
 * Simple translation function that works with the shared components
 */
export function createTranslation(locale: string = 'en-US') {
  const [translationFunction, setTranslationFunction] = useState<(key: string, params?: Record<string, any>) => string>(
    () => (key: string) => key
  );
  
  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const { loadTranslations: load, createTranslationFunction } = await import('@/lib/locales/loader');
        const translations = await load(locale, 'common');
        const t = createTranslationFunction(translations);
        setTranslationFunction(() => t);
      } catch (error) {
        console.error('Failed to load translations:', error);
        // Keep fallback function that returns the key
      }
    };
    
    loadTranslations();
  }, [locale]);
  
  return translationFunction;
}

export default useTranslation;