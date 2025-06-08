import { useEffect, useRef } from 'react'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, BarElement } from 'chart.js'
import { Chart } from 'react-chartjs-2'
import { useTranslation } from 'react-i18next'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
)

interface CashflowChartProps {
  data: any[]
}

export function CashflowChart({ data }: CashflowChartProps) {
  const { t } = useTranslation()
  const chartRef = useRef(null)

  const chartData = {
    labels: data.map(item => item.date),
    datasets: [
      {
        type: 'bar' as const,
        label: t('dashboard.chart.revenue'),
        data: data.map(item => item.revenue),
        backgroundColor: 'rgba(34, 197, 94, 0.5)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 1,
        yAxisID: 'y',
      },
      {
        type: 'bar' as const,
        label: t('dashboard.chart.costs'),
        data: data.map(item => item.costs),
        backgroundColor: 'rgba(249, 115, 22, 0.5)',
        borderColor: 'rgb(249, 115, 22)',
        borderWidth: 1,
        yAxisID: 'y',
      },
      {
        type: 'line' as const,
        label: t('dashboard.chart.cashflow'),
        data: data.map(item => item.cashflow),
        backgroundColor: 'rgba(124, 179, 66, 0.1)',
        borderColor: '#7CB342',
        borderWidth: 3,
        tension: 0.4,
        yAxisID: 'y1',
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || ''
            if (label) {
              label += ': '
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(context.parsed.y)
            }
            return label
          }
        }
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Month'
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Revenue & Costs ($)'
        },
        ticks: {
          callback: function(value: any) {
            return new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(value)
          }
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Net Cashflow ($)'
        },
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          callback: function(value: any) {
            return new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(value)
          }
        }
      },
    },
  }

  return (
    <div className="h-96">
      <Chart ref={chartRef} type="bar" data={chartData} options={options} />
    </div>
  )
}