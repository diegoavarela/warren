import React from 'react'
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

interface DataValidation {
  cashflow: {
    hasData: boolean
    monthsAvailable: number
    lastUpload: Date | null
  }
  pnl: {
    hasData: boolean
    monthsAvailable: number
    lastUpload: Date | null
  }
  completeness: number
}

interface DataValidationChartProps {
  validation: DataValidation
}

export const DataValidationChart: React.FC<DataValidationChartProps> = ({ validation }) => {
  const formatDate = (date: Date | null) => {
    if (!date) return 'Never'
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusIcon = (hasData: boolean) => {
    if (hasData) {
      return <CheckCircleIcon className="w-5 h-5 text-green-500" />
    }
    return <XCircleIcon className="w-5 h-5 text-red-500" />
  }

  const getCompletenessColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500'
    if (percentage >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getCompletenessText = (percentage: number) => {
    if (percentage >= 80) return 'Excellent'
    if (percentage >= 50) return 'Partial'
    return 'Limited'
  }

  return (
    <div className="space-y-4">
      {/* Overall Completeness */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Data Completeness</span>
          <span className="text-sm font-semibold text-gray-900">{validation.completeness}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getCompletenessColor(validation.completeness)}`}
            style={{ width: `${validation.completeness}%` }}
          />
        </div>
        <p className="text-xs text-gray-600 mt-1">
          Status: {getCompletenessText(validation.completeness)}
        </p>
      </div>

      {/* Cashflow Status */}
      <div className="border border-gray-200 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <CurrencyDollarIcon className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Cashflow Data</span>
          </div>
          {getStatusIcon(validation.cashflow.hasData)}
        </div>
        
        {validation.cashflow.hasData ? (
          <div className="space-y-1 text-xs text-gray-600">
            <div className="flex items-center space-x-1">
              <CalendarIcon className="w-3 h-3" />
              <span>{validation.cashflow.monthsAvailable} months available</span>
            </div>
            <div className="flex items-center space-x-1">
              <DocumentTextIcon className="w-3 h-3" />
              <span>Last upload: {formatDate(validation.cashflow.lastUpload)}</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-500">No data uploaded</p>
        )}
      </div>

      {/* P&L Status */}
      <div className="border border-gray-200 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <ChartBarIcon className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">P&L Data</span>
          </div>
          {getStatusIcon(validation.pnl.hasData)}
        </div>
        
        {validation.pnl.hasData ? (
          <div className="space-y-1 text-xs text-gray-600">
            <div className="flex items-center space-x-1">
              <CalendarIcon className="w-3 h-3" />
              <span>{validation.pnl.monthsAvailable} months available</span>
            </div>
            <div className="flex items-center space-x-1">
              <DocumentTextIcon className="w-3 h-3" />
              <span>Last upload: {formatDate(validation.pnl.lastUpload)}</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-500">No data uploaded</p>
        )}
      </div>

      {/* AI Analysis Availability */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
        <div className="flex items-center space-x-2 mb-1">
          {validation.completeness >= 50 ? (
            <>
              <CheckCircleIcon className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">AI Analysis Available</span>
            </>
          ) : (
            <>
              <ExclamationCircleIcon className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">Limited AI Analysis</span>
            </>
          )}
        </div>
        <p className="text-xs text-purple-700">
          {validation.completeness >= 100
            ? 'Full analysis capabilities with both datasets'
            : validation.completeness >= 50
            ? 'Partial analysis available with current data'
            : 'Upload more data for comprehensive analysis'}
        </p>
      </div>
    </div>
  )
}