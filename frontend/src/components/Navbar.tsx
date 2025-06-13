import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  HomeIcon,
  BanknotesIcon,
  ChartBarIcon,
  CogIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'

export const Navbar: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navigationItems = [
    { path: '/', label: 'Home', icon: HomeIcon, gradient: 'from-purple-600 to-violet-600' },
    { path: '/pnl', label: 'P&L', icon: ChartBarIcon, gradient: 'from-emerald-600 to-teal-600' },
    { path: '/cashflow', label: 'Cash Flow', icon: BanknotesIcon, gradient: 'from-violet-600 to-indigo-600' },
    { path: '/configuration', label: 'Configuration', icon: CogIcon, gradient: 'from-slate-600 to-gray-600' }
  ]

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true
    if (path !== '/' && location.pathname.startsWith(path)) return true
    return false
  }

  const handleSignOut = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  return (
    <div className="bg-white/95 backdrop-blur-xl shadow-xl border-b border-purple-100/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3 group cursor-pointer" onClick={() => navigate('/')}>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl blur-lg opacity-25 group-hover:opacity-40 transition-opacity"></div>
                <div className="relative text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-purple-600 font-mono text-lg leading-tight">
                  <div className="text-xs">╭─╮╭─╮╭─╮╭─╮╭─╮╭─╮</div>
                  <div className="text-xs">│W││A││R││R││E││N│</div>
                  <div className="text-xs">╰─╯╰─╯╰─╯╰─╯╰─╯╰─╯</div>
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 via-purple-900 to-gray-900 bg-clip-text text-transparent">
                  Warren Financial Dashboard
                </h1>
                <p className="text-xs text-gray-600 flex items-center">
                  <SparklesIcon className="h-3 w-3 mr-1 text-purple-500" />
                  Executive Financial Intelligence Platform
                </p>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-2">
            {navigationItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.path)
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`
                    relative flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-medium
                    transition-all duration-300 transform hover:scale-105
                    ${active 
                      ? 'text-white shadow-lg' 
                      : 'text-gray-700 hover:text-gray-900 hover:bg-purple-50/50'
                    }
                  `}
                >
                  {active && (
                    <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} rounded-xl`}></div>
                  )}
                  <div className="relative flex items-center space-x-2">
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </div>
                  {active && (
                    <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} rounded-xl blur-lg opacity-25`}></div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {mobileMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
          </div>

          {/* User Actions */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium bg-gradient-to-r from-gray-900 to-purple-900 bg-clip-text text-transparent">
                Executive Dashboard
              </p>
              <p className="text-xs text-gray-500">Financial Intelligence</p>
            </div>
            <button
              onClick={handleSignOut}
              className="
                flex items-center space-x-2 px-4 py-2.5 
                bg-gradient-to-r from-gray-100 to-gray-200
                hover:from-rose-500 hover:to-pink-500 hover:text-white
                rounded-xl text-sm font-medium text-gray-700
                transition-all duration-300 hover:shadow-lg hover:scale-105
                group
              "
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4">
            <div className="space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.path)
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path)
                      setMobileMenuOpen(false)
                    }}
                    className={`
                      w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium
                      transition-all duration-300
                      ${active 
                        ? 'bg-gradient-to-r ' + item.gradient + ' text-white shadow-lg' 
                        : 'text-gray-700 hover:bg-purple-50/50'
                      }
                    `}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </button>
                )
              })}
              <button
                onClick={handleSignOut}
                className="
                  w-full flex items-center space-x-3 px-4 py-3 
                  bg-gradient-to-r from-gray-100 to-gray-200
                  hover:from-rose-500 hover:to-pink-500 hover:text-white
                  rounded-xl text-sm font-medium text-gray-700
                  transition-all duration-300
                "
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}