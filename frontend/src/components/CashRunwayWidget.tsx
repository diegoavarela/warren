import React, { useEffect, useState } from 'react'
import { 
  ClockIcon, 
  ExclamationTriangleIcon,
  QuestionMarkCircleIcon,
  XMarkIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon
} from '@heroicons/react/24/outline'
import { cashflowService } from '../services/cashflowService'
import { mockWidgetData } from '../services/mockDataService'
import { isMockDataMode } from '../utils/screenshotMode'

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

interface BurnRateDetails {
  threeMonthAverage: number
  sixMonthAverage: number
  twelveMonthAverage: number | null
}

interface CashRunwayWidgetProps {
  currency: 'ARS' | 'USD' | 'EUR' | 'BRL'
  displayUnit: 'actual' | 'thousands' | 'millions' | 'billions'
}

export const CashRunwayWidget: React.FC<CashRunwayWidgetProps> = ({ currency, displayUnit }) => {
  const [runwayData, setRunwayData] = useState<RunwayData | null>(null)
  const [burnRateDetails, setBurnRateDetails] = useState<BurnRateDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedScenario, setSelectedScenario] = useState<'conservative' | 'moderate' | 'optimistic'>('moderate')
  const [showHelpModal, setShowHelpModal] = useState(false)

  useEffect(() => {
    loadRunwayData()
  }, [])

  // Force re-render when currency or displayUnit changes
  useEffect(() => {
    // No need to reload data, just trigger a re-render
  }, [currency, displayUnit])

  const loadRunwayData = async () => {
    try {
      setLoading(true)
      
      if (isMockDataMode()) {
        // Use mock data for screenshots
        setRunwayData(mockWidgetData.runway as any)
        setBurnRateDetails({
          threeMonthAverage: mockWidgetData.burnRate.threeMonthAverage,
          sixMonthAverage: mockWidgetData.burnRate.sixMonthAverage,
          twelveMonthAverage: mockWidgetData.burnRate.twelveMonthAverage
        })
      } else {
        const [runwayResponse, burnRateResponse] = await Promise.all([
          cashflowService.getRunwayAnalysis(),
          cashflowService.getBurnRateAnalysis()
        ])
        setRunwayData(runwayResponse.data.data)
        setBurnRateDetails({
          threeMonthAverage: burnRateResponse.data.data.threeMonthAverage,
          sixMonthAverage: burnRateResponse.data.data.sixMonthAverage,
          twelveMonthAverage: burnRateResponse.data.data.twelveMonthAverage
        })
      }
    } catch (error) {
      console.error('Failed to load runway analysis:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    // Handle invalid/null amounts
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '$0'
    }
    
    let adjustedAmount = amount
    let unitSuffix = ''
    
    // Apply unit conversion
    switch (displayUnit) {
      case 'thousands':
        adjustedAmount = amount / 1000
        unitSuffix = 'K'
        break
      case 'millions':
        adjustedAmount = amount / 1000000
        unitSuffix = 'M'
        break
      case 'billions':
        adjustedAmount = amount / 1000000000
        unitSuffix = 'B'
        break
      default:
        adjustedAmount = amount
        unitSuffix = ''
    }
    
    const localeMap = {
      'ARS': 'es-AR',
      'USD': 'en-US', 
      'EUR': 'de-DE',
      'BRL': 'pt-BR'
    }
    
    try {
      let formatted: string
      
      if (currency === 'ARS') {
        // Handle ARS manually since browser support varies
        const number = new Intl.NumberFormat('es-AR', {
          minimumFractionDigits: displayUnit === 'actual' ? 0 : 1,
          maximumFractionDigits: displayUnit === 'actual' ? 0 : 1,
        }).format(Math.abs(adjustedAmount))
        formatted = `$${number}`
      } else {
        formatted = new Intl.NumberFormat(localeMap[currency], {
          style: 'currency',
          currency: currency,
          minimumFractionDigits: displayUnit === 'actual' ? 0 : 1,
          maximumFractionDigits: displayUnit === 'actual' ? 0 : 1,
        }).format(Math.abs(adjustedAmount))
      }
      
      return unitSuffix ? `${formatted}${unitSuffix}` : formatted
    } catch (error) {
      console.error('Currency formatting error:', error, { amount, currency, displayUnit })
      return `$${Math.abs(adjustedAmount).toFixed(1)}${unitSuffix}`
    }
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

  const getRunwayDate = () => {
    const months = getRunwayMonths()
    if (!months || months <= 0) return null
    const today = new Date()
    const futureDate = new Date(today.getFullYear(), today.getMonth() + months, today.getDate())
    return futureDate
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'accelerating':
        return <ArrowDownIcon className="h-4 w-4 text-red-500" />
      case 'decelerating':
        return <ArrowUpIcon className="h-4 w-4 text-green-500" />
      default:
        return <MinusIcon className="h-4 w-4 text-gray-500" />
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'decelerating':
        return 'text-green-600'
      case 'accelerating':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 animate-pulse">
        <div className="h-48 bg-gray-100 rounded"></div>
      </div>
    )
  }

  if (!runwayData) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <div className="text-center py-8">
          <p className="text-gray-500">No runway data available</p>
        </div>
      </div>
    )
  }

  const currentMonths = getRunwayMonths()
  // When averageBurnRate is 0, we're cash positive (not burning cash)
  // When averageBurnRate > 0, we're burning cash
  const isGeneratingCash = runwayData.averageBurnRate === 0

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className={`p-3 rounded-xl ${isGeneratingCash ? 'bg-green-100' : 'bg-orange-100'}`}>
            <ClockIcon className={`h-8 w-8 ${isGeneratingCash ? 'text-green-600' : 'text-orange-600'}`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Cash Runway Analysis
            </h3>
            <p className={`text-sm font-medium flex items-center space-x-1 ${getTrendColor(runwayData.burnRateTrend)}`}>
              {getTrendIcon(runwayData.burnRateTrend)}
              <span className="capitalize">{runwayData.burnRateTrend}</span>
              <span className="text-gray-600">
                ({isGeneratingCash ? 'Generating' : 'Burning'} cash)
              </span>
            </p>
          </div>
        </div>
        
        <button
          onClick={() => setShowHelpModal(true)}
          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title="How cash runway is calculated"
        >
          <QuestionMarkCircleIcon className="h-5 w-5" />
        </button>
      </div>

      {isGeneratingCash ? (
        <div className="space-y-4">
          {/* Current Status */}
          <div className="p-4 rounded-xl bg-green-50">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Current Status</span>
              <span className="text-2xl font-bold text-green-700">Cash Positive</span>
            </div>
            
            {/* Formula Display */}
            <div className="mb-3 p-2 bg-white/80 rounded-lg border border-gray-200">
              <div className="text-xs font-mono text-gray-700 text-center">
                <span className="text-green-600">Inflow &gt; Outflow = Cash Positive ✓</span>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Monthly Generation</span>
                <span className="text-sm font-medium text-green-600">
                  +{formatCurrency(runwayData.averageBurnRate)}
                </span>
              </div>
            </div>
          </div>
          
          {/* Current Balance */}
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">Current Balance</span>
            <span className="text-sm font-semibold text-gray-900">
              {formatCurrency(runwayData.currentBalance)}
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Current Runway */}
          <div className={`p-4 rounded-xl ${
            currentMonths !== null && currentMonths <= 6 ? 'bg-red-50' : 
            currentMonths !== null && currentMonths <= 12 ? 'bg-yellow-50' : 
            'bg-green-50'
          }`}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Current Runway</span>
              <span className={`text-2xl font-bold ${
                currentMonths !== null && currentMonths <= 6 ? 'text-red-700' :
                currentMonths !== null && currentMonths <= 12 ? 'text-yellow-700' :
                'text-green-700'
              }`}>
                {currentMonths !== null ? `${currentMonths} months` : '∞'}
              </span>
            </div>
            
            {currentMonths !== null && currentMonths > 0 && (
              <p className="text-xs text-gray-600 mb-3">
                Until {formatDate(getRunwayDate())}
              </p>
            )}
            
            {/* Formula Display */}
            <div className="mb-3 p-2 bg-white/80 rounded-lg border border-gray-200">
              <div className="grid grid-cols-5 gap-2 items-center text-center">
                <div className="col-span-1">
                  <p className="text-xs text-gray-600">Current Cash</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {formatCurrency(runwayData.currentBalance)}
                  </p>
                </div>
                <div className="col-span-1 text-lg text-gray-500">÷</div>
                <div className="col-span-1">
                  <p className="text-xs text-gray-600">Burn Rate</p>
                  <p className="text-sm font-semibold text-orange-600">
                    {formatCurrency(runwayData.averageBurnRate)}
                  </p>
                </div>
                <div className="col-span-1 text-lg text-gray-500">=</div>
                <div className="col-span-1">
                  <p className="text-xs text-gray-600">Runway</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {currentMonths ?? '∞'} mo
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Scenario Analysis */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-gray-600">Scenario Analysis</span>
              <span className="text-xs text-gray-500">
                {runwayData.confidence.conservative === null && runwayData.confidence.moderate === null && runwayData.confidence.optimistic === null
                  ? 'Cash positive - no scenarios'
                  : 'Weighted: 60% × 3mo + 40% × 6mo'
                }
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setSelectedScenario('conservative')}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  selectedScenario === 'conservative'
                    ? 'bg-red-100 text-red-800 border border-red-300'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <div className="font-semibold">Conservative</div>
                <div className="text-xs mt-1 font-normal">
                  {runwayData.confidence.conservative ?? '∞'} mo
                </div>
                <div className="text-xs mt-0.5 opacity-70">
                  Max burn +20%
                </div>
              </button>
              <button
                onClick={() => setSelectedScenario('moderate')}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  selectedScenario === 'moderate'
                    ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <div className="font-semibold">Moderate</div>
                <div className="text-xs mt-1 font-normal">
                  {runwayData.confidence.moderate ?? '∞'} mo
                </div>
                <div className="text-xs mt-0.5 opacity-70">
                  Weighted avg
                </div>
              </button>
              <button
                onClick={() => setSelectedScenario('optimistic')}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  selectedScenario === 'optimistic'
                    ? 'bg-green-100 text-green-800 border border-green-300'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <div className="font-semibold">Optimistic</div>
                <div className="text-xs mt-1 font-normal">
                  {runwayData.confidence.optimistic ?? '∞'} mo
                </div>
                <div className="text-xs mt-0.5 opacity-70">
                  Min burn -20%
                </div>
              </button>
            </div>
          </div>
          
          {/* Averages */}
          <div className="grid grid-cols-1 gap-3">
            {burnRateDetails && (
              <>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">3-Month Average</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {burnRateDetails.threeMonthAverage === 0 ? 'Cash Positive' : formatCurrency(burnRateDetails.threeMonthAverage)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">6-Month Average</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {burnRateDetails.sixMonthAverage === 0 ? 'Cash Positive' : formatCurrency(burnRateDetails.sixMonthAverage)}
                  </span>
                </div>
                {burnRateDetails.twelveMonthAverage !== null && (
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">12-Month Average</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {burnRateDetails.twelveMonthAverage === 0 ? 'Cash Positive' : formatCurrency(burnRateDetails.twelveMonthAverage)}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Warning for low runway */}
      {currentMonths !== null && currentMonths <= 6 && currentMonths > 0 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Low Cash Warning</p>
            <p className="text-xs text-red-600 mt-1">
              Consider fundraising or reducing outflow soon
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
                  {burnRateDetails && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">3-Month Avg Burn:</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {burnRateDetails.threeMonthAverage === 0 ? 'Cash Positive' : formatCurrency(burnRateDetails.threeMonthAverage) + '/mo'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">6-Month Avg Burn:</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {burnRateDetails.sixMonthAverage === 0 ? 'Cash Positive' : formatCurrency(burnRateDetails.sixMonthAverage) + '/mo'}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Weighted Avg Burn:</span>
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
                    <div className="mt-2 p-2 bg-red-50 rounded text-xs">
                      {burnRateDetails ? (
                        <div className="space-y-1">
                          <div className="font-mono">
                            Max({formatCurrency(burnRateDetails.threeMonthAverage)}, {formatCurrency(burnRateDetails.sixMonthAverage)}) × 1.2
                          </div>
                          <div className="font-mono">
                            = {formatCurrency(Math.max(burnRateDetails.threeMonthAverage, burnRateDetails.sixMonthAverage) * 1.2)}
                          </div>
                        </div>
                      ) : (
                        <span className="font-mono">Max(3mo, 6mo) × 1.2 = Conservative Burn</span>
                      )}
                    </div>
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
                    <div className="mt-2 p-2 bg-yellow-50 rounded text-xs">
                      {burnRateDetails ? (
                        <div className="space-y-1">
                          <div className="font-mono">
                            ({formatCurrency(burnRateDetails.threeMonthAverage)} × 0.6) + ({formatCurrency(burnRateDetails.sixMonthAverage)} × 0.4)
                          </div>
                          <div className="font-mono">
                            = {formatCurrency((burnRateDetails.threeMonthAverage * 0.6) + (burnRateDetails.sixMonthAverage * 0.4))}
                          </div>
                        </div>
                      ) : (
                        <span className="font-mono">(3mo × 0.6) + (6mo × 0.4) = Moderate Burn</span>
                      )}
                    </div>
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
                    <div className="mt-2 p-2 bg-green-50 rounded text-xs">
                      {burnRateDetails ? (
                        <div className="space-y-1">
                          <div className="font-mono">
                            Min({formatCurrency(burnRateDetails.threeMonthAverage)}, {formatCurrency(burnRateDetails.sixMonthAverage)}) × 0.8
                          </div>
                          <div className="font-mono">
                            = {formatCurrency(Math.min(burnRateDetails.threeMonthAverage, burnRateDetails.sixMonthAverage) * 0.8)}
                          </div>
                        </div>
                      ) : (
                        <span className="font-mono">Min(3mo, 6mo) × 0.8 = Optimistic Burn</span>
                      )}
                    </div>
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