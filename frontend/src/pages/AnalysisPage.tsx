import React, { useState, useEffect, useRef } from 'react'
import {
  SparklesIcon,
  PaperAirplaneIcon,
  ChartBarIcon,
  TableCellsIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import { analysisService, AnalysisResponse, DataSummary } from '../services/analysisService'
import { ChartRenderer } from '../components/ChartRenderer'
import { TableRenderer } from '../components/TableRenderer'
import { DataAvailabilityCard } from '../components/DataAvailabilityCard'

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
  const [currentResponse, setCurrentResponse] = useState<AnalysisResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
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
      setCurrentResponse(response)
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

  const renderResponse = (response: AnalysisResponse) => {
    return (
      <div className="space-y-4">
        {/* Text Response */}
        {response.textResponse && (
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-gray-700 whitespace-pre-wrap">{response.textResponse}</p>
          </div>
        )}

        {/* Charts */}
        {response.charts && response.charts.length > 0 && (
          <div className="space-y-4">
            {response.charts.map((chart, index) => (
              <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                <ChartRenderer specification={chart} />
              </div>
            ))}
          </div>
        )}

        {/* Tables */}
        {response.tables && response.tables.length > 0 && (
          <div className="space-y-4">
            {response.tables.map((table, index) => (
              <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                <TableRenderer specification={table} />
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <SparklesIcon className="h-8 w-8 mr-3 text-purple-600" />
              AI Financial Analysis
            </h1>
            <p className="text-gray-600 mt-2">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Data Summary */}
        <div className="lg:col-span-1 space-y-6">
          {/* Data Availability */}
          <DataAvailabilityCard summary={dataSummary} />

          {/* Suggested Queries */}
          {suggestedQueries.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <DocumentTextIcon className="h-5 w-5 mr-2 text-purple-600" />
                Suggested Queries
              </h3>
              <div className="space-y-2">
                {suggestedQueries.slice(0, 5).map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestedQuery(suggestion)}
                    className="w-full text-left p-3 text-sm bg-gray-50 hover:bg-purple-50 rounded-lg transition-colors text-gray-700 hover:text-purple-700"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Chat Interface */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-[700px] flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Analysis Chat</h3>
              <p className="text-sm text-gray-500">
                {hasData ? 'Ask questions about your financial data' : 'Upload data to start analyzing'}
              </p>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {!hasData && (
                <div className="text-center py-12">
                  <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No financial data available</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Please upload P&L and Cashflow files to start analyzing
                  </p>
                </div>
              )}

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
                    </div>
                  </div>
                </div>
              ))}

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

            {/* Query Input */}
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
    </div>
  )
}