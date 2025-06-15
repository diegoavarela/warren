import React, { useEffect, useState } from 'react'
import { DashboardPage } from './DashboardPage'
import { PnLDashboardPage } from './PnLDashboardPage'
import { useSearchParams } from 'react-router-dom'

export const ScreenshotPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const page = searchParams.get('page') || 'cashflow'
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Add screenshot-mode class to body for special styling
    document.body.classList.add('screenshot-mode')
    
    // Remove navbar and other UI elements
    const style = document.createElement('style')
    style.innerHTML = `
      .screenshot-mode .navbar { display: none !important; }
      .screenshot-mode .bg-gradient-to-br { background: #f9fafb !important; }
      .screenshot-mode .shadow-xl { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1) !important; }
      .screenshot-mode button[title*="help"] { display: none !important; }
      .screenshot-mode button[title*="Help"] { display: none !important; }
      .screenshot-mode .p-1\\.5.text-gray-500 { display: none !important; }
      .screenshot-mode [class*="FileUploadSection"] { display: none !important; }
      .screenshot-mode body { background: white !important; }
      .screenshot-mode .max-w-7xl { max-width: 1400px !important; }
    `
    document.head.appendChild(style)

    // Signal that the page is ready for screenshot
    setTimeout(() => {
      setIsReady(true)
      // Add a data attribute that puppeteer can check
      document.body.setAttribute('data-screenshot-ready', 'true')
    }, 2000) // Wait for charts to render

    return () => {
      document.body.classList.remove('screenshot-mode')
      style.remove()
      document.body.removeAttribute('data-screenshot-ready')
    }
  }, [])

  // Render without Layout wrapper to avoid navbar
  if (page === 'pnl') {
    return (
      <div className="min-h-screen bg-white">
        <PnLDashboardPage />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <DashboardPage />
    </div>
  )
}