import React, { useState, useEffect } from 'react'
import { 
  ChartBarIcon,
  CalendarDaysIcon
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
          
          {/* Period Selector */}
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
    </div>
  )
}