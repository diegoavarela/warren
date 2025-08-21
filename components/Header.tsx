"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { 
  ChevronDownIcon, 
  UserCircleIcon, 
  ArrowRightOnRectangleIcon,
  HomeIcon,
  ChartBarIcon,
  CogIcon,
  BellIcon,
  Squares2X2Icon,
  DocumentTextIcon
} from "@heroicons/react/24/outline";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import { useTranslation } from "@/lib/translations";
import { Button } from "./ui/Button";
import { ROLES } from "@/lib/auth/rbac";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, organization, isAuthenticated, logout } = useAuth();
  const { locale, setLocale } = useLocale();
  const { t } = useTranslation(locale || 'en-US');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
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
        // Show update details or navigate to changelog
        console.log('System update notification clicked');
        break;
      default:
        console.log('Notification clicked:', notification.title);
    }

    // Close notifications dropdown
    setShowNotifications(false);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Handle client-side mounting
  useEffect(() => {
    setMounted(true);
    console.log('Header: Component mounted, isAuthenticated:', isAuthenticated, 'user:', user);
  }, []);

  // Debug authentication state changes
  useEffect(() => {
    console.log('Header: Auth state changed - isAuthenticated:', isAuthenticated, 'user:', user);
  }, [isAuthenticated, user]);

  // Close menus when clicking outside
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
    pathname.includes('/mapper') ||
    pathname.includes('/persist')
  );

  // Get workflow step info
  const getWorkflowStep = () => {
    if (!pathname) return null;
    if (pathname.includes('/upload')) return { step: 1, name: 'upload' };
    if (pathname.includes('/select-sheet')) return { step: 2, name: 'select-sheet' };
    if (pathname.includes('/period-identification')) return { step: 3, name: 'identify-periods' };
    if (pathname.includes('/mapper')) return { step: 4, name: 'map-accounts' };
    if (pathname.includes('/persist')) return { step: 5, name: 'save' };
    return null;
  };

  // Get breadcrumbs based on pathname
  const getBreadcrumbs = () => {
    if (!pathname) return [];
    
    const breadcrumbs = [];
    
    // Special handling for workflow pages
    if (isInWorkflow) {
      // Add Dashboard
      breadcrumbs.push({ 
        path: '/dashboard', 
        label: locale?.startsWith('es') ? 'Panel' : 'Dashboard' 
      });
      
      const workflowStep = getWorkflowStep();
      
      // Add workflow steps
      const workflowSteps = [
        { name: 'upload', label: locale?.startsWith('es') ? 'Subir' : 'Upload', path: '/upload' },
        { name: 'select-sheet', label: locale?.startsWith('es') ? 'Seleccionar Hoja' : 'Select Sheet', path: '/select-sheet' },
        { name: 'identify-periods', label: locale?.startsWith('es') ? 'Identificar Periodos' : 'Identify Periods', path: '/period-identification' },
        { name: 'map-accounts', label: locale?.startsWith('es') ? 'Mapear Cuentas' : 'Map Accounts', path: '/enhanced-mapper' },
        { name: 'save', label: locale?.startsWith('es') ? 'Guardar' : 'Save', path: '/persist' }
      ];
      
      for (let i = 0; i < workflowSteps.length; i++) {
        const step = workflowSteps[i];
        const isCurrentStep = workflowStep?.name === step.name;
        const isPastStep = workflowStep && i < (workflowStep.step - 1);
        
        breadcrumbs.push({
          path: isPastStep ? step.path : undefined,
          label: step.label,
          isCurrent: isCurrentStep,
          isDisabled: !isPastStep && !isCurrentStep
        });
        
        if (isCurrentStep) break;
      }
    } else {
      // Regular breadcrumbs for non-workflow pages
      const paths = pathname.split('/').filter(Boolean);
      
      // Build breadcrumbs by processing segments and skipping UUIDs
      let pathSoFar = '';
      
      
      for (let i = 0; i < paths.length; i++) {
        const segment = paths[i];
        pathSoFar += '/' + segment;
        
        // Skip dashboard in breadcrumbs
        if (segment === 'dashboard') continue;
        
        // Skip UUID-like segments completely
        if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(segment)) {
          continue;
        }
        
        
        let label = segment;
        
        // Translate common paths
        if (label === 'platform-admin') label = locale?.startsWith('es') ? 'Admin Plataforma' : 'Platform Admin';
        if (label === 'company-admin') label = locale?.startsWith('es') ? 'Admin Empresa' : 'Company Admin';
        if (label === 'org-admin') label = locale?.startsWith('es') ? 'Admin Organización' : 'Organization Admin';
        if (label === 'users') label = locale?.startsWith('es') ? 'Usuarios' : 'Users';
        if (label === 'companies') label = locale?.startsWith('es') ? 'Empresas' : 'Companies';
        if (label === 'settings') label = locale?.startsWith('es') ? 'Configuración' : 'Settings';
        if (label === 'edit') label = locale?.startsWith('es') ? 'Editar' : 'Edit';
        if (label === 'invite') label = locale?.startsWith('es') ? 'Invitar' : 'Invite';
        if (label === 'new') label = locale?.startsWith('es') ? 'Nuevo' : 'New';
        if (label === 'pnl') label = locale?.startsWith('es') ? 'Estado de Resultados' : 'Profit & Loss';
        if (label === 'cashflow') label = locale?.startsWith('es') ? 'Flujo de Caja' : 'Cash Flow';
        if (label === 'uploads') label = locale?.startsWith('es') ? 'Historial de Cargas' : 'Upload History';
        if (label === 'profile') label = locale?.startsWith('es') ? 'Perfil' : 'Profile';
        if (label === 'organizations') label = locale?.startsWith('es') ? 'Organizaciones' : 'Organizations';
        if (label === 'subcategory-templates') label = locale?.startsWith('es') ? 'Plantillas de Subcategorías' : 'Subcategory Templates';
        
        breadcrumbs.push({ 
          path: pathSoFar, 
          label: label.charAt(0).toUpperCase() + label.slice(1),
          isCurrent: i === paths.length - 1
        });
      }
    }
    
    return breadcrumbs;
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Navigation */}
          <div className="flex items-center space-x-8">
            <button 
              onClick={() => router.push(isAuthenticated ? '/dashboard' : '/')}
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-green-600 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-sm">W</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Warren</h1>
                <p className="text-xs text-gray-500 -mt-1">Financial Parser</p>
              </div>
            </button>
            
            {/* Breadcrumbs for authenticated users */}
            {isAuthenticated && pathname && pathname !== '/' && (
              <nav className="flex items-center space-x-1 text-sm flex-1 mx-4 overflow-x-auto">
                {/* Home icon as first breadcrumb */}
                <button
                  onClick={() => router.push('/')}
                  className="flex items-center text-gray-600 hover:text-blue-600 transition-colors flex-shrink-0 p-1"
                  title={locale?.startsWith('es') ? 'Inicio' : 'Home'}
                >
                  <HomeIcon className="w-4 h-4" />
                </button>
                
                {getBreadcrumbs().map((crumb, index) => (
                  <div key={`${crumb.path || crumb.label}-${index}`} className="flex items-center">
                    <ChevronDownIcon className="w-4 h-4 text-gray-400 mx-1 rotate-[-90deg] flex-shrink-0" />
                    <button
                      onClick={() => crumb.path && router.push(crumb.path)}
                      disabled={crumb.isDisabled || !crumb.path}
                      className={`transition-colors whitespace-nowrap px-1 ${
                        crumb.isCurrent 
                          ? 'text-blue-600 font-medium cursor-default' 
                          : crumb.isDisabled || !crumb.path
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
                  <div className="flex items-center ml-2 text-xs text-gray-500 flex-shrink-0">
                    <span className="mx-2">•</span>
                    <span>
                      {locale?.startsWith('es') ? 'Paso' : 'Step'} {getWorkflowStep()?.step} {locale?.startsWith('es') ? 'de' : 'of'} 5
                    </span>
                  </div>
                )}
              </nav>
            )}
          </div>

          {/* Right side controls */}
          <div className="flex items-center space-x-4">
            {/* Quick Actions for authenticated users */}
            {isAuthenticated && user && (
              <>
                {/* Notifications */}
                <div className="relative" ref={notificationRef}>
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:shadow-md transform hover:-translate-y-0.5"
                  >
                    <BellIcon className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    )}
                  </button>
                  
                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 animate-scale-in transform origin-top-right">
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
                      <div className="px-4 py-2 border-t border-gray-100">
                        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                          {locale?.startsWith('es') ? 'Ver todas' : 'View all'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Access Grid */}
                {(user.role === ROLES.SUPER_ADMIN || user.role === ROLES.ORG_ADMIN) && (
                  <button
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:shadow-md transform hover:-translate-y-0.5"
                    onClick={() => router.push('/dashboard/platform-admin')}
                  >
                    <Squares2X2Icon className="w-5 h-5" />
                  </button>
                )}
              </>
            )}

            {/* Locale selector */}
            <div className="relative">
              <div className="flex items-center">
                <span className="text-lg mr-1">
                  {mounted ? (locales.find(l => l.code === locale)?.flag || '🌐') : '🌐'}
                </span>
                <select
                  value={locale}
                  onChange={(e) => setLocale(e.target.value)}
                  className="appearance-none bg-gray-50 border border-gray-300 rounded-lg pl-2 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:bg-gray-100 transition-colors"
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
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-all duration-200 hover:shadow-md transform hover:-translate-y-0.5"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-gray-600 to-gray-700 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user.firstName?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-700 hidden md:block">
                    {user.firstName} {user.lastName}
                  </span>
                  <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                </button>
                
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 animate-scale-in transform origin-top-right">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                      <div className="mt-2">
                        <p className="text-xs text-gray-400">
                          {user.role === 'super_admin' && (locale?.startsWith('es') ? 'Administrador de Plataforma' : 'Platform Administrator')}
                          {user.role === 'admin' && (
                            <>
                              {locale?.startsWith('es') ? 'Administrador de Organización' : 'Organization Administrator'}
                              {organization && (
                                <span className="block text-xs font-medium text-gray-600 mt-1">
                                  {organization.name}
                                </span>
                              )}
                            </>
                          )}
                          {(user.role === 'user' || user.role === 'viewer') && (locale?.startsWith('es') ? 'Usuario' : 'User')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        router.push('/dashboard');
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2 transition-all duration-200 hover:translate-x-1"
                    >
                      <HomeIcon className="w-4 h-4" />
                      <span>{locale?.startsWith('es') ? 'Dashboard' : 'Dashboard'}</span>
                    </button>
                    <button
                      onClick={() => {
                        router.push('/profile');
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2 transition-all duration-200 hover:translate-x-1"
                    >
                      <UserCircleIcon className="w-4 h-4" />
                      <span>{locale?.startsWith('es') ? 'Mi Perfil' : 'My Profile'}</span>
                    </button>
                    {(user.role === ROLES.SUPER_ADMIN || user.role === ROLES.ORG_ADMIN || user.role === 'admin') && (
                      <button
                        onClick={() => {
                          if (user.role === ROLES.SUPER_ADMIN) {
                            router.push('/dashboard/platform-admin/settings');
                          } else {
                            router.push('/dashboard/org-admin/settings');
                          }
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2 transition-all duration-200 hover:translate-x-1"
                      >
                        <CogIcon className="w-4 h-4" />
                        <span>{locale?.startsWith('es') ? 'Configuración' : 'Settings'}</span>
                      </button>
                    )}
                    <div className="border-t border-gray-100 mt-1"></div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 transition-all duration-200 hover:translate-x-1"
                    >
                      <ArrowRightOnRectangleIcon className="w-4 h-4" />
                      <span>{t('auth.logout')}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2" data-testid="auth-buttons">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    console.log('Sign In button clicked');
                    router.push('/login');
                  }}
                  className="min-w-[80px] bg-opacity-100"
                  data-testid="sign-in-button"
                >
                  {mounted ? t('auth.login') : 'Sign In'}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    console.log('Sign Up button clicked');
                    router.push('/signup');
                  }}
                  className="min-w-[80px] bg-opacity-100"
                  data-testid="sign-up-button"
                >
                  {mounted ? t('auth.signup') : 'Sign Up'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}