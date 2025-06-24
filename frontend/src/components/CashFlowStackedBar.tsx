import React, { useState, useEffect } from 'react'
import { 
  ChartBarIcon,
  CalendarDaysIcon,
  QuestionMarkCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { Bar } from 'react-chartjs-2'
import { cashflowService } from '../services/cashflowService'
import { useCurrency } from '../hooks/useCurrency'

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
      investment: number[]
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
  const { formatAmount } = useCurrency()

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
            outflows: { wages: [], opex: [], taxes: [], bankFees: [], investment: [], other: [] }
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
            outflows: { wages: [], opex: [], taxes: [], bankFees: [], investment: [], other: [] }
          },
          totals: { inflow: [], outflows: [], netCashFlow: [] }
        })
        return
      }
      
      // Also fetch operational data for outflow breakdown
      const operationalRes = await cashflowService.getOperationalData()
      const operationalData = operationalRes.data.data || []
      
      // Fetch investment data
      let investmentData = []
      try {
        const investmentRes = await cashflowService.getInvestmentsData()
        investmentData = investmentRes.data.data || []
      } catch (investError) {
        console.warn('Failed to fetch investment data:', investError)
        investmentData = []
      }
      
      console.log('Cashflow data:', cashflowData)
      console.log('Operational data:', operationalData)
      console.log('Investment data:', investmentData)
      
      // Process data for stacked visualization
      const processedData = processDataForStackedBar(cashflowData, operationalData, investmentData, period)
      console.log('Processed data:', processedData)
      setStackedData(processedData)
    } catch (error) {
      console.error('Failed to load stacked bar data:', error)
      setStackedData({
        months: [],
        categories: {
          inflow: { revenue: [], otherInflow: [] },
          outflows: { wages: [], opex: [], taxes: [], bankFees: [], investment: [], other: [] }
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
    investmentData: any[],
    monthsToShow: number
  ): StackedBarData => {
    // Ensure we have arrays
    if (!Array.isArray(cashflowData) || cashflowData.length === 0) {
      console.warn('No cashflow data available')
      return {
        months: [],
        categories: {
          inflow: { revenue: [], otherInflow: [] },
          outflows: { wages: [], opex: [], taxes: [], bankFees: [], investment: [], other: [] }
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
    const relevantInvestment = investmentData?.slice(startIndex) || []
    
    const months: string[] = []
    const revenue: number[] = []
    const otherInflow: number[] = []
    const wages: number[] = []
    const opex: number[] = []
    const taxes: number[] = []
    const bankFees: number[] = []
    const investment: number[] = []
    const otherOutflows: number[] = []
    const totalInflow: number[] = []
    const totalOutflows: number[] = []
    const netCashFlow: number[] = []
    
    relevantCashflow.forEach((month, index) => {
      months.push(month.month)
      
      // Inflow breakdown - handle both possible field names
      const monthInflow = Math.abs(month.income || month.inflow || month.totalInflow || 0)
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
      
      // Investment data
      const monthInvestment = relevantInvestment && relevantInvestment[index] ? relevantInvestment[index] : {}
      const totalInvestment = Math.abs(monthInvestment.totalInvestmentValue || 0)
      investment.push(totalInvestment)
      
      // Calculate other outflows (remainder) - handle both possible field names
      const monthOutflows = Math.abs(month.expenses || month.outflows || month.totalOutflow || 0)
      const knownOutflows = monthWages + monthOpex + monthTaxes + monthBankFees + totalInvestment
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
          investment,
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
    // Use the currency context formatter
    return formatAmount(Math.abs(amount))
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
          backgroundColor: '#22C55E',
          borderColor: '#16A34A',
          borderWidth: 1,
          stack: 'inflow',
          barPercentage: 0.7,
          categoryPercentage: 0.8
        },
        // Outflow datasets (negative values for below x-axis)
        {
          label: 'Personnel',
          data: stackedData.categories.outflows.wages.map(v => -v),
          backgroundColor: '#EF4444',
          borderColor: '#DC2626',
          borderWidth: 1,
          stack: 'outflows',
          barPercentage: 0.7,
          categoryPercentage: 0.8
        },
        {
          label: 'Operations',
          data: stackedData.categories.outflows.opex.map(v => -v),
          backgroundColor: '#F97316',
          borderColor: '#EA580C',
          borderWidth: 1,
          stack: 'outflows',
          barPercentage: 0.7,
          categoryPercentage: 0.8
        },
        {
          label: 'Taxes & Other',
          data: stackedData.categories.outflows.taxes.map((v, i) => -(v + stackedData.categories.outflows.other[i])),
          backgroundColor: '#6366F1',
          borderColor: '#4F46E5',
          borderWidth: 1,
          stack: 'outflows',
          barPercentage: 0.7,
          categoryPercentage: 0.8
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
          padding: 10,
          font: {
            size: 11
          },
          boxWidth: 15
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
        },
        ticks: {
          font: {
            size: 11
          }
        }
      },
      y: {
        stacked: true,
        ticks: {
          callback: (value: any) => {
            // Format without currency symbol for axis
            const formatted = formatAmount(Math.abs(value))
            // Remove currency symbol and keep just the number with K/M suffix
            return formatted.replace(/[^0-9.,KMB\s-]/g, '').trim()
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        title: {
          display: false
        }
      }
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 animate-pulse">
        <div className="h-64 bg-gray-100 rounded"></div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-blue-100 rounded-md">
              <ChartBarIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Cash Flow Composition</h3>
              <p className="text-xs text-gray-500">Breakdown of inflow and outflows</p>
            </div>
          </div>
          
          {/* Period Selector and Help */}
          <div className="flex items-center space-x-2">
            <CalendarDaysIcon className="h-4 w-4 text-gray-400" />
            <select
              value={period}
              onChange={(e) => setPeriod(parseInt(e.target.value))}
              className="px-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={3}>Last 3 months</option>
              <option value={6}>Last 6 months</option>
              <option value={12}>Last 12 months</option>
            </select>
            <button
              onClick={() => setShowHelpModal(true)}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              title="Understanding cash flow composition"
            >
              <QuestionMarkCircleIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        {stackedData && stackedData.months.length > 0 ? (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-emerald-50 rounded-md p-2.5">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Monthly Inflow</p>
                <p className="text-base font-bold text-emerald-600 mt-0.5">
                  {formatCurrency(
                    stackedData.totals.inflow.reduce((a, b) => a + b, 0) / stackedData.totals.inflow.length
                  )}
                </p>
              </div>
              <div className="bg-rose-50 rounded-md p-2.5">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Monthly Outflows</p>
                <p className="text-base font-bold text-rose-600 mt-0.5">
                  {formatCurrency(
                    stackedData.totals.outflows.reduce((a, b) => a + b, 0) / stackedData.totals.outflows.length
                  )}
                </p>
              </div>
              <div className="bg-blue-50 rounded-md p-2.5">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Net Cash Flow</p>
                <p className={`text-base font-bold mt-0.5 ${
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
            <div className="h-64">
              {getChartData() && <Bar data={getChartData()!} options={chartOptions} />}
            </div>

            {/* Outflow Breakdown Summary */}
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Average Outflow Breakdown</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                <div className="flex items-center space-x-1.5">
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-sm"></div>
                  <span className="text-gray-600">Wages: {
                    Math.round((stackedData.categories.outflows.wages.reduce((a, b) => a + b, 0) / 
                    stackedData.totals.outflows.reduce((a, b) => a + b, 0)) * 100)
                  }%</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <div className="w-2.5 h-2.5 bg-orange-500 rounded-sm"></div>
                  <span className="text-gray-600">OpEx: {
                    Math.round((stackedData.categories.outflows.opex.reduce((a, b) => a + b, 0) / 
                    stackedData.totals.outflows.reduce((a, b) => a + b, 0)) * 100)
                  }%</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <div className="w-2.5 h-2.5 bg-purple-500 rounded-sm"></div>
                  <span className="text-gray-600">Taxes: {
                    Math.round((stackedData.categories.outflows.taxes.reduce((a, b) => a + b, 0) / 
                    stackedData.totals.outflows.reduce((a, b) => a + b, 0)) * 100)
                  }%</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <div className="w-2.5 h-2.5 bg-cyan-500 rounded-sm"></div>
                  <span className="text-gray-600">Bank: {
                    Math.round((stackedData.categories.outflows.bankFees.reduce((a, b) => a + b, 0) / 
                    stackedData.totals.outflows.reduce((a, b) => a + b, 0)) * 100)
                  }%</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <div className="w-2.5 h-2.5 bg-pink-500 rounded-sm"></div>
                  <span className="text-gray-600">Investment: {
                    Math.round((stackedData.categories.outflows.investment.reduce((a, b) => a + b, 0) / 
                    stackedData.totals.outflows.reduce((a, b) => a + b, 0)) * 100)
                  }%</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <div className="w-2.5 h-2.5 bg-gray-500 rounded-sm"></div>
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
                    <div className="w-4 h-4 bg-pink-500 rounded mt-0.5"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Investment (Pink)</p>
                      <p className="text-sm text-gray-600">Capital investments and asset purchases</p>
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