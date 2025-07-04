import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { VortexFooter } from '../components/VortexFooter'
import { 
  ArrowRightIcon,
  ChartBarIcon,
  BanknotesIcon,
  ShieldCheckIcon,
  SparklesIcon,
  CheckIcon,
  ChevronRightIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  ChartPieIcon,
  DocumentChartBarIcon,
  UserGroupIcon,
  GlobeAltIcon,
  LightBulbIcon,
  RocketLaunchIcon
} from '@heroicons/react/24/outline'

export const LandingPage: React.FC = () => {
  const navigate = useNavigate()
  const [activeFeature, setActiveFeature] = useState(0)

  const features = [
    {
      icon: SparklesIcon,
      title: 'AI-Powered Excel Import',
      description: 'Our intelligent system automatically understands any Excel format, eliminating manual configuration',
      screenshot: '/screenshots/cashflow-dashboard-full.png',
      screenshotAlt: 'AI-powered financial dashboard with comprehensive metrics and analysis',
      benefits: ['Any Excel format', 'Auto-detection', 'Manual corrections']
    },
    {
      icon: ChartBarIcon,
      title: 'Real-Time Cash Flow Analysis',
      description: 'Monitor your company\'s financial health with live data updates and intelligent forecasting',
      screenshot: '/screenshots/cashflow-overview.png',
      screenshotAlt: 'Real-time cash flow overview with monthly breakdown',
      benefits: ['Instant insights', 'Predictive analytics', 'Custom alerts']
    },
    {
      icon: BanknotesIcon,
      title: 'Smart Financial Planning',
      description: 'Scenario planning tools that help you make data-driven decisions for sustainable growth',
      screenshot: '/screenshots/scenario-planning.png',
      screenshotAlt: 'Scenario planning tools for financial forecasting',
      benefits: ['What-if scenarios', 'Risk assessment', 'Growth modeling']
    },
    {
      icon: DocumentChartBarIcon,
      title: 'Executive Dashboards',
      description: 'Beautiful, intuitive dashboards designed for C-level executives and board presentations',
      screenshot: '/screenshots/pnl-dashboard-full.png',
      screenshotAlt: 'Executive P&L dashboard with revenue and cost analysis',
      benefits: ['One-click reports', 'Board-ready visuals', 'Export to PDF']
    }
  ]

  const metrics = [
    { value: 'AI', label: 'Powered Import' },
    { value: 'Any', label: 'Excel Format' },
    { value: '12', label: 'Month Forecast' },
    { value: 'PDF', label: 'Export Format' }
  ]



  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-xl z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => navigate('/')}>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl blur-lg opacity-25 group-hover:opacity-40 transition-opacity"></div>
                <div className="relative text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-purple-600 font-mono text-lg leading-tight">
                  <div className="text-xs">╭─╮╭─╮╭─╮╭─╮╭─╮╭─╮</div>
                  <div className="text-xs">│W││A││R││R││E││N│</div>
                  <div className="text-xs">╰─╯╰─╯╰─╯╰─╯╰─╯╰─╯</div>
                </div>
              </div>
              <div className="hidden sm:block text-sm text-gray-500">
                Financial Intelligence Platform
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => {
                  const featuresSection = document.getElementById('features-section');
                  featuresSection?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="hidden md:block text-gray-600 hover:text-gray-900 px-4 py-2"
              >
                Features
              </button>
              <button
                onClick={() => navigate('/login')}
                className="text-gray-700 hover:text-gray-900 px-4 py-2 font-medium"
              >
                Log In
              </button>
              <button
                onClick={() => navigate('/demo/cashflow')}
                className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-6 py-2 rounded-full font-medium hover:shadow-lg transition-all duration-300 hover:scale-105"
              >
                Try it yourself
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-1.5 bg-gradient-to-r from-violet-100 to-indigo-100 rounded-full mb-6">
              <SparklesIcon className="h-5 w-5 text-violet-600 mr-2" />
              <span className="text-violet-700 font-medium">AI-Powered Excel Financial Analysis Platform</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Master your cash flow
              </span>
              <br />
              <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                and profit and loss
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Warren uses AI to automatically understand any Excel format and transform your financial data 
              into beautiful dashboards, helping you master cash flow and make informed decisions.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/demo/cashflow')}
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-full font-semibold text-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                Try it yourself
                <ArrowRightIcon className="h-5 w-5 ml-2" />
              </button>
              <button
                onClick={() => navigate('/request-license')}
                className="inline-flex items-center px-8 py-4 bg-white text-violet-600 border-2 border-violet-600 rounded-full font-semibold text-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:bg-violet-50"
              >
                Request License
                <ChevronRightIcon className="h-5 w-5 ml-2" />
              </button>
            </div>
            
            <p className="text-sm text-gray-500 mt-4">
              Demo mode with sample data • No login required • No credit card required
            </p>
          </div>

          {/* Hero Image/Animation */}
          <div className="mt-16 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-400 to-indigo-400 blur-3xl opacity-20"></div>
            <div className="relative bg-white rounded-2xl shadow-2xl p-2 border border-gray-100">
              <div className="aspect-video bg-gradient-to-br from-violet-50 to-indigo-50 rounded-lg overflow-hidden">
                <img 
                  src="/screenshots/cashflow-dashboard-hero.png" 
                  alt="Warren Dashboard Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to placeholder if screenshot doesn't exist
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <div className="hidden w-full h-full flex flex-col items-center justify-center p-8">
                  <ChartBarIcon className="h-24 w-24 text-violet-600 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">Interactive Dashboard Preview</h3>
                  <p className="text-gray-600 text-center max-w-lg mb-4">
                    Experience Warren's powerful cash flow analytics dashboard with real-time insights, 
                    predictive forecasting, and executive-ready visualizations.
                  </p>
                  <div className="bg-violet-100 text-violet-700 px-4 py-2 rounded-full text-sm">
                    Run `npm run screenshots` to generate dashboard images
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Section */}
      <section className="py-20 bg-gradient-to-r from-violet-600 to-indigo-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {metrics.map((metric, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl font-bold text-white mb-2">{metric.value}</div>
                <div className="text-violet-100">{metric.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features-section" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Manage Cash Flow
            </h2>
            <p className="text-xl text-gray-600">
              Powerful features designed for modern finance teams
            </p>
          </div>

          <div className="grid lg:grid-cols-5 gap-8 items-center">
            <div className="lg:col-span-3 space-y-4">
              {features.map((feature, index) => (
                <div
                  key={index}
                  onClick={() => setActiveFeature(index)}
                  className={`p-4 rounded-xl cursor-pointer transition-all duration-300 ${
                    activeFeature === index
                      ? 'bg-gradient-to-r from-violet-50 to-indigo-50 border-2 border-violet-300 shadow-lg'
                      : 'bg-white border-2 border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg flex-shrink-0 ${
                      activeFeature === index
                        ? 'bg-gradient-to-r from-violet-600 to-indigo-600'
                        : 'bg-gray-100'
                    }`}>
                      <feature.icon className={`h-5 w-5 ${
                        activeFeature === index ? 'text-white' : 'text-gray-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {feature.description}
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {feature.benefits.map((benefit, bIndex) => (
                          <div key={bIndex} className="flex items-center text-xs text-gray-500">
                            <CheckIcon className="h-3 w-3 text-green-500 mr-1" />
                            {benefit}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="lg:col-span-2 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-400 to-indigo-400 blur-2xl opacity-20"></div>
              <div className="relative bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
                <div className="h-64 lg:h-80 overflow-hidden">
                  <img 
                    src={features[activeFeature].screenshot}
                    alt={features[activeFeature].screenshotAlt}
                    className="w-full h-full object-cover object-top scale-125"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Additional Features Grid */}
      <section className="py-20 bg-gray-50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Built for Modern Finance Teams
            </h2>
            <p className="text-xl text-gray-600">
              Enterprise-grade features with startup simplicity
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
              <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl w-fit mb-4">
                <ArrowTrendingUpIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Cash Flow Forecasting</h3>
              <p className="text-gray-600">
                View 12-month projections based on your Excel data with clear actual vs forecast visualization.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl w-fit mb-4">
                <ShieldCheckIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Secure & Private</h3>
              <p className="text-gray-600">
                Your Excel data is processed securely with JWT authentication. No data is permanently stored.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
              <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl w-fit mb-4">
                <SparklesIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">AI Financial Insights</h3>
              <p className="text-gray-600">
                Advanced AI analysis of your financial data with actionable insights and trend predictions.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
              <div className="p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl w-fit mb-4">
                <ClockIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Demo Available</h3>
              <p className="text-gray-600">
                Try Warren instantly with pre-loaded sample data. No Excel upload needed for the demo.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
              <div className="p-3 bg-gradient-to-r from-teal-500 to-green-500 rounded-xl w-fit mb-4">
                <UserGroupIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Easy Sharing</h3>
              <p className="text-gray-600">
                Export your dashboards and reports to PDF for easy sharing with stakeholders and board members.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
              <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl w-fit mb-4">
                <GlobeAltIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Multi-Currency Support</h3>
              <p className="text-gray-600">
                Display your financial data in ARS, USD, EUR, or BRL with flexible unit scaling options.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AI Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-purple-50 via-white to-indigo-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center p-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl mb-4">
              <SparklesIcon className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Powered by Artificial Intelligence
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Warren uses cutting-edge AI technology to make financial management effortless and intelligent
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="flex items-start space-x-4">
                <div className="p-2 bg-purple-100 rounded-lg flex-shrink-0">
                  <DocumentChartBarIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Smart Excel Recognition
                  </h3>
                  <p className="text-gray-600">
                    Upload any Excel file format - our AI automatically detects and maps your financial data structure, 
                    no matter how complex or unique your spreadsheet is.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="p-2 bg-indigo-100 rounded-lg flex-shrink-0">
                  <LightBulbIcon className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Intelligent Analysis
                  </h3>
                  <p className="text-gray-600">
                    Get AI-powered insights about your financial health, including trend analysis, 
                    anomaly detection, and predictive forecasting based on your historical data.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="p-2 bg-violet-100 rounded-lg flex-shrink-0">
                  <RocketLaunchIcon className="h-6 w-6 text-violet-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Future-Ready Platform
                  </h3>
                  <p className="text-gray-600">
                    As AI technology evolves, so does Warren. We continuously improve our algorithms 
                    to provide you with the most accurate and valuable financial insights.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-indigo-400 blur-3xl opacity-20"></div>
              <div className="relative bg-white rounded-2xl shadow-2xl p-8 border border-purple-100">
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <h4 className="text-2xl font-bold text-gray-900">AI Capabilities</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-4 rounded-xl">
                      <div className="text-3xl font-bold text-purple-600 mb-1">98%</div>
                      <div className="text-sm text-gray-600">Accuracy Rate</div>
                    </div>
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl">
                      <div className="text-3xl font-bold text-indigo-600 mb-1">5s</div>
                      <div className="text-sm text-gray-600">Analysis Time</div>
                    </div>
                    <div className="bg-gradient-to-br from-violet-50 to-purple-50 p-4 rounded-xl">
                      <div className="text-3xl font-bold text-violet-600 mb-1">∞</div>
                      <div className="text-sm text-gray-600">Excel Formats</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-4 rounded-xl">
                      <div className="text-3xl font-bold text-purple-600 mb-1">24/7</div>
                      <div className="text-sm text-gray-600">AI Available</div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                      <SparklesIcon className="h-4 w-4" />
                      <span>Powered by Claude & OpenAI</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Screenshots Gallery */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              See Warren in Action
            </h2>
            <p className="text-xl text-gray-600">
              Real dashboards from our live application
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Cash Flow Dashboard */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                  <BanknotesIcon className="h-6 w-6 text-violet-600 mr-2" />
                  Cash Flow Dashboard
                </h3>
              </div>
              <div className="h-64 bg-gray-100 overflow-hidden">
                <img 
                  src="/screenshots/cashflow-dashboard-hero.png"
                  alt="Cash Flow Dashboard with comprehensive metrics"
                  className="w-full object-cover object-top transform scale-110 origin-top"
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQ1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjQ1MCIgZmlsbD0iI2Y5ZmFmYiIvPgogIDx0ZXh0IHg9IjQwMCIgeT0iMjI1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM2YjcyODAiPkNhc2ggRmxvdyBEYXNoYm9hcmQgUHJldmlldzwvdGV4dD4KPC9zdmc+';
                  }}
                />
              </div>
            </div>
            
            {/* P&L Dashboard */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                  <ChartBarIcon className="h-6 w-6 text-emerald-600 mr-2" />
                  P&L Dashboard
                </h3>
              </div>
              <div className="h-64 bg-gray-100 overflow-hidden">
                <img 
                  src="/screenshots/pnl-dashboard-full.png"
                  alt="Profit & Loss Dashboard showing revenue, costs, and profit margins"
                  className="w-full object-cover object-top"
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQ1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjQ1MCIgZmlsbD0iI2Y5ZmFmYiIvPgogIDx0ZXh0IHg9IjQwMCIgeT0iMjI1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM2YjcyODAiPlAmYW1wO0wgRGFzaGJvYXJkIFByZXZpZXc8L3RleHQ+Cjwvc3ZnPg==';
                  }}
                />
              </div>
            </div>
          </div>
          
          {/* Feature Screenshots Grid */}
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="h-48 bg-gradient-to-br from-violet-50 to-indigo-50 overflow-hidden rounded-t-xl">
                <img 
                  src="/screenshots/cashflow-dashboard-hero.png"
                  alt="Real-time Financial Metrics"
                  className="w-full h-full object-cover object-[center_20%] scale-150"
                />
              </div>
              <div className="p-4">
                <h4 className="font-semibold text-gray-900">Real-time Metrics</h4>
                <p className="text-sm text-gray-600 mt-1">Track key financial indicators at a glance</p>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="h-48 bg-gradient-to-br from-emerald-50 to-teal-50 overflow-hidden rounded-t-xl">
                <img 
                  src="/screenshots/cashflow-dashboard-full.png"
                  alt="Cash Flow Composition Analysis"
                  className="w-full object-cover object-[center_30%] scale-125"
                />
              </div>
              <div className="p-4">
                <h4 className="font-semibold text-gray-900">Cash Flow Composition</h4>
                <p className="text-sm text-gray-600 mt-1">Detailed breakdown of cash inflows and outflows</p>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="h-48 bg-gradient-to-br from-rose-50 to-pink-50 overflow-hidden rounded-t-xl">
                <img 
                  src="/screenshots/pnl-dashboard-full.png"
                  alt="Financial Analysis Dashboard"
                  className="w-full object-cover object-[center_15%] scale-125"
                />
              </div>
              <div className="p-4">
                <h4 className="font-semibold text-gray-900">Financial Forecasting</h4>
                <p className="text-sm text-gray-600 mt-1">12-month cash flow projections with key insights</p>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Comprehensive Dashboard Gallery */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Complete Financial Intelligence Suite
            </h2>
            <p className="text-xl text-gray-600">
              Every tool you need to master your company's finances
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Cash Flow Analysis */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
              <div className="h-48 bg-gray-50 overflow-hidden">
                <img 
                  src="/screenshots/cashflow-dashboard-full.png"
                  alt="Cash Flow Analysis Dashboard"
                  className="w-full object-cover object-[center_40%] scale-150"
                />
              </div>
              <div className="p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Cash Flow Analysis</h4>
                <p className="text-gray-600">Advanced analytics with scenario planning capabilities</p>
              </div>
            </div>
            
            {/* Revenue Analysis */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
              <div className="h-48 bg-gray-50 overflow-hidden">
                <img 
                  src="/screenshots/pnl-dashboard-full.png"
                  alt="Revenue Analysis"
                  className="w-full object-cover object-[center_20%] scale-150"
                />
              </div>
              <div className="p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Revenue Tracking</h4>
                <p className="text-gray-600">Monitor revenue streams and growth patterns</p>
              </div>
            </div>
            
            {/* Year-over-Year Analysis */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
              <div className="h-48 bg-gray-50 overflow-hidden">
                <img 
                  src="/screenshots/cashflow-dashboard-hero.png"
                  alt="Year-over-Year Analysis"
                  className="w-full object-cover object-[center_50%] scale-150"
                />
              </div>
              <div className="p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">YoY Analysis</h4>
                <p className="text-gray-600">Compare performance across different time periods</p>
              </div>
            </div>
            
            {/* Financial Metrics */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
              <div className="h-48 bg-gray-50 overflow-hidden">
                <img 
                  src="/screenshots/cashflow-dashboard-full.png"
                  alt="Financial Metrics"
                  className="w-full object-cover object-top scale-125"
                />
              </div>
              <div className="p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Key Metrics</h4>
                <p className="text-gray-600">Track essential KPIs and financial indicators</p>
              </div>
            </div>
            
            {/* Data Upload */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
              <div className="h-48 bg-gray-50 overflow-hidden">
                <img 
                  src="/screenshots/cashflow-dashboard-hero.png"
                  alt="Data Upload Interface"
                  className="w-full object-cover object-top scale-110"
                />
              </div>
              <div className="p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Easy Data Import</h4>
                <p className="text-gray-600">Upload Excel files with automatic AI processing</p>
              </div>
            </div>
            
            {/* Export & Reports */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
              <div className="h-48 bg-gray-50 overflow-hidden">
                <img 
                  src="/screenshots/pnl-dashboard-hero.png"
                  alt="Export & Reports"
                  className="w-full object-cover object-top scale-110"
                />
              </div>
              <div className="p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Export Reports</h4>
                <p className="text-gray-600">Generate PDF reports for stakeholders</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Responsive Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-violet-50 to-indigo-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Access Your Finances Anywhere
            </h2>
            <p className="text-xl text-gray-600">
              Fully responsive design works seamlessly on all devices
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                Mobile-First Design
              </h3>
              <p className="text-gray-600 mb-6">
                Warren is designed to work beautifully on any device. Whether you're checking your 
                cash flow on your phone during a meeting or presenting to the board on a large display, 
                the interface adapts perfectly to provide the best experience.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                  <span className="text-gray-700">Touch-optimized interface for mobile devices</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                  <span className="text-gray-700">Full functionality on tablets and iPads</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                  <span className="text-gray-700">High-resolution displays support</span>
                </li>
              </ul>
            </div>
            
            <div className="order-1 md:order-2 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-400 to-indigo-400 blur-2xl opacity-30"></div>
                <img 
                  src="/screenshots/cashflow-dashboard-hero.png"
                  alt="Warren Mobile Dashboard View"
                  className="relative rounded-3xl shadow-2xl w-full max-w-md"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl p-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-3xl"></div>
            <div className="relative z-10">
              <h2 className="text-4xl font-bold text-white mb-4">
                Ready to Transform Your Financial Management?
              </h2>
              <p className="text-xl text-violet-100 mb-8">
                Transform your Excel financial data into actionable insights
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => navigate('/demo/cashflow')}
                  className="inline-flex items-center px-8 py-4 bg-white text-violet-600 rounded-full font-semibold text-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  Try it yourself
                  <RocketLaunchIcon className="h-5 w-5 ml-2" />
                </button>
                <button 
                  onClick={() => navigate('/request-license')}
                  className="inline-flex items-center px-8 py-4 bg-transparent text-white rounded-full font-semibold text-lg border-2 border-white/50 hover:bg-white/10 transition-all duration-300"
                >
                  Request License
                  <ChevronRightIcon className="h-5 w-5 ml-2" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <VortexFooter />

    </div>
  )
}