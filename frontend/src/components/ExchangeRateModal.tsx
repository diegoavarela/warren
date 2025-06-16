import React, { useState, useEffect } from 'react'
import {
  XMarkIcon,
  CurrencyDollarIcon,
  ArrowsRightLeftIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { Currency } from '../interfaces/currency'
import { currencyService } from '../services/currencyService'

interface ExchangeRateModalProps {
  isOpen: boolean
  onClose: () => void
  baseCurrency: Currency
  targetCurrency: Currency
  currentRate: number | null
  onRateUpdate: (rate: number) => void
}

export const ExchangeRateModal: React.FC<ExchangeRateModalProps> = ({
  isOpen,
  onClose,
  baseCurrency,
  targetCurrency,
  currentRate,
  onRateUpdate
}) => {
  const [manualRate, setManualRate] = useState<string>('')
  const [useManualRate, setUseManualRate] = useState(false)
  const [apiRate, setApiRate] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && currentRate) {
      setManualRate(currentRate.toFixed(2))
      fetchLatestRate()
    }
  }, [isOpen, currentRate])

  const fetchLatestRate = async () => {
    setLoading(true)
    try {
      const rate = await currencyService.getExchangeRate(baseCurrency, targetCurrency, true) // Force fresh fetch
      setApiRate(rate)
    } catch (error) {
      console.error('Failed to fetch latest rate:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = () => {
    const rate = parseFloat(manualRate)
    if (!isNaN(rate) && rate > 0) {
      onRateUpdate(rate)
      onClose()
    }
  }

  const handleUseApiRate = () => {
    if (apiRate) {
      setManualRate(apiRate.toFixed(2))
      setUseManualRate(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
        <div className="border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <CurrencyDollarIcon className="h-6 w-6 mr-2 text-blue-600" />
            Exchange Rate Settings
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          {/* Current Exchange */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-center space-x-3 text-lg font-medium">
              <span className="text-gray-700">{baseCurrency}</span>
              <ArrowsRightLeftIcon className="h-5 w-5 text-gray-400" />
              <span className="text-gray-700">{targetCurrency}</span>
            </div>
          </div>

          {/* API Rate */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700">Live Exchange Rate</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">From exchangerate-api.com</p>
                  <p className="text-lg font-semibold text-blue-700">
                    1 {baseCurrency} = {loading ? 'Loading...' : apiRate ? apiRate.toFixed(2) : 'N/A'} {targetCurrency}
                  </p>
                </div>
                {apiRate && !loading && (
                  <button
                    onClick={handleUseApiRate}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Use This Rate
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Manual Rate Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Custom Exchange Rate</h3>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={useManualRate}
                  onChange={(e) => setUseManualRate(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">Use custom rate</span>
              </label>
            </div>
            
            <div className="relative">
              <input
                type="number"
                value={manualRate}
                onChange={(e) => setManualRate(e.target.value)}
                disabled={!useManualRate}
                step="0.0001"
                min="0"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  !useManualRate ? 'bg-gray-100 text-gray-500' : 'bg-white'
                }`}
                placeholder="Enter custom rate"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-gray-500 text-sm">{targetCurrency}</span>
              </div>
            </div>
            
            {useManualRate && (
              <div className="flex items-start space-x-2 mt-2">
                <ExclamationTriangleIcon className="h-4 w-4 text-amber-500 mt-0.5" />
                <p className="text-xs text-amber-600">
                  Using a custom rate will override the live exchange rate for this session only.
                </p>
              </div>
            )}
          </div>

          {/* Current Rate Display */}
          <div className="bg-gray-100 rounded-lg p-3">
            <p className="text-sm text-gray-600">Currently using:</p>
            <p className="text-base font-semibold text-gray-900">
              1 {baseCurrency} = {currentRate ? currentRate.toFixed(2) : 'N/A'} {targetCurrency}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-gray-200 p-6 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!useManualRate || !manualRate || parseFloat(manualRate) <= 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Apply Rate
          </button>
        </div>
      </div>
    </div>
  )
}