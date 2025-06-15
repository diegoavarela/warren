import React, { useEffect, useState } from 'react'
import { 
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ReceiptPercentIcon,
  QuestionMarkCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { cashflowService } from '../services/cashflowService'
import { mockWidgetData } from '../services/mockDataService'
import { isScreenshotMode } from '../utils/screenshotHelper'

interface TaxData {
  month: string
  date: string
  totalTaxBurden?: number
  effectiveTaxRate?: number
}

interface TaxesWidgetProps {
  currency: 'ARS' | 'USD' | 'EUR' | 'BRL'
  displayUnit: 'actual' | 'thousands' | 'millions' | 'billions'
}

export const TaxesWidget: React.FC<TaxesWidgetProps> = ({ currency, displayUnit }) => {
  const [taxData, setTaxData] = useState<TaxData[]>([])
  const [loading, setLoading] = useState(true)
  const [showHelpModal, setShowHelpModal] = useState(false)

  useEffect(() => {
    loadTaxData()
  }, [])

  const loadTaxData = async () => {
    try {
      setLoading(true)
      
      if (isScreenshotMode()) {
        // Use mock data for screenshots
        setTaxData(mockWidgetData.taxes)
        return
      }
      
      const response = await cashflowService.getTaxesData()
      setTaxData(response.data.data)
    } catch (error) {
      console.error('Failed to load tax data:', error)
      // Don't use mock data - leave empty
      setTaxData([])
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '$0'
    }
    
    let adjustedAmount = amount
    let unitSuffix = ''
    
    switch (displayUnit) {
      case 'thousands':
        adjustedAmount = amount / 1000
        unitSuffix = 'K'
        break
      case 'millions':
        adjustedAmount = amount / 1000000
        unitSuffix = 'M'
        break
      case 'billions':
        adjustedAmount = amount / 1000000000
        unitSuffix = 'B'
        break
      default:
        adjustedAmount = amount
        unitSuffix = ''
    }
    
    const localeMap = {
      'ARS': 'es-AR',
      'USD': 'en-US', 
      'EUR': 'de-DE',
      'BRL': 'pt-BR'
    }
    
    try {
      let formatted: string
      
      if (currency === 'ARS') {
        const number = new Intl.NumberFormat('es-AR', {
          minimumFractionDigits: displayUnit === 'actual' ? 0 : 1,
          maximumFractionDigits: displayUnit === 'actual' ? 0 : 1,
        }).format(Math.abs(adjustedAmount))
        formatted = `$${number}`
      } else {
        formatted = new Intl.NumberFormat(localeMap[currency], {
          style: 'currency',
          currency: currency,
          minimumFractionDigits: displayUnit === 'actual' ? 0 : 1,
          maximumFractionDigits: displayUnit === 'actual' ? 0 : 1,
        }).format(Math.abs(adjustedAmount))
      }
      
      return unitSuffix ? `${formatted}${unitSuffix}` : formatted
    } catch (error) {
      return `$${Math.abs(adjustedAmount).toFixed(1)}${unitSuffix}`
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 animate-pulse">
        <div className="h-48 bg-gray-100 rounded"></div>
      </div>
    )
  }

  if (taxData.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl bg-red-100">
              <DocumentTextIcon className="h-8 w-8 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Tax Overview</h3>
              <p className="text-sm font-medium text-gray-500">No detailed tax data</p>
            </div>
          </div>
        </div>
        <div className="text-center py-12">
          <DocumentTextIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">Tax details not available in the uploaded file</p>
          <p className="text-sm text-gray-400">Tax information will be displayed here when available</p>
        </div>
      </div>
    )
  }

  // Find current month's data or June data
  const now = new Date()
  const currentMonthName = now.toLocaleString('en-US', { month: 'long' })
  
  // Try to find current month's data, otherwise use June 2025
  let currentData = taxData.find(d => d.month === currentMonthName)
  if (!currentData) {
    currentData = taxData.find(d => d.month === 'June')
  }
  if (!currentData && taxData.length > 0) {
    // Fallback to first month if neither current nor June found
    currentData = taxData[0]
  }
  
  // Find previous month's data
  const currentIndex = currentData ? taxData.findIndex(d => d.month === currentData!.month) : -1
  const previousData = currentIndex > 0 ? taxData[currentIndex - 1] : null
  
  // Calculate YTD only up to current month (June 2025)
  const totalTaxesPaid = taxData.slice(0, currentIndex + 1).reduce((sum, tax) => sum + (tax.totalTaxBurden || 0), 0)
  const netTaxBurden = totalTaxesPaid
  
  const taxChange = currentData && previousData 
    ? (currentData.totalTaxBurden || 0) - (previousData.totalTaxBurden || 0)
    : 0


  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-red-100">
            <DocumentTextIcon className="h-8 w-8 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Tax Overview</h3>
            <p className={`text-sm font-medium flex items-center space-x-1 ${
              taxChange >= 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              <ReceiptPercentIcon className="h-4 w-4" />
              <span>
                Total Tax Burden: {formatCurrency(currentData?.totalTaxBurden || 0)}
              </span>
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowHelpModal(true)}
          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title="Understanding tax overview"
        >
          <QuestionMarkCircleIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Current Month Tax Burden */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-red-50 to-pink-50 border border-red-200">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Current Month Tax Burden</span>
            <span className="text-2xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
              {formatCurrency(currentData?.totalTaxBurden || 0)}
            </span>
          </div>
        </div>

        {/* YTD Summary */}
        <div className="grid grid-cols-1 gap-3">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">Total Taxes Paid (YTD)</span>
            <span className="text-sm font-semibold text-gray-900">
              {formatCurrency(totalTaxesPaid)}
            </span>
          </div>
          
          <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg border border-orange-200">
            <span className="text-sm font-medium text-gray-700">Net Tax Burden (YTD)</span>
            <span className="text-sm font-bold text-orange-600">
              {formatCurrency(netTaxBurden)}
            </span>
          </div>
        </div>

        {/* Monthly Change */}
        {previousData && (
          <div className="pt-3 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Month-over-Month Change</span>
              <span className={`text-sm font-semibold flex items-center space-x-1 ${
                taxChange >= 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                <span>
                  {taxChange >= 0 ? '+' : ''}{formatCurrency(Math.abs(taxChange))}
                </span>
              </span>
            </div>
          </div>
        )}

        {/* Tax Estimate Warning */}
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start space-x-2">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800">Estimated Annual Tax Liability</p>
            <p className="text-lg font-bold text-yellow-700">
              {formatCurrency(totalTaxesPaid * (12 / taxData.length))}
            </p>
            <p className="text-xs text-yellow-600 mt-1">
              Based on current {taxData.length}-month average
            </p>
          </div>
        </div>
      </div>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Understanding Tax Overview</h2>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 Tax Overview</h3>
                <div className="bg-red-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700">
                    Your tax overview tracks total tax payments from your financial data 
                    to help with planning and budgeting. All tax data is extracted directly 
                    from row 87 of your uploaded Excel file.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📈 Key Metrics Explained</h3>
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="font-medium text-gray-700">Current Month Tax Burden</span>
                      <span className="font-semibold text-lg">{formatCurrency(currentData?.totalTaxBurden || 0)}</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      The total tax amount for the currently selected month (typically June 2025). 
                      This is the exact value from row 87 of your Excel file for this specific month.
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="font-medium text-gray-700">Total Taxes Paid (YTD)</span>
                      <span className="font-semibold text-lg">{formatCurrency(totalTaxesPaid)}</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      The sum of all tax payments from January through the most recent month in your data. 
                      Calculated by adding up all monthly tax values from row 87 across all available months.
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="font-medium text-gray-700">Net Tax Burden (YTD)</span>
                      <span className="font-semibold text-lg">{formatCurrency(netTaxBurden)}</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Currently the same as Total Taxes Paid. In a more complete tax system, this would 
                      subtract any tax refunds or credits received, but your Excel data only contains tax payments.
                    </p>
                  </div>
                  
                  <div className="bg-yellow-50 rounded-lg p-3">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="font-medium text-gray-700">Estimated Annual Tax Liability</span>
                      <span className="font-semibold text-lg">{formatCurrency(totalTaxesPaid * (12 / taxData.length))}</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      A projection of your full-year tax burden based on your average monthly tax rate. 
                      Formula: (Total YTD Taxes ÷ Number of Months) × 12. Currently based on {taxData.length} months of data.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 Data Source & Calculations</h3>
                <div className="space-y-3 text-sm text-gray-600">
                  <div>
                    <strong className="text-gray-700">Excel Location:</strong>
                    <p className="text-xs mt-1">All tax data comes from row 87 of your Excel file, columns B through P (representing each month).</p>
                  </div>
                  
                  <div>
                    <strong className="text-gray-700">Month-over-Month Change:</strong>
                    <p className="text-xs mt-1">
                      When available, shows the difference between the current month's tax burden and the previous month. 
                      Green indicates a decrease in taxes, red indicates an increase.
                    </p>
                  </div>
                  
                  <div>
                    <strong className="text-gray-700">Important Notes:</strong>
                    <ul className="text-xs mt-1 space-y-1 list-disc list-inside">
                      <li>Tax values in Excel are typically negative (expenses), but displayed as positive here</li>
                      <li>The 25% effective tax rate shown in some places is a placeholder - actual rate would require revenue data</li>
                      <li>Annual estimates assume consistent tax patterns throughout the year</li>
                      <li>No tax breakdown by type is available - only total tax burden per month</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}