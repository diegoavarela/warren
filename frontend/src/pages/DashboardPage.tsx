import React, { useState, useEffect, useRef } from 'react'
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  BanknotesIcon,
  ChartBarIcon,
  CloudArrowUpIcon,
  ArrowUpTrayIcon,
  DocumentIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExclamationTriangleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { cashflowService } from '../services/cashflowService'
import { CashflowChart } from '../components/CashflowChart'
import { MetricCard } from '../components/MetricCard'
import { CashRunwayWidget } from '../components/CashRunwayWidget'
import { BurnRateTrend } from '../components/BurnRateTrend'

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
}

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null)
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

  // Upload handlers
  const handleFile = (selectedFile: File) => {
    if (selectedFile && (selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || selectedFile.name.endsWith('.xlsx'))) {
      setFile(selectedFile)
      setUploadError('')
      setUploadSuccess(false)
    } else {
      setUploadError('Please select a valid .xlsx file')
      setFile(null)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) return

    try {
      setUploading(true)
      setUploadError('')
      await cashflowService.uploadFile(file)
      
      setUploadSuccess(true)
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      // Reload dashboard data
      await loadDashboard()
      
      // Collapse upload section after successful upload
      setTimeout(() => {
        setUploadCollapsed(true)
      }, 2000)
      
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Upload failed'
      setUploadError(`Error: ${errorMessage}`)
      setUploadSuccess(false)
    } finally {
      setUploading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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
        {/* Upload Section - Collapsible */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Header - Always visible */}
            <div 
              className="p-6 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setUploadCollapsed(!uploadCollapsed)}
            >
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-xl ${data.isRealData ? 'bg-gradient-to-br from-green-400 to-emerald-500' : 'bg-gradient-to-br from-amber-400 to-orange-500'}`}>
                  <CloudArrowUpIcon className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Excel File Upload
                  </h2>
                  <p className="text-sm text-gray-600">
                    {data.isRealData ? 'Using uploaded data' : 'Upload a file to see your cashflow data'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {uploadSuccess && (
                  <span className="text-green-600 text-sm flex items-center bg-green-50 px-3 py-1 rounded-full">
                    <CheckCircleIcon className="h-5 w-5 mr-1" />
                    Uploaded successfully
                  </span>
                )}
                {uploadCollapsed ? (
                  <ChevronDownIcon className="h-6 w-6 text-gray-400" />
                ) : (
                  <ChevronUpIcon className="h-6 w-6 text-gray-400" />
                )}
              </div>
            </div>

            {/* Content - Collapsible */}
            {!uploadCollapsed && (
              <div className="px-6 pb-6 border-t border-gray-100">
                <div className="mt-6">
                  {/* Drag & Drop Zone */}
                  <div
                    className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
                      dragActive
                        ? 'border-indigo-500 bg-indigo-50 scale-[1.02]'
                        : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                    } ${file ? 'bg-green-50 border-green-300' : ''}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx"
                      onChange={handleFileInput}
                      className="hidden"
                    />

                    <div className="space-y-4">
                      <div className="mx-auto w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
                        <ArrowUpTrayIcon className="h-10 w-10 text-indigo-600" />
                      </div>
                      
                      <div>
                        <p className="text-xl font-semibold text-gray-700 mb-2">
                          Drop your Excel file here
                        </p>
                        <p className="text-gray-500">
                          or click to browse • Supports .xlsx files
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* File Info */}
                  {file && (
                    <div className="mt-6 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="p-3 bg-white rounded-xl shadow-sm">
                            <DocumentIcon className="h-8 w-8 text-indigo-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{file.name}</p>
                            <p className="text-sm text-gray-600">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setFile(null)
                            if (fileInputRef.current) {
                              fileInputRef.current.value = ''
                            }
                          }}
                          className="text-gray-400 hover:text-red-600 transition-colors p-2"
                        >
                          <XCircleIcon className="h-6 w-6" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Status Messages */}
                  {uploadError && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3">
                      <XCircleIcon className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-red-700">{uploadError}</p>
                    </div>
                  )}

                  {/* Upload Button */}
                  {file && (
                    <button
                      onClick={handleUpload}
                      disabled={uploading}
                      className={`mt-6 w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-300 ${
                        uploading
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                      }`}
                    >
                      {uploading ? (
                        <div className="flex items-center justify-center space-x-3">
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Processing...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center space-x-2">
                          <CloudArrowUpIcon className="h-6 w-6" />
                          <span>Upload Cashflow Data</span>
                        </div>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

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
              {data.currentMonth.month} 2025 Overview
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