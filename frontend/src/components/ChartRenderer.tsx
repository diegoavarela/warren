import React, { useEffect, useRef } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions
} from 'chart.js'
import { Chart } from 'react-chartjs-2'
import { ChartSpecification } from '../services/analysisService'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

interface ChartRendererProps {
  specification: ChartSpecification
}

export const ChartRenderer: React.FC<ChartRendererProps> = ({ specification }) => {
  const chartRef = useRef<ChartJS>(null)

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy()
      }
    }
  }, [])

  // Format data based on chart type
  const formatChartData = (): ChartData<any> => {
    const { data } = specification

    // Apply default colors if not specified
    const defaultColors = [
      '#8B5CF6', // Purple
      '#10B981', // Green
      '#F59E0B', // Yellow
      '#EF4444', // Red
      '#3B82F6', // Blue
      '#EC4899', // Pink
      '#6B7280', // Gray
      '#14B8A6', // Teal
    ]

    const datasets = data.datasets.map((dataset, index) => ({
      ...dataset,
      borderColor: dataset.borderColor || defaultColors[index % defaultColors.length],
      backgroundColor: dataset.backgroundColor || 
        (specification.type === 'line' || specification.type === 'scatter' 
          ? defaultColors[index % defaultColors.length] + '20' // 20% opacity for area charts
          : defaultColors[index % defaultColors.length]),
      borderWidth: 2,
      tension: specification.type === 'line' ? 0.4 : 0,
      fill: specification.type === 'line' ? 'origin' : false,
    }))

    return {
      labels: data.labels,
      datasets
    }
  }

  // Build chart options
  const buildOptions = (): ChartOptions<any> => {
    const baseOptions: ChartOptions<any> = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: specification.title,
          font: {
            size: 16,
            weight: 'bold'
          },
          padding: {
            bottom: 10
          }
        },
        legend: {
          display: true,
          position: 'bottom' as const,
          labels: {
            padding: 15,
            usePointStyle: true,
            font: {
              size: 12
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(17, 24, 39, 0.9)',
          titleColor: 'white',
          bodyColor: 'white',
          padding: 12,
          borderColor: 'rgba(229, 231, 235, 0.2)',
          borderWidth: 1,
          displayColors: true,
          callbacks: {
            label: function(context: any) {
              let label = context.dataset.label || ''
              if (label) {
                label += ': '
              }
              if (context.parsed.y !== null) {
                // Format as currency if it looks like a monetary value
                const value = context.parsed.y
                if (Math.abs(value) >= 1000) {
                  label += '$' + value.toLocaleString()
                } else if (value % 1 !== 0) {
                  label += value.toFixed(2)
                } else {
                  label += value
                }
              }
              return label
            }
          }
        }
      },
      scales: specification.type !== 'pie' ? {
        x: {
          grid: {
            display: false
          },
          ticks: {
            font: {
              size: 11
            }
          }
        },
        y: {
          grid: {
            color: 'rgba(229, 231, 235, 0.5)'
          },
          ticks: {
            font: {
              size: 11
            },
            callback: function(value: any) {
              // Format large numbers
              if (Math.abs(value) >= 1000000) {
                return '$' + (value / 1000000).toFixed(1) + 'M'
              } else if (Math.abs(value) >= 1000) {
                return '$' + (value / 1000).toFixed(0) + 'K'
              }
              return '$' + value
            }
          }
        }
      } : undefined
    }

    // Merge with custom options if provided
    if (specification.options) {
      return {
        ...baseOptions,
        ...specification.options,
        plugins: {
          ...baseOptions.plugins,
          ...specification.options.plugins
        }
      }
    }

    return baseOptions
  }

  // Determine the chart component type
  const getChartType = () => {
    switch (specification.type) {
      case 'line':
        return 'line'
      case 'bar':
      case 'waterfall':
        return 'bar'
      case 'pie':
        return 'pie'
      case 'scatter':
        return 'scatter'
      case 'combo':
        // For combo charts, the type is specified per dataset
        return 'line'
      default:
        return 'bar'
    }
  }

  return (
    <div className="w-full">
      {specification.description && (
        <p className="text-sm text-gray-600 mb-4">{specification.description}</p>
      )}
      <div style={{ height: '400px' }}>
        <Chart
          ref={chartRef}
          type={getChartType()}
          data={formatChartData()}
          options={buildOptions()}
        />
      </div>
    </div>
  )
}