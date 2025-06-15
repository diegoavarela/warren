import React, { useEffect, useState } from 'react'
import { 
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  QuestionMarkCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { Line } from 'react-chartjs-2'
import { cashflowService } from '../services/cashflowService'
import { mockWidgetData } from '../services/mockDataService'
import { isScreenshotMode } from '../utils/screenshotHelper'

interface InvestmentData {
  month: string
  date: string
  stockPortfolio?: number
  bondPortfolio?: number
  realEstate?: number
  totalInvestmentValue?: number
  monthlyReturn?: number
  returnPercentage?: number
  dividendInflow?: number
  investmentFees?: number
}

interface InvestmentsWidgetProps {
  currency: 'ARS' | 'USD' | 'EUR' | 'BRL'
  displayUnit: 'actual' | 'thousands' | 'millions' | 'billions'
}

export const InvestmentsWidget: React.FC<InvestmentsWidgetProps> = ({ currency, displayUnit }) => {
  const [investmentData, setInvestmentData] = useState<InvestmentData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedView, setSelectedView] = useState<'portfolio' | 'performance'>('portfolio')
  const [showHelpModal, setShowHelpModal] = useState(false)

  useEffect(() => {
    loadInvestmentData()
  }, [])

  const loadInvestmentData = async () => {
    try {
      setLoading(true)
      
      if (isScreenshotMode()) {
        // Use mock data for screenshots
        setInvestmentData(mockWidgetData.investments)
        return
      }
      
      const response = await cashflowService.getInvestmentsData()
      setInvestmentData(response.data.data)
    } catch (error) {
      console.error('Failed to load investment data:', error)
      // Don't use mock data - leave empty
      setInvestmentData([])
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

  const currentData = investmentData[investmentData.length - 1]
  const previousData = investmentData[investmentData.length - 2]
  
  const portfolioChange = currentData && previousData 
    ? currentData.totalInvestmentValue! - previousData.totalInvestmentValue!
    : 0
  
  const portfolioChangePercent = currentData && previousData && previousData.totalInvestmentValue
    ? ((currentData.totalInvestmentValue! - previousData.totalInvestmentValue!) / previousData.totalInvestmentValue!) * 100
    : 0

  const chartData = {
    labels: investmentData.map(d => d.month),
    datasets: [
      {
        label: 'Total Portfolio Value',
        data: investmentData.map(d => d.totalInvestmentValue),
        borderColor: '#8B5CF6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        borderWidth: 3,
        tension: 0.4,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: '#8B5CF6'
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const value = context.parsed.y
            return `Portfolio Value: ${formatCurrency(value)}`
          }
        }
      }
    },
    scales: {
      y: {
        ticks: {
          callback: (value: any) => formatCurrency(value)
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

  if (!currentData || investmentData.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl bg-purple-100">
              <ChartBarIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Investment Portfolio</h3>
              <p className="text-sm font-medium text-gray-500">No investment data</p>
            </div>
          </div>
        </div>
        <div className="text-center py-12">
          <ChartBarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">Investment details not available in the uploaded file</p>
          <p className="text-sm text-gray-400">Investment information will be displayed here when available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-purple-100">
            <ChartBarIcon className="h-8 w-8 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Investment Portfolio</h3>
            <p className={`text-sm font-medium flex items-center space-x-1 ${
              portfolioChange >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {portfolioChange >= 0 ? (
                <ArrowTrendingUpIcon className="h-4 w-4" />
              ) : (
                <ArrowTrendingDownIcon className="h-4 w-4" />
              )}
              <span>
                {portfolioChange >= 0 ? '+' : ''}{formatCurrency(Math.abs(portfolioChange))}
                ({portfolioChangePercent >= 0 ? '+' : ''}{portfolioChangePercent.toFixed(1)}%)
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setSelectedView('portfolio')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                selectedView === 'portfolio'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Portfolio
            </button>
            <button
              onClick={() => setSelectedView('performance')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                selectedView === 'performance'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Performance
            </button>
          </div>
          <button
            onClick={() => setShowHelpModal(true)}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Understanding investment portfolio"
          >
            <QuestionMarkCircleIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {selectedView === 'portfolio' ? (
        <div className="space-y-4">
          {/* Total Portfolio Value */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Total Portfolio Value</span>
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                {formatCurrency(currentData.totalInvestmentValue!)}
              </span>
            </div>
          </div>

          {/* Asset Allocation */}
          <div className="grid grid-cols-1 gap-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Stock Portfolio</span>
              <span className="text-sm font-semibold text-gray-900">
                {formatCurrency(currentData.stockPortfolio!)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Bond Portfolio</span>
              <span className="text-sm font-semibold text-gray-900">
                {formatCurrency(currentData.bondPortfolio!)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Real Estate</span>
              <span className="text-sm font-semibold text-gray-900">
                {formatCurrency(currentData.realEstate!)}
              </span>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="pt-3 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Dividend Income</p>
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(currentData.dividendInflow!)}
                </p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Investment Fees</p>
                <p className="text-lg font-bold text-red-600">
                  {formatCurrency(currentData.investmentFees!)}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Performance Chart */}
          <div className="h-64">
            <Line data={chartData} options={chartOptions} />
          </div>
          
          {/* Return Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
              <p className="text-xs text-gray-600 mb-1">Monthly Return</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(currentData.monthlyReturn!)}
              </p>
              <p className="text-xs text-green-600 mt-1">
                {currentData.returnPercentage! >= 0 ? '+' : ''}{currentData.returnPercentage!.toFixed(1)}%
              </p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <p className="text-xs text-gray-600 mb-1">Net Return</p>
              <p className="text-xl font-bold text-blue-600">
                {formatCurrency((currentData.monthlyReturn! + currentData.dividendInflow!) - currentData.investmentFees!)}
              </p>
              <p className="text-xs text-blue-600 mt-1">After fees</p>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Understanding Investment Portfolio</h2>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 Portfolio Overview</h3>
                <div className="bg-purple-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700">
                    Your investment portfolio tracks the performance and allocation of your invested assets 
                    across different asset classes including stocks, bonds, and real estate.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">💰 Key Metrics</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Total Portfolio Value:</span>
                    <span className="font-medium">{formatCurrency(currentData.totalInvestmentValue!)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Monthly Return:</span>
                    <span className="font-medium text-green-600">{formatCurrency(currentData.monthlyReturn!)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Return Percentage:</span>
                    <span className="font-medium">{currentData.returnPercentage!.toFixed(1)}%</span>
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