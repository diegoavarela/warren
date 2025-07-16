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
  UserGroupIcon,
  DocumentDuplicateIcon,
  DocumentTextIcon,
  ChartBarIcon,
  PlusIcon,
  CogIcon,
  CloudArrowUpIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  XCircleIcon,
  UsersIcon,
  BanknotesIcon
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

function CompanyAdminDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { locale } = useLocale();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [financialStatements, setFinancialStatements] = useState<any[]>([]);
  const [loadingStatements, setLoadingStatements] = useState(false);

  useEffect(() => {
    fetchCompanies();
    
    // Check for pre-selected company from routing or organization admin
    const preSelectedCompanyId = sessionStorage.getItem('selectedCompanyId');
    if (preSelectedCompanyId) {
      setSelectedCompanyId(preSelectedCompanyId);
      
      // Only clear the stored value if user is org admin (they selected the company)
      // For company employees, keep it so they stay locked to their company
      const isOrgAdmin = user?.role === ROLES.ORG_ADMIN || user?.role === 'admin';
      if (isOrgAdmin) {
        sessionStorage.removeItem('selectedCompanyId');
      }
    }
  }, [user]);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchFinancialStatements(selectedCompanyId);
    }
  }, [selectedCompanyId]);

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/v1/companies');
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.data)) {
          const filteredCompanies = data.data.filter((company: any) => {
            return company.organizationId === user?.organizationId;
          });
          const mappedCompanies = filteredCompanies.map((company: any) => ({
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

  const getSelectedCompany = () => {
    return companies.find(company => company.id === selectedCompanyId);
  };

  const fetchFinancialStatements = async (companyId: string) => {
    setLoadingStatements(true);
    try {
      const response = await fetch(`/api/v1/companies/${companyId}/statements`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.data)) {
          setFinancialStatements(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching financial statements:', error);
    } finally {
      setLoadingStatements(false);
    }
  };

  return (
    <AppLayout showFooter={true}>
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 container mx-auto px-4 py-4">
          {/* Welcome Section */}
          <div className="mb-4">
            <h1 className="text-3xl font-bold text-gray-900">
              {selectedCompanyId && getSelectedCompany() ? (
                locale?.startsWith('es') 
                  ? `Administración de ${getSelectedCompany()?.name}`
                  : `${getSelectedCompany()?.name} Administration`
              ) : (
                locale?.startsWith('es') ? 'Panel de Administración de Empresa' : 'Company Admin Dashboard'
              )}
            </h1>
            <p className="text-gray-600 mt-2">
              {selectedCompanyId && getSelectedCompany() ? (
                locale?.startsWith('es') 
                  ? `Gestionando ${getSelectedCompany()?.name} • ${getSelectedCompany()?.industry || 'Sin industria'}`
                  : `Managing ${getSelectedCompany()?.name} • ${getSelectedCompany()?.industry || 'No industry'}`
              ) : (
                locale?.startsWith('es') 
                  ? `Bienvenido de vuelta, ${user?.firstName}`
                  : `Welcome back, ${user?.firstName}`
              )}
            </p>
          </div>

          {/* Companies Table - Only show for org admins without selected company */}
          {!selectedCompanyId && (user?.role === ROLES.ORG_ADMIN || user?.role === 'admin') ? (
            <Card className="mb-8">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>
                      {locale?.startsWith('es') ? 'Seleccionar Empresa' : 'Select Company'}
                    </CardTitle>
                    <CardDescription>
                      {locale?.startsWith('es') 
                        ? 'Elige una empresa para gestionar sus recursos'
                        : 'Choose a company to manage its resources'}
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
                          {locale?.startsWith('es') ? 'Empresa' : 'Company'}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {locale?.startsWith('es') ? 'Industria' : 'Industry'}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {locale?.startsWith('es') ? 'Estado' : 'Status'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {companies.map((company) => (
                        <tr 
                          key={company.id} 
                          className="hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => setSelectedCompanyId(company.id)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{company.name}</div>
                              <div className="text-sm text-gray-500">{company.taxId}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {company.industry || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {company.isActive ? (
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>
          ) : !selectedCompanyId && (user?.role !== ROLES.ORG_ADMIN && user?.role !== 'admin') ? (
            <Card className="mb-8">
              <CardBody className="text-center py-12">
                <BuildingOfficeIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {locale?.startsWith('es') ? 'Sin Empresa Asignada' : 'No Company Assigned'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {locale?.startsWith('es') 
                    ? 'No tienes acceso a ninguna empresa. Contacta a tu administrador para obtener acceso.'
                    : 'You do not have access to any company. Contact your administrator for access.'}
                </p>
                <Button
                  variant="primary"
                  onClick={() => router.push('/dashboard')}
                >
                  {locale?.startsWith('es') ? 'Volver al Dashboard' : 'Return to Dashboard'}
                </Button>
              </CardBody>
            </Card>
          ) : selectedCompanyId && (user?.role === ROLES.ORG_ADMIN || user?.role === 'admin') ? (
            <div className="mb-4">
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedCompanyId('');
                  sessionStorage.removeItem('selectedCompanyId');
                }}
                className="mb-2"
              >
                ← {locale?.startsWith('es') ? 'Volver a empresas' : 'Back to companies'}
              </Button>
            </div>
          ) : null}

          {selectedCompanyId ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {locale?.startsWith('es') ? 'Datos Financieros' : 'Financial Data'}
                  </CardTitle>
                  <CardDescription>
                    {locale?.startsWith('es') 
                      ? 'Resumen de datos financieros disponibles'
                      : 'Overview of available financial data'}
                  </CardDescription>
                </CardHeader>
                <CardBody>
                  {loadingStatements ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : financialStatements.length > 0 ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-blue-50 rounded-lg p-4">
                          <div className="text-2xl font-bold text-blue-700">{financialStatements.length}</div>
                          <div className="text-sm text-blue-600">
                            {locale?.startsWith('es') ? 'Períodos cargados' : 'Periods uploaded'}
                          </div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4">
                          <div className="text-2xl font-bold text-green-700">
                            {financialStatements[0]?.month} {financialStatements[0]?.year}
                          </div>
                          <div className="text-sm text-green-600">
                            {locale?.startsWith('es') ? 'Último período' : 'Latest period'}
                          </div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              sessionStorage.setItem('selectedCompanyId', selectedCompanyId);
                              router.push('/dashboard/company-admin/pnl');
                            }}
                            leftIcon={<ChartBarIcon className="w-4 h-4" />}
                          >
                            {locale?.startsWith('es') ? 'Ver P&L' : 'View P&L'}
                          </Button>
                        </div>
                      </div>
                      
                      <div className="border-t pt-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">
                          {locale?.startsWith('es') ? 'Períodos disponibles' : 'Available periods'}
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {financialStatements.map((stmt, idx) => (
                            <div key={idx} className="bg-gray-50 rounded px-3 py-2 text-sm text-gray-700">
                              {stmt.month} {stmt.year}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex justify-center pt-4">
                        <Button
                          variant="secondary"
                          onClick={() => {
                            sessionStorage.setItem('selectedCompanyId', selectedCompanyId);
                            router.push('/upload');
                          }}
                          leftIcon={<CloudArrowUpIcon className="w-5 h-5" />}
                        >
                          {locale?.startsWith('es') ? 'Cargar más períodos' : 'Upload more periods'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <ChartBarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {locale?.startsWith('es') ? 'Sin datos financieros' : 'No financial data'}
                      </h3>
                      <p className="text-gray-600 mb-6">
                        {locale?.startsWith('es') 
                          ? 'Sube tu primer documento financiero para comenzar'
                          : 'Upload your first financial document to get started'}
                      </p>
                      <Button
                        variant="primary"
                        onClick={() => {
                          sessionStorage.setItem('selectedCompanyId', selectedCompanyId);
                          router.push('/upload');
                        }}
                        leftIcon={<CloudArrowUpIcon className="w-5 h-5" />}
                      >
                        {locale?.startsWith('es') ? 'Subir Primer Documento' : 'Upload First Document'}
                      </Button>
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>
          ) : null}
        </div>
      </div>
    </AppLayout>
  );
}

export default function CompanyAdminPage() {
  return (
    <ProtectedRoute requireRole={[ROLES.COMPANY_ADMIN, ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN]}>
      <CompanyAdminDashboard />
    </ProtectedRoute>
  );
}