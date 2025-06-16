import React, { useEffect, useState } from 'react'
import { 
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  QuestionMarkCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { Line } from 'react-chartjs-2'
import { cashflowService } from '../services/cashflowService'
import { mockWidgetData } from '../services/mockDataService'
import { isScreenshotMode } from '../utils/screenshotHelper'

interface InvestmentData {
  month: string
  date: string
  stockPortfolio?: number
  bondPortfolio?: number
  realEstate?: number
  totalInvestmentValue?: number
  monthlyReturn?: number
  returnPercentage?: number
  dividendInflow?: number
  investmentFees?: number
}

interface InvestmentsWidgetProps {
  currency: 'ARS' | 'USD' | 'EUR' | 'BRL'
  displayUnit: 'actual' | 'thousands' | 'millions' | 'billions'
}

interface YTDMetrics {
  totalInvestment: number
  totalDividendIncome: number
  totalInvestmentFees: number
  averageMonthlyReturn: number
}

export const InvestmentsWidget: React.FC<InvestmentsWidgetProps> = ({ currency, displayUnit }) => {
  const [investmentData, setInvestmentData] = useState<InvestmentData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedView, setSelectedView] = useState<'portfolio' | 'performance'>('portfolio')
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [ytdMetrics, setYtdMetrics] = useState<YTDMetrics | null>(null)

  useEffect(() => {
    loadInvestmentData()
  }, [])

  const loadInvestmentData = async () => {
    try {
      setLoading(true)
      
      if (isScreenshotMode()) {
        // Use mock data for screenshots
        setInvestmentData(mockWidgetData.investments)
        calculateYTDMetrics(mockWidgetData.investments)
        return
      }
      
      const response = await cashflowService.getInvestmentsData()
      const data = response.data.data || []
      setInvestmentData(data)
      calculateYTDMetrics(data)
    } catch (error) {
      console.error('Failed to load investment data:', error)
      // Don't use mock data - leave empty
      setInvestmentData([])
      setYtdMetrics(null)
    } finally {
      setLoading(false)
    }
  }

  const calculateYTDMetrics = (data: InvestmentData[]) => {
    if (!data || data.length === 0) {
      setYtdMetrics(null)
      return
    }

    // Calculate YTD metrics
    let sumInvestment = 0
    let totalDividendIncome = 0
    let totalInvestmentFees = 0
    let totalNetReturns = 0 // Net returns = dividends - fees
    let monthCount = 0

    // Get current date to determine YTD period
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()

    data.forEach(item => {
      // Parse the date to check if it's in the current year
      const itemDate = new Date(item.date)
      if (itemDate.getFullYear() === currentYear && itemDate <= currentDate) {
        // For YTD sum, we want the cumulative investment value
        sumInvestment += item.totalInvestmentValue || 0
        totalDividendIncome += item.dividendInflow || 0
        totalInvestmentFees += item.investmentFees || 0
        // Calculate net return for the month (dividends - fees)
        const monthlyNetReturn = (item.dividendInflow || 0) - (item.investmentFees || 0)
        totalNetReturns += monthlyNetReturn
        monthCount++
      }
    })

    // Calculate YTD average based on total months in year so far, not just months with data
    const currentMonth = currentDate.getMonth() + 1 // getMonth() is 0-based, so add 1
    const ytdMonthsTotal = currentMonth // January = 1, June = 6, etc.
    const averageMonthlyReturn = ytdMonthsTotal > 0 ? totalNetReturns / ytdMonthsTotal : 0
    
    console.log('YTD Calculation Debug:', {
      totalNetReturns,
      monthsWithData: monthCount,
      ytdMonthsTotal,
      currentMonth: currentDate.toLocaleDateString('en-US', { month: 'long' }),
      oldAverage: monthCount > 0 ? totalNetReturns / monthCount : 0,
      newAverage: averageMonthlyReturn
    });

    setYtdMetrics({
      totalInvestment: sumInvestment, // Sum of all YTD investments
      totalDividendIncome,
      totalInvestmentFees,
      averageMonthlyReturn
    })
  }

  const formatCurrency = (amount: number) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '$0'
    }
    
    let adjustedAmount = amount
    let unitSuffix = ''
    
    switch (displayUnit) {
      case 'thousands':
        adjustedAmount = amount / 1000
        unitSuffix = 'K'
        break
      case 'millions':
        adjustedAmount = amount / 1000000
        unitSuffix = 'M'
        break
      case 'billions':
        adjustedAmount = amount / 1000000000
        unitSuffix = 'B'
        break
      default:
        adjustedAmount = amount
        unitSuffix = ''
    }
    
    const localeMap = {
      'ARS': 'es-AR',
      'USD': 'en-US', 
      'EUR': 'de-DE',
      'BRL': 'pt-BR'
    }
    
    try {
      let formatted: string
      
      if (currency === 'ARS') {
        const number = new Intl.NumberFormat('es-AR', {
          minimumFractionDigits: displayUnit === 'actual' ? 0 : 1,
          maximumFractionDigits: displayUnit === 'actual' ? 0 : 1,
        }).format(Math.abs(adjustedAmount))
        formatted = `$${number}`
      } else {
        formatted = new Intl.NumberFormat(localeMap[currency], {
          style: 'currency',
          currency: currency,
          minimumFractionDigits: displayUnit === 'actual' ? 0 : 1,
          maximumFractionDigits: displayUnit === 'actual' ? 0 : 1,
        }).format(Math.abs(adjustedAmount))
      }
      
      return unitSuffix ? `${formatted}${unitSuffix}` : formatted
    } catch (error) {
      return `$${Math.abs(adjustedAmount).toFixed(1)}${unitSuffix}`
    }
  }

  // Find the latest month with actual investment data, not just the last month in array
  const findLatestDataMonth = (data: InvestmentData[]) => {
    // First try to find current month (June 2025)
    const currentMonthName = new Date().toLocaleDateString('en-US', { month: 'long' });
    let current = data.find(item => item.month === currentMonthName);
    
    // If current month has no data or zero values, find the latest month with actual investment data
    if (!current || (!current.totalInvestmentValue && !current.dividendInflow)) {
      // Search backwards for month with actual data
      for (let i = data.length - 1; i >= 0; i--) {
        const item = data[i];
        if ((item.totalInvestmentValue && item.totalInvestmentValue > 0) || 
            (item.dividendInflow && item.dividendInflow > 0)) {
          current = item;
          break;
        }
      }
    }
    
    // Final fallback to last month
    if (!current && data.length > 0) {
      current = data[data.length - 1];
    }
    
    return current;
  };

  const currentData = findLatestDataMonth(investmentData);
  const currentIndex = currentData ? investmentData.indexOf(currentData) : -1;
  const previousData = currentIndex > 0 ? investmentData[currentIndex - 1] : null;

  // Debug logging
  console.log('Investment Widget Debug:', {
    totalMonths: investmentData.length,
    selectedMonth: currentData?.month,
    selectedDividends: currentData?.dividendInflow,
    selectedFees: currentData?.investmentFees,
    selectedPortfolioValue: currentData?.totalInvestmentValue,
    allMonthsData: investmentData.map(item => ({
      month: item.month,
      dividends: item.dividendInflow,
      fees: item.investmentFees,
      portfolio: item.totalInvestmentValue
    }))
  });
  
  // Calculate change from previous month to current month
  const portfolioChange = currentData && previousData 
    ? currentData.totalInvestmentValue! - previousData.totalInvestmentValue!
    : 0
  
  const portfolioChangePercent = currentData && previousData && previousData.totalInvestmentValue
    ? ((currentData.totalInvestmentValue! - previousData.totalInvestmentValue!) / previousData.totalInvestmentValue!) * 100
    : 0
  
  // Calculate monthly return if not provided
  if (currentData && !currentData.monthlyReturn) {
    currentData.monthlyReturn = (currentData.dividendInflow || 0) - (currentData.investmentFees || 0)
    if (currentData.totalInvestmentValue && currentData.totalInvestmentValue > 0) {
      currentData.returnPercentage = (currentData.monthlyReturn / currentData.totalInvestmentValue) * 100
    } else {
      currentData.returnPercentage = 0
    }
  }

  const chartData = {
    labels: investmentData.map(d => d.month),
    datasets: [
      {
        label: 'Total Portfolio Value',
        data: investmentData.map(d => d.totalInvestmentValue),
        borderColor: '#8B5CF6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        borderWidth: 3,
        tension: 0.4,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: '#8B5CF6'
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const value = context.parsed.y
            return `Portfolio Value: ${formatCurrency(value)}`
          }
        }
      }
    },
    scales: {
      y: {
        ticks: {
          callback: (value: any) => formatCurrency(value)
        }
      }
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 animate-pulse">
        <div className="h-48 bg-gray-100 rounded"></div>
      </div>
    )
  }

  if (!currentData || investmentData.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl bg-purple-100">
              <ChartBarIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Investment Portfolio</h3>
              <p className="text-sm font-medium text-gray-500">No investment data</p>
            </div>
          </div>
        </div>
        <div className="text-center py-12">
          <ChartBarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">Investment details not available in the uploaded file</p>
          <p className="text-sm text-gray-400">Investment information will be displayed here when available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-purple-100">
            <ChartBarIcon className="h-8 w-8 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Investment Portfolio</h3>
            <p className={`text-sm font-medium flex items-center space-x-1 ${
              portfolioChange >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {portfolioChange >= 0 ? (
                <ArrowTrendingUpIcon className="h-4 w-4" />
              ) : (
                <ArrowTrendingDownIcon className="h-4 w-4" />
              )}
              <span>
                {portfolioChange >= 0 ? '+' : ''}{formatCurrency(Math.abs(portfolioChange))}
                ({portfolioChangePercent >= 0 ? '+' : ''}{portfolioChangePercent.toFixed(1)}%)
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setSelectedView('portfolio')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                selectedView === 'portfolio'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Portfolio
            </button>
            <button
              onClick={() => setSelectedView('performance')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                selectedView === 'performance'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Performance
            </button>
          </div>
          <button
            onClick={() => setShowHelpModal(true)}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Understanding investment portfolio"
          >
            <QuestionMarkCircleIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {selectedView === 'portfolio' ? (
        <div className="space-y-4">
          {/* Total Portfolio Value */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200">
            <div className="flex justify-between items-center mb-2">
              <div>
                <span className="text-sm font-medium text-gray-700">Total Portfolio Value</span>
                <p className="text-xs text-gray-500">Market value of all holdings</p>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                {formatCurrency(currentData.totalInvestmentValue!)}
              </span>
            </div>
          </div>

          {/* Asset Allocation */}
          <div className="grid grid-cols-1 gap-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Stock Portfolio</span>
              <span className="text-sm font-semibold text-gray-900">
                {formatCurrency(currentData.stockPortfolio!)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Bond Portfolio</span>
              <span className="text-sm font-semibold text-gray-900">
                {formatCurrency(currentData.bondPortfolio!)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Real Estate</span>
              <span className="text-sm font-semibold text-gray-900">
                {formatCurrency(currentData.realEstate!)}
              </span>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="pt-3 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Dividend Income</p>
                <p className="text-xs text-gray-500 mb-2">Cash from investments ({currentData?.month})</p>
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(currentData.dividendInflow!)}
                </p>
                {ytdMetrics && ytdMetrics.totalDividendIncome > 0 && (
                  <p className="text-xs text-gray-500 mt-1">YTD Total: {formatCurrency(ytdMetrics.totalDividendIncome)}</p>
                )}
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Investment Fees</p>
                <p className="text-xs text-gray-500 mb-2">Banking & management costs ({currentData?.month})</p>
                <p className="text-lg font-bold text-red-600">
                  {formatCurrency(currentData.investmentFees!)}
                </p>
                {ytdMetrics && ytdMetrics.totalInvestmentFees > 0 && (
                  <p className="text-xs text-gray-500 mt-1">YTD Total: {formatCurrency(ytdMetrics.totalInvestmentFees)}</p>
                )}
              </div>
            </div>
          </div>

          {/* YTD Summary - Only show if we have YTD data */}
          {ytdMetrics && (
            <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
              <h4 className="text-xs font-semibold text-purple-700 mb-2">Year to Date Summary</h4>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Total YTD Investment:</span>
                  <span className="text-xs font-semibold text-purple-700">{formatCurrency(ytdMetrics.totalInvestment)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Avg Monthly Net Return:</span>
                  <span className={`text-xs font-semibold ${ytdMetrics.averageMonthlyReturn >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {formatCurrency(ytdMetrics.averageMonthlyReturn)}
                  </span>
                </div>
                <div className="mt-2 pt-2 border-t border-purple-200">
                  <p className="text-xs text-gray-600">
                    {ytdMetrics.averageMonthlyReturn >= 0 ? 
                      '✓ Profitable: Dividends exceed fees on average' : 
                      '⚠ Loss: Fees exceed dividends on average'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Performance Chart */}
          <div className="h-64">
            <Line data={chartData} options={chartOptions} />
          </div>
          
          {/* Return Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
              <p className="text-xs text-gray-600 mb-1">Monthly Net Return</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(currentData?.monthlyReturn || 0)}
              </p>
              <p className="text-xs text-green-600 mt-1">
                {(currentData?.returnPercentage || 0) >= 0 ? '+' : ''}{(currentData?.returnPercentage || 0).toFixed(2)}%
              </p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <p className="text-xs text-gray-600 mb-1">Total Return</p>
              <p className="text-xl font-bold text-blue-600">
                {formatCurrency(portfolioChange)}
              </p>
              <p className="text-xs text-blue-600 mt-1">Portfolio change</p>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Understanding Investment Portfolio</h2>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 What is the Investment Portfolio Widget?</h3>
                <div className="bg-purple-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700 mb-3">
                    This widget analyzes your investment income and costs from your Excel cashflow data. 
                    It tracks dividend income from investment portfolios (like Galicia and Balanz) and 
                    compares them against associated banking fees and investment costs.
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Data Source:</strong> Investment income (rows 21-23) and bank expenses (row 99) from your Excel file.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">💰 What Each Metric Means</h3>
                <div className="space-y-4">
                  
                  <div className="border-l-4 border-green-500 pl-4">
                    <h4 className="text-sm font-semibold text-gray-900">Dividend Income</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Total dividends received from your investment portfolios (Galicia + Balanz) for the selected month.
                      This represents the cash income generated by your investments.
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Current: {currentData ? formatCurrency(currentData.dividendInflow || 0) : '$0'} ({currentData?.month || 'No data'})
                    </p>
                  </div>

                  <div className="border-l-4 border-red-500 pl-4">
                    <h4 className="text-sm font-semibold text-gray-900">Investment Fees</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Investment-related fees and costs. Currently set to $0 because your Excel file 
                      doesn't have a separate line item for investment-specific fees.
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Note: Bank expenses are tracked separately and not attributed to investments
                    </p>
                  </div>

                  <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="text-sm font-semibold text-gray-900">Total Portfolio Value</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      The current market value of your investment holdings. This represents the total worth 
                      of your stock and bond portfolios combined.
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Current: {currentData ? formatCurrency(currentData.totalInvestmentValue || 0) : '$0'} ({currentData?.month || 'No data'})
                    </p>
                  </div>

                  <div className="border-l-4 border-purple-500 pl-4">
                    <h4 className="text-sm font-semibold text-gray-900">Avg Monthly Net Return</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Average monthly profit/loss from investments after subtracting all fees.
                      <br/>
                      <strong>Formula:</strong> (Total Dividend Income - Total Investment Fees) ÷ Number of Months
                    </p>
                    <p className="text-xs text-purple-600 mt-1">
                      YTD Average: {ytdMetrics ? formatCurrency(ytdMetrics.averageMonthlyReturn) : '$0'}
                    </p>
                  </div>

                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📈 How to Interpret Your Data</h3>
                <div className="bg-yellow-50 rounded-xl p-4">
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="font-medium text-green-600">✓ Positive Net Return:</span>
                      <span className="text-gray-700 ml-2">Your investments are profitable after fees</span>
                    </div>
                    <div>
                      <span className="font-medium text-green-600">✓ No Investment Fees:</span>
                      <span className="text-gray-700 ml-2">All dividend income is pure profit since no investment fees are tracked</span>
                    </div>
                    <div>
                      <span className="font-medium text-blue-600">→ Bank Expenses:</span>
                      <span className="text-gray-700 ml-2">General banking costs are tracked separately and not attributed to investments</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">🎯 Your Current Situation</h3>
                <div className="bg-blue-50 rounded-xl p-4">
                  {currentData && ytdMetrics ? (
                    <div className="space-y-2 text-sm">
                      <p className="text-gray-700">
                        <strong>Latest Month:</strong> {currentData.month} shows {formatCurrency(currentData.dividendInflow || 0)} in dividends 
                        vs {formatCurrency(currentData.investmentFees || 0)} in fees.
                      </p>
                      <p className="text-gray-700">
                        <strong>Net Result:</strong> {((currentData.dividendInflow || 0) - (currentData.investmentFees || 0)) >= 0 ? 
                          `Profit of ${formatCurrency(Math.abs((currentData.dividendInflow || 0) - (currentData.investmentFees || 0)))}` :
                          `Loss of ${formatCurrency(Math.abs((currentData.dividendInflow || 0) - (currentData.investmentFees || 0)))}`
                        }
                      </p>
                      <p className="text-gray-700">
                        <strong>YTD Average:</strong> {ytdMetrics.averageMonthlyReturn >= 0 ? 
                          `Monthly profit of ${formatCurrency(ytdMetrics.averageMonthlyReturn)}` :
                          `Monthly loss of ${formatCurrency(Math.abs(ytdMetrics.averageMonthlyReturn))}`
                        }
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">No investment data available yet. Upload your Excel file to see investment analysis.</p>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}