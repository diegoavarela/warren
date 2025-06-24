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
    
    return current;
  }

  const currentData = findLatestDataMonth(investmentData);

  // Calculate portfolio change
  const currentIndex = currentData ? investmentData.findIndex(d => d.month === currentData.month) : -1
  const previousData = currentIndex > 0 ? investmentData[currentIndex - 1] : null
  
  const portfolioChange = currentData && previousData 
    ? (currentData.totalInvestmentValue || 0) - (previousData.totalInvestmentValue || 0)
    : 0
    
  const portfolioChangePercent = currentData && previousData && previousData.totalInvestmentValue
    ? (portfolioChange / previousData.totalInvestmentValue) * 100
    : 0

  // Chart data for performance view
  const chartData = {
    labels: investmentData.map(d => d.month),
    datasets: [
      {
        label: 'Portfolio Value',
        data: investmentData.map(d => d.totalInvestmentValue || 0),
        borderColor: 'rgb(147, 51, 234)',
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        tension: 0.1
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
            return `Portfolio: ${formatCurrency(context.raw)}`
          }
        }
      }
    },
    scales: {
      y: {
        ticks: {
          callback: (value: any) => {
            return formatCurrency(value)
          }
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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-purple-100">
            <ChartBarIcon className="h-8 w-8 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Investment Portfolio</h3>
            <p className="text-sm font-medium text-gray-500">
              Total investment value
            </p>
          </div>
        </div>
      </div>

      {/* Single Total Investment Value */}
      <div className="text-center py-8">
        <p className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
          {formatCurrency(currentData.totalInvestmentValue!)}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          {currentData?.month || 'Current Month'}
        </p>
      </div>
    </div>
  )
}