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
  UserIcon,
  ShieldCheckIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import { ROLES } from '@/lib/auth/rbac';

interface Company {
  id: string;
  name: string;
  taxId?: string;
  industry?: string;
  organizationId: string;
}

interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationRole: string;
  isActive: boolean;
  emailVerified: boolean;
  companyAccess: {
    companyId: string;
    companyName: string;
    role: string;
    isActive: boolean;
  }[];
}

interface EditForm {
  firstName: string;
  lastName: string;
  organizationRole: string;
  isActive: boolean;
  companyAccess: {
    companyId: string;
    role: string;
  }[];
}

function UserEditPage({ params }: { params: { userId: string } }) {
  const router = useRouter();
  const { user, organization } = useAuth();
  const { locale } = useLocale();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [form, setForm] = useState<EditForm>({
    firstName: '',
    lastName: '',
    organizationRole: 'user',
    isActive: true,
    companyAccess: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (organization?.id) {
      fetchUser();
      fetchCompanies();
    }
  }, [organization?.id, params.userId]);

  const fetchUser = async () => {
    try {
      const response = await fetch(`/api/organizations/${organization?.id}/users`);
      if (response.ok) {
        const data = await response.json();
        const foundUser = data.users.find((u: UserData) => u.id === params.userId);
        if (foundUser) {
          setUserData(foundUser);
          setForm({
            firstName: foundUser.firstName,
            lastName: foundUser.lastName,
            organizationRole: foundUser.organizationRole,
            isActive: foundUser.isActive,
            companyAccess: foundUser.companyAccess.map((ca: any) => ({
              companyId: ca.companyId,
              role: ca.role
            }))
          });
        } else {
          setError('User not found');
        }
      } else {
        setError('Failed to fetch user data');
      }
    } catch (error) {
      setError('Error fetching user data');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/companies');
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.data)) {
          setCompanies(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const organizationRoles = [
    { value: 'user', label: locale?.startsWith('es') ? 'Usuario' : 'User' },
    { value: 'admin', label: locale?.startsWith('es') ? 'Administrador de Organización' : 'Organization Admin' }
  ];

  const companyRoles = [
    { value: 'user', label: locale?.startsWith('es') ? 'Usuario' : 'User' },
    { value: 'company_admin', label: locale?.startsWith('es') ? 'Administrador de Empresa' : 'Company Admin' },
    { value: 'viewer', label: locale?.startsWith('es') ? 'Solo Lectura' : 'Viewer' }
  ];

  const handleCompanyAccessChange = (companyId: string, role: string) => {
    const existingIndex = form.companyAccess.findIndex(ca => ca.companyId === companyId);
    
    if (role === 'none') {
      // Remove access
      setForm({
        ...form,
        companyAccess: form.companyAccess.filter(ca => ca.companyId !== companyId)
      });
    } else {
      // Add or update access
      const newCompanyAccess = [...form.companyAccess];
      if (existingIndex >= 0) {
        newCompanyAccess[existingIndex] = { companyId, role };
      } else {
        newCompanyAccess.push({ companyId, role });
      }
      setForm({
        ...form,
        companyAccess: newCompanyAccess
      });
    }
  };

  const getCompanyRole = (companyId: string) => {
    const access = form.companyAccess.find(ca => ca.companyId === companyId);
    return access?.role || 'none';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/organizations/${organization?.id}/users/${params.userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      if (response.ok) {
        router.push('/dashboard/org-admin/users');
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
    router.push('/dashboard/org-admin/users');
  };

  if (loading) {
    return (
      <AppLayout showFooter={true}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2 text-gray-600">
              {locale?.startsWith('es') ? 'Cargando usuario...' : 'Loading user...'}
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error && !userData) {
    return (
      <AppLayout showFooter={true}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600">{error}</p>
            <Button onClick={handleBack} variant="outline" className="mt-4">
              {locale?.startsWith('es') ? 'Volver a usuarios' : 'Back to users'}
            </Button>
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
              {locale?.startsWith('es')
                ? `Edita la información de ${userData?.firstName} ${userData?.lastName}`
                : `Edit ${userData?.firstName} ${userData?.lastName}'s information`}
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
                      {locale?.startsWith('es') ? 'Información del Usuario' : 'User Information'}
                    </CardTitle>
                    <CardDescription className="text-blue-100 text-base">
                      {locale?.startsWith('es')
                        ? 'Actualiza los datos y permisos del usuario'
                        : 'Update user data and permissions'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardBody className="p-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Email (Read-only) */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-gray-800 flex items-center space-x-2">
                      <EnvelopeIcon className="w-5 h-5 text-blue-600" />
                      <span>{locale?.startsWith('es') ? 'Correo Electrónico' : 'Email Address'}</span>
                    </label>
                    <input
                      type="email"
                      value={userData?.email || ''}
                      disabled
                      className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500">
                      {locale?.startsWith('es') ? 'El correo electrónico no puede ser modificado' : 'Email address cannot be changed'}
                    </p>
                  </div>

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
                      />
                    </div>
                  </div>

                  {/* Organization Role and Status Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Organization Role */}
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-gray-800 flex items-center space-x-2">
                        <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
                        <span>{locale?.startsWith('es') ? 'Rol en la Organización' : 'Organization Role'}</span>
                      </label>
                      <select
                        value={form.organizationRole}
                        onChange={(e) => setForm({ ...form, organizationRole: e.target.value })}
                        className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-gray-800 bg-white appearance-none cursor-pointer"
                      >
                        {organizationRoles.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Active Status */}
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-gray-800">
                        {locale?.startsWith('es') ? 'Estado' : 'Status'}
                      </label>
                      <div className="flex items-center space-x-4 pt-2">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="isActive"
                            checked={form.isActive}
                            onChange={() => setForm({ ...form, isActive: true })}
                            className="mr-2 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-green-600 font-medium">
                            {locale?.startsWith('es') ? 'Activo' : 'Active'}
                          </span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="isActive"
                            checked={!form.isActive}
                            onChange={() => setForm({ ...form, isActive: false })}
                            className="mr-2 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-red-600 font-medium">
                            {locale?.startsWith('es') ? 'Inactivo' : 'Inactive'}
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Company Access */}
                  {companies.length > 0 && (
                    <div className="space-y-4">
                      <label className="text-sm font-semibold text-gray-800">
                        {locale?.startsWith('es') ? 'Acceso a Empresas' : 'Company Access'}
                      </label>
                      <p className="text-sm text-gray-600">
                        {locale?.startsWith('es') 
                          ? 'Configura el acceso del usuario a las empresas y su rol en cada una.'
                          : 'Configure user access to companies and their role in each.'}
                      </p>
                      <div className="space-y-3">
                        {companies.map((company) => (
                          <div key={company.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                            <div>
                              <h4 className="font-medium text-gray-900">{company.name}</h4>
                              <p className="text-sm text-gray-500">
                                {company.taxId && `${locale?.startsWith('es') ? 'RUT' : 'Tax ID'}: ${company.taxId}`}
                                {company.industry && ` • ${company.industry}`}
                              </p>
                            </div>
                            <select
                              value={getCompanyRole(company.id)}
                              onChange={(e) => handleCompanyAccessChange(company.id, e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="none">
                                {locale?.startsWith('es') ? 'Sin acceso' : 'No access'}
                              </option>
                              {companyRoles.map((role) => (
                                <option key={role.value} value={role.value}>
                                  {role.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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
                      size="lg"
                      disabled={saving}
                      loading={saving}
                      className="flex-1"
                    >
                      {saving
                        ? (locale?.startsWith('es') ? 'Guardando...' : 'Saving...')
                        : (locale?.startsWith('es') ? 'Guardar Cambios' : 'Save Changes')
                      }
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={handleBack}
                      className="sm:w-32"
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

export default function UserEditPageWrapper({ params }: { params: { userId: string } }) {
  return (
    <ProtectedRoute requireRole={[ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN]}>
      <UserEditPage params={params} />
    </ProtectedRoute>
  );
}