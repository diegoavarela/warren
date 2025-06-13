import React, { useEffect, useState } from 'react'
import { 
  FireIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon,
  QuestionMarkCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { Line } from 'react-chartjs-2'
import { cashflowService } from '../services/cashflowService'

interface BurnRateData {
  currentMonthBurn: number
  threeMonthAverage: number
  sixMonthAverage: number
  twelveMonthAverage: number | null
  burnRateChange: number
  trend: 'improving' | 'worsening' | 'stable'
  // Cash generation analysis
  currentMonthGeneration: number
  previousMonthGeneration: number
  generationChange: number
  generationChangePercent: number
  generationTrend: 'increasing' | 'decreasing' | 'stable'
  monthlyData: Array<{
    month: string
    burnRate: number
    changeFromPrevious: number
    isCashPositive: boolean
    cashGeneration: number
    generationChange: number
  }>
}

interface BurnRateTrendProps {
  currency: 'ARS' | 'USD' | 'EUR' | 'BRL'
  displayUnit: 'actual' | 'thousands' | 'millions' | 'billions'
}

export const BurnRateTrend: React.FC<BurnRateTrendProps> = ({ currency, displayUnit }) => {
  const [burnData, setBurnData] = useState<BurnRateData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedView, setSelectedView] = useState<'chart' | 'metrics'>('metrics')
  const [showHelpModal, setShowHelpModal] = useState(false)

  useEffect(() => {
    loadBurnRateData()
  }, [])

  // Force re-render when currency or displayUnit changes
  useEffect(() => {
    // No need to reload data, just trigger a re-render
  }, [currency, displayUnit])

  const loadBurnRateData = async () => {
    try {
      setLoading(true)
      const response = await cashflowService.getBurnRateAnalysis()
      setBurnData(response.data.data)
    } catch (error) {
      console.error('Failed to load burn rate analysis:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    // Handle invalid/null amounts
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '$0'
    }
    
    let adjustedAmount = amount
    let unitSuffix = ''
    
    // Apply unit conversion
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
        // Handle ARS manually since browser support varies
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
      console.error('Currency formatting error:', error, { amount, currency, displayUnit })
      return `$${Math.abs(adjustedAmount).toFixed(1)}${unitSuffix}`
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <ArrowUpIcon className="h-4 w-4 text-green-500" />
      case 'worsening':
        return <ArrowDownIcon className="h-4 w-4 text-red-500" />
      default:
        return <MinusIcon className="h-4 w-4 text-gray-500" />
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving':
        return 'text-green-600'
      case 'worsening':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const chartData = {
    labels: burnData?.monthlyData.map(d => d.month) || [],
    datasets: [
      {
        label: 'Cash Generation',
        data: burnData?.monthlyData.map(d => d.cashGeneration) || [],
        borderColor: (context: any) => {
          const value = context.parsed?.y || 0;
          return value >= 0 ? '#10B981' : '#EF4444';
        },
        backgroundColor: (context: any) => {
          const value = context.parsed?.y || 0;
          return value >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
        },
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: (context: any) => {
          const value = context.parsed?.y || 0;
          return value >= 0 ? '#10B981' : '#EF4444';
        }
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
            const absValue = formatCurrency(Math.abs(value))
            const monthData = burnData?.monthlyData[context.dataIndex]
            const change = monthData?.generationChange || 0
            return [
              `${value >= 0 ? 'Generating' : 'Burning'}: ${absValue}`,
              `Change: ${change > 0 ? '+' : ''}${formatCurrency(Math.abs(change))}`
            ]
          }
        }
      }
    },
    scales: {
      y: {
        ticks: {
          callback: (value: any) => {
            const absValue = Math.abs(value)
            return value >= 0 ? `+${formatCurrency(absValue)}` : `-${formatCurrency(absValue)}`
          }
        },
        grid: {
          color: (context: any) => {
            return context.tick.value === 0 ? '#6B7280' : 'rgba(0, 0, 0, 0.05)'
          },
          lineWidth: (context: any) => {
            return context.tick.value === 0 ? 2 : 1
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

  if (!burnData) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <div className="text-center py-8">
          <p className="text-gray-500">No burn rate data available</p>
        </div>
      </div>
    )
  }

  // With the fixed logic, burn rate is 0 when cash positive
  const isGenerating = burnData.currentMonthBurn === 0

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className={`p-3 rounded-xl ${isGenerating ? 'bg-green-100' : 'bg-red-100'}`}>
            <FireIcon className={`h-8 w-8 ${isGenerating ? 'text-green-600' : 'text-red-600'}`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {isGenerating ? 'Cash Generation' : 'Burn Rate'} Analysis
            </h3>
            <p className={`text-sm ${getTrendColor(burnData.trend)} font-medium flex items-center space-x-1`}>
              {getTrendIcon(burnData.trend)}
              <span className="capitalize">{burnData.trend}</span>
              <span className="text-gray-600">
                ({burnData.burnRateChange > 0 ? '+' : ''}{burnData.burnRateChange.toFixed(1)}% MoM)
              </span>
            </p>
          </div>
        </div>

        {/* View Toggle and Help */}
        <div className="flex items-center space-x-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setSelectedView('metrics')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                selectedView === 'metrics'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Metrics
            </button>
            <button
              onClick={() => setSelectedView('chart')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                selectedView === 'chart'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Chart
            </button>
          </div>
          <button
            onClick={() => setShowHelpModal(true)}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="How burn rate and cash generation work"
          >
            <QuestionMarkCircleIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {selectedView === 'metrics' ? (
        <div className="space-y-4">
          {/* Current Month */}
          <div className={`p-4 rounded-xl ${isGenerating ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Current Month</span>
              <span className={`text-2xl font-bold ${isGenerating ? 'text-green-700' : 'text-red-700'}`}>
                {isGenerating ? 'Cash Positive' : formatCurrency(burnData.currentMonthBurn)}
              </span>
            </div>
            
            {/* Formula Display */}
            <div className="mb-3 p-2 bg-white/80 rounded-lg border border-gray-200">
              <div className="text-xs font-mono text-gray-700 text-center">
                {isGenerating ? (
                  <span className="text-green-600">Inflow &gt; Outflow = Cash Positive ✓</span>
                ) : (
                  <span className="text-red-600">Burn Rate = Outflow - Inflow</span>
                )}
              </div>
            </div>
            
            {/* Cash Generation Analysis */}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Cash Generation</span>
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-medium ${burnData.currentMonthGeneration >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(Math.abs(burnData.currentMonthGeneration))}
                  </span>
                  {burnData.generationChange !== 0 && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      burnData.generationTrend === 'increasing' ? 'bg-green-100 text-green-700' :
                      burnData.generationTrend === 'decreasing' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {burnData.generationChange > 0 ? '+' : ''}{formatCurrency(Math.abs(burnData.generationChange))}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-500">vs Previous Month</span>
                <div className="flex items-center space-x-1">
                  {burnData.generationTrend === 'increasing' ? (
                    <ArrowUpIcon className="h-3 w-3 text-green-500" />
                  ) : burnData.generationTrend === 'decreasing' ? (
                    <ArrowDownIcon className="h-3 w-3 text-red-500" />
                  ) : (
                    <MinusIcon className="h-3 w-3 text-gray-500" />
                  )}
                  <span className={`text-xs font-medium ${
                    burnData.generationTrend === 'increasing' ? 'text-green-600' :
                    burnData.generationTrend === 'decreasing' ? 'text-red-600' :
                    'text-gray-600'
                  }`}>
                    {burnData.generationChangePercent > 0 ? '+' : ''}{burnData.generationChangePercent.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Averages */}
          <div className="grid grid-cols-1 gap-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">3-Month Average</span>
              <span className="text-sm font-semibold text-gray-900">
                {burnData.threeMonthAverage === 0 ? 'Cash Positive' : formatCurrency(burnData.threeMonthAverage)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">6-Month Average</span>
              <span className="text-sm font-semibold text-gray-900">
                {burnData.sixMonthAverage === 0 ? 'Cash Positive' : formatCurrency(burnData.sixMonthAverage)}
              </span>
            </div>
            {burnData.twelveMonthAverage !== null && (
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">12-Month Average</span>
                <span className="text-sm font-semibold text-gray-900">
                  {burnData.twelveMonthAverage === 0 ? 'Cash Positive' : formatCurrency(burnData.twelveMonthAverage)}
                </span>
              </div>
            )}
          </div>

          {/* Recent Changes */}
          <div className="pt-3 border-t border-gray-200">
            <p className="text-xs font-medium text-gray-600 mb-2">Monthly Cash Generation Trend</p>
            <div className="space-y-2">
              {burnData.monthlyData.slice(-3).reverse().map((month, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">{month.month}</span>
                  <div className="flex items-center space-x-3">
                    <span className={`font-medium ${month.isCashPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {month.isCashPositive ? '+' : '-'}{formatCurrency(Math.abs(month.cashGeneration))}
                    </span>
                    {month.generationChange !== 0 && (
                      <span className={`text-xs ${month.generationChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        ({month.generationChange > 0 ? '+' : ''}{formatCurrency(Math.abs(month.generationChange))})
                      </span>
                    )}
                    <span className={`text-xs font-medium ${
                      month.changeFromPrevious > 0 ? 'text-red-600' : 
                      month.changeFromPrevious < 0 ? 'text-green-600' : 
                      'text-gray-500'
                    }`}>
                      {month.changeFromPrevious > 0 ? '+' : ''}{month.changeFromPrevious.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Formula Display for Chart View */}
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <div className="text-center space-y-1">
              <p className="text-xs font-medium text-gray-600">Monthly Cash Flow Formula:</p>
              <p className="text-sm font-mono text-gray-800">
                Cash Generation = Inflow - Outflow
              </p>
              <div className="flex items-center justify-center space-x-4 text-xs text-gray-500 mt-2">
                <span className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                  Positive = Generating Cash
                </span>
                <span className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
                  Negative = Burning Cash
                </span>
              </div>
            </div>
          </div>
          
          <div className="h-64">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Understanding Burn Rate & Cash Generation</h2>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">🔥 What is Burn Rate?</h3>
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Burn Rate</strong> is how much cash your company spends above inflow each month. 
                    It's only counted when outflow exceeds inflow.
                  </p>
                  <div className="mt-3 p-3 bg-white rounded-lg">
                    <p className="text-sm font-mono text-gray-800">
                      Burn Rate = Outflow - Inflow (only when negative)
                    </p>
                    <p className="text-xs text-gray-600 mt-2">
                      If Inflow ≥ Outflow → You're "Cash Positive" (no burn)
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">💰 What is Cash Generation?</h3>
                <div className="bg-green-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Cash Generation</strong> tracks your monthly cash flow - positive when you're 
                    making money, negative when you're burning cash.
                  </p>
                  <div className="mt-3 p-3 bg-white rounded-lg">
                    <p className="text-sm font-mono text-gray-800">
                      Cash Generation = Inflow - Outflow
                    </p>
                    <p className="text-xs text-gray-600 mt-2">
                      Positive = Generating cash | Negative = Burning cash
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 Your Current Numbers</h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Current Month Status:</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {isGenerating ? 'Cash Positive' : `Burning ${formatCurrency(burnData?.currentMonthBurn || 0)}`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Cash Generation:</span>
                    <span className={`text-sm font-semibold ${
                      (burnData?.currentMonthGeneration || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {(burnData?.currentMonthGeneration || 0) >= 0 ? '+' : '-'}
                      {formatCurrency(Math.abs(burnData?.currentMonthGeneration || 0))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Month-over-Month Change:</span>
                    <span className={`text-sm font-semibold ${
                      burnData?.generationTrend === 'increasing' ? 'text-green-600' :
                      burnData?.generationTrend === 'decreasing' ? 'text-red-600' :
                      'text-gray-600'
                    }`}>
                      {burnData?.generationChange || 0 > 0 ? '+' : ''}{formatCurrency(Math.abs(burnData?.generationChange || 0))}
                      {' '}({burnData?.generationChangePercent || 0 > 0 ? '+' : ''}{(burnData?.generationChangePercent || 0).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📈 Understanding the Trends</h3>
                <div className="space-y-3">
                  <div className="border-l-4 border-green-500 pl-4">
                    <h4 className="text-sm font-semibold text-gray-900">Improving Trend</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Burn rate is decreasing or cash generation is increasing. 
                      You're moving in the right direction! 🎉
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-yellow-500 pl-4">
                    <h4 className="text-sm font-semibold text-gray-900">Stable Trend</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Your burn rate or cash generation is consistent month-over-month. 
                      Predictable and manageable.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-red-500 pl-4">
                    <h4 className="text-sm font-semibold text-gray-900">Worsening Trend</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Burn rate is increasing or cash generation is decreasing. 
                      Time to examine outflow and revenue strategies. ⚠️
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 Averages Explained</h3>
                <div className="bg-yellow-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700 mb-3">
                    We track different time periods to show trends:
                  </p>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start">
                      <span className="text-gray-500 mr-2">•</span>
                      <div>
                        <strong>3-Month Average:</strong> Recent trend (most volatile)
                        <div className="text-xs text-gray-500 mt-1">
                          Currently: {burnData?.threeMonthAverage === 0 ? 'Cash Positive' : formatCurrency(burnData?.threeMonthAverage || 0)}
                        </div>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-gray-500 mr-2">•</span>
                      <div>
                        <strong>6-Month Average:</strong> Medium-term trend
                        <div className="text-xs text-gray-500 mt-1">
                          Currently: {burnData?.sixMonthAverage === 0 ? 'Cash Positive' : formatCurrency(burnData?.sixMonthAverage || 0)}
                        </div>
                      </div>
                    </li>
                    {burnData?.twelveMonthAverage !== null && (
                      <li className="flex items-start">
                        <span className="text-gray-500 mr-2">•</span>
                        <div>
                          <strong>12-Month Average:</strong> Long-term baseline
                          <div className="text-xs text-gray-500 mt-1">
                            Currently: {burnData?.twelveMonthAverage === 0 ? 'Cash Positive' : formatCurrency(burnData.twelveMonthAverage)}
                          </div>
                        </div>
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 Reading the Chart</h3>
                <div className="bg-purple-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700 mb-3">
                    The chart shows your cash generation over time:
                  </p>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center">
                      <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                      <span>Above zero line = Generating cash (good!)</span>
                    </li>
                    <li className="flex items-center">
                      <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                      <span>Below zero line = Burning cash (monitor closely)</span>
                    </li>
                    <li className="flex items-center">
                      <div className="w-16 h-0.5 bg-gray-400 mr-2"></div>
                      <span>Zero line = Break-even point</span>
                    </li>
                  </ul>
                  <p className="text-xs text-gray-500 mt-3">
                    Hover over points to see exact values and changes
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">🎯 Key Takeaways</h3>
                <div className="bg-green-50 rounded-xl p-4 space-y-2">
                  <p className="text-sm text-gray-700 font-medium">Use this analysis to:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 ml-2">
                    <li>Track if you're improving month-over-month</li>
                    <li>Identify when you became cash positive (or when you might)</li>
                    <li>Spot trends before they become problems</li>
                    <li>Celebrate improvements in cash generation! 🎉</li>
                    <li>Make data-driven decisions about outflow and growth</li>
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