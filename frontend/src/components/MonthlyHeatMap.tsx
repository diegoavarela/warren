import React, { useState, useMemo } from 'react'
import { InformationCircleIcon } from '@heroicons/react/24/outline'
import { Tooltip } from './Tooltip'

interface HeatMapData {
  month: string
  metrics: {
    [key: string]: number
  }
}

interface MetricConfig {
  key: string
  label: string
  format: 'percentage' | 'currency' | 'number'
  inverse?: boolean // For metrics where lower is better (e.g., expenses)
  description?: string
}

interface MonthlyHeatMapProps {
  data: HeatMapData[]
  metrics: MetricConfig[]
  title?: string
  currency?: string
  formatCurrency?: (value: number) => string
}

export const MonthlyHeatMap: React.FC<MonthlyHeatMapProps> = ({
  data,
  metrics,
  title = 'Monthly Performance Heat Map',
  currency = 'USD',
  formatCurrency
}) => {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null)
  const [hoveredCell, setHoveredCell] = useState<{ month: string; metric: string } | null>(null)

  // Calculate min/max for each metric to determine color scale
  const metricRanges = useMemo(() => {
    const ranges: { [key: string]: { min: number; max: number; avg: number } } = {}
    
    metrics.forEach(metric => {
      const values = data.map(d => d.metrics[metric.key]).filter(v => v !== undefined && v !== null)
      if (values.length > 0) {
        ranges[metric.key] = {
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((a, b) => a + b, 0) / values.length
        }
      }
    })
    
    return ranges
  }, [data, metrics])

  // Get color for a cell based on value and metric range
  const getCellColor = (value: number | undefined, metricKey: string, inverse: boolean = false) => {
    if (value === undefined || value === null) return 'bg-gray-100'
    
    const range = metricRanges[metricKey]
    if (!range) return 'bg-gray-100'
    
    // Normalize value to 0-1 scale
    let normalized = (value - range.min) / (range.max - range.min)
    if (inverse) normalized = 1 - normalized
    
    // Color scale from red to yellow to green
    if (normalized < 0.25) {
      return 'bg-red-500'
    } else if (normalized < 0.4) {
      return 'bg-red-400'
    } else if (normalized < 0.5) {
      return 'bg-yellow-400'
    } else if (normalized < 0.6) {
      return 'bg-yellow-300'
    } else if (normalized < 0.75) {
      return 'bg-green-400'
    } else {
      return 'bg-green-500'
    }
  }

  // Format value based on metric type
  const formatValue = (value: number | undefined, format: MetricConfig['format']) => {
    if (value === undefined || value === null) return '-'
    
    switch (format) {
      case 'percentage':
        return `${value.toFixed(1)}%`
      case 'currency':
        return formatCurrency ? formatCurrency(value) : `${currency} ${value.toLocaleString()}`
      case 'number':
        return value.toLocaleString()
      default:
        return value.toString()
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">{title}</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">Scale:</span>
          <div className="flex items-center space-x-1">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-xs text-gray-600">Low</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-4 h-4 bg-yellow-400 rounded"></div>
            <span className="text-xs text-gray-600">Mid</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-xs text-gray-600">High</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="sticky left-0 bg-white px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Metric
              </th>
              {data.map((item, index) => (
                <th
                  key={index}
                  className="px-2 py-2 text-center text-xs font-medium text-gray-700 uppercase tracking-wider"
                >
                  {item.month}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {metrics.map((metric) => (
              <tr
                key={metric.key}
                className={`hover:bg-gray-50 transition-colors ${
                  selectedMetric === metric.key ? 'bg-blue-50' : ''
                }`}
                onClick={() => setSelectedMetric(metric.key === selectedMetric ? null : metric.key)}
              >
                <td className="sticky left-0 bg-white px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <span>{metric.label}</span>
                    {metric.description && (
                      <Tooltip content={metric.description}>
                        <InformationCircleIcon className="h-4 w-4 text-gray-400" />
                      </Tooltip>
                    )}
                  </div>
                </td>
                {data.map((item, index) => {
                  const value = item.metrics[metric.key]
                  const cellKey = `${item.month}-${metric.key}`
                  const isHovered = hoveredCell?.month === item.month && hoveredCell?.metric === metric.key
                  
                  return (
                    <td
                      key={index}
                      className="px-2 py-3 text-center relative group cursor-pointer"
                      onMouseEnter={() => setHoveredCell({ month: item.month, metric: metric.key })}
                      onMouseLeave={() => setHoveredCell(null)}
                    >
                      <div
                        className={`
                          inline-flex items-center justify-center w-full h-8 px-2 rounded
                          ${getCellColor(value, metric.key, metric.inverse)}
                          ${isHovered ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
                          text-white font-medium text-xs
                          transition-all duration-200
                        `}
                      >
                        {formatValue(value, metric.format)}
                      </div>
                      
                      {/* Tooltip on hover */}
                      {isHovered && value !== undefined && value !== null && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-10">
                          <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap">
                            <div className="font-semibold">{item.month}</div>
                            <div>{metric.label}: {formatValue(value, metric.format)}</div>
                            {metricRanges[metric.key] && (
                              <div className="text-gray-300 mt-1">
                                Avg: {formatValue(metricRanges[metric.key].avg, metric.format)}
                              </div>
                            )}
                          </div>
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                            <div className="border-4 border-transparent border-t-gray-900"></div>
                          </div>
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Metric details when selected */}
      {selectedMetric && metricRanges[selectedMetric] && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">
            {metrics.find(m => m.key === selectedMetric)?.label} Analysis
          </h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Minimum:</span>
              <span className="ml-2 font-medium">
                {formatValue(
                  metricRanges[selectedMetric].min,
                  metrics.find(m => m.key === selectedMetric)?.format || 'number'
                )}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Average:</span>
              <span className="ml-2 font-medium">
                {formatValue(
                  metricRanges[selectedMetric].avg,
                  metrics.find(m => m.key === selectedMetric)?.format || 'number'
                )}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Maximum:</span>
              <span className="ml-2 font-medium">
                {formatValue(
                  metricRanges[selectedMetric].max,
                  metrics.find(m => m.key === selectedMetric)?.format || 'number'
                )}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}