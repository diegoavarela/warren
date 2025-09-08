"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody, CardTitle, CardDescription } from '@/components/ui/Card';
import {
  CogIcon,
  BellIcon,
  ShieldCheckIcon,
  CheckIcon,
  ArrowLeftIcon,
  XCircleIcon,
  CheckCircleIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  GlobeAltIcon,
  UserGroupIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { ROLES } from '@/lib/auth/rbac';

interface SettingSection {
  id: string;
  title: string;
  description: string;
  icon: any;
}

interface OrganizationSettings {
  general: {
    name: string;
    locale: string;
    baseCurrency: string;
    timezone: string;
  };
  security: {
    requireTwoFactor: boolean;
    sessionTimeout: number;
    allowedDomains: string[];
  };
  notifications: {
    newUserNotification: boolean;
    newCompanyNotification: boolean;
  };
}

function OrganizationSettingsPage() {
  const router = useRouter();
  const { user, organization } = useAuth();
  const { locale } = useLocale();
  const [activeSection, setActiveSection] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [formData, setFormData] = useState<OrganizationSettings | null>(null);
  const [usageData, setUsageData] = useState<any>(null);
  const [usageLoading, setUsageLoading] = useState(true);

  const sections: SettingSection[] = [
    {
      id: 'general',
      title: locale?.startsWith('es') ? 'General' : 'General',
      description: locale?.startsWith('es') 
        ? 'Configuración básica de la organización'
        : 'Basic organization settings',
      icon: BuildingOfficeIcon
    },
    {
      id: 'security',
      title: locale?.startsWith('es') ? 'Seguridad' : 'Security',
      description: locale?.startsWith('es')
        ? 'Configuración de seguridad y acceso'
        : 'Security and access settings',
      icon: ShieldCheckIcon
    },
    {
      id: 'notifications',
      title: locale?.startsWith('es') ? 'Notificaciones' : 'Notifications',
      description: locale?.startsWith('es')
        ? 'Preferencias de notificaciones'
        : 'Notification preferences',
      icon: BellIcon
    },
    {
      id: 'plan',
      title: locale?.startsWith('es') ? 'Plan' : 'Plan',
      description: locale?.startsWith('es')
        ? 'Configuración del plan y límites'
        : 'Plan settings and limits',
      icon: SparklesIcon
    }
  ];

  useEffect(() => {
    if (organization) {
      // Initialize with organization data
      const initialSettings: OrganizationSettings = {
        general: {
          name: organization.name || '',
          locale: organization.locale || 'en-US',
          baseCurrency: organization.baseCurrency || 'USD',
          timezone: organization.timezone || 'UTC'
        },
        security: {
          requireTwoFactor: false,
          sessionTimeout: 86400,
          allowedDomains: []
        },
        notifications: {
          newUserNotification: true,
          newCompanyNotification: true
        }
      };
      setSettings(initialSettings);
      setFormData(initialSettings);
      setLoading(false);
      
      // Fetch usage data for plan tab
      fetchUsageData();
    }
  }, [organization]);

  const fetchUsageData = async () => {
    if (!organization?.id) return;
    
    try {
      setUsageLoading(true);
      
      // Get current company from session storage (if available)
      let currentCompany = JSON.parse(sessionStorage.getItem('currentCompany') || '{}');
      
      // If no company in session, find the first active company in the organization
      if (!currentCompany.id && organization?.id) {
        try {
          const orgResponse = await fetch(`/api/organizations/${organization.id}/usage`);
          if (orgResponse.ok) {
            const orgData = await orgResponse.json();
            if (orgData.success && orgData.data.companies && orgData.data.companies.length > 0) {
              // Find first company with actual usage (used > 0), then with balance > 0, then first one
              const companyWithUsage = orgData.data.companies.find(c => parseFloat(c.used || 0) > 0);
              const companyWithCredits = orgData.data.companies.find(c => parseFloat(c.balance || 0) > 0);
              const firstCompany = companyWithUsage || companyWithCredits || orgData.data.companies[0];
              
              currentCompany = {
                id: firstCompany.companyId,
                name: firstCompany.companyName
              };
            }
          }
        } catch (error) {
          // Auto-selection failed, will fall back to organization data
        }
      }
      
      if (currentCompany.id) {
        // Get individual company usage data instead of organization totals
        const companyResponse = await fetch(`/api/companies/${currentCompany.id}`);
        if (companyResponse.ok) {
          const companyData = await companyResponse.json();
          if (companyData.success && companyData.data) {
            // Format the data to match the expected structure
            const individualData = {
              users: { current: 0, max: 0, remaining: 0, percentage: 0 }, // Not relevant for company view
              aiCredits: {
                balance: parseFloat(companyData.data.aiCreditsBalance || '0'),
                used: parseFloat(companyData.data.aiCreditsUsed || '0'),
                monthly: parseFloat(companyData.data.tier?.aiCreditsMonthly || '0'),
                resetDate: companyData.data.aiCreditsResetDate,
              },
              tier: {
                id: companyData.data.tier?.id || '',
                name: companyData.data.tier?.name || '',
                displayName: companyData.data.tier?.displayName || 'Advanced',
              },
              companyContext: {
                isIndividual: true,
                companyName: companyData.data.name,
              }
            };
            setUsageData(individualData);
            return;
          }
        }
      }
      
      // Fallback to organization usage if no current company
      const response = await fetch(`/api/organizations/${organization.id}/usage`);
      if (!response.ok) {
        throw new Error('Failed to fetch usage data');
      }
      const data = await response.json();
      const orgData = {
        ...data.data,
        companyContext: {
          isIndividual: false,
          companyName: null,
        }
      };
      setUsageData(orgData);
    } catch (err) {
      console.error('Failed to load usage data:', err);
    } finally {
      setUsageLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData || !organization) return;

    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      // Update organization settings using the dedicated settings endpoint
      const response = await fetch(`/api/organizations/${organization.id}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.general.name,
          locale: formData.general.locale,
          baseCurrency: formData.general.baseCurrency,
          timezone: formData.general.timezone,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to save settings');
      }

      setSettings(formData);
      setSaved(true);
      
      // Clear saved indicator after 3 seconds
      setTimeout(() => setSaved(false), 3000);
      
      // Refresh organization data
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    router.push('/dashboard/org-admin');
  };

  const renderGeneralSettings = () => {
    if (!formData) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {locale?.startsWith('es') ? 'Nombre de la Organización' : 'Organization Name'}
          </label>
          <input
            type="text"
            value={formData.general.name}
            onChange={(e) => setFormData({
              ...formData,
              general: { ...formData.general, name: e.target.value }
            })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {locale?.startsWith('es') ? 'Idioma Predeterminado' : 'Default Language'}
          </label>
          <select
            value={formData.general.locale}
            onChange={(e) => setFormData({
              ...formData,
              general: { ...formData.general, locale: e.target.value }
            })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
          >
            <option value="en-US">English (US)</option>
            <option value="es-MX">Español (México)</option>
            <option value="es-ES">Español (España)</option>
            <option value="pt-BR">Português (Brasil)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {locale?.startsWith('es') ? 'Moneda Base' : 'Base Currency'}
          </label>
          <select
            value={formData.general.baseCurrency}
            onChange={(e) => setFormData({
              ...formData,
              general: { ...formData.general, baseCurrency: e.target.value }
            })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
          >
            <option value="USD">🇺🇸 USD - US Dollar</option>
            <option value="EUR">🇪🇺 EUR - Euro</option>
            <option value="MXN">🇲🇽 MXN - Mexican Peso</option>
            <option value="BRL">🇧🇷 BRL - Brazilian Real</option>
            <option value="GBP">🇬🇧 GBP - British Pound</option>
            <option value="CLP">🇨🇱 CLP - Chilean Peso</option>
            <option value="ARS">🇦🇷 ARS - Argentine Peso</option>
            <option value="COP">🇨🇴 COP - Colombian Peso</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {locale?.startsWith('es') ? 'Zona Horaria' : 'Timezone'}
          </label>
          <select
            value={formData.general.timezone}
            onChange={(e) => setFormData({
              ...formData,
              general: { ...formData.general, timezone: e.target.value }
            })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
          >
            <option value="America/Mexico_City">America/Mexico_City</option>
            <option value="America/New_York">America/New_York</option>
            <option value="America/Los_Angeles">America/Los_Angeles</option>
            <option value="America/Sao_Paulo">America/Sao_Paulo</option>
            <option value="Europe/Madrid">Europe/Madrid</option>
            <option value="America/Buenos_Aires">America/Buenos_Aires</option>
            <option value="America/Santiago">America/Santiago</option>
          </select>
        </div>
      </div>
    );
  };

  const renderSecuritySettings = () => {
    if (!formData) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={formData.security.requireTwoFactor}
              onChange={(e) => setFormData({
                ...formData,
                security: { ...formData.security, requireTwoFactor: e.target.checked }
              })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">
              {locale?.startsWith('es') ? 'Requerir autenticación de dos factores' : 'Require two-factor authentication'}
            </span>
          </label>
          <p className="ml-7 text-sm text-gray-500 mt-1">
            {locale?.startsWith('es') 
              ? 'Los usuarios deberán configurar 2FA para acceder'
              : 'Users will need to set up 2FA to access'}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {locale?.startsWith('es') ? 'Tiempo de sesión (horas)' : 'Session timeout (hours)'}
          </label>
          <input
            type="number"
            value={formData.security.sessionTimeout / 3600}
            onChange={(e) => setFormData({
              ...formData,
              security: { ...formData.security, sessionTimeout: parseInt(e.target.value) * 3600 }
            })}
            min="1"
            max="168"
            className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
    );
  };

  const renderNotificationSettings = () => {
    if (!formData) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={formData.notifications.newUserNotification}
              onChange={(e) => setFormData({
                ...formData,
                notifications: { ...formData.notifications, newUserNotification: e.target.checked }
              })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">
              {locale?.startsWith('es') ? 'Notificar nuevos usuarios' : 'Notify new users'}
            </span>
          </label>
          <p className="ml-7 text-sm text-gray-500 mt-1">
            {locale?.startsWith('es') 
              ? 'Recibir notificaciones cuando se creen nuevos usuarios'
              : 'Receive notifications when new users are created'}
          </p>
        </div>

        <div>
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={formData.notifications.newCompanyNotification}
              onChange={(e) => setFormData({
                ...formData,
                notifications: { ...formData.notifications, newCompanyNotification: e.target.checked }
              })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">
              {locale?.startsWith('es') ? 'Notificar nuevas empresas' : 'Notify new companies'}
            </span>
          </label>
          <p className="ml-7 text-sm text-gray-500 mt-1">
            {locale?.startsWith('es') 
              ? 'Recibir notificaciones cuando se creen nuevas empresas'
              : 'Receive notifications when new companies are created'}
          </p>
        </div>
      </div>
    );
  };

  const renderPlanSettings = () => {
    if (usageLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">
            {locale?.startsWith('es') ? 'Cargando información del plan...' : 'Loading plan information...'}
          </span>
        </div>
      );
    }

    if (!usageData) {
      return (
        <div className="text-center py-8">
          <p className="text-red-500">
            {locale?.startsWith('es') ? 'No se pudo cargar la información del plan' : 'Failed to load plan information'}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Consolidated Plan Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          {/* Header with Plan Name and Upgrade Button */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-blue-900 mb-1">
                {locale?.startsWith('es') ? 'Plan Actual' : 'Current Plan'}: {usageData.tier.displayName}
              </h3>
              <p className="text-sm text-blue-700">
                {usageData.companyContext?.isIndividual 
                  ? (locale?.startsWith('es') 
                      ? `${usageData.companyContext.companyName} • $${usageData.aiCredits.monthly} AI créditos/mes`
                      : `${usageData.companyContext.companyName} • $${usageData.aiCredits.monthly} AI credits/month`)
                  : (locale?.startsWith('es') 
                      ? `${usageData.users.max} usuarios • $${usageData.aiCredits.monthly} AI créditos/mes` 
                      : `${usageData.users.max} users • $${usageData.aiCredits.monthly} AI credits/month`)
                }
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => router.push('/premium')}
              className="text-blue-600 border-blue-300 hover:bg-blue-100"
            >
              {locale?.startsWith('es') ? 'Actualizar Plan' : 'Upgrade Plan'}
            </Button>
          </div>

          {/* Ultra-Compact Usage Information */}
          <div className="pt-3 mt-3 border-t border-blue-200">
            <div className="flex items-center justify-between text-xs text-blue-700">
              {/* Users - Only show for organization view */}
              {!usageData.companyContext?.isIndividual && (
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-blue-800">
                    {locale?.startsWith('es') ? 'Usuarios:' : 'Users:'}
                  </span>
                  <span>{usageData.users.current}/{usageData.users.max}</span>
                  <div className="w-12 bg-blue-200 rounded-full h-1">
                    <div 
                      className="bg-blue-600 h-1 rounded-full transition-all"
                      style={{ width: `${Math.min((usageData.users.current / usageData.users.max) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
              
              {/* AI Credits - Minimal */}
              <div className="flex items-center space-x-2">
                <span className="font-medium text-blue-800">
                  {locale?.startsWith('es') ? 'Créditos IA:' : 'AI Credits:'}
                </span>
                <span>US$ {usageData.aiCredits.balance?.toFixed(2) || '0,00'}</span>
                <div className="w-12 bg-blue-200 rounded-full h-1">
                  <div 
                    className="bg-blue-600 h-1 rounded-full transition-all"
                    style={{ 
                      width: usageData.aiCredits.monthly > 0 
                        ? `${Math.min((usageData.aiCredits.used / usageData.aiCredits.monthly) * 100, 100)}%` 
                        : '0%'
                    }}
                  />
                </div>
              </div>
              
              {/* Reset Date */}
              {usageData.aiCredits.resetDate && (
                <span className="text-blue-600">
                  {locale?.startsWith('es') ? 'Reset:' : 'Reset:'} {new Date(usageData.aiCredits.resetDate).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'general':
        return renderGeneralSettings();
      case 'security':
        return renderSecuritySettings();
      case 'notifications':
        return renderNotificationSettings();
      case 'plan':
        return renderPlanSettings();
      default:
        return null;
    }
  };

  return (
    <AppLayout showFooter={true}>
      <div className="w-full px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="mb-4 whitespace-nowrap"
            leftIcon={<ArrowLeftIcon className="w-4 h-4" />}
          >
            {locale?.startsWith('es') ? 'Volver al panel' : 'Back to dashboard'}
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {locale?.startsWith('es') ? 'Configuración de Organización' : 'Organization Settings'}
              </h1>
              <p className="text-gray-600 mt-2">
                {locale?.startsWith('es')
                  ? 'Administra la configuración de tu organización'
                  : 'Manage your organization settings'}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`group inline-flex items-center px-1 py-4 border-b-2 font-medium text-sm transition-colors ${
                      activeSection === section.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`mr-2 h-5 w-5 ${
                      activeSection === section.id
                        ? 'text-blue-500'
                        : 'text-gray-400 group-hover:text-gray-500'
                    }`} />
                    {section.title}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="w-full">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  {sections.find(s => s.id === activeSection)?.title}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {sections.find(s => s.id === activeSection)?.description}
                </p>
              </div>
              <div>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-600">
                      {locale?.startsWith('es') ? 'Cargando configuración...' : 'Loading settings...'}
                    </span>
                  </div>
                ) : (
                  renderContent()
                )}
                
                {/* Error/Success Messages */}
                {error && (
                  <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
                    <XCircleIcon className="w-5 h-5 text-red-600 mr-3 flex-shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}
                
                {saved && (
                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
                    <CheckCircleIcon className="w-5 h-5 text-green-600 mr-3 flex-shrink-0" />
                    <p className="text-sm text-green-700">
                      {locale?.startsWith('es') 
                        ? 'Configuración guardada exitosamente' 
                        : 'Settings saved successfully'}
                    </p>
                  </div>
                )}
                
                {/* Save Button - Only show for editable tabs */}
                {activeSection !== 'plan' && (
                  <div className="mt-8 flex justify-end space-x-4">
                    <Button 
                      variant="outline"
                      disabled={saving}
                      onClick={() => {
                        setFormData(settings);
                        setError(null);
                      }}
                    >
                      {locale?.startsWith('es') ? 'Cancelar' : 'Cancel'}
                    </Button>
                    <Button
                      variant="primary"
                      loading={saving}
                      onClick={handleSave}
                      leftIcon={saved ? <CheckIcon className="w-4 h-4" /> : undefined}
                    >
                      {saving
                        ? (locale?.startsWith('es') ? 'Guardando...' : 'Saving...')
                        : saved 
                        ? (locale?.startsWith('es') ? 'Guardado ✓' : 'Saved ✓')
                        : (locale?.startsWith('es') ? 'Guardar Cambios' : 'Save Changes')
                      }
                    </Button>
                  </div>
                )}
              </div>
            </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default function OrgAdminSettingsPage() {
  return (
    <ProtectedRoute requireRole={[ROLES.ORGANIZATION_ADMIN, ROLES.PLATFORM_ADMIN]}>
      <OrganizationSettingsPage />
    </ProtectedRoute>
  );
}