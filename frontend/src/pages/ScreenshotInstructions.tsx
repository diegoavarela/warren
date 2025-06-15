import React from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  CameraIcon, 
  DocumentArrowDownIcon,
  CheckIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'

export const ScreenshotInstructions: React.FC = () => {
  const navigate = useNavigate()
  
  const steps = [
    {
      title: "1. Login to Warren",
      description: "Use the demo credentials: admin@vort-ex.com / vortex123"
    },
    {
      title: "2. Navigate to Screenshot Mode",
      description: "Go to /screenshot?page=cashflow for Cash Flow dashboard"
    },
    {
      title: "3. Wait for Data to Load",
      description: "The page will hide navigation and optimize for screenshots"
    },
    {
      title: "4. Take Screenshots",
      description: "Use your browser's screenshot tool or extensions"
    },
    {
      title: "5. Save to Public Folder",
      description: "Save images to frontend/public/screenshots/"
    }
  ]

  const screenshotUrls = [
    { name: "Cash Flow Dashboard", url: "/screenshot?page=cashflow", filename: "cashflow-dashboard-full.png" },
    { name: "P&L Dashboard", url: "/screenshot?page=pnl", filename: "pnl-dashboard-full.png" }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <button
          onClick={() => navigate('/home')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-8 transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to home
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center mb-8">
            <CameraIcon className="h-10 w-10 text-violet-600 mr-4" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Screenshot Instructions</h1>
              <p className="text-gray-600 mt-1">Generate screenshots for the landing page</p>
            </div>
          </div>

          <div className="space-y-6 mb-10">
            <h2 className="text-xl font-semibold text-gray-900">Manual Screenshot Process</h2>
            {steps.map((step, index) => (
              <div key={index} className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center mr-4">
                  <CheckIcon className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t pt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Links</h2>
            <div className="space-y-4">
              {screenshotUrls.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-900">{item.name}</h3>
                    <p className="text-sm text-gray-600">Save as: {item.filename}</p>
                  </div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                  >
                    Open in New Tab
                    <DocumentArrowDownIcon className="h-4 w-4 ml-2" />
                  </a>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 p-6 bg-blue-50 rounded-xl">
            <h3 className="font-semibold text-blue-900 mb-2">Recommended Browser Extensions</h3>
            <ul className="space-y-2 text-blue-700">
              <li>• Chrome: Full Page Screen Capture</li>
              <li>• Firefox: Firefox Screenshots (built-in)</li>
              <li>• Safari: Awesome Screenshot</li>
            </ul>
          </div>

          <div className="mt-6 p-6 bg-amber-50 rounded-xl">
            <h3 className="font-semibold text-amber-900 mb-2">Screenshot Guidelines</h3>
            <ul className="space-y-2 text-amber-700">
              <li>• Use 1920x1080 viewport for best results</li>
              <li>• Ensure all data is loaded before capturing</li>
              <li>• Save as PNG for best quality</li>
              <li>• Name files exactly as specified above</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}