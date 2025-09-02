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
  // Always start with en-US to prevent hydration mismatch
  const [locale, setLocaleState] = useState<string>('en-US');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Only detect and set locale on client-side after mount
    if (typeof window !== 'undefined') {
      const detectedLocale = getUserLocale();
      setLocaleState(detectedLocale);
    }
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