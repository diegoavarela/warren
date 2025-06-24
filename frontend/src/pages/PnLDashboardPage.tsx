import React, { useState, useEffect } from 'react'
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CalculatorIcon,
  ScaleIcon,
  DocumentArrowDownIcon,
  QuestionMarkCircleIcon,
  XMarkIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { pnlService } from '../services/pnlService'
import { ProfessionalPDFService } from '../services/professionalPdfService'
import { PremiumPDFExport } from '../components/PremiumPDFExport'
import { configurationService } from '../services/configurationService'
import { FileUploadSection } from '../components/FileUploadSection'
import { CurrencySelector } from '../components/CurrencySelector'
import { CurrencyValue } from '../components/CurrencyValue'
import { useCurrency } from '../hooks/useCurrency'
import { Currency, Unit } from '../interfaces/currency'
import { mockPnlData } from '../services/mockDataService'
import { currencyService } from '../services/currencyService'
import { ExchangeRateModal } from '../components/ExchangeRateModal'
import { PerformanceHeatMap } from '../components/PerformanceHeatMap'
import { TrendForecastChart } from '../components/TrendForecastChart'
import { KeyInsights } from '../components/KeyInsights'
import { Line, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { useTranslation } from 'react-i18next'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface PnLDashboardData {
  hasData: boolean
  uploadedFileName?: string
  currentMonth?: {
    month: string
    revenue: number
    cogs: number
    grossProfit: number
    grossMargin: number
    operatingExpenses: number
    operatingIncome: number
    operatingMargin: number
    netIncome: number
    netMargin: number
    ebitda: number
    ebitdaMargin: number
    // Personnel Cost Details
    totalPersonnelCost?: number
    personnelSalariesCoR?: number
    payrollTaxesCoR?: number
    personnelSalariesOp?: number
    payrollTaxesOp?: number
    healthCoverage?: number
    personnelBenefits?: number
    // Cost Structure
    contractServicesCoR?: number
    contractServicesOp?: number
    professionalServices?: number
    salesMarketing?: number
    facilitiesAdmin?: number
  }
  previousMonth?: {
    month: string
    revenue: number
    cogs: number
    grossProfit: number
    grossMargin: number
    operatingExpenses: number
    operatingIncome: number
    operatingMargin: number
    netIncome: number
    netMargin: number
    ebitda: number
    ebitdaMargin: number
  }
  yearToDate?: {
    revenue: number
    cogs: number
    grossProfit: number
    operatingExpenses: number
    netIncome: number
  }
  summary?: {
    totalRevenue: number
    totalCOGS: number
    totalGrossProfit: number
    avgGrossMargin: number
    totalOperatingExpenses: number
    totalOperatingIncome: number
    avgOperatingMargin: number
    totalNetIncome: number
    avgNetMargin: number
  }
  chartData?: Array<{
    month: string
    revenue: number
    grossProfit: number
    operatingIncome: number
    netIncome: number
    grossMargin: number
    netMargin: number
  }>
}

export const PnLDashboardPage: React.FC = () => {
  const { t } = useTranslation()
  const [data, setData] = useState<PnLDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isScreenshotMode] = useState(() => 
    window.location.search.includes('screenshot=true') || 
    sessionStorage.getItem('screenshotMode') === 'true'
  )
  const [isDemoMode] = useState(() => 
    window.location.pathname.startsWith('/demo') || window.location.search.includes('demo=true')
  )
  const [exporting, setExporting] = useState(false)
  const [showPersonnelHelpModal, setShowPersonnelHelpModal] = useState(false)
  const [showCostEfficiencyHelpModal, setShowCostEfficiencyHelpModal] = useState(false)
  const [showRevenueGrowthHelpModal, setShowRevenueGrowthHelpModal] = useState(false)
  const [showYTDSummaryHelpModal, setShowYTDSummaryHelpModal] = useState(false)
  const [showCurrentPnLHelpModal, setShowCurrentPnLHelpModal] = useState(false)
  const [showMarginsChartHelpModal, setShowMarginsChartHelpModal] = useState(false)
  const [showRevenueChartHelpModal, setShowRevenueChartHelpModal] = useState(false)
  const [showComparisonHelpModal, setShowComparisonHelpModal] = useState(false)
  const [showPerformanceHelpModal, setShowPerformanceHelpModal] = useState(false)
  const [showTrendForecastHelpModal, setShowTrendForecastHelpModal] = useState(false)
  const [comparisonPeriod, setComparisonPeriod] = useState<'month' | 'quarter' | 'year'>('month')
  const [currentExchangeRate, setCurrentExchangeRate] = useState<number | null>(null)
  const [showExchangeRateModal, setShowExchangeRateModal] = useState(false)
  
  // Use the new currency hook
  const { 
    currency: displayCurrency, 
    unit: displayUnit, 
    baseCurrency,
    baseUnit,
    settings,
    setCurrency: setDisplayCurrency, 
    setUnit: setDisplayUnit,
    convertAmount,
    formatAmount,
    loading: currencyLoading
  } = useCurrency('pnl')
  
  // Keep legacy states for backward compatibility
  const [currency, setCurrency] = useState<'ARS' | 'USD' | 'EUR' | 'BRL'>('ARS')
  const [displayUnitLegacy, setDisplayUnitLegacy] = useState<'actual' | 'thousands' | 'millions' | 'billions'>('thousands')

  // Convert new Unit type to legacy unit type
  const convertToLegacyUnit = (unit: Unit): 'actual' | 'thousands' | 'millions' | 'billions' => {
    switch (unit) {
      case 'units': return 'actual'
      case 'thousands': return 'thousands'
      case 'millions': return 'millions'
      default: return 'thousands'
    }
  }

  const legacyDisplayUnit = convertToLegacyUnit(displayUnit)

  useEffect(() => {
    // Only load dashboard after currency settings are loaded
    if (!currencyLoading) {
      loadDashboard()
    }
  }, [currencyLoading])




  // Fetch exchange rate when currency changes - use baseCurrency as baseline
  useEffect(() => {
    if (settings.enableCurrencyConversion) {
      // Convert from baseCurrency to display currency
      if (displayCurrency !== baseCurrency) {
        currencyService.getExchangeRate(baseCurrency, displayCurrency)
          .then(rate => {
            console.log(`P&L page: Setting exchange rate ${baseCurrency} -> ${displayCurrency}: ${rate}`)
            setCurrentExchangeRate(rate)
          })
          .catch(err => console.error('Failed to fetch exchange rate:', err))
      } else {
        setCurrentExchangeRate(null)
      }
    } else {
      setCurrentExchangeRate(null)
    }
  }, [displayCurrency, baseCurrency, settings.enableCurrencyConversion])

  // Force re-render when exchange rate changes to update all displayed values
  useEffect(() => {
    if (currentExchangeRate !== null) {
      console.log(`P&L page: Exchange rate updated, triggering re-render with rate: ${currentExchangeRate}`)
      // This effect will cause the component to re-render and apply the new exchange rate
    }
  }, [currentExchangeRate])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      setError('')
      
      if (isScreenshotMode || isDemoMode) {
        // Use mock data for screenshots/demo
        console.log('Loading P&L mock data for screenshot/demo mode')
        setData(mockPnlData as any)
        setLoading(false)
        return
      } else {
        const response = await pnlService.getDashboard()
        
        // Check if the response has actual data or is just an empty/default response
        if (response.data.data && response.data.data.hasData) {
          setData(response.data.data)
        } else {
          // No data uploaded yet, show upload screen
          setData({ hasData: false })
        }
      }
    } catch (err: any) {
      if (isScreenshotMode || isDemoMode) {
        // If API fails in screenshot/demo mode, just use mock data
        console.log('API failed in P&L screenshot/demo mode, using mock data')
        setData(mockPnlData as any)
      } else {
        setError(err.response?.data?.message || 'Failed to load P&L data')
      }
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    // Apply exchange rate conversion if enabled and rate is available
    let convertedAmount = amount
    if (settings.enableCurrencyConversion && currentExchangeRate && baseCurrency !== displayCurrency) {
      // Convert from baseCurrency to displayCurrency
      convertedAmount = amount * currentExchangeRate
      console.log(`Converting P&L amount: ${amount} ${baseCurrency} -> ${convertedAmount} ${displayCurrency} (rate: ${currentExchangeRate})`)
    }
    
    // Format the amount considering the source data unit
    if (!currencyLoading) {
      // If source data unit matches display unit, format without conversion
      if (baseUnit === displayUnit) {
        // Units match - apply conversion if needed
        // Data is already in the display unit, so format as units but add the suffix
        const formatted = currencyService.formatCurrency(convertedAmount, displayCurrency, 'units')
        if (displayUnit === 'thousands') {
          return formatted.replace(/\s*$/, ' K')
        } else if (displayUnit === 'millions') {
          return formatted.replace(/\s*$/, ' M')
        }
        return formatted
      } else {
        // Need to convert between units
        let adjustedAmount = convertedAmount
        
        // Convert from source unit to display unit
        if (baseUnit === 'thousands' && displayUnit === 'millions') {
          adjustedAmount = convertedAmount / 1000
        } else if (baseUnit === 'thousands' && displayUnit === 'units') {
          adjustedAmount = convertedAmount * 1000
        } else if (baseUnit === 'millions' && displayUnit === 'thousands') {
          adjustedAmount = convertedAmount * 1000
        } else if (baseUnit === 'millions' && displayUnit === 'units') {
          adjustedAmount = convertedAmount * 1000000
        } else if (baseUnit === 'units' && displayUnit === 'thousands') {
          adjustedAmount = convertedAmount / 1000
        } else if (baseUnit === 'units' && displayUnit === 'millions') {
          adjustedAmount = convertedAmount / 1000000
        }
        
        return currencyService.formatCurrency(adjustedAmount, displayCurrency, displayUnit)
      }
    }
    
    // Fallback
    return '$0'
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const calculateChange = (current: number, previous: number) => {
    if (!previous || previous === 0) return null
    const change = ((current - previous) / previous) * 100
    return {
      value: current - previous,
      percentage: change,
      isPositive: change >= 0
    }
  }

  const getComparisonData = () => {
    if (!data?.chartData || !data.currentMonth) return null

    const currentMonthIndex = data.chartData.findIndex(d => d.month === data.currentMonth.month)
    if (currentMonthIndex === -1) return null

    let comparisonData = null
    let comparisonLabel = ''

    switch (comparisonPeriod) {
      case 'month':
        // Previous month comparison
        if (currentMonthIndex > 0) {
          const prevMonth = data.chartData[currentMonthIndex - 1]
          comparisonData = {
            revenue: prevMonth.revenue,
            grossProfit: prevMonth.grossProfit,
            operatingIncome: prevMonth.operatingIncome,
            netIncome: prevMonth.netIncome,
            ebitda: prevMonth.operatingIncome, // Approximation
          }
          comparisonLabel = prevMonth.month
        }
        break
      
      case 'quarter':
        // Previous quarter comparison (3 months ago)
        if (currentMonthIndex >= 3) {
          const quarterData = data.chartData[currentMonthIndex - 3]
          comparisonData = {
            revenue: quarterData.revenue,
            grossProfit: quarterData.grossProfit,
            operatingIncome: quarterData.operatingIncome,
            netIncome: quarterData.netIncome,
            ebitda: quarterData.operatingIncome, // Approximation
          }
          comparisonLabel = `Q${Math.floor((currentMonthIndex - 3) / 3) + 1} ${quarterData.month}`
        }
        break
      
      case 'year':
        // Same period last year (12 months ago)
        if (data.chartData.length >= 12 && currentMonthIndex >= 12) {
          const yearAgoData = data.chartData[currentMonthIndex - 12]
          comparisonData = {
            revenue: yearAgoData.revenue,
            grossProfit: yearAgoData.grossProfit,
            operatingIncome: yearAgoData.operatingIncome,
            netIncome: yearAgoData.netIncome,
            ebitda: yearAgoData.operatingIncome, // Approximation
          }
          comparisonLabel = yearAgoData.month
        }
        break
    }

    return { data: comparisonData, label: comparisonLabel }
  }

  const hasYearOverYearData = () => {
    return data?.chartData && data.chartData.length >= 12
  }

  const getYearToDateComparison = () => {
    if (!data?.chartData || !hasYearOverYearData()) return null

    const currentYear = new Date().getFullYear()
    const currentYearMonths = data.chartData.filter(d => {
      // Assuming month format includes year
      return true // This would need proper date parsing
    }).slice(-12)

    const previousYearMonths = currentYearMonths.length >= 12 ? 
      data.chartData.slice(0, currentYearMonths.length) : null

    if (!previousYearMonths) return null

    return {
      currentYTD: {
        revenue: currentYearMonths.reduce((sum, m) => sum + m.revenue, 0),
        grossProfit: currentYearMonths.reduce((sum, m) => sum + m.grossProfit, 0),
        operatingIncome: currentYearMonths.reduce((sum, m) => sum + m.operatingIncome, 0),
        netIncome: currentYearMonths.reduce((sum, m) => sum + m.netIncome, 0)
      },
      previousYTD: {
        revenue: previousYearMonths.reduce((sum, m) => sum + m.revenue, 0),
        grossProfit: previousYearMonths.reduce((sum, m) => sum + m.grossProfit, 0),
        operatingIncome: previousYearMonths.reduce((sum, m) => sum + m.operatingIncome, 0),
        netIncome: previousYearMonths.reduce((sum, m) => sum + m.netIncome, 0)
      }
    }
  }


  const handleUpload = async (uploadedFile: File) => {
    // Skip upload in screenshot/demo mode
    if (isScreenshotMode || isDemoMode) return
    
    await pnlService.uploadFile(uploadedFile)
    // Reload dashboard data
    await loadDashboard()
  }

  const handleMappingSuccess = async () => {
    // Skip in screenshot/demo mode
    if (isScreenshotMode || isDemoMode) return
    
    // Just reload dashboard data since mapping endpoint already processed the file
    await loadDashboard()
  }

  const getMarginChartData = () => {
    if (!data?.chartData) return null

    return {
      labels: data.chartData.map(d => d.month),
      datasets: [
        {
          label: 'Gross Margin %',
          data: data.chartData.map(d => d.grossMargin),
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Net Margin %',
          data: data.chartData.map(d => d.netMargin),
          borderColor: '#8B5CF6',
          backgroundColor: 'rgba(139, 92, 246, 0.15)',
          tension: 0.4,
          fill: true
        }
      ]
    }
  }

  const getRevenueChartData = () => {
    if (!data?.chartData) return null

    // Calculate month-over-month growth for revenue
    const revenueGrowths = data.chartData.map((d, idx) => {
      if (idx === 0) return 0
      const prevRevenue = data.chartData[idx - 1].revenue
      if (!prevRevenue || prevRevenue === 0) return 0
      return ((d.revenue - prevRevenue) / prevRevenue) * 100
    })

    // Get traffic light colors based on growth
    const revenueColors = revenueGrowths.map(growth => {
      if (growth > 5) return '#10B981' // Green - strong growth
      if (growth >= 0) return '#F59E0B' // Yellow/Amber - flat/slight growth
      return '#EF4444' // Red - negative growth
    })

    return {
      labels: data.chartData.map((d, idx) => {
        if (idx === 0) return d.month
        const growth = revenueGrowths[idx]
        return `${d.month} (${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%)`
      }),
      datasets: [
        {
          label: 'Revenue',
          data: data.chartData.map(d => d.revenue),
          backgroundColor: revenueColors,
          borderColor: revenueColors,
          borderWidth: 2
        },
        {
          label: 'Gross Profit',
          data: data.chartData.map(d => d.grossProfit),
          backgroundColor: 'rgba(37, 99, 235, 0.6)',
          borderColor: '#2563EB',
          borderWidth: 1
        },
        {
          label: 'Net Income',
          data: data.chartData.map(d => d.netIncome),
          backgroundColor: 'rgba(124, 58, 237, 0.6)',
          borderColor: '#7C3AED',
          borderWidth: 1
        }
      ]
    }
  }

  const exportToPDF = async () => {
    if (!data?.currentMonth) return

    try {
      setExporting(true)
      
      // Get active company information
      const activeCompany = await configurationService.getActiveCompany()
      
      await ProfessionalPDFService.exportDashboard({
        company: activeCompany.data,
        title: 'P&L Financial Report',
        data: data,
        type: 'pnl'
      })
    } catch (err: any) {
      setError('Failed to export PDF. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            if (context.dataset.label?.includes('Margin')) {
              return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`
            }
            return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: any) => {
            if (typeof value === 'number') {
              return value < 100 ? `${value}%` : formatCurrency(value)
            }
            return value
          }
        }
      }
    }
  }

  if (loading || currencyLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl p-6 shadow">
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                    <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!data?.hasData) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <ChartBarIcon className="h-8 w-8 mr-3 text-emerald-600" />
                {t('pnl.dashboard.title')}
              </h1>
              <p className="text-gray-600 mt-2">{t('pnl.dashboard.subtitle')}</p>
            </div>

            {/* File Upload Section */}
            <FileUploadSection
              onFileUpload={handleUpload}
              onMappingSuccess={handleMappingSuccess}
              title={t('pnl.upload.title')}
              description={t('pnl.upload.description')}
              uploadedFileName={data?.uploadedFileName}
              isRealData={false}
              variant="pnl"
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto" id="pnl-dashboard-content">
      {/* Demo Mode Banner */}
      {isDemoMode && (
        <div className="mb-6 bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-4 rounded-xl shadow-lg">
          <div className="flex items-center justify-center">
            <SparklesIcon className="h-5 w-5 mr-2" />
            <span className="font-medium">{t('pnl.demoMode.title')}</span>
            <span className="ml-2 text-emerald-100">- {t('pnl.demoMode.description')}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <ChartBarIcon className="h-8 w-8 mr-3 text-emerald-600" />
              {t('pnl.dashboard.title')}
            </h1>
            <p className="text-gray-600 mt-2">{t('pnl.dashboard.financialPerformance')}</p>
          </div>
          {data?.hasData && (
            <PremiumPDFExport
              data={data}
              type="pnl"
              title={t('pnl.pdf.title')}
            />
          )}
        </div>
      </div>

      {/* File Upload Section */}
      {!isDemoMode ? (
        <FileUploadSection
          onFileUpload={handleUpload}
          onMappingSuccess={handleMappingSuccess}
          title={t('pnl.upload.title')}
          description={t('pnl.upload.description')}
          uploadedFileName={data?.uploadedFileName}
          isRealData={data?.hasData}
          variant="pnl"
        />
      ) : (
        <div className="mb-8 bg-emerald-50 border border-emerald-200 rounded-xl p-6">
          <div className="flex items-center">
            <SparklesIcon className="h-6 w-6 text-emerald-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-emerald-800">{t('pnl.demoMode.active')}</h3>
              <p className="text-emerald-600">{t('pnl.demoMode.uploadDisabled')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Period Comparison Selector */}
      {data?.hasData && (
        <div className="mb-6 mt-6">
          <div className="flex items-center justify-center mb-2">
            <div className="inline-flex items-center bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 p-1">
              <span className="px-3 py-2 text-sm font-medium text-gray-600 flex items-center">
                {t('pnl.comparison.compareAgainst')}
                <button
                  onClick={() => setShowComparisonHelpModal(true)}
                  className="ml-1.5 p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
                  title={t('pnl.comparison.helpTitle')}
                >
                  <QuestionMarkCircleIcon className="h-4 w-4" />
                </button>
              </span>
              <button
                onClick={() => setComparisonPeriod('month')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  comparisonPeriod === 'month'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {t('pnl.comparison.previousMonth')}
              </button>
              <button
                onClick={() => setComparisonPeriod('quarter')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  comparisonPeriod === 'quarter'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {t('pnl.comparison.previousQuarter')}
              </button>
              <button
                onClick={() => setComparisonPeriod('year')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  comparisonPeriod === 'year'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {t('pnl.comparison.sameLastYear')}
              </button>
            </div>
          </div>
          {/* Historic Data Note */}
          {comparisonPeriod === 'year' && data.chartData && data.chartData.length < 12 && (
            <div className="text-center">
              <p className="text-sm text-amber-600 bg-amber-50 px-4 py-2 rounded-lg inline-flex items-center">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                {t('pnl.comparison.noYearData')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Current Month Overview */}
      {data.currentMonth && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {data.currentMonth.month} {t('pnl.overview.title')}
                </h2>
                {/* Exchange Rate Display */}
                {settings.enableCurrencyConversion && displayCurrency !== baseCurrency && currentExchangeRate && (
                  <div className="mt-2 flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-lg max-w-md">
                    <div className="flex items-center space-x-2">
                      <CurrencyDollarIcon className="h-4 w-4 text-blue-600" />
                      <p className="text-xs text-gray-700">
                        {t('pnl.exchangeRate.label')} 
                        <span className="ml-1 font-semibold text-gray-900">
                          1 {baseCurrency} = {currentExchangeRate.toFixed(2)} {displayCurrency}
                        </span>
                      </p>
                    </div>
                    <button
                      onClick={() => setShowExchangeRateModal(true)}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                    >
                      {t('common.edit')}
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {settings.showCurrencySelector && (
                <CurrencySelector
                  currentCurrency={displayCurrency}
                  currentUnit={displayUnit}
                  onCurrencyChange={setDisplayCurrency}
                  onUnitChange={setDisplayUnit}
                  baseCurrency={baseCurrency}
                  showConversionRate={settings.enableCurrencyConversion}
                  compact={true}
                />
              )}
              <button
                onClick={() => setShowCurrentPnLHelpModal(true)}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title={t('pnl.help.understandingMetrics')}
              >
                <QuestionMarkCircleIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Revenue */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="p-1.5 bg-emerald-100 rounded-md">
                      <ArrowTrendingUpIcon className="h-4 w-4 text-emerald-600" />
                    </div>
                    {(() => {
                      const comparison = getComparisonData()
                      if (!comparison?.data) return null
                      const change = calculateChange(data.currentMonth.revenue, comparison.data.revenue)
                      return change && (
                        <div className={`flex items-center space-x-0.5 text-sm font-medium ${
                          change.isPositive ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          {change.isPositive ? (
                            <ChevronUpIcon className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDownIcon className="h-3.5 w-3.5" />
                          )}
                          <span>{Math.abs(change.percentage).toFixed(1)}%</span>
                        </div>
                      )
                    })()}
                  </div>
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{t('pnl.revenue')}</h3>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(data.currentMonth.revenue)}
                  </p>
                </div>
              </div>
            </div>

            {/* Gross Profit */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 bg-blue-100 rounded-md">
                        <CurrencyDollarIcon className="h-4 w-4 text-blue-600" />
                      </div>
                      {(() => {
                        const comparison = getComparisonData()
                        if (!comparison?.data) return null
                        const change = calculateChange(data.currentMonth.grossProfit, comparison.data.grossProfit)
                        return change && (
                          <div className={`flex items-center space-x-0.5 text-sm font-medium ${
                            change.isPositive ? 'text-emerald-600' : 'text-red-600'
                          }`}>
                            {change.isPositive ? (
                              <ChevronUpIcon className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDownIcon className="h-3.5 w-3.5" />
                            )}
                            <span>{Math.abs(change.percentage).toFixed(1)}%</span>
                          </div>
                        )
                      })()}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-blue-600">
                        {formatPercentage(data.currentMonth.grossMargin)}
                      </div>
                      <div className="text-xs text-gray-500">{t('pnl.ofSales')}</div>
                    </div>
                  </div>
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{t('pnl.grossProfit')}</h3>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(data.currentMonth.grossProfit)}
                  </p>
                </div>
              </div>
            </div>

            {/* Operating Income */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 bg-indigo-100 rounded-md">
                        <CalculatorIcon className="h-4 w-4 text-indigo-600" />
                      </div>
                      {(() => {
                        const comparison = getComparisonData()
                        if (!comparison?.data) return null
                        const change = calculateChange(data.currentMonth.operatingIncome, comparison.data.operatingIncome)
                        return change && (
                          <div className={`flex items-center space-x-0.5 text-sm font-medium ${
                            change.isPositive ? 'text-emerald-600' : 'text-red-600'
                          }`}>
                            {change.isPositive ? (
                              <ChevronUpIcon className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDownIcon className="h-3.5 w-3.5" />
                            )}
                            <span>{Math.abs(change.percentage).toFixed(1)}%</span>
                          </div>
                        )
                      })()}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-indigo-600">
                        {formatPercentage(data.currentMonth.operatingMargin)}
                      </div>
                      <div className="text-xs text-gray-500">{t('pnl.ofSales')}</div>
                    </div>
                  </div>
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{t('pnl.operatingIncome')}</h3>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(data.currentMonth.operatingIncome)}
                  </p>
                </div>
              </div>
            </div>

            {/* EBITDA */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 bg-purple-100 rounded-md">
                        <ChartBarIcon className="h-4 w-4 text-purple-600" />
                      </div>
                      {(() => {
                        const comparison = getComparisonData()
                        if (!comparison?.data) return null
                        const change = calculateChange(data.currentMonth.ebitda, comparison.data.ebitda)
                        return change && (
                          <div className={`flex items-center space-x-0.5 text-sm font-medium ${
                            change.isPositive ? 'text-emerald-600' : 'text-red-600'
                          }`}>
                            {change.isPositive ? (
                              <ChevronUpIcon className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDownIcon className="h-3.5 w-3.5" />
                            )}
                            <span>{Math.abs(change.percentage).toFixed(1)}%</span>
                          </div>
                        )
                      })()}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-purple-600">
                        {formatPercentage(data.currentMonth.ebitdaMargin)}
                      </div>
                      <div className="text-xs text-gray-500">{t('pnl.ofSales')}</div>
                    </div>
                  </div>
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{t('pnl.ebitda')}</h3>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(data.currentMonth.ebitda)}
                  </p>
                </div>
              </div>
            </div>

            {/* Net Income */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className={`p-1.5 rounded-md ${
                        data.currentMonth.netIncome >= 0 ? 'bg-emerald-100' : 'bg-red-100'
                      }`}>
                        <ScaleIcon className={`h-4 w-4 ${
                          data.currentMonth.netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'
                        }`} />
                      </div>
                      {(() => {
                        const comparison = getComparisonData()
                        if (!comparison?.data) return null
                        const change = calculateChange(data.currentMonth.netIncome, comparison.data.netIncome)
                        return change && (
                          <div className={`flex items-center space-x-0.5 text-sm font-medium ${
                            change.isPositive ? 'text-emerald-600' : 'text-red-600'
                          }`}>
                            {change.isPositive ? (
                              <ChevronUpIcon className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDownIcon className="h-3.5 w-3.5" />
                            )}
                            <span>{Math.abs(change.percentage).toFixed(1)}%</span>
                          </div>
                        )
                      })()}
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-semibold ${
                        data.currentMonth.netMargin >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {formatPercentage(data.currentMonth.netMargin)}
                      </div>
                      <div className="text-xs text-gray-500">{t('pnl.ofSales')}</div>
                    </div>
                  </div>
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{t('pnl.netIncome')}</h3>
                  <p className={`text-xl font-bold ${
                    data.currentMonth.netIncome >= 0 ? 'text-gray-900' : 'text-red-600'
                  }`}>
                    {formatCurrency(data.currentMonth.netIncome)}
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Key Insights Section */}
      {data?.hasData && <KeyInsights data={data} type="pnl" />}

      {/* Revenue Growth Analysis */}
      {data.chartData && data.chartData.length > 1 && (
        <div className="mb-8 bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{t('pnl.revenueGrowth.title')}</h3>
            <button
              onClick={() => setShowRevenueGrowthHelpModal(true)}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title={t('pnl.help.revenueGrowth')}
            >
              <QuestionMarkCircleIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Month over Month Growth */}
            <div className={`text-center p-4 rounded-xl ${
              (() => {
                const current = data.chartData[data.chartData.length - 1].revenue;
                const previous = data.chartData[data.chartData.length - 2].revenue;
                const growth = ((current - previous) / previous) * 100;
                if (growth > 5) return 'bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200';
                if (growth >= 0) return 'bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200';
                return 'bg-gradient-to-br from-red-50 to-rose-50 border border-red-200';
              })()}
            }`}>
              <p className="text-sm text-gray-600 mb-2">{t('pnl.revenueGrowth.monthOverMonth')}</p>
              <p className={`text-2xl font-bold ${
                (() => {
                  const current = data.chartData[data.chartData.length - 1].revenue;
                  const previous = data.chartData[data.chartData.length - 2].revenue;
                  const growth = ((current - previous) / previous) * 100;
                  if (growth > 5) return 'text-emerald-600';
                  if (growth >= 0) return 'text-amber-600';
                  return 'text-red-600';
                })()}
              }`}>
                {(() => {
                  const current = data.chartData[data.chartData.length - 1].revenue;
                  const previous = data.chartData[data.chartData.length - 2].revenue;
                  const growth = ((current - previous) / previous) * 100;
                  return `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`;
                })()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {t('dashboard.comparison', { previousMonth: data.chartData[data.chartData.length - 2].month })}
              </p>
            </div>
            
            {/* Average Monthly Revenue */}
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl">
              <p className="text-sm text-gray-600 mb-2">{t('pnl.revenueGrowth.averageMonthly')}</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(
                  data.chartData.reduce((sum, d) => sum + d.revenue, 0) / data.chartData.length
                )}
              </p>
            </div>
            
            {/* Revenue Trend */}
            <div className={`text-center p-4 rounded-xl ${
              (() => {
                const firstRevenue = data.chartData[0].revenue;
                const lastRevenue = data.chartData[data.chartData.length - 1].revenue;
                const totalGrowth = ((lastRevenue - firstRevenue) / firstRevenue) * 100;
                if (totalGrowth > 20) return 'bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200';
                if (totalGrowth > 0) return 'bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200';
                return 'bg-gradient-to-br from-red-50 to-rose-50 border border-red-200';
              })()}
            }`}>
              <p className="text-sm text-gray-600 mb-2">{t('pnl.revenueGrowth.trend')}</p>
              <p className={`text-2xl font-bold ${
                (() => {
                  const firstRevenue = data.chartData[0].revenue;
                  const lastRevenue = data.chartData[data.chartData.length - 1].revenue;
                  const totalGrowth = ((lastRevenue - firstRevenue) / firstRevenue) * 100;
                  if (totalGrowth > 20) return 'text-emerald-600';
                  if (totalGrowth > 0) return 'text-blue-600';
                  return 'text-red-600';
                })()}
              }`}>
                {(() => {
                  const firstRevenue = data.chartData[0].revenue;
                  const lastRevenue = data.chartData[data.chartData.length - 1].revenue;
                  const totalGrowth = ((lastRevenue - firstRevenue) / firstRevenue) * 100;
                  const arrow = totalGrowth >= 0 ? '↑' : '↓';
                  const text = totalGrowth >= 0 ? t('pnl.revenueGrowth.growing') : t('pnl.revenueGrowth.declining');
                  return `${arrow} ${Math.abs(totalGrowth).toFixed(1)}%`;
                })()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {t('pnl.revenueGrowth.vsFirstMonth', { month: data.chartData[0].month })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Personnel Cost Analysis */}
      {data.currentMonth && data.currentMonth.totalPersonnelCost && (
        <div className="mb-8 bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">{t('pnl.personnel.title')}</h3>
            <button
              onClick={() => setShowPersonnelHelpModal(true)}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title={t('pnl.help.personnelCost')}
            >
              <QuestionMarkCircleIcon className="h-5 w-5" />
            </button>
          </div>
          
          {/* Summary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl">
              <p className="text-sm text-gray-600 mb-2">{t('pnl.personnel.totalCost')}</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(data.currentMonth.totalPersonnelCost)}
              </p>
              <p className="text-sm text-indigo-600 mt-1">
                {((data.currentMonth.totalPersonnelCost / data.currentMonth.revenue) * 100).toFixed(1)}% {t('pnl.personnel.ofRevenue')}
              </p>
            </div>
            
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
              <p className="text-sm text-gray-600 mb-2">{t('pnl.personnel.efficiency')}</p>
              <p className="text-2xl font-bold text-purple-600">
                {formatCurrency(data.currentMonth.revenue / data.currentMonth.totalPersonnelCost)}
              </p>
              <p className="text-sm text-gray-500 mt-1">{t('pnl.personnel.revenuePerDollar')}</p>
            </div>
            
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl">
              <p className="text-sm text-gray-600 mb-2">{t('pnl.personnel.vsOpex')}</p>
              <p className="text-2xl font-bold text-green-600">
                {(((data.currentMonth.personnelSalariesOp || 0) + (data.currentMonth.payrollTaxesOp || 0) + (data.currentMonth.healthCoverage || 0) + (data.currentMonth.personnelBenefits || 0)) / data.currentMonth.operatingExpenses * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-gray-500 mt-1">{t('pnl.personnel.ofOperatingExpenses')}</p>
            </div>
          </div>
          
          {/* Detailed Breakdown */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-700">{t('pnl.personnel.costBreakdown')}</h4>
              <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                {t('pnl.personnel.totalFormula')}
              </div>
            </div>
            
            <div className="space-y-2">
              {/* Salaries */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors">
                <span className="text-sm text-gray-600">{t('pnl.personnel.totalSalaries')}</span>
                <div className="text-right relative">
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency((data.currentMonth.personnelSalariesCoR || 0) + (data.currentMonth.personnelSalariesOp || 0))}
                  </span>
                  <span className="text-xs text-gray-500 ml-2 cursor-help border-b border-dotted border-gray-400">
                    ({(((data.currentMonth.personnelSalariesCoR || 0) + (data.currentMonth.personnelSalariesOp || 0)) / data.currentMonth.totalPersonnelCost * 100).toFixed(1)}%)
                  </span>
                  <div className="absolute right-0 bottom-full mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                    {t('pnl.personnel.percentageOfTotal')}
                    <div className="absolute bottom-0 right-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
                  </div>
                </div>
              </div>
              
              {/* Payroll Taxes */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors">
                <span className="text-sm text-gray-600">{t('pnl.personnel.payrollTaxes')}</span>
                <div className="text-right relative">
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency((data.currentMonth.payrollTaxesCoR || 0) + (data.currentMonth.payrollTaxesOp || 0))}
                  </span>
                  <span className="text-xs text-gray-500 ml-2 cursor-help border-b border-dotted border-gray-400">
                    ({(((data.currentMonth.payrollTaxesCoR || 0) + (data.currentMonth.payrollTaxesOp || 0)) / data.currentMonth.totalPersonnelCost * 100).toFixed(1)}%)
                  </span>
                  <div className="absolute right-0 bottom-full mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                    {t('pnl.personnel.percentageOfTotal')}
                    <div className="absolute bottom-0 right-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
                  </div>
                </div>
              </div>
              
              {/* Health & Benefits */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors">
                <span className="text-sm text-gray-600">{t('pnl.personnel.healthBenefits')}</span>
                <div className="text-right relative">
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency((data.currentMonth.healthCoverage || 0) + (data.currentMonth.personnelBenefits || 0))}
                  </span>
                  <span className="text-xs text-gray-500 ml-2 cursor-help border-b border-dotted border-gray-400">
                    ({(((data.currentMonth.healthCoverage || 0) + (data.currentMonth.personnelBenefits || 0)) / data.currentMonth.totalPersonnelCost * 100).toFixed(1)}%)
                  </span>
                  <div className="absolute right-0 bottom-full mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                    {t('pnl.personnel.percentageOfTotal')}
                    <div className="absolute bottom-0 right-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Total verification */}
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">{t('pnl.personnel.totalCost')}</span>
                <div className="text-right">
                  <span className="text-sm font-bold text-blue-900">
                    {formatCurrency(data.currentMonth.totalPersonnelCost)}
                  </span>
                  <span className="text-xs text-blue-700 ml-2">
                    (100%)
                  </span>
                </div>
              </div>
            </div>
            
            {/* CoR vs Operating Split */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-3">{t('pnl.personnel.allocation')}</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-gray-600">{t('pnl.personnel.costOfRevenue')}</p>
                  <p className="text-lg font-semibold text-blue-600">
                    {(((data.currentMonth.personnelSalariesCoR || 0) + (data.currentMonth.payrollTaxesCoR || 0)) / data.currentMonth.totalPersonnelCost * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-xs text-gray-600">{t('pnl.operatingExpenses')}</p>
                  <p className="text-lg font-semibold text-purple-600">
                    {(((data.currentMonth.personnelSalariesOp || 0) + (data.currentMonth.payrollTaxesOp || 0) + (data.currentMonth.healthCoverage || 0) + (data.currentMonth.personnelBenefits || 0)) / data.currentMonth.totalPersonnelCost * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cost Structure Visualization */}
      {data.currentMonth && (
        <div className="mb-8 bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('pnl.costStructure.title')}</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cost Categories Breakdown */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-4">{t('pnl.costStructure.majorCategories')}</h4>
              <div className="space-y-3">
                {/* Personnel Costs */}
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-600">{t('pnl.costStructure.personnelCosts')}</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(data.currentMonth.totalPersonnelCost || 0)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-6">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-6 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${((data.currentMonth.totalPersonnelCost || 0) / (data.currentMonth.cogs + data.currentMonth.operatingExpenses)) * 100}%` }}
                    >
                      <span className="text-xs text-white font-medium">
                        {(((data.currentMonth.totalPersonnelCost || 0) / (data.currentMonth.cogs + data.currentMonth.operatingExpenses)) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Contract Services */}
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-600">{t('pnl.costStructure.contractServices')}</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency((data.currentMonth.contractServicesCoR || 0) + (data.currentMonth.contractServicesOp || 0))}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-6">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-green-600 h-6 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${(((data.currentMonth.contractServicesCoR || 0) + (data.currentMonth.contractServicesOp || 0)) / (data.currentMonth.cogs + data.currentMonth.operatingExpenses)) * 100}%` }}
                    >
                      <span className="text-xs text-white font-medium">
                        {((((data.currentMonth.contractServicesCoR || 0) + (data.currentMonth.contractServicesOp || 0)) / (data.currentMonth.cogs + data.currentMonth.operatingExpenses)) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Other Costs */}
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-600">{t('pnl.costStructure.otherCosts')}</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(
                        data.currentMonth.cogs + data.currentMonth.operatingExpenses - 
                        (data.currentMonth.totalPersonnelCost || 0) - 
                        ((data.currentMonth.contractServicesCoR || 0) + (data.currentMonth.contractServicesOp || 0))
                      )}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-6">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-purple-600 h-6 rounded-full flex items-center justify-end pr-2"
                      style={{ 
                        width: `${((data.currentMonth.cogs + data.currentMonth.operatingExpenses - 
                                   (data.currentMonth.totalPersonnelCost || 0) - 
                                   ((data.currentMonth.contractServicesCoR || 0) + (data.currentMonth.contractServicesOp || 0))) / 
                                   (data.currentMonth.cogs + data.currentMonth.operatingExpenses)) * 100}%` 
                      }}
                    >
                      <span className="text-xs text-white font-medium">
                        {(((data.currentMonth.cogs + data.currentMonth.operatingExpenses - 
                           (data.currentMonth.totalPersonnelCost || 0) - 
                           ((data.currentMonth.contractServicesCoR || 0) + (data.currentMonth.contractServicesOp || 0))) / 
                           (data.currentMonth.cogs + data.currentMonth.operatingExpenses)) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Cost Efficiency Metrics */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium text-gray-700">{t('pnl.costEfficiency.title')}</h4>
                <button
                  onClick={() => setShowCostEfficiencyHelpModal(true)}
                  className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title={t('pnl.help.costEfficiency')}
                >
                  <QuestionMarkCircleIcon className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-gradient-to-br from-orange-50 to-red-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">{t('pnl.costEfficiency.corPercent')}</p>
                  <p className="text-xl font-bold text-orange-600">
                    {((data.currentMonth.cogs / data.currentMonth.revenue) * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="text-center p-3 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">{t('pnl.costEfficiency.opexPercent')}</p>
                  <p className="text-xl font-bold text-yellow-600">
                    {((data.currentMonth.operatingExpenses / data.currentMonth.revenue) * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="text-center p-3 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">{t('pnl.costEfficiency.totalCostPercent')}</p>
                  <p className="text-xl font-bold text-teal-600">
                    {(((data.currentMonth.cogs + data.currentMonth.operatingExpenses) / data.currentMonth.revenue) * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="text-center p-3 bg-gradient-to-br from-pink-50 to-rose-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">{t('pnl.costEfficiency.costPerRevenue')}</p>
                  <p className="text-xl font-bold text-pink-600">
                    {(((data.currentMonth.cogs + data.currentMonth.operatingExpenses) / data.currentMonth.revenue)).toFixed(2)}
                  </p>
                </div>
              </div>
              
              {/* Additional Insights */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h5 className="text-xs font-medium text-gray-700 mb-2">{t('pnl.keyInsights')}</h5>
                <ul className="space-y-1 text-xs text-gray-600">
                  <li>• {t('pnl.insights.personnelCosts', { percentage: (((data.currentMonth.totalPersonnelCost || 0) / data.currentMonth.revenue) * 100).toFixed(1) })}</li>
                  <li>• {t('pnl.insights.contractServices', { percentage: ((((data.currentMonth.contractServicesCoR || 0) + (data.currentMonth.contractServicesOp || 0)) / data.currentMonth.revenue) * 100).toFixed(1) })}</li>
                  <li>• {t('pnl.insights.totalCostStructure', { percentage: ((data.currentMonth.cogs + data.currentMonth.operatingExpenses) / data.currentMonth.revenue * 100).toFixed(1) })}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performance Overview Section */}
      {data.chartData && data.chartData.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">{t('pnl.performance.title')}</h2>
            <button
              onClick={() => setShowPerformanceHelpModal(true)}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title={t('pnl.help.performanceHeatMaps')}
            >
              <QuestionMarkCircleIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PerformanceHeatMap 
              data={data}
              metric="revenue"
              title={t('pnl.performance.monthlyRevenue')}
              type="pnl"
            />
            <PerformanceHeatMap 
              data={data}
              metric="margin"
              title={t('pnl.performance.monthlyNetMargin')}
              type="pnl"
            />
          </div>
        </div>
      )}

      {/* Trend Analysis & Forecasts Section */}
      {data.chartData && data.chartData.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">{t('pnl.trends.title')}</h2>
            <button
              onClick={() => setShowTrendForecastHelpModal(true)}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title={t('pnl.help.trendForecasts')}
            >
              <QuestionMarkCircleIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TrendForecastChart
              data={data}
              metric="revenue"
              title={t('pnl.trends.revenueForecast')}
              type="pnl"
              forecastMonths={6}
            />
            <TrendForecastChart
              data={data}
              metric="profit"
              title={t('pnl.trends.netIncomeForecast')}
              type="pnl"
              forecastMonths={6}
            />
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Margins Chart */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{t('pnl.charts.profitMarginsTrend')}</h3>
            <button
              onClick={() => setShowMarginsChartHelpModal(true)}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title={t('pnl.help.profitMarginsChart')}
            >
              <QuestionMarkCircleIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="h-64">
            {getMarginChartData() && (
              <Line data={getMarginChartData()!} options={chartOptions} />
            )}
          </div>
        </div>

        {/* Revenue Breakdown */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{t('pnl.charts.revenueProfitability')}</h3>
            <button
              onClick={() => setShowRevenueChartHelpModal(true)}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title={t('pnl.help.revenueProfitabilityChart')}
            >
              <QuestionMarkCircleIcon className="h-5 w-5" />
            </button>
          </div>
          {/* Traffic Light Legend */}
          <div className="flex items-center justify-center space-x-4 mb-3 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-gray-600">{t('pnl.charts.growthHigh')}</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span className="text-gray-600">{t('pnl.charts.growthMedium')}</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span className="text-gray-600">{t('pnl.charts.growthNegative')}</span>
            </div>
          </div>
          <div className="h-64">
            {getRevenueChartData() && (
              <Bar data={getRevenueChartData()!} options={chartOptions} />
            )}
          </div>
        </div>
      </div>

      {/* Year to Date Summary */}
      {data.summary && (
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-gray-900">{t('pnl.ytd.title')}</h3>
              {!hasYearOverYearData() && (
                <p className="text-sm text-amber-600 mt-1">
                  {t('pnl.ytd.uploadMoreData')}
                </p>
              )}
            </div>
            <button
              onClick={() => setShowYTDSummaryHelpModal(true)}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title={t('pnl.help.ytdSummary')}
            >
              <QuestionMarkCircleIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {/* Revenue */}
            <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl relative">
              <p className="text-sm font-medium text-green-600 mb-2">{t('pnl.ytd.totalRevenue')}</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(data.summary.totalRevenue)}
              </p>
              {hasYearOverYearData() && (() => {
                const ytdComparison = getYearToDateComparison()
                if (!ytdComparison) return null
                const change = calculateChange(ytdComparison.currentYTD.revenue, ytdComparison.previousYTD.revenue)
                return change && (
                  <div className={`mt-2 text-sm font-medium ${
                    change.isPositive ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {change.isPositive ? '↑' : '↓'} {Math.abs(change.percentage).toFixed(1)}% {t('pnl.ytd.vsLastYear')}
                  </div>
                )
              })()}
            </div>
            
            {/* Gross Profit */}
            <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
              <p className="text-sm font-medium text-blue-600 mb-2">{t('pnl.grossProfit')}</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(data.summary.totalGrossProfit)}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {formatPercentage(data.summary.avgGrossMargin)} {t('pnl.margin')}
              </p>
              {hasYearOverYearData() && (() => {
                const ytdComparison = getYearToDateComparison()
                if (!ytdComparison) return null
                const change = calculateChange(ytdComparison.currentYTD.grossProfit, ytdComparison.previousYTD.grossProfit)
                return change && (
                  <div className={`mt-2 text-sm font-medium ${
                    change.isPositive ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {change.isPositive ? '↑' : '↓'} {Math.abs(change.percentage).toFixed(1)}% {t('pnl.ytd.vsLastYear')}
                  </div>
                )
              })()}
            </div>
            
            {/* Operating Income */}
            <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
              <p className="text-sm font-medium text-purple-600 mb-2">{t('pnl.operatingIncome')}</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(data.summary.totalOperatingIncome)}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {formatPercentage(data.summary.avgOperatingMargin)} {t('pnl.margin')}
              </p>
              {hasYearOverYearData() && (() => {
                const ytdComparison = getYearToDateComparison()
                if (!ytdComparison) return null
                const change = calculateChange(ytdComparison.currentYTD.operatingIncome, ytdComparison.previousYTD.operatingIncome)
                return change && (
                  <div className={`mt-2 text-sm font-medium ${
                    change.isPositive ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {change.isPositive ? '↑' : '↓'} {Math.abs(change.percentage).toFixed(1)}% {t('pnl.ytd.vsLastYear')}
                  </div>
                )
              })()}
            </div>
            
            {/* EBITDA */}
            <div className="text-center p-6 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl">
              <p className="text-sm font-medium text-indigo-600 mb-2">{t('pnl.ytd.totalEbitda')}</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(data.yearToDate?.ebitda || data.summary.totalEBITDA || 0)}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {formatPercentage(data.summary.avgEBITDAMargin || ((data.yearToDate?.ebitda || 0) / data.summary.totalRevenue * 100))} {t('pnl.margin')}
              </p>
            </div>
            
            {/* Net Income */}
            <div className={`text-center p-6 rounded-xl ${
              data.summary.totalNetIncome >= 0 
                ? 'bg-gradient-to-br from-emerald-50 to-green-50' 
                : 'bg-gradient-to-br from-red-50 to-pink-50'
            }`}>
              <p className={`text-sm font-medium mb-2 ${
                data.summary.totalNetIncome >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}>{t('pnl.netIncome')}</p>
              <p className={`text-2xl font-bold ${
                data.summary.totalNetIncome >= 0 ? 'text-gray-900' : 'text-red-600'
              }`}>
                {formatCurrency(data.summary.totalNetIncome)}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {formatPercentage(data.summary.avgNetMargin)} {t('pnl.margin')}
              </p>
              {hasYearOverYearData() && (() => {
                const ytdComparison = getYearToDateComparison()
                if (!ytdComparison) return null
                const change = calculateChange(ytdComparison.currentYTD.netIncome, ytdComparison.previousYTD.netIncome)
                return change && (
                  <div className={`mt-2 text-sm font-medium ${
                    change.isPositive ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {change.isPositive ? '↑' : '↓'} {Math.abs(change.percentage).toFixed(1)}% {t('pnl.ytd.vsLastYear')}
                  </div>
                )
              })()}
            </div>
          </div>
          
          {/* Additional Metrics Row */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-600">{t('pnl.ytd.totalCogs')}</p>
              <p className="text-xl font-semibold text-gray-900">
                {formatCurrency(data.summary.totalCOGS)}
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-600">{t('pnl.ytd.totalOpex')}</p>
              <p className="text-xl font-semibold text-gray-900">
                {formatCurrency(data.summary.totalOperatingExpenses)}
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-600">{t('pnl.ytd.opexPercentage')}</p>
              <p className="text-xl font-semibold text-gray-900">
                {formatPercentage((data.summary.totalOperatingExpenses / data.summary.totalRevenue) * 100)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Personnel Cost Analysis Help Modal */}
      {showPersonnelHelpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">{t('pnl.help.personnel.title')}</h2>
              <button
                onClick={() => setShowPersonnelHelpModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">👥 {t('pnl.help.personnel.whatIs')}</h3>
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700 mb-2">
                    {t('pnl.help.personnel.description')}
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 ml-2">
                    <li>{t('pnl.help.personnel.point1')}</li>
                    <li>{t('pnl.help.personnel.point2')}</li>
                    <li>{t('pnl.help.personnel.point3')}</li>
                    <li>{t('pnl.help.personnel.point4')}</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 {t('pnl.help.personnel.currentMetrics')}</h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-600">{t('pnl.personnel.totalCost')}</p>
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(data?.currentMonth?.totalPersonnelCost || 0)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">{t('pnl.help.personnel.percentOfRevenue')}</p>
                      <p className="text-sm font-semibold text-indigo-600">
                        {((data?.currentMonth?.totalPersonnelCost || 0) / (data?.currentMonth?.revenue || 1) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      {t('pnl.help.personnel.includesText')}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 {t('pnl.help.personnel.keyMetrics')}</h3>
                <div className="space-y-3">
                  <div className="border-l-4 border-indigo-500 pl-4">
                    <h4 className="text-sm font-semibold text-gray-900">{t('pnl.personnel.totalCost')}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {t('pnl.help.personnel.totalCostDesc')}
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-purple-500 pl-4">
                    <h4 className="text-sm font-semibold text-gray-900">{t('pnl.personnel.efficiency')}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {t('pnl.help.personnel.efficiencyDesc')}
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-green-500 pl-4">
                    <h4 className="text-sm font-semibold text-gray-900">{t('pnl.personnel.vsOpex')}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {t('pnl.help.personnel.vsOpexDesc')}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📋 {t('pnl.help.personnel.costBreakdownComponents')}</h3>
                <div className="bg-yellow-50 rounded-xl p-4">
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start">
                      <span className="text-gray-500 mr-2">•</span>
                      <div>
                        <strong>{t('pnl.help.personnel.salaries')}</strong> {t('pnl.help.personnel.salariesDesc')}
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-gray-500 mr-2">•</span>
                      <div>
                        <strong>{t('pnl.help.personnel.payrollTaxes')}</strong> {t('pnl.help.personnel.payrollTaxesDesc')}
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-gray-500 mr-2">•</span>
                      <div>
                        <strong>{t('pnl.help.personnel.healthCoverage')}</strong> {t('pnl.help.personnel.healthCoverageDesc')}
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-gray-500 mr-2">•</span>
                      <div>
                        <strong>{t('pnl.help.personnel.benefits')}</strong> {t('pnl.help.personnel.benefitsDesc')}
                      </div>
                    </li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">🎯 {t('pnl.help.personnel.personnelAllocation')}</h3>
                <div className="bg-purple-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700 mb-3">
                    {t('pnl.help.personnel.understandingAllocation')}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className="text-xs text-gray-600">{t('pnl.help.personnel.costOfRevenue')}</p>
                      <p className="text-sm font-medium text-blue-600">{t('pnl.help.personnel.directProduction')}</p>
                      <p className="text-xs text-gray-500 mt-1">{t('pnl.help.personnel.staffGeneratingRevenue')}</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className="text-xs text-gray-600">{t('pnl.help.personnel.operatingExpenses')}</p>
                      <p className="text-sm font-medium text-purple-600">{t('pnl.help.personnel.supportFunctions')}</p>
                      <p className="text-xs text-gray-500 mt-1">{t('pnl.help.personnel.adminSalesManagement')}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">⚡ {t('pnl.help.personnel.optimizationTips')}</h3>
                <div className="bg-green-50 rounded-xl p-4 space-y-2">
                  <p className="text-sm text-gray-700 font-medium">{t('pnl.help.personnel.waysToImprove')}</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 ml-2">
                    <li>{t('pnl.help.personnel.trackRevenuePerEmployee')}</li>
                    <li>{t('pnl.help.personnel.compareIndustryBenchmarks')}</li>
                    <li>{t('pnl.help.personnel.analyzeProductivityMetrics')}</li>
                    <li>{t('pnl.help.personnel.considerAutomation')}</li>
                    <li>{t('pnl.help.personnel.investInTraining')}</li>
                    <li>{t('pnl.help.personnel.reviewBenefitCosts')}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cost Efficiency Metrics Help Modal */}
      {showCostEfficiencyHelpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">{t('pnl.help.costEfficiency.title')}</h2>
              <button
                onClick={() => setShowCostEfficiencyHelpModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📈 {t('pnl.help.costEfficiency.whatAre')}</h3>
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700 mb-2">
                    {t('pnl.help.costEfficiency.description')}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    {t('pnl.help.costEfficiency.lowerBetter')}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 {t('pnl.help.costEfficiency.currentMetrics')}</h3>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className="text-xs text-gray-600">Cost of Revenue %</p>
                      <p className="text-lg font-bold text-orange-600">
                        {((data?.currentMonth?.cogs || 0) / (data?.currentMonth?.revenue || 1) * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className="text-xs text-gray-600">Operating Expense %</p>
                      <p className="text-lg font-bold text-yellow-600">
                        {((data?.currentMonth?.operatingExpenses || 0) / (data?.currentMonth?.revenue || 1) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-3 text-center">
                    Total costs are {(((data?.currentMonth?.cogs || 0) + (data?.currentMonth?.operatingExpenses || 0)) / (data?.currentMonth?.revenue || 1) * 100).toFixed(1)}% of revenue
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">🎯 Metrics Explained</h3>
                <div className="space-y-3">
                  <div className="border-l-4 border-orange-500 pl-4">
                    <h4 className="text-sm font-semibold text-gray-900">Cost of Revenue % (CoR%)</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Direct costs to produce your product/service as % of revenue.
                      Lower is better. Industry benchmarks:
                    </p>
                    <ul className="text-xs text-gray-500 mt-1 ml-4">
                      <li>• Software: 20-30%</li>
                      <li>• Services: 50-70%</li>
                      <li>• Manufacturing: 60-80%</li>
                    </ul>
                  </div>
                  
                  <div className="border-l-4 border-yellow-500 pl-4">
                    <h4 className="text-sm font-semibold text-gray-900">Operating Expense % (OpEx%)</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Overhead costs (sales, admin, R&D) as % of revenue.
                      Includes all expenses not directly tied to production.
                      Target: 20-40% for healthy companies.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-teal-500 pl-4">
                    <h4 className="text-sm font-semibold text-gray-900">Total Cost %</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Combined CoR + OpEx as % of revenue.
                      This determines your profit margin: 100% - Total Cost % = Net Margin
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-pink-500 pl-4">
                    <h4 className="text-sm font-semibold text-gray-900">Cost per Revenue ARS</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      How much you spend to generate 1 ARS of revenue.
                      Formula: Total Costs ÷ Revenue. Must be &lt;1 to be profitable.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 Benchmarking Your Efficiency</h3>
                <div className="bg-yellow-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700 mb-3">
                    How do your metrics compare?
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Excellent Efficiency:</span>
                      <span className="font-medium text-green-600">Total Cost &lt;70%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Good Efficiency:</span>
                      <span className="font-medium text-blue-600">Total Cost 70-85%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Needs Improvement:</span>
                      <span className="font-medium text-orange-600">Total Cost 85-95%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Critical:</span>
                      <span className="font-medium text-red-600">Total Cost &gt;95%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">🚀 Improving Cost Efficiency</h3>
                <div className="bg-green-50 rounded-xl p-4 space-y-2">
                  <p className="text-sm text-gray-700 font-medium">Strategies to reduce cost ratios:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-1">Reduce CoR%:</p>
                      <ul className="text-xs text-gray-600 space-y-1">
                        <li>• Negotiate better supplier rates</li>
                        <li>• Improve production efficiency</li>
                        <li>• Reduce waste and rework</li>
                        <li>• Automate repetitive tasks</li>
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-1">Reduce OpEx%:</p>
                      <ul className="text-xs text-gray-600 space-y-1">
                        <li>• Optimize marketing spend</li>
                        <li>• Reduce administrative overhead</li>
                        <li>• Renegotiate fixed costs</li>
                        <li>• Improve sales efficiency</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">⚡ Quick Insights</h3>
                <div className="bg-purple-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700 mb-2">Based on your current data:</p>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Your cost per revenue ARS is {(((data?.currentMonth?.cogs || 0) + (data?.currentMonth?.operatingExpenses || 0)) / (data?.currentMonth?.revenue || 1)).toFixed(2)}</li>
                    <li>• You keep {(100 - ((data?.currentMonth?.cogs || 0) + (data?.currentMonth?.operatingExpenses || 0)) / (data?.currentMonth?.revenue || 1) * 100).toFixed(1)}% of each revenue ARS as gross profit</li>
                    <li>• {data?.currentMonth?.netMargin || 0 > 0 ? 'You are profitable' : 'You are not yet profitable'} with a {Math.abs(data?.currentMonth?.netMargin || 0).toFixed(1)}% net margin</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Growth Analysis Help Modal */}
      {showRevenueGrowthHelpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">{t('pnl.help.revenueGrowth.title')}</h2>
              <button
                onClick={() => setShowRevenueGrowthHelpModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📈 What is Revenue Growth Analysis?</h3>
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700 mb-2">
                    Revenue growth analysis tracks how your company's income is changing over time. 
                    It helps identify trends, seasonal patterns, and business momentum.
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    Consistent growth indicates a healthy business, while declining trends may signal market challenges.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 Your Current Growth Metrics</h3>
                <div className="bg-gray-50 rounded-xl p-4">
                  {data?.chartData && data.chartData.length > 1 && (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-white rounded-lg">
                        <p className="text-xs text-gray-600">MoM Growth</p>
                        <p className={`text-lg font-bold ${
                          data.chartData[data.chartData.length - 1].revenue > data.chartData[data.chartData.length - 2].revenue
                            ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {(() => {
                            const current = data.chartData[data.chartData.length - 1].revenue;
                            const previous = data.chartData[data.chartData.length - 2].revenue;
                            const growth = ((current - previous) / previous) * 100;
                            return `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`;
                          })()}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg">
                        <p className="text-xs text-gray-600">Avg Revenue</p>
                        <p className="text-sm font-bold text-gray-900">
                          {formatCurrency(data.chartData.reduce((sum, d) => sum + d.revenue, 0) / data.chartData.length)}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg">
                        <p className="text-xs text-gray-600">Trend</p>
                        <p className="text-sm font-bold text-purple-600">
                          {data.chartData[data.chartData.length - 1].revenue > data.chartData[0].revenue ? '↑ Growing' : '↓ Declining'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">🎯 {t('pnl.help.revenueGrowth.growthMetricsExplained')}</h3>
                <div className="space-y-3">
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="text-sm font-semibold text-gray-900">{t('pnl.revenueGrowth.monthOverMonth')}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {t('pnl.help.revenueGrowth.monthOverMonthGrowthDesc')}
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-green-500 pl-4">
                    <h4 className="text-sm font-semibold text-gray-900">{t('pnl.revenueGrowth.averageMonthly')}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {t('pnl.help.revenueGrowth.averageMonthlyRevenueDesc')}
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-purple-500 pl-4">
                    <h4 className="text-sm font-semibold text-gray-900">{t('pnl.revenueGrowth.trend')}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {t('pnl.help.revenueGrowth.revenueTrendDesc')}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 {t('pnl.help.revenueGrowth.growthBenchmarks')}</h3>
                <div className="bg-yellow-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700 mb-3">{t('pnl.help.revenueGrowth.howDoesYourGrowthCompare')}</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">{t('pnl.help.revenueGrowth.excellentGrowth')}</span>
                      <span className="font-medium text-green-600">{t('pnl.help.revenueGrowth.excellentGrowthRange')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">{t('pnl.help.revenueGrowth.goodGrowth')}</span>
                      <span className="font-medium text-blue-600">{t('pnl.help.revenueGrowth.goodGrowthRange')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">{t('pnl.help.revenueGrowth.stable')}</span>
                      <span className="font-medium text-gray-600">{t('pnl.help.revenueGrowth.stableRange')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">{t('pnl.help.revenueGrowth.declining')}</span>
                      <span className="font-medium text-red-600">{t('pnl.help.revenueGrowth.decliningRange')}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">🚀 {t('pnl.help.revenueGrowth.growthStrategies')}</h3>
                <div className="bg-green-50 rounded-xl p-4 space-y-2">
                  <p className="text-sm text-gray-700 font-medium">{t('pnl.help.revenueGrowth.waysToAccelerateGrowth')}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-1">{t('pnl.help.revenueGrowth.customerAcquisition')}</p>
                      <ul className="text-xs text-gray-600 space-y-1">
                        <li>• {t('pnl.help.revenueGrowth.improveMarketingCampaigns')}</li>
                        <li>• {t('pnl.help.revenueGrowth.expandToNewMarkets')}</li>
                        <li>• {t('pnl.help.revenueGrowth.enhanceProductOfferings')}</li>
                        <li>• {t('pnl.help.revenueGrowth.referralPrograms')}</li>
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-1">{t('pnl.help.revenueGrowth.customerRetention')}</p>
                      <ul className="text-xs text-gray-600 space-y-1">
                        <li>• {t('pnl.help.revenueGrowth.upsellExistingCustomers')}</li>
                        <li>• {t('pnl.help.revenueGrowth.improveCustomerService')}</li>
                        <li>• {t('pnl.help.revenueGrowth.loyaltyPrograms')}</li>
                        <li>• {t('pnl.help.revenueGrowth.regularValueDelivery')}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📈 {t('pnl.help.revenueGrowth.readingGrowthPatterns')}</h3>
                <div className="bg-purple-50 rounded-xl p-4">
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">•</span>
                      <span><strong>{t('pnl.help.revenueGrowth.consistentGrowth')}</strong> {t('pnl.help.revenueGrowth.consistentGrowthDesc')}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span><strong>{t('pnl.help.revenueGrowth.seasonalPatterns')}</strong> {t('pnl.help.revenueGrowth.seasonalPatternsDesc')}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-orange-500 mr-2">•</span>
                      <span><strong>{t('pnl.help.revenueGrowth.volatility')}</strong> {t('pnl.help.revenueGrowth.volatilityDesc')}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-red-500 mr-2">•</span>
                      <span><strong>{t('pnl.help.revenueGrowth.decliningTrend')}</strong> {t('pnl.help.revenueGrowth.decliningTrendDesc')}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Year to Date Summary Help Modal */}
      {showYTDSummaryHelpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Understanding Year to Date Summary</h2>
              <button
                onClick={() => setShowYTDSummaryHelpModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📅 What is Year to Date (YTD)?</h3>
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700 mb-2">
                    Year to Date shows your company's cumulative financial performance from the beginning 
                    of the current year up to the current date.
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    YTD metrics help compare performance against annual goals and previous years.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 Your YTD Performance</h3>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className="text-xs text-gray-600">Total Revenue</p>
                      <p className="text-sm font-bold text-green-600">{formatCurrency(data?.summary?.totalRevenue || 0)}</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className="text-xs text-gray-600">Net Income</p>
                      <p className={`text-sm font-bold ${(data?.summary?.totalNetIncome || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(data?.summary?.totalNetIncome || 0)}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-3 text-center">
                    Net margin: {formatPercentage(data?.summary?.avgNetMargin || 0)}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">💰 Key Financial Metrics</h3>
                <div className="space-y-3">
                  <div className="border-l-4 border-green-500 pl-4">
                    <h4 className="text-sm font-semibold text-gray-900">Total Revenue</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      All income generated from business operations year to date.
                      This is your top-line growth indicator.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="text-sm font-semibold text-gray-900">Gross Profit</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Revenue minus direct costs of goods/services sold.
                      Shows efficiency in core business operations.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-purple-500 pl-4">
                    <h4 className="text-sm font-semibold text-gray-900">Operating Income</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Profit from core business after all operating expenses.
                      Measures operational efficiency and management effectiveness.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-indigo-500 pl-4">
                    <h4 className="text-sm font-semibold text-gray-900">EBITDA</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Earnings before Interest, Taxes, Depreciation, and Amortization.
                      Measures cash generation from operations, useful for company comparisons.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-emerald-500 pl-4">
                    <h4 className="text-sm font-semibold text-gray-900">Net Income</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Final profit after all expenses, taxes, and interest.
                      The bottom line that shows overall company profitability.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📈 Understanding Margins</h3>
                <div className="bg-yellow-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700 mb-3">Margins show profitability as a percentage of revenue:</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Gross Margin:</span>
                      <span className="font-medium text-blue-600">{formatPercentage(data?.summary?.avgGrossMargin || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Operating Margin:</span>
                      <span className="font-medium text-purple-600">{formatPercentage(data?.summary?.avgOperatingMargin || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Net Margin:</span>
                      <span className={`font-medium ${(data?.summary?.avgNetMargin || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercentage(data?.summary?.avgNetMargin || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">🎯 Industry Benchmarks</h3>
                <div className="bg-purple-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700 mb-3">Typical margin ranges by industry:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-2">Software/SaaS:</p>
                      <ul className="text-xs text-gray-600 space-y-1">
                        <li>• Gross: 70-85%</li>
                        <li>• Operating: 10-25%</li>
                        <li>• Net: 15-25%</li>
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-2">Services:</p>
                      <ul className="text-xs text-gray-600 space-y-1">
                        <li>• Gross: 50-70%</li>
                        <li>• Operating: 5-15%</li>
                        <li>• Net: 8-15%</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 Using YTD for Planning</h3>
                <div className="bg-green-50 rounded-xl p-4 space-y-2">
                  <p className="text-sm text-gray-700 font-medium">YTD helps with:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 ml-2">
                    <li>Tracking progress toward annual goals</li>
                    <li>Comparing performance to previous years</li>
                    <li>Identifying seasonal trends and patterns</li>
                    <li>Making mid-year strategy adjustments</li>
                    <li>Preparing financial forecasts for remainder of year</li>
                    <li>Evaluating team and department performance</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">⚡ Quick Insights</h3>
                <div className="bg-indigo-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700 mb-2">Based on your YTD performance:</p>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Monthly average revenue: {data?.summary && formatCurrency((data.summary.totalRevenue || 0) / (data?.chartData?.length || 1))}</li>
                    <li>• Your business is {(data?.summary?.avgNetMargin || 0) > 0 ? 'profitable' : 'not yet profitable'}</li>
                    <li>• Operating efficiency: {formatPercentage(100 - ((data?.summary?.totalOperatingExpenses || 0) / (data?.summary?.totalRevenue || 1) * 100))} of revenue retained</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Current P&L Help Modal */}
      {showCurrentPnLHelpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Understanding P&L Overview Metrics</h2>
              <button
                onClick={() => setShowCurrentPnLHelpModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 P&L Overview</h3>
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700 mb-2">
                    Profit & Loss metrics show your business profitability for {data?.currentMonth?.month || 'the current month'}. 
                    These are the core financial indicators that measure business performance.
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    Each metric tells a different part of your financial story, from top-line revenue to bottom-line profit.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">💰 Your Current P&L</h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-600">Revenue</p>
                      <p className="text-sm font-semibold text-emerald-600">{formatCurrency(data?.currentMonth?.revenue || 0)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Gross Profit</p>
                      <p className="text-sm font-semibold text-blue-600">{formatCurrency(data?.currentMonth?.grossProfit || 0)}</p>
                      <p className="text-xs text-gray-500">{formatPercentage(data?.currentMonth?.grossMargin || 0)} margin</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200">
                    <div>
                      <p className="text-xs text-gray-600">Operating Income</p>
                      <p className="text-sm font-semibold text-indigo-600">{formatCurrency(data?.currentMonth?.operatingIncome || 0)}</p>
                      <p className="text-xs text-gray-500">{formatPercentage(data?.currentMonth?.operatingMargin || 0)} margin</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Net Income</p>
                      <p className={`text-sm font-semibold ${(data?.currentMonth?.netIncome || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(data?.currentMonth?.netIncome || 0)}
                      </p>
                      <p className="text-xs text-gray-500">{formatPercentage(data?.currentMonth?.netMargin || 0)} margin</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">🎯 Metrics Explained</h3>
                <div className="space-y-3">
                  <div className="border-l-4 border-emerald-500 pl-4">
                    <h4 className="text-sm font-semibold text-gray-900">Revenue</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Total income from sales and services. This is your "top line" - the starting point 
                      for all profitability calculations.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="text-sm font-semibold text-gray-900">Gross Profit</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Revenue minus direct costs (COGS). Shows how efficiently you produce your product/service.
                      Formula: Revenue - Cost of Goods Sold
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-indigo-500 pl-4">
                    <h4 className="text-sm font-semibold text-gray-900">Operating Income</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Gross profit minus operating expenses (admin, sales, marketing). 
                      Shows profit from core business operations before interest and taxes.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-violet-500 pl-4">
                    <h4 className="text-sm font-semibold text-gray-900">EBITDA</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Earnings before Interest, Taxes, Depreciation, and Amortization. 
                      Measures cash generation from operations, useful for company comparisons.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-gray-500 pl-4">
                    <h4 className="text-sm font-semibold text-gray-900">Net Income</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      The "bottom line" - final profit after all expenses, taxes, and interest. 
                      This is what's left for shareholders or reinvestment.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 {t('pnl.help.costEfficiency.strategicUse.title')}</h3>
                <div className="bg-green-50 rounded-xl p-4 space-y-2">
                  <p className="text-sm text-gray-700 font-medium">{t('pnl.help.costEfficiency.strategicUse.description')}</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 ml-2">
                    <li>{t('pnl.help.costEfficiency.strategicUse.comparePerformance')}</li>
                    <li>{t('pnl.help.costEfficiency.strategicUse.benchmark')}</li>
                    <li>{t('pnl.help.costEfficiency.strategicUse.identifyOptimization')}</li>
                    <li>{t('pnl.help.costEfficiency.strategicUse.trackProgress')}</li>
                    <li>{t('pnl.help.costEfficiency.strategicUse.makePricingDecisions')}</li>
                    <li>{t('pnl.help.costEfficiency.strategicUse.communicateStakeholders')}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Margins Chart Help Modal */}
      {showMarginsChartHelpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">{t('pnl.help.profitMargins.title')}</h2>
              <button
                onClick={() => setShowMarginsChartHelpModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📈 {t('pnl.help.profitMargins.profitMarginsTrendChart')}</h3>
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700 mb-2">
                    {t('pnl.help.profitMargins.chartDescription')}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    {t('pnl.help.profitMargins.marginsImportance')}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">🎨 {t('pnl.help.profitMargins.readingTheChart')}</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-4 h-4 bg-green-500 rounded mt-0.5"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{t('pnl.help.profitMargins.grossMarginGreenLine')}</p>
                      <p className="text-sm text-gray-600">{t('pnl.help.profitMargins.grossMarginDesc')}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-4 h-4 bg-purple-500 rounded mt-0.5"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{t('pnl.help.profitMargins.netMarginPurpleLine')}</p>
                      <p className="text-sm text-gray-600">{t('pnl.help.profitMargins.netMarginDesc')}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 {t('pnl.help.profitMargins.strategicActions')}</h3>
                <div className="bg-green-50 rounded-xl p-4 space-y-2">
                  <p className="text-sm text-gray-700 font-medium">{t('pnl.help.profitMargins.useMarginTrends')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Chart Help Modal */}
      {showRevenueChartHelpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">{t('pnl.help.revenueProfitability.title')}</h2>
              <button
                onClick={() => setShowRevenueChartHelpModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 {t('pnl.help.revenueProfitability.chartTitle')}</h3>
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700 mb-2">
                    {t('pnl.help.revenueProfitability.chartDescription')}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    {t('pnl.help.revenueProfitability.absoluteAmounts')}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">🎨 {t('pnl.help.revenueProfitability.readingTheChart')}</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-4 h-4 bg-green-700 rounded mt-0.5"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{t('pnl.help.revenueProfitability.revenueGreenBars')}</p>
                      <p className="text-sm text-gray-600">{t('pnl.help.revenueProfitability.revenueDesc')}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-4 h-4 bg-blue-600 rounded mt-0.5"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{t('pnl.help.revenueProfitability.grossProfitBlueBars')}</p>
                      <p className="text-sm text-gray-600">{t('pnl.help.revenueProfitability.grossProfitDesc')}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-4 h-4 bg-purple-600 rounded mt-0.5"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{t('pnl.help.revenueProfitability.netIncomePurpleBars')}</p>
                      <p className="text-sm text-gray-600">{t('pnl.help.revenueProfitability.netIncomeDesc')}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📈 {t('pnl.help.revenueProfitability.strategicInsights')}</h3>
                <div className="bg-green-50 rounded-xl p-4 space-y-2">
                  <p className="text-sm text-gray-700 font-medium">{t('pnl.help.revenueProfitability.useChartTo')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comparison Help Modal */}
      {showComparisonHelpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">{t('pnl.help.comparisonPeriods.title')}</h2>
              <button
                onClick={() => setShowComparisonHelpModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 {t('pnl.help.comparisonPeriods.whatAre')}</h3>
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700 mb-2">
                    {t('pnl.help.comparisonPeriods.description')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-emerald-50 rounded-xl p-4">
                  <h4 className="font-semibold text-emerald-900 mb-2">{t('pnl.help.comparisonPeriods.previousMonth')}</h4>
                  <p className="text-sm text-gray-700">
                    {t('pnl.help.comparisonPeriods.previousMonthDesc')}
                  </p>
                  <div className="mt-3 text-xs text-emerald-700">
                    <strong>{t('pnl.help.comparisonPeriods.example')}</strong> May vs April
                  </div>
                </div>

                <div className="bg-blue-50 rounded-xl p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">{t('pnl.help.comparisonPeriods.previousQuarter')}</h4>
                  <p className="text-sm text-gray-700">
                    {t('pnl.help.comparisonPeriods.previousQuarterDesc')}
                  </p>
                  <div className="mt-3 text-xs text-blue-700">
                    <strong>{t('pnl.help.comparisonPeriods.example')}</strong> May vs February
                  </div>
                </div>

                <div className="bg-purple-50 rounded-xl p-4">
                  <h4 className="font-semibold text-purple-900 mb-2">{t('pnl.help.comparisonPeriods.samePeriodLastYear')}</h4>
                  <p className="text-sm text-gray-700">
                    {t('pnl.help.comparisonPeriods.samePeriodLastYearDesc')}
                  </p>
                  <div className="mt-3 text-xs text-purple-700">
                    <strong>{t('pnl.help.comparisonPeriods.example')}</strong> May 2025 vs May 2024
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📈 How to Read the Indicators</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1 text-emerald-600">
                      <ChevronUpIcon className="h-4 w-4" />
                      <span className="text-sm font-medium">24.1%</span>
                    </div>
                    <p className="text-sm text-gray-600">Positive change - metric has increased compared to the selected period</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1 text-red-600">
                      <ChevronDownIcon className="h-4 w-4" />
                      <span className="text-sm font-medium">15.3%</span>
                    </div>
                    <p className="text-sm text-gray-600">Negative change - metric has decreased compared to the selected period</p>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 rounded-xl p-4">
                <p className="text-sm text-gray-700">
                  <strong>Note:</strong> If historical data is not available for the selected comparison period, the system will automatically use the closest available data or notify you of the limitation.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exchange Rate Modal */}
      {showExchangeRateModal && (
        <ExchangeRateModal
          isOpen={showExchangeRateModal}
          onClose={() => setShowExchangeRateModal(false)}
          baseCurrency={'USD'} // Always use USD as baseline
          targetCurrency={displayCurrency}
          currentRate={currentExchangeRate}
          onRateUpdate={(rate) => {
            setCurrentExchangeRate(rate)
            // Update the cache with the new rate
            currencyService.setExchangeRate('USD', displayCurrency, rate)
          }}
        />
      )}

      {/* Performance Heat Map Help Modal */}
      {showPerformanceHelpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">{t('pnl.help.performanceHeatMap.title')}</h2>
                <button
                  onClick={() => setShowPerformanceHelpModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="h-6 w-6 text-gray-500" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">🔥 {t('pnl.help.performanceHeatMap.whatAre')}</h3>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700 mb-2">
                    {t('pnl.help.performanceHeatMap.description')}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    <strong>Darker/brighter colors</strong> = Better performance<br/>
                    <strong>Lighter/faded colors</strong> = Lower performance
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 P&L Specific Metrics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="text-sm font-semibold text-gray-900">Revenue Performance</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Monthly revenue levels showing sales trends and seasonality
                    </p>
                  </div>
                  <div className="border-l-4 border-purple-500 pl-4">
                    <h4 className="text-sm font-semibold text-gray-900">Net Margin Heat Map</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Profitability percentage showing efficiency improvements
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">🎯 Margin Thresholds</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                    <span>Net Margin &gt; 20%</span>
                    <span className="font-semibold text-green-700">Excellent</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                    <span>Net Margin 10-20%</span>
                    <span className="font-semibold text-yellow-700">Good</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-orange-50 rounded">
                    <span>Net Margin 5-10%</span>
                    <span className="font-semibold text-orange-700">Acceptable</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-red-50 rounded">
                    <span>Net Margin &lt; 5%</span>
                    <span className="font-semibold text-red-700">Needs Improvement</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 Strategic Insights</h3>
                <div className="bg-yellow-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700 mb-3">Use P&L heat maps to:</p>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• <strong>Revenue patterns:</strong> Identify peak sales months</li>
                    <li>• <strong>Margin analysis:</strong> Track profitability improvements</li>
                    <li>• <strong>Cost management:</strong> Spot months with margin pressure</li>
                    <li>• <strong>Strategic planning:</strong> Focus on low-performance periods</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trend Forecast Help Modal */}
      {showTrendForecastHelpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">{t('pnl.help.trendForecast.title')}</h2>
                <button
                  onClick={() => setShowTrendForecastHelpModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="h-6 w-6 text-gray-500" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📈 {t('pnl.help.trendForecast.pnlForecasting')}</h3>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700 mb-2">
                    {t('pnl.help.trendForecast.forecastDescription')} 
                    historical performance trends and growth patterns.
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    Forecasts help you set realistic targets and prepare for different scenarios.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 Key Forecast Metrics</h3>
                <div className="space-y-3">
                  <div className="border-l-4 border-green-500 pl-4">
                    <h4 className="text-sm font-semibold text-gray-900">Revenue Forecast</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Projects future sales based on historical growth rates and seasonality
                    </p>
                  </div>
                  <div className="border-l-4 border-purple-500 pl-4">
                    <h4 className="text-sm font-semibold text-gray-900">Net Income Forecast</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Estimates future profitability considering revenue and expense trends
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">🎯 Growth Rate Analysis</h3>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700 mb-3">The forecast considers:</p>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• <strong>Historical growth:</strong> Average month-over-month changes</li>
                    <li>• <strong>Seasonality:</strong> Recurring patterns in your business</li>
                    <li>• <strong>Trend momentum:</strong> Acceleration or deceleration</li>
                    <li>• <strong>Volatility:</strong> Consistency of performance</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📉 Confidence Levels</h3>
                <div className="space-y-2">
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-sm font-semibold text-green-900">High Confidence (1-2 months)</p>
                    <p className="text-xs text-green-700">Based on recent trends, most accurate</p>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <p className="text-sm font-semibold text-yellow-900">Medium Confidence (3-4 months)</p>
                    <p className="text-xs text-yellow-700">Reasonable projections with some uncertainty</p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <p className="text-sm font-semibold text-orange-900">Lower Confidence (5-6 months)</p>
                    <p className="text-xs text-orange-700">Directional guidance, higher uncertainty</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 Using P&L Forecasts</h3>
                <div className="bg-purple-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700 mb-3">Apply forecasts for:</p>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• <strong>Revenue targets:</strong> Set achievable sales goals</li>
                    <li>• <strong>Cost planning:</strong> Budget for expected expense levels</li>
                    <li>• <strong>Profitability goals:</strong> Plan margin improvements</li>
                    <li>• <strong>Investment timing:</strong> Schedule expansions wisely</li>
                    <li>• <strong>Scenario planning:</strong> Prepare for different outcomes</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  )
}