import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  HomeIcon,
  BanknotesIcon,
  ChartBarIcon,
  CogIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'
import { VortexLogo } from './VortexLogo'

export const Navbar: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const navigationItems = [
    { path: '/', label: 'Home', icon: HomeIcon },
    { path: '/cashflow', label: 'Cash Flow', icon: BanknotesIcon },
    { path: '/pnl', label: 'P&L', icon: ChartBarIcon },
    { path: '/configuration', label: 'Configuration', icon: CogIcon }
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
    <div className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <VortexLogo className="h-8 w-8" />
            <div className="flex items-center space-x-3">
              <div className="text-green-600 font-mono text-lg leading-tight">
                <div className="text-xs">╭─╮╭─╮╭─╮╭─╮╭─╮╭─╮</div>
                <div className="text-xs">│W││A││R││R││E││N│</div>
                <div className="text-xs">╰─╯╰─╯╰─╯╰─╯╰─╯╰─╯</div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Warren Financial Dashboard</h1>
                <p className="text-xs text-gray-600">Executive Financial Intelligence Platform</p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {navigationItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? 'bg-green-100 text-green-700 border border-green-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>

          {/* Mobile Navigation Menu */}
          <div className="md:hidden">
            <div className="flex items-center space-x-2">
              <select
                value={location.pathname}
                onChange={(e) => navigate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {navigationItems.map((item) => (
                  <option key={item.path} value={item.path}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* User Actions */}
          <div className="flex items-center space-x-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-gray-900">Executive Dashboard</p>
              <p className="text-xs text-gray-500">Financial Intelligence</p>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}