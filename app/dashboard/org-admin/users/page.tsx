"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Users, Plus, Search, Edit, Trash2, Mail, Shield, Key } from 'lucide-react';
import { ROLES } from '@/lib/auth/rbac';
import { useLocale } from '@/contexts/LocaleContext';

interface OrgUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationRole: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
  companyAccess: {
    companyId: string;
    companyName: string;
    role: string;
    isActive: boolean;
  }[];
}

function OrgUsersPage() {
  const router = useRouter();
  const { user, organization } = useAuth();
  const { locale } = useLocale();
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [resetPasswordUser, setResetPasswordUser] = useState<OrgUser | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [newPassword, setNewPassword] = useState<string>('');

  useEffect(() => {
    fetchUsers();
  }, [organization?.id]);

  const fetchUsers = async () => {
    if (!organization?.id) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/organizations/${organization.id}/users`);
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    const confirmed = window.confirm(`Are you sure you want to delete user ${userEmail}? This action cannot be undone.`);
    
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/organizations/${organization?.id}/users/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete user');
      }

      await fetchUsers();
      alert(`User ${userEmail} has been deleted successfully.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const handleResetPassword = (targetUser: OrgUser) => {
    setResetPasswordUser(targetUser);
    setShowResetModal(true);
    setNewPassword('');
  };

  const confirmResetPassword = async () => {
    if (!resetPasswordUser) return;

    setResetLoading(true);

    try {
      const response = await fetch(`/api/organizations/${organization?.id}/users/${resetPasswordUser.id}/reset-password`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reset password');
      }

      const data = await response.json();
      setNewPassword(data.temporaryPassword);
      
      // Don't close modal immediately - let user copy the password
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reset password');
      setShowResetModal(false);
    } finally {
      setResetLoading(false);
    }
  };

  const closeResetModal = () => {
    setShowResetModal(false);
    setResetPasswordUser(null);
    setNewPassword('');
  };

  const getRoleLabel = (role: string) => {
    const roleLabels: Record<string, string> = {
      [ROLES.SUPER_ADMIN]: locale?.startsWith('es') ? 'Super Admin' : 'Super Admin',
      [ROLES.ORG_ADMIN]: locale?.startsWith('es') ? 'Admin de Organización' : 'Organization Admin',
      [ROLES.COMPANY_ADMIN]: locale?.startsWith('es') ? 'Admin de Empresa' : 'Company Admin',
      [ROLES.COMPANY_USER]: locale?.startsWith('es') ? 'Usuario' : 'User',
      [ROLES.COMPANY_VIEWER]: locale?.startsWith('es') ? 'Solo Lectura' : 'Viewer'
    };
    return roleLabels[role] || role;
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case ROLES.SUPER_ADMIN:
        return 'bg-purple-100 text-purple-800';
      case ROLES.ORG_ADMIN:
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      case ROLES.COMPANY_ADMIN:
        return 'bg-green-100 text-green-800';
      case ROLES.COMPANY_USER:
      case 'user':
        return 'bg-gray-100 text-gray-800';
      case ROLES.COMPANY_VIEWER:
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Filter users based on search term
  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppLayout showFooter={true}>
      <div className="max-w-6xl mx-auto p-4">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/org-admin')}
            className="mb-4"
          >
            ← {locale?.startsWith('es') ? 'Volver al panel' : 'Back to dashboard'}
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {locale?.startsWith('es') ? 'Gestión de Usuarios' : 'User Management'}
              </h1>
              <p className="text-gray-600 mt-2">
                {locale?.startsWith('es') 
                  ? 'Administra usuarios de tu organización'
                  : 'Manage users in your organization'}
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => router.push('/dashboard/org-admin/users/invite')}
              className="inline-flex items-center"
            >
              <Plus className="mr-2 h-4 w-4" />
              {locale?.startsWith('es') ? 'Invitar Usuario' : 'Invite User'}
            </Button>
          </div>
        </div>

        {/* Users List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  {locale?.startsWith('es') ? 'Usuarios' : 'Users'} ({users.length})
                </CardTitle>
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder={locale?.startsWith('es') ? 'Buscar usuarios...' : 'Search users...'}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <p className="mt-2 text-gray-600">
                  {locale?.startsWith('es') ? 'Cargando usuarios...' : 'Loading users...'}
                </p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-600">{error}</p>
                <Button onClick={fetchUsers} variant="outline" className="mt-4">
                  {locale?.startsWith('es') ? 'Reintentar' : 'Retry'}
                </Button>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-gray-600">
                  {locale?.startsWith('es') ? 'No hay usuarios' : 'No users yet'}
                </p>
                <p className="text-sm text-gray-500">
                  {locale?.startsWith('es') 
                    ? 'Invita tu primer usuario para comenzar'
                    : 'Invite your first user to get started'}
                </p>
                <Button 
                  variant="primary" 
                  className="mt-4"
                  onClick={() => router.push('/dashboard/org-admin/users/invite')}
                >
                  {locale?.startsWith('es') ? 'Invitar Usuario' : 'Invite User'}
                </Button>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <Search className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-gray-600">
                  {locale?.startsWith('es') ? 'No se encontraron usuarios' : 'No users found'}
                </p>
                <p className="text-sm text-gray-500">
                  {locale?.startsWith('es') ? 'Intenta con otro término de búsqueda' : 'Try a different search term'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors flex items-center justify-between group"
                    onClick={() => router.push(`/dashboard/org-admin/users/${user.id}/edit`)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium text-lg">
                          {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {user.firstName} {user.lastName}
                          </h3>
                          <span className={`px-2 py-1 text-xs rounded-full ${getRoleBadgeColor(user.organizationRole)}`}>
                            {getRoleLabel(user.organizationRole)}
                          </span>
                          {!user.emailVerified && (
                            <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800">
                              {locale?.startsWith('es') ? 'Pendiente' : 'Pending'}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 flex items-center">
                          <Mail className="w-4 h-4 mr-1" />
                          {user.email}
                        </p>
                        {user.companyAccess && user.companyAccess.length > 0 && (
                          <p className="text-xs text-gray-400 mt-1">
                            {locale?.startsWith('es') ? 'Acceso a empresas' : 'Company access'}: {user.companyAccess.map(ca => ca.companyName).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-right text-sm text-gray-500 mr-4">
                        <p>{locale?.startsWith('es') ? 'Creado' : 'Created'}: {new Date(user.createdAt).toLocaleDateString()}</p>
                        {user.lastLoginAt && (
                          <p>{locale?.startsWith('es') ? 'Último acceso' : 'Last login'}: {new Date(user.lastLoginAt).toLocaleDateString()}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/dashboard/org-admin/users/${user.id}/edit`);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        title={locale?.startsWith('es') ? 'Editar usuario' : 'Edit user'}
                      >
                        <Edit className="w-4 h-4 text-gray-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResetPassword(user);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        title={locale?.startsWith('es') ? 'Restablecer contraseña' : 'Reset password'}
                      >
                        <Key className="w-4 h-4 text-blue-600" />
                      </Button>
                      {user.id !== user.id && ( // Don't allow deleting yourself
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteUser(user.id, user.email);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          title={locale?.startsWith('es') ? 'Eliminar usuario' : 'Delete user'}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Reset Password Modal */}
      {showResetModal && resetPasswordUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <Key className="w-5 h-5 mr-2 text-blue-600" />
              {locale?.startsWith('es') ? 'Restablecer Contraseña' : 'Reset Password'}
            </h3>
            
            {!newPassword ? (
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  {locale?.startsWith('es')
                    ? `¿Estás seguro de que quieres restablecer la contraseña de ${resetPasswordUser.firstName} ${resetPasswordUser.lastName}?`
                    : `Are you sure you want to reset the password for ${resetPasswordUser.firstName} ${resetPasswordUser.lastName}?`}
                </p>
                <p className="text-xs text-orange-600 mb-6">
                  {locale?.startsWith('es')
                    ? 'Esto generará una nueva contraseña temporal que deberás compartir con el usuario.'
                    : 'This will generate a new temporary password that you must share with the user.'}
                </p>
                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={closeResetModal}
                    disabled={resetLoading}
                  >
                    {locale?.startsWith('es') ? 'Cancelar' : 'Cancel'}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={confirmResetPassword}
                    disabled={resetLoading}
                    loading={resetLoading}
                  >
                    {resetLoading
                      ? (locale?.startsWith('es') ? 'Restableciendo...' : 'Resetting...')
                      : (locale?.startsWith('es') ? 'Restablecer' : 'Reset Password')
                    }
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center mb-2">
                    <Shield className="w-5 h-5 text-green-600 mr-2" />
                    <h4 className="font-semibold text-green-900">
                      {locale?.startsWith('es') ? '¡Contraseña restablecida!' : 'Password reset successfully!'}
                    </h4>
                  </div>
                  <p className="text-sm text-green-700 mb-3">
                    {locale?.startsWith('es')
                      ? 'Nueva contraseña temporal generada. Compártela de forma segura con el usuario.'
                      : 'New temporary password generated. Share it securely with the user.'}
                  </p>
                  
                  <div className="bg-white border border-green-300 rounded p-3">
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">
                          {locale?.startsWith('es') ? 'Usuario:' : 'User:'}
                        </span>
                        <span className="ml-2 font-mono bg-gray-100 px-2 py-1 rounded">
                          {resetPasswordUser.email}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">
                          {locale?.startsWith('es') ? 'Nueva contraseña:' : 'New password:'}
                        </span>
                        <span className="ml-2 font-mono bg-yellow-100 px-2 py-1 rounded text-yellow-800 select-all">
                          {newPassword}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button
                    variant="primary"
                    onClick={closeResetModal}
                  >
                    {locale?.startsWith('es') ? 'Cerrar' : 'Close'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default function OrgUsersPageWrapper() {
  return (
    <ProtectedRoute requireRole={[ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN]}>
      <OrgUsersPage />
    </ProtectedRoute>
  );
}