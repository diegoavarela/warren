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
  XMarkIcon
} from '@heroicons/react/24/outline'
import { pnlService } from '../services/pnlService'
import { ProfessionalPDFService } from '../services/professionalPdfService'
import { configurationService } from '../services/configurationService'
import { FileUploadSection } from '../components/FileUploadSection'
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
  const [data, setData] = useState<PnLDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [_error, setError] = useState('')
  const [exporting, setExporting] = useState(false)
  const [showPersonnelHelpModal, setShowPersonnelHelpModal] = useState(false)
  const [showCostEfficiencyHelpModal, setShowCostEfficiencyHelpModal] = useState(false)
  const [showRevenueGrowthHelpModal, setShowRevenueGrowthHelpModal] = useState(false)
  const [showYTDSummaryHelpModal, setShowYTDSummaryHelpModal] = useState(false)
  const [showCurrentPnLHelpModal, setShowCurrentPnLHelpModal] = useState(false)
  const [showMarginsChartHelpModal, setShowMarginsChartHelpModal] = useState(false)
  const [showRevenueChartHelpModal, setShowRevenueChartHelpModal] = useState(false)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await pnlService.getDashboard()
      setData(response.data.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load P&L data')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
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


  const handleUpload = async (uploadedFile: File) => {
    await pnlService.uploadFile(uploadedFile)
    // Reload dashboard data
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

    return {
      labels: data.chartData.map(d => d.month),
      datasets: [
        {
          label: 'Revenue',
          data: data.chartData.map(d => d.revenue),
          backgroundColor: '#059669'
        },
        {
          label: 'Gross Profit',
          data: data.chartData.map(d => d.grossProfit),
          backgroundColor: '#2563EB'
        },
        {
          label: 'Net Income',
          data: data.chartData.map(d => d.netIncome),
          backgroundColor: '#7C3AED'
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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
    )
  }

  if (!data?.hasData) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <ChartBarIcon className="h-8 w-8 mr-3 text-emerald-600" />
            Profit & Loss Dashboard
          </h1>
          <p className="text-gray-600 mt-2">Upload your P&L statement to view financial insights</p>
        </div>

        {/* File Upload Section */}
        <FileUploadSection
          onFileUpload={handleUpload}
          title="Upload P&L Statement"
          description="Import your Profit & Loss Excel file to analyze financial performance"
          uploadedFileName={data?.uploadedFileName}
          isRealData={false}
          variant="pnl"
        />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <ChartBarIcon className="h-8 w-8 mr-3 text-emerald-600" />
              Profit & Loss Dashboard
            </h1>
            <p className="text-gray-600 mt-2">Financial performance analysis and insights</p>
          </div>
          {data?.hasData && (
            <button
              onClick={exportToPDF}
              disabled={exporting}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white rounded-xl hover:from-violet-700 hover:via-purple-700 hover:to-fuchsia-700 transition-all duration-200 shadow-lg hover:shadow-2xl transform hover:scale-105 disabled:opacity-50 disabled:transform-none backdrop-blur-sm"
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
        title="Upload P&L Statement"
        description="Import your Profit & Loss Excel file to analyze financial performance"
        uploadedFileName={data?.uploadedFileName}
        isRealData={data?.hasData}
        variant="pnl"
      />

      {/* Current Month Overview */}
      {data.currentMonth && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                {data.currentMonth.month} P&L Overview
              </h2>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span className="px-3 py-1 bg-gray-100 rounded-lg font-medium">
                  ARS (in thousands)
                </span>
              </div>
              <button
                onClick={() => setShowCurrentPnLHelpModal(true)}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Understanding P&L metrics"
              >
                <QuestionMarkCircleIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {/* Revenue */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-200/50">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl shadow-md">
                  <ArrowTrendingUpIcon className="h-6 w-6 text-emerald-600" />
                </div>
                {data.previousMonth && (() => {
                  const change = calculateChange(data.currentMonth.revenue, data.previousMonth.revenue)
                  return change && (
                    <div className={`flex items-center space-x-1 text-sm font-medium ${
                      change.isPositive ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {change.isPositive ? (
                        <ChevronUpIcon className="h-4 w-4" />
                      ) : (
                        <ChevronDownIcon className="h-4 w-4" />
                      )}
                      <span>{Math.abs(change.percentage).toFixed(1)}%</span>
                    </div>
                  )
                })()}
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Revenue</h3>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(data.currentMonth.revenue)}
              </p>
            </div>

            {/* Gross Profit */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-200/50">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-blue-500/20 to-sky-500/20 rounded-xl shadow-md">
                  <CurrencyDollarIcon className="h-6 w-6 text-sky-600" />
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-blue-600">
                    {formatPercentage(data.currentMonth.grossMargin)}
                  </span>
                  {data.previousMonth && (() => {
                    const change = calculateChange(data.currentMonth.grossProfit, data.previousMonth.grossProfit)
                    return change && (
                      <div className={`flex items-center space-x-1 text-sm font-medium ${
                        change.isPositive ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {change.isPositive ? (
                          <ChevronUpIcon className="h-4 w-4" />
                        ) : (
                          <ChevronDownIcon className="h-4 w-4" />
                        )}
                        <span>{Math.abs(change.percentage).toFixed(1)}%</span>
                      </div>
                    )
                  })()}
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Gross Profit</h3>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(data.currentMonth.grossProfit)}
              </p>
            </div>

            {/* Operating Income */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-200/50">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-violet-500/20 rounded-xl shadow-md">
                  <CalculatorIcon className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-indigo-600">
                    {formatPercentage(data.currentMonth.operatingMargin)}
                  </span>
                  {data.previousMonth && (() => {
                    const change = calculateChange(data.currentMonth.operatingIncome, data.previousMonth.operatingIncome)
                    return change && (
                      <div className={`flex items-center space-x-1 text-sm font-medium ${
                        change.isPositive ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {change.isPositive ? (
                          <ChevronUpIcon className="h-4 w-4" />
                        ) : (
                          <ChevronDownIcon className="h-4 w-4" />
                        )}
                        <span>{Math.abs(change.percentage).toFixed(1)}%</span>
                      </div>
                    )
                  })()}
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Operating Income</h3>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(data.currentMonth.operatingIncome)}
              </p>
            </div>

            {/* EBITDA */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-200/50">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-violet-500/20 to-purple-500/20 rounded-xl shadow-md">
                  <ChartBarIcon className="h-6 w-6 text-violet-600" />
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-purple-600">
                    {formatPercentage(data.currentMonth.ebitdaMargin)}
                  </span>
                  {data.previousMonth && (() => {
                    const change = calculateChange(data.currentMonth.ebitda, data.previousMonth.ebitda)
                    return change && (
                      <div className={`flex items-center space-x-1 text-sm font-medium ${
                        change.isPositive ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {change.isPositive ? (
                          <ChevronUpIcon className="h-4 w-4" />
                        ) : (
                          <ChevronDownIcon className="h-4 w-4" />
                        )}
                        <span>{Math.abs(change.percentage).toFixed(1)}%</span>
                      </div>
                    )
                  })()}
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">EBITDA</h3>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(data.currentMonth.ebitda)}
              </p>
            </div>

            {/* Net Income */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-200/50">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${
                  data.currentMonth.netIncome >= 0 ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  <ScaleIcon className={`h-6 w-6 ${
                    data.currentMonth.netIncome >= 0 ? 'text-green-600' : 'text-red-600'
                  }`} />
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-medium ${
                    data.currentMonth.netMargin >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatPercentage(data.currentMonth.netMargin)}
                  </span>
                  {data.previousMonth && (() => {
                    const change = calculateChange(data.currentMonth.netIncome, data.previousMonth.netIncome)
                    return change && (
                      <div className={`flex items-center space-x-1 text-sm font-medium ${
                        change.isPositive ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {change.isPositive ? (
                          <ChevronUpIcon className="h-4 w-4" />
                        ) : (
                          <ChevronDownIcon className="h-4 w-4" />
                        )}
                        <span>{Math.abs(change.percentage).toFixed(1)}%</span>
                      </div>
                    )
                  })()}
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Net Income</h3>
              <p className={`text-2xl font-bold ${
                data.currentMonth.netIncome >= 0 ? 'text-gray-900' : 'text-red-600'
              }`}>
                {formatCurrency(data.currentMonth.netIncome)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Growth Analysis */}
      {data.chartData && data.chartData.length > 1 && (
        <div className="mb-8 bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Revenue Growth Analysis</h3>
            <button
              onClick={() => setShowRevenueGrowthHelpModal(true)}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Understanding revenue growth metrics"
            >
              <QuestionMarkCircleIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Month over Month Growth */}
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
              <p className="text-sm text-gray-600 mb-2">Month-over-Month Growth</p>
              <p className={`text-2xl font-bold ${
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
            
            {/* Average Monthly Revenue */}
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl">
              <p className="text-sm text-gray-600 mb-2">Average Monthly Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(
                  data.chartData.reduce((sum, d) => sum + d.revenue, 0) / data.chartData.length
                )}
              </p>
            </div>
            
            {/* Revenue Trend */}
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
              <p className="text-sm text-gray-600 mb-2">Revenue Trend</p>
              <p className="text-2xl font-bold text-purple-600">
                {data.chartData[data.chartData.length - 1].revenue > data.chartData[0].revenue
                  ? '↑ Growing' : '↓ Declining'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Personnel Cost Analysis */}
      {data.currentMonth && data.currentMonth.totalPersonnelCost && (
        <div className="mb-8 bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Personnel Cost Analysis</h3>
            <button
              onClick={() => setShowPersonnelHelpModal(true)}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Understanding personnel cost metrics"
            >
              <QuestionMarkCircleIcon className="h-5 w-5" />
            </button>
          </div>
          
          {/* Summary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl">
              <p className="text-sm text-gray-600 mb-2">Total Personnel Cost</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(data.currentMonth.totalPersonnelCost)}
              </p>
              <p className="text-sm text-indigo-600 mt-1">
                {((data.currentMonth.totalPersonnelCost / data.currentMonth.revenue) * 100).toFixed(1)}% of Revenue
              </p>
            </div>
            
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
              <p className="text-sm text-gray-600 mb-2">Personnel Efficiency</p>
              <p className="text-2xl font-bold text-purple-600">
                {formatCurrency(data.currentMonth.revenue / (data.currentMonth.totalPersonnelCost / 1000))}
              </p>
              <p className="text-sm text-gray-500 mt-1">Revenue per Personnel ARS</p>
            </div>
            
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl">
              <p className="text-sm text-gray-600 mb-2">Personnel vs OpEx</p>
              <p className="text-2xl font-bold text-green-600">
                {((data.currentMonth.totalPersonnelCost / data.currentMonth.operatingExpenses) * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-gray-500 mt-1">of Operating Expenses</p>
            </div>
          </div>
          
          {/* Detailed Breakdown */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Cost Breakdown</h4>
            
            <div className="space-y-2">
              {/* Salaries */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Total Salaries</span>
                <div className="text-right">
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency((data.currentMonth.personnelSalariesCoR || 0) + (data.currentMonth.personnelSalariesOp || 0))}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    ({(((data.currentMonth.personnelSalariesCoR || 0) + (data.currentMonth.personnelSalariesOp || 0)) / data.currentMonth.totalPersonnelCost * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
              
              {/* Payroll Taxes */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Payroll Taxes</span>
                <div className="text-right">
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency((data.currentMonth.payrollTaxesCoR || 0) + (data.currentMonth.payrollTaxesOp || 0))}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    ({(((data.currentMonth.payrollTaxesCoR || 0) + (data.currentMonth.payrollTaxesOp || 0)) / data.currentMonth.totalPersonnelCost * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
              
              {/* Health & Benefits */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Health Coverage & Benefits</span>
                <div className="text-right">
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency((data.currentMonth.healthCoverage || 0) + (data.currentMonth.personnelBenefits || 0))}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    ({(((data.currentMonth.healthCoverage || 0) + (data.currentMonth.personnelBenefits || 0)) / data.currentMonth.totalPersonnelCost * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
            
            {/* CoR vs Operating Split */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Personnel Allocation</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-gray-600">Cost of Revenue</p>
                  <p className="text-lg font-semibold text-blue-600">
                    {(((data.currentMonth.personnelSalariesCoR || 0) + (data.currentMonth.payrollTaxesCoR || 0)) / data.currentMonth.totalPersonnelCost * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-xs text-gray-600">Operating Expenses</p>
                  <p className="text-lg font-semibold text-purple-600">
                    {(((data.currentMonth.personnelSalariesOp || 0) + (data.currentMonth.payrollTaxesOp || 0)) / data.currentMonth.totalPersonnelCost * 100).toFixed(1)}%
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
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Cost Structure Analysis</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cost Categories Breakdown */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-4">Major Cost Categories</h4>
              <div className="space-y-3">
                {/* Personnel Costs */}
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-600">Personnel Costs</span>
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
                    <span className="text-sm text-gray-600">Contract Services</span>
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
                    <span className="text-sm text-gray-600">Other Costs</span>
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
                <h4 className="text-sm font-medium text-gray-700">Cost Efficiency Metrics</h4>
                <button
                  onClick={() => setShowCostEfficiencyHelpModal(true)}
                  className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Understanding cost efficiency metrics"
                >
                  <QuestionMarkCircleIcon className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-gradient-to-br from-orange-50 to-red-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Cost of Revenue %</p>
                  <p className="text-xl font-bold text-orange-600">
                    {((data.currentMonth.cogs / data.currentMonth.revenue) * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="text-center p-3 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">OpEx %</p>
                  <p className="text-xl font-bold text-yellow-600">
                    {((data.currentMonth.operatingExpenses / data.currentMonth.revenue) * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="text-center p-3 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Total Cost %</p>
                  <p className="text-xl font-bold text-teal-600">
                    {(((data.currentMonth.cogs + data.currentMonth.operatingExpenses) / data.currentMonth.revenue) * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="text-center p-3 bg-gradient-to-br from-pink-50 to-rose-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Cost per Revenue ARS</p>
                  <p className="text-xl font-bold text-pink-600">
                    {(((data.currentMonth.cogs + data.currentMonth.operatingExpenses) / data.currentMonth.revenue)).toFixed(2)}
                  </p>
                </div>
              </div>
              
              {/* Additional Insights */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h5 className="text-xs font-medium text-gray-700 mb-2">Key Insights</h5>
                <ul className="space-y-1 text-xs text-gray-600">
                  <li>• Personnel costs represent {(((data.currentMonth.totalPersonnelCost || 0) / data.currentMonth.revenue) * 100).toFixed(1)}% of revenue</li>
                  <li>• Contract services account for {((((data.currentMonth.contractServicesCoR || 0) + (data.currentMonth.contractServicesOp || 0)) / data.currentMonth.revenue) * 100).toFixed(1)}% of revenue</li>
                  <li>• Total cost structure is {((data.currentMonth.cogs + data.currentMonth.operatingExpenses) / data.currentMonth.revenue * 100).toFixed(1)}% of revenue</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Margins Chart */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Profit Margins Trend</h3>
            <button
              onClick={() => setShowMarginsChartHelpModal(true)}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Understanding profit margins chart"
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
            <h3 className="text-lg font-semibold text-gray-900">Revenue & Profitability</h3>
            <button
              onClick={() => setShowRevenueChartHelpModal(true)}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Understanding revenue and profitability chart"
            >
              <QuestionMarkCircleIcon className="h-5 w-5" />
            </button>
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
            <h3 className="text-xl font-bold text-gray-900">Year to Date Summary</h3>
            <button
              onClick={() => setShowYTDSummaryHelpModal(true)}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Understanding YTD financial summary"
            >
              <QuestionMarkCircleIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {/* Revenue */}
            <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl">
              <p className="text-sm font-medium text-green-600 mb-2">Total Revenue</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(data.summary.totalRevenue)}
              </p>
            </div>
            
            {/* Gross Profit */}
            <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
              <p className="text-sm font-medium text-blue-600 mb-2">Gross Profit</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(data.summary.totalGrossProfit)}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {formatPercentage(data.summary.avgGrossMargin)} margin
              </p>
            </div>
            
            {/* Operating Income */}
            <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
              <p className="text-sm font-medium text-purple-600 mb-2">Operating Income</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(data.summary.totalOperatingIncome)}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {formatPercentage(data.summary.avgOperatingMargin)} margin
              </p>
            </div>
            
            {/* EBITDA */}
            <div className="text-center p-6 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl">
              <p className="text-sm font-medium text-indigo-600 mb-2">Total EBITDA</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(data.chartData?.reduce((sum, month) => {
                  // Calculate EBITDA as Operating Income + estimated D&A (assuming 3-5% of revenue)
                  const monthlyEBITDA = month.operatingIncome + (month.revenue * 0.04);
                  return sum + monthlyEBITDA;
                }, 0) || 0)}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {data.chartData && formatPercentage(((data.chartData.reduce((sum, month) => {
                  const monthlyEBITDA = month.operatingIncome + (month.revenue * 0.04);
                  return sum + monthlyEBITDA;
                }, 0)) / data.summary.totalRevenue) * 100)} margin
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
              }`}>Net Income</p>
              <p className={`text-3xl font-bold ${
                data.summary.totalNetIncome >= 0 ? 'text-gray-900' : 'text-red-600'
              }`}>
                {formatCurrency(data.summary.totalNetIncome)}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {formatPercentage(data.summary.avgNetMargin)} margin
              </p>
            </div>
          </div>
          
          {/* Additional Metrics Row */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-600">Total COGS</p>
              <p className="text-xl font-semibold text-gray-900">
                {formatCurrency(data.summary.totalCOGS)}
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-600">Total Operating Expenses</p>
              <p className="text-xl font-semibold text-gray-900">
                {formatCurrency(data.summary.totalOperatingExpenses)}
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-600">Expense Ratio</p>
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
              <h2 className="text-2xl font-bold text-gray-900">Understanding Personnel Cost Analysis</h2>
              <button
                onClick={() => setShowPersonnelHelpModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">👥 What is Personnel Cost Analysis?</h3>
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700 mb-2">
                    Personnel costs are typically the largest expense for most companies. This analysis helps you understand:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 ml-2">
                    <li>Total cost of your workforce</li>
                    <li>How efficiently you're utilizing personnel</li>
                    <li>The breakdown of personnel-related expenses</li>
                    <li>Personnel costs as a percentage of revenue</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 Your Current Personnel Metrics</h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-600">Total Personnel Cost</p>
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(data?.currentMonth?.totalPersonnelCost || 0)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">% of Revenue</p>
                      <p className="text-sm font-semibold text-indigo-600">
                        {((data?.currentMonth?.totalPersonnelCost || 0) / (data?.currentMonth?.revenue || 1) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      This includes salaries, payroll taxes, health coverage, and benefits
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 Key Metrics Explained</h3>
                <div className="space-y-3">
                  <div className="border-l-4 border-indigo-500 pl-4">
                    <h4 className="text-sm font-semibold text-gray-900">Total Personnel Cost</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Sum of all employee-related expenses including salaries, taxes, and benefits.
                      Industry benchmark: 20-50% of revenue depending on business type.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-purple-500 pl-4">
                    <h4 className="text-sm font-semibold text-gray-900">Personnel Efficiency</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Revenue generated per ARS spent on personnel. Higher is better.
                      Formula: Revenue ÷ Personnel Cost
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-green-500 pl-4">
                    <h4 className="text-sm font-semibold text-gray-900">Personnel vs OpEx</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Shows what portion of operating expenses goes to personnel.
                      Typically 50-70% for service companies, lower for product companies.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📋 Cost Breakdown Components</h3>
                <div className="bg-yellow-50 rounded-xl p-4">
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start">
                      <span className="text-gray-500 mr-2">•</span>
                      <div>
                        <strong>Salaries:</strong> Base compensation for employees
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-gray-500 mr-2">•</span>
                      <div>
                        <strong>Payroll Taxes:</strong> Employer-paid taxes on wages
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-gray-500 mr-2">•</span>
                      <div>
                        <strong>Health Coverage:</strong> Medical, dental, vision insurance
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-gray-500 mr-2">•</span>
                      <div>
                        <strong>Benefits:</strong> Retirement, PTO, other perks
                      </div>
                    </li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">🎯 Personnel Allocation</h3>
                <div className="bg-purple-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700 mb-3">
                    Understanding where your personnel costs are allocated:
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className="text-xs text-gray-600">Cost of Revenue</p>
                      <p className="text-sm font-medium text-blue-600">Direct Production</p>
                      <p className="text-xs text-gray-500 mt-1">Staff directly generating revenue</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className="text-xs text-gray-600">Operating Expenses</p>
                      <p className="text-sm font-medium text-purple-600">Support Functions</p>
                      <p className="text-xs text-gray-500 mt-1">Admin, sales, management</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">⚡ Optimization Tips</h3>
                <div className="bg-green-50 rounded-xl p-4 space-y-2">
                  <p className="text-sm text-gray-700 font-medium">Ways to improve personnel efficiency:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 ml-2">
                    <li>Track revenue per employee over time</li>
                    <li>Compare personnel costs to industry benchmarks</li>
                    <li>Analyze productivity metrics by department</li>
                    <li>Consider automation for repetitive tasks</li>
                    <li>Invest in training to increase productivity</li>
                    <li>Review benefit costs regularly for savings</li>
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
              <h2 className="text-2xl font-bold text-gray-900">Understanding Cost Efficiency Metrics</h2>
              <button
                onClick={() => setShowCostEfficiencyHelpModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📈 What are Cost Efficiency Metrics?</h3>
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700 mb-2">
                    Cost efficiency metrics help you understand how effectively your company 
                    converts revenue into profit by analyzing cost structure and ratios.
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    Lower percentages generally indicate better efficiency and higher profitability.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 Your Current Efficiency Metrics</h3>
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
              <h2 className="text-2xl font-bold text-gray-900">Understanding Revenue Growth Analysis</h2>
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
                <h3 className="text-lg font-semibold text-gray-900 mb-3">🎯 Growth Metrics Explained</h3>
                <div className="space-y-3">
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="text-sm font-semibold text-gray-900">Month-over-Month Growth</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Compares current month revenue to previous month. Shows immediate momentum.
                      Target: 5-20% monthly growth for healthy businesses.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-green-500 pl-4">
                    <h4 className="text-sm font-semibold text-gray-900">Average Monthly Revenue</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Your baseline revenue performance across all analyzed months.
                      Used for budgeting and forecasting future periods.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-purple-500 pl-4">
                    <h4 className="text-sm font-semibold text-gray-900">Revenue Trend</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Overall direction comparing first and last month in the period.
                      Growing trends indicate business expansion and market success.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 Growth Benchmarks</h3>
                <div className="bg-yellow-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700 mb-3">How does your growth compare?</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Excellent Growth:</span>
                      <span className="font-medium text-green-600">&gt;15% monthly</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Good Growth:</span>
                      <span className="font-medium text-blue-600">5-15% monthly</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Stable:</span>
                      <span className="font-medium text-gray-600">0-5% monthly</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Declining:</span>
                      <span className="font-medium text-red-600">&lt;0% monthly</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">🚀 Growth Strategies</h3>
                <div className="bg-green-50 rounded-xl p-4 space-y-2">
                  <p className="text-sm text-gray-700 font-medium">Ways to accelerate revenue growth:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-1">Customer Acquisition:</p>
                      <ul className="text-xs text-gray-600 space-y-1">
                        <li>• Improve marketing campaigns</li>
                        <li>• Expand to new markets</li>
                        <li>• Enhance product offerings</li>
                        <li>• Referral programs</li>
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-1">Customer Retention:</p>
                      <ul className="text-xs text-gray-600 space-y-1">
                        <li>• Upsell existing customers</li>
                        <li>• Improve customer service</li>
                        <li>• Loyalty programs</li>
                        <li>• Regular value delivery</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📈 Reading Growth Patterns</h3>
                <div className="bg-purple-50 rounded-xl p-4">
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">•</span>
                      <span><strong>Consistent Growth:</strong> Steady month-over-month increases</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span><strong>Seasonal Patterns:</strong> Regular ups and downs throughout the year</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-orange-500 mr-2">•</span>
                      <span><strong>Volatility:</strong> Large swings may indicate external factors</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-red-500 mr-2">•</span>
                      <span><strong>Declining Trend:</strong> May require immediate strategic action</span>
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
                <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 Using P&L Metrics</h3>
                <div className="bg-green-50 rounded-xl p-4 space-y-2">
                  <p className="text-sm text-gray-700 font-medium">Use these metrics to:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 ml-2">
                    <li>Compare performance month-over-month</li>
                    <li>Benchmark against industry standards</li>
                    <li>Identify areas for cost optimization</li>
                    <li>Track progress toward profitability goals</li>
                    <li>Make pricing and investment decisions</li>
                    <li>Communicate performance to stakeholders</li>
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
              <h2 className="text-2xl font-bold text-gray-900">Understanding Profit Margins Trend</h2>
              <button
                onClick={() => setShowMarginsChartHelpModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📈 Profit Margins Trend Chart</h3>
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700 mb-2">
                    This chart tracks your gross and net profit margins over time, showing how efficiently 
                    your business converts revenue into profit across different months.
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    Margins are more important than absolute dollar amounts because they show profitability efficiency.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">🎨 Reading the Chart</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-4 h-4 bg-green-500 rounded mt-0.5"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Gross Margin % (Green Line)</p>
                      <p className="text-sm text-gray-600">Shows what percentage of revenue remains after direct costs</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-4 h-4 bg-purple-500 rounded mt-0.5"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Net Margin % (Purple Line)</p>
                      <p className="text-sm text-gray-600">Shows what percentage of revenue becomes final profit</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 Strategic Actions</h3>
                <div className="bg-green-50 rounded-xl p-4 space-y-2">
                  <p className="text-sm text-gray-700 font-medium">Use margin trends to optimize profitability and make data-driven business decisions.</p>
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
              <h2 className="text-2xl font-bold text-gray-900">Understanding Revenue & Profitability Chart</h2>
              <button
                onClick={() => setShowRevenueChartHelpModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 Revenue & Profitability Chart</h3>
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700 mb-2">
                    This bar chart compares revenue, gross profit, and net income across months, 
                    showing the "profit waterfall" from top-line revenue to bottom-line profit.
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    Each bar shows absolute dollar amounts, helping you see both growth trends and profit efficiency.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">🎨 Reading the Chart</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-4 h-4 bg-green-700 rounded mt-0.5"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Revenue (Green Bars)</p>
                      <p className="text-sm text-gray-600">Total income from sales - your "top line" number</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-4 h-4 bg-blue-600 rounded mt-0.5"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Gross Profit (Blue Bars)</p>
                      <p className="text-sm text-gray-600">Revenue minus direct costs - what's left after production</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-4 h-4 bg-purple-600 rounded mt-0.5"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Net Income (Purple Bars)</p>
                      <p className="text-sm text-gray-600">Final profit after all expenses - your "bottom line"</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📈 Strategic Insights</h3>
                <div className="bg-green-50 rounded-xl p-4 space-y-2">
                  <p className="text-sm text-gray-700 font-medium">Use this chart to track business growth and profitability trends over time.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}