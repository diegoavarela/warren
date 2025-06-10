import React, { useState, useEffect } from 'react'
import { 
  ChartBarIcon,
  CalendarDaysIcon,
  QuestionMarkCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { Bar } from 'react-chartjs-2'
import { cashflowService } from '../services/cashflowService'

interface WaterfallData {
  categories: Array<{
    name: string
    value: number
    color: string
    isTotal?: boolean
  }>
  startValue: number
  endValue: number
}

export const CashFlowWaterfall: React.FC = () => {
  const [waterfallData, setWaterfallData] = useState<WaterfallData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(6) // Default to 6 months
  const [showHelpModal, setShowHelpModal] = useState(false)

  useEffect(() => {
    loadWaterfallData()
  }, [period])

  const loadWaterfallData = async () => {
    try {
      setLoading(true)
      const response = await cashflowService.getWaterfallData(period)
      setWaterfallData(response.data.data)
    } catch (error) {
      console.error('Failed to load waterfall data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount))
  }

  const getChartData = () => {
    if (!waterfallData || waterfallData.categories.length === 0) return null

    // Calculate cumulative values for waterfall effect
    const data: number[] = []
    const backgroundColors: string[] = []
    const labels: string[] = []
    let runningTotal = 0

    waterfallData.categories.forEach((category, index) => {
      labels.push(category.name)
      
      if (index === 0 || category.isTotal) {
        // Starting balance or total bars
        data.push(category.value)
        backgroundColors.push(category.color)
        runningTotal = category.value
      } else {
        // Floating bars for changes
        data.push(category.value)
        backgroundColors.push(category.color)
        runningTotal += category.value
      }
    })

    // Calculate the base values for floating bars
    const floatingData: Array<[number, number]> = []
    runningTotal = 0

    waterfallData.categories.forEach((category, index) => {
      if (index === 0) {
        floatingData.push([0, category.value])
        runningTotal = category.value
      } else if (category.isTotal) {
        floatingData.push([0, category.value])
      } else {
        const start = runningTotal
        const end = runningTotal + category.value
        floatingData.push([Math.min(start, end), Math.max(start, end)])
        runningTotal = end
      }
    })

    return {
      labels,
      datasets: [{
        data: floatingData,
        backgroundColor: backgroundColors,
        borderColor: backgroundColors.map(color => color.replace('0.8', '1')),
        borderWidth: 1,
        barPercentage: 0.7,
        categoryPercentage: 0.8
      }]
    }
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
          title: (context: any) => {
            return waterfallData?.categories[context[0].dataIndex].name || ''
          },
          label: (context: any) => {
            const category = waterfallData?.categories[context.dataIndex]
            if (!category) return ''
            
            const value = category.value
            const label = value >= 0 ? 'Increase' : 'Decrease'
            return `${label}: ${formatCurrency(value)}`
          },
          afterLabel: (context: any) => {
            const index = context.dataIndex
            if (index === 0 || waterfallData?.categories[index].isTotal) {
              return `Balance: ${formatCurrency(waterfallData.categories[index].value)}`
            }
            return ''
          }
        }
      },
      datalabels: {
        display: true,
        anchor: 'end' as const,
        align: 'top' as const,
        formatter: (value: any, context: any) => {
          const category = waterfallData?.categories[context.dataIndex]
          if (!category) return ''
          
          // Show value for changes, balance for totals
          if (category.isTotal || context.dataIndex === 0) {
            return formatCurrency(category.value)
          } else {
            const change = category.value
            return (change >= 0 ? '+' : '') + formatCurrency(change)
          }
        },
        font: {
          size: 10,
          weight: 'bold' as const
        },
        color: (context: any) => {
          const category = waterfallData?.categories[context.dataIndex]
          return category?.isTotal ? '#111827' : '#6B7280'
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        }
      },
      y: {
        ticks: {
          callback: (value: any) => formatCurrency(value)
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      }
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 animate-pulse">
        <div className="h-64 bg-gray-100 rounded"></div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <ChartBarIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Cash Flow Waterfall</h3>
              <p className="text-sm text-gray-600">Visual breakdown of cash movements</p>
            </div>
          </div>
          
          {/* Period Selector and Help */}
          <div className="flex items-center space-x-2">
            <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
            <select
              value={period}
              onChange={(e) => setPeriod(parseInt(e.target.value))}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={3}>Last 3 months</option>
              <option value={6}>Last 6 months</option>
              <option value={12}>Last 12 months</option>
            </select>
            <button
              onClick={() => setShowHelpModal(true)}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="How waterfall charts work"
            >
              <QuestionMarkCircleIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {waterfallData && waterfallData.categories.length > 0 ? (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-600">Starting Balance</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(waterfallData.startValue)}
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-600">Net Change</p>
                <p className={`text-xl font-bold ${
                  waterfallData.endValue - waterfallData.startValue >= 0 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {formatCurrency(waterfallData.endValue - waterfallData.startValue)}
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-600">Ending Balance</p>
                <p className={`text-xl font-bold ${
                  waterfallData.endValue >= 0 ? 'text-gray-900' : 'text-red-600'
                }`}>
                  {formatCurrency(waterfallData.endValue)}
                </p>
              </div>
            </div>

            {/* Waterfall Chart */}
            <div className="h-80">
              {getChartData() && <Bar data={getChartData()!} options={chartOptions} />}
            </div>

            {/* Legend */}
            <div className="mt-6 flex flex-wrap gap-4 justify-center text-sm">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-gray-600 rounded mr-2"></div>
                <span className="text-gray-600">Balance</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                <span className="text-gray-600">Income</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                <span className="text-gray-600">Expenses</span>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-gray-500">
            No data available for the selected period
          </div>
        )}
      </div>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Understanding Cash Flow Waterfall</h2>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">💧 What is a Waterfall Chart?</h3>
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700 mb-2">
                    A <strong>waterfall chart</strong> shows how your cash balance changes over time, 
                    breaking down the cumulative effect of positive and negative cash flows.
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    Think of it like a financial story: starting balance → what happened → ending balance
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 Your Current Numbers</h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-xs text-gray-600">Start</p>
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(waterfallData?.startValue || 0)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-600">Change</p>
                      <p className={`text-sm font-semibold ${
                        (waterfallData?.endValue || 0) - (waterfallData?.startValue || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {(waterfallData?.endValue || 0) - (waterfallData?.startValue || 0) >= 0 ? '+' : ''}
                        {formatCurrency((waterfallData?.endValue || 0) - (waterfallData?.startValue || 0))}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-600">End</p>
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(waterfallData?.endValue || 0)}</p>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      Period: Last {period} months
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📖 How to Read the Chart</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-4 h-4 bg-gray-600 rounded mt-0.5"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Gray Bars (Totals)</p>
                      <p className="text-sm text-gray-600">Show your cash balance at start and end points</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-4 h-4 bg-green-500 rounded mt-0.5"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Green Bars (Income)</p>
                      <p className="text-sm text-gray-600">Money coming in - increases your cash balance</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-4 h-4 bg-red-500 rounded mt-0.5"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Red Bars (Expenses)</p>
                      <p className="text-sm text-gray-600">Money going out - decreases your cash balance</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">🔍 Understanding the Flow</h3>
                <div className="bg-yellow-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700 mb-3">
                    The chart shows a step-by-step progression:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 ml-2">
                    <li><strong>Starting Balance:</strong> Where you began the period</li>
                    <li><strong>Income (Green):</strong> Each source of income adds to your balance</li>
                    <li><strong>Expenses (Red):</strong> Each expense reduces your balance</li>
                    <li><strong>Ending Balance:</strong> Where you finished the period</li>
                  </ol>
                  <p className="text-xs text-gray-500 mt-3">
                    Bars "float" at different heights to show the cumulative effect
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📈 Visual Insights</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p className="flex items-start">
                    <span className="text-green-500 mr-2">•</span>
                    <span><strong>Upward trend:</strong> Your cash is growing (more income than expenses)</span>
                  </p>
                  <p className="flex items-start">
                    <span className="text-red-500 mr-2">•</span>
                    <span><strong>Downward trend:</strong> Your cash is declining (more expenses than income)</span>
                  </p>
                  <p className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span><strong>Bar height:</strong> The bigger the bar, the larger the cash impact</span>
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">⏱️ Time Periods</h3>
                <div className="bg-purple-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700 mb-3">
                    Choose different time periods to see different perspectives:
                  </p>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start">
                      <span className="text-gray-500 mr-2">•</span>
                      <div>
                        <strong>3 months:</strong> Recent detailed view
                        <div className="text-xs text-gray-500">Best for: Current trends and immediate planning</div>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-gray-500 mr-2">•</span>
                      <div>
                        <strong>6 months:</strong> Balanced perspective
                        <div className="text-xs text-gray-500">Best for: Understanding seasonal patterns</div>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-gray-500 mr-2">•</span>
                      <div>
                        <strong>12 months:</strong> Full year view
                        <div className="text-xs text-gray-500">Best for: Annual planning and long-term trends</div>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 Pro Tips</h3>
                <div className="bg-green-50 rounded-xl p-4 space-y-2">
                  <p className="text-sm text-gray-700 font-medium">Use waterfall charts to:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 ml-2">
                    <li>Identify your biggest sources of income and expenses</li>
                    <li>See the cumulative impact of many small transactions</li>
                    <li>Understand why your cash balance changed</li>
                    <li>Spot patterns in cash flow timing</li>
                    <li>Make better decisions about spending and investment</li>
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