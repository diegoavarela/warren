import React, { useState, useEffect } from 'react'
import { 
  ChartBarIcon,
  CalendarDaysIcon,
  QuestionMarkCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { Bar } from 'react-chartjs-2'
import { cashflowService } from '../services/cashflowService'

interface StackedBarData {
  months: string[]
  categories: {
    inflow: {
      revenue: number[]
      otherInflow: number[]
    }
    outflows: {
      wages: number[]
      opex: number[]
      taxes: number[]
      bankFees: number[]
      other: number[]
    }
  }
  totals: {
    inflow: number[]
    outflows: number[]
    netCashFlow: number[]
  }
}

export const CashFlowStackedBar: React.FC = () => {
  const [stackedData, setStackedData] = useState<StackedBarData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(6) // Default to 6 months
  const [showHelpModal, setShowHelpModal] = useState(false)

  useEffect(() => {
    loadStackedBarData()
  }, [period])

  const loadStackedBarData = async () => {
    try {
      setLoading(true)
      
      // Fetch dashboard data which has comprehensive information
      const dashboardRes = await cashflowService.getDashboard()
      console.log('Dashboard response:', dashboardRes)
      console.log('Dashboard data:', dashboardRes.data)
      console.log('Dashboard data.data:', dashboardRes.data?.data)
      
      if (!dashboardRes.data?.data) {
        console.warn('No dashboard data available')
        setStackedData({
          months: [],
          categories: {
            inflow: { revenue: [], otherInflow: [] },
            outflows: { wages: [], opex: [], taxes: [], bankFees: [], other: [] }
          },
          totals: { inflow: [], outflows: [], netCashFlow: [] }
        })
        return
      }
      
      const dashboardData = dashboardRes.data.data
      console.log('Dashboard data object:', dashboardData)
      console.log('Cash flow data:', dashboardData.cashFlowData)
      
      // Try to find cash flow data in different possible locations
      const cashflowData = dashboardData.chartData || dashboardData.cashFlowData || dashboardData.cashFlow || dashboardData.metrics || []
      
      if (!cashflowData || cashflowData.length === 0) {
        console.warn('No cash flow array found in dashboard data')
        setStackedData({
          months: [],
          categories: {
            inflow: { revenue: [], otherInflow: [] },
            outflows: { wages: [], opex: [], taxes: [], bankFees: [], other: [] }
          },
          totals: { inflow: [], outflows: [], netCashFlow: [] }
        })
        return
      }
      
      // Also fetch operational data for outflow breakdown
      const operationalRes = await cashflowService.getOperationalData()
      const operationalData = operationalRes.data.data || []
      
      console.log('Cashflow data:', cashflowData)
      console.log('Operational data:', operationalData)
      
      // Process data for stacked visualization
      const processedData = processDataForStackedBar(cashflowData, operationalData, period)
      console.log('Processed data:', processedData)
      setStackedData(processedData)
    } catch (error) {
      console.error('Failed to load stacked bar data:', error)
      setStackedData({
        months: [],
        categories: {
          inflow: { revenue: [], otherInflow: [] },
          outflows: { wages: [], opex: [], taxes: [], bankFees: [], other: [] }
        },
        totals: { inflow: [], outflows: [], netCashFlow: [] }
      })
    } finally {
      setLoading(false)
    }
  }

  const processDataForStackedBar = (
    cashflowData: any[], 
    operationalData: any[], 
    monthsToShow: number
  ): StackedBarData => {
    // Ensure we have arrays
    if (!Array.isArray(cashflowData) || cashflowData.length === 0) {
      console.warn('No cashflow data available')
      return {
        months: [],
        categories: {
          inflow: { revenue: [], otherInflow: [] },
          outflows: { wages: [], opex: [], taxes: [], bankFees: [], other: [] }
        },
        totals: { inflow: [], outflows: [], netCashFlow: [] }
      }
    }
    
    // Filter for actual data only (not forecasts)
    const actualData = cashflowData.filter(d => d.isActual === true || d.isActual === undefined)
    
    // Get the last N months of actual data
    const startIndex = Math.max(0, actualData.length - monthsToShow)
    const relevantCashflow = actualData.slice(startIndex)
    const relevantOperational = operationalData.slice(startIndex)
    
    const months: string[] = []
    const revenue: number[] = []
    const otherInflow: number[] = []
    const wages: number[] = []
    const opex: number[] = []
    const taxes: number[] = []
    const bankFees: number[] = []
    const otherOutflows: number[] = []
    const totalInflow: number[] = []
    const totalOutflows: number[] = []
    const netCashFlow: number[] = []
    
    relevantCashflow.forEach((month, index) => {
      months.push(month.month)
      
      // Inflow breakdown - handle both possible field names
      const monthInflow = Math.abs(month.inflow || month.totalInflow || 0)
      revenue.push(monthInflow)
      otherInflow.push(0) // Placeholder for other inflow sources
      totalInflow.push(monthInflow)
      
      // Outflow breakdown from operational data
      const operational = relevantOperational[index] || {}
      const monthWages = Math.abs(operational.totalWages || 0)
      const monthOpex = Math.abs(operational.totalOpex || 0)
      const monthTaxes = Math.abs(operational.totalTaxes || 0)
      const monthBankFees = Math.abs(operational.totalBankAndTaxes || 0) - monthTaxes
      
      wages.push(monthWages)
      opex.push(monthOpex)
      taxes.push(monthTaxes)
      bankFees.push(monthBankFees)
      
      // Calculate other outflows (remainder) - handle both possible field names
      const monthOutflows = Math.abs(month.outflows || month.totalOutflow || 0)
      const knownOutflows = monthWages + monthOpex + monthTaxes + monthBankFees
      const other = Math.max(0, monthOutflows - knownOutflows)
      otherOutflows.push(other)
      
      totalOutflows.push(monthOutflows)
      
      // Net cash flow - handle both structures
      if (month.cashflow !== undefined) {
        netCashFlow.push(month.cashflow)
      } else {
        netCashFlow.push(monthInflow - monthOutflows)
      }
    })
    
    return {
      months,
      categories: {
        inflow: {
          revenue,
          otherInflow
        },
        outflows: {
          wages,
          opex,
          taxes,
          bankFees,
          other: otherOutflows
        }
      },
      totals: {
        inflow: totalInflow,
        outflows: totalOutflows,
        netCashFlow
      }
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
    if (!stackedData) return null

    return {
      labels: stackedData.months,
      datasets: [
        // Inflow datasets (positive values)
        {
          label: 'Revenue',
          data: stackedData.categories.inflow.revenue,
          backgroundColor: '#10B981',
          stack: 'inflow',
          barPercentage: 0.8,
          categoryPercentage: 0.9
        },
        // Outflow datasets (negative values for below x-axis)
        {
          label: 'Wages',
          data: stackedData.categories.outflows.wages.map(v => -v),
          backgroundColor: '#EF4444',
          stack: 'outflows',
          barPercentage: 0.8,
          categoryPercentage: 0.9
        },
        {
          label: 'OpEx',
          data: stackedData.categories.outflows.opex.map(v => -v),
          backgroundColor: '#F59E0B',
          stack: 'outflows',
          barPercentage: 0.8,
          categoryPercentage: 0.9
        },
        {
          label: 'Taxes',
          data: stackedData.categories.outflows.taxes.map(v => -v),
          backgroundColor: '#8B5CF6',
          stack: 'outflows',
          barPercentage: 0.8,
          categoryPercentage: 0.9
        },
        {
          label: 'Bank Fees',
          data: stackedData.categories.outflows.bankFees.map(v => -v),
          backgroundColor: '#06B6D4',
          stack: 'outflows',
          barPercentage: 0.8,
          categoryPercentage: 0.9
        },
        {
          label: 'Other',
          data: stackedData.categories.outflows.other.map(v => -v),
          backgroundColor: '#6B7280',
          stack: 'outflows',
          barPercentage: 0.8,
          categoryPercentage: 0.9
        }
      ]
    }
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        callbacks: {
          title: (context: any) => {
            return `${context[0].label} Cash Flow`
          },
          label: (context: any) => {
            const value = Math.abs(context.raw)
            return `${context.dataset.label}: ${formatCurrency(value)}`
          },
          footer: (tooltipItems: any) => {
            if (!stackedData) return ''
            const monthIndex = tooltipItems[0].dataIndex
            return [
              '',
              `Total Inflow: ${formatCurrency(stackedData.totals.inflow[monthIndex])}`,
              `Total Outflows: ${formatCurrency(stackedData.totals.outflows[monthIndex])}`,
              `Net Cash Flow: ${formatCurrency(stackedData.totals.netCashFlow[monthIndex])}`
            ]
          }
        }
      }
    },
    scales: {
      x: {
        stacked: true,
        grid: {
          display: false
        }
      },
      y: {
        stacked: true,
        ticks: {
          callback: (value: any) => formatCurrency(Math.abs(value))
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
              <h3 className="text-lg font-semibold text-gray-900">Cash Flow Composition</h3>
              <p className="text-sm text-gray-600">Breakdown of inflow and outflows</p>
            </div>
          </div>
          
          {/* Period Selector and Help */}
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
            <button
              onClick={() => setShowHelpModal(true)}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Understanding cash flow composition"
            >
              <QuestionMarkCircleIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {stackedData && stackedData.months.length > 0 ? (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-green-50 rounded-xl">
                <p className="text-sm text-gray-600">Avg Monthly Inflow</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(
                    stackedData.totals.inflow.reduce((a, b) => a + b, 0) / stackedData.totals.inflow.length
                  )}
                </p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-xl">
                <p className="text-sm text-gray-600">Avg Monthly Outflows</p>
                <p className="text-xl font-bold text-red-600">
                  {formatCurrency(
                    stackedData.totals.outflows.reduce((a, b) => a + b, 0) / stackedData.totals.outflows.length
                  )}
                </p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-xl">
                <p className="text-sm text-gray-600">Avg Net Cash Flow</p>
                <p className={`text-xl font-bold ${
                  stackedData.totals.netCashFlow.reduce((a, b) => a + b, 0) >= 0 
                    ? 'text-blue-600' 
                    : 'text-red-600'
                }`}>
                  {formatCurrency(
                    stackedData.totals.netCashFlow.reduce((a, b) => a + b, 0) / stackedData.totals.netCashFlow.length
                  )}
                </p>
              </div>
            </div>

            {/* Stacked Bar Chart */}
            <div className="h-80">
              {getChartData() && <Bar data={getChartData()!} options={chartOptions} />}
            </div>

            {/* Outflow Breakdown Summary */}
            <div className="mt-6 p-4 bg-gray-50 rounded-xl">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Average Outflow Breakdown</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span className="text-gray-600">Wages: {
                    Math.round((stackedData.categories.outflows.wages.reduce((a, b) => a + b, 0) / 
                    stackedData.totals.outflows.reduce((a, b) => a + b, 0)) * 100)
                  }%</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-orange-500 rounded"></div>
                  <span className="text-gray-600">OpEx: {
                    Math.round((stackedData.categories.outflows.opex.reduce((a, b) => a + b, 0) / 
                    stackedData.totals.outflows.reduce((a, b) => a + b, 0)) * 100)
                  }%</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-500 rounded"></div>
                  <span className="text-gray-600">Taxes: {
                    Math.round((stackedData.categories.outflows.taxes.reduce((a, b) => a + b, 0) / 
                    stackedData.totals.outflows.reduce((a, b) => a + b, 0)) * 100)
                  }%</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-cyan-500 rounded"></div>
                  <span className="text-gray-600">Bank: {
                    Math.round((stackedData.categories.outflows.bankFees.reduce((a, b) => a + b, 0) / 
                    stackedData.totals.outflows.reduce((a, b) => a + b, 0)) * 100)
                  }%</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gray-500 rounded"></div>
                  <span className="text-gray-600">Other: {
                    Math.round((stackedData.categories.outflows.other.reduce((a, b) => a + b, 0) / 
                    stackedData.totals.outflows.reduce((a, b) => a + b, 0)) * 100)
                  }%</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-gray-500">
            No data available for the selected period
          </div>
        )}
      </div>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Understanding Cash Flow Composition</h2>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 What is a Stacked Bar Chart?</h3>
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700 mb-2">
                    A <strong>stacked bar chart</strong> shows the composition of your cash flow, 
                    breaking down both inflow and outflows into their component parts.
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    Each bar represents a month, with inflow stacked above the x-axis and outflows below.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">💰 Inflow Components</h3>
                <div className="space-y-2">
                  <div className="flex items-start space-x-3">
                    <div className="w-4 h-4 bg-green-500 rounded mt-0.5"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Revenue (Green)</p>
                      <p className="text-sm text-gray-600">Your primary business inflow</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">💸 Outflow Components</h3>
                <div className="space-y-2">
                  <div className="flex items-start space-x-3">
                    <div className="w-4 h-4 bg-red-500 rounded mt-0.5"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Wages (Red)</p>
                      <p className="text-sm text-gray-600">Total employee salaries and benefits</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-4 h-4 bg-orange-500 rounded mt-0.5"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">OpEx (Orange)</p>
                      <p className="text-sm text-gray-600">Operational outflows excluding wages</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-4 h-4 bg-purple-500 rounded mt-0.5"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Taxes (Purple)</p>
                      <p className="text-sm text-gray-600">All tax obligations</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-4 h-4 bg-cyan-500 rounded mt-0.5"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Bank Fees (Cyan)</p>
                      <p className="text-sm text-gray-600">Banking and financial service charges</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-4 h-4 bg-gray-500 rounded mt-0.5"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Other (Gray)</p>
                      <p className="text-sm text-gray-600">Miscellaneous outflows</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📖 How to Read the Chart</h3>
                <div className="bg-yellow-50 rounded-xl p-4">
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• <strong>Bar height:</strong> Total inflow (above) and outflows (below)</li>
                    <li>• <strong>Segment size:</strong> Proportion of each category</li>
                    <li>• <strong>Net position:</strong> Compare top vs bottom of each month</li>
                    <li>• <strong>Trends:</strong> See how composition changes over time</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 Key Insights</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>• Quickly identify your largest outflow categories</p>
                  <p>• See if outflow proportions are changing over time</p>
                  <p>• Understand the stability of your inflow sources</p>
                  <p>• Spot months with unusual outflow patterns</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}