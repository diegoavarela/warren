import React, { useMemo, useState, useEffect } from 'react'
import { Tooltip } from 'react-tooltip'

interface HeatMapData {
  date: string
  month: string
  value: number
  metric: string
  displayValue: string
}

interface PerformanceHeatMapProps {
  data: any
  metric: 'revenue' | 'profit' | 'cashflow' | 'margin'
  title: string
  type: 'pnl' | 'cashflow'
}

export const PerformanceHeatMap: React.FC<PerformanceHeatMapProps> = ({
  data,
  metric,
  title,
  type
}) => {
  const [selectedCell, setSelectedCell] = useState<HeatMapData | null>(null)
  
  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedCell(null)
      }
    }
    
    if (selectedCell) {
      window.addEventListener('keydown', handleEsc)
      return () => window.removeEventListener('keydown', handleEsc)
    }
  }, [selectedCell])
  
  const heatMapData = useMemo(() => {
    if (!data?.chartData) return []

    return data.chartData.map((item: any, index: number) => {
      let value = 0
      let displayValue = ''

      if (type === 'pnl') {
        switch (metric) {
          case 'revenue':
            value = item.revenue || 0
            displayValue = formatCurrency(value)
            break
          case 'profit':
            value = item.netIncome || 0
            displayValue = formatCurrency(value)
            break
          case 'margin':
            value = item.netMargin || 0
            displayValue = `${value.toFixed(1)}%`
            break
        }
      } else {
        switch (metric) {
          case 'cashflow':
            value = item.cashflow || 0
            displayValue = formatCurrency(value)
            break
          case 'revenue':
            value = item.income || 0
            displayValue = formatCurrency(value)
            break
        }
      }

      // Handle both date formats - cashflow has 'date', P&L only has 'month'
      const date = item.date || `2025-${String(index + 1).padStart(2, '0')}`
      
      return {
        date,
        month: item.month,
        value,
        metric,
        displayValue
      }
    })
  }, [data, metric, type])

  const getColorIntensity = (value: number, allValues: number[]) => {
    const min = Math.min(...allValues)
    const max = Math.max(...allValues)
    const range = max - min

    if (range === 0) return 'bg-gray-200'

    const intensity = (value - min) / range

    // Color scale based on performance
    if (metric === 'margin') {
      // For margins, use different thresholds
      if (value < 0) return 'bg-red-500'
      if (value < 5) return 'bg-red-300'
      if (value < 10) return 'bg-yellow-300'
      if (value < 20) return 'bg-green-300'
      return 'bg-green-500'
    } else {
      // For revenue/profit/cashflow
      if (value < 0) return 'bg-red-500'
      if (intensity < 0.2) return 'bg-red-300'
      if (intensity < 0.4) return 'bg-yellow-300'
      if (intensity < 0.6) return 'bg-yellow-400'
      if (intensity < 0.8) return 'bg-green-300'
      return 'bg-green-500'
    }
  }

  const allValues = heatMapData.map((d: HeatMapData) => d.value)

  // Group by year
  const dataByYear = heatMapData.reduce((acc: any, item: HeatMapData) => {
    const year = item.date ? item.date.substring(0, 4) : '2025'
    if (!acc[year]) acc[year] = []
    acc[year].push(item)
    return acc
  }, {})

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      
      <div className="space-y-4">
        {Object.entries(dataByYear).map(([year, items]: [string, any]) => (
          <div key={year}>
            <h4 className="text-sm font-medium text-gray-600 mb-2">{year}</h4>
            <div className="grid grid-cols-12 gap-1">
              {(items as HeatMapData[]).map((item) => (
                <div
                  key={item.date}
                  className={`
                    relative h-16 rounded cursor-pointer transition-all duration-200
                    hover:scale-110 hover:z-10 hover:shadow-lg
                    ${getColorIntensity(item.value, allValues)}
                    ${!item.value ? 'opacity-50' : ''}
                  `}
                  onClick={() => setSelectedCell(item)}
                  data-tooltip-id={`heatmap-${item.date}`}
                  data-tooltip-content={`${item.month}: ${item.displayValue}`}
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-1">
                    <span className="text-xs font-semibold text-white">
                      {item.month.substring(0, 3)}
                    </span>
                    <span className="text-xs text-white opacity-90">
                      {formatCompactValue(item.value)}
                    </span>
                  </div>
                  <Tooltip id={`heatmap-${item.date}`} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-600">Poor</span>
          <div className="flex space-x-1">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <div className="w-4 h-4 bg-red-300 rounded"></div>
            <div className="w-4 h-4 bg-yellow-300 rounded"></div>
            <div className="w-4 h-4 bg-yellow-400 rounded"></div>
            <div className="w-4 h-4 bg-green-300 rounded"></div>
            <div className="w-4 h-4 bg-green-500 rounded"></div>
          </div>
          <span className="text-xs text-gray-600">Excellent</span>
        </div>
        <div className="text-xs text-gray-500">
          {metric === 'margin' ? 'Based on margin %' : 'Relative to period range'}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedCell && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedCell(null)}>
          <div 
            className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Performance Details</h3>
              <button
                onClick={() => setSelectedCell(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Period</p>
                <p className="text-lg font-semibold text-gray-900">{selectedCell.month}</p>
              </div>
              
              <div className={`rounded-lg p-4 ${getColorIntensity(selectedCell.value, allValues)} bg-opacity-20`}>
                <p className="text-sm text-gray-600 mb-1">{metric.charAt(0).toUpperCase() + metric.slice(1)}</p>
                <p className="text-2xl font-bold text-gray-900">{selectedCell.displayValue}</p>
              </div>
              
              {/* Additional context based on metric */}
              <div className="space-y-2">
                {metric === 'margin' && (
                  <div className="text-sm text-gray-600">
                    <p>• Industry average: 15-20%</p>
                    <p>• Target: {selectedCell.value > 20 ? '✓ Above target' : '↑ Below target'}</p>
                  </div>
                )}
                {metric === 'cashflow' && (
                  <div className="text-sm text-gray-600">
                    <p>• Status: {selectedCell.value > 0 ? '✓ Positive' : '⚠️ Negative'}</p>
                    <p>• Trend: {selectedCell.value > allValues[allValues.length - 2] ? '↑ Improving' : '↓ Declining'}</p>
                  </div>
                )}
                {metric === 'revenue' && (
                  <div className="text-sm text-gray-600">
                    <p>• Growth: {getGrowthContext(selectedCell, heatMapData)}</p>
                    <p>• Ranking: {getRanking(selectedCell.value, allValues)} of {allValues.length} months</p>
                  </div>
                )}
                {metric === 'profit' && (
                  <div className="text-sm text-gray-600">
                    <p>• Profitability: {selectedCell.value > 0 ? '✓ Profitable' : '⚠️ Loss'}</p>
                    <p>• Performance: {getPerformanceLevel(selectedCell.value, allValues)}</p>
                  </div>
                )}
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Click outside or press ESC to close
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function formatCurrency(amount: number): string {
  if (Math.abs(amount) >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`
  } else if (Math.abs(amount) >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`
  } else {
    return `$${amount.toFixed(0)}`
  }
}

function formatCompactValue(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `${(value / 1000000).toFixed(0)}M`
  } else if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(0)}K`
  } else if (value % 1 === 0) {
    return value.toString()
  } else {
    return value.toFixed(1)
  }
}

function getGrowthContext(current: HeatMapData, allData: HeatMapData[]): string {
  const currentIndex = allData.findIndex(d => d.date === current.date)
  if (currentIndex <= 0) return 'First month'
  
  const previous = allData[currentIndex - 1]
  const growth = ((current.value - previous.value) / previous.value * 100).toFixed(1)
  return `${growth}% vs previous month`
}

function getRanking(value: number, allValues: number[]): number {
  const sorted = [...allValues].sort((a, b) => b - a)
  return sorted.indexOf(value) + 1
}

function getPerformanceLevel(value: number, allValues: number[]): string {
  const sorted = [...allValues].sort((a, b) => b - a)
  const rank = sorted.indexOf(value) + 1
  const percentile = (1 - rank / allValues.length) * 100
  
  if (percentile >= 75) return '🌟 Top performer'
  if (percentile >= 50) return '✓ Above average'
  if (percentile >= 25) return '→ Average'
  return '↓ Below average'
}