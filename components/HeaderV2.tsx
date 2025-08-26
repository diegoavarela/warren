"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { 
  ChevronDownIcon, 
  ChevronRightIcon,
  UserCircleIcon, 
  ArrowRightOnRectangleIcon,
  HomeIcon,
  CogIcon,
  BellIcon,
  MagnifyingGlassIcon,
  Bars3Icon,
  BuildingOfficeIcon,
  ChartBarIcon
} from "@heroicons/react/24/outline";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import { useTranslation } from "@/lib/translations";
import { Button } from "./ui/Button";
import { ROLES } from "@/lib/auth/rbac";

interface HeaderProps {
  onSearchOpen?: () => void;
}

export function HeaderV2({ onSearchOpen }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, organization, isAuthenticated, logout } = useAuth();
  const { locale, setLocale } = useLocale();
  const { t } = useTranslation(locale || 'en-US');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const locales = [
    { code: 'es-AR', name: 'Español (Argentina)', flag: '🇦🇷' },
    { code: 'es-CO', name: 'Español (Colombia)', flag: '🇨🇴' },
    { code: 'en-US', name: 'English (US)', flag: '🇺🇸' },
  ];

  const [notifications, setNotifications] = useState([
    {
      id: '1',
      title: locale?.startsWith('es') ? 'Nueva empresa registrada' : 'New company registered',
      time: locale?.startsWith('es') ? 'hace 5 min' : '5 min ago',
      read: false,
      action: 'view_companies'
    },
    {
      id: '2',
      title: locale?.startsWith('es') ? 'Actualización del sistema completada' : 'System update completed',
      time: locale?.startsWith('es') ? 'hace 1 hora' : '1 hour ago',
      read: true,
      action: 'view_updates'
    }
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = (notification: any) => {
    
    // Mark notification as read
    setNotifications(prev => 
      prev.map(n => 
        n.id === notification.id ? { ...n, read: true } : n
      )
    );

    // Handle different notification actions
    switch (notification.action) {
      case 'view_companies':
        router.push('/dashboard/org-admin');
        break;
      case 'view_updates':
        // For now just show an alert, later this could navigate to changelog
        alert('System update: Performance improvements and bug fixes applied successfully!');
        break;
      default:
    }

    // Close notifications dropdown
    setShowNotifications(false);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleProfileClick = () => {
    router.push('/profile');
    setShowUserMenu(false);
  };

  const handleSettingsClick = () => {
    router.push('/dashboard/platform-admin/settings');
    setShowUserMenu(false);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Check if we're in a workflow
  const isInWorkflow = pathname && (
    pathname.includes('/upload') ||
    pathname.includes('/select-sheet') ||
    pathname.includes('/period-identification') ||
    pathname.includes('/persist')
  ) && !pathname.includes('/enhanced-mapper');

  // Get workflow step info
  const getWorkflowStep = () => {
    if (!pathname) return null;
    if (pathname.includes('/upload')) return { step: 1, name: 'upload' };
    if (pathname.includes('/select-sheet')) return { step: 2, name: 'select-sheet' };
    if (pathname.includes('/period-identification')) return { step: 3, name: 'identify-periods' };
    if (pathname.includes('/persist')) return { step: 4, name: 'save' };
    return null;
  };

  const getBreadcrumbs = () => {
    if (!pathname) return [];
    
    const breadcrumbs = [];
    
    // Don't add Dashboard to breadcrumbs for P&L and Cash Flow dashboards
    const isFinancialDashboard = pathname.includes('/pnl') || pathname.includes('/cashflow');
    
    // Add Dashboard as the root only if not in financial dashboards
    if (!isFinancialDashboard) {
      breadcrumbs.push({ 
        path: '/dashboard', 
        label: locale?.startsWith('es') ? 'Panel' : 'Dashboard' 
      });
    }
    
    // Special handling for workflow pages
    if (isInWorkflow) {
      const workflowStep = getWorkflowStep();
      
      // Add workflow steps
      const workflowSteps = [
        { name: 'upload', label: locale?.startsWith('es') ? 'Subir' : 'Upload', path: '/upload' },
        { name: 'select-sheet', label: locale?.startsWith('es') ? 'Seleccionar Hoja' : 'Select Sheet', path: '/select-sheet' },
        { name: 'identify-periods', label: locale?.startsWith('es') ? 'Identificar Periodos' : 'Identify Periods', path: '/period-identification' },
        { name: 'save', label: locale?.startsWith('es') ? 'Guardar' : 'Save', path: '/persist' }
      ];
      
      for (let i = 0; i < workflowSteps.length; i++) {
        const step = workflowSteps[i];
        const isCurrentStep = workflowStep?.name === step.name;
        const isPastStep = workflowStep && i < (workflowStep.step - 1);
        
        breadcrumbs.push({
          path: isPastStep || isCurrentStep ? step.path : undefined,
          label: step.label,
          isCurrent: isCurrentStep,
          isDisabled: !isPastStep && !isCurrentStep
        });
      }
      
      return breadcrumbs;
    }
    
    // Regular breadcrumbs for non-workflow pages
    const paths = pathname.split('/').filter(Boolean);
    
    // Skip 'dashboard' since we already added it
    const startIndex = paths[0] === 'dashboard' ? 1 : 0;
    
    // Check if we have company context for enhanced-mapper
    if (pathname === '/enhanced-mapper' && typeof window !== 'undefined') {
      const companyName = sessionStorage.getItem('selectedCompanyName');
      if (companyName) {
        breadcrumbs.push({
          path: '/dashboard/company-admin',
          label: locale?.startsWith('es') ? 'Admin Empresa' : 'Company Admin'
        });
      }
    }
    
    for (let i = startIndex; i < paths.length; i++) {
      const path = '/' + paths.slice(0, i + 1).join('/');
      let label = paths[i];
      
      // Skip UUIDs from breadcrumbs
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(label);
      if (isUUID) {
        continue; // Skip UUIDs entirely from breadcrumbs
      } else {
        const translations: Record<string, { es: string; en: string }> = {
          'dashboard': { es: 'Panel', en: 'Dashboard' },
          'platform-admin': { es: 'Admin Plataforma', en: 'Platform Admin' },
          'org-admin': { es: 'Admin Organización', en: 'Organization Admin' },
          'company-admin': { es: 'Admin Empresa', en: 'Company Admin' },
          'users': { es: 'Usuarios', en: 'Users' },
          'companies': { es: 'Empresas', en: 'Companies' },
          'organizations': { es: 'Organizaciones', en: 'Organizations' },
          'settings': { es: 'Configuración', en: 'Settings' },
          'profile': { es: 'Perfil', en: 'Profile' },
          'pnl': { es: 'Estado de Resultados', en: 'Profit & Loss' },
          'cashflow': { es: 'Flujo de Caja', en: 'Cash Flow' },
          'uploads': { es: 'Historial de Cargas', en: 'Upload History' },
          'subcategory-templates': { es: 'Plantillas de Subcategorías', en: 'Subcategory Templates' },
          'configurations': { es: 'Configuraciones', en: 'Configurations' },
          'new': { es: 'Nuevo', en: 'New' },
          'edit': { es: 'Editar', en: 'Edit' },
          'enhanced-mapper': { es: 'Mapear Cuentas', en: 'Map Accounts' },
          'upload': { es: 'Subir', en: 'Upload' },
          'select-sheet': { es: 'Seleccionar Hoja', en: 'Select Sheet' },
          'period-identification': { es: 'Identificar Periodos', en: 'Identify Periods' },
          'persist': { es: 'Guardar', en: 'Save' }
        };
        
        if (translations[label]) {
          label = locale?.startsWith('es') ? translations[label].es : translations[label].en;
        } else {
          // Capitalize first letter
          label = label.charAt(0).toUpperCase() + label.slice(1);
        }
      }
      
      breadcrumbs.push({ path, label, isCurrent: i === paths.length - 1 });
    }
    
    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <>
      {/* Main Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left side - Logo and Organization */}
            <div className="flex items-center space-x-6">
              <button 
                onClick={() => router.push(isAuthenticated ? '/dashboard' : '/')}
                className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
                  <span className="text-white font-bold text-sm">W</span>
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-xl font-bold text-gray-900">Warren</h1>
                </div>
              </button>

              {/* Organization and Company Context */}
              {isAuthenticated && organization && (
                <div className="hidden lg:flex items-center space-x-4">
                  <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-50 rounded-lg">
                    <BuildingOfficeIcon className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">{organization.name}</span>
                  </div>
                  {typeof window !== 'undefined' && sessionStorage.getItem('selectedCompanyName') && (
                    <div className="flex items-center space-x-2 px-3 py-1.5 bg-blue-50 rounded-lg">
                      <BuildingOfficeIcon className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium text-blue-700">{sessionStorage.getItem('selectedCompanyName')}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="sm:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <Bars3Icon className="w-5 h-5 text-gray-600" />
            </button>

            {/* Right side controls */}
            <div className="hidden sm:flex items-center space-x-3">
              {/* Search */}
              {isAuthenticated && (
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('openGlobalHelp'))}
                  className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 group"
                >
                  <MagnifyingGlassIcon className="w-5 h-5" />
                  <span className="text-sm hidden md:inline">{locale?.startsWith('es') ? 'Buscar' : 'Search'}</span>
                  <kbd className="hidden md:inline-flex items-center gap-1 rounded border bg-gray-100 px-1.5 text-[10px] font-medium text-gray-600 group-hover:bg-white">
                    <span className="text-xs">⌘</span>K
                  </kbd>
                </button>
              )}

              {/* Notifications */}
              {isAuthenticated && (
                <div className="relative" ref={notificationRef}>
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
                  >
                    <BellIcon className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
                    )}
                  </button>
                  
                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <h3 className="font-medium text-gray-900">
                          {locale?.startsWith('es') ? 'Notificaciones' : 'Notifications'}
                        </h3>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.map((notification) => (
                          <div
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-all duration-200 hover:translate-x-1 ${
                              !notification.read ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                                <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                              </div>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1 flex-shrink-0"></div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* User menu */}
              {isAuthenticated && user ? (
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-gray-600 to-gray-700 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {user.firstName?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-medium text-gray-700">{user.firstName} {user.lastName}</p>
                      <p className="text-xs text-gray-500">{locale?.startsWith('es') ? 'Mi Perfil' : 'My Profile'}</p>
                    </div>
                    <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                  </button>
                  
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                        {organization && (
                          <p className="text-xs text-gray-600 mt-1">{organization.name}</p>
                        )}
                      </div>
                      <button
                        onClick={handleProfileClick}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                      >
                        <UserCircleIcon className="w-4 h-4" />
                        <span>{locale?.startsWith('es') ? 'Mi Perfil' : 'My Profile'}</span>
                      </button>
                      <button
                        onClick={handleSettingsClick}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                      >
                        <CogIcon className="w-4 h-4" />
                        <span>{locale?.startsWith('es') ? 'Configuración' : 'Settings'}</span>
                      </button>
                      <div className="border-t border-gray-100 mt-1"></div>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
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
                    {mounted ? t('auth.login') : 'Sign In'}
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => router.push('/signup')}
                  >
                    {mounted ? t('auth.signup') : 'Sign Up'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumbs Bar */}
      {isAuthenticated && breadcrumbs.length > 0 && pathname !== '/' && (
        <div className="bg-gray-50 border-b border-gray-200 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-10">
            <nav className="flex items-center space-x-2 text-sm">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <HomeIcon className="w-4 h-4" />
              </button>
              {breadcrumbs.map((crumb, index) => (
                <div key={`${crumb.path || crumb.label}-${index}`} className="flex items-center">
                  <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                  <button
                    onClick={() => crumb.path && router.push(crumb.path)}
                    disabled={('isDisabled' in crumb ? crumb.isDisabled : false) || !crumb.path}
                    className={`ml-2 transition-colors ${
                      crumb.isCurrent 
                        ? 'text-blue-600 font-medium cursor-default' 
                        : ('isDisabled' in crumb ? crumb.isDisabled : false) || !crumb.path
                          ? 'text-gray-400 cursor-default'
                          : 'text-gray-600 hover:text-blue-600 cursor-pointer'
                    }`}
                  >
                    {crumb.label}
                  </button>
                </div>
              ))}
              
              {/* Show workflow step info */}
              {isInWorkflow && (
                <div className="flex items-center ml-4 text-xs text-gray-500">
                  <span className="mx-2">•</span>
                  <span>
                    {locale?.startsWith('es') ? 'Paso' : 'Step'} {getWorkflowStep()?.step} {locale?.startsWith('es') ? 'de' : 'of'} 5
                  </span>
                </div>
              )}
            </nav>
            
            {/* Language selector in breadcrumb bar */}
            <div className="relative">
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-md pl-8 pr-8 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {locales.map((loc) => (
                  <option key={loc.code} value={loc.code}>
                    {loc.name}
                  </option>
                ))}
              </select>
              <span className="absolute left-2 top-1/2 transform -translate-y-1/2 pointer-events-none text-sm">
                {mounted ? (locales.find(l => l.code === locale)?.flag || '🌐') : '🌐'}
              </span>
              <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}