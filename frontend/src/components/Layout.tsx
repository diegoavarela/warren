import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTranslation } from 'react-i18next'
import { 
  ChartBarIcon, 
  ArrowUpTrayIcon, 
  ArrowRightOnRectangleIcon,
  LanguageIcon 
} from '@heroicons/react/24/outline'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth()
  const { t, i18n } = useTranslation()
  const location = useLocation()

  const navigation = [
    { name: t('navigation.dashboard'), href: '/', icon: ChartBarIcon },
    { name: t('navigation.upload'), href: '/upload', icon: ArrowUpTrayIcon },
  ]

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'es' : 'en'
    i18n.changeLanguage(newLang)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <div className="w-8 h-8 bg-vortex-green rounded-full flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white rounded-full border-l-transparent animate-spin" 
                       style={{ borderRadius: '50% 50% 50% 0' }}></div>
                </div>
                <span className="ml-3 text-xl font-bold text-gray-900">Vortex</span>
              </div>
              
              <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
                {navigation.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                        isActive
                          ? 'border-vortex-green text-gray-900'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={toggleLanguage}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                title={t('common.language')}
              >
                <LanguageIcon className="w-5 h-5" />
                <span className="ml-1 text-sm font-medium">
                  {i18n.language.toUpperCase()}
                </span>
              </button>

              <div className="text-sm text-gray-700">
                {user?.email}
              </div>

              <button
                onClick={logout}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4 mr-1" />
                {t('auth.logout')}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}