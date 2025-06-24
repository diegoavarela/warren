import React, { useMemo, useState, useEffect } from 'react'
import { Tooltip } from 'react-tooltip'
import { useTranslation } from 'react-i18next'

interface HeatMapData {
  date: string
  month: string
  value: number
  metric: string
  displayValue: string
  isActual: boolean
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
  const { t } = useTranslation()
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
        displayValue,
        isActual: item.isActual !== false  // Default to true if not specified
      }
    })
  }, [data, metric, type])

  const getColorIntensity = (value: number, allValues: number[]) => {
    const min = Math.min(...allValues)
    const max = Math.max(...allValues)
    const range = max - min

    if (range === 0) return { bg: 'bg-gray-200', text: 'text-gray-700' }

    const intensity = (value - min) / range

    // Color scale based on performance with appropriate text colors
    if (metric === 'margin') {
      // For margins, use different thresholds
      if (value < 0) return { bg: 'bg-red-500', text: 'text-white' }
      if (value < 5) return { bg: 'bg-red-300', text: 'text-red-900' }
      if (value < 10) return { bg: 'bg-yellow-300', text: 'text-yellow-900' }
      if (value < 20) return { bg: 'bg-green-300', text: 'text-green-900' }
      return { bg: 'bg-green-500', text: 'text-white' }
    } else {
      // For revenue/profit/cashflow
      if (value < 0) return { bg: 'bg-red-500', text: 'text-white' }
      if (intensity < 0.2) return { bg: 'bg-red-300', text: 'text-red-900' }
      if (intensity < 0.4) return { bg: 'bg-yellow-300', text: 'text-yellow-900' }
      if (intensity < 0.6) return { bg: 'bg-yellow-400', text: 'text-yellow-900' }
      if (intensity < 0.8) return { bg: 'bg-green-300', text: 'text-green-900' }
      return { bg: 'bg-green-500', text: 'text-white' }
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
              {(items as HeatMapData[]).map((item) => {
                const colorScheme = getColorIntensity(item.value, allValues)
                return (
                  <div
                    key={item.date}
                    className={`
                      relative h-16 rounded cursor-pointer transition-all duration-200
                      hover:scale-110 hover:z-10 hover:shadow-lg
                      ${colorScheme.bg}
                      ${!item.value ? 'opacity-50' : ''}
                      ${!item.isActual ? 'opacity-40' : ''}
                    `}
                    onClick={() => setSelectedCell(item)}
                    data-tooltip-id="heatmap-tooltip"
                    data-tooltip-content={`${item.month}: ${item.displayValue}${!item.isActual ? ` (${t('common.forecast')})` : ''}`}
                  >
                    {!item.isActual && (
                      <div className="absolute top-0 right-0 bg-blue-500 text-white text-[8px] px-1 rounded-bl rounded-tr font-bold">
                        F
                      </div>
                    )}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-1">
                      <span className={`text-xs font-bold ${colorScheme.text}`}>
                        {item.month.substring(0, 3)}
                      </span>
                      <span className={`text-xs font-medium ${colorScheme.text}`}>
                        {formatCompactValue(item.value)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      
      {/* Single tooltip for all cells */}
      <Tooltip id="heatmap-tooltip" />

      {/* Legend */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-600">{t('common.poor')}</span>
            <div className="flex space-x-1">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <div className="w-4 h-4 bg-red-300 rounded"></div>
              <div className="w-4 h-4 bg-yellow-300 rounded"></div>
              <div className="w-4 h-4 bg-yellow-400 rounded"></div>
              <div className="w-4 h-4 bg-green-300 rounded"></div>
              <div className="w-4 h-4 bg-green-500 rounded"></div>
            </div>
            <span className="text-xs text-gray-600">{t('common.excellent')}</span>
          </div>
          <div className="text-xs text-gray-500">
            {metric === 'margin' ? t('heatmap.basedOnMargin') : t('heatmap.relativeToPeriod')}
          </div>
        </div>
        {/* Forecast indicator */}
        {heatMapData.some(d => !d.isActual) && (
          <div className="mt-2 flex items-center justify-end space-x-4 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 bg-gray-400 rounded opacity-40 relative">
                <div className="absolute top-0 right-0 bg-blue-500 text-white text-[6px] px-0.5 rounded-bl rounded-tr">F</div>
              </div>
              <span>{t('heatmap.forecastData')}</span>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedCell && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedCell(null)}>
          <div 
            className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">{t('heatmap.performanceDetails')}</h3>
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
                <p className="text-sm text-gray-600 mb-1">{t('common.period')}</p>
                <p className="text-lg font-semibold text-gray-900">
                  {selectedCell.month}
                  {!selectedCell.isActual && (
                    <span className="ml-2 text-sm font-normal text-blue-600">({t('common.forecast')})</span>
                  )}
                </p>
              </div>
              
              <div className={`rounded-lg p-4 ${getColorIntensity(selectedCell.value, allValues).bg} bg-opacity-20`}>
                <p className="text-sm text-gray-600 mb-1">{metric.charAt(0).toUpperCase() + metric.slice(1)}</p>
                <p className="text-2xl font-bold text-gray-900">{selectedCell.displayValue}</p>
              </div>
              
              {/* Additional context based on metric */}
              <div className="space-y-2">
                {metric === 'margin' && (
                  <div className="text-sm text-gray-600">
                    <p>• {t('heatmap.industryAverage')}: 15-20%</p>
                    <p>• {t('common.target')}: {selectedCell.value > 20 ? t('heatmap.aboveTarget') : t('heatmap.belowTarget')}</p>
                  </div>
                )}
                {metric === 'cashflow' && (
                  <div className="text-sm text-gray-600">
                    <p>• {t('common.status')}: {selectedCell.value > 0 ? t('common.positive') : t('common.negative')}</p>
                    <p>• {t('common.trend')}: {selectedCell.value > allValues[allValues.length - 2] ? t('heatmap.improving') : t('heatmap.declining')}</p>
                  </div>
                )}
                {metric === 'revenue' && (
                  <div className="text-sm text-gray-600">
                    <p>• {t('common.growth')}: {getGrowthContext(selectedCell, heatMapData)}</p>
                    <p>• {t('heatmap.ranking')}: {getRanking(selectedCell.value, allValues)} {t('heatmap.ofMonths', { count: allValues.length })}</p>
                  </div>
                )}
                {metric === 'profit' && (
                  <div className="text-sm text-gray-600">
                    <p>• {t('heatmap.profitability')}: {selectedCell.value > 0 ? t('heatmap.profitable') : t('heatmap.loss')}</p>
                    <p>• {t('common.performance')}: {getPerformanceLevel(selectedCell.value, allValues)}</p>
                  </div>
                )}
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  {t('common.clickOutsideOrEsc')}
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