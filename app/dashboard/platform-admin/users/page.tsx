"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ui/Card';
import {
  UserGroupIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { ROLES } from '@/lib/auth/rbac';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId: string | null;
  organizationName: string;
  companies: string[];
  isActive: boolean;
  isEmailVerified: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export default function UsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useLocale();
  const [filterStatus, setFilterStatus] = useState<string>(searchParams?.get('filter') || 'all');
  
  const [users] = useState<User[]>([
    {
      id: 'user-1',
      email: 'admin@demo.com',
      firstName: 'Carlos',
      lastName: 'Administrador',
      role: 'admin',
      organizationId: 'org-1',
      organizationName: 'Demo Organization',
      companies: ['Empresa Demo SA de CV', 'Comercializadora XYZ'],
      isActive: true,
      isEmailVerified: true,
      lastLoginAt: new Date(),
      createdAt: new Date('2024-01-01')
    },
    {
      id: 'user-2',
      email: 'user@demo.com',
      firstName: 'Maria',
      lastName: 'Usuario',
      role: 'user',
      organizationId: 'org-1',
      organizationName: 'Demo Organization',
      companies: ['Empresa Demo SA de CV'],
      isActive: true,
      isEmailVerified: true,
      lastLoginAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      createdAt: new Date('2024-01-15')
    },
    {
      id: 'user-3',
      email: 'demo@warren.com',
      firstName: 'Demo',
      lastName: 'User',
      role: 'user',
      organizationId: 'org-1',
      organizationName: 'Demo Organization',
      companies: ['Comercializadora XYZ'],
      isActive: true,
      isEmailVerified: true,
      lastLoginAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
      createdAt: new Date('2024-02-01')
    },
    {
      id: 'user-4',
      email: 'platform@warren.com',
      firstName: 'Platform',
      lastName: 'Admin',
      role: 'super_admin',
      organizationId: null,
      organizationName: 'Warren Platform',
      companies: [],
      isActive: true,
      isEmailVerified: true,
      lastLoginAt: new Date(),
      createdAt: new Date('2024-01-01')
    },
    {
      id: 'user-5',
      email: 'companyadmin@demo.com',
      firstName: 'Company',
      lastName: 'Admin',
      role: 'company_admin',
      organizationId: 'org-1',
      organizationName: 'Demo Organization',
      companies: ['Empresa Demo SA de CV', 'Comercializadora XYZ'],
      isActive: true,
      isEmailVerified: true,
      lastLoginAt: null,
      createdAt: new Date('2024-02-15')
    }
  ]);

  const filteredUsers = users.filter(user => {
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && user.isActive) ||
                         (filterStatus === 'inactive' && !user.isActive);
    
    return matchesStatus;
  });

  const getRoleBadge = (role: string) => {
    const roleColors: Record<string, string> = {
      super_admin: 'bg-red-100 text-red-800',
      admin: 'bg-purple-100 text-purple-800',
      company_admin: 'bg-blue-100 text-blue-800',
      user: 'bg-gray-100 text-gray-800',
      viewer: 'bg-green-100 text-green-800'
    };
    
    const roleLabels: Record<string, string> = {
      super_admin: locale?.startsWith('es') ? 'Super Admin' : 'Super Admin',
      admin: locale?.startsWith('es') ? 'Admin Org' : 'Org Admin',
      company_admin: locale?.startsWith('es') ? 'Admin Empresa' : 'Company Admin',
      user: locale?.startsWith('es') ? 'Usuario' : 'User',
      viewer: locale?.startsWith('es') ? 'Visor' : 'Viewer'
    };
    
    return {
      color: roleColors[role] || roleColors.user,
      label: roleLabels[role] || role
    };
  };

  const formatDate = (date: Date | null) => {
    if (!date) return locale?.startsWith('es') ? 'Nunca' : 'Never';
    return date.toLocaleDateString(locale || 'es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <ProtectedRoute requireRole={[ROLES.SUPER_ADMIN, ROLES.ORG_ADMIN]}>
      <AppLayout showFooter={true}>
        <div className="container mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {locale?.startsWith('es') ? 'Usuarios' : 'Users'}
                </h1>
                <p className="text-gray-600 mt-2">
                  {locale?.startsWith('es') 
                    ? 'Gestiona todos los usuarios del sistema'
                    : 'Manage all system users'}
                </p>
              </div>
              <Button
                variant="primary"
                leftIcon={<PlusIcon className="w-4 h-4" />}
                onClick={() => router.push('/dashboard/platform-admin/users/invite')}
              >
                {locale?.startsWith('es') ? 'Invitar Usuario' : 'Invite User'}
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardBody className="flex items-center space-x-4">
                <div className="p-3 rounded-lg bg-blue-100">
                  <UserGroupIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{users.length}</p>
                  <p className="text-sm text-gray-600">
                    {locale?.startsWith('es') ? 'Total' : 'Total'}
                  </p>
                </div>
              </CardBody>
            </Card>
            
            <Card>
              <CardBody className="flex items-center space-x-4">
                <div className="p-3 rounded-lg bg-green-100">
                  <CheckCircleIcon className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {users.filter(u => u.isActive).length}
                  </p>
                  <p className="text-sm text-gray-600">
                    {locale?.startsWith('es') ? 'Activos' : 'Active'}
                  </p>
                </div>
              </CardBody>
            </Card>
            
            <Card>
              <CardBody className="flex items-center space-x-4">
                <div className="p-3 rounded-lg bg-purple-100">
                  <ShieldCheckIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {users.filter(u => u.role.includes('admin')).length}
                  </p>
                  <p className="text-sm text-gray-600">
                    {locale?.startsWith('es') ? 'Administradores' : 'Admins'}
                  </p>
                </div>
              </CardBody>
            </Card>
            
            <Card>
              <CardBody className="flex items-center space-x-4">
                <div className="p-3 rounded-lg bg-orange-100">
                  <ClockIcon className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {users.filter(u => u.lastLoginAt && 
                      (new Date().getTime() - u.lastLoginAt.getTime()) < 24 * 60 * 60 * 1000
                    ).length}
                  </p>
                  <p className="text-sm text-gray-600">
                    {locale?.startsWith('es') ? 'Activos Hoy' : 'Active Today'}
                  </p>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Filter */}
          <div className="mb-6 flex justify-end">
            <select
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">{locale?.startsWith('es') ? 'Todos los estados' : 'All status'}</option>
              <option value="active">{locale?.startsWith('es') ? 'Activos' : 'Active'}</option>
              <option value="inactive">{locale?.startsWith('es') ? 'Inactivos' : 'Inactive'}</option>
            </select>
          </div>

          {/* Users Table */}
          <Card className="overflow-hidden">
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
                      {locale?.startsWith('es') ? 'Organización' : 'Organization'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {locale?.startsWith('es') ? 'Estado' : 'Status'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {locale?.startsWith('es') ? 'Último Acceso' : 'Last Login'}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => {
                    const role = getRoleBadge(user.role);
                    return (
                      <tr 
                        key={user.id} 
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => router.push(`/dashboard/platform-admin/users/${user.id}`)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-700 rounded-full flex items-center justify-center">
                              <span className="text-white text-sm font-medium">
                                {user.firstName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {user.firstName} {user.lastName}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center">
                                <EnvelopeIcon className="w-3 h-3 mr-1" />
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex text-xs px-2 py-1 rounded-full font-medium ${role.color}`}>
                            {role.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{user.organizationName}</div>
                          {user.companies.length > 0 && (
                            <div className="text-xs text-gray-500">
                              {user.companies.length} {locale?.startsWith('es') ? 'empresa(s)' : 'company(ies)'}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {user.isActive ? (
                              <CheckCircleIcon className="w-4 h-4 text-green-500" />
                            ) : (
                              <XCircleIcon className="w-4 h-4 text-red-500" />
                            )}
                            {user.isEmailVerified && (
                              <ShieldCheckIcon className="w-4 h-4 text-blue-500" />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(user.lastLoginAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <UserGroupIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  {locale?.startsWith('es') 
                    ? 'No se encontraron usuarios'
                    : 'No users found'}
                </p>
              </div>
            )}
          </Card>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}