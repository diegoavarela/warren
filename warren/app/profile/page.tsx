"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  UserCircleIcon, 
  BuildingOfficeIcon, 
  EnvelopeIcon, 
  KeyIcon,
  BellIcon,
  PencilIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  CalendarIcon,
  CogIcon
} from '@heroicons/react/24/outline';
import { ChangePasswordModal } from '@/components/modals/ChangePasswordModal';
import { NotificationPreferencesModal } from '@/components/modals/NotificationPreferencesModal';

interface ProfileData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  locale: string;
  role: string;
  organizationId: string;
  isEmailVerified: boolean;
  lastLoginAt: string;
  createdAt: string;
  updatedAt: string;
}

export default function ProfilePage() {
  const { user, organization } = useAuth();
  const { locale } = useLocale();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showNotificationPreferences, setShowNotificationPreferences] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    locale: ''
  });

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/profile');
      const result = await response.json();
      
      if (response.ok) {
        setProfileData(result.data);
        setFormData({
          firstName: result.data.firstName,
          lastName: result.data.lastName,
          locale: result.data.locale || 'en-US'
        });
      } else {
        setError(result.error || 'Failed to load profile');
      }
    } catch (error) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          locale: formData.locale
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        setProfileData(result.data);
        setIsEditing(false);
        setSuccess('Profile updated successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || 'Failed to update profile');
      }
    } catch (error) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setFormData({
      firstName: profileData?.firstName || '',
      lastName: profileData?.lastName || '',
      locale: profileData?.locale || 'en-US'
    });
    setError(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale?.startsWith('es') ? 'es-ES' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'platform_admin':
        return locale?.startsWith('es') ? 'Administrador de Plataforma' : 'Platform Administrator';
      case 'organization_admin':
        return locale?.startsWith('es') ? 'Administrador de Organización' : 'Organization Administrator';
      case 'user':
      case 'viewer':
        return locale?.startsWith('es') ? 'Usuario' : 'User';
      default:
        return role;
    }
  };

  if (loading && !profileData) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="max-w-4xl mx-auto p-6">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">
                {locale?.startsWith('es') ? 'Cargando perfil...' : 'Loading profile...'}
              </span>
            </div>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
          <div className="max-w-4xl mx-auto p-6">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-bold text-gray-900">
                {locale?.startsWith('es') ? 'Mi Perfil' : 'My Profile'}
              </h1>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  error ? 'bg-red-500' : loading ? 'bg-yellow-500' : 'bg-green-500'
                } ${loading ? 'animate-pulse' : ''}`} />
                <span className="text-xs text-gray-600">
                  {error ? 'Error' : loading ? 'Loading...' : 'Connected'}
                </span>
              </div>
            </div>

            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
                <CheckCircleIcon className="w-5 h-5 text-green-600 mr-3" />
                <span className="text-sm text-green-700">{success}</span>
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
                <ExclamationCircleIcon className="w-5 h-5 text-red-600 mr-3" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            <div className="grid gap-6">
              {/* Personal Information */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <UserCircleIcon className="w-5 h-5 text-blue-600" />
                      <span>{locale?.startsWith('es') ? 'Información Personal' : 'Personal Information'}</span>
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => isEditing ? handleCancelEdit() : setIsEditing(true)}
                      disabled={loading}
                    >
                      {isEditing ? (
                        locale?.startsWith('es') ? 'Cancelar' : 'Cancel'
                      ) : (
                        <>
                          <PencilIcon className="w-4 h-4 mr-1" />
                          {locale?.startsWith('es') ? 'Editar' : 'Edit'}
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardBody>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">
                        {locale?.startsWith('es') ? 'Nombre' : 'First Name'}
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          disabled={loading}
                        />
                      ) : (
                        <p className="text-gray-900 font-medium">{profileData?.firstName || '-'}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">
                        {locale?.startsWith('es') ? 'Apellido' : 'Last Name'}
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          disabled={loading}
                        />
                      ) : (
                        <p className="text-gray-900 font-medium">{profileData?.lastName || '-'}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">
                        {locale?.startsWith('es') ? 'Correo Electrónico' : 'Email'}
                      </label>
                      <p className="text-gray-900 flex items-center gap-2">
                        <EnvelopeIcon className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">{profileData?.email}</span>
                        {profileData?.isEmailVerified ? (
                          <CheckCircleIcon className="w-4 h-4 text-green-500" />
                        ) : (
                          <ExclamationCircleIcon className="w-4 h-4 text-yellow-500" />
                        )}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">
                        {locale?.startsWith('es') ? 'Idioma Preferido' : 'Preferred Language'}
                      </label>
                      {isEditing ? (
                        <select
                          value={formData.locale}
                          onChange={(e) => setFormData({ ...formData, locale: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          disabled={loading}
                        >
                          <option value="es-MX">Español (México)</option>
                          <option value="es-AR">Español (Argentina)</option>
                          <option value="es-CO">Español (Colombia)</option>
                          <option value="en-US">English (US)</option>
                        </select>
                      ) : (
                        <p className="text-gray-900 font-medium">{profileData?.locale || 'en-US'}</p>
                      )}
                    </div>
                  </div>
                  
                  {isEditing && (
                    <div className="mt-8 flex space-x-3">
                      <Button
                        onClick={handleSaveProfile}
                        loading={loading}
                        disabled={!formData.firstName || !formData.lastName}
                      >
                        {locale?.startsWith('es') ? 'Guardar Cambios' : 'Save Changes'}
                      </Button>
                      <Button variant="outline" onClick={handleCancelEdit}>
                        {locale?.startsWith('es') ? 'Cancelar' : 'Cancel'}
                      </Button>
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* Account Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CogIcon className="w-5 h-5 text-purple-600" />
                    <span>{locale?.startsWith('es') ? 'Información de la Cuenta' : 'Account Information'}</span>
                  </CardTitle>
                </CardHeader>
                <CardBody>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">
                        {locale?.startsWith('es') ? 'ID de Usuario' : 'User ID'}
                      </label>
                      <p className="text-gray-900 font-mono text-sm">{profileData?.id?.slice(0, 8)}...</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">
                        {locale?.startsWith('es') ? 'Rol' : 'Role'}
                      </label>
                      <p className="text-gray-900 font-medium">{getRoleName(profileData?.role || '')}</p>
                    </div>
                    {organization && (
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          {locale?.startsWith('es') ? 'Organización' : 'Organization'}
                        </label>
                        <p className="text-gray-900 flex items-center gap-2">
                          <BuildingOfficeIcon className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">{organization.name}</span>
                        </p>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">
                        {locale?.startsWith('es') ? 'Último Acceso' : 'Last Login'}
                      </label>
                      <p className="text-gray-900 flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">
                          {profileData?.lastLoginAt ? formatDate(profileData.lastLoginAt) : 'Never'}
                        </span>
                      </p>
                    </div>
                    {profileData?.createdAt && (
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          {locale?.startsWith('es') ? 'Cuenta Creada' : 'Account Created'}
                        </label>
                        <p className="text-gray-900 flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">{formatDate(profileData.createdAt)}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>

              {/* Account Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <KeyIcon className="w-5 h-5 text-green-600" />
                    <span>{locale?.startsWith('es') ? 'Acciones de Cuenta' : 'Account Actions'}</span>
                  </CardTitle>
                </CardHeader>
                <CardBody>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => setShowChangePassword(true)}
                      className="flex items-center justify-center space-x-2 px-6 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={loading}
                    >
                      <KeyIcon className="w-4 h-4 text-gray-600" />
                      <span className="text-gray-700 font-medium">
                        {locale?.startsWith('es') ? 'Cambiar Contraseña' : 'Change Password'}
                      </span>
                    </button>
                    <button
                      onClick={() => setShowNotificationPreferences(true)}
                      className="flex items-center justify-center space-x-2 px-6 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={loading}
                    >
                      <BellIcon className="w-4 h-4 text-gray-600" />
                      <span className="text-gray-700 font-medium">
                        {locale?.startsWith('es') ? 'Preferencias de Notificación' : 'Notification Preferences'}
                      </span>
                    </button>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        </div>

        {/* Modals */}
        <ChangePasswordModal
          isOpen={showChangePassword}
          onClose={() => setShowChangePassword(false)}
          onSuccess={() => {
            setSuccess('Password changed successfully');
            setTimeout(() => setSuccess(null), 3000);
          }}
        />

        <NotificationPreferencesModal
          isOpen={showNotificationPreferences}
          onClose={() => setShowNotificationPreferences(false)}
          onSuccess={() => {
            setSuccess('Notification preferences updated successfully');
            setTimeout(() => setSuccess(null), 3000);
          }}
        />
      </AppLayout>
    </ProtectedRoute>
  );
}