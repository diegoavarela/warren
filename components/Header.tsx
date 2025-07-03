"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronDownIcon, UserCircleIcon, ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import { useTranslation } from "@/lib/translations";
import { Button } from "./ui/Button";

export function Header() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const { locale, setLocale } = useLocale();
  const { t } = useTranslation(locale);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const locales = [
    { code: 'es-MX', name: 'Español (México)', flag: '🇲🇽' },
    { code: 'es-AR', name: 'Español (Argentina)', flag: '🇦🇷' },
    { code: 'es-CO', name: 'Español (Colombia)', flag: '🇨🇴' },
    { code: 'en-US', name: 'English (US)', flag: '🇺🇸' },
  ];

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo and title */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-green-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">W</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Warren</h1>
              <p className="text-xs text-gray-500">Financial Parser</p>
            </div>
          </div>

          {/* Navigation and controls */}
          <div className="flex items-center space-x-4">
            {/* Locale selector */}
            <div className="relative">
              <div className="flex items-center">
                <span className="text-lg mr-1">
                  {locales.find(l => l.code === locale)?.flag || '🌐'}
                </span>
                <select
                  value={locale}
                  onChange={(e) => setLocale(e.target.value)}
                  className="appearance-none bg-gray-50 border border-gray-300 rounded-lg pl-2 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {locales.map((loc) => (
                    <option key={loc.code} value={loc.code}>
                      {loc.name}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Auth section */}
            {isAuthenticated && user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <UserCircleIcon className="w-6 h-6 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {user.firstName} {user.lastName}
                  </span>
                  <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                </button>
                
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <ArrowRightOnRectangleIcon className="w-4 h-4" />
                      <span>{t('auth.logout')}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/login')}
                >
                  {t('auth.login')}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => router.push('/signup')}
                >
                  {t('auth.signup')}
                </Button>
              </div>
            )}

            {/* API status */}
            <div className="hidden lg:flex items-center space-x-2 px-3 py-1 bg-green-50 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-700 font-medium">
                {locale?.startsWith('es') ? 'API Activa' : 'API Active'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}