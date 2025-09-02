/**
 * Locale detection utilities for automatic language detection
 */

export interface SupportedLocale {
  code: string;
  name: string;
  region: string;
  default: boolean;
}

export const SUPPORTED_LOCALES: SupportedLocale[] = [
  { code: 'en-US', name: 'English (United States)', region: 'North America', default: true },
  { code: 'en-GB', name: 'English (United Kingdom)', region: 'Europe', default: false },
  { code: 'es-ES', name: 'Español (España)', region: 'Europe', default: false },
  { code: 'es-AR', name: 'Español (Argentina)', region: 'LATAM', default: false },
  { code: 'es-CO', name: 'Español (Colombia)', region: 'LATAM', default: false },
  { code: 'es-CL', name: 'Español (Chile)', region: 'LATAM', default: false },
  { code: 'es-PE', name: 'Español (Perú)', region: 'LATAM', default: false },
  { code: 'pt-BR', name: 'Português (Brasil)', region: 'LATAM', default: false },
];

/**
 * Detects the user's preferred locale from browser/system settings
 * @returns The detected locale code or default fallback
 */
export function detectUserLocale(): string {
  if (typeof window === 'undefined') {
    // Server-side: return English as default
    return 'en-US';
  }

  // Get browser languages in order of preference
  const browserLanguages = [
    navigator.language,
    ...(navigator.languages || [])
  ];

  // Find exact match first
  for (const browserLang of browserLanguages) {
    const exactMatch = SUPPORTED_LOCALES.find(
      locale => locale.code.toLowerCase() === browserLang.toLowerCase()
    );
    if (exactMatch) {
      return exactMatch.code;
    }
  }

  // Find language family match (e.g., 'es' matches 'es-MX')
  for (const browserLang of browserLanguages) {
    const langFamily = browserLang.split('-')[0].toLowerCase();
    const familyMatch = SUPPORTED_LOCALES.find(
      locale => locale.code.split('-')[0].toLowerCase() === langFamily
    );
    if (familyMatch) {
      return familyMatch.code;
    }
  }

  // Check for regional preferences
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // Map timezones to likely locales
  const timezoneToLocale: Record<string, string> = {
    'America/Buenos_Aires': 'es-AR',
    'America/Argentina/Buenos_Aires': 'es-AR',
    'America/Bogota': 'es-CO',
    'America/Santiago': 'es-CL',
    'America/Lima': 'es-PE',
    'America/Sao_Paulo': 'pt-BR',
    'America/New_York': 'en-US',
    'America/Los_Angeles': 'en-US',
    'America/Chicago': 'en-US',
    'Europe/Madrid': 'es-ES',
    'Europe/London': 'en-GB',
  };

  if (timezone && timezoneToLocale[timezone]) {
    return timezoneToLocale[timezone];
  }

  // Fallback to English
  return 'en-US';
}

/**
 * Gets locale information for a given locale code
 */
export function getLocaleInfo(localeCode: string): SupportedLocale | null {
  return SUPPORTED_LOCALES.find(locale => locale.code === localeCode) || null;
}

/**
 * Formats locale code for display
 */
export function formatLocaleDisplay(localeCode: string): string {
  const locale = getLocaleInfo(localeCode);
  return locale ? locale.name : localeCode;
}

/**
 * Gets currency for a locale
 */
export function getCurrencyForLocale(localeCode: string): string {
  const currencyMap: Record<string, string> = {
    'es-MX': 'MXN',
    'es-AR': 'ARS',
    'es-CO': 'COP',
    'es-CL': 'CLP',
    'es-PE': 'PEN',
    'pt-BR': 'BRL',
    'en-US': 'USD',
    'en-GB': 'GBP',
    'es-ES': 'EUR',
  };
  
  return currencyMap[localeCode] || 'USD';
}

/**
 * Detects the preferred number format for a locale
 */
export function getNumberFormatForLocale(localeCode: string): {
  decimalSeparator: string;
  thousandsSeparator: string;
  currencySymbol: string;
} {
  const formatMap: Record<string, any> = {
    'es-MX': { decimalSeparator: '.', thousandsSeparator: ',', currencySymbol: '$' },
    'es-AR': { decimalSeparator: ',', thousandsSeparator: '.', currencySymbol: '$' },
    'es-CO': { decimalSeparator: ',', thousandsSeparator: '.', currencySymbol: '$' },
    'es-CL': { decimalSeparator: ',', thousandsSeparator: '.', currencySymbol: '$' },
    'es-PE': { decimalSeparator: '.', thousandsSeparator: ',', currencySymbol: 'S/' },
    'pt-BR': { decimalSeparator: ',', thousandsSeparator: '.', currencySymbol: 'R$' },
    'en-US': { decimalSeparator: '.', thousandsSeparator: ',', currencySymbol: '$' },
    'en-GB': { decimalSeparator: '.', thousandsSeparator: ',', currencySymbol: '£' },
    'es-ES': { decimalSeparator: ',', thousandsSeparator: '.', currencySymbol: '€' },
  };
  
  return formatMap[localeCode] || formatMap['en-US'];
}

/**
 * Saves user's locale preference to localStorage
 */
export function saveUserLocalePreference(localeCode: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('warren-user-locale', localeCode);
  }
}

/**
 * Gets user's saved locale preference from localStorage
 */
export function getSavedUserLocalePreference(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('warren-user-locale');
  }
  return null;
}

/**
 * Gets the final locale to use (saved preference > detected > default)
 */
export function getUserLocale(): string {
  const savedLocale = getSavedUserLocalePreference();
  if (savedLocale && SUPPORTED_LOCALES.some(l => l.code === savedLocale)) {
    return savedLocale;
  }
  
  return detectUserLocale();
}