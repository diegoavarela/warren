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
  } = useCurrency()
  
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

  // Fetch exchange rate when currency changes - always use USD as baseline
  useEffect(() => {
    if (settings.enableCurrencyConversion) {
      // Always convert from USD to display currency
      if (displayCurrency !== 'USD') {
        currencyService.getExchangeRate('USD', displayCurrency)
          .then(rate => setCurrentExchangeRate(rate))
          .catch(err => console.error('Failed to fetch exchange rate:', err))
      } else {
        setCurrentExchangeRate(null)
      }
    } else {
      setCurrentExchangeRate(null)
    }
  }, [displayCurrency, settings.enableCurrencyConversion])

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
        setData(response.data.data)
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
    // Reload dashboard data
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-purple-900 to-gray-900 bg-clip-text text-transparent flex items-center">
            <BanknotesIcon className="h-8 w-8 mr-3 text-violet-600" />
            Cash Flow Dashboard
          </h1>
          <p className="text-gray-600 mt-2">Upload your cash flow data to view financial insights</p>
        </div>

        {/* File Upload Section */}
        <FileUploadSection
          onFileUpload={handleUpload}
          title="Upload Cash Flow Data"
          description="Import your Excel file to analyze cash movements and financial health"
          uploadedFileName={data?.uploadedFileName}
          isRealData={false}
          variant="cashflow"
        />
      </div>
    )
  }

  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                Cash Flow Dashboard
              </h1>
              <p className="text-gray-600 mt-2">Monitor cash movements and financial health</p>
            </div>
            {data?.hasData && (
              <button
                onClick={exportToPDF}
                disabled={exporting}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white rounded-xl hover:from-violet-700 hover:via-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-xl hover:shadow-2xl hover:shadow-purple-500/25 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
              >
                <DocumentArrowDownIcon className="h-5 w-5" />
                <span>{exporting ? 'Exporting...' : 'Export PDF'}</span>
              </button>
            )}
          </div>
        </div>

        {/* File Upload Section */}
        {!isDemoMode ? (
          <FileUploadSection
            onFileUpload={handleUpload}
            title="Upload Cash Flow Data"
            description="Import your Excel file to analyze cash movements and financial health"
            uploadedFileName={data?.uploadedFileName}
            isRealData={data?.hasData}
            variant="cashflow"
          />
        ) : (
          <div className="mb-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-center">
              <SparklesIcon className="h-6 w-6 text-blue-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-blue-800">Demo Mode Active</h3>
                <p className="text-blue-600">File upload is disabled in demo mode. The data shown below is sample data for demonstration purposes.</p>
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
                    {data.currentMonth.month} Cashflow Overview
                  </h2>
                  {/* Exchange Rate Display */}
                  {settings.enableCurrencyConversion && displayCurrency !== 'USD' && currentExchangeRate && (
                    <div className="mt-2 flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-lg max-w-md">
                      <div className="flex items-center space-x-2">
                        <CurrencyDollarIcon className="h-4 w-4 text-blue-600" />
                        <p className="text-xs text-gray-700">
                          Exchange Rate (USD baseline): 
                          <span className="ml-1 font-semibold text-gray-900">
                            1 USD = {currentExchangeRate.toFixed(2)} {displayCurrency}
                          </span>
                        </p>
                      </div>
                      <button
                        onClick={() => setShowExchangeRateModal(true)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                      >
                        Edit
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
                  title="Understanding current month metrics"
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
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Total Inflow</h3>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(data.currentMonth.totalIncome, 'totalIncome')}
                </p>
              </div>

              {/* Total Outflow */}
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-1.5 bg-rose-100 rounded-md">
                    <ArrowTrendingDownIcon className="h-4 w-4 text-rose-600" />
                  </div>
                  <SparklesIcon className="h-4 w-4 text-rose-400" />
                </div>
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Total Outflow</h3>
                <p className="text-xl font-bold text-rose-600">
                  {formatCurrency(Math.abs(data.currentMonth.totalExpense), 'totalExpense')}
                </p>
              </div>

              {/* Final Balance */}
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-1.5 rounded-md ${data.currentMonth.finalBalance >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                    <BanknotesIcon className={`h-4 w-4 ${data.currentMonth.finalBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
                  </div>
                  <SparklesIcon className={`h-4 w-4 ${data.currentMonth.finalBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`} />
                </div>
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Final Balance</h3>
                <p className={`text-xl font-bold ${data.currentMonth.finalBalance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                  {formatCurrency(data.currentMonth.finalBalance, 'finalBalance')}
                </p>
              </div>

              {/* Lowest Balance */}
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-1.5 rounded-md ${data.currentMonth.lowestBalance >= 0 ? 'bg-purple-100' : 'bg-red-100'}`}>
                    <ChartBarIcon className={`h-4 w-4 ${data.currentMonth.lowestBalance >= 0 ? 'text-purple-600' : 'text-red-600'}`} />
                  </div>
                  <SparklesIcon className={`h-4 w-4 ${data.currentMonth.lowestBalance >= 0 ? 'text-purple-400' : 'text-red-400'}`} />
                </div>
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Lowest Balance</h3>
                <p className={`text-xl font-bold ${data.currentMonth.lowestBalance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                  {formatCurrency(data.currentMonth.lowestBalance, 'lowestBalance')}
                </p>
              </div>

              {/* Monthly Generation */}
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-1.5 rounded-md ${data.currentMonth.monthlyGeneration >= 0 ? 'bg-emerald-100' : 'bg-orange-100'}`}>
                    <BanknotesIcon className={`h-4 w-4 ${data.currentMonth.monthlyGeneration >= 0 ? 'text-emerald-600' : 'text-orange-600'}`} />
                  </div>
                  <SparklesIcon className={`h-4 w-4 ${data.currentMonth.monthlyGeneration >= 0 ? 'text-emerald-400' : 'text-orange-400'}`} />
                </div>
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Cash Generation</h3>
                <p className={`text-xl font-bold ${data.currentMonth.monthlyGeneration >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                  {formatCurrency(data.currentMonth.monthlyGeneration, 'monthlyGeneration')}
                </p>
              </div>
            </div>
          </div>
        )}


        {/* YTD Summary */}
        {data.yearToDate && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-purple-900 bg-clip-text text-transparent">Year to Date Summary</h2>
              <button
                onClick={() => setShowYTDHelpModal(true)}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Understanding YTD cash flow summary"
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
                <h3 className="text-sm font-medium text-gray-600 mb-2">Total Inflow</h3>
                <p className="text-3xl font-bold bg-gradient-to-r from-emerald-700 to-teal-700 bg-clip-text text-transparent">{formatCurrency(data.yearToDate.totalIncome, 'ytdIncome')}</p>
                <p className="text-sm text-emerald-600 mt-2">Total income accumulated</p>
              </div>
              
              <div className="bg-gradient-to-br from-rose-50/90 via-pink-50/90 to-red-50/90 backdrop-blur-sm rounded-3xl p-6 border border-rose-200/50 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <ArrowTrendingDownIcon className="h-8 w-8 text-rose-600" />
                  <span className="text-xs font-medium text-rose-600 bg-rose-100 px-3 py-1 rounded-full">YTD</span>
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">Total Outflow</h3>
                <p className="text-3xl font-bold bg-gradient-to-r from-rose-700 to-pink-700 bg-clip-text text-transparent">{formatCurrency(Math.abs(data.yearToDate.totalExpense), 'ytdExpense')}</p>
                <p className="text-sm text-rose-600 mt-2">Total outflow incurred</p>
              </div>
              
              <div className={`bg-gradient-to-br ${data.yearToDate.totalBalance >= 0 ? 'from-blue-50/90 via-indigo-50/90 to-purple-50/90 border-blue-200/50' : 'from-orange-50/90 via-red-50/90 to-rose-50/90 border-orange-200/50'} backdrop-blur-sm rounded-3xl p-6 border shadow-xl`}>
                <div className="flex items-center justify-between mb-4">
                  <BanknotesIcon className={`h-8 w-8 ${data.yearToDate.totalBalance >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
                  <span className={`text-xs font-medium ${data.yearToDate.totalBalance >= 0 ? 'text-blue-600 bg-blue-100' : 'text-orange-600 bg-orange-100'} px-3 py-1 rounded-full`}>YTD</span>
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">Net Balance</h3>
                <p className={`text-3xl font-bold bg-gradient-to-r ${data.yearToDate.totalBalance >= 0 ? 'from-blue-700 to-purple-700' : 'from-orange-700 to-red-700'} bg-clip-text text-transparent`}>{formatCurrency(data.yearToDate.totalBalance, 'ytdBalance')}</p>
                <p className={`text-sm ${data.yearToDate.totalBalance >= 0 ? 'text-blue-600' : 'text-orange-600'} mt-2`}>Net position year to date</p>
              </div>
              
              {/* YTD Investment Card - Only show if there's investment data */}
              {data.yearToDate.totalInvestment !== undefined && data.yearToDate.totalInvestment !== 0 && (
                <div className="bg-gradient-to-br from-purple-50/90 via-pink-50/90 to-rose-50/90 backdrop-blur-sm rounded-3xl p-6 border border-purple-200/50 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <BanknotesIcon className="h-8 w-8 text-purple-600" />
                    <span className="text-xs font-medium text-purple-600 bg-purple-100 px-3 py-1 rounded-full">YTD</span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-600 mb-2">Total Investment</h3>
                  <p className="text-3xl font-bold bg-gradient-to-r from-purple-700 to-pink-700 bg-clip-text text-transparent">{formatCurrency(Math.abs(data.yearToDate.totalInvestment), 'ytdInvestment')}</p>
                  <p className="text-sm text-purple-600 mt-2">Capital deployed year to date</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chart Section */}
        {console.log('Chart data:', data.chartData)}
        {data.chartData && data.chartData.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-purple-900 bg-clip-text text-transparent">2025 Full Year Overview</h2>
              <button
                onClick={() => setShowChartHelpModal(true)}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Understanding the full year cash flow chart"
              >
                <QuestionMarkCircleIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-gray-100">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center space-x-6 text-sm">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-60 rounded mr-2"></div>
                    <span className="text-gray-600">Actual Data</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-20 rounded mr-2"></div>
                    <span className="text-gray-600">Forecast</span>
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
            <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-purple-900 bg-clip-text text-transparent">Cash Flow Analysis</h2>
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
          <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-purple-900 bg-clip-text text-transparent mb-6">Advanced Analytics</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ScenarioPlanning />
            <CashFlowStackedBar />
          </div>
        </div>

        {/* Extended Financial Analysis Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-purple-900 bg-clip-text text-transparent mb-6">Extended Financial Analysis</h2>
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
                  Key Insights
                </h3>
                <button
                  onClick={() => setShowKeyInsightsHelpModal(true)}
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Understanding key financial insights"
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
                  Projections
                </h3>
                <button
                  onClick={() => setShowProjectionsHelpModal(true)}
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Understanding cash flow projections"
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
                <h2 className="text-2xl font-bold text-gray-900">Understanding Key Financial Insights</h2>
                <button
                  onClick={() => setShowKeyInsightsHelpModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="h-6 w-6 text-gray-500" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">✨ What are Key Insights?</h3>
                  <div className="bg-violet-50 rounded-xl p-4">
                    <p className="text-sm text-gray-700 mb-2">
                      Key insights analyze your past 3 months of financial data to identify important patterns, 
                      trends, and notable events that impact your cash flow.
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      These insights help you understand what happened in your business and why.
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 Your Current Insights</h3>
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
                      <p className="text-sm text-gray-500">No insights available yet. Upload more data to see insights.</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">🔍 Types of Insights</h3>
                  <div className="space-y-3">
                    <div className="border-l-4 border-violet-500 pl-4">
                      <h4 className="text-sm font-semibold text-gray-900">Cash Flow Patterns</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Identify months with strong cash generation vs. periods of cash burn.
                        Helps understand business cycles and seasonal trends.
                      </p>
                    </div>
                    
                    <div className="border-l-4 border-blue-500 pl-4">
                      <h4 className="text-sm font-semibold text-gray-900">Income Trends</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Track revenue growth, decline, or stability over the analyzed period.
                        Highlights best and worst performing months.
                      </p>
                    </div>
                    
                    <div className="border-l-4 border-pink-500 pl-4">
                      <h4 className="text-sm font-semibold text-gray-900">Outflow Analysis</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Spot unusual outflow spikes, cost control successes, or spending patterns.
                        Identifies opportunities for cost optimization.
                      </p>
                    </div>
                    
                    <div className="border-l-4 border-green-500 pl-4">
                      <h4 className="text-sm font-semibold text-gray-900">Balance Movements</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Highlights significant changes in cash position, lowest balance points,
                        and recovery periods after cash shortfalls.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">🎯 How Insights are Generated</h3>
                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-sm text-gray-700 mb-3">
                      Our AI analyzes your financial data using these methods:
                    </p>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start">
                        <span className="text-blue-500 mr-2">•</span>
                        <span><strong>Trend Detection:</strong> Identifies growth, decline, or stability patterns</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-500 mr-2">•</span>
                        <span><strong>Anomaly Spotting:</strong> Finds unusual spikes or drops in cash flow</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-500 mr-2">•</span>
                        <span><strong>Comparative Analysis:</strong> Compares months to identify best/worst performers</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-500 mr-2">•</span>
                        <span><strong>Risk Assessment:</strong> Highlights potential cash flow concerns</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 Using Insights for Decision Making</h3>
                  <div className="bg-green-50 rounded-xl p-4 space-y-2">
                    <p className="text-sm text-gray-700 font-medium">Key insights help you:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 ml-2">
                      <li>Understand what drove good or bad financial performance</li>
                      <li>Identify seasonal patterns in your business</li>
                      <li>Spot potential problems before they become critical</li>
                      <li>Recognize successful strategies worth repeating</li>
                      <li>Make data-driven decisions about spending and investment</li>
                      <li>Prepare for similar situations in the future</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">📈 Example Insights</h3>
                  <div className="bg-yellow-50 rounded-xl p-4">
                    <p className="text-sm text-gray-700 mb-3">Common insights you might see:</p>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p className="font-medium text-gray-700">Positive Insights:</p>
                      <ul className="space-y-1 ml-4">
                        <li>• "March showed strongest cash generation with +$45K increase"</li>
                        <li>• "Operating expenses decreased 12% compared to previous quarter"</li>
                        <li>• "Revenue growth averaged 8% month-over-month"</li>
                      </ul>
                      
                      <p className="font-medium text-gray-700 mt-3">Areas for Attention:</p>
                      <ul className="space-y-1 ml-4">
                        <li>• "May experienced lowest cash balance of $12K"</li>
                        <li>• "Expenses spiked 25% in April due to equipment purchases"</li>
                        <li>• "Cash generation declined for two consecutive months"</li>
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
                <h2 className="text-2xl font-bold text-gray-900">Understanding Cash Flow Projections</h2>
                <button
                  onClick={() => setShowProjectionsHelpModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="h-6 w-6 text-gray-500" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">🔮 What are Cash Flow Projections?</h3>
                  <div className="bg-purple-50 rounded-xl p-4">
                    <p className="text-sm text-gray-700 mb-2">
                      Cash flow projections forecast your financial position over the next 6 months 
                      based on historical patterns, trends, and business intelligence.
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      These projections help you plan ahead and make proactive financial decisions.
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 Your Current Projections</h3>
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
                      <p className="text-sm text-gray-500">No projections available yet. Upload more data to see forecasts.</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">🎯 How Projections Work</h3>
                  <div className="space-y-3">
                    <div className="border-l-4 border-purple-500 pl-4">
                      <h4 className="text-sm font-semibold text-gray-900">Trend Analysis</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Analyzes 3-6 months of historical data to identify patterns in income, 
                        expenses, and cash generation that are likely to continue.
                      </p>
                    </div>
                    
                    <div className="border-l-4 border-indigo-500 pl-4">
                      <h4 className="text-sm font-semibold text-gray-900">Seasonal Patterns</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Identifies recurring monthly or quarterly patterns in your business
                        to predict similar behaviors in the future.
                      </p>
                    </div>
                    
                    <div className="border-l-4 border-blue-500 pl-4">
                      <h4 className="text-sm font-semibold text-gray-900">Growth Rates</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Calculates average growth rates for income and expenses to project
                        future performance based on current trajectory.
                      </p>
                    </div>
                    
                    <div className="border-l-4 border-teal-500 pl-4">
                      <h4 className="text-sm font-semibold text-gray-900">Risk Scenarios</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Models potential challenges like cash shortfalls, funding needs,
                        or opportunities for growth investment.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">⚠️ Projection Accuracy</h3>
                  <div className="bg-yellow-50 rounded-xl p-4">
                    <p className="text-sm text-gray-700 mb-3">
                      Important considerations about projection accuracy:
                    </p>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start">
                        <span className="text-yellow-600 mr-2">•</span>
                        <span><strong>Near-term accuracy:</strong> 1-2 months ahead are most reliable</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-yellow-600 mr-2">•</span>
                        <span><strong>Data quality matters:</strong> More historical data = better projections</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-yellow-600 mr-2">•</span>
                        <span><strong>External factors:</strong> Market changes aren't automatically considered</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-yellow-600 mr-2">•</span>
                        <span><strong>Business changes:</strong> New products/services may alter projections</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 Using Projections Strategically</h3>
                  <div className="bg-green-50 rounded-xl p-4 space-y-2">
                    <p className="text-sm text-gray-700 font-medium">Use projections to:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-1">Financial Planning:</p>
                        <ul className="text-xs text-gray-600 space-y-1">
                          <li>• Plan for cash shortfalls</li>
                          <li>• Time major purchases</li>
                          <li>• Schedule fundraising</li>
                          <li>• Set realistic budgets</li>
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-1">Business Decisions:</p>
                        <ul className="text-xs text-gray-600 space-y-1">
                          <li>• Hiring and staffing plans</li>
                          <li>• Investment timing</li>
                          <li>• Inventory management</li>
                          <li>• Growth strategies</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 Example Projections</h3>
                  <div className="bg-indigo-50 rounded-xl p-4">
                    <p className="text-sm text-gray-700 mb-3">Common projections you might see:</p>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p className="font-medium text-gray-700">Positive Outlook:</p>
                      <ul className="space-y-1 ml-4">
                        <li>• "Cash balance expected to grow 15% over next 6 months"</li>
                        <li>• "Projected to maintain positive cash flow through Q2"</li>
                        <li>• "Revenue forecast shows 8% monthly growth trend"</li>
                      </ul>
                      
                      <p className="font-medium text-gray-700 mt-3">Planning Alerts:</p>
                      <ul className="space-y-1 ml-4">
                        <li>• "Cash balance may drop below $20K in August"</li>
                        <li>• "Consider fundraising by September to maintain runway"</li>
                        <li>• "Expense growth outpacing revenue - monitor closely"</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">🔄 Updating Projections</h3>
                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-sm text-gray-700 mb-2">
                      Projections automatically update when you upload new financial data.
                      Regular updates improve accuracy and keep forecasts relevant.
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      Review projections monthly and compare actual results to forecasts to validate accuracy.
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
                <h2 className="text-2xl font-bold text-gray-900">Understanding Current Month Metrics</h2>
                <button
                  onClick={() => setShowCurrentMonthHelpModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="h-6 w-6 text-gray-500" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 Current Month Overview</h3>
                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-sm text-gray-700 mb-2">
                      These metrics show your financial performance for {data?.currentMonth?.month || 'the current month'}, 
                      giving you a snapshot of your cash flow health.
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      These are the most important numbers to monitor for immediate cash flow management.
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">💰 Your Current Numbers</h3>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-600">Total Inflow</p>
                        <p className="text-sm font-semibold text-emerald-600">{formatCurrency(data?.currentMonth?.totalIncome || 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Total Outflow</p>
                        <p className="text-sm font-semibold text-rose-600">{formatCurrency(Math.abs(data?.currentMonth?.totalExpense || 0))}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200">
                      <div>
                        <p className="text-xs text-gray-600">Final Balance</p>
                        <p className={`text-sm font-semibold ${getMetricColor(data?.currentMonth?.finalBalance || 0)}`}>
                          {formatCurrency(data?.currentMonth?.finalBalance || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Cash Generation</p>
                        <p className={`text-sm font-semibold ${getMetricColor(data?.currentMonth?.monthlyGeneration || 0)}`}>
                          {formatCurrency(data?.currentMonth?.monthlyGeneration || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">🎯 Metrics Explained</h3>
                  <div className="space-y-3">
                    <div className="border-l-4 border-emerald-500 pl-4">
                      <h4 className="text-sm font-semibold text-gray-900">Total Inflow</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        All money coming into your business this month from sales, services, and other revenue sources.
                        This is your "top line" number.
                      </p>
                    </div>
                    
                    <div className="border-l-4 border-rose-500 pl-4">
                      <h4 className="text-sm font-semibold text-gray-900">Total Outflow</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        All money going out of your business this month including operational costs, 
                        salaries, rent, and other business outflow.
                      </p>
                    </div>
                    
                    <div className="border-l-4 border-purple-500 pl-4">
                      <h4 className="text-sm font-semibold text-gray-900">Final Balance</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Your cash position at the end of the month. 
                        Formula: Starting Balance + Inflow - Outflow
                      </p>
                    </div>
                    
                    <div className="border-l-4 border-gray-500 pl-4">
                      <h4 className="text-sm font-semibold text-gray-900">Lowest Balance</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        The lowest your cash balance got during the month. Important for understanding 
                        cash flow timing and avoiding overdrafts.
                      </p>
                    </div>
                    
                    <div className="border-l-4 border-cyan-500 pl-4">
                      <h4 className="text-sm font-semibold text-gray-900">Cash Generation</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Net cash flow for the month (Inflow - Outflow). 
                        Positive means you generated cash, negative means you consumed cash.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">🚦 Health Indicators</h3>
                  <div className="bg-yellow-50 rounded-xl p-4">
                    <p className="text-sm text-gray-700 mb-3">What your numbers tell you:</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Positive Cash Generation:</span>
                        <span className="font-medium text-green-600">Healthy cash flow</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Negative Cash Generation:</span>
                        <span className="font-medium text-orange-600">Monitor expenses</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Low Final Balance:</span>
                        <span className="font-medium text-red-600">Consider funding</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Very Low Lowest Balance:</span>
                        <span className="font-medium text-red-600">Cash flow timing risk</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 Quick Actions</h3>
                  <div className="bg-green-50 rounded-xl p-4 space-y-2">
                    <p className="text-sm text-gray-700 font-medium">Use these metrics to:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 ml-2">
                      <li>Track monthly performance vs targets</li>
                      <li>Identify if you're cash positive or negative</li>
                      <li>Spot potential cash flow problems early</li>
                      <li>Make decisions about expenses and investments</li>
                      <li>Plan for upcoming cash needs</li>
                      <li>Communicate financial health to stakeholders</li>
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
                <h2 className="text-2xl font-bold text-gray-900">Understanding YTD Cash Flow Summary</h2>
                <button
                  onClick={() => setShowYTDHelpModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="h-6 w-6 text-gray-500" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">📅 Year to Date Cash Flow</h3>
                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-sm text-gray-700 mb-2">
                      Year to Date shows your cumulative cash flow performance from January 1st 
                      through the current month.
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      These numbers help you understand your overall financial trajectory for the year.
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">💰 Your YTD Performance</h3>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-xs text-gray-600">Total Inflow</p>
                        <p className="text-sm font-semibold text-emerald-600">{formatCurrency(data?.yearToDate?.totalIncome || 0)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-600">Total Outflow</p>
                        <p className="text-sm font-semibold text-rose-600">{formatCurrency(Math.abs(data?.yearToDate?.totalExpense || 0))}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-600">Net Balance</p>
                        <p className={`text-sm font-semibold ${(data?.yearToDate?.totalBalance || 0) >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                          {formatCurrency(data?.yearToDate?.totalBalance || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">🎯 Metrics Explained</h3>
                  <div className="space-y-3">
                    <div className="border-l-4 border-emerald-500 pl-4">
                      <h4 className="text-sm font-semibold text-gray-900">Total Inflow (YTD)</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Sum of all income from January through the current month. 
                        This shows your revenue generation capacity for the year.
                      </p>
                    </div>
                    
                    <div className="border-l-4 border-rose-500 pl-4">
                      <h4 className="text-sm font-semibold text-gray-900">Total Outflow (YTD)</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Sum of all expenses from January through the current month. 
                        Helps track spending patterns and cost control.
                      </p>
                    </div>
                    
                    <div className="border-l-4 border-blue-500 pl-4">
                      <h4 className="text-sm font-semibold text-gray-900">Net Balance (YTD)</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Your cumulative cash generation for the year (Total Inflow - Total Outflows). 
                        Shows if you're profitable year-to-date.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">📈 Performance Analysis</h3>
                  <div className="bg-yellow-50 rounded-xl p-4">
                    <p className="text-sm text-gray-700 mb-3">Your YTD performance indicates:</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Positive Net Balance:</span>
                        <span className="font-medium text-green-600">Profitable year so far</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Negative Net Balance:</span>
                        <span className="font-medium text-orange-600">Operating at a loss YTD</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Growing Income:</span>
                        <span className="font-medium text-blue-600">Business expanding</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">High Expense Ratio:</span>
                        <span className="font-medium text-red-600">Review cost structure</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">🎯 Strategic Planning</h3>
                  <div className="bg-green-50 rounded-xl p-4 space-y-2">
                    <p className="text-sm text-gray-700 font-medium">Use YTD data to:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 ml-2">
                      <li>Compare against annual goals and budgets</li>
                      <li>Project full-year performance</li>
                      <li>Identify seasonal trends and patterns</li>
                      <li>Make mid-year strategy adjustments</li>
                      <li>Prepare for upcoming quarters</li>
                      <li>Communicate progress to investors/stakeholders</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 Monthly Average</h3>
                  <div className="bg-purple-50 rounded-xl p-4">
                    <p className="text-sm text-gray-700 mb-2">Based on your YTD data:</p>
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div className="text-center p-3 bg-white rounded-lg">
                        <p className="text-xs text-gray-600">Average Monthly Income</p>
                        <p className="text-sm font-bold text-emerald-600">
                          {data?.yearToDate ? formatCurrency((data.yearToDate.totalIncome) / (new Date().getMonth() + 1)) : 'N/A'}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg">
                        <p className="text-xs text-gray-600">Average Monthly Expense</p>
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
                <h2 className="text-2xl font-bold text-gray-900">Understanding Full Year Cash Flow Chart</h2>
                <button
                  onClick={() => setShowChartHelpModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="h-6 w-6 text-gray-500" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">📈 2025 Full Year Overview</h3>
                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-sm text-gray-700 mb-2">
                      This chart shows your monthly cash flow performance across the entire year, 
                      combining actual historical data with projected forecasts.
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      It helps you visualize trends, seasonality, and plan for future cash needs.
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">🎨 Reading the Chart</h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-4 h-4 bg-emerald-500 opacity-60 rounded mt-0.5"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Actual Data (Darker)</p>
                        <p className="text-sm text-gray-600">Real cash flow from months that have already occurred</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-4 h-4 bg-emerald-500 opacity-20 rounded mt-0.5"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Forecast (Lighter)</p>
                        <p className="text-sm text-gray-600">Projected cash flow for future months based on trends</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 What the Chart Shows</h3>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Data Points:</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {data?.chartData?.length || 0} months of data
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Actual Months:</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {data?.chartData?.filter(d => d.isActual).length || 0} completed
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Forecasted Months:</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {data?.chartData ? data.chartData.length - data.chartData.filter(d => d.isActual).length : 0} projected
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">🔍 Key Patterns to Look For</h3>
                  <div className="space-y-3">
                    <div className="border-l-4 border-green-500 pl-4">
                      <h4 className="text-sm font-semibold text-gray-900">Upward Trend</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Cash flow improving over time - indicates business growth and better financial health.
                      </p>
                    </div>
                    
                    <div className="border-l-4 border-blue-500 pl-4">
                      <h4 className="text-sm font-semibold text-gray-900">Seasonal Patterns</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Regular ups and downs that repeat yearly - helps predict cash needs during slow periods.
                      </p>
                    </div>
                    
                    <div className="border-l-4 border-yellow-500 pl-4">
                      <h4 className="text-sm font-semibold text-gray-900">Volatility</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Large month-to-month swings may indicate inconsistent revenue or lumpy expenses.
                      </p>
                    </div>
                    
                    <div className="border-l-4 border-red-500 pl-4">
                      <h4 className="text-sm font-semibold text-gray-900">Declining Trend</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Consistently worsening cash flow - may require immediate strategic intervention.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">🎯 Strategic Insights</h3>
                  <div className="bg-yellow-50 rounded-xl p-4">
                    <p className="text-sm text-gray-700 mb-3">Use this chart to:</p>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start">
                        <span className="text-yellow-600 mr-2">•</span>
                        <span><strong>Plan cash reserves:</strong> Identify low cash flow periods to prepare funding</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-yellow-600 mr-2">•</span>
                        <span><strong>Time major expenses:</strong> Schedule large purchases during high cash flow months</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-yellow-600 mr-2">•</span>
                        <span><strong>Set realistic goals:</strong> Base targets on historical performance and trends</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-yellow-600 mr-2">•</span>
                        <span><strong>Communicate with investors:</strong> Show business trajectory and future projections</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">⚡ Forecast Accuracy</h3>
                  <div className="bg-purple-50 rounded-xl p-4">
                    <p className="text-sm text-gray-700 mb-2">Important notes about projections:</p>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>• <strong>Near-term forecasts</strong> (1-2 months) are most reliable</li>
                      <li>• <strong>Longer projections</strong> become less accurate due to market changes</li>
                      <li>• <strong>Historical patterns</strong> are used to generate forecasts</li>
                      <li>• <strong>External factors</strong> (market changes, new competition) aren't predicted</li>
                      <li>• <strong>Regular updates</strong> improve forecast accuracy over time</li>
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
      </div>
    </div>
  )
}