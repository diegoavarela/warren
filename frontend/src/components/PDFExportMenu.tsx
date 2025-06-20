import React, { useState, useRef, useEffect } from 'react'
import {
  DocumentArrowDownIcon,
  DocumentTextIcon,
  DocumentChartBarIcon,
  CameraIcon,
  ChevronDownIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { ProfessionalPDFService } from '../services/professionalPdfService'
import { ExecutivePDFService } from '../services/executivePdfServiceSimple'
import { ScreenCapturePDFService } from '../services/screenCapturePdfService'
import { configurationService, CompanyConfig } from '../services/configurationService'

interface PDFExportMenuProps {
  data: any
  type: 'pnl' | 'cashflow'
  elementId: string
  title: string
  fileName: string
}

export const PDFExportMenu: React.FC<PDFExportMenuProps> = ({
  data,
  type,
  elementId,
  title,
  fileName
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportType, setExportType] = useState<'professional' | 'executive' | 'screenshot' | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleProfessionalExport = async () => {
    setIsExporting(true)
    setExportType('professional')
    setIsOpen(false)

    try {
      const companyResponse = await configurationService.getActiveCompany()
      const company = companyResponse.data

      await ProfessionalPDFService.exportDashboard({
        company,
        title: `${title} Report`,
        data,
        type
      })
    } catch (error) {
      console.error('Failed to export PDF:', error)
      alert('Failed to generate PDF report. Please try again.')
    } finally {
      setIsExporting(false)
      setExportType(null)
    }
  }

  const handleExecutiveExport = async () => {
    setIsExporting(true)
    setExportType('executive')
    setIsOpen(false)

    try {
      const companyResponse = await configurationService.getActiveCompany()
      const company = companyResponse.data

      await ExecutivePDFService.exportExecutiveReport({
        company,
        title: `${title} - Executive Summary`,
        data,
        type
      })
    } catch (error) {
      console.error('Failed to export executive PDF:', error)
      alert('Failed to generate executive report. Please try again.')
    } finally {
      setIsExporting(false)
      setExportType(null)
    }
  }

  const handleScreenshotExport = async () => {
    setIsExporting(true)
    setExportType('screenshot')
    setIsOpen(false)

    try {
      const companyResponse = await configurationService.getActiveCompany()
      const company = companyResponse.data

      // Add class to hide export button during capture
      const exportButton = document.getElementById('pdf-export-menu')
      if (exportButton) {
        exportButton.classList.add('pdf-hide')
      }

      await ScreenCapturePDFService.captureAndExport({
        elementId,
        fileName: `${fileName}_screenshot_${new Date().toISOString().split('T')[0]}.pdf`,
        company,
        title,
        orientation: 'landscape',
        includeHeader: true,
        includeFooter: true
      })

      // Remove the hide class
      if (exportButton) {
        exportButton.classList.remove('pdf-hide')
      }
    } catch (error) {
      console.error('Failed to export PDF:', error)
      alert('Failed to capture screen. Please try again.')
    } finally {
      setIsExporting(false)
      setExportType(null)
    }
  }

  return (
    <div ref={menuRef} className="relative" id="pdf-export-menu">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg hover:from-violet-700 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <DocumentArrowDownIcon className="h-5 w-5" />
        <span className="font-medium">
          {isExporting ? (
            exportType === 'professional' ? 'Generating Report...' :
            exportType === 'executive' ? 'Creating Executive Report...' : 
            'Capturing Screen...'
          ) : (
            'Export PDF'
          )}
        </span>
        {!isExporting && <ChevronDownIcon className="h-4 w-4" />}
      </button>

      {isOpen && !isExporting && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden animate-fade-in">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Choose Export Format</h3>
            <p className="text-xs text-gray-500 mt-1">Select how you want to export your dashboard</p>
          </div>
          
          <div className="p-2">
            <button
              onClick={handleExecutiveExport}
              className="w-full flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="flex-shrink-0 p-2 bg-emerald-100 rounded-lg group-hover:bg-emerald-200 transition-colors">
                <DocumentChartBarIcon className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="flex-1 text-left">
                <h4 className="text-sm font-medium text-gray-900">Executive Report</h4>
                <p className="text-xs text-gray-500 mt-1">
                  Professional executive summary with KPIs, charts, and strategic insights
                </p>
              </div>
            </button>

            <button
              onClick={handleProfessionalExport}
              className="w-full flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group mt-2"
            >
              <div className="flex-shrink-0 p-2 bg-violet-100 rounded-lg group-hover:bg-violet-200 transition-colors">
                <DocumentTextIcon className="h-6 w-6 text-violet-600" />
              </div>
              <div className="flex-1 text-left">
                <h4 className="text-sm font-medium text-gray-900">Detailed Report</h4>
                <p className="text-xs text-gray-500 mt-1">
                  Multi-page technical report with detailed analysis and data tables
                </p>
              </div>
            </button>

            <button
              onClick={handleScreenshotExport}
              className="w-full flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group mt-2"
            >
              <div className="flex-shrink-0 p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                <CameraIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1 text-left">
                <h4 className="text-sm font-medium text-gray-900">Screen Capture</h4>
                <p className="text-xs text-gray-500 mt-1">
                  Exact copy of what you see on screen, perfect for presentations
                </p>
              </div>
            </button>
          </div>

          <div className="p-3 bg-gray-50 border-t border-gray-100">
            <p className="text-xs text-gray-500 flex items-center">
              <svg className="h-4 w-4 mr-1.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Both formats include your company branding
            </p>
          </div>
        </div>
      )}
    </div>
  )
}