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
  const [debugInfo, setDebugInfo] = useState<string>('');

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
    }
  ];

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      console.log('Fetching platform settings...');
      const response = await fetch('/api/platform/settings');
      console.log('Settings response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Settings response data:', result);
        if (result.success) {
          setSettings(result.data);
          setFormData(result.data);
          console.log('Settings loaded successfully:', result.data);
        } else {
          console.error('Settings fetch failed:', result.error);
          setError(result.error || 'Failed to load settings');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Settings fetch HTTP error:', response.status, errorData);
        setError(`HTTP ${response.status}: ${errorData.error || 'Failed to load settings'}`);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setError('Network error while loading settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const saveData = {
        category: activeSection,
        settings: formData[activeSection] || {},
      };
      
      console.log('Saving settings for category:', activeSection);
      console.log('Settings data:', saveData.settings);
      
      const response = await fetch('/api/platform/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saveData),
      });
      
      console.log('Save response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('Save response data:', result);
        
        setSaved(true);
        setError(null);
        setTimeout(() => setSaved(false), 3000);
        
        // Refresh settings to confirm persistence
        await fetchSettings();
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Failed to save settings';
        console.error('Save failed:', response.status, errorData);
        setError(locale?.startsWith('es') 
          ? `Error al guardar: ${errorMessage}` 
          : `Failed to save: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setError(locale?.startsWith('es') 
        ? 'Error de red al guardar' 
        : 'Network error while saving');
    } finally {
      setSaving(false);
    }
  };

  const updateFormData = (category: string, key: string, value: any) => {
    console.log(`Updating ${category}.${key} to:`, value);
    setFormData(prev => {
      const updated = {
        ...prev,
        [category]: {
          ...prev[category],
          [key]: value,
        },
      };
      console.log('Updated form data:', updated);
      return updated;
    });
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'general':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    {locale?.startsWith('es') ? 'Nombre del Sistema' : 'System Name'}
                  </label>
                </div>
                <input
                  type="text"
                  value={formData.general?.systemName || ''}
                  onChange={(e) => updateFormData('general', 'systemName', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  disabled={loading}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {locale?.startsWith('es') ? 'Idioma Predeterminado' : 'Default Language'}
                </label>
                <select 
                  value={formData.general?.defaultLanguage || 'es-MX'}
                  onChange={(e) => updateFormData('general', 'defaultLanguage', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  disabled={loading}
                >
                  <option value="America/Mexico_City">America/Mexico_City</option>
                  <option value="America/Buenos_Aires">America/Buenos_Aires</option>
                  <option value="America/Bogota">America/Bogota</option>
                  <option value="America/New_York">America/New_York</option>
                </select>
              </div>
            </div>
          </div>
        );
        
      case 'security':
        return (
          <div className="space-y-6">
            {/* Two-Factor Authentication */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {locale?.startsWith('es') ? 'Autenticación de Dos Factores' : 'Two-Factor Authentication'}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {locale?.startsWith('es') 
                        ? 'Requiere 2FA para todos los administradores'
                        : 'Require 2FA for all administrators'}
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={formData.security?.requireTwoFactor || false}
                    onChange={(e) => updateFormData('security', 'requireTwoFactor', e.target.checked)}
                    disabled={loading}
                  />
                  <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 hover:bg-gray-300"></div>
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">
                  {locale?.startsWith('es') ? 'Recomendado para mayor seguridad' : 'Recommended for enhanced security'}
                </span>
              </div>
            </div>

            {/* Session Timeout */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <CogIcon className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {locale?.startsWith('es') ? 'Tiempo de Sesión' : 'Session Timeout'}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {locale?.startsWith('es') 
                        ? 'Configurar tiempo máximo de sesión'
                        : 'Configure maximum session duration'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {locale?.startsWith('es') ? 'Tiempo máximo (horas)' : 'Maximum time (hours)'}
                  </label>
                  <select 
                    value={formData.security?.sessionTimeout || 24}
                    onChange={(e) => updateFormData('security', 'sessionTimeout', parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    disabled={loading}
                  >
                    <option value={1}>1 hora</option>
                    <option value={2}>2 horas</option>
                    <option value={4}>4 horas</option>
                    <option value={8}>8 horas</option>
                    <option value={24}>24 horas</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <span className="text-sm text-gray-500">
                    {locale?.startsWith('es') ? 'Actual: 24 horas' : 'Current: 24 hours'}
                  </span>
                </div>
              </div>
            </div>

            {/* Password Policy */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <ShieldCheckIcon className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {locale?.startsWith('es') ? 'Política de Contraseñas' : 'Password Policy'}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {locale?.startsWith('es') 
                        ? 'Configurar requisitos de contraseña'
                        : 'Configure password requirements'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {locale?.startsWith('es') ? 'Longitud mínima' : 'Minimum length'}
                  </label>
                  <select 
                    value={formData.security?.passwordMinLength || 8}
                    onChange={(e) => updateFormData('security', 'passwordMinLength', parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    disabled={loading}
                  >
                    <option value={6}>6 caracteres</option>
                    <option value={8}>8 caracteres</option>
                    <option value={10}>10 caracteres</option>
                    <option value={12}>12 caracteres</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3">
                    <input 
                      type="checkbox" 
                      checked={formData.security?.passwordRequireUppercase || false}
                      onChange={(e) => updateFormData('security', 'passwordRequireUppercase', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      disabled={loading}
                    />
                    <span className="text-sm text-gray-700">
                      {locale?.startsWith('es') ? 'Requiere mayúsculas' : 'Require uppercase'}
                    </span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input 
                      type="checkbox" 
                      checked={formData.security?.passwordRequireNumbers || false}
                      onChange={(e) => updateFormData('security', 'passwordRequireNumbers', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      disabled={loading}
                    />
                    <span className="text-sm text-gray-700">
                      {locale?.startsWith('es') ? 'Requiere números' : 'Require numbers'}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'notifications':
        return (
          <div className="space-y-6">
            {/* Email Configuration */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <BellIcon className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">
                    {locale?.startsWith('es') ? 'Configuración de Email' : 'Email Configuration'}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {locale?.startsWith('es') 
                      ? 'Configure el servicio de email para notificaciones'
                      : 'Configure email service for notifications'}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {locale?.startsWith('es') ? 'Proveedor de Email' : 'Email Provider'}
                  </label>
                  <select 
                    value={formData.notifications?.emailProvider || 'smtp'}
                    onChange={(e) => updateFormData('notifications', 'emailProvider', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                    disabled={loading}
                  >
                    <option value="smtp">SMTP</option>
                    <option value="ses">AWS SES</option>
                    <option value="sendgrid">SendGrid</option>
                    <option value="console">Console (Development)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {locale?.startsWith('es') ? 'Email Remitente' : 'From Email'}
                  </label>
                  <input
                    type="email"
                    value={formData.notifications?.fromEmail || 'noreply@warren.com'}
                    onChange={(e) => updateFormData('notifications', 'fromEmail', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Email Notifications */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h4 className="font-semibold text-gray-900 mb-4">
                {locale?.startsWith('es') ? 'Notificaciones por Email' : 'Email Notifications'}
              </h4>
              
              <div className="space-y-4">
                {[
                  {
                    title: locale?.startsWith('es') ? 'Nuevos Usuarios' : 'New Users',
                    description: locale?.startsWith('es') 
                      ? 'Recibir notificación cuando se registre un nuevo usuario'
                      : 'Receive notification when a new user registers',
                    icon: '👤',
                    color: 'blue',
                    key: 'newUserNotification'
                  },
                  {
                    title: locale?.startsWith('es') ? 'Nuevas Empresas' : 'New Companies',
                    description: locale?.startsWith('es')
                      ? 'Recibir notificación cuando se cree una nueva empresa'
                      : 'Receive notification when a new company is created',
                    icon: '🏢',
                    color: 'green',
                    key: 'newCompanyNotification'
                  },
                  {
                    title: locale?.startsWith('es') ? 'Errores del Sistema' : 'System Errors',
                    description: locale?.startsWith('es')
                      ? 'Recibir alertas de errores críticos del sistema'
                      : 'Receive alerts for critical system errors',
                    icon: '🚨',
                    color: 'red',
                    key: 'systemErrorNotification'
                  },
                  {
                    title: locale?.startsWith('es') ? 'Uso de Recursos' : 'Resource Usage',
                    description: locale?.startsWith('es')
                      ? 'Alertas cuando el uso de recursos supere el 80%'
                      : 'Alerts when resource usage exceeds 80%',
                    icon: '📊',
                    color: 'yellow',
                    key: 'resourceUsageNotification'
                  }
                ].map((notification, index) => (
                  <div key={index} className={`flex items-center justify-between p-4 border rounded-lg transition-all hover:shadow-sm ${
                    notification.color === 'blue' ? 'border-blue-200 bg-blue-50' :
                    notification.color === 'green' ? 'border-green-200 bg-green-50' :
                    notification.color === 'red' ? 'border-red-200 bg-red-50' :
                    'border-yellow-200 bg-yellow-50'
                  }`}>
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{notification.icon}</div>
                      <div>
                        <h5 className="font-medium text-gray-900">{notification.title}</h5>
                        <p className="text-sm text-gray-600">{notification.description}</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={formData.notifications?.[notification.key] || false}
                        onChange={(e) => updateFormData('notifications', notification.key, e.target.checked)}
                        disabled={loading}
                      />
                      <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 hover:bg-gray-300"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Email Test */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-semibold text-gray-900">
                    {locale?.startsWith('es') ? 'Probar Configuración' : 'Test Configuration'}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {locale?.startsWith('es') 
                      ? 'Enviar un email de prueba para verificar la configuración'
                      : 'Send a test email to verify configuration'}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    // TODO: Implement test email functionality
                    console.log('Test email functionality to be implemented');
                  }}
                >
                  {locale?.startsWith('es') ? 'Enviar Prueba' : 'Send Test'}
                </Button>
              </div>
            </div>
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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
          <div className="container mx-auto px-4 py-6">
          {/* Page Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {locale?.startsWith('es') ? 'Configuración del Sistema' : 'System Settings'}
                </h1>
                <p className="text-gray-600 mt-1 text-sm">
                  {locale?.startsWith('es') 
                    ? 'Gestiona la configuración global del sistema'
                    : 'Manage global system configuration'}
                </p>
              </div>
              {/* Connection Status */}
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  error ? 'bg-red-500' : loading ? 'bg-yellow-500' : 'bg-green-500'
                } ${loading ? 'animate-pulse' : ''}`} />
                <span className="text-xs text-gray-600">
                  {error ? 'Connection Error' : loading ? 'Loading...' : 'Connected'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Settings Navigation */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <nav className="space-y-1 p-2">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-2.5 text-left rounded-lg transition-all duration-200 ${
                        activeSection === section.id 
                          ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm' 
                          : 'hover:bg-gray-50 text-gray-700 hover:text-gray-900'
                      }`}
                    >
                      <section.icon className={`w-5 h-5 ${
                        activeSection === section.id ? 'text-blue-600' : 'text-gray-400'
                      }`} />
                      <div className="flex-1">
                        <p className={`font-medium text-sm ${
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
              </div>
            </div>

            {/* Settings Content */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {sections.find(s => s.id === activeSection)?.title}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {sections.find(s => s.id === activeSection)?.description}
                  </p>
                </div>
                <div className="p-6">
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
                    <Button 
                      variant="outline"
                      disabled={saving}
                      onClick={() => {
                        setFormData(settings || {});
                        setError(null);
                      }}
                    >
                      {locale?.startsWith('es') ? 'Cancelar' : 'Cancel'}
                    </Button>
                    <Button
                      variant="primary"
                      loading={saving}
                      onClick={handleSave}
                      disabled={loading || !formData[activeSection] || Object.keys(formData[activeSection] || {}).length === 0}
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
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}