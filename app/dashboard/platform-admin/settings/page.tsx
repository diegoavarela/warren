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
  GlobeAltIcon,
  DocumentTextIcon,
  CreditCardIcon,
  UserGroupIcon,
  ServerIcon,
  KeyIcon,
  CloudArrowUpIcon,
  CheckIcon,
  QuestionMarkCircleIcon,
  XCircleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { HelpIcon } from '@/components/HelpIcon';
import { ROLES } from '@/lib/auth/rbac';

interface SettingSection {
  id: string;
  title: string;
  description: string;
  icon: any;
}

interface SystemSettings {
  general: {
    systemName: string;
    systemUrl: string;
    defaultLanguage: string;
    timezone: string;
  };
  security: {
    requireTwoFactor: boolean;
    sessionTimeout: number;
    passwordMinLength: number;
    passwordRequireUppercase: boolean;
    passwordRequireNumbers: boolean;
  };
  notifications: {
    newUserNotification: boolean;
    newCompanyNotification: boolean;
    systemErrorNotification: boolean;
    resourceUsageNotification: boolean;
  };
}

export default function SettingsPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const [activeSection, setActiveSection] = useState('general');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);

  const sections: SettingSection[] = [
    {
      id: 'general',
      title: locale?.startsWith('es') ? 'General' : 'General',
      description: locale?.startsWith('es') ? 'Configuración básica del sistema' : 'Basic system settings',
      icon: CogIcon
    },
    {
      id: 'security',
      title: locale?.startsWith('es') ? 'Seguridad' : 'Security',
      description: locale?.startsWith('es') ? 'Políticas de seguridad y acceso' : 'Security and access policies',
      icon: ShieldCheckIcon
    },
    {
      id: 'notifications',
      title: locale?.startsWith('es') ? 'Notificaciones' : 'Notifications',
      description: locale?.startsWith('es') ? 'Alertas y notificaciones del sistema' : 'System alerts and notifications',
      icon: BellIcon
    },
    {
      id: 'billing',
      title: locale?.startsWith('es') ? 'Facturación' : 'Billing',
      description: locale?.startsWith('es') ? 'Planes y métodos de pago' : 'Plans and payment methods',
      icon: CreditCardIcon
    },
    {
      id: 'integrations',
      title: locale?.startsWith('es') ? 'Integraciones' : 'Integrations',
      description: locale?.startsWith('es') ? 'APIs y servicios externos' : 'APIs and external services',
      icon: CloudArrowUpIcon
    },
    {
      id: 'advanced',
      title: locale?.startsWith('es') ? 'Avanzado' : 'Advanced',
      description: locale?.startsWith('es') ? 'Configuración avanzada del sistema' : 'Advanced system configuration',
      icon: ServerIcon
    }
  ];

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/platform/settings');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setSettings(result.data);
          setFormData(result.data);
        }
      } else {
        console.error('Failed to fetch settings');
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/platform/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: activeSection,
          settings: formData[activeSection] || {},
        }),
      });

      if (response.ok) {
        setSaved(true);
        setError(null);
        setTimeout(() => setSaved(false), 3000);
        // Refresh settings
        await fetchSettings();
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.error || 'Failed to save settings';
        setError(locale?.startsWith('es') 
          ? `Error al guardar: ${errorMessage}` 
          : `Failed to save: ${errorMessage}`);
        console.error('Failed to save settings:', errorData);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert(locale?.startsWith('es') 
        ? 'Error de red al guardar' 
        : 'Network error while saving');
    } finally {
      setSaving(false);
    }
  };

  const updateFormData = (category: string, key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'general':
        return (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  {locale?.startsWith('es') ? 'Nombre del Sistema' : 'System Name'}
                </label>
                <HelpIcon 
                  content={locale?.startsWith('es') 
                    ? 'El nombre que se mostrará en toda la plataforma'
                    : 'The name that will be displayed throughout the platform'} 
                />
              </div>
              <input
                type="text"
                value={formData.general?.systemName || ''}
                onChange={(e) => updateFormData('general', 'systemName', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {locale?.startsWith('es') ? 'URL del Sistema' : 'System URL'}
              </label>
              <input
                type="url"
                value={formData.general?.systemUrl || ''}
                onChange={(e) => updateFormData('general', 'systemUrl', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {locale?.startsWith('es') ? 'Idioma Predeterminado' : 'Default Language'}
              </label>
              <select 
                value={formData.general?.defaultLanguage || 'es-MX'}
                onChange={(e) => updateFormData('general', 'defaultLanguage', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="es-MX">Español (México)</option>
                <option value="es-AR">Español (Argentina)</option>
                <option value="es-CO">Español (Colombia)</option>
                <option value="en-US">English (US)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {locale?.startsWith('es') ? 'Zona Horaria' : 'Timezone'}
              </label>
              <select 
                value={formData.general?.timezone || 'America/Mexico_City'}
                onChange={(e) => updateFormData('general', 'timezone', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="America/Mexico_City">America/Mexico_City</option>
                <option value="America/Buenos_Aires">America/Buenos_Aires</option>
                <option value="America/Bogota">America/Bogota</option>
                <option value="America/New_York">America/New_York</option>
              </select>
            </div>
          </div>
        );
        
      case 'security':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">
                  {locale?.startsWith('es') ? 'Autenticación de Dos Factores' : 'Two-Factor Authentication'}
                </h4>
                <p className="text-sm text-gray-600">
                  {locale?.startsWith('es') 
                    ? 'Requiere 2FA para todos los administradores'
                    : 'Require 2FA for all administrators'}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={formData.security?.requireTwoFactor || false}
                  onChange={(e) => updateFormData('security', 'requireTwoFactor', e.target.checked)}
                  disabled={loading}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">
                  {locale?.startsWith('es') ? 'Sesiones Activas' : 'Active Sessions'}
                </h4>
                <p className="text-sm text-gray-600">
                  {locale?.startsWith('es') 
                    ? 'Tiempo máximo de sesión: 24 horas'
                    : 'Maximum session time: 24 hours'}
                </p>
              </div>
              <Button variant="outline" size="sm">
                {locale?.startsWith('es') ? 'Configurar' : 'Configure'}
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">
                  {locale?.startsWith('es') ? 'Política de Contraseñas' : 'Password Policy'}
                </h4>
                <p className="text-sm text-gray-600">
                  {locale?.startsWith('es') 
                    ? 'Mínimo 8 caracteres, mayúsculas y números'
                    : 'Minimum 8 characters, uppercase and numbers'}
                </p>
              </div>
              <Button variant="outline" size="sm">
                {locale?.startsWith('es') ? 'Editar' : 'Edit'}
              </Button>
            </div>
          </div>
        );
        
      case 'notifications':
        return (
          <div className="space-y-6">
            <h4 className="font-medium text-gray-900">
              {locale?.startsWith('es') ? 'Notificaciones por Email' : 'Email Notifications'}
            </h4>
            
            {[
              {
                title: locale?.startsWith('es') ? 'Nuevos Usuarios' : 'New Users',
                description: locale?.startsWith('es') 
                  ? 'Recibir notificación cuando se registre un nuevo usuario'
                  : 'Receive notification when a new user registers'
              },
              {
                title: locale?.startsWith('es') ? 'Nuevas Empresas' : 'New Companies',
                description: locale?.startsWith('es')
                  ? 'Recibir notificación cuando se cree una nueva empresa'
                  : 'Receive notification when a new company is created'
              },
              {
                title: locale?.startsWith('es') ? 'Errores del Sistema' : 'System Errors',
                description: locale?.startsWith('es')
                  ? 'Recibir alertas de errores críticos del sistema'
                  : 'Receive alerts for critical system errors'
              },
              {
                title: locale?.startsWith('es') ? 'Uso de Recursos' : 'Resource Usage',
                description: locale?.startsWith('es')
                  ? 'Alertas cuando el uso de recursos supere el 80%'
                  : 'Alerts when resource usage exceeds 80%'
              }
            ].map((notification, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h5 className="font-medium text-gray-900">{notification.title}</h5>
                  <p className="text-sm text-gray-600">{notification.description}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={
                      index === 0 ? formData.notifications?.newUserNotification :
                      index === 1 ? formData.notifications?.newCompanyNotification :
                      index === 2 ? formData.notifications?.systemErrorNotification :
                      formData.notifications?.resourceUsageNotification
                    }
                    onChange={(e) => {
                      const key = index === 0 ? 'newUserNotification' :
                                 index === 1 ? 'newCompanyNotification' :
                                 index === 2 ? 'systemErrorNotification' :
                                 'resourceUsageNotification';
                      updateFormData('notifications', key, e.target.checked);
                    }}
                    disabled={loading}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            ))}
          </div>
        );
        
      default:
        return (
          <div className="text-center py-12">
            <CogIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {locale?.startsWith('es') 
                ? 'Esta sección está en desarrollo'
                : 'This section is under development'}
            </p>
          </div>
        );
    }
  };

  return (
    <ProtectedRoute requireRole={[ROLES.SUPER_ADMIN]}>
      <AppLayout showFooter={true}>
        <div className="min-h-screen bg-gray-50">
          <div className="container mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              {locale?.startsWith('es') ? 'Configuración del Sistema' : 'System Settings'}
            </h1>
            <p className="text-gray-600 mt-2">
              {locale?.startsWith('es') 
                ? 'Gestiona la configuración global del sistema'
                : 'Manage global system configuration'}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Settings Navigation */}
            <div className="lg:col-span-1">
              <Card>
                <CardBody className="p-0">
                  <nav className="space-y-1">
                    {sections.map((section) => (
                      <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={`w-full flex items-start space-x-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                          activeSection === section.id 
                            ? 'bg-blue-50 border-l-4 border-blue-600' 
                            : ''
                        }`}
                      >
                        <section.icon className={`w-5 h-5 mt-0.5 ${
                          activeSection === section.id ? 'text-blue-600' : 'text-gray-400'
                        }`} />
                        <div>
                          <p className={`font-medium ${
                            activeSection === section.id ? 'text-blue-900' : 'text-gray-900'
                          }`}>
                            {section.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {section.description}
                          </p>
                        </div>
                      </button>
                    ))}
                  </nav>
                </CardBody>
              </Card>
            </div>

            {/* Settings Content */}
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {sections.find(s => s.id === activeSection)?.title}
                  </CardTitle>
                  <CardDescription>
                    {sections.find(s => s.id === activeSection)?.description}
                  </CardDescription>
                </CardHeader>
                <CardBody>
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
                  
                  {/* Save Button */}
                  <div className="mt-8 flex justify-end space-x-4">
                    <Button variant="outline">
                      {locale?.startsWith('es') ? 'Cancelar' : 'Cancel'}
                    </Button>
                    <Button
                      variant="primary"
                      loading={saving}
                      onClick={handleSave}
                      leftIcon={saved ? <CheckIcon className="w-4 h-4" /> : undefined}
                    >
                      {saved 
                        ? (locale?.startsWith('es') ? 'Guardado' : 'Saved')
                        : (locale?.startsWith('es') ? 'Guardar Cambios' : 'Save Changes')
                      }
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}