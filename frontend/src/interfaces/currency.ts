export type Currency = 'ARS' | 'USD' | 'EUR' | 'BRL'
export type Unit = 'units' | 'thousands' | 'millions'

export interface CurrencySettings {
  defaultCurrency: Currency
  defaultUnit: Unit
  enableCurrencyConversion: boolean
  showCurrencySelector: boolean
}

export interface ExchangeRate {
  from: Currency
  to: Currency
  rate: number
  timestamp: Date
}

export interface CurrencyDisplay {
  currency: Currency
  unit: Unit
  value: number
  formatted: string
}

export const CURRENCIES: Record<Currency, { symbol: string; name: string; locale: string }> = {
  ARS: { symbol: '$', name: 'Argentine Peso', locale: 'es-AR' },
  USD: { symbol: '$', name: 'US Dollar', locale: 'en-US' },
  EUR: { symbol: '€', name: 'Euro', locale: 'de-DE' },
  BRL: { symbol: 'R$', name: 'Brazilian Real', locale: 'pt-BR' }
}

export const UNITS: Record<Unit, { label: string; multiplier: number; suffix: string }> = {
  units: { label: 'Units', multiplier: 1, suffix: '' },
  thousands: { label: 'Thousands', multiplier: 1000, suffix: 'K' },
  millions: { label: 'Millions', multiplier: 1000000, suffix: 'M' }
}