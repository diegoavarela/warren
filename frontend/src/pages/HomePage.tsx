import React from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ChartBarIcon, 
  DocumentTextIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline'
import { VortexLogo } from '../components/VortexLogo'
import { Footer } from '../components/Footer'

export const HomePage: React.FC = () => {
  const navigate = useNavigate()

  const modules = [
    {
      id: 'cashflow',
      title: 'Cash Flow Management',
      description: 'Track and analyze your company\'s cash flow, monitor balances, and forecast future liquidity',
      icon: BanknotesIcon,
      color: 'from-blue-500 to-indigo-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      hoverBorder: 'hover:border-blue-400',
      path: '/cashflow',
      features: [
        'Real-time cash position tracking',
        'Cash runway analysis',
        'Scenario planning',
        'Waterfall visualizations'
      ]
    },
    {
      id: 'pnl',
      title: 'Profit & Loss Analysis',
      description: 'Monitor revenue, expenses, and profitability metrics with detailed P&L statements',
      icon: ChartBarIcon,
      color: 'from-green-500 to-emerald-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      hoverBorder: 'hover:border-green-400',
      path: '/pnl',
      features: [
        'Revenue & expense tracking',
        'Margin analysis',
        'Budget vs actual comparison',
        'Profitability trends'
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <VortexLogo className="h-10" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Warren Financial Dashboard</h1>
                <p className="text-sm text-gray-600">Executive Financial Intelligence Platform</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigate('/configuration')}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Configuration
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('token')
                  localStorage.removeItem('user')
                  navigate('/login')
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome to Your Financial Command Center
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Select a module below to access comprehensive financial insights and analytics
            tailored for executive decision-making.
          </p>
        </div>

        {/* Module Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {modules.map((module) => (
            <div
              key={module.id}
              onClick={() => !module.comingSoon && navigate(module.path)}
              className={`
                relative bg-white rounded-2xl shadow-lg border-2 transition-all duration-300
                ${module.borderColor} ${!module.comingSoon ? `${module.hoverBorder} hover:shadow-xl cursor-pointer` : 'opacity-75 cursor-not-allowed'}
              `}
            >
              {module.comingSoon && (
                <div className="absolute top-4 right-4 bg-gray-900 text-white text-xs font-medium px-3 py-1 rounded-full">
                  Coming Soon
                </div>
              )}
              
              <div className="p-8">
                <div className="flex items-start space-x-4">
                  <div className={`p-4 rounded-xl bg-gradient-to-br ${module.color} shadow-lg`}>
                    <module.icon className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{module.title}</h3>
                    <p className="text-gray-600 mb-4">{module.description}</p>
                    
                    <div className="space-y-2">
                      {module.features.map((feature, index) => (
                        <div key={index} className="flex items-center text-sm text-gray-600">
                          <ArrowTrendingUpIcon className="h-4 w-4 mr-2 text-gray-400" />
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className={`${module.bgColor} px-8 py-4 rounded-b-2xl`}>
                <button
                  className={`
                    w-full py-3 rounded-lg font-medium transition-colors
                    ${!module.comingSoon 
                      ? `bg-gradient-to-r ${module.color} text-white hover:shadow-md` 
                      : 'bg-gray-200 text-gray-500'
                    }
                  `}
                  disabled={module.comingSoon}
                >
                  {module.comingSoon ? 'Coming Soon' : 'Access Module →'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="bg-gray-50 rounded-2xl p-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Active Module</p>
              <p className="text-2xl font-bold text-gray-900">Cash Flow</p>
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Last Updated</p>
              <p className="text-2xl font-bold text-gray-900">Today</p>
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Data Status</p>
              <p className="text-2xl font-bold text-green-600">Live</p>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  )
}