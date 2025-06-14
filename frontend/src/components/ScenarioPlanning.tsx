import React, { useState, useEffect } from 'react'
import { 
  AdjustmentsHorizontalIcon,
  ChartBarIcon,
  PlayIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  QuestionMarkCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { Line } from 'react-chartjs-2'
import { cashflowService } from '../services/cashflowService'

interface ScenarioParameters {
  inflowChange: number
  outflowChange: number
  startingMonth: number
  duration: number
}

interface ScenarioResult {
  monthlyProjections: Array<{
    month: string
    inflow: number
    outflows: number
    netCashFlow: number
    endingBalance: number
  }>
  summary: {
    endingCash: number
    totalInflow: number
    totalOutflows: number
    netCashFlow: number
    monthsOfRunway: number | null
    runOutDate: Date | null
  }
}

export const ScenarioPlanning: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [scenarios, setScenarios] = useState({
    base: { inflowChange: 0, outflowChange: 0, startingMonth: 0, duration: 12 },
    best: { inflowChange: 20, outflowChange: -10, startingMonth: 0, duration: 12 },
    worst: { inflowChange: -20, outflowChange: 10, startingMonth: 0, duration: 12 }
  })
  const [results, setResults] = useState<{
    base: ScenarioResult
    best: ScenarioResult
    worst: ScenarioResult
  } | null>(null)
  const [selectedScenario, setSelectedScenario] = useState<'base' | 'best' | 'worst'>('base')
  const [showResults, setShowResults] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)

  const runScenarios = async () => {
    try {
      setLoading(true)
      const response = await cashflowService.getScenarioAnalysis(scenarios)
      setResults(response.data.data)
      setShowResults(true)
    } catch (error) {
      console.error('Failed to run scenarios:', error)
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

  const updateScenario = (
    scenario: 'base' | 'best' | 'worst',
    field: keyof ScenarioParameters,
    value: number
  ) => {
    setScenarios(prev => ({
      ...prev,
      [scenario]: {
        ...prev[scenario],
        [field]: value
      }
    }))
  }

  const getChartData = () => {
    if (!results) return null

    const currentResult = results[selectedScenario]
    
    return {
      labels: currentResult.monthlyProjections.map(p => p.month),
      datasets: [
        {
          label: 'Cash Balance',
          data: currentResult.monthlyProjections.map(p => p.endingBalance),
          borderColor: selectedScenario === 'best' ? '#10B981' : 
                      selectedScenario === 'worst' ? '#EF4444' : '#6366F1',
          backgroundColor: selectedScenario === 'best' ? 'rgba(16, 185, 129, 0.1)' : 
                          selectedScenario === 'worst' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(99, 102, 241, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true
        }
      ]
    }
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return `Balance: ${formatCurrency(context.parsed.y)}`
          }
        }
      }
    },
    scales: {
      y: {
        ticks: {
          callback: (value: any) => formatCurrency(value)
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  }

  const resetScenarios = () => {
    setScenarios({
      base: { inflowChange: 0, outflowChange: 0, startingMonth: 0, duration: 12 },
      best: { inflowChange: 20, outflowChange: -10, startingMonth: 0, duration: 12 },
      worst: { inflowChange: -20, outflowChange: 10, startingMonth: 0, duration: 12 }
    })
    setShowResults(false)
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-indigo-100 rounded-xl">
              <AdjustmentsHorizontalIcon className="h-8 w-8 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Scenario Planning</h3>
              <p className="text-sm text-gray-600">Model different revenue and outflow scenarios</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowHelpModal(true)}
              className="p-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
              title="How scenario planning works"
            >
              <QuestionMarkCircleIcon className="h-5 w-5" />
            </button>
            <button
              onClick={resetScenarios}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Reset scenarios"
            >
              <ArrowPathIcon className="h-5 w-5" />
            </button>
            <button
              onClick={runScenarios}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400"
            >
              {loading ? (
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <PlayIcon className="h-5 w-5 mr-2" />
                  Run Scenarios
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {!showResults ? (
          <div className="space-y-6">
            {/* Scenario Inputs */}
            {(['base', 'best', 'worst'] as const).map(scenario => (
              <div key={scenario} className="border border-gray-200 rounded-xl p-4">
                <h4 className="font-medium text-gray-900 mb-4 capitalize flex items-center">
                  <span className={`w-3 h-3 rounded-full mr-2 ${
                    scenario === 'best' ? 'bg-green-500' :
                    scenario === 'worst' ? 'bg-red-500' :
                    'bg-indigo-500'
                  }`}></span>
                  {scenario} Case Scenario
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600">Inflow Change (%)</label>
                    <input
                      type="number"
                      min="-100"
                      max="100"
                      value={scenarios[scenario].inflowChange}
                      onChange={(e) => updateScenario(scenario, 'inflowChange', parseFloat(e.target.value) || 0)}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-600">Outflow Change (%)</label>
                    <input
                      type="number"
                      min="-100"
                      max="100"
                      value={scenarios[scenario].outflowChange}
                      onChange={(e) => updateScenario(scenario, 'outflowChange', parseFloat(e.target.value) || 0)}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-600">Starting Month</label>
                    <select
                      value={scenarios[scenario].startingMonth}
                      onChange={(e) => updateScenario(scenario, 'startingMonth', parseInt(e.target.value))}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {[...Array(12)].map((_, i) => (
                        <option key={i} value={i}>Month {i + 1}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-600">Duration (months)</label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={scenarios[scenario].duration}
                      onChange={(e) => updateScenario(scenario, 'duration', parseInt(e.target.value) || 1)}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            ))}

            <div className="text-center text-sm text-gray-500 pt-4">
              Adjust the parameters above and click "Run Scenarios" to see projections
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Scenario Tabs */}
            <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
              {(['base', 'best', 'worst'] as const).map(scenario => (
                <button
                  key={scenario}
                  onClick={() => setSelectedScenario(scenario)}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                    selectedScenario === scenario
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {scenario.charAt(0).toUpperCase() + scenario.slice(1)} Case
                </button>
              ))}
            </div>

            {/* Base Values Info */}
            {results && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg flex items-start space-x-2">
                <QuestionMarkCircleIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-blue-700">
                  <p className="font-medium mb-1">Current base values (3-month average):</p>
                  <div className="flex space-x-4">
                    <span>Inflow: {formatCurrency(results.base.monthlyProjections[0]?.inflow || 0)}/mo</span>
                    <span>Outflows: {formatCurrency(results.base.monthlyProjections[0]?.outflows || 0)}/mo</span>
                    <span>Starting Cash: {formatCurrency((results.base.monthlyProjections[0]?.endingBalance || 0) - (results.base.monthlyProjections[0]?.netCashFlow || 0))}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Results Summary */}
            {results && (
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-xl ${
                  results[selectedScenario].summary.endingCash >= 0 
                    ? 'bg-green-50' 
                    : 'bg-red-50'
                }`}>
                  <p className="text-sm text-gray-600">Ending Cash (12 months)</p>
                  <p className={`text-2xl font-bold ${
                    results[selectedScenario].summary.endingCash >= 0 
                      ? 'text-green-700' 
                      : 'text-red-700'
                  }`}>
                    {formatCurrency(results[selectedScenario].summary.endingCash)}
                  </p>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-600">Runway</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {results[selectedScenario].summary.monthsOfRunway !== null
                      ? `${results[selectedScenario].summary.monthsOfRunway} months`
                      : 'Cash Positive'}
                  </p>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-600">Net Cash Flow</p>
                  <p className={`text-lg font-semibold ${
                    results[selectedScenario].summary.netCashFlow >= 0 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {formatCurrency(results[selectedScenario].summary.netCashFlow)}
                  </p>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-600">Run Out Date</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatDate(results[selectedScenario].summary.runOutDate)}
                  </p>
                </div>
              </div>
            )}

            {/* Chart */}
            <div className="h-64 mt-6">
              {getChartData() && <Line data={getChartData()!} options={chartOptions} />}
            </div>

            {/* Scenario Comparison */}
            <div className="mt-6 p-4 bg-gray-50 rounded-xl">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Scenario Comparison</h4>
              <div className="space-y-2">
                {results && (['best', 'base', 'worst'] as const).map(scenario => (
                  <div key={scenario} className="flex items-center justify-between text-sm">
                    <span className="capitalize flex items-center">
                      <span className={`w-2 h-2 rounded-full mr-2 ${
                        scenario === 'best' ? 'bg-green-500' :
                        scenario === 'worst' ? 'bg-red-500' :
                        'bg-indigo-500'
                      }`}></span>
                      {scenario} Case
                    </span>
                    <span className={`font-medium ${
                      results[scenario].summary.endingCash >= 0 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {formatCurrency(results[scenario].summary.endingCash)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">How Scenario Planning Works</h2>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 Understanding the Math</h3>
                <div className="bg-blue-50 rounded-xl p-4 space-y-2">
                  <p className="text-sm text-gray-700">Warren uses your actual financial data to project future cash flow:</p>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 ml-2">
                    <li><strong>Starting Point:</strong> Your current cash balance</li>
                    <li><strong>Base Values:</strong> Average of your last 3 months of inflow and outflows</li>
                    <li><strong>Projections:</strong> 12 months forward from today</li>
                  </ol>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">🧮 The Calculation</h3>
                <div className="bg-gray-50 rounded-xl p-4 font-mono text-sm">
                  <p className="text-gray-700 mb-2">For each month:</p>
                  <p className="text-indigo-600">Monthly Inflow = Base Inflow × (1 + Inflow Change %)</p>
                  <p className="text-red-600">Monthly Outflows = Base Outflows × (1 + Outflow Change %)</p>
                  <p className="text-green-600">Net Cash Flow = Monthly Inflow - Monthly Outflows</p>
                  <p className="text-blue-600">New Balance = Previous Balance + Net Cash Flow</p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 Example</h3>
                <div className="bg-yellow-50 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-medium text-gray-700">Let's say your current situation is:</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Current Cash: $500,000</li>
                    <li>• Average Monthly Inflow: $100,000</li>
                    <li>• Average Monthly Outflows: $95,000</li>
                    <li>• Monthly Cash Generation: +$5,000</li>
                  </ul>
                  
                  <div className="border-t border-yellow-200 pt-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">Base Case (0% changes):</p>
                    <p className="text-sm text-gray-600">Month 1: $500,000 + $5,000 = $505,000</p>
                    <p className="text-sm text-gray-600">Month 12: $500,000 + ($5,000 × 12) = $560,000 ✅</p>
                  </div>
                  
                  <div className="border-t border-yellow-200 pt-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">Worst Case (-10% inflow, +10% outflows):</p>
                    <p className="text-sm text-gray-600">New Inflow: $90,000 | New Outflows: $104,500</p>
                    <p className="text-sm text-gray-600">Monthly Burn: -$14,500</p>
                    <p className="text-sm text-red-600">Runs out in: $500,000 ÷ $14,500 = ~34 months</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">⚠️ Why You Might Run Out of Cash</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-red-600 font-bold text-sm">1</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Low Cash Reserves</p>
                      <p className="text-sm text-gray-600">Even if profitable, low starting cash means little buffer for changes</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-red-600 font-bold text-sm">2</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Thin Margins</p>
                      <p className="text-sm text-gray-600">Small profit margins mean small changes have big impacts</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-red-600 font-bold text-sm">3</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Compound Effects</p>
                      <p className="text-sm text-gray-600">Inflow down + outflows up = double impact on cash flow</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">🎯 Using Scenario Planning</h3>
                <div className="bg-green-50 rounded-xl p-4 space-y-2">
                  <p className="text-sm text-gray-700 font-medium">Scenario planning helps you:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 ml-2">
                    <li>Test your business resilience to market changes</li>
                    <li>Identify when to raise capital before it's urgent</li>
                    <li>Plan cost reductions proactively</li>
                    <li>Set realistic growth targets based on cash constraints</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}