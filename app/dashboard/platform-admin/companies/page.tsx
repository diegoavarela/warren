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
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  UserGroupIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { ROLES } from '@/lib/auth/rbac';

interface Company {
  id: string;
  organizationId: string;
  name: string;
  taxId?: string;
  industry?: string;
  locale: string;
  baseCurrency: string;
  displayUnits?: string;
  isActive: boolean;
  createdAt: string;
}

interface Organization {
  id: string;
  name: string;
  companies: Company[];
}

export default function CompaniesPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchCompaniesGroupedByOrg();
  }, []);

  const fetchCompaniesGroupedByOrg = async () => {
    try {
      setLoading(true);
      
      // Fetch organizations first
      const orgsResponse = await fetch('/api/organizations');
      const orgsData = await orgsResponse.json();
      
      // Fetch all companies
      const companiesResponse = await fetch('/api/v1/companies');
      const companiesData = await companiesResponse.json();
      
      if (orgsResponse.ok && companiesResponse.ok) {
        // Group companies by organization
        const orgMap = new Map<string, Organization>();
        
        // Initialize organizations
        orgsData.organizations.forEach((org: any) => {
          orgMap.set(org.id, {
            id: org.id,
            name: org.name,
            companies: []
          });
        });
        
        // Add companies to their organizations
        companiesData.data.forEach((company: Company) => {
          const org = orgMap.get(company.organizationId);
          if (org) {
            org.companies.push(company);
          }
        });
        
        // Convert to array and filter out empty organizations
        const orgsWithCompanies = Array.from(orgMap.values()).filter(org => org.companies.length > 0);
        setOrganizations(orgsWithCompanies);
        
        // Expand all organizations by default
        setExpandedOrgs(new Set(orgsWithCompanies.map(org => org.id)));
      } else {
        setError('Failed to fetch data');
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
      setError('Network error - please try again');
    } finally {
      setLoading(false);
    }
  };

  const toggleOrganization = (orgId: string) => {
    const newExpanded = new Set(expandedOrgs);
    if (newExpanded.has(orgId)) {
      newExpanded.delete(orgId);
    } else {
      newExpanded.add(orgId);
    }
    setExpandedOrgs(newExpanded);
  };

  const filteredOrganizations = organizations.map(org => ({
    ...org,
    companies: org.companies.filter(company => {
      const matchesStatus = filterStatus === 'all' || 
                           (filterStatus === 'active' && company.isActive) ||
                           (filterStatus === 'inactive' && !company.isActive);
      return matchesStatus;
    })
  })).filter(org => org.companies.length > 0);

  const totalCompanies = organizations.reduce((sum, org) => sum + org.companies.length, 0);
  const activeCompanies = organizations.reduce((sum, org) => 
    sum + org.companies.filter(c => c.isActive).length, 0
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale || 'en-US', {
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
                  {locale?.startsWith('es') ? 'Empresas' : 'Companies'}
                </h1>
                <p className="text-gray-600 mt-2">
                  {locale?.startsWith('es') 
                    ? 'Gestiona todas las empresas del sistema'
                    : 'Manage all system companies'}
                </p>
              </div>
              <Button
                variant="primary"
                leftIcon={<PlusIcon className="w-4 h-4" />}
                onClick={() => router.push('/dashboard/platform-admin/companies/new')}
              >
                {locale?.startsWith('es') ? 'Nueva Empresa' : 'New Company'}
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardBody className="flex items-center space-x-4">
                <div className="p-3 rounded-lg bg-purple-100">
                  <UserGroupIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{organizations.length}</p>
                  <p className="text-sm text-gray-600">
                    {locale?.startsWith('es') ? 'Organizaciones' : 'Organizations'}
                  </p>
                </div>
              </CardBody>
            </Card>
            
            <Card>
              <CardBody className="flex items-center space-x-4">
                <div className="p-3 rounded-lg bg-blue-100">
                  <BuildingOfficeIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{totalCompanies}</p>
                  <p className="text-sm text-gray-600">
                    {locale?.startsWith('es') ? 'Empresas Totales' : 'Total Companies'}
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
                  <p className="text-2xl font-bold text-gray-900">{activeCompanies}</p>
                  <p className="text-sm text-gray-600">
                    {locale?.startsWith('es') ? 'Empresas Activas' : 'Active Companies'}
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
              <option value="active">{locale?.startsWith('es') ? 'Activas' : 'Active'}</option>
              <option value="inactive">{locale?.startsWith('es') ? 'Inactivas' : 'Inactive'}</option>
            </select>
          </div>

          {/* Companies by Organization */}
          {loading ? (
            <Card>
              <CardBody className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-500">
                  {locale?.startsWith('es') ? 'Cargando empresas...' : 'Loading companies...'}
                </p>
              </CardBody>
            </Card>
          ) : error ? (
            <Card>
              <CardBody className="text-center py-12">
                <p className="text-red-600 mb-4">{error}</p>
                <Button variant="outline" onClick={fetchCompaniesGroupedByOrg}>
                  {locale?.startsWith('es') ? 'Reintentar' : 'Retry'}
                </Button>
              </CardBody>
            </Card>
          ) : filteredOrganizations.length === 0 ? (
            <Card>
              <CardBody className="text-center py-12">
                <BuildingOfficeIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  {locale?.startsWith('es') 
                    ? 'No se encontraron empresas'
                    : 'No companies found'}
                </p>
              </CardBody>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredOrganizations.map((org) => (
                <Card key={org.id} className="overflow-hidden border-2 hover:border-gray-300 transition-colors">
                  <CardHeader 
                    className="cursor-pointer bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 transition-all"
                    onClick={() => toggleOrganization(org.id)}
                  >
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                          <BuildingOfficeIcon className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{org.name}</h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                            <span>{org.companies.length} {locale?.startsWith('es') ? 'empresas' : 'companies'}</span>
                            <span className="text-gray-400">•</span>
                            <span>{org.companies.filter(c => c.isActive).length} {locale?.startsWith('es') ? 'activas' : 'active'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/platform-admin/organizations/${org.id}`);
                          }}
                        >
                          {locale?.startsWith('es') ? 'Editar Org' : 'Edit Org'}
                        </Button>
                        {expandedOrgs.has(org.id) ? (
                          <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  {expandedOrgs.has(org.id) && (
                    <CardBody className="bg-gray-50 border-t">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {org.companies.map((company) => (
                          <div
                            key={company.id}
                            className="bg-white border-2 rounded-xl p-5 hover:shadow-lg hover:border-blue-200 transition-all cursor-pointer"
                            onClick={() => router.push(`/dashboard/platform-admin/companies/${company.id}`)}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <h4 className="font-semibold text-gray-900 text-base">{company.name}</h4>
                              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                                company.isActive 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {company.isActive 
                                  ? (locale?.startsWith('es') ? 'Activa' : 'Active')
                                  : (locale?.startsWith('es') ? 'Inactiva' : 'Inactive')
                                }
                              </span>
                            </div>
                            
                            <div className="space-y-2 text-sm text-gray-600">
                              {company.taxId && (
                                <div className="flex items-center space-x-2">
                                  <DocumentTextIcon className="w-4 h-4 text-gray-400" />
                                  <span>{company.taxId}</span>
                                </div>
                              )}
                              {company.industry && (
                                <div className="flex items-center space-x-2">
                                  <GlobeAltIcon className="w-4 h-4 text-gray-400" />
                                  <span>{company.industry}</span>
                                </div>
                              )}
                              <div className="flex items-center space-x-2 text-xs text-gray-500 pt-2">
                                <CalendarIcon className="w-4 h-4 text-gray-400" />
                                <span>{formatDate(company.createdAt)}</span>
                              </div>
                            </div>
                            
                            <div className="mt-4 pt-3 border-t flex justify-between items-center">
                              <div className="flex items-center space-x-2 text-xs">
                                <span className="px-2 py-1 bg-gray-100 rounded text-gray-600">
                                  {company.locale}
                                </span>
                                <span className="px-2 py-1 bg-gray-100 rounded text-gray-600">
                                  {company.baseCurrency}
                                </span>
                              </div>
                              <div className="flex space-x-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/dashboard/platform-admin/companies/${company.id}/edit`);
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                                >
                                  <PencilIcon className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    console.log('Delete company:', company.id);
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardBody>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}