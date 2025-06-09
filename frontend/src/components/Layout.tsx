import { ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useTranslation } from 'react-i18next'
import { 
  ArrowRightOnRectangleIcon,
  GlobeAltIcon,
  CogIcon
} from '@heroicons/react/24/outline'
import { VortexLogo } from './VortexLogo'
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Beautiful Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo Section */}
            <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
              <VortexLogo variant="horizontal" size="lg" />
              <div className="ml-4">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  Warren
                </h1>
                <p className="text-sm text-gray-500">Financial Dashboard</p>
              </div>
            </Link>

            {/* Right Section */}
            <div className="flex items-center space-x-6">
              {/* Language Toggle */}
              <div className="flex items-center bg-gray-100 rounded-xl p-1">
                <button
                  onClick={toggleLanguage}
                  className="flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-white hover:shadow-sm"
                  title={t('common.language')}
                >
                  <GlobeAltIcon className="w-4 h-4 mr-2 text-gray-600" />
                  <span className="text-gray-700">
                    {i18n.language === 'en' ? 'English' : 'Español'}
                  </span>
                </button>
              </div>

              {/* User Info */}
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                  <p className="text-xs text-gray-500">
                    {user?.role === 'admin' ? 'Administrator' : 'Financial Dashboard'}
                  </p>
                </div>

                {/* Admin Panel Link */}
                {user?.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="flex items-center px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl transition-all duration-200 hover:shadow-sm"
                  >
                    <CogIcon className="w-4 h-4 mr-2" />
                    <span className="text-sm font-medium">Admin</span>
                  </Link>
                )}
                
                <button
                  onClick={logout}
                  className="flex items-center px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all duration-200 hover:shadow-sm"
                >
                  <ArrowRightOnRectangleIcon className="w-4 h-4 mr-2" />
                  <span className="text-sm font-medium">{t('auth.logout')}</span>
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