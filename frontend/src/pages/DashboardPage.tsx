import React, { useState, useEffect } from 'react'
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  BanknotesIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  DocumentArrowDownIcon,
  XCircleIcon,
  QuestionMarkCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { cashflowService } from '../services/cashflowService'
import { configurationService } from '../services/configurationService'
import { ProfessionalPDFService } from '../services/professionalPdfService'
import { PremiumPDFExport } from '../components/PremiumPDFExport'
import { FileUploadSection } from '../components/FileUploadSection'
import { CashflowChart } from '../components/CashflowChart'
import { CashRunwayWidget } from '../components/CashRunwayWidget'
import { BurnRateTrend } from '../components/BurnRateTrend'
import { ScenarioPlanning } from '../components/ScenarioPlanning'
import { CashFlowStackedBar } from '../components/CashFlowStackedBar'
import { InvestmentsWidget } from '../components/InvestmentsWidget'
import { BankingWidget } from '../components/BankingWidget'
import { TaxesWidget } from '../components/TaxesWidget'
import { OperationalAnalysisWidget } from '../components/OperationalAnalysisWidget'
import { CurrencySelector } from '../components/CurrencySelector'
import { CurrencyValue } from '../components/CurrencyValue'
import { useCurrency } from '../hooks/useCurrency'
import { Currency, Unit } from '../interfaces/currency'
import { mockCashflowData } from '../services/mockDataService'
import { currencyService } from '../services/currencyService'
import { ExchangeRateModal } from '../components/ExchangeRateModal'
import { PerformanceHeatMap } from '../components/PerformanceHeatMap'
import { TrendForecastChart } from '../components/TrendForecastChart'
import { KeyInsights } from '../components/KeyInsights'
import { useTranslation } from 'react-i18next'

