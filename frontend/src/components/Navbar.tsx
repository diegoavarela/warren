import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  HomeIcon,
  BanknotesIcon,
  ChartBarIcon,
  CogIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  SparklesIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../hooks/useAuth'

export const Navbar: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Check if we're in demo mode
  const isDemoMode = location.pathname.startsWith('/demo') || window.location.search.includes('demo=true')
  
  // Always call useAuth, but ignore it in demo mode
  const authHook = useAuth()
  const { user, logout } = isDemoMode 
    ? { user: { name: 'Demo User', email: 'demo@warren.vortex.com' }, logout: () => navigate('/') }
    : authHook

  const navigationItems = isDemoMode ? [
    { path: '/demo/cashflow', label: 'Cash Flow', icon: BanknotesIcon, gradient: 'from-violet-600 to-indigo-600' },
    { path: '/demo/pnl', label: 'P&L', icon: ChartBarIcon, gradient: 'from-emerald-600 to-teal-600' },
  ] : [
    { path: '/home', label: 'Home', icon: HomeIcon, gradient: 'from-purple-600 to-violet-600' },
    { path: '/pnl', label: 'P&L', icon: ChartBarIcon, gradient: 'from-emerald-600 to-teal-600' },
    { path: '/cashflow', label: 'Cash Flow', icon: BanknotesIcon, gradient: 'from-violet-600 to-indigo-600' },
    { path: '/configuration', label: 'Configuration', icon: CogIcon, gradient: 'from-slate-600 to-gray-600' }
  ]

  const isActive = (path: string) => {
    if (path === '/home' && location.pathname === '/home') return true
    if (path !== '/home' && location.pathname.startsWith(path)) return true
    return false
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSignOut = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="bg-white/95 backdrop-blur-xl shadow-xl border-b border-purple-100/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3 group cursor-pointer" onClick={() => navigate(isDemoMode ? '/demo/cashflow' : '/home')}>
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
                  {isDemoMode && <span className="ml-2 text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">DEMO</span>}
                </h1>
                <p className="text-xs text-gray-600 flex items-center">
                  <SparklesIcon className="h-3 w-3 mr-1 text-purple-500" />
                  {isDemoMode ? 'Demo Mode - Sample Data' : 'Executive Financial Intelligence Platform'}
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
            {isDemoMode && (
              <button
                onClick={() => navigate('/')}
                className="flex items-center space-x-2 px-4 py-2 bg-orange-100 text-orange-800 rounded-full hover:bg-orange-200 transition-colors duration-200 font-medium text-sm"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4" />
                <span>Exit Demo</span>
              </button>
            )}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-2 p-2 rounded-xl hover:bg-gray-100 transition-colors duration-200"
            >
              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 flex items-center justify-center text-white font-semibold">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <ChevronDownIcon className={`h-4 w-4 text-gray-600 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{user?.email?.split('@')[0] || 'Admin User'}</p>
                  <p className="text-xs text-gray-500">{user?.email || 'admin@vort-ex.com'}</p>
                </div>
                <button
                  onClick={() => {
                    handleSignOut()
                    setDropdownOpen(false)
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <ArrowRightOnRectangleIcon className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4">
            <div className="space-y-2">
              {/* User Info */}
              <div className="flex items-center space-x-3 px-4 py-3 bg-gray-50 rounded-xl">
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 flex items-center justify-center text-white font-semibold">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{user?.email?.split('@')[0] || 'Admin User'}</p>
                  <p className="text-xs text-gray-500">{user?.email || 'admin@vort-ex.com'}</p>
                </div>
              </div>
              
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
              {isDemoMode ? (
                <button
                  onClick={() => navigate('/')}
                  className="
                    w-full flex items-center space-x-3 px-4 py-3 
                    bg-gradient-to-r from-orange-100 to-orange-200
                    hover:from-orange-200 hover:to-orange-300
                    rounded-xl text-sm font-medium text-orange-800
                    transition-all duration-300
                  "
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                  <span>Exit Demo</span>
                </button>
              ) : (
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
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}