import React, { useState, useEffect, useRef } from 'react'
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
  ArrowUpTrayIcon,
  DocumentIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CalculatorIcon,
  ScaleIcon
} from '@heroicons/react/24/outline'
import { pnlService } from '../services/pnlService'
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
  const [error, setError] = useState('')
  
  // File upload state
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [uploadCollapsed, setUploadCollapsed] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await pnlService.getDashboard()
      setData(response.data.data)
      
      if (response.data.data.hasData) {
        setUploadCollapsed(true)
      }
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

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setUploadError('')
    setUploadSuccess(false)

    try {
      await pnlService.uploadFile(file)
      setUploadSuccess(true)
      setFile(null)
      
      // Reload dashboard data
      await loadDashboard()
      
      // Collapse upload section after successful upload
      setTimeout(() => {
        setUploadCollapsed(true)
      }, 1500)
    } catch (err: any) {
      setUploadError(err.response?.data?.message || 'Failed to upload file')
    } finally {
      setUploading(false)
    }
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
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Net Margin %',
          data: data.chartData.map(d => d.netMargin),
          borderColor: '#6366F1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
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
          backgroundColor: '#10B981'
        },
        {
          label: 'Gross Profit',
          data: data.chartData.map(d => d.grossProfit),
          backgroundColor: '#3B82F6'
        },
        {
          label: 'Net Income',
          data: data.chartData.map(d => d.netIncome),
          backgroundColor: '#6366F1'
        }
      ]
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

  if (!data?.hasData || !uploadCollapsed) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <ChartBarIcon className="h-8 w-8 mr-3 text-green-600" />
            Profit & Loss Dashboard
          </h1>
          <p className="text-gray-600 mt-2">Upload your P&L statement to view financial insights</p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="max-w-2xl mx-auto">
            <div
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                dragActive 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              
              <ArrowUpTrayIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              
              <p className="text-lg font-medium text-gray-700 mb-2">
                Drag and drop your P&L Excel file here
              </p>
              <p className="text-sm text-gray-500 mb-4">
                or click to browse
              </p>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Select File
              </button>
            </div>

            {file && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <DocumentIcon className="h-8 w-8 text-gray-400 mr-3" />
                    <div>
                      <p className="font-medium text-gray-700">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setFile(null)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <XCircleIcon className="h-6 w-6" />
                  </button>
                </div>
                
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className={`mt-4 w-full py-3 rounded-lg font-medium transition-colors ${
                    uploading
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {uploading ? 'Processing...' : 'Upload and Analyze'}
                </button>
              </div>
            )}

            {uploadSuccess && (
              <div className="mt-4 p-4 bg-green-50 text-green-700 rounded-lg flex items-center">
                <CheckCircleIcon className="h-6 w-6 mr-2" />
                P&L file processed successfully!
              </div>
            )}

            {uploadError && (
              <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center">
                <XCircleIcon className="h-6 w-6 mr-2" />
                {uploadError}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <ChartBarIcon className="h-8 w-8 mr-3 text-green-600" />
          Profit & Loss Dashboard
        </h1>
        <p className="text-gray-600 mt-2">Financial performance analysis and insights</p>
      </div>

      {/* Collapsible Upload Section */}
      <div className="mb-8">
        <button
          onClick={() => setUploadCollapsed(!uploadCollapsed)}
          className="flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          {uploadCollapsed ? (
            <ChevronDownIcon className="h-4 w-4 mr-1" />
          ) : (
            <ChevronUpIcon className="h-4 w-4 mr-1" />
          )}
          Upload New P&L File
        </button>
        
        {!uploadCollapsed && (
          <div className="mt-4 bg-white rounded-xl shadow p-6">
            <div className="max-w-2xl mx-auto">
              <div
                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  dragActive 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                <ArrowUpTrayIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                
                <p className="text-lg font-medium text-gray-700 mb-2">
                  Drag and drop your P&L Excel file here
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  or click to browse
                </p>
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Select File
                </button>
              </div>

              {file && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <DocumentIcon className="h-8 w-8 text-gray-400 mr-3" />
                      <div>
                        <p className="font-medium text-gray-700">{file.name}</p>
                        <p className="text-sm text-gray-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setFile(null)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <XCircleIcon className="h-6 w-6" />
                    </button>
                  </div>
                  
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className={`mt-4 w-full py-3 rounded-lg font-medium transition-colors ${
                      uploading
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {uploading ? 'Processing...' : 'Upload and Analyze'}
                  </button>
                </div>
              )}

              {uploadSuccess && (
                <div className="mt-4 p-4 bg-green-50 text-green-700 rounded-lg flex items-center">
                  <CheckCircleIcon className="h-6 w-6 mr-2" />
                  P&L file processed successfully!
                </div>
              )}

              {uploadError && (
                <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center">
                  <XCircleIcon className="h-6 w-6 mr-2" />
                  {uploadError}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Current Month Overview */}
      {data.currentMonth && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {data.currentMonth.month} P&L Overview
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {/* Revenue */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-xl">
                  <ArrowTrendingUpIcon className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Revenue</h3>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(data.currentMonth.revenue)}
              </p>
            </div>

            {/* Gross Profit */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <CurrencyDollarIcon className="h-6 w-6 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-blue-600">
                  {formatPercentage(data.currentMonth.grossMargin)}
                </span>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Gross Profit</h3>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(data.currentMonth.grossProfit)}
              </p>
            </div>

            {/* Operating Income */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-indigo-100 rounded-xl">
                  <CalculatorIcon className="h-6 w-6 text-indigo-600" />
                </div>
                <span className="text-sm font-medium text-indigo-600">
                  {formatPercentage(data.currentMonth.operatingMargin)}
                </span>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Operating Income</h3>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(data.currentMonth.operatingIncome)}
              </p>
            </div>

            {/* EBITDA */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <ChartBarIcon className="h-6 w-6 text-purple-600" />
                </div>
                <span className="text-sm font-medium text-purple-600">
                  {formatPercentage(data.currentMonth.ebitdaMargin)}
                </span>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">EBITDA</h3>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(data.currentMonth.ebitda)}
              </p>
            </div>

            {/* Net Income */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${
                  data.currentMonth.netIncome >= 0 ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  <ScaleIcon className={`h-6 w-6 ${
                    data.currentMonth.netIncome >= 0 ? 'text-green-600' : 'text-red-600'
                  }`} />
                </div>
                <span className={`text-sm font-medium ${
                  data.currentMonth.netMargin >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatPercentage(data.currentMonth.netMargin)}
                </span>
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Growth Analysis</h3>
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
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Personnel Cost Analysis</h3>
          
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
              <h4 className="text-sm font-medium text-gray-700 mb-4">Cost Efficiency Metrics</h4>
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Profit Margins Trend</h3>
          <div className="h-64">
            {getMarginChartData() && (
              <Line data={getMarginChartData()!} options={chartOptions} />
            )}
          </div>
        </div>

        {/* Revenue Breakdown */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue & Profitability</h3>
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
          <h3 className="text-xl font-bold text-gray-900 mb-8">Year to Date Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
    </div>
  )
}