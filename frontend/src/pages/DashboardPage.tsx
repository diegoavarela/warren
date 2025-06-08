import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { cashflowService } from '../services/cashflowService'

interface DashboardData {
  metrics: {
    lowestCashNext6Months: number
    highestCashNext6Months: number
    biggestGainNext6Months: number
    lowestGainNext6Months: number
    revenueYTD: number
    costsYTD: number
  }
  highlights: {
    pastThreeMonths: string[]
    nextSixMonths: string[]
  }
  chartData: any[]
  isRealData?: boolean
}

export function DashboardPage() {
  const { t } = useTranslation()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getMetricColor = (value: number) => {
    return value >= 0 ? 'text-green-600' : 'text-red-600'
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-vortex-green mb-4"></div>
        <p className="text-gray-600">Loading dashboard data...</p>
        <p className="text-sm text-gray-500 mt-2">This may take a few seconds if processing uploaded data</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('dashboard.title')}</h1>
        <p className="mt-1 text-gray-600">{t('dashboard.subtitle')}</p>
        {data && (
          <div className="mt-2">
            <div className="flex items-center space-x-3">
              {data.isRealData ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  ✅ Real Data from Excel File
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  📊 Demo Data - Upload Excel to see real metrics
                </span>
              )}
              <button
                onClick={loadDashboard}
                disabled={loading}
                className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-vortex-green disabled:opacity-50"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-700 mr-1"></div>
                ) : (
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                Refresh Data
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500 mb-2">{t('dashboard.metrics.lowestCash')}</h3>
          <p className={`text-2xl font-bold ${getMetricColor(data.metrics.lowestCashNext6Months)}`}>
            {formatCurrency(data.metrics.lowestCashNext6Months)}
          </p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500 mb-2">{t('dashboard.metrics.highestCash')}</h3>
          <p className={`text-2xl font-bold ${getMetricColor(data.metrics.highestCashNext6Months)}`}>
            {formatCurrency(data.metrics.highestCashNext6Months)}
          </p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500 mb-2">{t('dashboard.metrics.biggestGain')}</h3>
          <p className={`text-2xl font-bold ${getMetricColor(data.metrics.biggestGainNext6Months)}`}>
            {formatCurrency(data.metrics.biggestGainNext6Months)}
          </p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500 mb-2">{t('dashboard.metrics.lowestGain')}</h3>
          <p className={`text-2xl font-bold ${getMetricColor(data.metrics.lowestGainNext6Months)}`}>
            {formatCurrency(data.metrics.lowestGainNext6Months)}
          </p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500 mb-2">{t('dashboard.metrics.revenueYTD')}</h3>
          <p className="text-2xl font-bold text-blue-600">
            {formatCurrency(data.metrics.revenueYTD)}
          </p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500 mb-2">{t('dashboard.metrics.costsYTD')}</h3>
          <p className="text-2xl font-bold text-orange-600">
            {formatCurrency(data.metrics.costsYTD)}
          </p>
        </div>
      </div>

      {/* Simple Chart Placeholder */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('dashboard.chart.title')}</h2>
        <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
          <p className="text-gray-500">Chart will be displayed here</p>
        </div>
      </div>

      {/* Highlights Section - Simplified */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('dashboard.highlights.pastThreeMonths')}
          </h3>
          <ul className="space-y-3">
            {data.highlights.pastThreeMonths.map((highlight, index) => (
              <li key={index} className="text-gray-700 text-sm">
                • {highlight}
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('dashboard.highlights.nextSixMonths')}
          </h3>
          <ul className="space-y-3">
            {data.highlights.nextSixMonths.map((highlight, index) => (
              <li key={index} className="text-gray-700 text-sm">
                • {highlight}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}