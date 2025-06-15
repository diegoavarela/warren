import { useState, useEffect, useCallback } from 'react'
import { Currency, Unit, CurrencySettings } from '../interfaces/currency'
import { currencyService } from '../services/currencyService'
import { configurationService } from '../services/configurationService'
import { isMockDataMode } from '../utils/screenshotMode'

interface UseCurrencyReturn {
  currency: Currency
  unit: Unit
  baseCurrency: Currency
  settings: CurrencySettings
  setCurrency: (currency: Currency) => void
  setUnit: (unit: Unit) => void
  convertAmount: (amount: number, fromCurrency?: Currency) => Promise<number>
  formatAmount: (amount: number, options?: Intl.NumberFormatOptions) => string
  convertAndFormatAmount: (amount: number, fromCurrency?: Currency) => Promise<string>
  loading: boolean
}

export const useCurrency = (): UseCurrencyReturn => {
  const [currency, setCurrency] = useState<Currency>('ARS')
  const [unit, setUnit] = useState<Unit>('thousands')
  const [baseCurrency, setBaseCurrency] = useState<Currency>('ARS')
  const [settings, setSettings] = useState<CurrencySettings>({
    defaultCurrency: 'ARS',
    defaultUnit: 'thousands',
    enableCurrencyConversion: true,
    showCurrencySelector: true
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCompanySettings()
  }, [])

  const loadCompanySettings = async () => {
    try {
      if (isMockDataMode()) {
        // Use default settings for screenshots
        setBaseCurrency('ARS')
        setCurrency('ARS')
        setUnit('thousands')
        setSettings({
          defaultCurrency: 'ARS',
          defaultUnit: 'thousands',
          enableCurrencyConversion: true,
          showCurrencySelector: true
        })
        setLoading(false)
        return
      }
      
      const response = await configurationService.getActiveCompany()
      const company = response.data
      
      if (company) {
        const defaultCurrency = company.defaultCurrency || company.currency as Currency || 'ARS'
        const defaultUnit = company.defaultUnit || company.scale as Unit || 'thousands'
        
        setBaseCurrency(defaultCurrency)
        setCurrency(defaultCurrency)
        setUnit(defaultUnit)
        
        if (company.currencySettings) {
          setSettings(company.currencySettings)
        } else {
          setSettings({
            defaultCurrency,
            defaultUnit,
            enableCurrencyConversion: true,
            showCurrencySelector: true
          })
        }
      }
    } catch (error) {
      console.error('Failed to load company settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const convertAmount = useCallback(async (amount: number, fromCurrency?: Currency): Promise<number> => {
    const sourceCurrency = fromCurrency || baseCurrency
    
    if (sourceCurrency === currency) {
      return amount
    }

    if (!settings.enableCurrencyConversion) {
      return amount
    }

    try {
      return await currencyService.convertCurrency(amount, sourceCurrency, currency)
    } catch (error) {
      console.error('Failed to convert currency:', error)
      return amount
    }
  }, [currency, baseCurrency, settings.enableCurrencyConversion])

  const formatAmount = useCallback((amount: number, options?: Intl.NumberFormatOptions): string => {
    return currencyService.formatCurrency(amount, currency, unit, options)
  }, [currency, unit])

  const convertAndFormatAmount = useCallback(async (amount: number, fromCurrency?: Currency): Promise<string> => {
    const convertedAmount = await convertAmount(amount, fromCurrency)
    return formatAmount(convertedAmount)
  }, [convertAmount, formatAmount])

  return {
    currency,
    unit,
    baseCurrency,
    settings,
    setCurrency,
    setUnit,
    convertAmount,
    formatAmount,
    convertAndFormatAmount,
    loading
  }
}