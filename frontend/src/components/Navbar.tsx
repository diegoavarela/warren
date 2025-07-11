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
  BuildingOfficeIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../hooks/useAuth'
import { LanguageSelector } from './LanguageSelector'
import { useTranslation } from 'react-i18next'

export const Navbar: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { t, i18n } = useTranslation()
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

  // Define role-based navigation
  const navigationItems = isDemoMode ? [
    { path: '/demo/pnl', label: t('nav.pnl'), icon: ChartBarIcon, gradient: 'from-emerald-600 to-teal-600' },
    { path: '/demo/cashflow', label: t('nav.cashflow'), icon: BanknotesIcon, gradient: 'from-violet-600 to-indigo-600' },
  ] : user?.role === 'platform_admin' ? [
    // Platform admin sees everything
    { path: '/platform-admin', label: 'Platform Admin', icon: BuildingOfficeIcon, gradient: 'from-amber-600 to-orange-600' },
    { path: '/home', label: t('nav.home'), icon: HomeIcon, gradient: 'from-purple-600 to-violet-600' },
    { path: '/pnl', label: t('nav.pnl'), icon: ChartBarIcon, gradient: 'from-emerald-600 to-teal-600' },
    { path: '/cashflow', label: t('nav.cashflow'), icon: BanknotesIcon, gradient: 'from-violet-600 to-indigo-600' },
    { path: '/analysis', label: t('nav.aiAnalysis'), icon: SparklesIcon, gradient: 'from-pink-600 to-purple-600' },
  ] : user?.role === 'company_admin' ? [
    // Company admin - core features in navbar
    { path: '/home', label: t('nav.home'), icon: HomeIcon, gradient: 'from-purple-600 to-violet-600' },
    { path: '/pnl', label: t('nav.pnl'), icon: ChartBarIcon, gradient: 'from-emerald-600 to-teal-600' },
    { path: '/cashflow', label: t('nav.cashflow'), icon: BanknotesIcon, gradient: 'from-violet-600 to-indigo-600' },
    { path: '/analysis', label: t('nav.aiAnalysis'), icon: SparklesIcon, gradient: 'from-pink-600 to-purple-600' },
  ] : [
    // Company employee - most basic menu
    { path: '/home', label: t('nav.home'), icon: HomeIcon, gradient: 'from-purple-600 to-violet-600' },
    { path: '/pnl', label: t('nav.pnl'), icon: ChartBarIcon, gradient: 'from-emerald-600 to-teal-600' },
    { path: '/cashflow', label: t('nav.cashflow'), icon: BanknotesIcon, gradient: 'from-violet-600 to-indigo-600' },
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
            <div className="flex items-center space-x-2 group cursor-pointer" onClick={() => navigate(isDemoMode ? '/demo/cashflow' : '/home')}>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl blur-lg opacity-25 group-hover:opacity-40 transition-opacity"></div>
                <div className="relative text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-purple-600 font-mono text-sm leading-tight">
                  <div className="text-xs">╭─╮╭─╮╭─╮╭─╮╭─╮╭─╮</div>
                  <div className="text-xs">│W││A││R││R││E││N│</div>
                  <div className="text-xs">╰─╯╰─╯╰─╯╰─╯╰─╯╰─╯</div>
                </div>
              </div>
              <div>
                <h1 className="text-sm font-semibold bg-gradient-to-r from-gray-900 via-purple-900 to-gray-900 bg-clip-text text-transparent">
                  Financial Dashboard
                  {isDemoMode && <span className="ml-1 text-xs bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded-full">DEMO</span>}
                </h1>
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
            <LanguageSelector />
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
                
                {/* Admin Menu Items */}
                {user?.role === 'company_admin' && !isDemoMode && (
                  <>
                    <button
                      onClick={() => {
                        navigate('/users')
                        setDropdownOpen(false)
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <UserGroupIcon className="h-4 w-4" />
                      <span>{t('nav.users')}</span>
                    </button>
                    <button
                      onClick={() => {
                        navigate('/configuration')
                        setDropdownOpen(false)
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <CogIcon className="h-4 w-4" />
                      <span>{t('nav.configuration')}</span>
                    </button>
                    <div className="border-t border-gray-100 my-2"></div>
                  </>
                )}
                
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
              
              {/* Admin functions in mobile menu */}
              {user?.role === 'company_admin' && !isDemoMode && (
                <>
                  <div className="px-4 py-2 border-t border-gray-100">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Admin</p>
                  </div>
                  <button
                    onClick={() => {
                      navigate('/users')
                      setMobileMenuOpen(false)
                    }}
                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-purple-50/50"
                  >
                    <UserGroupIcon className="h-5 w-5" />
                    <span>{t('nav.users')}</span>
                  </button>
                  <button
                    onClick={() => {
                      navigate('/configuration')
                      setMobileMenuOpen(false)
                    }}
                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-purple-50/50"
                  >
                    <CogIcon className="h-5 w-5" />
                    <span>{t('nav.configuration')}</span>
                  </button>
                </>
              )}
              <div className="px-4 py-3 border-t border-gray-100">
                <LanguageSelector />
              </div>
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