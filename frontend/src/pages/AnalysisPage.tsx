import React, { useState, useEffect, useRef } from 'react'
import {
  SparklesIcon,
  PaperAirplaneIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  BanknotesIcon,
  CalendarIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { analysisService, AnalysisResponse, DataSummary } from '../services/analysisService'
import { InteractiveChart } from '../components/InteractiveChart'
import { InteractiveTable } from '../components/InteractiveTable'
import { DrillDownModal } from '../components/DrillDownModal'
import { FollowUpQuestions } from '../components/FollowUpQuestions'

interface QueryHistoryItem {
  id: string
  query: string
  response: AnalysisResponse
  timestamp: Date
}

export const AnalysisPage: React.FC = () => {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [dataSummary, setDataSummary] = useState<DataSummary | null>(null)
  const [suggestedQueries, setSuggestedQueries] = useState<string[]>([])
  const [queryHistory, setQueryHistory] = useState<QueryHistoryItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [drillDownModal, setDrillDownModal] = useState<{
    isOpen: boolean
    query: string
    context: any
  }>({ isOpen: false, query: '', context: null })
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    // Scroll to bottom when new messages appear
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [queryHistory])

  const loadInitialData = async () => {
    try {
      // Load data summary
      const summary = await analysisService.getDataSummary()
      setDataSummary(summary)

      // Load suggested queries
      const { suggestions } = await analysisService.getSuggestedQueries()
      setSuggestedQueries(suggestions)
    } catch (error) {
      console.error('Failed to load initial data:', error)
      setError('Failed to load data summary')
    }
  }

  const handleSubmitQuery = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim() || loading) return

    setLoading(true)
    setError(null)

    try {
      const response = await analysisService.analyzeQuery({
        query: query.trim(),
        includeCharts: true
      })

      const historyItem: QueryHistoryItem = {
        id: Date.now().toString(),
        query: query.trim(),
        response,
        timestamp: new Date()
      }

      setQueryHistory([...queryHistory, historyItem])
      setQuery('')
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to process query')
    } finally {
      setLoading(false)
    }
  }

  const handleSuggestedQuery = (suggestion: string) => {
    setQuery(suggestion)
  }

  const handleChartDrillDown = (dataPoint: any, chartTitle: string) => {
    const query = `Analyze the ${dataPoint.datasetLabel} value of ${dataPoint.value} for ${dataPoint.label}. What factors contributed to this result and how does it compare to other periods?`
    setDrillDownModal({
      isOpen: true,
      query,
      context: {
        type: 'chart',
        title: chartTitle,
        data: dataPoint
      }
    })
  }

  const handleTableDrillDown = (cellData: any, tableTitle: string) => {
    const query = `Provide detailed analysis of ${cellData.columnHeader}: ${cellData.value}. Show historical trends, comparisons, and key factors influencing this metric.`
    setDrillDownModal({
      isOpen: true,
      query,
      context: {
        type: 'cell',
        title: tableTitle,
        data: cellData
      }
    })
  }

  const handleFollowUpQuestion = (question: string) => {
    setQuery(question)
    // Automatically submit the question
    setTimeout(() => {
      const form = document.querySelector('form')
      if (form) {
        form.dispatchEvent(new Event('submit', { bubbles: true }))
      }
    }, 100)
  }

  const renderResponse = (response: AnalysisResponse) => {
    return (
      <div className="space-y-4">
        {/* Text Response */}
        {response.textResponse && (
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-gray-700 whitespace-pre-wrap">{response.textResponse}</p>
          </div>
        )}

        {/* Interactive Charts */}
        {response.charts && response.charts.length > 0 && (
          <div className="space-y-4">
            {response.charts.map((chart, index) => (
              <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                <InteractiveChart 
                  specification={chart} 
                  onDataPointClick={(dataPoint) => handleChartDrillDown(dataPoint, chart.title)}
                />
              </div>
            ))}
          </div>
        )}

        {/* Interactive Tables */}
        {response.tables && response.tables.length > 0 && (
          <div className="space-y-4">
            {response.tables.map((table, index) => (
              <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                <InteractiveTable 
                  specification={table}
                  onCellClick={(cellData) => handleTableDrillDown(cellData, table.title)}
                />
              </div>
            ))}
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
              <InformationCircleIcon className="h-4 w-4 mr-1" />
              Confidence: {response.metadata.confidence}
            </span>
            {response.metadata.dataPoints && (
              <span>Data points: {response.metadata.dataPoints}</span>
            )}
          </div>
          {response.metadata.dataSources.length > 0 && (
            <span>Sources: {response.metadata.dataSources.join(', ')}</span>
          )}
        </div>

        {/* Limitations */}
        {response.metadata.limitations && response.metadata.limitations.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 mr-2 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Limitations:</p>
                <ul className="list-disc list-inside">
                  {response.metadata.limitations.map((limitation, index) => (
                    <li key={index}>{limitation}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {response.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex">
              <XCircleIcon className="h-5 w-5 text-red-600 mr-2 flex-shrink-0" />
              <p className="text-sm text-red-800">{response.error}</p>
            </div>
          </div>
        )}
      </div>
    )
  }

  const hasData = dataSummary && (dataSummary.pnl.hasData || dataSummary.cashflow.hasData)

  return (
    <div className="flex flex-col h-full" style={{ height: '100%' }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <SparklesIcon className="h-6 w-6 mr-2 text-purple-600" />
              AI Financial Analysis
            </h1>
            <p className="text-sm text-gray-600">
              Ask questions about your financial data and get intelligent insights
            </p>
          </div>
          <button
            onClick={loadInitialData}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh data"
          >
            <ArrowPathIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Data Summary - Semi-collapsed by default */}
        <div className={`${sidebarCollapsed ? 'w-12' : 'w-72'} transition-all duration-300 ease-in-out bg-gray-50 border-r border-gray-200 flex flex-col relative overflow-hidden`}>
          {!sidebarCollapsed && (
            <div className="p-3 space-y-3 overflow-y-auto">
              {/* Enhanced Data Availability */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <DocumentTextIcon className="h-4 w-4 mr-2 text-purple-600" />
                  Data Availability
                </h3>
                {dataSummary ? (
                  <div className="space-y-3">
                    {/* P&L Data Section */}
                    <div className="pb-2 border-b border-gray-100">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-1">
                          <ChartBarIcon className="h-3.5 w-3.5 text-gray-600" />
                          <span className="text-xs font-medium text-gray-700">P&L Data</span>
                        </div>
                        {dataSummary.pnl.hasData ? (
                          <CheckCircleIcon className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircleIcon className="h-4 w-4 text-gray-300" />
                        )}
                      </div>
                      {dataSummary.pnl.hasData && (
                        <div className="ml-4 space-y-0.5">
                          <div className="flex items-center text-xs text-gray-500">
                            <CalendarIcon className="h-3 w-3 mr-1" />
                            {dataSummary.pnl.monthsAvailable} months
                          </div>
                          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-1">
                            <div className="flex items-center text-xs">
                              {dataSummary.pnl.metrics.revenue ? (
                                <CheckIcon className="h-3 w-3 text-green-500 mr-1" />
                              ) : (
                                <XMarkIcon className="h-3 w-3 text-gray-300 mr-1" />
                              )}
                              <span className="text-gray-600">Revenue</span>
                            </div>
                            <div className="flex items-center text-xs">
                              {dataSummary.pnl.metrics.costs ? (
                                <CheckIcon className="h-3 w-3 text-green-500 mr-1" />
                              ) : (
                                <XMarkIcon className="h-3 w-3 text-gray-300 mr-1" />
                              )}
                              <span className="text-gray-600">Costs</span>
                            </div>
                            <div className="flex items-center text-xs">
                              {dataSummary.pnl.metrics.margins ? (
                                <CheckIcon className="h-3 w-3 text-green-500 mr-1" />
                              ) : (
                                <XMarkIcon className="h-3 w-3 text-gray-300 mr-1" />
                              )}
                              <span className="text-gray-600">Margins</span>
                            </div>
                            <div className="flex items-center text-xs">
                              {dataSummary.pnl.metrics.ebitda ? (
                                <CheckIcon className="h-3 w-3 text-green-500 mr-1" />
                              ) : (
                                <XMarkIcon className="h-3 w-3 text-gray-300 mr-1" />
                              )}
                              <span className="text-gray-600">EBITDA</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Cashflow Data Section */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-1">
                          <BanknotesIcon className="h-3.5 w-3.5 text-gray-600" />
                          <span className="text-xs font-medium text-gray-700">Cashflow Data</span>
                        </div>
                        {dataSummary.cashflow.hasData ? (
                          <CheckCircleIcon className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircleIcon className="h-4 w-4 text-gray-300" />
                        )}
                      </div>
                      {dataSummary.cashflow.hasData && (
                        <div className="ml-4 space-y-0.5">
                          <div className="flex items-center text-xs text-gray-500">
                            <CalendarIcon className="h-3 w-3 mr-1" />
                            {dataSummary.cashflow.monthsAvailable} months
                          </div>
                          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-1">
                            <div className="flex items-center text-xs">
                              {dataSummary.cashflow.metrics.cashPosition ? (
                                <CheckIcon className="h-3 w-3 text-green-500 mr-1" />
                              ) : (
                                <XMarkIcon className="h-3 w-3 text-gray-300 mr-1" />
                              )}
                              <span className="text-gray-600">Cash Pos.</span>
                            </div>
                            <div className="flex items-center text-xs">
                              {dataSummary.cashflow.metrics.bankBalances ? (
                                <CheckIcon className="h-3 w-3 text-green-500 mr-1" />
                              ) : (
                                <XMarkIcon className="h-3 w-3 text-gray-300 mr-1" />
                              )}
                              <span className="text-gray-600">Bank Bal.</span>
                            </div>
                            <div className="flex items-center text-xs">
                              {dataSummary.cashflow.metrics.inflows ? (
                                <CheckIcon className="h-3 w-3 text-green-500 mr-1" />
                              ) : (
                                <XMarkIcon className="h-3 w-3 text-gray-300 mr-1" />
                              )}
                              <span className="text-gray-600">Inflows</span>
                            </div>
                            <div className="flex items-center text-xs">
                              {dataSummary.cashflow.metrics.outflows ? (
                                <CheckIcon className="h-3 w-3 text-green-500 mr-1" />
                              ) : (
                                <XMarkIcon className="h-3 w-3 text-gray-300 mr-1" />
                              )}
                              <span className="text-gray-600">Outflows</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">Loading...</p>
                )}
              </div>

              {/* Compact Suggested Queries */}
              {suggestedQueries.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Suggested Queries</h3>
                  <div className="space-y-1">
                    {suggestedQueries.slice(0, 3).map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestedQuery(suggestion)}
                        className="w-full text-left p-2 text-xs bg-gray-50 hover:bg-purple-50 rounded text-gray-700 hover:text-purple-700 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sleek Fold Button */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute -right-2.5 top-1/2 transform -translate-y-1/2 w-5 h-10 bg-white border border-gray-200 rounded-r-md hover:border-gray-300 hover:bg-gray-50 transition-all flex items-center justify-center z-20"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <ChevronRightIcon className="h-3 w-3 text-gray-500" />
            ) : (
              <ChevronLeftIcon className="h-3 w-3 text-gray-500" />
            )}
          </button>
        </div>

        {/* Right Panel - Chat Interface */}
        <div className="flex-1 p-3 flex flex-col">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 flex flex-col min-h-0">
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Analysis Chat</h3>
              <p className="text-sm text-gray-500">
                {hasData ? 'Ask questions about your financial data' : 'Upload data to start analyzing'}
              </p>
            </div>

            {/* Chat Messages - Takes remaining space */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col bg-gray-50" style={{ minHeight: '0' }}>
              {!hasData && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No financial data available</p>
                    <p className="text-sm text-gray-400 mt-2">
                      Please upload P&L and Cashflow files to start analyzing
                    </p>
                  </div>
                </div>
              )}

              <div className={queryHistory.length > 0 ? 'space-y-4' : 'flex-1 flex items-center justify-center'}>
                {queryHistory.map((item) => (
                  <div key={item.id} className="space-y-4">
                  {/* User Query */}
                  <div className="flex justify-end">
                    <div className="bg-purple-600 text-white rounded-lg px-4 py-2 max-w-md">
                      <p className="text-sm">{item.query}</p>
                    </div>
                  </div>

                  {/* AI Response */}
                  <div className="flex justify-start">
                    <div className="max-w-full">
                      {renderResponse(item.response)}
                      {/* Follow-up Questions */}
                      <FollowUpQuestions
                        lastQuery={item.query}
                        lastResponse={item.response}
                        onQuestionClick={handleFollowUpQuestion}
                      />
                    </div>
                  </div>
                </div>
              ))}
              </div>

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                      <p className="text-sm text-gray-600">Analyzing your query...</p>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex justify-start">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-w-md">
                    <div className="flex">
                      <XCircleIcon className="h-5 w-5 text-red-600 mr-2 flex-shrink-0" />
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Query Input - Fixed at bottom */}
            <div className="p-4 border-t border-gray-200">
              <form onSubmit={handleSubmitQuery} className="flex space-x-2">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={hasData ? "Ask about your financial data..." : "Upload data first"}
                  disabled={!hasData || loading}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                />
                <button
                  type="submit"
                  disabled={!hasData || loading || !query.trim()}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  <PaperAirplaneIcon className="h-5 w-5" />
                </button>
              </form>
              <p className="text-xs text-gray-500 mt-2">
                Powered by OpenAI. Your data is processed securely and not stored by the AI.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Drill-Down Modal */}
      <DrillDownModal
        isOpen={drillDownModal.isOpen}
        onClose={() => setDrillDownModal({ isOpen: false, query: '', context: null })}
        initialQuery={drillDownModal.query}
        context={drillDownModal.context}
      />
    </div>
  )
}