"use client";

import { useState, useEffect } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { Button } from '@/components/ui/Button';
import { 
  XMarkIcon, 
  CheckCircleIcon,
  ExclamationCircleIcon,
  BellIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline';

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface NotificationPreferences {
  emailNotifications: {
    weeklyReports: boolean;
    dataUpdates: boolean;
    systemAlerts: boolean;
    companyInvitations: boolean;
    securityAlerts: boolean;
  };
  pushNotifications: {
    dataUpdates: boolean;
    systemAlerts: boolean;
    companyInvitations: boolean;
  };
  reportFrequency: 'weekly' | 'monthly' | 'never';
  digestTime: string;
}

export function NotificationPreferencesModal({ isOpen, onClose, onSuccess }: NotificationPreferencesModalProps) {
  const { locale } = useLocale();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailNotifications: {
      weeklyReports: true,
      dataUpdates: true,
      systemAlerts: true,
      companyInvitations: true,
      securityAlerts: true
    },
    pushNotifications: {
      dataUpdates: false,
      systemAlerts: true,
      companyInvitations: true
    },
    reportFrequency: 'weekly',
    digestTime: '09:00'
  });

  useEffect(() => {
    if (isOpen) {
      fetchPreferences();
    }
  }, [isOpen]);

  const fetchPreferences = async () => {
    try {
      setLoadingData(true);
      const response = await fetch('/api/profile/notifications');
      const result = await response.json();
      
      if (response.ok) {
        setPreferences(result.data);
      } else {
        setError(result.error || 'Failed to load preferences');
      }
    } catch (error) {
      setError(locale?.startsWith('es') ? 'Error de red' : 'Network error');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/profile/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
          onClose();
          setSuccess(false);
        }, 2000);
      } else {
        setError(result.error || 'Failed to update preferences');
      }
    } catch (error) {
      setError(locale?.startsWith('es') ? 'Error de red' : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setError(null);
      setSuccess(false);
    }
  };

  const updateEmailNotification = (key: keyof NotificationPreferences['emailNotifications'], value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      emailNotifications: {
        ...prev.emailNotifications,
        [key]: value
      }
    }));
  };

  const updatePushNotification = (key: keyof NotificationPreferences['pushNotifications'], value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      pushNotifications: {
        ...prev.pushNotifications,
        [key]: value
      }
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {locale?.startsWith('es') ? 'Preferencias de Notificación' : 'Notification Preferences'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center">
            <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2" />
            <span className="text-sm text-green-700">
              {locale?.startsWith('es') ? 'Preferencias actualizadas exitosamente' : 'Preferences updated successfully'}
            </span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <ExclamationCircleIcon className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {loadingData ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">
              {locale?.startsWith('es') ? 'Cargando...' : 'Loading...'}
            </span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Notifications */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <EnvelopeIcon className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900">
                  {locale?.startsWith('es') ? 'Notificaciones por Email' : 'Email Notifications'}
                </h3>
              </div>
              
              <div className="space-y-3">
                {[
                  { key: 'weeklyReports' as const, label: locale?.startsWith('es') ? 'Reportes Semanales' : 'Weekly Reports' },
                  { key: 'dataUpdates' as const, label: locale?.startsWith('es') ? 'Actualizaciones de Datos' : 'Data Updates' },
                  { key: 'systemAlerts' as const, label: locale?.startsWith('es') ? 'Alertas del Sistema' : 'System Alerts' },
                  { key: 'companyInvitations' as const, label: locale?.startsWith('es') ? 'Invitaciones de Empresa' : 'Company Invitations' },
                  { key: 'securityAlerts' as const, label: locale?.startsWith('es') ? 'Alertas de Seguridad' : 'Security Alerts' }
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                    <input
                      type="checkbox"
                      checked={preferences.emailNotifications[key]}
                      onChange={(e) => updateEmailNotification(key, e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      disabled={loading}
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Push Notifications */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <DevicePhoneMobileIcon className="w-4 h-4 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900">
                  {locale?.startsWith('es') ? 'Notificaciones Push' : 'Push Notifications'}
                </h3>
              </div>
              
              <div className="space-y-3">
                {[
                  { key: 'dataUpdates' as const, label: locale?.startsWith('es') ? 'Actualizaciones de Datos' : 'Data Updates' },
                  { key: 'systemAlerts' as const, label: locale?.startsWith('es') ? 'Alertas del Sistema' : 'System Alerts' },
                  { key: 'companyInvitations' as const, label: locale?.startsWith('es') ? 'Invitaciones de Empresa' : 'Company Invitations' }
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                    <input
                      type="checkbox"
                      checked={preferences.pushNotifications[key]}
                      onChange={(e) => updatePushNotification(key, e.target.checked)}
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      disabled={loading}
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Report Settings */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <BellIcon className="w-4 h-4 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900">
                  {locale?.startsWith('es') ? 'Configuración de Reportes' : 'Report Settings'}
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {locale?.startsWith('es') ? 'Frecuencia de Reportes' : 'Report Frequency'}
                  </label>
                  <select
                    value={preferences.reportFrequency}
                    onChange={(e) => setPreferences(prev => ({ ...prev, reportFrequency: e.target.value as 'weekly' | 'monthly' | 'never' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    disabled={loading}
                  >
                    <option value="weekly">{locale?.startsWith('es') ? 'Semanal' : 'Weekly'}</option>
                    <option value="monthly">{locale?.startsWith('es') ? 'Mensual' : 'Monthly'}</option>
                    <option value="never">{locale?.startsWith('es') ? 'Nunca' : 'Never'}</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {locale?.startsWith('es') ? 'Hora de Resumen' : 'Digest Time'}
                  </label>
                  <input
                    type="time"
                    value={preferences.digestTime}
                    onChange={(e) => setPreferences(prev => ({ ...prev, digestTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="flex-1"
              >
                {locale?.startsWith('es') ? 'Cancelar' : 'Cancel'}
              </Button>
              <Button
                type="submit"
                loading={loading}
                className="flex-1"
              >
                {locale?.startsWith('es') ? 'Guardar Preferencias' : 'Save Preferences'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}