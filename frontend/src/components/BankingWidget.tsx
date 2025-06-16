import React, { useEffect, useState } from 'react'
import { 
  BuildingLibraryIcon,
  BanknotesIcon,
  QuestionMarkCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { cashflowService } from '../services/cashflowService'
import { mockWidgetData } from '../services/mockDataService'
import { isScreenshotMode } from '../utils/screenshotHelper'

interface BankData {
  month: string
  date: string
  checkingBalance?: number
  savingsBalance?: number
  moneyMarketBalance?: number
  bankFees?: number
  interestEarned?: number
  creditLineUsed?: number
  creditLineAvailable?: number
  creditLineTotal?: number
}

interface BankingWidgetProps {
  currency: 'ARS' | 'USD' | 'EUR' | 'BRL'
  displayUnit: 'actual' | 'thousands' | 'millions' | 'billions'
}

export const BankingWidget: React.FC<BankingWidgetProps> = ({ currency, displayUnit }) => {
  const [bankData, setBankData] = useState<BankData[]>([])
  const [loading, setLoading] = useState(true)
  const [showHelpModal, setShowHelpModal] = useState(false)

  useEffect(() => {
    loadBankData()
  }, [])

  const loadBankData = async () => {
    try {
      setLoading(true)
      
      if (isScreenshotMode()) {
        // Use mock data for screenshots
        setBankData([{
          month: 'January 2025',
          date: '2025-01-15',
          checkingBalance: mockWidgetData.banking.accounts[0].balance,
          savingsBalance: mockWidgetData.banking.accounts[1].balance,
          moneyMarketBalance: 0,
          bankFees: 2500,
          interestEarned: 8500,
          creditLineUsed: 150000,
          creditLineAvailable: 350000,
          creditLineTotal: 500000
        }])
      } else {
        const response = await cashflowService.getBankingData()
        setBankData(response.data.data)
      }
    } catch (error) {
      console.error('Failed to load bank data:', error)
      // Don't use mock data - leave empty
      setBankData([])
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

  // Find current month's data or June data
  const now = new Date()
  const currentMonthName = now.toLocaleString('en-US', { month: 'long' })
  
  // Try to find current month's data, otherwise use June 2025
  let currentData = bankData.find(d => d.month === currentMonthName)
  if (!currentData) {
    currentData = bankData.find(d => d.month === 'June')
  }
  if (!currentData && bankData.length > 0) {
    // Fallback to first month if neither current nor June found
    currentData = bankData[0]
  }
  
  // Find previous month's data
  const currentIndex = currentData ? bankData.findIndex(d => d.month === currentData!.month) : -1
  const previousData = currentIndex > 0 ? bankData[currentIndex - 1] : null
  
  const totalCashBalance = currentData 
    ? (currentData.checkingBalance! + currentData.savingsBalance! + (currentData.moneyMarketBalance || 0))
    : 0
    
    
  const creditUtilization = currentData && currentData.creditLineTotal
    ? (currentData.creditLineUsed! / currentData.creditLineTotal!) * 100
    : 0

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 animate-pulse">
        <div className="h-48 bg-gray-100 rounded"></div>
      </div>
    )
  }

  if (bankData.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl bg-blue-100">
              <BuildingLibraryIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Banking Overview</h3>
              <p className="text-sm font-medium text-gray-500">No detailed banking data</p>
            </div>
          </div>
        </div>
        <div className="text-center py-12">
          <BuildingLibraryIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">Banking details not available in the uploaded file</p>
          <p className="text-sm text-gray-400">Cash balance information can be found in the main dashboard metrics</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-blue-100">
            <BuildingLibraryIcon className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Banking Overview</h3>
            <p className="text-sm font-medium text-gray-500">
              Bank expenses and fees
            </p>
          </div>
        </div>
        
        <button
          onClick={() => setShowHelpModal(true)}
          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title="Understanding banking overview"
        >
          <QuestionMarkCircleIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Bank Fees */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-red-50 to-orange-50 border border-red-200">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Monthly Bank Expenses</span>
            <span className="text-2xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
              {formatCurrency(currentData?.bankFees || 0)}
            </span>
          </div>
        </div>

        {/* Bank Fees Summary */}
        <div className="grid grid-cols-1 gap-3">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <BanknotesIcon className="h-5 w-5 text-gray-600" />
              <span className="text-sm text-gray-600">Total Bank Expenses</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">
              {formatCurrency(currentData?.bankFees || 0)}
            </span>
          </div>
          
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <BanknotesIcon className="h-5 w-5 text-gray-600" />
              <span className="text-sm text-gray-600">Fees and Charges</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">
              {formatCurrency(currentData?.bankFees || 0)}
            </span>
          </div>
        </div>

        {/* Monthly Summary */}
        <div className="pt-3 border-t border-gray-200">
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <BuildingLibraryIcon className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Monthly Total</span>
              </div>
              <span className="text-lg font-bold text-blue-600">
                {formatCurrency(currentData?.bankFees || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Understanding Banking Overview</h2>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">🏦 Banking Overview</h3>
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700">
                    Your banking overview provides a comprehensive view of your cash positions 
                    across different account types and tracks related costs and income.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">💰 Account Types</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div><strong>Checking Account:</strong> Primary operating account for daily transactions</div>
                  <div><strong>Savings Account:</strong> Interest-bearing account for reserves</div>
                  <div><strong>Money Market:</strong> Higher-yield account with limited transactions</div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">💳 Credit Utilization</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span>Under 30%: Excellent</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                    <span>30-80%: Monitor closely</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                    <span>Over 80%: Consider reducing</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 Current Summary</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Total Cash Balance:</span>
                    <span className="font-medium">{formatCurrency(totalCashBalance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Credit Utilization:</span>
                    <span className="font-medium">{creditUtilization.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Monthly Net Interest:</span>
                    <span className="font-medium text-green-600">
                      {currentData ? formatCurrency((currentData.interestEarned!) - (currentData.bankFees!)) : '$0'}
                    </span>
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