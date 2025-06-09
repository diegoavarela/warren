import { ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useTranslation } from 'react-i18next'
import { 
  ArrowRightOnRectangleIcon,
  GlobeAltIcon,
  CogIcon
} from '@heroicons/react/24/outline'
import { Footer } from './Footer'
import { Link } from 'react-router-dom'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth()
  const { t, i18n } = useTranslation()

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'es' : 'en'
    i18n.changeLanguage(newLang)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      {/* Modern Navbar */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo Section */}
            <Link to="/" className="flex items-center space-x-3 group">
              <img src="/vortex-horizontal.png" alt="Vortex" className="h-8 group-hover:scale-105 transition-transform" />
              <div className="h-6 w-px bg-gray-300"></div>
              <span className="text-xl font-semibold text-gray-900">Warren</span>
            </Link>

            {/* Right Section */}
            <div className="flex items-center space-x-4">
              {/* Language Switcher */}
              <button
                onClick={toggleLanguage}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title={t('common.language')}
              >
                <GlobeAltIcon className="w-5 h-5" />
              </button>

              {/* Admin Link */}
              {user?.role === 'admin' && (
                <Link
                  to="/admin"
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Admin Panel"
                >
                  <CogIcon className="w-5 h-5" />
                </Link>
              )}

              {/* User Menu */}
              <div className="flex items-center space-x-3 pl-3 border-l border-gray-200">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-gray-700">{user?.email?.split('@')[0]}</p>
                  <p className="text-xs text-gray-500">{user?.role === 'admin' ? 'Admin' : 'User'}</p>
                </div>
                
                <button
                  onClick={logout}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowRightOnRectangleIcon className="w-4 h-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">{t('auth.logout')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative min-h-screen">
        {children}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}