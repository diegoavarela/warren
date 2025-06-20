import React, { useState } from 'react'
import { CameraIcon } from '@heroicons/react/24/outline'
import { ScreenCapturePDFService } from '../services/screenCapturePdfService'
import { configurationService } from '../services/configurationService'

interface ExportableWidgetProps {
  children: React.ReactNode
  widgetId: string
  title: string
  fileName: string
  className?: string
  showExportButton?: boolean
}

export const ExportableWidget: React.FC<ExportableWidgetProps> = ({
  children,
  widgetId,
  title,
  fileName,
  className = '',
  showExportButton = false
}) => {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const companyResponse = await configurationService.getActiveCompany()
      const company = companyResponse.data

      await ScreenCapturePDFService.captureAndExport({
        elementId: widgetId,
        fileName: `${fileName}_${new Date().toISOString().split('T')[0]}.pdf`,
        company,
        title,
        orientation: 'portrait',
        includeHeader: true,
        includeFooter: true
      })
    } catch (error) {
      console.error('Failed to export widget:', error)
      alert('Failed to export widget. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className={`relative group ${className}`}>
      <div id={widgetId}>
        {children}
      </div>
      
      {showExportButton && (
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg hover:bg-white hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed z-10"
          title="Export this widget as PDF"
        >
          <CameraIcon className="h-5 w-5 text-gray-600" />
        </button>
      )}
    </div>
  )
}