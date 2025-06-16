import React from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ChartBarIcon, 
  ArrowTrendingUpIcon,
  BanknotesIcon,
  SparklesIcon,
  LightBulbIcon,
  ChartPieIcon,
  CurrencyDollarIcon,
  PresentationChartLineIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'
import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'

export const HomePage: React.FC = () => {
  const navigate = useNavigate()

  const modules = [
    {
      id: 'cashflow',
      title: 'Cash Flow Management',
      description: 'Track and analyze your company\'s cash flow, monitor balances, and forecast future liquidity',
      icon: BanknotesIcon,
      gradient: 'from-violet-600 via-purple-600 to-indigo-600',
      lightGradient: 'from-violet-50/50 via-purple-50/30 to-indigo-50/50',
      shadowColor: 'shadow-purple-500/25',
      accentColor: 'text-purple-600',
      borderGlow: 'hover:shadow-purple-500/20',
      path: '/cashflow',
      features: [
        'Real-time cash position tracking',
        'Cash runway analysis',
        'Scenario planning',
        'Waterfall visualizations'
      ],
      stats: { label: 'Active Users', value: '2.4k+' }
    },
    {
      id: 'pnl',
      title: 'Profit & Loss Analysis',
      description: 'Monitor inflows, outflows, and profitability metrics with detailed P&L statements',
      icon: ChartBarIcon,
      gradient: 'from-emerald-600 via-teal-600 to-cyan-600',
      lightGradient: 'from-emerald-50/50 via-teal-50/30 to-cyan-50/50',
      shadowColor: 'shadow-teal-500/25',
      accentColor: 'text-teal-600',
      borderGlow: 'hover:shadow-teal-500/20',
      path: '/pnl',
      features: [
        'Inflow & outflow tracking',
        'Margin analysis',
        'Budget vs actual comparison',
        'Profitability trends'
      ],
      stats: { label: 'Reports Generated', value: '10k+' }
    }
  ]

  const highlights = [
    {
      icon: LightBulbIcon,
      title: 'AI-Powered Insights',
      description: 'Get intelligent recommendations based on your financial data patterns',
      color: 'from-amber-500 to-orange-500'
    },
    {
      icon: ChartPieIcon,
      title: 'Visual Analytics',
      description: 'Beautiful charts and graphs that make complex data easy to understand',
      color: 'from-pink-500 to-rose-500'
    },
    {
      icon: CurrencyDollarIcon,
      title: 'Real-Time Updates',
      description: 'Stay informed with live data synchronization and instant alerts',
      color: 'from-blue-500 to-cyan-500'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/20 to-slate-50">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-200"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-violet-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-400"></div>
      </div>

      {/* Unified Navbar */}
      <Navbar />

      {/* Main Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center px-4 py-1.5 bg-gradient-to-r from-violet-100 to-purple-100 rounded-full mb-4">
            <SparklesIcon className="h-5 w-5 text-purple-600 mr-2" />
            <span className="text-purple-700 font-medium">Welcome to Warren</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 bg-clip-text text-transparent">
              Your Financial
            </span>
            <br />
            <span className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Command Center
            </span>
          </h1>
          
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-6">
            Experience next-generation financial analytics with our AI-powered platform. 
            Make data-driven decisions with confidence and clarity.
          </p>

          {/* Quick Stats Bar */}
          <div className="inline-flex items-center space-x-6 px-6 py-3 bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-purple-100/20">
            <div className="text-center">
              <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">98%</p>
              <p className="text-xs text-gray-600">Accuracy</p>
            </div>
            <div className="w-px h-8 bg-gray-200"></div>
            <div className="text-center">
              <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">24/7</p>
              <p className="text-xs text-gray-600">Monitoring</p>
            </div>
            <div className="w-px h-8 bg-gray-200"></div>
            <div className="text-center">
              <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">50ms</p>
              <p className="text-xs text-gray-600">Response</p>
            </div>
          </div>
        </div>

        {/* Module Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          {modules.map((module, index) => (
            <div
              key={module.id}
              onClick={() => navigate(module.path)}
              className={`
                group relative bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-100
                hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 cursor-pointer
                hover:border-purple-200 ${module.borderGlow}
              `}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Card Header with Gradient */}
              <div className={`absolute inset-x-0 top-0 h-2 bg-gradient-to-r ${module.gradient} rounded-t-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
              
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-4">
                    <div className={`p-4 rounded-2xl bg-gradient-to-br ${module.gradient} shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300`}>
                      <module.icon className="h-8 w-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
                        {module.title}
                      </h3>
                      <p className="text-gray-600 leading-relaxed">{module.description}</p>
                    </div>
                  </div>
                </div>
                
                {/* Features Grid */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {module.features.map((feature, idx) => (
                    <div key={idx} className={`flex items-center text-sm ${module.accentColor} bg-gradient-to-r ${module.lightGradient} px-3 py-2 rounded-xl`}>
                      <ArrowTrendingUpIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Stats Badge */}
                <div className="flex items-center justify-between">
                  <div className={`inline-flex items-center px-4 py-2 bg-gradient-to-r ${module.lightGradient} rounded-full`}>
                    <PresentationChartLineIcon className={`h-5 w-5 ${module.accentColor} mr-2`} />
                    <span className="text-sm font-medium text-gray-700">{module.stats.label}:</span>
                    <span className={`text-sm font-bold ${module.accentColor} ml-1`}>{module.stats.value}</span>
                  </div>
                  
                  <button className={`
                    inline-flex items-center px-6 py-3 bg-gradient-to-r ${module.gradient} text-white font-semibold rounded-2xl
                    shadow-lg hover:shadow-xl hover:shadow-${module.shadowColor} transform group-hover:translate-x-1 transition-all duration-300
                  `}>
                    Access Module
                    <ArrowRightIcon className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>


        {/* Highlights Section */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-purple-900 bg-clip-text text-transparent">
              Why Choose Warren?
            </h2>
            <p className="text-gray-600 mt-2">Powerful features designed for modern finance teams</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {highlights.map((highlight, index) => (
              <div
                key={index}
                className="group bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl border border-gray-100 hover:border-purple-200 transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${highlight.color} shadow-lg group-hover:scale-110 transition-transform duration-300 mb-4`}>
                  <highlight.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{highlight.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{highlight.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats Dashboard */}
        <div className="bg-gradient-to-br from-purple-100 via-violet-100 to-indigo-100 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-200/30 via-transparent to-indigo-200/30"></div>
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500 rounded-full filter blur-3xl opacity-20"></div>
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500 rounded-full filter blur-3xl opacity-20"></div>
          
          <div className="relative z-10">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">Platform Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-purple-200">
                <p className="text-purple-700 text-sm mb-2">Active Modules</p>
                <p className="text-3xl font-bold text-gray-800">2</p>
                <p className="text-purple-600 text-sm mt-1">Cash Flow & P&L</p>
              </div>
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-purple-200">
                <p className="text-purple-700 text-sm mb-2">Last Sync</p>
                <p className="text-3xl font-bold text-gray-800">Live</p>
                <p className="text-purple-600 text-sm mt-1">Real-time updates</p>
              </div>
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-purple-200">
                <p className="text-purple-700 text-sm mb-2">Data Security</p>
                <p className="text-3xl font-bold text-emerald-600">100%</p>
                <p className="text-purple-600 text-sm mt-1">Enterprise-grade</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />

      {/* CSS for blob animation */}
      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
      `}</style>
    </div>
  )
}