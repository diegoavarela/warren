import React, { useState, useEffect } from 'react'
import {
  CurrencyDollarIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import { Currency, Unit, CURRENCIES, UNITS } from '../interfaces/currency'
import { currencyService } from '../services/currencyService'

interface CurrencySelectorProps {
  currentCurrency: Currency
  currentUnit: Unit
  onCurrencyChange: (currency: Currency) => void
  onUnitChange: (unit: Unit) => void
  baseCurrency?: Currency
  showConversionRate?: boolean
  compact?: boolean
}

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  currentCurrency,
  currentUnit,
  onCurrencyChange,
  onUnitChange,
  baseCurrency,
  showConversionRate = true,
  compact = false
}) => {
  const [showDropdown, setShowDropdown] = useState(false)
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (showConversionRate && baseCurrency && baseCurrency !== currentCurrency) {
      loadExchangeRate()
    }
  }, [currentCurrency, baseCurrency])

  const loadExchangeRate = async () => {
    if (!baseCurrency) return
    
    setLoading(true)
    try {
      const rate = await currencyService.getExchangeRate(baseCurrency, currentCurrency)
      setExchangeRate(rate)
    } catch (error) {
      console.error('Failed to load exchange rate:', error)
    } finally {
      setLoading(false)
    }
  }

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <select
          value={currentCurrency}
          onChange={(e) => onCurrencyChange(e.target.value as Currency)}
          className="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {Object.entries(CURRENCIES).map(([code]) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
        <select
          value={currentUnit}
          onChange={(e) => onUnitChange(e.target.value as Unit)}
          className="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {Object.entries(UNITS).map(([unit, info]) => (
            <option key={unit} value={unit}>
              {info.suffix || info.label}
            </option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <CurrencyDollarIcon className="h-5 w-5 text-gray-500" />
        <span className="font-medium">
          {currentCurrency} / {UNITS[currentUnit].suffix || currentUnit}
        </span>
        {showConversionRate && baseCurrency && baseCurrency !== currentCurrency && (
          <span className="text-xs text-blue-600 font-medium">
            (from {baseCurrency})
          </span>
        )}
        <ChevronDownIcon className="h-4 w-4 text-gray-500" />
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Display Settings</h3>
            
            {/* Currency Selection */}
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-2">Currency</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(CURRENCIES).map(([code, info]) => (
                  <button
                    key={code}
                    onClick={() => {
                      onCurrencyChange(code as Currency)
                    }}
                    className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                      currentCurrency === code
                        ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                        : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="font-medium">{code}</div>
                    <div className="text-xs opacity-75">{info.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Unit Selection */}
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-2">Unit</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(UNITS).map(([unit, info]) => (
                  <button
                    key={unit}
                    onClick={() => {
                      onUnitChange(unit as Unit)
                    }}
                    className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                      currentUnit === unit
                        ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                        : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {info.label}
                    {info.suffix && (
                      <span className="text-xs ml-1">({info.suffix})</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Exchange Rate Info */}
            {showConversionRate && baseCurrency && baseCurrency !== currentCurrency && (
              <div className="pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Exchange Rate</span>
                  {loading ? (
                    <span className="text-gray-400">Loading...</span>
                  ) : exchangeRate ? (
                    <span className="font-medium text-gray-900">
                      1 {baseCurrency} = {exchangeRate.toFixed(2)} {currentCurrency}
                    </span>
                  ) : (
                    <span className="text-gray-400">Not available</span>
                  )}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  All values converted from {baseCurrency}
                </div>
              </div>
            )}
          </div>

          {/* Close button */}
          <div className="px-4 py-3 bg-gray-50 rounded-b-xl">
            <button
              onClick={() => setShowDropdown(false)}
              className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}