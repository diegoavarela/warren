import React, { useState, useEffect, useRef } from 'react'
import {
  SparklesIcon,
  PaperAirplaneIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'
import { analysisService, AnalysisResponse, DataSummary } from '../services/analysisService'
import { ChartRenderer } from '../components/ChartRenderer'
import { TableRenderer } from '../components/TableRenderer'

interface QueryHistoryItem {
  id: string
  query: string
  response: AnalysisResponse
  timestamp: Date
}

export const AnalysisPageFixed: React.FC = () => {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [dataSummary, setDataSummary] = useState<DataSummary | null>(null)
  const [suggestedQueries, setSuggestedQueries] = useState<string[]>([])
  const [queryHistory, setQueryHistory] = useState<QueryHistoryItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      const summary = await analysisService.getDataSummary()
      setDataSummary(summary)
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

  const hasData = dataSummary && (dataSummary.pnl.hasData || dataSummary.cashflow.hasData)

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
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
          >
            <ArrowPathIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main Content - This is the key part */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar */}
        <div className={`${sidebarCollapsed ? 'w-12' : 'w-72'} bg-gray-50 border-r transition-all relative`}>
          {!sidebarCollapsed && (
            <div className="p-3 space-y-3">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
                <h3 className="text-sm font-semibold mb-2">Data Availability</h3>
                {/* Data content */}
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute -right-3 top-1/2 transform -translate-y-1/2 w-6 h-12 bg-white border rounded-r-md"
          >
            {sidebarCollapsed ? <ChevronRightIcon className="h-4 w-4" /> : <ChevronLeftIcon className="h-4 w-4" />}
          </button>
        </div>

        {/* Chat Area - Full height with padding */}
        <div className="flex-1 p-3 flex min-h-0">
          <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">Analysis Chat</h3>
              <p className="text-sm text-gray-500">
                {hasData ? 'Ask questions about your financial data' : 'Upload data to start analyzing'}
              </p>
            </div>

            {/* Messages Area - This fills the space */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {!hasData && (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No financial data available</p>
                    <p className="text-sm text-gray-400 mt-2">
                      Please upload P&L and Cashflow files to start analyzing
                    </p>
                  </div>
                </div>
              )}
              
              {/* Chat messages would go here */}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t">
              <form onSubmit={handleSubmitQuery} className="flex space-x-2">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={hasData ? "Ask about your financial data..." : "Upload data first"}
                  disabled={!hasData || loading}
                  className="flex-1 px-4 py-2 border rounded-lg"
                />
                <button
                  type="submit"
                  disabled={!hasData || loading || !query.trim()}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg disabled:bg-gray-300"
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