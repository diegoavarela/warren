import { useEffect, useRef } from 'react'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, BarElement } from 'chart.js'
import { Chart } from 'react-chartjs-2'

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

interface ChartDataPoint {
  date: string
  month: string
  income: number
  expenses: number
  cashflow: number
  isActual?: boolean
}

interface CashflowChartProps {
  data: ChartDataPoint[]
  currency?: string
}

export function CashflowChart({ data, currency = 'ARS' }: CashflowChartProps) {
  const chartRef = useRef(null)

  const chartData = {
    labels: data.map(item => item.month),
    datasets: [
      {
        type: 'bar' as const,
        label: 'Income',
        data: data.map(item => item.income),
        backgroundColor: data.map(item => 
          item.isActual ? 'rgba(34, 197, 94, 0.6)' : 'rgba(34, 197, 94, 0.2)'
        ),
        borderColor: data.map(item => 
          item.isActual ? 'rgb(34, 197, 94)' : 'rgba(34, 197, 94, 0.5)'
        ),
        borderWidth: 1,
        yAxisID: 'y',
      },
      {
        type: 'bar' as const,
        label: 'Expenses',
        data: data.map(item => item.expenses),
        backgroundColor: data.map(item => 
          item.isActual ? 'rgba(249, 115, 22, 0.6)' : 'rgba(249, 115, 22, 0.2)'
        ),
        borderColor: data.map(item => 
          item.isActual ? 'rgb(249, 115, 22)' : 'rgba(249, 115, 22, 0.5)'
        ),
        borderWidth: 1,
        yAxisID: 'y',
      },
      {
        type: 'line' as const,
        label: 'Final Balance',
        data: data.map(item => item.cashflow),
        backgroundColor: 'rgba(124, 179, 66, 0.1)',
        borderColor: data.map((item, index) => {
          if (item.isActual) return '#7CB342';
          // Find the transition point
          const isFirstForecast = index > 0 && data[index - 1].isActual && !item.isActual;
          return isFirstForecast ? '#7CB342' : 'rgba(124, 179, 66, 0.5)';
        }),
        borderWidth: data.map(item => item.isActual ? 3 : 2),
        borderDash: data.map(item => item.isActual ? [] : [5, 5]),
        tension: 0.4,
        yAxisID: 'y1',
        segment: {
          borderColor: (ctx: any) => {
            const index = ctx.p0DataIndex;
            if (index < data.length - 1) {
              const current = data[index];
              const next = data[index + 1];
              if (current.isActual && !next.isActual) {
                // Transition from actual to forecast
                return 'rgba(124, 179, 66, 0.5)';
              }
            }
            return undefined;
          },
          borderDash: (ctx: any) => {
            const index = ctx.p0DataIndex;
            if (index < data.length - 1) {
              const current = data[index];
              const next = data[index + 1];
              if (current.isActual && !next.isActual) {
                // Transition from actual to forecast
                return [5, 5];
              }
            }
            return undefined;
          }
        }
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
                currency: currency,
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
          text: `Income & Expenses (${currency})`
        },
        ticks: {
          callback: function(value: any) {
            return new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: currency,
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
          text: `Final Balance (${currency})`
        },
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          callback: function(value: any) {
            return new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: currency,
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