import React, { useMemo } from 'react'
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
  const heatMapData = useMemo(() => {
    if (!data?.chartData) return []

    return data.chartData.map((item: any) => {
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

      return {
        date: item.date,
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
    const year = item.date.substring(0, 4)
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