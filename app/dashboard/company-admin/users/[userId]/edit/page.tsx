"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody, CardTitle, CardDescription } from '@/components/ui/Card';
import {
  UserIcon,
  EnvelopeIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { ROLES } from '@/lib/auth/rbac';

interface Company {
  id: string;
  name: string;
  taxId?: string;
  industry?: string;
  locale?: string;
  baseCurrency?: string;
  isActive: boolean;
  organizationId: string;
  createdAt: Date;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  lastLogin?: Date;
}

interface EditUserForm {
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
}

function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const { user: currentUser } = useAuth();
  const { locale } = useLocale();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState<EditUserForm>({
    firstName: '',
    lastName: '',
    role: 'user',
    isActive: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = params.userId as string;

  const getSelectedCompany = () => {
    return companies.find(company => company.id === selectedCompanyId);
  };

  useEffect(() => {
    // Get selected company from session storage
    const companyId = sessionStorage.getItem('selectedCompanyId');
    if (companyId) {
      setSelectedCompanyId(companyId);
      fetchUser(companyId, userId);
      fetchCompanies();
    } else {
      // Redirect back if no company selected
      router.push('/dashboard/company-admin');
    }
  }, [router, userId]);

  const fetchUser = async (companyId: string, userId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/companies/${companyId}/users/${userId}`);
      if (response.ok) {
        const data = await response.json();
        const userData = {
          ...data.user,
          createdAt: new Date(data.user.createdAt),
          lastLogin: data.user.lastLogin ? new Date(data.user.lastLogin) : undefined
        };
        setUser(userData);
        setForm({
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          isActive: userData.isActive
        });
      } else {
        setError(locale?.startsWith('es') ? 'Error al cargar usuario' : 'Failed to load user');
      }
    } catch (error) {
      setError(locale?.startsWith('es') ? 'Error de red' : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/v1/companies');
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.data)) {
          const mappedCompanies = data.data.map((company: any) => ({
            ...company,
            createdAt: new Date(company.createdAt)
          }));
          setCompanies(mappedCompanies);
        }
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const roles = [
    { value: 'user', label: locale?.startsWith('es') ? 'Usuario' : 'User' },
    { value: 'company_admin', label: locale?.startsWith('es') ? 'Administrador de Empresa' : 'Company Admin' },
    { value: 'viewer', label: locale?.startsWith('es') ? 'Solo Lectura' : 'Viewer' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/companies/${selectedCompanyId}/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      if (response.ok) {
        router.push('/dashboard/company-admin/users');
      } else {
        const data = await response.json();
        setError(data.error || (locale?.startsWith('es') ? 'Error al actualizar usuario' : 'Failed to update user'));
      }
    } catch (error) {
      setError(locale?.startsWith('es') ? 'Error de red' : 'Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    router.push('/dashboard/company-admin/users');
  };

  if (loading) {
    return (
      <AppLayout showFooter={true}>
        <div className="min-h-screen flex flex-col">
          <div className="flex-1 container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">
              <Card>
                <CardBody className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-gray-500">
                    {locale?.startsWith('es') ? 'Cargando usuario...' : 'Loading user...'}
                  </p>
                </CardBody>
              </Card>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout showFooter={true}>
        <div className="min-h-screen flex flex-col">
          <div className="flex-1 container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">
              <Card>
                <CardBody className="text-center py-12">
                  <p className="text-red-500 mb-4">{error}</p>
                  <Button variant="outline" onClick={handleBack}>
                    {locale?.startsWith('es') ? 'Volver' : 'Go Back'}
                  </Button>
                </CardBody>
              </Card>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout showFooter={true}>
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="mb-4"
            >
              ← {locale?.startsWith('es') ? 'Volver a usuarios' : 'Back to users'}
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">
              {locale?.startsWith('es') ? 'Editar Usuario' : 'Edit User'}
            </h1>
            <p className="text-gray-600 mt-2">
              {selectedCompanyId && getSelectedCompany() ? (
                locale?.startsWith('es')
                  ? `Editando usuario de ${getSelectedCompany()?.name}`
                  : `Editing user for ${getSelectedCompany()?.name}`
              ) : (
                locale?.startsWith('es')
                  ? 'Modifica la información del usuario'
                  : 'Modify user information'
              )}
            </p>
          </div>

          {/* Edit Form */}
          <div className="max-w-4xl mx-auto">
            <Card className="shadow-xl border-0 bg-white">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-xl">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <UserIcon className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold text-white">
                      {user?.firstName} {user?.lastName}
                    </CardTitle>
                    <CardDescription className="text-blue-100 text-base">
                      {user?.email}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardBody className="p-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Name Fields Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* First Name */}
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-gray-800 flex items-center space-x-2">
                        <UserIcon className="w-5 h-5 text-blue-600" />
                        <span>{locale?.startsWith('es') ? 'Nombre' : 'First Name'}</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={form.firstName}
                        onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                        className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-gray-800 placeholder-gray-500"
                        placeholder={locale?.startsWith('es') ? 'Juan' : 'John'}
                      />
                    </div>

                    {/* Last Name */}
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-gray-800 flex items-center space-x-2">
                        <UserIcon className="w-5 h-5 text-blue-600" />
                        <span>{locale?.startsWith('es') ? 'Apellido' : 'Last Name'}</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={form.lastName}
                        onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                        className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-gray-800 placeholder-gray-500"
                        placeholder={locale?.startsWith('es') ? 'Pérez' : 'Doe'}
                      />
                    </div>
                  </div>

                  {/* Role */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-gray-800 flex items-center space-x-2">
                      <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
                      <span>{locale?.startsWith('es') ? 'Rol en la Empresa' : 'Company Role'}</span>
                    </label>
                    <select
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                      className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-gray-800 bg-white appearance-none cursor-pointer"
                    >
                      {roles.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-gray-800">
                      {locale?.startsWith('es') ? 'Estado del Usuario' : 'User Status'}
                    </label>
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="isActive"
                          checked={form.isActive}
                          onChange={() => setForm({ ...form, isActive: true })}
                          className="w-4 h-4 text-green-600"
                        />
                        <span className="text-sm text-gray-800">
                          {locale?.startsWith('es') ? 'Activo' : 'Active'}
                        </span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="isActive"
                          checked={!form.isActive}
                          onChange={() => setForm({ ...form, isActive: false })}
                          className="w-4 h-4 text-red-600"
                        />
                        <span className="text-sm text-gray-800">
                          {locale?.startsWith('es') ? 'Inactivo' : 'Inactive'}
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                        <p className="text-sm text-red-800 font-medium">{error}</p>
                      </div>
                    </div>
                  )}

                  {/* Submit Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 pt-6">
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={saving}
                      loading={saving}
                      leftIcon={!saving && <UserIcon className="w-5 h-5" />}
                      className="flex-1 py-4 text-lg font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      {saving
                        ? (locale?.startsWith('es') ? 'Guardando...' : 'Saving...')
                        : (locale?.startsWith('es') ? 'Guardar Cambios' : 'Save Changes')
                      }
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBack}
                      className="sm:w-32 py-4 text-lg font-semibold border-2 hover:bg-gray-50 transition-all duration-200"
                    >
                      {locale?.startsWith('es') ? 'Cancelar' : 'Cancel'}
                    </Button>
                  </div>
                </form>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default function EditUserPageWrapper() {
  return (
    <ProtectedRoute requireRole={[ROLES.COMPANY_ADMIN, ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN]}>
      <EditUserPage />
    </ProtectedRoute>
  );
}