"use client";

import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { UserCircleIcon, BuildingOfficeIcon, EnvelopeIcon, PhoneIcon } from '@heroicons/react/24/outline';

export default function ProfilePage() {
  const { user, organization } = useAuth();
  const { locale } = useLocale();

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="max-w-4xl mx-auto p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            {locale?.startsWith('es') ? 'Mi Perfil' : 'My Profile'}
          </h1>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{locale?.startsWith('es') ? 'Información Personal' : 'Personal Information'}</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {locale?.startsWith('es') ? 'Nombre' : 'First Name'}
                    </label>
                    <p className="text-gray-900">{user?.firstName || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {locale?.startsWith('es') ? 'Apellido' : 'Last Name'}
                    </label>
                    <p className="text-gray-900">{user?.lastName || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {locale?.startsWith('es') ? 'Correo Electrónico' : 'Email'}
                    </label>
                    <p className="text-gray-900 flex items-center gap-2">
                      <EnvelopeIcon className="w-4 h-4 text-gray-500" />
                      {user?.email}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {locale?.startsWith('es') ? 'Teléfono' : 'Phone'}
                    </label>
                    <p className="text-gray-900 flex items-center gap-2">
                      <PhoneIcon className="w-4 h-4 text-gray-500" />
                      {user?.phone || '-'}
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{locale?.startsWith('es') ? 'Información de la Cuenta' : 'Account Information'}</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {locale?.startsWith('es') ? 'ID de Usuario' : 'User ID'}
                    </label>
                    <p className="text-gray-900 font-mono text-sm">{user?.id?.slice(0, 8)}...</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {locale?.startsWith('es') ? 'Rol' : 'Role'}
                    </label>
                    <p className="text-gray-900">
                      {user?.role === 'super_admin' && (locale?.startsWith('es') ? 'Administrador de Plataforma' : 'Platform Administrator')}
                      {user?.role === 'admin' && (locale?.startsWith('es') ? 'Administrador de Organización' : 'Organization Administrator')}
                      {(user?.role === 'user' || user?.role === 'viewer') && (locale?.startsWith('es') ? 'Usuario' : 'User')}
                    </p>
                  </div>
                  {organization && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {locale?.startsWith('es') ? 'Organización' : 'Organization'}
                        </label>
                        <p className="text-gray-900 flex items-center gap-2">
                          <BuildingOfficeIcon className="w-4 h-4 text-gray-500" />
                          {organization.name}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {locale?.startsWith('es') ? 'Idioma Preferido' : 'Preferred Language'}
                        </label>
                        <p className="text-gray-900">{locale || 'en-US'}</p>
                      </div>
                    </>
                  )}
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{locale?.startsWith('es') ? 'Acciones de Cuenta' : 'Account Actions'}</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="flex flex-wrap gap-4">
                  <Button variant="outline">
                    {locale?.startsWith('es') ? 'Cambiar Contraseña' : 'Change Password'}
                  </Button>
                  <Button variant="outline">
                    {locale?.startsWith('es') ? 'Preferencias de Notificación' : 'Notification Preferences'}
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}