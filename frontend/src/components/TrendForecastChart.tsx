import React, { useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface TrendForecastChartProps {
  data: any
  metric: 'revenue' | 'expenses' | 'cashflow' | 'profit'
  title: string
  type: 'pnl' | 'cashflow'
  forecastMonths?: number
}

interface DataPoint {
  x: number
  y: number
  month: string
  isActual: boolean
}

export const TrendForecastChart: React.FC<TrendForecastChartProps> = ({
  data,
  metric,
  title,
  type,
  forecastMonths = 6
}) => {
  const { chartData, forecastData, confidenceBands } = useMemo(() => {
    if (!data?.chartData || data.chartData.length === 0) {
      return { chartData: null, forecastData: [], trendLine: [], confidenceBands: { upper: [], lower: [] } }
    }

    // Extract actual data points
    const actualData = data.chartData
      .filter((item: any) => item.isActual !== false)
      .map((item: any, index: number) => {
        let value = 0
        if (type === 'pnl') {
          switch (metric) {
            case 'revenue':
              value = item.revenue || 0
              break
            case 'profit':
              value = item.netIncome || 0
              break
            case 'expenses':
              value = item.cogs + item.operatingExpenses || 0
              break
          }
        } else {
          switch (metric) {
            case 'revenue':
              value = item.income || 0
              break
            case 'expenses':
              value = item.expenses || 0
              break
            case 'cashflow':
              value = item.cashflow || 0
              break
          }
        }
        return {
          x: index,
          y: value,
          month: item.month,
          isActual: true
        }
      })

    // Calculate linear regression
    const { slope, intercept } = calculateLinearRegression(actualData)

    // Generate trend line for actual data
    const actualTrendLine = actualData.map((point: DataPoint) => ({
      x: point.x,
      y: slope * point.x + intercept,
      month: point.month
    }))

    // Generate forecast
    const lastIndex = actualData.length - 1
    const forecastData = []
    const forecastTrendLine = []

    for (let i = 1; i <= forecastMonths; i++) {
      const x = lastIndex + i
      const y = slope * x + intercept
      const monthIndex = (actualData[lastIndex].month === 'Dec' ? 0 : actualData.length + i - 1) % 12
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      
      forecastData.push({
        x,
        y: Math.max(0, y), // Prevent negative forecasts
        month: months[monthIndex],
        isActual: false
      })

      forecastTrendLine.push({
        x,
        y: Math.max(0, y),
        month: months[monthIndex]
      })
    }

    // Calculate confidence bands (simplified - using ±15% for demonstration)
    const standardError = calculateStandardError(actualData, slope, intercept)
    const confidenceMultiplier = 1.96 // 95% confidence interval

    const upperBand = [...actualTrendLine, ...forecastTrendLine].map(point => ({
      x: point.x,
      y: point.y + (standardError * confidenceMultiplier * Math.sqrt(1 + (point.x - lastIndex/2) ** 2 / actualData.length))
    }))

    const lowerBand = [...actualTrendLine, ...forecastTrendLine].map(point => ({
      x: point.x,
      y: Math.max(0, point.y - (standardError * confidenceMultiplier * Math.sqrt(1 + (point.x - lastIndex/2) ** 2 / actualData.length)))
    }))

    return {
      chartData: {
        labels: [...actualData.map((d: DataPoint) => d.month), ...forecastData.map(d => d.month)],
        datasets: [
          {
            label: `Actual ${metric.charAt(0).toUpperCase() + metric.slice(1)}`,
            data: [...actualData.map((d: DataPoint) => d.y), ...Array(forecastMonths).fill(null)],
            borderColor: '#10B981',
            backgroundColor: '#10B98120',
            borderWidth: 3,
            pointRadius: 4,
            pointBackgroundColor: '#10B981',
            tension: 0.1
          },
          {
            label: 'Forecast',
            data: [...Array(actualData.length - 1).fill(null), actualData[actualData.length - 1].y, ...forecastData.map(d => d.y)],
            borderColor: '#3B82F6',
            backgroundColor: '#3B82F620',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 3,
            pointBackgroundColor: '#3B82F6',
            tension: 0.1
          },
          {
            label: 'Trend Line',
            data: [...actualTrendLine, ...forecastTrendLine].map(d => d.y),
            borderColor: '#6B7280',
            borderWidth: 1,
            borderDash: [2, 2],
            pointRadius: 0,
            fill: false
          },
          {
            label: 'Upper Confidence (95%)',
            data: upperBand.map(d => d.y),
            borderColor: '#3B82F650',
            backgroundColor: '#3B82F610',
            borderWidth: 0,
            pointRadius: 0,
            fill: '+1'
          },
          {
            label: 'Lower Confidence (95%)',
            data: lowerBand.map(d => d.y),
            borderColor: '#3B82F650',
            backgroundColor: '#3B82F610',
            borderWidth: 0,
            pointRadius: 0,
            fill: '-1'
          }
        ]
      },
      forecastData,
      trendLine: [...actualTrendLine, ...forecastTrendLine],
      confidenceBands: { upper: upperBand, lower: lowerBand }
    }
  }, [data, metric, type, forecastMonths])

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12
          }
        }
      },
      title: {
        display: true,
        text: title,
        font: {
          size: 16,
          weight: 'bold'
        },
        padding: 20
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || ''
            const value = context.parsed.y
            return `${label}: ${formatValue(value, metric)}`
          }
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
        beginAtZero: true,
        ticks: {
          callback: (value) => formatValue(value as number, metric)
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  }

  if (!chartData) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="text-center text-gray-500">No data available for forecasting</div>
      </div>
    )
  }

  // Calculate forecast summary
  const avgGrowthRate = forecastData.length > 0 
    ? ((forecastData[forecastData.length - 1].y - forecastData[0].y) / forecastData[0].y * 100 / forecastMonths).toFixed(1)
    : 0

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="h-80">
        <Line data={chartData} options={options} />
      </div>
      
      {/* Forecast Summary */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">Current Trend</p>
          <p className="text-lg font-semibold text-gray-900">
            {Number(avgGrowthRate) > 0 ? '↑' : Number(avgGrowthRate) < 0 ? '↓' : '→'} {Math.abs(Number(avgGrowthRate))}% monthly
          </p>
        </div>
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">{forecastMonths}-Month Forecast</p>
          <p className="text-lg font-semibold text-blue-900">
            {formatValue(forecastData[forecastData.length - 1]?.y || 0, metric)}
          </p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">Confidence Range</p>
          <p className="text-lg font-semibold text-green-900">
            ±{((confidenceBands.upper[confidenceBands.upper.length - 1]?.y - confidenceBands.lower[confidenceBands.lower.length - 1]?.y) / 2 / forecastData[forecastData.length - 1]?.y * 100).toFixed(0)}%
          </p>
        </div>
      </div>
    </div>
  )
}

// Linear regression calculation
function calculateLinearRegression(data: DataPoint[]): { slope: number; intercept: number } {
  const n = data.length
  let sumX = 0
  let sumY = 0
  let sumXY = 0
  let sumX2 = 0

  data.forEach(point => {
    sumX += point.x
    sumY += point.y
    sumXY += point.x * point.y
    sumX2 += point.x * point.x
  })

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n

  return { slope, intercept }
}

// Calculate standard error for confidence bands
function calculateStandardError(data: DataPoint[], slope: number, intercept: number): number {
  const n = data.length
  let sumSquaredErrors = 0

  data.forEach(point => {
    const predicted = slope * point.x + intercept
    const error = point.y - predicted
    sumSquaredErrors += error * error
  })

  return Math.sqrt(sumSquaredErrors / (n - 2))
}

// Format values based on metric type
function formatValue(value: number, metric: string): string {
  if (metric === 'margin' || metric === 'rate') {
    return `${value.toFixed(1)}%`
  }
  
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  } else if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`
  } else {
    return `$${value.toFixed(0)}`
  }
}