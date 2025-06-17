import React from 'react'
import {
  DocumentChartBarIcon,
  BanknotesIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline'
import { DataSummary } from '../services/analysisService'

interface DataAvailabilityCardProps {
  summary: DataSummary | null
}

export const DataAvailabilityCard: React.FC<DataAvailabilityCardProps> = ({ summary }) => {
  if (!summary) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Availability</h3>
        <p className="text-gray-500">Loading data summary...</p>
      </div>
    )
  }

  const formatDateRange = (range: { start: string; end: string } | null) => {
    if (!range) return 'No data'
    const start = new Date(range.start).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    const end = new Date(range.end).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    return `${start} - ${end}`
  }

  const MetricItem = ({ available, label, icon }: { available: boolean; label: string; icon: React.ReactNode }) => (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center space-x-2">
        <div className="text-gray-400">{icon}</div>
        <span className="text-sm text-gray-700">{label}</span>
      </div>
      {available ? (
        <CheckCircleIcon className="h-5 w-5 text-green-500" />
      ) : (
        <XCircleIcon className="h-5 w-5 text-gray-300" />
      )}
    </div>
  )

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <DocumentChartBarIcon className="h-5 w-5 mr-2 text-purple-600" />
        Data Availability
      </h3>

      <div className="space-y-6">
        {/* P&L Data */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900 flex items-center">
              <ChartBarIcon className="h-4 w-4 mr-2" />
              P&L Data
            </h4>
            <span className={`text-xs px-2 py-1 rounded-full ${
              summary.pnl.hasData ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {summary.pnl.hasData ? 'Available' : 'Not Available'}
            </span>
          </div>
          
          {summary.pnl.hasData && (
            <>
              <div className="text-xs text-gray-500 mb-2 flex items-center">
                <CalendarIcon className="h-3 w-3 mr-1" />
                {formatDateRange(summary.pnl.dateRange)} ({summary.pnl.monthsAvailable} months)
              </div>
              
              <div className="space-y-1 border-t pt-2">
                <MetricItem 
                  available={summary.pnl.metrics.revenue} 
                  label="Revenue" 
                  icon={<ArrowTrendingUpIcon className="h-4 w-4" />} 
                />
                <MetricItem 
                  available={summary.pnl.metrics.costs} 
                  label="Costs" 
                  icon={<ArrowTrendingDownIcon className="h-4 w-4" />} 
                />
                <MetricItem 
                  available={summary.pnl.metrics.margins} 
                  label="Margins" 
                  icon={<ChartBarIcon className="h-4 w-4" />} 
                />
                <MetricItem 
                  available={summary.pnl.metrics.personnelCosts} 
                  label="Personnel" 
                  icon={<UserGroupIcon className="h-4 w-4" />} 
                />
                <MetricItem 
                  available={summary.pnl.metrics.ebitda} 
                  label="EBITDA" 
                  icon={<ArrowTrendingUpIcon className="h-4 w-4" />} 
                />
              </div>
            </>
          )}
        </div>

        {/* Cashflow Data */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900 flex items-center">
              <BanknotesIcon className="h-4 w-4 mr-2" />
              Cashflow Data
            </h4>
            <span className={`text-xs px-2 py-1 rounded-full ${
              summary.cashflow.hasData ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {summary.cashflow.hasData ? 'Available' : 'Not Available'}
            </span>
          </div>
          
          {summary.cashflow.hasData && (
            <>
              <div className="text-xs text-gray-500 mb-2 flex items-center">
                <CalendarIcon className="h-3 w-3 mr-1" />
                {formatDateRange(summary.cashflow.dateRange)} ({summary.cashflow.monthsAvailable} months)
              </div>
              
              <div className="space-y-1 border-t pt-2">
                <MetricItem 
                  available={summary.cashflow.metrics.cashPosition} 
                  label="Cash Position" 
                  icon={<CurrencyDollarIcon className="h-4 w-4" />} 
                />
                <MetricItem 
                  available={summary.cashflow.metrics.bankBalances} 
                  label="Bank Balances" 
                  icon={<BanknotesIcon className="h-4 w-4" />} 
                />
                <MetricItem 
                  available={summary.cashflow.metrics.investments} 
                  label="Investments" 
                  icon={<ArrowTrendingUpIcon className="h-4 w-4" />} 
                />
                <MetricItem 
                  available={summary.cashflow.metrics.inflows} 
                  label="Inflows" 
                  icon={<ArrowTrendingUpIcon className="h-4 w-4" />} 
                />
                <MetricItem 
                  available={summary.cashflow.metrics.outflows} 
                  label="Outflows" 
                  icon={<ArrowTrendingDownIcon className="h-4 w-4" />} 
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          {summary.pnl.hasData && summary.cashflow.hasData
            ? 'Both P&L and Cashflow data are available for analysis.'
            : summary.pnl.hasData
            ? 'Only P&L data is available. Upload Cashflow data for complete analysis.'
            : summary.cashflow.hasData
            ? 'Only Cashflow data is available. Upload P&L data for complete analysis.'
            : 'No data available. Please upload P&L and Cashflow files to start analyzing.'}
        </p>
      </div>
    </div>
  )
}