import React, { useState } from 'react'
import { DocumentArrowDownIcon } from '@heroicons/react/24/outline'
import { CompactPDFService } from '../services/compactPdfService'
import { configurationService } from '../services/configurationService'

interface PremiumPDFExportProps {
  data: any
  type: 'pnl' | 'cashflow'
  title: string
}

export const PremiumPDFExport: React.FC<PremiumPDFExportProps> = ({
  data,
  type,
  title
}) => {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)

    try {
      const companyResponse = await configurationService.getActiveCompany()
      const company = companyResponse.data

      await CompactPDFService.exportCompactReport({
        company,
        title,
        data,
        type
      })
    } catch (error) {
      console.error('Failed to export premium PDF:', error)
      alert('Failed to generate report. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-600 via-green-500 to-green-600 text-white rounded-xl hover:from-green-700 hover:via-green-600 hover:to-green-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed font-medium"
    >
      <DocumentArrowDownIcon className="h-5 w-5" />
      <span>
        {isExporting ? (
          <span className="flex items-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Creating Compact Report...
          </span>
        ) : (
          'Export Executive Report'
        )}
      </span>
    </button>
  )
}