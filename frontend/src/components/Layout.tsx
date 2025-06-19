import { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { GlobeAltIcon } from '@heroicons/react/24/outline'
import { Footer } from './Footer'
import { Navbar } from './Navbar'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { t, i18n } = useTranslation()

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'es' : 'en'
    i18n.changeLanguage(newLang)
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex flex-col">
      {/* Unified Navbar */}
      <Navbar />

      {/* Language Switcher - Floating */}
      <div className="fixed top-20 right-4 z-40">
        <button
          onClick={toggleLanguage}
          className="p-2 bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors shadow-lg border border-gray-200"
          title={t('common.language')}
        >
          <GlobeAltIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 pt-16 pb-4 flex flex-col min-h-0">
        {children}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}