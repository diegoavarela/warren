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
import { UploadHistory } from '@/components/UploadHistory';

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

interface CompanyStats {
  totalUsers: number;
  totalTemplates: number;
  documentsThisMonth: number;
  activeTemplates: number;
}

interface FinancialStatus {
  hasData: boolean;
  statements: {
    profit_loss: StatementStatus;
    cash_flow: StatementStatus;
    balance_sheet: StatementStatus;
    trial_balance: StatementStatus;
  };
  totalPeriods: number;
  lastActivity: string | null;
}

interface StatementStatus {
  available: boolean;
  coverage: string | null;
  lastUpload: string | null;
  statementId: string | null;
}

interface Template {
  id: string;
  templateName: string;
  statementType: string;
  locale?: string;
  isDefault: boolean;
  usageCount: number;
  lastUsedAt?: string;
  createdAt: string;
}

interface CompanyUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationRole: string;
  companyRole: string;
  isActive: boolean;
  joinedAt?: string;
}

function CompanyAdminDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { locale } = useLocale();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [financialLoading, setFinancialLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<CompanyStats>({
    totalUsers: 0,
    totalTemplates: 0,
    documentsThisMonth: 0,
    activeTemplates: 0
  });
  const [financialStatus, setFinancialStatus] = useState<FinancialStatus | null>(null);

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
      fetchCompanyStats(selectedCompanyId);
      fetchCompanyTemplates(selectedCompanyId);
      fetchCompanyUsers(selectedCompanyId);
      fetchFinancialStatus(selectedCompanyId);
    }
  }, [selectedCompanyId]);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/companies');
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.data)) {
          // Filter companies to ensure they belong to the user's organization
          const filteredCompanies = data.data.filter((company: any) => {
            const belongsToUserOrg = company.organizationId === user?.organizationId;
            if (!belongsToUserOrg) {
              console.warn(`⚠️ Company ${company.name} (${company.id}) has wrong organizationId: ${company.organizationId}, expected: ${user?.organizationId}`);
            }
            return belongsToUserOrg;
          });
          const mappedCompanies = filteredCompanies.map((company: any) => ({
            ...company,
            createdAt: new Date(company.createdAt)
          }));
          setCompanies(mappedCompanies);
        } else {
          setError('Invalid data format received');
        }
      } else {
        setError('Failed to fetch companies');
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
      setError('Network error - please try again');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyStats = async (companyId: string) => {
    try {
      setStatsLoading(true);
      const response = await fetch(`/api/v1/companies/${companyId}/stats`);
      if (response.ok) {
        const result = await response.json();
        const data = result.success ? result.data : result;
        setStats({
          totalUsers: data.totalUsers || 0,
          totalTemplates: data.totalTemplates || 0,
          documentsThisMonth: data.documentsThisMonth || 0,
          activeTemplates: data.activeTemplates || 0
        });
      } else {
        console.error('Failed to fetch company stats');
        // Keep stats at 0 to show actual state
      }
    } catch (error) {
      console.error('Error fetching company stats:', error);
      // Keep stats at 0 on error to show actual state
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchCompanyTemplates = async (companyId: string) => {
    try {
      setTemplatesLoading(true);
      const response = await fetch(`/api/v1/templates?companyId=${companyId}`);
      if (response.ok) {
        const result = await response.json();
        const templatesData = result.success ? result.data : (result.templates || []);
        const mappedTemplates = templatesData?.map((template: any) => ({
          ...template,
          createdAt: template.createdAt,
          lastUsedAt: template.lastUsedAt
        })) || [];
        // Show only first 3 templates for dashboard preview
        setTemplates(mappedTemplates.slice(0, 3));
      } else {
        console.warn('Templates API not available');
        setTemplates([]);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      setTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const fetchCompanyUsers = async (companyId: string) => {
    try {
      setUsersLoading(true);
      const response = await fetch(`/api/companies/${companyId}/users`);
      if (response.ok) {
        const data = await response.json();
        const usersData = data.success ? data.users : (data.users || []);
        // Show only first 2 users for dashboard preview
        setUsers(usersData.slice(0, 2));
      } else {
        console.warn('Company users API not available');
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching company users:', error);
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchFinancialStatus = async (companyId: string) => {
    try {
      setFinancialLoading(true);
      const response = await fetch(`/api/v1/companies/${companyId}/financial-status`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setFinancialStatus(result.data);
        } else {
          console.warn('Failed to fetch financial status:', result.error?.message);
          setFinancialStatus(null);
        }
      } else {
        console.warn('Financial status API not available');
        setFinancialStatus(null);
      }
    } catch (error) {
      console.error('Error fetching financial status:', error);
      setFinancialStatus(null);
    } finally {
      setFinancialLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(locale || 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getSelectedCompany = () => {
    return companies.find(company => company.id === selectedCompanyId);
  };

  const getStatementTypeLabel = (type: string) => {
    const typeLabels: Record<string, string> = {
      'income_statement': locale?.startsWith('es') ? 'Estado de Resultados' : 'Income Statement',
      'balance_sheet': locale?.startsWith('es') ? 'Balance General' : 'Balance Sheet',
      'cash_flow': locale?.startsWith('es') ? 'Flujo de Efectivo' : 'Cash Flow',
      'trial_balance': locale?.startsWith('es') ? 'Balanza de Comprobación' : 'Trial Balance'
    };
    return typeLabels[type] || type;
  };

  const getRoleLabel = (role: string) => {
    const roleLabels: Record<string, string> = {
      'company_admin': locale?.startsWith('es') ? 'Administrador' : 'Administrator',
      'user': locale?.startsWith('es') ? 'Usuario' : 'User',
      'viewer': locale?.startsWith('es') ? 'Solo Lectura' : 'Viewer'
    };
    return roleLabels[role] || role;
  };


  const quickActions = [
    {
      title: locale?.startsWith('es') ? 'Estado de Resultados (P&L)' : 'Profit & Loss Statement',
      description: locale?.startsWith('es') ? 'Análisis detallado de ingresos y gastos' : 'Detailed revenue and expense analysis',
      icon: DocumentTextIcon,
      action: () => {
        sessionStorage.setItem('selectedCompanyId', selectedCompanyId);
        router.push('/dashboard/company-admin/pnl');
      },
      color: 'emerald',
      requiresCompany: true
    },
    {
      title: locale?.startsWith('es') ? 'Flujo de Caja' : 'Cash Flow',
      description: locale?.startsWith('es') ? 'Análisis de entradas y salidas de efectivo' : 'Cash inflow and outflow analysis',
      icon: BanknotesIcon,
      action: () => {
        sessionStorage.setItem('selectedCompanyId', selectedCompanyId);
        router.push('/dashboard/company-admin/cashflow');
      },
      color: 'blue',
      requiresCompany: true
    },
    {
      title: locale?.startsWith('es') ? 'Subir y Crear Plantilla' : 'Upload & Create Template',
      description: locale?.startsWith('es') ? 'Procesar documento y crear plantilla de mapeo' : 'Process document and create mapping template',
      icon: CloudArrowUpIcon,
      action: () => {
        sessionStorage.setItem('selectedCompanyId', selectedCompanyId);
        router.push('/upload');
      },
      color: 'purple',
      requiresCompany: true
    }
  ];

  const statCards = [
    {
      title: locale?.startsWith('es') ? 'Usuarios' : 'Users',
      value: stats.totalUsers,
      icon: UserGroupIcon,
      color: 'blue'
    },
    {
      title: locale?.startsWith('es') ? 'Plantillas' : 'Templates',
      value: stats.totalTemplates,
      icon: DocumentDuplicateIcon,
      color: 'green'
    },
    {
      title: locale?.startsWith('es') ? 'Documentos' : 'Documents',
      value: stats.documentsThisMonth,
      icon: DocumentTextIcon,
      color: 'purple'
    },
    {
      title: locale?.startsWith('es') ? 'Períodos' : 'Periods',
      value: financialStatus?.totalPeriods || 0,
      icon: ChartBarIcon,
      color: 'orange'
    }
  ];

  const getStatementLabel = (type: string) => {
    const labels: Record<string, string> = {
      'profit_loss': locale?.startsWith('es') ? 'P&L' : 'P&L',
      'cash_flow': locale?.startsWith('es') ? 'Flujo de Efectivo' : 'Cash Flow',
      'balance_sheet': locale?.startsWith('es') ? 'Balance General' : 'Balance Sheet',
      'trial_balance': locale?.startsWith('es') ? 'Balanza' : 'Trial Balance'
    };
    return labels[type] || type;
  };

  const getStatementIcon = (type: string, available: boolean) => {
    return available ? '✓' : '⚠️';
  };

  const handleViewData = (statementId: string, statementType?: string) => {
    // Navigate to appropriate dashboard
    sessionStorage.setItem('selectedCompanyId', selectedCompanyId);
    
    // For P&L statements, use the new P&L dashboard with our improvements
    if (statementType === 'profit_loss') {
      router.push('/dashboard/company-admin/pnl');
    } else if (statementId) {
      router.push(`/dashboard/company-admin/financial/${statementId}/dashboard`);
    } else {
      router.push('/dashboard/company-admin/financial');
    }
  };

  const handleUploadNew = (statementType?: string) => {
    sessionStorage.setItem('selectedCompanyId', selectedCompanyId);
    if (statementType) {
      sessionStorage.setItem('preferredStatementType', statementType);
    }
    router.push('/upload');
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      purple: 'bg-purple-100 text-purple-600',
      orange: 'bg-orange-100 text-orange-600',
      gray: 'bg-gray-100 text-gray-600'
    };
    return colors[color] || colors.blue;
  };

  return (
    <AppLayout showFooter={true}>
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
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
                <Button
                  variant="primary"
                  leftIcon={<PlusIcon className="w-4 h-4" />}
                  onClick={() => router.push('/dashboard/platform-admin/companies/new')}
                >
                  {locale?.startsWith('es') ? 'Nueva Empresa' : 'New Company'}
                </Button>
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
                        {locale?.startsWith('es') ? 'Moneda' : 'Currency'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {locale?.startsWith('es') ? 'Estado' : 'Status'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {locale?.startsWith('es') ? 'Creada' : 'Created'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center">
                          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                          <p className="text-gray-500">
                            {locale?.startsWith('es') ? 'Cargando empresas...' : 'Loading companies...'}
                          </p>
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center">
                          <p className="text-red-500 mb-4">{error}</p>
                          <Button variant="outline" onClick={fetchCompanies}>
                            {locale?.startsWith('es') ? 'Reintentar' : 'Retry'}
                          </Button>
                        </td>
                      </tr>
                    ) : companies.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center">
                          <BuildingOfficeIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500">
                            {locale?.startsWith('es') 
                              ? 'No se encontraron empresas'
                              : 'No companies found'}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      companies.map((company) => (
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {company.baseCurrency || 'USD'}
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(company.createdAt)}
                          </td>
                        </tr>
                      ))
                    )}
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
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => {
                // Clear selection and go back to company list for org admins
                setSelectedCompanyId('');
                sessionStorage.removeItem('selectedCompanyId');
              }}
              className="mb-4"
            >
              ← {locale?.startsWith('es') ? 'Volver a empresas' : 'Back to companies'}
            </Button>
          </div>
        ) : null}

        {selectedCompanyId ? (
          <>
            {/* Compact Stats Row */}
            <div className="flex items-center space-x-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
              {statCards.map((stat, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${getColorClasses(stat.color)}`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{stat.title}</p>
                    {statsLoading ? (
                      <div className="h-5 bg-gray-200 rounded animate-pulse w-12 mt-0.5"></div>
                    ) : (
                      <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                    )}
                  </div>
                  {index < statCards.length - 1 && (
                    <div className="h-10 w-px bg-gray-200 ml-6" />
                  )}
                </div>
              ))}
            </div>


            {/* Management Sections - Financial Data First */}
            <div className="space-y-6">
              {/* Financial Data Overview Section - Moved to Top */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>
                        {locale?.startsWith('es') ? 'Datos Financieros' : 'Financial Data'}
                        {templates.length > 0 && (
                          <span className="ml-2 text-sm font-normal text-gray-500">
                            ({templates.length} {locale?.startsWith('es') ? 'plantillas' : 'templates'})
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {locale?.startsWith('es') 
                          ? 'Resumen de datos financieros disponibles'
                          : 'Overview of available financial data'}
                        {templates.length > 0 && templates[0].lastUsedAt && (
                          <span className="ml-2 text-xs">
                            • {locale?.startsWith('es') ? 'Última plantilla usada' : 'Last template used'}: {templates[0].templateName} ({new Date(templates[0].lastUsedAt).toLocaleDateString()})
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<CloudArrowUpIcon className="w-4 h-4" />}
                      onClick={() => handleUploadNew()}
                    >
                      {locale?.startsWith('es') ? 'Subir Documento' : 'Upload Document'}
                    </Button>
                  </div>
                </CardHeader>
                <CardBody>
                  {financialLoading ? (
                    <div className="text-center py-4">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <p className="text-sm text-gray-500 mt-2">
                        {locale?.startsWith('es') ? 'Cargando estado financiero...' : 'Loading financial status...'}
                      </p>
                    </div>
                  ) : !financialStatus || !financialStatus.hasData ? (
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
                        variant="gradient"
                        onClick={() => handleUploadNew()}
                        leftIcon={<CloudArrowUpIcon className="w-5 h-5" />}
                      >
                        {locale?.startsWith('es') ? 'Subir Primer Documento' : 'Upload First Document'}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Only show P&L and Cash Flow */}
                      {['profit_loss', 'cash_flow'].map((type) => {
                        const statement = financialStatus.statements[type as keyof typeof financialStatus.statements];
                        return (
                          <div key={type} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="flex items-center space-x-3">
                              <span className="text-xl">
                                {getStatementIcon(type, statement.available)}
                              </span>
                              <div>
                                <p className="font-medium">
                                  {getStatementLabel(type)}
                                  {statement.available && statement.coverage && (
                                    <span className="ml-2 text-sm text-gray-600">
                                      • {statement.coverage}
                                    </span>
                                  )}
                                </p>
                                {statement.available && statement.lastUpload && (
                                  <p className="text-xs text-gray-500">
                                    {locale?.startsWith('es') ? 'Último: ' : 'Last: '}
                                    {new Date(statement.lastUpload).toLocaleDateString(locale || 'en-US')}
                                  </p>
                                )}
                                {!statement.available && (
                                  <p className="text-xs text-gray-500">
                                    {locale?.startsWith('es') ? 'Sin datos' : 'No data available'}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {statement.available && statement.statementId && (
                                <Button
                                  variant="soft"
                                  size="sm"
                                  onClick={() => handleViewData(statement.statementId!, type)}
                                >
                                  {locale?.startsWith('es') ? 'Ver Datos' : 'View Data'}
                                </Button>
                              )}
                              <Button
                                variant={statement.available ? "outline" : "primary"}
                                size="sm"
                                onClick={() => handleUploadNew(type)}
                              >
                                {statement.available 
                                  ? (locale?.startsWith('es') ? 'Actualizar' : 'Update')
                                  : (locale?.startsWith('es') ? 'Subir' : 'Upload')
                                }
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                      
                      {financialStatus.lastActivity && (
                        <div className="text-center pt-4 border-t">
                          <p className="text-sm text-gray-500 mb-2">
                            {locale?.startsWith('es') ? 'Última actividad: ' : 'Last activity: '}
                            {new Date(financialStatus.lastActivity).toLocaleDateString(locale || 'en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                          <button
                            onClick={() => {
                              sessionStorage.setItem('selectedCompanyId', selectedCompanyId);
                              router.push('/dashboard/company-admin/financial');
                            }}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                          >
                            {locale?.startsWith('es') ? 'Ver todos los estados financieros →' : 'View all financial statements →'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* Users Section */}
              <Card id="users-section">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>
                        {locale?.startsWith('es') ? 'Usuarios' : 'Users'}
                      </CardTitle>
                      <CardDescription>
                        {locale?.startsWith('es') 
                          ? 'Gestiona los usuarios de tu empresa'
                          : 'Manage your company users'}
                      </CardDescription>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<PlusIcon className="w-4 h-4" />}
                      onClick={() => {
                        sessionStorage.setItem('selectedCompanyId', selectedCompanyId);
                        router.push('/dashboard/company-admin/users');
                      }}
                    >
                      {locale?.startsWith('es') ? 'Gestionar' : 'Manage'}
                    </Button>
                  </div>
                </CardHeader>
                <CardBody>
                  {usersLoading ? (
                    <div className="text-center py-4">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <p className="text-sm text-gray-500 mt-2">
                        {locale?.startsWith('es') ? 'Cargando usuarios...' : 'Loading users...'}
                      </p>
                    </div>
                  ) : users.length === 0 ? (
                    <div className="text-center py-4">
                      <UsersIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">
                        {locale?.startsWith('es') ? 'No hay usuarios asignados' : 'No users assigned'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {users.map((user) => (
                        <div key={user.id} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-sm text-gray-600">{user.email}</p>
                            <p className="text-xs text-gray-500">{getRoleLabel(user.companyRole)}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            user.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {user.isActive 
                              ? (locale?.startsWith('es') ? 'Activo' : 'Active')
                              : (locale?.startsWith('es') ? 'Inactivo' : 'Inactive')
                            }
                          </span>
                        </div>
                      ))}
                      {users.length >= 2 && (
                        <div className="text-center pt-2">
                          <button
                            onClick={() => {
                              sessionStorage.setItem('selectedCompanyId', selectedCompanyId);
                              router.push('/dashboard/company-admin/users');
                            }}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            {locale?.startsWith('es') ? 'Ver todos los usuarios' : 'View all users'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* Templates Section */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>
                        {locale?.startsWith('es') ? 'Plantillas' : 'Templates'}
                      </CardTitle>
                      <CardDescription>
                        {locale?.startsWith('es') 
                          ? 'Plantillas de mapeo disponibles'
                          : 'Available mapping templates'}
                      </CardDescription>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<PlusIcon className="w-4 h-4" />}
                      onClick={() => {
                        sessionStorage.setItem('selectedCompanyId', selectedCompanyId);
                        router.push('/dashboard/company-admin/templates');
                      }}
                    >
                      {locale?.startsWith('es') ? 'Gestionar' : 'Manage'}
                    </Button>
                  </div>
                </CardHeader>
                <CardBody>
                  {templatesLoading ? (
                    <div className="text-center py-4">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <p className="text-sm text-gray-500 mt-2">
                        {locale?.startsWith('es') ? 'Cargando plantillas...' : 'Loading templates...'}
                      </p>
                    </div>
                  ) : templates.length === 0 ? (
                    <div className="text-center py-4">
                      <DocumentDuplicateIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">
                        {locale?.startsWith('es') ? 'No hay plantillas creadas' : 'No templates created'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {templates.map((template, index) => (
                        <div key={template.id} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{template.templateName}</p>
                            <p className="text-sm text-gray-600">
                              {locale?.startsWith('es') ? 'Usado' : 'Used'} {template.usageCount} {template.usageCount === 1 ? (locale?.startsWith('es') ? 'vez' : 'time') : (locale?.startsWith('es') ? 'veces' : 'times')}
                            </p>
                          </div>
                          {template.isDefault && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                              {locale?.startsWith('es') ? 'Predeterminada' : 'Default'}
                            </span>
                          )}
                        </div>
                      ))}
                      {templates.length === 3 && (
                        <div className="text-center pt-2">
                          <button
                            onClick={() => {
                              sessionStorage.setItem('selectedCompanyId', selectedCompanyId);
                              router.push('/dashboard/company-admin/templates');
                            }}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            {locale?.startsWith('es') ? 'Ver todas las plantillas' : 'View all templates'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </CardBody>
              </Card>

            </div>
          </>
        ) : (
          <Card>
            <CardBody className="text-center py-12">
              <BuildingOfficeIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {locale?.startsWith('es') 
                  ? 'Selecciona una empresa'
                  : 'Select a company'}
              </h3>
              <p className="text-gray-600">
                {locale?.startsWith('es') 
                  ? 'Elige una empresa para ver su información y gestionar sus recursos'
                  : 'Choose a company to view its information and manage its resources'}
              </p>
            </CardBody>
          </Card>
        )}
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