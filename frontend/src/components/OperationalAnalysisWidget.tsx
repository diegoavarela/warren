import React, { useEffect, useState } from 'react'
import { 
  CurrencyDollarIcon,
  UsersIcon,
  BuildingOffice2Icon,
  DocumentTextIcon,
  QuestionMarkCircleIcon,
  XMarkIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { Doughnut } from 'react-chartjs-2'
import { cashflowService } from '../services/cashflowService'
import { mockWidgetData } from '../services/mockDataService'
import { isScreenshotMode } from '../utils/screenshotHelper'

interface OperationalData {
  month: string
  date: string
  totalOpex?: number
  totalTaxes?: number
  totalBankAndTaxes?: number
  totalWages?: number
  totalOperationalCosts?: number
}

interface OperationalAnalysisWidgetProps {
  currency: 'ARS' | 'USD' | 'EUR' | 'BRL'
  displayUnit: 'actual' | 'thousands' | 'millions' | 'billions'
}

export const OperationalAnalysisWidget: React.FC<OperationalAnalysisWidgetProps> = ({ currency, displayUnit }) => {
  const [operationalData, setOperationalData] = useState<OperationalData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedView, setSelectedView] = useState<'breakdown' | 'trends'>('breakdown')
  const [showHelpModal, setShowHelpModal] = useState(false)

  useEffect(() => {
    loadOperationalData()
  }, [])

  const loadOperationalData = async () => {
    try {
      setLoading(true)
      
      if (isScreenshotMode()) {
        // Use mock data for screenshots
        setOperationalData(mockWidgetData.operational)
        return
      }
      
      const response = await cashflowService.getOperationalData()
      setOperationalData(response.data.data)
    } catch (error) {
      console.error('Failed to load operational data:', error)
      // Fall back to mock data if API fails
      setOperationalData([
        {
          month: 'Current',
          date: '2025-06-01',
          totalOpex: -7295031.6,
          totalTaxes: -1105000,
          totalBankAndTaxes: -800000,
          totalWages: -60086849.821,
          totalOperationalCosts: -69286881.421 // Sum of all operational costs
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '$0'
    }
    
    let adjustedAmount = Math.abs(amount) // Take absolute value since we know these are costs
    let unitSuffix = ''
    
    switch (displayUnit) {
      case 'thousands':
        adjustedAmount = adjustedAmount / 1000
        unitSuffix = 'K'
        break
      case 'millions':
        adjustedAmount = adjustedAmount / 1000000
        unitSuffix = 'M'
        break
      case 'billions':
        adjustedAmount = adjustedAmount / 1000000000
        unitSuffix = 'B'
        break
      default:
        adjustedAmount = adjustedAmount
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
        }).format(adjustedAmount)
        formatted = `$${number}`
      } else {
        formatted = new Intl.NumberFormat(localeMap[currency], {
          style: 'currency',
          currency: currency,
          minimumFractionDigits: displayUnit === 'actual' ? 0 : 1,
          maximumFractionDigits: displayUnit === 'actual' ? 0 : 1,
        }).format(adjustedAmount)
      }
      
      return unitSuffix ? `${formatted}${unitSuffix}` : formatted
    } catch (error) {
      return `$${adjustedAmount.toFixed(1)}${unitSuffix}`
    }
  }

  // Find current month's data or June 2025 data
  const now = new Date()
  const currentMonthName = now.toLocaleString('en-US', { month: 'long' })
  
  // Try to find current month's data, otherwise use June 2025
  let currentData = operationalData.find(d => d.month === currentMonthName)
  if (!currentData) {
    currentData = operationalData.find(d => d.month === 'June')
  }
  if (!currentData && operationalData.length > 0) {
    // Fallback to first month if neither current nor June found
    currentData = operationalData[0]
  }
  
  // Calculate percentages for breakdown
  const totalCosts = currentData ? Math.abs(currentData.totalOperationalCosts!) : 0
  const wagesPercentage = currentData ? (Math.abs(currentData.totalWages!) / totalCosts) * 100 : 0
  const opexPercentage = currentData ? (Math.abs(currentData.totalOpex!) / totalCosts) * 100 : 0
  const taxesPercentage = currentData ? (Math.abs(currentData.totalTaxes!) / totalCosts) * 100 : 0
  const bankTaxesPercentage = currentData ? (Math.abs(currentData.totalBankAndTaxes!) / totalCosts) * 100 : 0

  // Prepare chart data for cost breakdown
  const chartData = currentData ? {
    labels: ['Wages', 'OpEx', 'Taxes', 'Bank & Taxes'],
    datasets: [{
      data: [
        Math.abs(currentData.totalWages!),
        Math.abs(currentData.totalOpex!),
        Math.abs(currentData.totalTaxes!),
        Math.abs(currentData.totalBankAndTaxes!)
      ],
      backgroundColor: [
        '#3B82F6', // Blue - Wages (largest)
        '#8B5CF6', // Purple - OpEx  
        '#EF4444', // Red - Taxes
        '#F59E0B'  // Amber - Bank & Taxes
      ],
      borderWidth: 0,
      hoverOffset: 4
    }]
  } : null

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const value = context.parsed
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
            const percentage = ((value / total) * 100).toFixed(1)
            return `${context.label}: ${formatCurrency(value)} (${percentage}%)`
          }
        }
      }
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 animate-pulse">
        <div className="h-48 bg-gray-100 rounded"></div>
      </div>
    )
  }

  if (!currentData) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <div className="text-center py-8">
          <p className="text-gray-500">No operational data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-indigo-100">
            <BuildingOffice2Icon className="h-8 w-8 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Operational Cost Analysis</h3>
            <p className="text-sm font-medium text-gray-600">
              {currentData?.month} - Total costs: {formatCurrency(totalCosts)}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setSelectedView('breakdown')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                selectedView === 'breakdown'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Breakdown
            </button>
            <button
              onClick={() => setSelectedView('trends')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                selectedView === 'trends'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Analysis
            </button>
          </div>
          <button
            onClick={() => setShowHelpModal(true)}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Understanding operational costs"
          >
            <QuestionMarkCircleIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {selectedView === 'breakdown' ? (
        <div className="space-y-4">
          {/* Cost Breakdown Chart */}
          {chartData && (
            <div className="h-64 flex justify-center">
              <Doughnut data={chartData} options={chartOptions} />
            </div>
          )}
          
          {/* Detailed Cost Breakdown */}
          <div className="grid grid-cols-1 gap-3">
            <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <UsersIcon className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">Total Wages</span>
                </div>
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                  {wagesPercentage.toFixed(1)}%
                </span>
              </div>
              <span className="text-lg font-bold text-blue-600">
                {formatCurrency(currentData.totalWages!)}
              </span>
            </div>
            
            <div className="flex justify-between items-center p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <CurrencyDollarIcon className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-medium text-gray-700">Operating Expenses</span>
                </div>
                <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                  {opexPercentage.toFixed(1)}%
                </span>
              </div>
              <span className="text-lg font-bold text-purple-600">
                {formatCurrency(currentData.totalOpex!)}
              </span>
            </div>
            
            <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <DocumentTextIcon className="h-5 w-5 text-red-600" />
                  <span className="text-sm font-medium text-gray-700">Tax Obligations</span>
                </div>
                <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full font-medium">
                  {taxesPercentage.toFixed(1)}%
                </span>
              </div>
              <span className="text-lg font-bold text-red-600">
                {formatCurrency(currentData.totalTaxes!)}
              </span>
            </div>
            
            <div className="flex justify-between items-center p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <BuildingOffice2Icon className="h-5 w-5 text-amber-600" />
                  <span className="text-sm font-medium text-gray-700">Bank & Tax Fees</span>
                </div>
                <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full font-medium">
                  {bankTaxesPercentage.toFixed(1)}%
                </span>
              </div>
              <span className="text-lg font-bold text-amber-600">
                {formatCurrency(currentData.totalBankAndTaxes!)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Cost Analysis */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Largest Cost Category</h4>
              <div className="flex items-center space-x-2">
                <UsersIcon className="h-6 w-6 text-blue-600" />
                <div>
                  <p className="text-lg font-bold text-blue-600">Wages</p>
                  <p className="text-xs text-blue-600">{wagesPercentage.toFixed(1)}% of total costs</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Second Largest</h4>
              <div className="flex items-center space-x-2">
                <CurrencyDollarIcon className="h-6 w-6 text-purple-600" />
                <div>
                  <p className="text-lg font-bold text-purple-600">OpEx</p>
                  <p className="text-xs text-purple-600">{opexPercentage.toFixed(1)}% of total costs</p>
                </div>
              </div>
            </div>
          </div>

          {/* Cost Efficiency Metrics */}
          <div className="pt-4 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Cost Structure Analysis</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Payroll as % of Total Costs</span>
                <span className="text-sm font-semibold text-blue-600">{wagesPercentage.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Non-Payroll Operating Costs</span>
                <span className="text-sm font-semibold text-purple-600">
                  {formatCurrency((Math.abs(currentData.totalOpex!) + Math.abs(currentData.totalTaxes!) + Math.abs(currentData.totalBankAndTaxes!)))}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Tax Burden as % of Total</span>
                <span className="text-sm font-semibold text-red-600">
                  {((Math.abs(currentData.totalTaxes!) + Math.abs(currentData.totalBankAndTaxes!)) / totalCosts * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Alert if payroll is unusually high */}
          {wagesPercentage > 70 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start space-x-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">High Payroll Ratio</p>
                <p className="text-xs text-yellow-600 mt-1">
                  Payroll represents {wagesPercentage.toFixed(1)}% of total costs, which is above typical benchmarks (50-60%)
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Understanding Operational Costs</h2>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">🏢 Operational Cost Analysis</h3>
                <div className="bg-indigo-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700">
                    This analysis breaks down your major operational cost categories to help identify 
                    cost structure patterns and optimization opportunities.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">💰 Cost Categories</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div><strong>Total Wages:</strong> All employee compensation and benefits</div>
                  <div><strong>Operating Expenses:</strong> General business operational costs</div>
                  <div><strong>Tax Obligations:</strong> Corporate and business tax payments</div>
                  <div><strong>Bank & Tax Fees:</strong> Banking costs and additional tax-related fees</div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 Your Current Structure</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Total Operational Costs:</span>
                    <span className="font-medium">{formatCurrency(totalCosts)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Largest Category:</span>
                    <span className="font-medium text-blue-600">Wages ({wagesPercentage.toFixed(1)}%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax Burden:</span>
                    <span className="font-medium text-red-600">
                      {((Math.abs(currentData.totalTaxes!) + Math.abs(currentData.totalBankAndTaxes!)) / totalCosts * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📈 Industry Benchmarks</h3>
                <div className="bg-green-50 rounded-xl p-4 space-y-2">
                  <p className="text-sm text-gray-700 font-medium">Typical cost structure ranges:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 ml-2">
                    <li>Payroll: 50-60% of total operational costs</li>
                    <li>Operating Expenses: 25-35% of total costs</li>
                    <li>Tax Burden: 8-15% of total costs</li>
                    <li>Banking/Administrative: 2-5% of total costs</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}