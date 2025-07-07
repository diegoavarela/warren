"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  getUserLocale, 
  saveUserLocalePreference,
  getLocaleInfo,
  getCurrencyForLocale,
  getNumberFormatForLocale,
  SupportedLocale
} from '@/lib/locale-detection';

interface LocaleContextType {
  locale: string;
  setLocale: (locale: string) => void;
  localeInfo: SupportedLocale | null;
  currency: string;
  numberFormat: {
    decimalSeparator: string;
    thousandsSeparator: string;
    currencySymbol: string;
  };
  isLoading: boolean;
}

const LocaleContext = createContext<LocaleContextType | null>(null);

interface LocaleProviderProps {
  children: ReactNode;
}

export function LocaleProvider({ children }: LocaleProviderProps) {
  // Initialize with browser's language or English (never Mexico)
  const [locale, setLocaleState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return getUserLocale();
    }
    return 'en-US';
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Detect and set initial locale if not already set
    const detectedLocale = getUserLocale();
    setLocaleState(detectedLocale);
    setIsLoading(false);
  }, []);

  const setLocale = (newLocale: string) => {
    setLocaleState(newLocale);
    saveUserLocalePreference(newLocale);
  };

  const localeInfo = getLocaleInfo(locale);
  const currency = getCurrencyForLocale(locale);
  const numberFormat = getNumberFormatForLocale(locale);

  return (
    <LocaleContext.Provider 
      value={{
        locale,
        setLocale,
        localeInfo,
        currency,
        numberFormat,
        isLoading
      }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}