import React, { useEffect, useState } from 'react'
import { 
  ClockIcon, 
  ExclamationTriangleIcon,
  ChartBarIcon,
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline'
import { cashflowService } from '../services/cashflowService'

interface RunwayData {
  monthsRemaining: number | null
  runwayDate: Date | null
  currentBalance: number
  averageBurnRate: number
  burnRateTrend: 'accelerating' | 'decelerating' | 'stable'
  confidence: {
    conservative: number | null
    moderate: number | null
    optimistic: number | null
  }
}

export const CashRunwayWidget: React.FC = () => {
  const [runwayData, setRunwayData] = useState<RunwayData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedScenario, setSelectedScenario] = useState<'conservative' | 'moderate' | 'optimistic'>('moderate')

  useEffect(() => {
    loadRunwayData()
  }, [])

  const loadRunwayData = async () => {
    try {
      setLoading(true)
      const response = await cashflowService.getRunwayAnalysis()
      setRunwayData(response.data.data)
    } catch (error) {
      console.error('Failed to load runway analysis:', error)
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
    }).format(Math.abs(amount))
  }

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'N/A'
    const d = new Date(date)
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  const getRunwayMonths = () => {
    if (!runwayData) return null
    return runwayData.confidence[selectedScenario]
  }

  const getRunwayColor = (months: number | null) => {
    if (months === null) return 'text-gray-600'
    if (months > 12) return 'text-green-600'
    if (months > 6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getRunwayBgColor = (months: number | null) => {
    if (months === null) return 'from-gray-50 to-gray-100'
    if (months > 12) return 'from-green-50 to-emerald-100'
    if (months > 6) return 'from-yellow-50 to-amber-100'
    return 'from-red-50 to-pink-100'
  }

  const getTrendIcon = () => {
    if (!runwayData) return null
    
    switch (runwayData.burnRateTrend) {
      case 'accelerating':
        return <ArrowTrendingDownIcon className="h-5 w-5 text-red-500" />
      case 'decelerating':
        return <ArrowTrendingUpIcon className="h-5 w-5 text-green-500" />
      default:
        return <ChartBarIcon className="h-5 w-5 text-gray-500" />
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 animate-pulse">
        <div className="h-32 bg-gray-100 rounded"></div>
      </div>
    )
  }

  if (!runwayData) {
    return null
  }

  const currentMonths = getRunwayMonths()
  const isGeneratingCash = runwayData.averageBurnRate > 0

  return (
    <div className={`bg-gradient-to-br ${getRunwayBgColor(currentMonths)} rounded-2xl p-6 shadow-lg border border-gray-100`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-white rounded-xl shadow-sm">
            <ClockIcon className={`h-8 w-8 ${getRunwayColor(currentMonths)}`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Cash Runway</h3>
            <p className="text-sm text-gray-600">
              {isGeneratingCash ? 'Generating Cash' : 'Months of operation remaining'}
            </p>
          </div>
        </div>
        {getTrendIcon()}
      </div>

      {isGeneratingCash ? (
        <div className="text-center py-4">
          <p className="text-3xl font-bold text-green-600">Cash Positive</p>
          <p className="text-sm text-gray-600 mt-2">
            Generating {formatCurrency(runwayData.averageBurnRate)} per month
          </p>
        </div>
      ) : (
        <>
          <div className="text-center mb-6">
            <p className={`text-5xl font-bold ${getRunwayColor(currentMonths)}`}>
              {currentMonths !== null ? currentMonths : '∞'}
            </p>
            <p className="text-sm text-gray-600 mt-1">months remaining</p>
            {currentMonths !== null && currentMonths > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                Until {formatDate(runwayData.runwayDate)}
              </p>
            )}
          </div>

          {/* Scenario Selector */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium text-gray-600">Scenario</span>
              <span className="text-xs text-gray-500">
                {runwayData.averageBurnRate === 0 
                  ? 'Cash Positive' 
                  : `Burn: ${formatCurrency(runwayData.averageBurnRate)}/mo`}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setSelectedScenario('conservative')}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  selectedScenario === 'conservative'
                    ? 'bg-red-100 text-red-700 shadow-sm'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Conservative
                <span className="block text-xs mt-1">
                  {runwayData.confidence.conservative ?? '∞'} mo
                </span>
              </button>
              <button
                onClick={() => setSelectedScenario('moderate')}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  selectedScenario === 'moderate'
                    ? 'bg-yellow-100 text-yellow-700 shadow-sm'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Moderate
                <span className="block text-xs mt-1">
                  {runwayData.confidence.moderate ?? '∞'} mo
                </span>
              </button>
              <button
                onClick={() => setSelectedScenario('optimistic')}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  selectedScenario === 'optimistic'
                    ? 'bg-green-100 text-green-700 shadow-sm'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Optimistic
                <span className="block text-xs mt-1">
                  {runwayData.confidence.optimistic ?? '∞'} mo
                </span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Current Balance */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Current Balance</span>
          <span className="text-sm font-semibold text-gray-900">
            {formatCurrency(runwayData.currentBalance)}
          </span>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-sm text-gray-600">Burn Trend</span>
          <span className={`text-sm font-semibold capitalize ${
            runwayData.burnRateTrend === 'accelerating' ? 'text-red-600' :
            runwayData.burnRateTrend === 'decelerating' ? 'text-green-600' :
            'text-gray-600'
          }`}>
            {runwayData.burnRateTrend}
          </span>
        </div>
      </div>

      {/* Warning for low runway */}
      {currentMonths !== null && currentMonths <= 6 && currentMonths > 0 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Low Cash Warning</p>
            <p className="text-xs text-red-700 mt-1">
              Consider fundraising or reducing expenses soon
            </p>
          </div>
        </div>
      )}
    </div>
  )
}