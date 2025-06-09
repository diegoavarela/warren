import React, { useState, useEffect } from 'react'
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  BanknotesIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  DocumentArrowDownIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import { cashflowService } from '../services/cashflowService'
import { configurationService } from '../services/configurationService'
import { ProfessionalPDFService } from '../services/professionalPdfService'
import { FileUploadSection } from '../components/FileUploadSection'
import { CashflowChart } from '../components/CashflowChart'
import { CashRunwayWidget } from '../components/CashRunwayWidget'
import { BurnRateTrend } from '../components/BurnRateTrend'
import { ScenarioPlanning } from '../components/ScenarioPlanning'
import { CashFlowWaterfall } from '../components/CashFlowWaterfall'

interface DashboardData {
  currentMonth: {
    month: string
    totalIncome: number
    totalExpense: number
    finalBalance: number
    lowestBalance: number
    monthlyGeneration: number
  }
  yearToDate: {
    totalIncome: number
    totalExpense: number
    totalBalance: number
  }
  chartData: Array<{
    date: string
    month: string
    revenue: number
    costs: number
    cashflow: number
    isActual?: boolean
  }>
  highlights: {
    pastThreeMonths: string[]
    nextSixMonths: string[]
  }
  isRealData: boolean
  uploadedFileName?: string
}

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await cashflowService.getDashboard()
      setData(response.data.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const getMetricColor = (value: number) => {
    return value >= 0 ? 'text-emerald-600' : 'text-red-500'
  }

  const getMetricBgColor = (value: number) => {
    return value >= 0 ? 'from-emerald-50 to-green-50' : 'from-red-50 to-pink-50'
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
    await cashflowService.uploadFile(uploadedFile)
    // Reload dashboard data
    await loadDashboard()
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-indigo-200 rounded-full animate-pulse"></div>
            <div className="absolute top-0 left-0 w-20 h-20 border-4 border-indigo-600 rounded-full animate-spin border-t-transparent"></div>
          </div>
          <p className="mt-4 text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="bg-white border border-red-200 rounded-2xl shadow-xl p-8 max-w-md">
          <div className="flex items-center space-x-3 text-red-600 mb-4">
            <XCircleIcon className="h-8 w-8" />
            <h3 className="text-xl font-semibold">Error Loading Dashboard</h3>
          </div>
          <p className="text-gray-700 mb-6">{error}</p>
          <button 
            onClick={loadDashboard} 
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium py-3 rounded-xl hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <BanknotesIcon className="h-8 w-8 mr-3 text-green-600" />
                Cash Flow Dashboard
              </h1>
              <p className="text-gray-600 mt-2">Monitor cash movements and financial health</p>
            </div>
            {data && (
              <button
                onClick={exportToPDF}
                disabled={exporting}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
              >
                <DocumentArrowDownIcon className="h-5 w-5" />
                <span>{exporting ? 'Exporting...' : 'Export PDF'}</span>
              </button>
            )}
          </div>
        </div>

        {/* File Upload Section */}
        <FileUploadSection
          onFileUpload={handleUpload}
          title="Upload Cash Flow Data"
          description="Import your Excel file to analyze cash movements and financial health"
          uploadedFileName={data?.uploadedFileName}
          isRealData={data?.isRealData}
          variant="cashflow"
        />

        {/* Data Warning for Demo Mode */}
        {!data.isRealData && (
          <div className="mb-8 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl flex items-start space-x-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-800 font-semibold">Demo Mode Active</p>
              <p className="text-amber-700 text-sm mt-1">
                Upload an Excel file above to view your actual cashflow data
              </p>
            </div>
          </div>
        )}

        {/* Cash Flow Analysis Section - NEW */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Cash Flow Analysis</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CashRunwayWidget />
            <BurnRateTrend />
          </div>
        </div>

        {/* Current Month Metrics */}
        <div className="mb-8">
          <div className="flex items-center mb-6">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white mr-3">
              <CalendarIcon className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              {data.currentMonth.month} Cashflow Overview
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {/* Total Income */}
            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl">
                  <ArrowTrendingUpIcon className="h-6 w-6 text-white" />
                </div>
                <SparklesIcon className="h-5 w-5 text-green-500" />
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Total Income</h3>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(data.currentMonth.totalIncome)}
              </p>
            </div>

            {/* Total Expense */}
            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-red-400 to-pink-500 rounded-xl">
                  <ArrowTrendingDownIcon className="h-6 w-6 text-white" />
                </div>
                <SparklesIcon className="h-5 w-5 text-red-500" />
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Total Expense</h3>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(Math.abs(data.currentMonth.totalExpense))}
              </p>
            </div>

            {/* Final Balance */}
            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${getMetricBgColor(data.currentMonth.finalBalance)}`}>
                  <BanknotesIcon className={`h-6 w-6 ${data.currentMonth.finalBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
                </div>
                <SparklesIcon className={`h-5 w-5 ${getMetricColor(data.currentMonth.finalBalance)}`} />
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Final Balance</h3>
              <p className={`text-2xl font-bold ${getMetricColor(data.currentMonth.finalBalance)}`}>
                {formatCurrency(data.currentMonth.finalBalance)}
              </p>
            </div>

            {/* Lowest Balance */}
            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${getMetricBgColor(data.currentMonth.lowestBalance)}`}>
                  <ChartBarIcon className={`h-6 w-6 ${data.currentMonth.lowestBalance >= 0 ? 'text-purple-600' : 'text-red-600'}`} />
                </div>
                <SparklesIcon className={`h-5 w-5 ${data.currentMonth.lowestBalance >= 0 ? 'text-purple-500' : 'text-red-500'}`} />
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Lowest Balance</h3>
              <p className={`text-2xl font-bold ${getMetricColor(data.currentMonth.lowestBalance)}`}>
                {formatCurrency(data.currentMonth.lowestBalance)}
              </p>
            </div>

            {/* Monthly Generation */}
            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${getMetricBgColor(data.currentMonth.monthlyGeneration)}`}>
                  <BanknotesIcon className={`h-6 w-6 ${data.currentMonth.monthlyGeneration >= 0 ? 'text-emerald-600' : 'text-orange-600'}`} />
                </div>
                <SparklesIcon className={`h-5 w-5 ${getMetricColor(data.currentMonth.monthlyGeneration)}`} />
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Cash Generation</h3>
              <p className={`text-2xl font-bold ${getMetricColor(data.currentMonth.monthlyGeneration)}`}>
                {formatCurrency(data.currentMonth.monthlyGeneration)}
              </p>
            </div>
          </div>
        </div>

        {/* YTD Summary */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Year to Date Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
              <div className="flex items-center justify-between mb-4">
                <ArrowTrendingUpIcon className="h-8 w-8 text-green-600" />
                <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">YTD</span>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-2">Total Income</h3>
              <p className="text-3xl font-bold text-green-700">{formatCurrency(data.yearToDate.totalIncome)}</p>
              <p className="text-sm text-green-600 mt-2">Total income accumulated</p>
            </div>
            
            <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl p-6 border border-red-200">
              <div className="flex items-center justify-between mb-4">
                <ArrowTrendingDownIcon className="h-8 w-8 text-red-600" />
                <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded-full">YTD</span>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-2">Total Expense</h3>
              <p className="text-3xl font-bold text-red-700">{formatCurrency(Math.abs(data.yearToDate.totalExpense))}</p>
              <p className="text-sm text-red-600 mt-2">Total expenses incurred</p>
            </div>
            
            <div className={`bg-gradient-to-br ${data.yearToDate.totalBalance >= 0 ? 'from-blue-50 to-indigo-50 border-blue-200' : 'from-orange-50 to-red-50 border-orange-200'} rounded-2xl p-6 border`}>
              <div className="flex items-center justify-between mb-4">
                <BanknotesIcon className={`h-8 w-8 ${data.yearToDate.totalBalance >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
                <span className={`text-xs font-medium ${data.yearToDate.totalBalance >= 0 ? 'text-blue-600 bg-blue-100' : 'text-orange-600 bg-orange-100'} px-2 py-1 rounded-full`}>YTD</span>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-2">Net Balance</h3>
              <p className={`text-3xl font-bold ${data.yearToDate.totalBalance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>{formatCurrency(data.yearToDate.totalBalance)}</p>
              <p className={`text-sm ${data.yearToDate.totalBalance >= 0 ? 'text-blue-600' : 'text-orange-600'} mt-2`}>Net position year to date</p>
            </div>
          </div>
        </div>

        {/* Chart Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">2025 Full Year Overview</h2>
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-500 opacity-60 rounded mr-2"></div>
                  <span className="text-gray-600">Actual Data</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-500 opacity-20 rounded mr-2"></div>
                  <span className="text-gray-600">Forecast</span>
                </div>
              </div>
            </div>
            <CashflowChart data={data.chartData} />
          </div>
        </div>

        {/* Advanced Analytics Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Advanced Analytics</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ScenarioPlanning />
            <CashFlowWaterfall />
          </div>
        </div>

        {/* Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <SparklesIcon className="h-6 w-6 text-indigo-500 mr-2" />
              Key Insights
            </h3>
            <ul className="space-y-3">
              {data.highlights.pastThreeMonths.map((highlight, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-indigo-500 mr-2 mt-1">•</span>
                  <span className="text-gray-700">{highlight}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <ChartBarIcon className="h-6 w-6 text-purple-500 mr-2" />
              Projections
            </h3>
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
      </div>
    </div>
  )
}