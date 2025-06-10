import React, { useEffect, useState } from 'react'
import { 
  FireIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon
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

export const BurnRateTrend: React.FC = () => {
  const [burnData, setBurnData] = useState<BurnRateData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedView, setSelectedView] = useState<'chart' | 'metrics'>('metrics')

  useEffect(() => {
    loadBurnRateData()
  }, [])

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
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount))
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
    return null
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

        {/* View Toggle */}
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
        <div className="h-64">
          <Line data={chartData} options={chartOptions} />
        </div>
      )}
    </div>
  )
}