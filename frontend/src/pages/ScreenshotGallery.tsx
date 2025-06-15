import React, { useState, useRef } from 'react'
import { DashboardPage } from './DashboardPage'
import { PnLDashboardPage } from './PnLDashboardPage'
import { DocumentArrowDownIcon, PhotoIcon } from '@heroicons/react/24/outline'

const ScreenshotGallery: React.FC = () => {
  const [currentView, setCurrentView] = useState<'cashflow' | 'pnl'>('cashflow')
  const contentRef = useRef<HTMLDivElement>(null)

  const captureScreenshot = async () => {
    if (!contentRef.current) return

    try {
      // Hide the controls
      const controls = document.getElementById('screenshot-controls')
      if (controls) controls.style.display = 'none'

      // Use html2canvas if available, otherwise prompt user to use browser tools
      if (typeof window !== 'undefined' && (window as any).html2canvas) {
        const canvas = await (window as any).html2canvas(contentRef.current, {
          height: window.innerHeight,
          width: window.innerWidth,
          useCORS: true,
          scale: 1
        })
        
        // Download the image
        const link = document.createElement('a')
        link.download = `${currentView}-dashboard-${Date.now()}.png`
        link.href = canvas.toDataURL()
        link.click()
      } else {
        alert('Right-click and select "Save as..." or use browser developer tools to capture screenshot')
      }
    } catch (error) {
      console.error('Screenshot error:', error)
      alert('Please use browser developer tools to capture screenshot')
    } finally {
      // Show the controls again
      const controls = document.getElementById('screenshot-controls')
      if (controls) controls.style.display = 'block'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Screenshot Controls */}
      <div 
        id="screenshot-controls" 
        className="fixed top-4 right-4 z-50 bg-white rounded-lg shadow-lg p-4 border"
      >
        <div className="flex items-center space-x-4">
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentView('cashflow')}
              className={`px-3 py-2 rounded-lg text-sm font-medium ${
                currentView === 'cashflow'
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Cash Flow
            </button>
            <button
              onClick={() => setCurrentView('pnl')}
              className={`px-3 py-2 rounded-lg text-sm font-medium ${
                currentView === 'pnl'
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              P&L
            </button>
          </div>
          
          <button
            onClick={captureScreenshot}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <PhotoIcon className="h-4 w-4" />
            <span>Capture</span>
          </button>
        </div>
        
        <div className="mt-2 text-xs text-gray-500">
          Or use browser tools: F12 → Device Mode → Capture Screenshot
        </div>
      </div>

      {/* Content to Screenshot */}
      <div ref={contentRef} className="screenshot-content">
        <style jsx global>{`
          .screenshot-content nav,
          .screenshot-content [class*="Navbar"],
          .screenshot-content [class*="FileUploadSection"] {
            display: none !important;
          }
          
          .screenshot-content {
            padding-top: 0 !important;
          }
          
          .screenshot-content .sticky {
            position: static !important;
          }
          
          /* Hide help buttons and tooltips */
          .screenshot-content button[title*="help"],
          .screenshot-content [class*="help"],
          .screenshot-content .help-button {
            display: none !important;
          }
          
          /* Ensure clean styling */
          .screenshot-content * {
            animation: none !important;
            transition: none !important;
          }
        `}</style>
        
        {currentView === 'cashflow' ? <DashboardPage /> : <PnLDashboardPage />}
      </div>
      
      {/* Instructions */}
      <div className="fixed bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 border max-w-md">
        <h3 className="font-semibold text-gray-900 mb-2">Screenshot Instructions</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p>• Switch between dashboards using the buttons above</p>
          <p>• Click "Capture" to download (requires html2canvas)</p>
          <p>• Or use browser dev tools for manual capture:</p>
          <p className="ml-2">1. Press F12 → Toggle Device Mode</p>
          <p className="ml-2">2. Click the three dots → Capture screenshot</p>
        </div>
      </div>
    </div>
  )
}

export default ScreenshotGallery