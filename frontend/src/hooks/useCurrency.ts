import { useState, useEffect, useCallback } from 'react'
import { Currency, Unit, CurrencySettings } from '../interfaces/currency'
import { currencyService } from '../services/currencyService'
import { configurationService } from '../services/configurationService'
import { isMockDataMode } from '../utils/screenshotMode'

interface UseCurrencyReturn {
  currency: Currency
  unit: Unit
  baseCurrency: Currency
  baseUnit: Unit // The unit in which source data is stored
  settings: CurrencySettings
  setCurrency: (currency: Currency) => void
  setUnit: (unit: Unit) => void
  convertAmount: (amount: number, fromCurrency?: Currency) => Promise<number>
  formatAmount: (amount: number, options?: Intl.NumberFormatOptions) => string
  convertAndFormatAmount: (amount: number, fromCurrency?: Currency) => Promise<string>
  loading: boolean
}

export const useCurrency = (module?: 'pnl' | 'cashflow'): UseCurrencyReturn => {
  const [currency, setCurrency] = useState<Currency>('ARS')
  const [unit, setUnit] = useState<Unit>('thousands')
  const [baseCurrency, setBaseCurrency] = useState<Currency>('ARS')
  const [baseUnit, setBaseUnit] = useState<Unit>('thousands')
  const [settings, setSettings] = useState<CurrencySettings>({
    defaultCurrency: 'ARS',
    defaultUnit: 'thousands',
    enableCurrencyConversion: true,
    showCurrencySelector: true
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCompanySettings()
  }, [module])

  const loadCompanySettings = async () => {
    try {
      if (isMockDataMode()) {
        // Use default settings for screenshots
        setBaseCurrency('ARS')
        setCurrency('ARS')
        setUnit('thousands')
        setBaseUnit('thousands')
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
        
        // First set defaults from company.currencySettings if available
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
        
        // Then override with module-specific settings if available
        if (module === 'pnl' && company.pnlSettings) {
          console.log('Loading P&L settings from company:', company.pnlSettings)
          setCurrency(company.pnlSettings.currency)
          setUnit(company.pnlSettings.unit)
          setBaseCurrency(company.pnlSettings.currency) // P&L data comes in this currency
          setBaseUnit(company.pnlSettings.unit) // P&L data comes in this unit
          
          // Override currency settings with module-specific ones
          setSettings(prev => ({
            ...prev,
            defaultCurrency: company.pnlSettings.currency,
            defaultUnit: company.pnlSettings.unit,
            enableCurrencyConversion: company.pnlSettings.enableCurrencyConversion ?? prev.enableCurrencyConversion,
            showCurrencySelector: company.pnlSettings.showCurrencySelector ?? prev.showCurrencySelector
          }))
        } else if (module === 'cashflow' && company.cashflowSettings) {
          console.log('Loading Cash Flow settings from company:', company.cashflowSettings)
          setCurrency(company.cashflowSettings.currency)
          setUnit(company.cashflowSettings.unit)
          setBaseCurrency(company.cashflowSettings.currency) // Cashflow data comes in this currency
          setBaseUnit(company.cashflowSettings.unit) // Cashflow data comes in this unit
          
          // Override currency settings with module-specific ones
          setSettings(prev => ({
            ...prev,
            defaultCurrency: company.cashflowSettings.currency,
            defaultUnit: company.cashflowSettings.unit,
            enableCurrencyConversion: company.cashflowSettings.enableCurrencyConversion ?? prev.enableCurrencyConversion,
            showCurrencySelector: company.cashflowSettings.showCurrencySelector ?? prev.showCurrencySelector
          }))
        } else {
          setCurrency(defaultCurrency)
          setUnit(defaultUnit)
          setBaseUnit(defaultUnit)
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
    baseUnit,
    settings,
    setCurrency,
    setUnit,
    convertAmount,
    formatAmount,
    convertAndFormatAmount,
    loading
  }
}