interface DashboardData {
  hasData: boolean
  uploadedFileName?: string
  currentMonth?: {
    month: string
    totalIncome: number
    totalExpense: number
    finalBalance: number
    lowestBalance: number
    monthlyGeneration: number
  }
  yearToDate?: {
    totalIncome: number
    totalExpense: number
    totalBalance: number
    totalInvestment?: number
  }
  chartData?: Array<{
    date: string
    month: string
    income: number
    expenses: number
    cashflow: number
    isActual?: boolean
  }>
  highlights?: {
    pastThreeMonths: string[]
    nextSixMonths: string[]
  }
  isRealData?: boolean
}

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isScreenshotMode] = useState(() => 
    window.location.search.includes('screenshot=true') || 
    sessionStorage.getItem('screenshotMode') === 'true'
  )
  const [isDemoMode] = useState(() => 
    window.location.pathname.startsWith('/demo') || window.location.search.includes('demo=true')
  )

  console.log('DashboardPage render:', {
    isScreenshotMode,
    isDemoMode,
    pathname: window.location.pathname,
    search: window.location.search,
    loading,
    hasData: !!data
  })
  const [exporting, setExporting] = useState(false)
  const [showKeyInsightsHelpModal, setShowKeyInsightsHelpModal] = useState(false)
  const [showProjectionsHelpModal, setShowProjectionsHelpModal] = useState(false)
  const [showCurrentMonthHelpModal, setShowCurrentMonthHelpModal] = useState(false)
  const [showYTDHelpModal, setShowYTDHelpModal] = useState(false)
  const [showChartHelpModal, setShowChartHelpModal] = useState(false)
  const [showPerformanceHelpModal, setShowPerformanceHelpModal] = useState(false)
  const [showTrendForecastHelpModal, setShowTrendForecastHelpModal] = useState(false)
  const [currentExchangeRate, setCurrentExchangeRate] = useState<number | null>(null)
  const [showExchangeRateModal, setShowExchangeRateModal] = useState(false)
  
  // Use the new currency hook
  const { 
    currency: displayCurrency, 
    unit: displayUnit, 
    baseCurrency,
    settings,
    setCurrency: setDisplayCurrency, 
    setUnit: setDisplayUnit,
    convertAmount,
    formatAmount,
    loading: currencyLoading
  } = useCurrency('cashflow')
  
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

  useEffect(() => {
    loadDashboard()
  }, [])

  // Fetch exchange rate when currency changes - use baseCurrency as baseline
  useEffect(() => {
    if (settings.enableCurrencyConversion) {
      // Convert from baseCurrency to display currency
      if (displayCurrency !== baseCurrency) {
        currencyService.getExchangeRate(baseCurrency, displayCurrency)
          .then(rate => setCurrentExchangeRate(rate))
          .catch(err => console.error('Failed to fetch exchange rate:', err))
      } else {
        setCurrentExchangeRate(null)
      }
    } else {
      setCurrentExchangeRate(null)
    }
  }, [displayCurrency, baseCurrency, settings.enableCurrencyConversion])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      setError('')
      
      if (isScreenshotMode || isDemoMode) {
        // Use mock data for screenshots/demo and don't make API calls
        console.log('Loading mock data for screenshot/demo mode')
        console.log('Mock data:', mockCashflowData)
        setData(mockCashflowData)
        setLoading(false)
        return
      } else {
        const response = await cashflowService.getDashboard()
        console.log('Dashboard response:', response.data.data)
        console.log('Dashboard hasData:', response.data.data?.hasData)
        console.log('Dashboard uploadedFileName:', response.data.data?.uploadedFileName)
        
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
        console.log('API failed in screenshot/demo mode, using mock data')
        setData(mockCashflowData)
      } else {
        setError(err.response?.data?.message || 'Failed to load dashboard data')
      }
    } finally {
      setLoading(false)
    }
  }

  // State for converted amounts
  const [convertedAmounts, setConvertedAmounts] = useState<{ [key: string]: number }>({})
  const [isConverting, setIsConverting] = useState(false)
  
  // Effect to convert amounts when currency changes
  useEffect(() => {
    // Skip currency conversion in screenshot/demo mode
    if (isScreenshotMode || isDemoMode) return
    
    if (data && settings.enableCurrencyConversion && baseCurrency !== displayCurrency) {
      convertAllAmounts()
    } else if (baseCurrency === displayCurrency) {
      // Clear converted amounts when showing base currency
      setConvertedAmounts({})
    }
  }, [displayCurrency, data, baseCurrency, settings.enableCurrencyConversion, isScreenshotMode, isDemoMode])
  
  const convertAllAmounts = async () => {
    if (!data || !data.currentMonth) return
    
    setIsConverting(true)
    const converted: { [key: string]: number } = {}
    
    // Convert all the amounts we display
    try {
      converted.totalIncome = await convertAmount(data.currentMonth.totalIncome, baseCurrency)
      converted.totalExpense = await convertAmount(Math.abs(data.currentMonth.totalExpense), baseCurrency)
      converted.finalBalance = await convertAmount(data.currentMonth.finalBalance, baseCurrency)
      converted.lowestBalance = await convertAmount(data.currentMonth.lowestBalance, baseCurrency)
      converted.monthlyGeneration = await convertAmount(data.currentMonth.monthlyGeneration, baseCurrency)
      
      if (data.yearToDate) {
        converted.ytdIncome = await convertAmount(data.yearToDate.totalIncome, baseCurrency)
        converted.ytdExpense = await convertAmount(Math.abs(data.yearToDate.totalExpense), baseCurrency)
        converted.ytdBalance = await convertAmount(data.yearToDate.totalBalance, baseCurrency)
        if (data.yearToDate.totalInvestment !== undefined) {
          converted.ytdInvestment = await convertAmount(Math.abs(data.yearToDate.totalInvestment), baseCurrency)
        }
      }
      
      setConvertedAmounts(converted)
    } catch (error) {
      console.error('Error converting amounts:', error)
    } finally {
      setIsConverting(false)
    }
  }
  
  const formatCurrency = (amount: number, fieldName?: string) => {
    // Use converted amount if available and conversion is enabled
    if (settings.enableCurrencyConversion && baseCurrency !== displayCurrency && fieldName && convertedAmounts[fieldName] !== undefined) {
      console.log(`Using converted amount for ${fieldName}: ${amount} ${baseCurrency} -> ${convertedAmounts[fieldName]} ${displayCurrency}`)
      amount = convertedAmounts[fieldName]
    }
    
    // Use the new formatAmount function from the currency hook
    if (!currencyLoading) {
      return formatAmount(amount)
    }
    
    // Fallback to legacy formatting while currency settings load
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '$0'
    }
    
    return formatAmount(amount)
  }

  const getMetricColor = (value: number) => {
    return value >= 0 ? 'text-emerald-600' : 'text-rose-600'
  }

  const getMetricBgColor = (value: number) => {
    return value >= 0 ? 'from-emerald-50 via-teal-50 to-cyan-50' : 'from-rose-50 via-pink-50 to-red-50'
  }

  const calculateChange = (current: number, previous: number) => {
    if (!previous || previous === 0) return null
    const change = ((current - previous) / Math.abs(previous)) * 100
    return change
  }

  const getChangeDisplay = (current: number, previous: number) => {
    const change = calculateChange(current, previous)
    if (change === null) return ''
    
    const isPositive = change >= 0
    const arrow = isPositive ? '↑' : '↓'
    const color = isPositive ? 'text-emerald-600' : 'text-rose-600'
    
    return (
      <span className={`${color} text-xs font-medium`}>
        {arrow} {Math.abs(change).toFixed(1)}%
      </span>
    )
  }

  const exportToPDF = async () => {
    if (!data) return

    try {
      setExporting(true)
      
      // Get active company information
      const activeCompany = await configurationService.getActiveCompany()
      
      await ProfessionalPDFService.exportDashboard({
        company: activeCompany.data,
        title: 'Cash Flow Financial Report',
        data: data,
        type: 'cashflow'
      })
    } catch (err: any) {
      setError('Failed to export PDF. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const handleUpload = async (uploadedFile: File) => {
    // Skip upload in screenshot/demo mode
    if (isScreenshotMode || isDemoMode) return
    
    await cashflowService.uploadFile(uploadedFile)
    // Add a small delay to ensure backend has processed the file
    await new Promise(resolve => setTimeout(resolve, 500))
    // Reload dashboard data
    await loadDashboard()
  }

  const handleMappingSuccess = async () => {
    // Skip in screenshot/demo mode
    if (isScreenshotMode || isDemoMode) return
    
    // Add a small delay to ensure backend has processed the file
    await new Promise(resolve => setTimeout(resolve, 500))
    // Just reload dashboard data since mapping endpoint already processed the file
    await loadDashboard()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-purple-300/30 rounded-full animate-pulse"></div>
            <div className="absolute top-0 left-0 w-20 h-20 border-4 border-violet-500 rounded-full animate-spin border-t-transparent"></div>
          </div>
          <p className="mt-4 text-purple-100 font-medium">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-xl border border-red-500/20 rounded-3xl shadow-2xl p-8 max-w-md">
          <div className="flex items-center space-x-3 text-red-400 mb-4">
            <XCircleIcon className="h-8 w-8" />
            <h3 className="text-xl font-semibold">Error Loading Dashboard</h3>
          </div>
          <p className="text-gray-300 mb-6">{error}</p>
          <button 
            onClick={loadDashboard} 
            className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium py-3 rounded-xl hover:from-violet-700 hover:to-purple-700 hover:shadow-lg hover:shadow-purple-500/25 transform hover:-translate-y-0.5 transition-all duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Show upload page if no data
  if (!data?.hasData) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-purple-900 to-gray-900 bg-clip-text text-transparent flex items-center">
                <BanknotesIcon className="h-8 w-8 mr-3 text-violet-600" />
                {t('nav.cashflow')} {t('nav.dashboard')}
              </h1>
              <p className="text-gray-600 mt-2">{t('dashboard.subtitle')}</p>
            </div>

            {/* File Upload Section */}
            <FileUploadSection
              onFileUpload={handleUpload}
              onMappingSuccess={handleMappingSuccess}
              title="Upload Cash Flow Data"
              description="Import your Excel file to analyze cash movements and financial health"
              uploadedFileName={data?.uploadedFileName}
              isRealData={false}
              variant="cashflow"
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto" id="cashflow-dashboard-content">
        {/* Demo Mode Banner */}
        {isDemoMode && (
          <div className="mb-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-xl shadow-lg">
            <div className="flex items-center justify-center">
              <SparklesIcon className="h-5 w-5 mr-2" />
              <span className="font-medium">Demo Mode</span>
              <span className="ml-2 text-blue-100">- This is sample data for demonstration purposes</span>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-purple-900 to-gray-900 bg-clip-text text-transparent flex items-center">
                <BanknotesIcon className="h-8 w-8 mr-3 text-violet-600" />
                {t('nav.cashflow')} {t('nav.dashboard')}
              </h1>
              <p className="text-gray-600 mt-2">{t('dashboard.subtitle')}</p>
            </div>
            {data?.hasData && (
              <PremiumPDFExport
                data={data}
                type="cashflow"
                title={t('cashflow.pdfTitle')}
              />
            )}
          </div>
        </div>

        {/* File Upload Section */}
        {!isDemoMode ? (
          <FileUploadSection
            onFileUpload={handleUpload}
            onMappingSuccess={handleMappingSuccess}
            title={t('cashflow.uploadTitle')}
            description={t('cashflow.uploadDescription')}
            uploadedFileName={data?.uploadedFileName}
            isRealData={data?.hasData}
            variant="cashflow"
          />
        ) : (
          <div className="mb-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-center">
              <SparklesIcon className="h-6 w-6 text-blue-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-blue-800">{t('cashflow.demoModeTitle')}</h3>
                <p className="text-blue-600">{t('cashflow.demoModeDescription')}</p>
              </div>
            </div>
          </div>
        )}


        {/* Current Month Metrics */}
        {data.currentMonth && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="p-2 bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl text-white mr-3 shadow-lg">
                  <CalendarIcon className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-purple-900 bg-clip-text text-transparent">
                    {data.currentMonth.month} {t('dashboard.cashflowOverview')}
                  </h2>
                  {/* Exchange Rate Display */}
                  {settings.enableCurrencyConversion && displayCurrency !== 'USD' && currentExchangeRate && (
                    <div className="mt-2 flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-lg max-w-md">
                      <div className="flex items-center space-x-2">
                        <CurrencyDollarIcon className="h-4 w-4 text-blue-600" />
                        <p className="text-xs text-gray-700">
                          {t('cashflow.exchangeRateBaseline')}: 
                          <span className="ml-1 font-semibold text-gray-900">
                            1 USD = {currentExchangeRate.toFixed(2)} {displayCurrency}
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
                  onClick={() => setShowCurrentMonthHelpModal(true)}
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title={t('cashflow.helpCurrentMonth')}
                >
                  <QuestionMarkCircleIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Total Inflow */}
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-1.5 bg-emerald-100 rounded-md">
                    <ArrowTrendingUpIcon className="h-4 w-4 text-emerald-600" />
                  </div>
                  <SparklesIcon className="h-4 w-4 text-emerald-400" />
                </div>
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{t('cashflow.totalIncome')}</h3>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(data.currentMonth.totalIncome, 'totalIncome')}
                </p>
                {data.previousMonth && (
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-gray-500">
                      {t('dashboard.comparison', { previousMonth: data.previousMonth.month })}
                    </p>
                    {getChangeDisplay(data.currentMonth.totalIncome, data.previousMonth.totalIncome)}
                  </div>
                )}
              </div>

              {/* Total Outflow */}
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-1.5 bg-rose-100 rounded-md">
                    <ArrowTrendingDownIcon className="h-4 w-4 text-rose-600" />
                  </div>
                  <SparklesIcon className="h-4 w-4 text-rose-400" />
                </div>
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{t('cashflow.totalExpense')}</h3>
                <p className="text-xl font-bold text-rose-600">
                  {formatCurrency(Math.abs(data.currentMonth.totalExpense), 'totalExpense')}
                </p>
                {data.previousMonth && (
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-gray-500">
                      {t('dashboard.comparison', { previousMonth: data.previousMonth.month })}
                    </p>
                    {getChangeDisplay(Math.abs(data.currentMonth.totalExpense), Math.abs(data.previousMonth.totalExpense))}
                  </div>
                )}
              </div>

              {/* Final Balance */}
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-1.5 rounded-md ${data.currentMonth.finalBalance >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                    <BanknotesIcon className={`h-4 w-4 ${data.currentMonth.finalBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
                  </div>
                  <SparklesIcon className={`h-4 w-4 ${data.currentMonth.finalBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`} />
                </div>
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{t('cashflow.finalBalance')}</h3>
                <p className={`text-xl font-bold ${data.currentMonth.finalBalance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                  {formatCurrency(data.currentMonth.finalBalance, 'finalBalance')}
                </p>
                {data.previousMonth && (
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-gray-500">
                      {t('dashboard.comparison', { previousMonth: data.previousMonth.month })}
                    </p>
                    {getChangeDisplay(data.currentMonth.finalBalance, data.previousMonth.finalBalance)}
                  </div>
                )}
              </div>

              {/* Lowest Balance */}
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-1.5 rounded-md ${data.currentMonth.lowestBalance >= 0 ? 'bg-purple-100' : 'bg-red-100'}`}>
                    <ChartBarIcon className={`h-4 w-4 ${data.currentMonth.lowestBalance >= 0 ? 'text-purple-600' : 'text-red-600'}`} />
                  </div>
                  <SparklesIcon className={`h-4 w-4 ${data.currentMonth.lowestBalance >= 0 ? 'text-purple-400' : 'text-red-400'}`} />
                </div>
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{t('cashflow.lowestBalance')}</h3>
                <p className={`text-xl font-bold ${data.currentMonth.lowestBalance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                  {formatCurrency(data.currentMonth.lowestBalance, 'lowestBalance')}
                </p>
                {data.previousMonth && (
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-gray-500">
                      {t('dashboard.comparison', { previousMonth: data.previousMonth.month })}
                    </p>
                    {getChangeDisplay(data.currentMonth.lowestBalance, data.previousMonth.lowestBalance)}
                  </div>
                )}
              </div>

              {/* Monthly Generation */}
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-1.5 rounded-md ${data.currentMonth.monthlyGeneration >= 0 ? 'bg-emerald-100' : 'bg-orange-100'}`}>
                    <BanknotesIcon className={`h-4 w-4 ${data.currentMonth.monthlyGeneration >= 0 ? 'text-emerald-600' : 'text-orange-600'}`} />
                  </div>
                  <SparklesIcon className={`h-4 w-4 ${data.currentMonth.monthlyGeneration >= 0 ? 'text-emerald-400' : 'text-orange-400'}`} />
                </div>
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{t('cashflow.monthlyGeneration')}</h3>
                <p className={`text-xl font-bold ${data.currentMonth.monthlyGeneration >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                  {formatCurrency(data.currentMonth.monthlyGeneration, 'monthlyGeneration')}
                </p>
                {data.previousMonth && (
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-gray-500">
                      {t('dashboard.comparison', { previousMonth: data.previousMonth.month })}
                    </p>
                    {getChangeDisplay(data.currentMonth.monthlyGeneration, data.previousMonth.monthlyGeneration)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}


        {/* YTD Summary */}
        {data.yearToDate && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-purple-900 bg-clip-text text-transparent">{t('cashflow.yearToDateSummary')}</h2>
              <button
                onClick={() => setShowYTDHelpModal(true)}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title={t('cashflow.helpYTD')}
              >
                <QuestionMarkCircleIcon className="h-5 w-5" />
              </button>
            </div>
            <div className={`grid grid-cols-1 md:grid-cols-${data.yearToDate.totalInvestment ? '4' : '3'} gap-6`}>
              <div className="bg-gradient-to-br from-emerald-50/90 via-teal-50/90 to-cyan-50/90 backdrop-blur-sm rounded-3xl p-6 border border-emerald-200/50 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <ArrowTrendingUpIcon className="h-8 w-8 text-emerald-600" />
                  <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full">YTD</span>
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">{t('cashflow.totalInflow')}</h3>
                <p className="text-3xl font-bold bg-gradient-to-r from-emerald-700 to-teal-700 bg-clip-text text-transparent">{formatCurrency(data.yearToDate.totalIncome, 'ytdIncome')}</p>
                <p className="text-sm text-emerald-600 mt-2">{t('cashflow.totalIncomeAccumulated')}</p>
              </div>
              
              <div className="bg-gradient-to-br from-rose-50/90 via-pink-50/90 to-red-50/90 backdrop-blur-sm rounded-3xl p-6 border border-rose-200/50 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <ArrowTrendingDownIcon className="h-8 w-8 text-rose-600" />
                  <span className="text-xs font-medium text-rose-600 bg-rose-100 px-3 py-1 rounded-full">YTD</span>
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">{t('cashflow.totalOutflow')}</h3>
                <p className="text-3xl font-bold bg-gradient-to-r from-rose-700 to-pink-700 bg-clip-text text-transparent">{formatCurrency(Math.abs(data.yearToDate.totalExpense), 'ytdExpense')}</p>
                <p className="text-sm text-rose-600 mt-2">{t('cashflow.totalOutflowIncurred')}</p>
              </div>
              
              <div className={`bg-gradient-to-br ${data.yearToDate.totalBalance >= 0 ? 'from-blue-50/90 via-indigo-50/90 to-purple-50/90 border-blue-200/50' : 'from-orange-50/90 via-red-50/90 to-rose-50/90 border-orange-200/50'} backdrop-blur-sm rounded-3xl p-6 border shadow-xl`}>
                <div className="flex items-center justify-between mb-4">
                  <BanknotesIcon className={`h-8 w-8 ${data.yearToDate.totalBalance >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
                  <span className={`text-xs font-medium ${data.yearToDate.totalBalance >= 0 ? 'text-blue-600 bg-blue-100' : 'text-orange-600 bg-orange-100'} px-3 py-1 rounded-full`}>YTD</span>
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">{t('cashflow.netBalance')}</h3>
                <p className={`text-3xl font-bold bg-gradient-to-r ${data.yearToDate.totalBalance >= 0 ? 'from-blue-700 to-purple-700' : 'from-orange-700 to-red-700'} bg-clip-text text-transparent`}>{formatCurrency(data.yearToDate.totalBalance, 'ytdBalance')}</p>
                <p className={`text-sm ${data.yearToDate.totalBalance >= 0 ? 'text-blue-600' : 'text-orange-600'} mt-2`}>{t('cashflow.netPositionYTD')}</p>
              </div>
              
              {/* YTD Investment Card - Only show if there's investment data */}
              {data.yearToDate.totalInvestment !== undefined && data.yearToDate.totalInvestment !== 0 && (
                <div className="bg-gradient-to-br from-purple-50/90 via-pink-50/90 to-rose-50/90 backdrop-blur-sm rounded-3xl p-6 border border-purple-200/50 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <BanknotesIcon className="h-8 w-8 text-purple-600" />
                    <span className="text-xs font-medium text-purple-600 bg-purple-100 px-3 py-1 rounded-full">YTD</span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-600 mb-2">{t('cashflow.totalInvestment')}</h3>
                  <p className="text-3xl font-bold bg-gradient-to-r from-purple-700 to-pink-700 bg-clip-text text-transparent">{formatCurrency(Math.abs(data.yearToDate.totalInvestment), 'ytdInvestment')}</p>
                  <p className="text-sm text-purple-600 mt-2">{t('cashflow.capitalDeployedYTD')}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Key Insights Section */}
        {data.hasData && <KeyInsights data={data} type="cashflow" />}

        {/* Performance Overview Section */}
        {data.chartData && data.chartData.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-purple-900 bg-clip-text text-transparent">{t('dashboard.performanceOverview')}</h2>
              <button
                onClick={() => setShowPerformanceHelpModal(true)}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title={t('cashflow.helpPerformance')}
              >
                <QuestionMarkCircleIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PerformanceHeatMap 
                data={data}
                metric="cashflow"
                title={t('cashflow.monthlyCashflowPerformance')}
                type="cashflow"
              />
              <PerformanceHeatMap 
                data={data}
                metric="revenue"
                title={t('cashflow.monthlyInflowHeatMap')}
                type="cashflow"
              />
            </div>
          </div>
        )}

        {/* Trend Analysis & Forecasts Section - REMOVED per user request
        {data.chartData && data.chartData.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-purple-900 bg-clip-text text-transparent">Trend Analysis & Forecasts</h2>
              <button
                onClick={() => setShowTrendForecastHelpModal(true)}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Understanding trend forecasts"
              >
                <QuestionMarkCircleIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TrendForecastChart
                data={data}
                metric="cashflow"
                title="Cash Flow Trend & 6-Month Forecast"
                type="cashflow"
                forecastMonths={6}
              />
              <TrendForecastChart
                data={data}
                metric="revenue"
                title="Revenue Trend & 6-Month Forecast"
                type="cashflow"
                forecastMonths={6}
              />
            </div>
          </div>
        )}
        */}

        {/* Chart Section */}
        {console.log('Chart data:', data.chartData)}
        {data.chartData && data.chartData.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-purple-900 bg-clip-text text-transparent">{t('cashflow.fullYearOverview')}</h2>
              <button
                onClick={() => setShowChartHelpModal(true)}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title={t('cashflow.helpChart')}
              >
                <QuestionMarkCircleIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-gray-100">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center space-x-6 text-sm">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-60 rounded mr-2"></div>
                    <span className="text-gray-600">{t('cashflow.actualData')}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-20 rounded mr-2"></div>
                    <span className="text-gray-600">{t('cashflow.forecast')}</span>
                  </div>
                </div>
              </div>
              <CashflowChart data={data.chartData} currency={displayCurrency} />
            </div>
          </div>
        )}

        {/* Cash Flow Analysis Section - Runway and Burn Rate */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-purple-900 bg-clip-text text-transparent">{t('cashflow.cashflowAnalysis')}</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CashRunwayWidget 
              currency={currency} 
              displayUnit={convertToLegacyUnit(displayUnit)} 
            />
            <BurnRateTrend 
              currency={currency} 
              displayUnit={convertToLegacyUnit(displayUnit)} 
            />
          </div>
        </div>

        {/* Advanced Analytics Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-purple-900 bg-clip-text text-transparent mb-6">{t('cashflow.advancedAnalytics')}</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ScenarioPlanning />
            <CashFlowStackedBar />
          </div>
        </div>

        {/* Extended Financial Analysis Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-purple-900 bg-clip-text text-transparent mb-6">{t('cashflow.extendedFinancialAnalysis')}</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <OperationalAnalysisWidget 
              currency={currency} 
              displayUnit={convertToLegacyUnit(displayUnit)} 
            />
            <BankingWidget 
              currency={currency} 
              displayUnit={convertToLegacyUnit(displayUnit)} 
            />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <InvestmentsWidget 
              currency={currency} 
              displayUnit={convertToLegacyUnit(displayUnit)} 
            />
            <TaxesWidget 
              currency={currency} 
              displayUnit={convertToLegacyUnit(displayUnit)} 
            />
          </div>
        </div>

        {/* Highlights */}
        {data.highlights && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold bg-gradient-to-r from-violet-700 to-purple-700 bg-clip-text text-transparent flex items-center">
                  <SparklesIcon className="h-6 w-6 text-violet-500 mr-2" />
                  {t('dashboard.keyInsights')}
                </h3>
                <button
                  onClick={() => setShowKeyInsightsHelpModal(true)}
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title={t('cashflow.helpKeyInsights')}
                >
                  <QuestionMarkCircleIcon className="h-5 w-5" />
                </button>
              </div>
              <ul className="space-y-3">
                {data.highlights.pastThreeMonths.map((highlight, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-violet-500 mr-2 mt-1">•</span>
                    <span className="text-gray-700">{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold bg-gradient-to-r from-purple-700 to-indigo-700 bg-clip-text text-transparent flex items-center">
                  <ChartBarIcon className="h-6 w-6 text-purple-500 mr-2" />
                  {t('dashboard.projections')}
                </h3>
                <button
                  onClick={() => setShowProjectionsHelpModal(true)}
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title={t('cashflow.helpProjections')}
                >
                  <QuestionMarkCircleIcon className="h-5 w-5" />
                </button>
              </div>
              <ul className="space-y-3">
                {data.highlights.nextSixMonths.map((highlight, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-purple-500 mr-2 mt-1">•</span>
                    <span className="text-gray-700">{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Key Insights Help Modal */}
        {showKeyInsightsHelpModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">{t('dashboard.help.keyInsights.title')}</h2>
                <button
                  onClick={() => setShowKeyInsightsHelpModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="h-6 w-6 text-gray-500" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">✨ {t('dashboard.help.keyInsights.whatAre')}</h3>
                  <div className="bg-violet-50 rounded-xl p-4">
                    <p className="text-sm text-gray-700 mb-2">
                      {t('dashboard.help.keyInsights.description')}
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      {t('dashboard.help.keyInsights.purpose')}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 {t('dashboard.help.keyInsights.currentInsights')}</h3>
                  <div className="bg-gray-50 rounded-xl p-4">
                    {data?.highlights?.pastThreeMonths && data.highlights.pastThreeMonths.length > 0 ? (
                      <ul className="space-y-2">
                        {data.highlights.pastThreeMonths.map((insight, index) => (
                          <li key={index} className="flex items-start text-sm">
                            <span className="text-violet-500 mr-2 mt-1">•</span>
                            <span className="text-gray-700">{insight}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">{t('dashboard.help.keyInsights.noInsights')}</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">🔍 {t('dashboard.help.keyInsights.typesOfInsights.title')}</h3>
                  <div className="space-y-3">
                    <div className="border-l-4 border-violet-500 pl-4">
                      <h4 className="text-sm font-semibold text-gray-900">{t('dashboard.help.keyInsights.typesOfInsights.cashFlow.title')}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {t('dashboard.help.keyInsights.typesOfInsights.cashFlow.description')}
                      </p>
                    </div>
                    
                    <div className="border-l-4 border-blue-500 pl-4">
                      <h4 className="text-sm font-semibold text-gray-900">{t('dashboard.help.keyInsights.typesOfInsights.income.title')}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {t('dashboard.help.keyInsights.typesOfInsights.income.description')}
                      </p>
                    </div>
                    
                    <div className="border-l-4 border-pink-500 pl-4">
                      <h4 className="text-sm font-semibold text-gray-900">{t('dashboard.help.keyInsights.typesOfInsights.outflow.title')}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {t('dashboard.help.keyInsights.typesOfInsights.outflow.description')}
                      </p>
                    </div>
                    
                    <div className="border-l-4 border-green-500 pl-4">
                      <h4 className="text-sm font-semibold text-gray-900">{t('dashboard.help.keyInsights.typesOfInsights.balance.title')}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {t('dashboard.help.keyInsights.typesOfInsights.balance.description')}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">🎯 {t('dashboard.help.keyInsights.howGenerated.title')}</h3>
                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-sm text-gray-700 mb-3">
                      {t('dashboard.help.keyInsights.howGenerated.description')}
                    </p>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start">
                        <span className="text-blue-500 mr-2">•</span>
                        <span><strong>{t('dashboard.help.keyInsights.howGenerated.methods.trendDetection.title')}:</strong> {t('dashboard.help.keyInsights.howGenerated.methods.trendDetection.description')}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-500 mr-2">•</span>
                        <span><strong>{t('dashboard.help.keyInsights.howGenerated.methods.anomalySpotting.title')}:</strong> {t('dashboard.help.keyInsights.howGenerated.methods.anomalySpotting.description')}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-500 mr-2">•</span>
                        <span><strong>{t('dashboard.help.keyInsights.howGenerated.methods.comparative.title')}:</strong> {t('dashboard.help.keyInsights.howGenerated.methods.comparative.description')}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-500 mr-2">•</span>
                        <span><strong>{t('dashboard.help.keyInsights.howGenerated.methods.riskAssessment.title')}:</strong> {t('dashboard.help.keyInsights.howGenerated.methods.riskAssessment.description')}</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 {t('dashboard.help.keyInsights.decisionMaking.title')}</h3>
                  <div className="bg-green-50 rounded-xl p-4 space-y-2">
                    <p className="text-sm text-gray-700 font-medium">{t('dashboard.help.keyInsights.decisionMaking.subtitle')}</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 ml-2">
                      <li>{t('dashboard.help.keyInsights.decisionMaking.benefits.understand')}</li>
                      <li>{t('dashboard.help.keyInsights.decisionMaking.benefits.patterns')}</li>
                      <li>{t('dashboard.help.keyInsights.decisionMaking.benefits.problems')}</li>
                      <li>{t('dashboard.help.keyInsights.decisionMaking.benefits.strategies')}</li>
                      <li>{t('dashboard.help.keyInsights.decisionMaking.benefits.datadriven')}</li>
                      <li>{t('dashboard.help.keyInsights.decisionMaking.benefits.prepare')}</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">📈 {t('dashboard.help.keyInsights.examples.title')}</h3>
                  <div className="bg-yellow-50 rounded-xl p-4">
                    <p className="text-sm text-gray-700 mb-3">{t('dashboard.help.keyInsights.examples.subtitle')}</p>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p className="font-medium text-gray-700">{t('dashboard.help.keyInsights.examples.positive.title')}</p>
                      <ul className="space-y-1 ml-4">
                        <li>• {t('dashboard.help.keyInsights.examples.positive.cashGeneration')}</li>
                        <li>• {t('dashboard.help.keyInsights.examples.positive.expenseDecrease')}</li>
                        <li>• {t('dashboard.help.keyInsights.examples.positive.revenueGrowth')}</li>
                      </ul>
                      
                      <p className="font-medium text-gray-700 mt-3">{t('dashboard.help.keyInsights.examples.attention.title')}</p>
                      <ul className="space-y-1 ml-4">
                        <li>• {t('dashboard.help.keyInsights.examples.attention.lowestBalance')}</li>
                        <li>• {t('dashboard.help.keyInsights.examples.attention.expenseSpike')}</li>
                        <li>• {t('dashboard.help.keyInsights.examples.attention.cashDecline')}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Projections Help Modal */}
        {showProjectionsHelpModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">{t('dashboard.help.projections.title')}</h2>
                <button
                  onClick={() => setShowProjectionsHelpModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="h-6 w-6 text-gray-500" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">🔮 {t('dashboard.help.projections.whatAre')}</h3>
                  <div className="bg-purple-50 rounded-xl p-4">
                    <p className="text-sm text-gray-700 mb-2">
                      {t('dashboard.help.projections.description')}
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      {t('dashboard.help.projections.purpose')}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 {t('dashboard.help.projections.currentProjections')}</h3>
                  <div className="bg-gray-50 rounded-xl p-4">
                    {data?.highlights?.nextSixMonths && data.highlights.nextSixMonths.length > 0 ? (
                      <ul className="space-y-2">
                        {data.highlights.nextSixMonths.map((projection, index) => (
                          <li key={index} className="flex items-start text-sm">
                            <span className="text-purple-500 mr-2 mt-1">•</span>
                            <span className="text-gray-700">{projection}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">{t('dashboard.help.projections.noProjections')}</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">🎯 {t('dashboard.help.projections.howWork.title')}</h3>
                  <div className="space-y-3">
                    <div className="border-l-4 border-purple-500 pl-4">
                      <h4 className="text-sm font-semibold text-gray-900">{t('dashboard.help.projections.howWork.trendAnalysis.title')}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {t('dashboard.help.projections.howWork.trendAnalysis.description1')} 
                        {t('dashboard.help.projections.howWork.trendAnalysis.description2')}
                      </p>
                    </div>
                    
                    <div className="border-l-4 border-indigo-500 pl-4">
                      <h4 className="text-sm font-semibold text-gray-900">{t('dashboard.help.projections.howWork.seasonal.title')}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {t('dashboard.help.projections.howWork.seasonal.description')}
                      </p>
                    </div>
                    
                    <div className="border-l-4 border-blue-500 pl-4">
                      <h4 className="text-sm font-semibold text-gray-900">{t('dashboard.help.projections.howWork.growthRates.title')}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {t('dashboard.help.projections.howWork.growthRates.description')}
                      </p>
                    </div>
                    
                    <div className="border-l-4 border-teal-500 pl-4">
                      <h4 className="text-sm font-semibold text-gray-900">{t('dashboard.help.projections.howWork.riskScenarios.title')}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {t('dashboard.help.projections.howWork.riskScenarios.description')}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">⚠️ {t('dashboard.help.projections.accuracy.title')}</h3>
                  <div className="bg-yellow-50 rounded-xl p-4">
                    <p className="text-sm text-gray-700 mb-3">
                      {t('dashboard.help.projections.accuracy.subtitle')}
                    </p>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start">
                        <span className="text-yellow-600 mr-2">•</span>
                        <span><strong>{t('dashboard.help.projections.accuracy.nearTerm.title')}:</strong> {t('dashboard.help.projections.accuracy.nearTerm.description')}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-yellow-600 mr-2">•</span>
                        <span><strong>{t('dashboard.help.projections.accuracy.dataQuality.title')}:</strong> {t('dashboard.help.projections.accuracy.dataQuality.description')}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-yellow-600 mr-2">•</span>
                        <span><strong>{t('dashboard.help.projections.accuracy.externalFactors.title')}:</strong> {t('dashboard.help.projections.accuracy.externalFactors.description')}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-yellow-600 mr-2">•</span>
                        <span><strong>{t('dashboard.help.projections.accuracy.businessChanges.title')}:</strong> {t('dashboard.help.projections.accuracy.businessChanges.description')}</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 {t('dashboard.help.projections.strategic.title')}</h3>
                  <div className="bg-green-50 rounded-xl p-4 space-y-2">
                    <p className="text-sm text-gray-700 font-medium">{t('dashboard.help.projections.strategic.subtitle')}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-1">{t('dashboard.help.projections.strategic.financialPlanning.title')}</p>
                        <ul className="text-xs text-gray-600 space-y-1">
                          <li>• {t('dashboard.help.projections.strategic.financialPlanning.shortfalls')}</li>
                          <li>• {t('dashboard.help.projections.strategic.financialPlanning.purchases')}</li>
                          <li>• {t('dashboard.help.projections.strategic.financialPlanning.fundraising')}</li>
                          <li>• {t('dashboard.help.projections.strategic.financialPlanning.budgets')}</li>
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-1">{t('dashboard.help.projections.strategic.businessDecisions.title')}</p>
                        <ul className="text-xs text-gray-600 space-y-1">
                          <li>• {t('dashboard.help.projections.strategic.businessDecisions.hiring')}</li>
                          <li>• {t('dashboard.help.projections.strategic.businessDecisions.investment')}</li>
                          <li>• {t('dashboard.help.projections.strategic.businessDecisions.inventory')}</li>
                          <li>• {t('dashboard.help.projections.strategic.businessDecisions.growth')}</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 {t('dashboard.help.projections.examples.title')}</h3>
                  <div className="bg-indigo-50 rounded-xl p-4">
                    <p className="text-sm text-gray-700 mb-3">{t('dashboard.help.projections.examples.subtitle')}</p>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p className="font-medium text-gray-700">{t('dashboard.help.projections.examples.positive.title')}</p>
                      <ul className="space-y-1 ml-4">
                        <li>• {t('dashboard.help.projections.examples.positive.balanceGrowth')}</li>
                        <li>• {t('dashboard.help.projections.examples.positive.positiveCashFlow')}</li>
                        <li>• {t('dashboard.help.projections.examples.positive.revenueForecast')}</li>
                      </ul>
                      
                      <p className="font-medium text-gray-700 mt-3">{t('dashboard.help.projections.examples.alerts.title')}</p>
                      <ul className="space-y-1 ml-4">
                        <li>• {t('dashboard.help.projections.examples.alerts.lowBalance')}</li>
                        <li>• {t('dashboard.help.projections.examples.alerts.fundraising')}</li>
                        <li>• {t('dashboard.help.projections.examples.alerts.expenseGrowth')}</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">🔄 {t('dashboard.help.projections.updating.title')}</h3>
                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-sm text-gray-700 mb-2">
                      {t('dashboard.help.projections.updating.description')}
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      {t('dashboard.help.projections.updating.review')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Current Month Help Modal */}
        {showCurrentMonthHelpModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">{t('dashboard.help.currentMonth.title')}</h2>
                <button
                  onClick={() => setShowCurrentMonthHelpModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="h-6 w-6 text-gray-500" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 {t('dashboard.help.currentMonth.overview.title')}</h3>
                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-sm text-gray-700 mb-2">
                      {t('dashboard.help.currentMonth.overview.description', { month: data?.currentMonth?.month || t('dashboard.help.currentMonth.overview.currentMonth') })}
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      {t('dashboard.help.currentMonth.overview.importance')}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">💰 {t('dashboard.help.currentMonth.currentNumbers')}</h3>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-600">{t('dashboard.help.currentMonth.metrics.totalInflow')}</p>
                        <p className="text-sm font-semibold text-emerald-600">{formatCurrency(data?.currentMonth?.totalIncome || 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">{t('dashboard.help.currentMonth.metrics.totalOutflow')}</p>
                        <p className="text-sm font-semibold text-rose-600">{formatCurrency(Math.abs(data?.currentMonth?.totalExpense || 0))}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200">
                      <div>
                        <p className="text-xs text-gray-600">{t('dashboard.help.currentMonth.metrics.finalBalance')}</p>
                        <p className={`text-sm font-semibold ${getMetricColor(data?.currentMonth?.finalBalance || 0)}`}>
                          {formatCurrency(data?.currentMonth?.finalBalance || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">{t('dashboard.help.currentMonth.metrics.cashGeneration')}</p>
                        <p className={`text-sm font-semibold ${getMetricColor(data?.currentMonth?.monthlyGeneration || 0)}`}>
                          {formatCurrency(data?.currentMonth?.monthlyGeneration || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">🎯 {t('dashboard.help.currentMonth.explained.title')}</h3>
                  <div className="space-y-3">
                    <div className="border-l-4 border-emerald-500 pl-4">
                      <h4 className="text-sm font-semibold text-gray-900">{t('dashboard.help.currentMonth.explained.inflow.title')}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {t('dashboard.help.currentMonth.explained.inflow.description')}
                      </p>
                    </div>
                    
                    <div className="border-l-4 border-rose-500 pl-4">
                      <h4 className="text-sm font-semibold text-gray-900">{t('dashboard.help.currentMonth.explained.outflow.title')}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {t('dashboard.help.currentMonth.explained.outflow.description')}
                      </p>
                    </div>
                    
                    <div className="border-l-4 border-purple-500 pl-4">
                      <h4 className="text-sm font-semibold text-gray-900">{t('dashboard.help.currentMonth.explained.finalBalance.title')}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {t('dashboard.help.currentMonth.explained.finalBalance.description')}
                      </p>
                    </div>
                    
                    <div className="border-l-4 border-gray-500 pl-4">
                      <h4 className="text-sm font-semibold text-gray-900">{t('dashboard.help.currentMonth.explained.lowestBalance.title')}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {t('dashboard.help.currentMonth.explained.lowestBalance.description')}
                      </p>
                    </div>
                    
                    <div className="border-l-4 border-cyan-500 pl-4">
                      <h4 className="text-sm font-semibold text-gray-900">{t('dashboard.help.currentMonth.explained.cashGeneration.title')}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {t('dashboard.help.currentMonth.explained.cashGeneration.description')}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">🚦 {t('dashboard.help.currentMonth.healthIndicators.title')}</h3>
                  <div className="bg-yellow-50 rounded-xl p-4">
                    <p className="text-sm text-gray-700 mb-3">{t('dashboard.help.currentMonth.healthIndicators.subtitle')}</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">{t('dashboard.help.currentMonth.healthIndicators.positiveCashGeneration')}</span>
                        <span className="font-medium text-green-600">{t('dashboard.help.currentMonth.healthIndicators.healthyCashFlow')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">{t('dashboard.help.currentMonth.healthIndicators.negativeCashGeneration')}</span>
                        <span className="font-medium text-orange-600">{t('dashboard.help.currentMonth.healthIndicators.monitorExpenses')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">{t('dashboard.help.currentMonth.healthIndicators.lowFinalBalance')}</span>
                        <span className="font-medium text-red-600">{t('dashboard.help.currentMonth.healthIndicators.considerFunding')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">{t('dashboard.help.currentMonth.healthIndicators.veryLowLowestBalance')}</span>
                        <span className="font-medium text-red-600">{t('dashboard.help.currentMonth.healthIndicators.cashFlowTimingRisk')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 {t('dashboard.help.currentMonth.quickActions.title')}</h3>
                  <div className="bg-green-50 rounded-xl p-4 space-y-2">
                    <p className="text-sm text-gray-700 font-medium">{t('dashboard.help.currentMonth.quickActions.subtitle')}</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 ml-2">
                      <li>{t('dashboard.help.currentMonth.quickActions.action1')}</li>
                      <li>{t('dashboard.help.currentMonth.quickActions.action2')}</li>
                      <li>{t('dashboard.help.currentMonth.quickActions.action3')}</li>
                      <li>{t('dashboard.help.currentMonth.quickActions.action4')}</li>
                      <li>{t('dashboard.help.currentMonth.quickActions.action5')}</li>
                      <li>{t('dashboard.help.currentMonth.quickActions.action6')}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* YTD Cash Flow Help Modal */}
        {showYTDHelpModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">{t('dashboard.help.ytd.title')}</h2>
                <button
                  onClick={() => setShowYTDHelpModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="h-6 w-6 text-gray-500" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">📅 {t('dashboard.help.ytd.overview.title')}</h3>
                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-sm text-gray-700 mb-2">
                      {t('dashboard.help.ytd.overview.description')}
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      {t('dashboard.help.ytd.overview.purpose')}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">💰 {t('dashboard.help.ytd.performance.title')}</h3>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-xs text-gray-600">{t('dashboard.help.ytd.labels.totalInflow')}</p>
                        <p className="text-sm font-semibold text-emerald-600">{formatCurrency(data?.yearToDate?.totalIncome || 0)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-600">{t('dashboard.help.ytd.labels.totalOutflow')}</p>
                        <p className="text-sm font-semibold text-rose-600">{formatCurrency(Math.abs(data?.yearToDate?.totalExpense || 0))}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-600">{t('dashboard.help.ytd.labels.netBalance')}</p>
                        <p className={`text-sm font-semibold ${(data?.yearToDate?.totalBalance || 0) >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                          {formatCurrency(data?.yearToDate?.totalBalance || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">🎯 {t('dashboard.help.ytd.metricsExplained.title')}</h3>
                  <div className="space-y-3">
                    <div className="border-l-4 border-emerald-500 pl-4">
                      <h4 className="text-sm font-semibold text-gray-900">{t('dashboard.help.ytd.metricsExplained.totalInflow.title')}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {t('dashboard.help.ytd.metricsExplained.totalInflow.description')}
                      </p>
                    </div>
                    
                    <div className="border-l-4 border-rose-500 pl-4">
                      <h4 className="text-sm font-semibold text-gray-900">{t('dashboard.help.ytd.metricsExplained.totalOutflow.title')}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {t('dashboard.help.ytd.metricsExplained.totalOutflow.description')}
                      </p>
                    </div>
                    
                    <div className="border-l-4 border-blue-500 pl-4">
                      <h4 className="text-sm font-semibold text-gray-900">{t('dashboard.help.ytd.metricsExplained.netBalance.title')}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {t('dashboard.help.ytd.metricsExplained.netBalance.description')}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">📈 {t('dashboard.help.ytd.performanceAnalysis.title')}</h3>
                  <div className="bg-yellow-50 rounded-xl p-4">
                    <p className="text-sm text-gray-700 mb-3">{t('dashboard.help.ytd.performanceAnalysis.subtitle')}</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">{t('dashboard.help.ytd.performanceAnalysis.positiveNetBalance')}</span>
                        <span className="font-medium text-green-600">{t('dashboard.help.ytd.performanceAnalysis.profitableYear')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">{t('dashboard.help.ytd.performanceAnalysis.negativeNetBalance')}</span>
                        <span className="font-medium text-orange-600">{t('dashboard.help.ytd.performanceAnalysis.operatingAtLoss')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">{t('dashboard.help.ytd.performanceAnalysis.growingIncome')}</span>
                        <span className="font-medium text-blue-600">{t('dashboard.help.ytd.performanceAnalysis.businessExpanding')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">{t('dashboard.help.ytd.performanceAnalysis.highExpenseRatio')}</span>
                        <span className="font-medium text-red-600">{t('dashboard.help.ytd.performanceAnalysis.reviewCostStructure')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">🎯 {t('dashboard.help.ytd.strategic.title')}</h3>
                  <div className="bg-green-50 rounded-xl p-4 space-y-2">
                    <p className="text-sm text-gray-700 font-medium">{t('dashboard.help.ytd.strategic.subtitle')}</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 ml-2">
                      <li>{t('dashboard.help.ytd.strategic.uses.compare')}</li>
                      <li>{t('dashboard.help.ytd.strategic.uses.project')}</li>
                      <li>{t('dashboard.help.ytd.strategic.uses.identify')}</li>
                      <li>{t('dashboard.help.ytd.strategic.uses.adjust')}</li>
                      <li>{t('dashboard.help.ytd.strategic.uses.prepare')}</li>
                      <li>{t('dashboard.help.ytd.strategic.uses.communicate')}</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 {t('dashboard.help.ytd.monthlyAverage.title')}</h3>
                  <div className="bg-purple-50 rounded-xl p-4">
                    <p className="text-sm text-gray-700 mb-2">{t('dashboard.help.ytd.monthlyAverage.subtitle')}</p>
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div className="text-center p-3 bg-white rounded-lg">
                        <p className="text-xs text-gray-600">{t('dashboard.help.ytd.labels.averageMonthlyIncome')}</p>
                        <p className="text-sm font-bold text-emerald-600">
                          {data?.yearToDate ? formatCurrency((data.yearToDate.totalIncome) / (new Date().getMonth() + 1)) : 'N/A'}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg">
                        <p className="text-xs text-gray-600">{t('dashboard.help.ytd.labels.averageMonthlyExpense')}</p>
                        <p className="text-sm font-bold text-rose-600">
                          {data?.yearToDate ? formatCurrency(Math.abs(data.yearToDate.totalExpense) / (new Date().getMonth() + 1)) : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chart Help Modal */}
        {showChartHelpModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">{t('dashboard.help.fullYear.title')}</h2>
                <button
                  onClick={() => setShowChartHelpModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="h-6 w-6 text-gray-500" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">📈 {t('dashboard.help.fullYear.overview.title')}</h3>
                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-sm text-gray-700 mb-2">
                      {t('dashboard.help.fullYear.overview.description')}
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      {t('dashboard.help.fullYear.overview.purpose')}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">🎨 {t('dashboard.help.fullYear.reading.title')}</h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-4 h-4 bg-emerald-500 opacity-60 rounded mt-0.5"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{t('dashboard.help.fullYear.reading.actual.label')}</p>
                        <p className="text-sm text-gray-600">{t('dashboard.help.fullYear.reading.actual.description')}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-4 h-4 bg-emerald-500 opacity-20 rounded mt-0.5"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{t('dashboard.help.fullYear.reading.forecast.label')}</p>
                        <p className="text-sm text-gray-600">{t('dashboard.help.fullYear.reading.forecast.description')}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 {t('dashboard.help.fullYear.chartData.title')}</h3>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{t('dashboard.help.fullYear.chartData.dataPoints')}:</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {t('dashboard.help.fullYear.chartData.monthsOfData', { count: data?.chartData?.length || 0 })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{t('dashboard.help.fullYear.chartData.actualMonths')}:</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {t('dashboard.help.fullYear.chartData.completed', { count: data?.chartData?.filter(d => d.isActual).length || 0 })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{t('dashboard.help.fullYear.chartData.forecastedMonths')}:</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {t('dashboard.help.fullYear.chartData.projected', { count: data?.chartData ? data.chartData.length - data.chartData.filter(d => d.isActual).length : 0 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">🔍 {t('dashboard.help.fullYear.patterns.title')}</h3>
                  <div className="space-y-3">
                    <div className="border-l-4 border-green-500 pl-4">
                      <h4 className="text-sm font-semibold text-gray-900">{t('dashboard.help.fullYear.patterns.upward.title')}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {t('dashboard.help.fullYear.patterns.upward.description')}
                      </p>
                    </div>
                    
                    <div className="border-l-4 border-blue-500 pl-4">
                      <h4 className="text-sm font-semibold text-gray-900">{t('dashboard.help.fullYear.patterns.seasonal.title')}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {t('dashboard.help.fullYear.patterns.seasonal.description')}
                      </p>
                    </div>
                    
                    <div className="border-l-4 border-yellow-500 pl-4">
                      <h4 className="text-sm font-semibold text-gray-900">{t('dashboard.help.fullYear.patterns.volatility.title')}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {t('dashboard.help.fullYear.patterns.volatility.description')}
                      </p>
                    </div>
                    
                    <div className="border-l-4 border-red-500 pl-4">
                      <h4 className="text-sm font-semibold text-gray-900">{t('dashboard.help.fullYear.patterns.declining.title')}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {t('dashboard.help.fullYear.patterns.declining.description')}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">🎯 {t('dashboard.help.fullYear.strategicInsights.title')}</h3>
                  <div className="bg-yellow-50 rounded-xl p-4">
                    <p className="text-sm text-gray-700 mb-3">{t('dashboard.help.fullYear.strategicInsights.description')}</p>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start">
                        <span className="text-yellow-600 mr-2">•</span>
                        <span><strong>{t('dashboard.help.fullYear.strategicInsights.planReserves')}</strong> {t('dashboard.help.fullYear.strategicInsights.planReservesDesc')}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-yellow-600 mr-2">•</span>
                        <span><strong>{t('dashboard.help.fullYear.strategicInsights.timeExpenses')}</strong> {t('dashboard.help.fullYear.strategicInsights.timeExpensesDesc')}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-yellow-600 mr-2">•</span>
                        <span><strong>{t('dashboard.help.fullYear.strategicInsights.setGoals')}</strong> {t('dashboard.help.fullYear.strategicInsights.setGoalsDesc')}</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-yellow-600 mr-2">•</span>
                        <span><strong>{t('dashboard.help.fullYear.strategicInsights.communicate')}</strong> {t('dashboard.help.fullYear.strategicInsights.communicateDesc')}</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">⚡ {t('dashboard.help.fullYear.forecastAccuracy.title')}</h3>
                  <div className="bg-purple-50 rounded-xl p-4">
                    <p className="text-sm text-gray-700 mb-2">{t('dashboard.help.fullYear.forecastAccuracy.description')}</p>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>• <strong>{t('dashboard.help.fullYear.forecastAccuracy.nearTerm')}</strong> {t('dashboard.help.fullYear.forecastAccuracy.nearTermDesc')}</li>
                      <li>• <strong>{t('dashboard.help.fullYear.forecastAccuracy.longer')}</strong> {t('dashboard.help.fullYear.forecastAccuracy.longerDesc')}</li>
                      <li>• <strong>{t('dashboard.help.fullYear.forecastAccuracy.historical')}</strong> {t('dashboard.help.fullYear.forecastAccuracy.historicalDesc')}</li>
                      <li>• <strong>{t('dashboard.help.fullYear.forecastAccuracy.external')}</strong> {t('dashboard.help.fullYear.forecastAccuracy.externalDesc')}</li>
                      <li>• <strong>{t('dashboard.help.fullYear.forecastAccuracy.regular')}</strong> {t('dashboard.help.fullYear.forecastAccuracy.regularDesc')}</li>
                    </ul>
                  </div>
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
                  <h2 className="text-2xl font-bold text-gray-900">{t('dashboard.help.heatMap.title')}</h2>
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">🔥 {t('dashboard.help.heatMap.whatAre.title')}</h3>
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4">
                    <p className="text-sm text-gray-700 mb-2">
                      {t('dashboard.help.heatMap.whatAre.description')}
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      <strong>{t('dashboard.help.heatMap.whatAre.colorIntensity.darker')}</strong> = {t('dashboard.help.heatMap.whatAre.colorIntensity.darkerMeaning')}<br/>
                      <strong>{t('dashboard.help.heatMap.whatAre.colorIntensity.lighter')}</strong> = {t('dashboard.help.heatMap.whatAre.colorIntensity.lighterMeaning')}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">🎨 {t('dashboard.help.heatMap.colorCoding.title')}</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-8 bg-green-500 rounded"></div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{t('dashboard.help.heatMap.colorCoding.green.label')}</p>
                        <p className="text-sm text-gray-600">{t('dashboard.help.heatMap.colorCoding.green.description')}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-8 bg-yellow-400 rounded"></div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{t('dashboard.help.heatMap.colorCoding.yellow.label')}</p>
                        <p className="text-sm text-gray-600">{t('dashboard.help.heatMap.colorCoding.yellow.description')}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-8 bg-red-300 rounded"></div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{t('dashboard.help.heatMap.colorCoding.red.label')}</p>
                        <p className="text-sm text-gray-600">{t('dashboard.help.heatMap.colorCoding.red.description')}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">🖱️ {t('dashboard.help.heatMap.interactive.title')}</h3>
                  <div className="bg-blue-50 rounded-xl p-4">
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li>• <strong>{t('dashboard.help.heatMap.interactive.hover')}</strong> {t('dashboard.help.heatMap.interactive.hoverDesc')}</li>
                      <li>• <strong>{t('dashboard.help.heatMap.interactive.click')}</strong> {t('dashboard.help.heatMap.interactive.clickDesc')}</li>
                      <li>• <strong>{t('dashboard.help.heatMap.interactive.compare')}</strong> {t('dashboard.help.heatMap.interactive.compareDesc')}</li>
                      <li>• <strong>{t('dashboard.help.heatMap.interactive.identify')}</strong> {t('dashboard.help.heatMap.interactive.identifyDesc')}</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 {t('dashboard.help.heatMap.availableMetrics.title')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border-l-4 border-blue-500 pl-4">
                      <h4 className="text-sm font-semibold text-gray-900">{t('dashboard.help.heatMap.availableMetrics.cashFlow.title')}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {t('dashboard.help.heatMap.availableMetrics.cashFlow.description')}
                      </p>
                    </div>
                    <div className="border-l-4 border-purple-500 pl-4">
                      <h4 className="text-sm font-semibold text-gray-900">{t('dashboard.help.heatMap.availableMetrics.inflowHeatMap.title')}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {t('dashboard.help.heatMap.availableMetrics.inflowHeatMap.description')}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 {t('dashboard.help.heatMap.howToUse.title')}</h3>
                  <div className="bg-yellow-50 rounded-xl p-4">
                    <p className="text-sm text-gray-700 mb-3">{t('dashboard.help.heatMap.howToUse.description')}</p>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li>• <strong>{t('dashboard.help.heatMap.howToUse.spotPatterns')}</strong> {t('dashboard.help.heatMap.howToUse.spotPatternsDesc')}</li>
                      <li>• <strong>{t('dashboard.help.heatMap.howToUse.comparePerformance')}</strong> {t('dashboard.help.heatMap.howToUse.comparePerformanceDesc')}</li>
                      <li>• <strong>{t('dashboard.help.heatMap.howToUse.planAhead')}</strong> {t('dashboard.help.heatMap.howToUse.planAheadDesc')}</li>
                      <li>• <strong>{t('dashboard.help.heatMap.howToUse.quickAssessment')}</strong> {t('dashboard.help.heatMap.howToUse.quickAssessmentDesc')}</li>
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
                  <h2 className="text-2xl font-bold text-gray-900">Understanding Trend Analysis & Forecasts</h2>
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">📈 {t('dashboard.help.trendForecast.whatAre.title')}</h3>
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4">
                    <p className="text-sm text-gray-700 mb-2">
                      {t('dashboard.help.trendForecast.whatAre.description')}
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      {t('dashboard.help.trendForecast.whatAre.method')}<strong>{t('dashboard.help.trendForecast.whatAre.methodLinearRegression')}</strong>{t('dashboard.help.trendForecast.whatAre.methodEnd')}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 Chart Elements</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-1 bg-green-500 rounded"></div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Solid Line</p>
                        <p className="text-sm text-gray-600">Actual historical data</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-1 bg-blue-500 border-dashed border-b-2 border-blue-500"></div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Dashed Line</p>
                        <p className="text-sm text-gray-600">Forecast projection</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-8 bg-blue-200 opacity-50 rounded"></div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Shaded Area</p>
                        <p className="text-sm text-gray-600">95% confidence interval</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">📐 How Forecasting Works</h3>
                  <div className="space-y-3">
                    <div className="border-l-4 border-purple-500 pl-4">
                      <h4 className="text-sm font-semibold text-gray-900">1. Trend Analysis</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Analyzes historical data points to identify the overall direction and rate of change
                      </p>
                    </div>
                    <div className="border-l-4 border-indigo-500 pl-4">
                      <h4 className="text-sm font-semibold text-gray-900">2. Linear Regression</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Calculates the best-fit line through your data to project future values
                      </p>
                    </div>
                    <div className="border-l-4 border-blue-500 pl-4">
                      <h4 className="text-sm font-semibold text-gray-900">3. Confidence Intervals</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Shows the range where future values are likely to fall (95% probability)
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">📉 {t('dashboard.help.trendForecast.summaryCards.title')}</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600">{t('dashboard.help.trendForecast.summaryCards.currentTrend.label')}</p>
                      <p className="text-sm font-semibold">{t('dashboard.help.trendForecast.summaryCards.currentTrend.description')}</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600">{t('dashboard.help.trendForecast.summaryCards.sixMonthForecast.label')}</p>
                      <p className="text-sm font-semibold">{t('dashboard.help.trendForecast.summaryCards.sixMonthForecast.description')}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600">{t('dashboard.help.trendForecast.summaryCards.confidenceRange.label')}</p>
                      <p className="text-sm font-semibold">{t('dashboard.help.trendForecast.summaryCards.confidenceRange.description')}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">⚠️ Important Considerations</h3>
                  <div className="bg-yellow-50 rounded-xl p-4">
                    <p className="text-sm text-gray-700 mb-3">Keep in mind:</p>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li>• <strong>Near-term accuracy:</strong> Forecasts are most reliable for 1-2 months ahead</li>
                      <li>• <strong>Linear assumption:</strong> Assumes trends continue at the same rate</li>
                      <li>• <strong>External factors:</strong> Cannot predict market changes or disruptions</li>
                      <li>• <strong>Historical basis:</strong> Relies on past patterns continuing</li>
                      <li>• <strong>Regular updates:</strong> Re-run forecasts monthly for best results</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">🎯 Strategic Use</h3>
                  <div className="bg-purple-50 rounded-xl p-4">
                    <p className="text-sm text-gray-700 mb-3">Use forecasts to:</p>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li>• <strong>Budget planning:</strong> Set realistic financial targets</li>
                      <li>• <strong>Cash management:</strong> Prepare for projected shortfalls</li>
                      <li>• <strong>Growth planning:</strong> Identify when to invest or expand</li>
                      <li>• <strong>Risk assessment:</strong> Understand potential scenarios</li>
                      <li>• <strong>Investor communication:</strong> Share data-driven projections</li>
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