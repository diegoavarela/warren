// Shared constants for both main app and admin portal

export const INDUSTRIES = [
  'Manufacturing',
  'Retail', 
  'Services',
  'Technology',
  'Finance',
  'Healthcare',
  'Education',
  'Construction',
  'Agriculture',
  'Other'
] as const;

export const COUNTRIES = [
  'United States',
  'Argentina', 
  'Brazil',
  'Colombia',
  'Mexico',
  'Uruguay',
  'Chile',
  'Peru',
  'Spain',
  'Canada',
  'Other'
] as const;

export const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', flag: '🇬🇧' },
  { code: 'ARS', name: 'Argentine Peso', flag: '🇦🇷' },
  { code: 'BRL', name: 'Brazilian Real', flag: '🇧🇷' },
  { code: 'COP', name: 'Colombian Peso', flag: '🇨🇴' },
  { code: 'MXN', name: 'Mexican Peso', flag: '🇲🇽' },
  { code: 'CLP', name: 'Chilean Peso', flag: '🇨🇱' },
  { code: 'PEN', name: 'Peruvian Sol', flag: '🇵🇪' },
  { code: 'UYU', name: 'Uruguayan Peso', flag: '🇺🇾' },
] as const;

export const LOCALES = [
  { code: 'en-US', name: 'English (US)', flag: '🇺🇸' },
  { code: 'es-AR', name: 'Español (Argentina)', flag: '🇦🇷' },
  { code: 'es-CO', name: 'Español (Colombia)', flag: '🇨🇴' },
  { code: 'es-MX', name: 'Español (México)', flag: '🇲🇽' },
  { code: 'pt-BR', name: 'Português (Brasil)', flag: '🇧🇷' },
  { code: 'es-CL', name: 'Español (Chile)', flag: '🇨🇱' },
  { code: 'es-PE', name: 'Español (Perú)', flag: '🇵🇪' },
  { code: 'es-UY', name: 'Español (Uruguay)', flag: '🇺🇾' },
  { code: 'es-ES', name: 'Español (España)', flag: '🇪🇸' },
] as const;

export const DISPLAY_UNITS = [
  { value: 'normal', labelEn: 'Units', labelEs: 'Unidades' },
  { value: 'thousands', labelEn: 'Thousands', labelEs: 'Miles' },
  { value: 'millions', labelEn: 'Millions', labelEs: 'Millones' },
] as const;

export const FISCAL_YEAR_STARTS = [
  { value: 1, labelEn: 'January', labelEs: 'Enero' },
  { value: 4, labelEn: 'April', labelEs: 'Abril' },
  { value: 7, labelEn: 'July', labelEs: 'Julio' },
  { value: 10, labelEn: 'October', labelEs: 'Octubre' },
] as const;

export const TIMEZONES = [
  'America/New_York',
  'America/Chicago', 
  'America/Denver',
  'America/Los_Angeles',
  'America/Argentina/Buenos_Aires',
  'America/Sao_Paulo',
  'America/Bogota',
  'America/Mexico_City',
  'America/Santiago',
  'America/Lima',
  'America/Montevideo',
  'Europe/Madrid',
  'UTC',
] as const;

// Type exports
export type Industry = typeof INDUSTRIES[number];
export type Country = typeof COUNTRIES[number];
export type Currency = typeof CURRENCIES[number];
export type Locale = typeof LOCALES[number];
export type DisplayUnit = typeof DISPLAY_UNITS[number];
export type FiscalYearStart = typeof FISCAL_YEAR_STARTS[number];
export type Timezone = typeof TIMEZONES[number];