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
  UsersIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  EnvelopeIcon
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

function UserManagementPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { locale } = useLocale();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getSelectedCompany = () => {
    return companies.find(company => company.id === selectedCompanyId);
  };

  useEffect(() => {
    // Get selected company from session storage
    const companyId = sessionStorage.getItem('selectedCompanyId');
    if (companyId) {
      setSelectedCompanyId(companyId);
      fetchUsers(companyId);
      fetchCompanies();
    } else {
      // Redirect back if no company selected
      router.push('/dashboard/company-admin');
    }
  }, [router]);

  const fetchUsers = async (companyId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/companies/${companyId}/users`);
      if (response.ok) {
        const data = await response.json();
        const mappedUsers = data.users?.map((user: any) => ({
          ...user,
          createdAt: new Date(user.createdAt),
          lastLogin: user.lastLogin ? new Date(user.lastLogin) : undefined
        })) || [];
        setUsers(mappedUsers);
      } else {
        setError(locale?.startsWith('es') ? 'Error al cargar usuarios' : 'Failed to load users');
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

  const handleInviteUser = () => {
    router.push('/dashboard/company-admin/users/invite');
  };

  const handleBack = () => {
    router.push('/dashboard/company-admin');
  };

  const handleEditUser = (userId: string) => {
    sessionStorage.setItem('selectedCompanyId', selectedCompanyId);
    router.push(`/dashboard/company-admin/users/${userId}/edit`);
  };

  const handleDeleteUser = async (userId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent row click when clicking delete button
    
    if (!confirm(locale?.startsWith('es') ? '¿Estás seguro de eliminar este usuario?' : 'Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const response = await fetch(`/api/companies/${selectedCompanyId}/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh users list
        fetchUsers(selectedCompanyId);
      } else {
        alert(locale?.startsWith('es') ? 'Error al eliminar usuario' : 'Failed to delete user');
      }
    } catch (error) {
      alert(locale?.startsWith('es') ? 'Error de red' : 'Network error');
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(locale || 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRoleLabel = (role: string) => {
    const roleLabels: Record<string, string> = {
      'company_admin': locale?.startsWith('es') ? 'Admin de Empresa' : 'Company Admin',
      'user': locale?.startsWith('es') ? 'Usuario' : 'User',
      'viewer': locale?.startsWith('es') ? 'Solo Lectura' : 'Viewer'
    };
    return roleLabels[role] || role;
  };

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
              ← {locale?.startsWith('es') ? 'Volver al panel' : 'Back to dashboard'}
            </Button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {selectedCompanyId && getSelectedCompany() ? (
                    locale?.startsWith('es') 
                      ? `Usuarios de ${getSelectedCompany()?.name}`
                      : `${getSelectedCompany()?.name} Users`
                  ) : (
                    locale?.startsWith('es') ? 'Gestión de Usuarios' : 'User Management'
                  )}
                </h1>
                <p className="text-gray-600 mt-2">
                  {selectedCompanyId && getSelectedCompany() ? (
                    locale?.startsWith('es')
                      ? `Administra los usuarios de ${getSelectedCompany()?.name} • ${getSelectedCompany()?.industry || 'Sin industria'}`
                      : `Manage users for ${getSelectedCompany()?.name} • ${getSelectedCompany()?.industry || 'No industry'}`
                  ) : (
                    locale?.startsWith('es')
                      ? 'Administra los usuarios de tu empresa'
                      : 'Manage your company users'
                  )}
                </p>
              </div>
              <Button
                variant="primary"
                leftIcon={<PlusIcon className="w-4 h-4" />}
                onClick={handleInviteUser}
              >
                {locale?.startsWith('es') ? 'Invitar Usuario' : 'Invite User'}
              </Button>
            </div>
          </div>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <UsersIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle>
                    {locale?.startsWith('es') ? 'Usuarios de la Empresa' : 'Company Users'}
                  </CardTitle>
                  <CardDescription>
                    {locale?.startsWith('es')
                      ? 'Lista de todos los usuarios con acceso a la empresa'
                      : 'List of all users with access to the company'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {locale?.startsWith('es') ? 'Usuario' : 'User'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {locale?.startsWith('es') ? 'Rol' : 'Role'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {locale?.startsWith('es') ? 'Estado' : 'Status'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {locale?.startsWith('es') ? 'Último Acceso' : 'Last Login'}
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {locale?.startsWith('es') ? 'Acciones' : 'Actions'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center">
                          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                          <p className="text-gray-500">
                            {locale?.startsWith('es') ? 'Cargando usuarios...' : 'Loading users...'}
                          </p>
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center">
                          <p className="text-red-500 mb-4">{error}</p>
                          <Button variant="outline" onClick={() => fetchUsers(selectedCompanyId)}>
                            {locale?.startsWith('es') ? 'Reintentar' : 'Retry'}
                          </Button>
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center">
                          <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500 mb-4">
                            {locale?.startsWith('es')
                              ? 'No hay usuarios registrados'
                              : 'No users found'}
                          </p>
                          <Button variant="primary" onClick={handleInviteUser}>
                            {locale?.startsWith('es') ? 'Invitar Primer Usuario' : 'Invite First User'}
                          </Button>
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr 
                          key={user.id} 
                          className="hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => handleEditUser(user.id)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {user.firstName} {user.lastName}
                              </div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex text-xs px-2 py-1 rounded-full font-medium bg-blue-100 text-blue-800">
                              {getRoleLabel(user.role)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {user.isActive ? (
                                <>
                                  <CheckCircleIcon className="w-4 h-4 text-green-500 mr-1" />
                                  <span className="text-sm text-green-600">
                                    {locale?.startsWith('es') ? 'Activo' : 'Active'}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <XCircleIcon className="w-4 h-4 text-red-500 mr-1" />
                                  <span className="text-sm text-red-600">
                                    {locale?.startsWith('es') ? 'Inactivo' : 'Inactive'}
                                  </span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.lastLogin ? formatDate(user.lastLogin) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center">
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={(e) => handleDeleteUser(user.id, e)}
                                title={locale?.startsWith('es') ? 'Eliminar' : 'Delete'}
                              >
                                <TrashIcon className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

export default function UserManagementPageWrapper() {
  return (
    <ProtectedRoute requireRole={[ROLES.USER, ROLES.ORGANIZATION_ADMIN, ROLES.PLATFORM_ADMIN]}>
      <UserManagementPage />
    </ProtectedRoute>
  );
}