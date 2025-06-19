import React, { useState, useEffect, Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { 
  XMarkIcon, 
  SparklesIcon,
  ArrowPathIcon,
  ChevronLeftIcon
} from '@heroicons/react/24/outline'
import { analysisService, AnalysisResponse } from '../services/analysisService'
import { InteractiveChart } from './InteractiveChart'
import { InteractiveTable } from './InteractiveTable'

interface DrillDownModalProps {
  isOpen: boolean
  onClose: () => void
  initialQuery: string
  context: {
    type: 'chart' | 'table' | 'cell'
    title?: string
    data?: any
  }
}

interface NavigationItem {
  query: string
  response: AnalysisResponse | null
  context: any
}

export const DrillDownModal: React.FC<DrillDownModalProps> = ({
  isOpen,
  onClose,
  initialQuery,
  context
}) => {
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<AnalysisResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [navigationStack, setNavigationStack] = useState<NavigationItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)

  useEffect(() => {
    if (isOpen && initialQuery) {
      performAnalysis(initialQuery)
    }
  }, [isOpen, initialQuery])

  const performAnalysis = async (query: string, addToHistory = true) => {
    setLoading(true)
    setError(null)

    try {
      const result = await analysisService.analyzeQuery({
        query,
        context: JSON.stringify(context),
        includeCharts: true
      })

      setResponse(result)

      if (addToHistory) {
        const newItem: NavigationItem = {
          query,
          response: result,
          context
        }

        if (currentIndex < navigationStack.length - 1) {
          // If we're not at the end of the stack, truncate forward history
          setNavigationStack([...navigationStack.slice(0, currentIndex + 1), newItem])
        } else {
          setNavigationStack([...navigationStack, newItem])
        }
        setCurrentIndex(currentIndex + 1)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to analyze')
    } finally {
      setLoading(false)
    }
  }

  const handleChartClick = (dataPoint: any) => {
    const drillDownQuery = `Analyze the ${dataPoint.datasetLabel} value of ${dataPoint.value} for ${dataPoint.label} in detail. What factors contributed to this result?`
    performAnalysis(drillDownQuery)
  }

  const handleTableCellClick = (cellData: any) => {
    const drillDownQuery = `Provide detailed analysis of ${cellData.columnHeader}: ${cellData.value}. Show trends and comparisons.`
    performAnalysis(drillDownQuery)
  }

  const navigateBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      const previousItem = navigationStack[currentIndex - 1]
      setResponse(previousItem.response)
    }
  }

  const canNavigateBack = currentIndex > 0

  const renderResponse = () => {
    if (!response) return null

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
                  onDataPointClick={handleChartClick}
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
                  onCellClick={handleTableCellClick}
                />
              </div>
            ))}
          </div>
        )}

        {/* Metadata */}
        <div className="text-sm text-gray-500 flex items-center justify-between">
          <span>Confidence: {response.metadata.confidence}</span>
          {response.metadata.dataPoints && (
            <span>Data points: {response.metadata.dataPoints}</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all">
                {/* Header */}
                <div className="bg-purple-600 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {canNavigateBack && (
                        <button
                          onClick={navigateBack}
                          className="p-1 hover:bg-purple-700 rounded-lg transition-colors"
                          title="Go back"
                        >
                          <ChevronLeftIcon className="h-5 w-5 text-white" />
                        </button>
                      )}
                      <Dialog.Title className="text-lg font-semibold text-white flex items-center">
                        <SparklesIcon className="h-5 w-5 mr-2" />
                        Deep Dive Analysis
                      </Dialog.Title>
                    </div>
                    <button
                      onClick={onClose}
                      className="p-1 hover:bg-purple-700 rounded-lg transition-colors"
                    >
                      <XMarkIcon className="h-5 w-5 text-white" />
                    </button>
                  </div>
                  {context?.title && (
                    <p className="text-purple-200 text-sm mt-1">{context.title}</p>
                  )}
                </div>

                {/* Content */}
                <div className="max-h-[70vh] overflow-y-auto p-6">
                  {loading && (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <ArrowPathIcon className="h-8 w-8 text-purple-600 animate-spin mx-auto mb-4" />
                        <p className="text-gray-600">Analyzing data...</p>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-red-800">{error}</p>
                    </div>
                  )}

                  {!loading && !error && renderResponse()}
                </div>

                {/* Navigation breadcrumbs */}
                {navigationStack.length > 0 && (
                  <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                    <div className="flex items-center space-x-2 text-sm">
                      <span className="text-gray-500">Navigation:</span>
                      {navigationStack.slice(0, currentIndex + 1).map((item, index) => (
                        <React.Fragment key={index}>
                          {index > 0 && <span className="text-gray-400">→</span>}
                          <button
                            onClick={() => {
                              if (index < currentIndex) {
                                setCurrentIndex(index)
                                setResponse(item.response)
                              }
                            }}
                            className={`
                              ${index === currentIndex ? 'text-purple-600 font-medium' : 'text-gray-600 hover:text-purple-600'}
                              transition-colors
                            `}
                          >
                            Step {index + 1}
                          </button>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}