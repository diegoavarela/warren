import axios from 'axios'
import { Currency, ExchangeRate } from '../interfaces/currency'

const API_BASE_URL = 'http://localhost:3002/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Mock exchange rates for fallback (June 2025)
const MOCK_RATES: Record<string, number> = {
  'USD_ARS': 1187.67,
  'USD_EUR': 0.92,
  'USD_BRL': 4.95,
  'EUR_ARS': 1290.90,
  'EUR_USD': 1.09,
  'EUR_BRL': 5.38,
  'ARS_USD': 0.000842,
  'ARS_EUR': 0.000774,
  'ARS_BRL': 0.00417,
  'BRL_USD': 0.202,
  'BRL_EUR': 0.186,
  'BRL_ARS': 239.93
}

class CurrencyService {
  private cache: Map<string, { rate: number; timestamp: number }> = new Map()
  private cacheTimeout = 3600000 // 1 hour in milliseconds
  
  // Set a manual exchange rate
  setExchangeRate(from: Currency, to: Currency, rate: number): void {
    const cacheKey = `${from}_${to}`
    this.cache.set(cacheKey, { rate, timestamp: Date.now() })
    
    // Also set the reverse rate
    const reverseCacheKey = `${to}_${from}`
    this.cache.set(reverseCacheKey, { rate: 1 / rate, timestamp: Date.now() })
  }

  async getExchangeRate(from: Currency, to: Currency, forceRefresh: boolean = false): Promise<number> {
    if (from === to) return 1

    const cacheKey = `${from}_${to}`
    const cached = this.cache.get(cacheKey)
    
    if (!forceRefresh && cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.rate
    }

    try {
      // Call the real API
      const response = await api.get('/currency/exchange-rate', {
        params: { from, to }
      })
      
      if (response.data.success) {
        const rate = response.data.data.rate
        
        this.cache.set(cacheKey, {
          rate,
          timestamp: Date.now()
        })
        
        return rate
      }
      
      throw new Error('Failed to get exchange rate')
    } catch (error) {
      console.error('Failed to fetch exchange rate:', error)
      // Return mock rate as fallback
      return MOCK_RATES[cacheKey] || 1
    }
  }

  async convertCurrency(
    amount: number,
    from: Currency,
    to: Currency
  ): Promise<number> {
    const rate = await this.getExchangeRate(from, to)
    console.log(`Converting ${amount} from ${from} to ${to} with rate ${rate} = ${amount * rate}`)
    return amount * rate
  }

  formatCurrency(
    amount: number,
    currency: Currency,
    unit: 'units' | 'thousands' | 'millions' = 'units',
    options?: Intl.NumberFormatOptions
  ): string {
    const unitMultipliers = {
      units: 1,
      thousands: 1000,
      millions: 1000000
    }

    const adjustedAmount = amount / unitMultipliers[unit]
    
    const currencyInfo = {
      ARS: { locale: 'es-AR', currency: 'ARS' },
      USD: { locale: 'en-US', currency: 'USD' },
      EUR: { locale: 'de-DE', currency: 'EUR' },
      BRL: { locale: 'pt-BR', currency: 'BRL' }
    }

    const { locale, currency: currencyCode } = currencyInfo[currency]
    
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: unit === 'units' ? 0 : 2,
      maximumFractionDigits: unit === 'units' ? 0 : 2,
      ...options
    })

    let formatted = formatter.format(adjustedAmount)
    
    // Add unit suffix if not units
    if (unit !== 'units') {
      const unitSuffix = unit === 'thousands' ? 'K' : 'M'
      formatted = formatted.replace(/\s*$/, ` ${unitSuffix}`)
    }
    
    return formatted
  }

  clearCache(): void {
    this.cache.clear()
  }
}

export const currencyService = new CurrencyService()