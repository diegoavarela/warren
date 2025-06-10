import React, { useEffect, useState } from 'react'
import { 
  ClockIcon, 
  ExclamationTriangleIcon,
  ChartBarIcon,
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  QuestionMarkCircleIcon,
  XMarkIcon
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
  const [showHelpModal, setShowHelpModal] = useState(false)

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
        <div className="flex items-center space-x-2">
          {getTrendIcon()}
          <button
            onClick={() => setShowHelpModal(true)}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-white/50 rounded-lg transition-colors"
            title="How cash runway is calculated"
          >
            <QuestionMarkCircleIcon className="h-5 w-5" />
          </button>
        </div>
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

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Understanding Cash Runway</h2>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">⏱️ What is Cash Runway?</h3>
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700 mb-2">
                    Cash runway tells you <strong>how many months your company can operate</strong> before running out of cash, 
                    based on your current burn rate.
                  </p>
                  <div className="mt-3 p-3 bg-white rounded-lg">
                    <p className="text-sm font-mono text-gray-800">
                      Cash Runway = Current Cash Balance ÷ Monthly Burn Rate
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 Your Current Numbers</h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Current Cash Balance:</span>
                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(runwayData?.currentBalance || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Average Burn Rate:</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {runwayData?.averageBurnRate === 0 ? 'Cash Positive' : formatCurrency(runwayData?.averageBurnRate || 0) + '/mo'}
                    </span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Runway:</span>
                      <span className="text-sm font-bold text-gray-900">
                        {runwayData?.monthsRemaining === null ? 'Infinite (Cash Positive)' : `${runwayData.monthsRemaining} months`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">🎯 Three Scenarios Explained</h3>
                <div className="space-y-3">
                  <div className="border-l-4 border-red-500 pl-4">
                    <h4 className="text-sm font-semibold text-gray-900">Conservative (Worst Case)</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Uses your highest burn rate from recent months + 20% buffer.
                      Shows: <strong>{runwayData?.confidence.conservative || 'Infinite'} months</strong>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Assumes things get worse - good for risk planning
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-yellow-500 pl-4">
                    <h4 className="text-sm font-semibold text-gray-900">Moderate (Expected)</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Weighted average: 60% last 3 months + 40% last 6 months.
                      Shows: <strong>{runwayData?.confidence.moderate || 'Infinite'} months</strong>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Most realistic projection based on recent trends
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-green-500 pl-4">
                    <h4 className="text-sm font-semibold text-gray-900">Optimistic (Best Case)</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Uses your lowest burn rate from recent months - 20% improvement.
                      Shows: <strong>{runwayData?.confidence.optimistic || 'Infinite'} months</strong>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Assumes improvements - useful for growth planning
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📈 Burn Rate Trend</h3>
                <div className="bg-yellow-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700 mb-3">
                    Your burn rate is <strong>{runwayData?.burnRateTrend || 'stable'}</strong>:
                  </p>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">•</span>
                      <div>
                        <strong>Decelerating:</strong> Burning less cash over time (good!) - runway extends
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-yellow-500 mr-2">•</span>
                      <div>
                        <strong>Stable:</strong> Consistent burn rate - predictable runway
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-red-500 mr-2">•</span>
                      <div>
                        <strong>Accelerating:</strong> Burning more cash over time (concerning) - runway shortens
                      </div>
                    </li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">⚡ Color Indicators</h3>
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span className="text-sm text-gray-600"><strong>Green:</strong> &gt;12 months runway (healthy)</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                    <span className="text-sm text-gray-600"><strong>Yellow:</strong> 6-12 months (plan ahead)</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 bg-red-500 rounded"></div>
                    <span className="text-sm text-gray-600"><strong>Red:</strong> &lt;6 months (take action)</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 bg-gray-500 rounded"></div>
                    <span className="text-sm text-gray-600"><strong>Gray:</strong> Cash positive (no burn)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}