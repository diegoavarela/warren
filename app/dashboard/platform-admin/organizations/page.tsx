"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ui/Card';
import {
  BuildingOfficeIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { ROLES } from '@/lib/auth/rbac';

interface Organization {
  id: string;
  name: string;
  subdomain: string;
  tier: 'free' | 'starter' | 'professional' | 'enterprise';
  locale: string;
  baseCurrency: string;
  isActive: boolean;
  createdAt: Date;
  companiesCount: number;
  usersCount: number;
}

export default function OrganizationsPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const [filterTier, setFilterTier] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/organizations');
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Map the API response to our component's Organization interface
        const mappedOrgs = data.organizations.map((org: any) => ({
          ...org,
          createdAt: new Date(org.createdAt),
          companiesCount: 0, // TODO: Fetch actual count
          usersCount: 0 // TODO: Fetch actual count
        }));
        setOrganizations(mappedOrgs);
      } else {
        setError(data.error || 'Failed to fetch organizations');
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
      setError('Network error - please try again');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrganizations = organizations.filter(org => {
    const matchesTier = filterTier === 'all' || org.tier === filterTier;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && org.isActive) ||
                         (filterStatus === 'inactive' && !org.isActive);
    
    return matchesTier && matchesStatus;
  });

  const getTierBadge = (tier: Organization['tier']) => {
    const colors = {
      free: 'bg-gray-100 text-gray-800',
      starter: 'bg-blue-100 text-blue-800',
      professional: 'bg-purple-100 text-purple-800',
      enterprise: 'bg-yellow-100 text-yellow-800'
    };
    return colors[tier];
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(locale || 'es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <ProtectedRoute requireRole={[ROLES.SUPER_ADMIN]}>
      <AppLayout showFooter={true}>
        <div className="container mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {locale?.startsWith('es') ? 'Organizaciones' : 'Organizations'}
                </h1>
                <p className="text-gray-600 mt-2">
                  {locale?.startsWith('es') 
                    ? 'Gestiona todas las organizaciones del sistema'
                    : 'Manage all system organizations'}
                </p>
              </div>
              <Button
                variant="primary"
                leftIcon={<PlusIcon className="w-4 h-4" />}
                onClick={() => router.push('/dashboard/platform-admin/organizations/new')}
              >
                {locale?.startsWith('es') ? 'Nueva Organización' : 'New Organization'}
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 flex justify-end gap-2">
            <select
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value)}
            >
              <option value="all">{locale?.startsWith('es') ? 'Todos los planes' : 'All tiers'}</option>
              <option value="free">Free</option>
              <option value="starter">Starter</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
            
            <select
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">{locale?.startsWith('es') ? 'Todos los estados' : 'All status'}</option>
              <option value="active">{locale?.startsWith('es') ? 'Activas' : 'Active'}</option>
              <option value="inactive">{locale?.startsWith('es') ? 'Inactivas' : 'Inactive'}</option>
            </select>
          </div>

          {/* Organizations Table */}
          <Card>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {locale?.startsWith('es') ? 'Organización' : 'Organization'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {locale?.startsWith('es') ? 'Plan' : 'Tier'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {locale?.startsWith('es') ? 'Empresas' : 'Companies'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {locale?.startsWith('es') ? 'Usuarios' : 'Users'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {locale?.startsWith('es') ? 'Estado' : 'Status'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {locale?.startsWith('es') ? 'Creada' : 'Created'}
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                        {locale?.startsWith('es') ? 'Acción' : 'Action'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredOrganizations.map((org) => (
                      <tr 
                        key={org.id} 
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => router.push(`/dashboard/platform-admin/organizations/${org.id}`)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{org.name}</div>
                            <div className="text-sm text-gray-500">{org.subdomain}.warren.com</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex text-xs px-2 py-1 rounded-full font-medium ${getTierBadge(org.tier)}`}>
                            {org.tier.charAt(0).toUpperCase() + org.tier.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {org.companiesCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {org.usersCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {org.isActive ? (
                              <>
                                <CheckCircleIcon className="w-4 h-4 text-green-500 mr-1" />
                                <span className="text-sm text-green-600">
                                  {locale?.startsWith('es') ? 'Activa' : 'Active'}
                                </span>
                              </>
                            ) : (
                              <>
                                <XCircleIcon className="w-4 h-4 text-red-500 mr-1" />
                                <span className="text-sm text-red-600">
                                  {locale?.startsWith('es') ? 'Inactiva' : 'Inactive'}
                                </span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(org.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log('Delete organization:', org.id);
                            }}
                            className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded transition-all"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {loading && (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-gray-500">
                    {locale?.startsWith('es') ? 'Cargando organizaciones...' : 'Loading organizations...'}
                  </p>
                </div>
              )}
              
              {error && (
                <div className="text-center py-12">
                  <p className="text-red-500 mb-4">{error}</p>
                  <Button variant="outline" onClick={fetchOrganizations}>
                    {locale?.startsWith('es') ? 'Reintentar' : 'Retry'}
                  </Button>
                </div>
              )}
              
              {!loading && !error && filteredOrganizations.length === 0 && (
                <div className="text-center py-12">
                  <BuildingOfficeIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {locale?.startsWith('es') 
                      ? 'No se encontraron organizaciones'
                      : 'No organizations found'}
                  </p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}