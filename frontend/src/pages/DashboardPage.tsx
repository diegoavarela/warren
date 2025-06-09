import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { cashflowService } from '../services/cashflowService'
import { 
  ArrowUpTrayIcon, 
  DocumentIcon, 
  CheckCircleIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline'

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
  highlights: {
    pastThreeMonths: string[]
    nextSixMonths: string[]
  }
  chartData: Array<{
    date: string
    month?: string
    revenue: number
    costs: number
    cashflow: number
  }>
  isRealData?: boolean
}

export function DashboardPage() {
  const { t } = useTranslation()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Upload state
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
      console.log('Loading dashboard data...')
      const response = await cashflowService.getDashboard()
      console.log('Dashboard response:', response.data)
      setData(response.data.data)
    } catch (err: any) {
      console.error('Dashboard error:', err)
      setError(err.response?.data?.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    // Format as Argentine Pesos with proper thousands separator
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

  // Upload handlers
  const handleFile = (selectedFile: File) => {
    if (selectedFile && (selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || selectedFile.name.endsWith('.xlsx'))) {
      setFile(selectedFile)
      setUploadError('')
      setUploadSuccess(false)
    } else {
      setUploadError('Only .xlsx files are supported')
      setFile(null)
    }
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
      const response = await cashflowService.uploadFile(file)
      setUploadSuccess(true)
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      // Reload dashboard data immediately
      await loadDashboard()
      
      // Collapse upload section after successful upload
      setTimeout(() => {
        setUploadCollapsed(true)
      }, 2000)
      
    } catch (err: any) {
      console.error('Upload error:', err)
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

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-vortex-green border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-vortex-green/20 rounded-full mx-auto"></div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Financial Dashboard</h3>
          <p className="text-gray-600">Preparing your financial insights...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="relative inline-block">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-vortex-green bg-clip-text text-transparent mb-4">
              Financial Dashboard
            </h1>
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-vortex-green to-emerald-400 rounded-full animate-pulse"></div>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">Real-time insights into your company's cashflow and financial performance</p>
        </div>

        {/* Upload Section - Collapsible */}
        <div className="mb-12">
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden transition-all duration-500">
            {/* Header - Always Visible */}
            <div 
              className={`p-6 ${uploadCollapsed ? 'cursor-pointer hover:bg-gray-50/50' : ''} transition-colors`}
              onClick={() => uploadCollapsed && setUploadCollapsed(false)}
            >
              <div className="flex items-center justify-between">
                <div className={`${uploadCollapsed ? '' : 'text-center w-full'}`}>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Financial Data</h2>
                  {!uploadCollapsed && <p className="text-gray-600">Upload your Excel file to see real-time financial metrics</p>}
                </div>
                {uploadCollapsed && (
                  <div className="flex items-center space-x-4">
                    {data?.isRealData && (
                      <span className="text-sm text-green-600 font-medium">
                        ✓ Data Loaded
                      </span>
                    )}
                    <button
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        setUploadCollapsed(false)
                      }}
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Collapsible Content */}
            <div className={`transition-all duration-500 ${uploadCollapsed ? 'max-h-0' : 'max-h-[800px]'} overflow-hidden`}>
              <div className="p-8 pt-0">
                {/* Drag & Drop Area */}
                <div
              className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer group ${
                dragActive
                  ? 'border-vortex-green bg-vortex-green/5 scale-105'
                  : 'border-gray-300 hover:border-vortex-green hover:bg-vortex-green/5'
              }`}
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
                <div className="relative">
                  <ArrowUpTrayIcon className="mx-auto h-16 w-16 text-vortex-green group-hover:scale-110 transition-transform duration-300" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full animate-bounce opacity-75"></div>
                </div>
                
                <div>
                  <p className="text-xl font-semibold text-gray-700 mb-2">
                    Drop your Excel file here or click to browse
                  </p>
                  <p className="text-gray-500">
                    Supports .xlsx files with cashflow data
                  </p>
                </div>
              </div>
            </div>

            {/* File Info */}
            {file && (
              <div className="mt-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-green-100 rounded-xl">
                      <DocumentIcon className="h-8 w-8 text-green-600" />
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
                    className="px-4 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}

            {/* Upload Button */}
            {file && !uploadSuccess && (
              <div className="mt-6">
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="w-full bg-gradient-to-r from-vortex-green to-emerald-500 text-white py-4 px-6 rounded-2xl font-semibold text-lg hover:from-vortex-green-dark hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  {uploading ? (
                    <div className="flex items-center justify-center space-x-3">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Processing...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-3">
                      <ArrowUpTrayIcon className="w-6 h-6" />
                      <span>Upload & Analyze</span>
                    </div>
                  )}
                </button>
              </div>
            )}

            {/* Upload Messages */}
            {uploadSuccess && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center space-x-3">
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                  <p className="text-green-800 font-medium">File uploaded successfully! Dashboard updated with real data.</p>
                </div>
              </div>
            )}

            {uploadError && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-800">{uploadError}</p>
              </div>
            )}
              </div>
            </div>
          </div>
        </div>

        {/* Data Status & Refresh */}
        {data && (
          <div className="mb-8 flex items-center justify-center space-x-4">
            {data.isRealData ? (
              <div className="flex items-center space-x-3 px-6 py-3 bg-green-50 border border-green-200 rounded-full">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-800 font-medium">Live Data Active</span>
              </div>
            ) : (
              <div className="flex items-center space-x-3 px-6 py-3 bg-amber-50 border border-amber-200 rounded-full">
                <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                <span className="text-amber-800 font-medium">Demo Data - Upload Excel for real metrics</span>
              </div>
            )}
            <button
              onClick={loadDashboard}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-full hover:bg-white transition-all duration-200 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-vortex-green border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-4 h-4 text-vortex-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              <span className="text-sm font-medium text-gray-700">Refresh</span>
            </button>
          </div>
        )}

        {/* Current Month Section */}
        {data && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              {data.currentMonth.month} 2025 - Current Month Statistics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              {/* Total Income */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-green-100 rounded-xl">
                    <ArrowTrendingUpIcon className="h-8 w-8 text-green-600" />
                  </div>
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">CURRENT</span>
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">Total Income</h3>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(data.currentMonth.totalIncome)}
                </p>
              </div>

              {/* Total Expense */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-red-100 rounded-xl">
                    <ArrowTrendingDownIcon className="h-8 w-8 text-red-600" />
                  </div>
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">CURRENT</span>
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">Total Expense</h3>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(data.currentMonth.totalExpense)}
                </p>
              </div>

              {/* Final Balance */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <CurrencyDollarIcon className="h-8 w-8 text-blue-600" />
                  </div>
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">CURRENT</span>
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">Final Balance</h3>
                <p className={`text-2xl font-bold ${getMetricColor(data.currentMonth.finalBalance)}`}>
                  {formatCurrency(data.currentMonth.finalBalance)}
                </p>
              </div>

              {/* Lowest Balance */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-orange-100 rounded-xl">
                    <ChartBarIcon className="h-8 w-8 text-orange-600" />
                  </div>
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">CURRENT</span>
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">Lowest Balance</h3>
                <p className={`text-2xl font-bold ${getMetricColor(data.currentMonth.lowestBalance)}`}>
                  {formatCurrency(data.currentMonth.lowestBalance)}
                </p>
              </div>

              {/* Monthly Generation */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-purple-100 rounded-xl">
                    <ChartBarIcon className="h-8 w-8 text-purple-600" />
                  </div>
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">CURRENT</span>
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">Monthly Cash Generation</h3>
                <p className={`text-2xl font-bold ${getMetricColor(data.currentMonth.monthlyGeneration)}`}>
                  {formatCurrency(data.currentMonth.monthlyGeneration)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Year-to-Date Section */}
        {data && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Year-to-Date (January - {data.currentMonth.month} 2025)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* YTD Income */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-emerald-100 rounded-xl">
                    <CurrencyDollarIcon className="h-8 w-8 text-emerald-600" />
                  </div>
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">YTD</span>
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">Total Income YTD</h3>
                <p className="text-3xl font-bold text-emerald-600">
                  {formatCurrency(data.yearToDate.totalIncome)}
                </p>
              </div>

              {/* YTD Expense */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-rose-100 rounded-xl">
                    <CurrencyDollarIcon className="h-8 w-8 text-rose-600" />
                  </div>
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">YTD</span>
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">Total Expense YTD</h3>
                <p className="text-3xl font-bold text-rose-600">
                  {formatCurrency(data.yearToDate.totalExpense)}
                </p>
              </div>

              {/* YTD Balance */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-indigo-100 rounded-xl">
                    <CurrencyDollarIcon className="h-8 w-8 text-indigo-600" />
                  </div>
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">YTD</span>
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">Net Balance YTD</h3>
                <p className={`text-3xl font-bold ${getMetricColor(data.yearToDate.totalBalance)}`}>
                  {formatCurrency(data.yearToDate.totalBalance)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Cashflow Trends Chart */}
        {data && (
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/20 mb-12">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Cashflow Trends</h2>
                <p className="text-gray-600">Monthly cashflow analysis</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-vortex-green to-emerald-400 rounded-xl">
                <ChartBarIcon className="h-8 w-8 text-white" />
              </div>
            </div>
            
            {data.chartData && data.chartData.length > 0 ? (
              <div className="space-y-6">
                {/* Chart Data Table */}
                <div className="overflow-hidden">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.chartData.slice(0, 6).map((item, index) => (
                      <div key={index} className="bg-gradient-to-r from-gray-50 to-white p-4 rounded-xl border border-gray-200">
                        <div className="text-sm font-medium text-gray-500 mb-2">
                          {item.month ? `${item.month} ${item.date.split('-')[0]}` : new Date(item.date + '-01').toLocaleDateString('es-AR', { 
                            year: 'numeric', 
                            month: 'long' 
                          })}
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-600">Total Income:</span>
                            <span className="text-sm font-semibold text-blue-600">
                              {formatCurrency(item.revenue || 0)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-600">Total Expense:</span>
                            <span className="text-sm font-semibold text-red-600">
                              {formatCurrency(item.costs || 0)}
                            </span>
                          </div>
                          <div className="flex justify-between border-t pt-2">
                            <span className="text-xs text-gray-600">Net:</span>
                            <span className={`text-sm font-bold ${getMetricColor(item.cashflow || 0)}`}>
                              {formatCurrency(item.cashflow || 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-64 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl flex items-center justify-center">
                <div className="text-center">
                  <ChartBarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No chart data available</p>
                  <p className="text-sm text-gray-400">Upload your Excel file to see cashflow trends</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Highlights Section */}
        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Past Performance */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/20">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Recent Performance</h3>
              </div>
              <div className="space-y-4">
                {data.highlights.pastThreeMonths.map((highlight, index) => (
                  <div key={index} className="flex items-start space-x-3 p-4 bg-blue-50 rounded-xl">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-gray-700 text-sm leading-relaxed">{highlight}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Future Projections */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/20">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-3 bg-amber-100 rounded-xl">
                  <svg className="h-6 w-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Future Outlook</h3>
              </div>
              <div className="space-y-4">
                {data.highlights.nextSixMonths.map((highlight, index) => {
                  // Check if the highlight contains negative values or bad news
                  const isNegative = highlight.includes('-') || highlight.toLowerCase().includes('worst') || highlight.toLowerCase().includes('negative');
                  const bgColor = isNegative ? 'bg-red-50' : 'bg-green-50';
                  const dotColor = isNegative ? 'bg-red-500' : 'bg-green-500';
                  
                  return (
                    <div key={index} className={`flex items-start space-x-3 p-4 ${bgColor} rounded-xl`}>
                      <div className={`w-2 h-2 ${dotColor} rounded-full mt-2 flex-shrink-0`}></div>
                      <p className="text-gray-700 text-sm leading-relaxed">{highlight}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Loading State for Dashboard */}
        {!data && !error && (
          <div className="text-center py-16">
            <div className="relative inline-block mb-6">
              <div className="w-16 h-16 border-4 border-vortex-green border-t-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-16 h-16 border-4 border-vortex-green/20 rounded-full"></div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Dashboard</h3>
            <p className="text-gray-600">Fetching your financial data...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-16">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-8 max-w-md mx-auto">
              <div className="text-red-600 mb-4">
                <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Data</h3>
              <p className="text-red-700">{error}</p>
              <button
                onClick={loadDashboard}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}