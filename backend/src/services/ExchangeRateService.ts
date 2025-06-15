import axios from 'axios'
import { logger } from '../utils/logger'

interface ExchangeRate {
  from: string
  to: string
  rate: number
  timestamp: Date
}

export class ExchangeRateService {
  private static instance: ExchangeRateService
  private cache: Map<string, { rate: number; timestamp: number }> = new Map()
  private cacheTimeout = 3600000 // 1 hour in milliseconds
  
  // Using exchangerate-api.com free tier
  private apiKey = process.env.EXCHANGE_RATE_API_KEY || 'YOUR_API_KEY'
  private baseUrl = 'https://v6.exchangerate-api.com/v6'

  private constructor() {}

  static getInstance(): ExchangeRateService {
    if (!ExchangeRateService.instance) {
      ExchangeRateService.instance = new ExchangeRateService()
    }
    return ExchangeRateService.instance
  }

  async getExchangeRate(from: string, to: string): Promise<number> {
    if (from === to) return 1

    const cacheKey = `${from}_${to}`
    const cached = this.cache.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      logger.info(`Exchange rate from cache: ${from} to ${to} = ${cached.rate}`)
      return cached.rate
    }

    try {
      // Using exchangerate-api.com
      const response = await axios.get(`${this.baseUrl}/${this.apiKey}/latest/${from}`)
      
      if (response.data.result === 'success') {
        const rate = response.data.conversion_rates[to]
        
        if (rate) {
          this.cache.set(cacheKey, {
            rate,
            timestamp: Date.now()
          })
          
          logger.info(`Exchange rate from API: ${from} to ${to} = ${rate}`)
          return rate
        }
      }
      
      throw new Error('Failed to get exchange rate')
    } catch (error) {
      logger.error('Failed to fetch exchange rate from API:', error)
      
      // Fallback to hardcoded rates
      return this.getFallbackRate(from, to)
    }
  }

  private getFallbackRate(from: string, to: string): number {
    // Fallback exchange rates (approximate as of 2025)
    const fallbackRates: Record<string, Record<string, number>> = {
      USD: {
        ARS: 850.50,
        EUR: 0.92,
        BRL: 4.95,
        USD: 1
      },
      EUR: {
        ARS: 924.35,
        USD: 1.09,
        BRL: 5.38,
        EUR: 1
      },
      ARS: {
        USD: 0.00118,
        EUR: 0.00108,
        BRL: 0.00582,
        ARS: 1
      },
      BRL: {
        USD: 0.202,
        EUR: 0.186,
        ARS: 171.82,
        BRL: 1
      }
    }

    const rate = fallbackRates[from]?.[to]
    if (rate) {
      logger.warn(`Using fallback exchange rate: ${from} to ${to} = ${rate}`)
      return rate
    }

    // If no rate found, return 1 as a last resort
    logger.error(`No exchange rate found for ${from} to ${to}, using 1`)
    return 1
  }

  async convertAmount(amount: number, from: string, to: string): Promise<number> {
    const rate = await this.getExchangeRate(from, to)
    return amount * rate
  }

  clearCache(): void {
    this.cache.clear()
  }
}