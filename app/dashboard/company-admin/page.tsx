"use client";

import { useState, useEffect, useRef } from 'react';
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
  BanknotesIcon,
  TrashIcon,
  ChatBubbleBottomCenterTextIcon,
  WrenchScrewdriverIcon,
  DocumentChartBarIcon,
  ChevronDownIcon,
  ArrowDownTrayIcon,
  DocumentArrowDownIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { ROLES } from '@/lib/auth/rbac';
import { validatePeriods, getPeriodValidationStatus } from '@/lib/utils/period-validation';
import { DetectedPeriod } from '@/lib/utils/period-detection';

interface Company {
  id: string;
  name: string;
  taxId?: string;
  industry?: string;
  locale?: string;
  baseCurrency?: string;
  cashflowDirectMode?: boolean;
  isActive: boolean;
  organizationId: string;
  createdAt: Date;
}

// Helper functions for dashboard data
function formatPeriodRange(statements: any[], locale?: string): string {
  if (!statements || statements.length === 0) return '';
  
  const sortedStatements = [...statements].sort((a, b) => 
    new Date(a.periodStart || a.periodEnd).getTime() - new Date(b.periodStart || b.periodEnd).getTime()
  );
  
  const firstPeriod = sortedStatements[0];
  const lastPeriod = sortedStatements[sortedStatements.length - 1];
  
  const startDate = new Date(firstPeriod.periodStart || firstPeriod.periodEnd);
  const endDate = new Date(lastPeriod.periodEnd);
  
  const formatOptions: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric' };
  
  return `${startDate.toLocaleDateString(locale || 'es-MX', formatOptions)} - ${endDate.toLocaleDateString(locale || 'es-MX', formatOptions)}`;
}

function formatLastUpload(statements: any[], locale?: string): string {
  if (!statements || statements.length === 0) return '';
  
  const latestStatement = statements.reduce((latest, current) => {
    const latestDate = new Date(latest.updatedAt || latest.createdAt);
    const currentDate = new Date(current.updatedAt || current.createdAt);
    return currentDate > latestDate ? current : latest;
  });
  
  const uploadDate = new Date(latestStatement.updatedAt || latestStatement.createdAt);
  return uploadDate.toLocaleDateString(locale || 'es-MX', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  });
}

async function getTemplateName(statements: any[], companyId: string): Promise<string> {
  if (!statements || statements.length === 0) return 'Configuration-based Template';
  
  try {
    // Check for configuration-based templates
    const response = await fetch(`/api/configurations?companyId=${companyId}`);
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data?.length > 0) {
        // Find the most recently created active configuration
        const configurations = data.data.filter((c: any) => c.isActive);
        if (configurations.length > 0) {
          const mostRecent = configurations.reduce((latest: any, current: any) => {
            if (!latest) return current;
            const latestDate = new Date(latest.createdAt);
            const currentDate = new Date(current.createdAt);
            return currentDate > latestDate ? current : latest;
          });
          
          return mostRecent.name || 'Configuration-based Template';
        }
      }
    }
  } catch (error) {
    console.warn('Could not fetch configuration information:', error);
  }
  
  return 'Configuration-based Template';
}

function CompanyAdminDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { locale } = useLocale();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [pnlStatements, setPnlStatements] = useState<any[]>([]);
  const [cashFlowStatements, setCashFlowStatements] = useState<any[]>([]);
  const [loadingStatements, setLoadingStatements] = useState(false);
  const [pnlTemplateName, setPnlTemplateName] = useState('Standard Template v1.0');
  const [cashFlowTemplateName, setCashFlowTemplateName] = useState('Standard Template v1.0');
  const [pnlTemplates, setPnlTemplates] = useState<any[]>([]);
  const [cashFlowTemplates, setCashFlowTemplates] = useState<any[]>([]);
  const [configurations, setConfigurations] = useState<any[]>([]);
  const [configurationsLoading, setConfigurationsLoading] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

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

  // Handle click outside for actions menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setShowActionsMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchFinancialStatements(selectedCompanyId);
      fetchTemplates(selectedCompanyId);
      fetchConfigurations(selectedCompanyId);
      
      // If company is selected and we have the companies list, store the company name
      const company = companies.find(c => c.id === selectedCompanyId);
      if (company) {
        sessionStorage.setItem('selectedCompanyName', company.name);
      }
    }
  }, [selectedCompanyId, companies]);

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/companies');
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

  const fetchTemplates = async (companyId: string) => {
    try {
      console.log('Fetching configurations for company:', companyId);
      const response = await fetch(`/api/configurations?companyId=${companyId}`);
      console.log('Configurations response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Configurations data:', data);
        
        if (data.success && Array.isArray(data.data)) {
          // Transform configurations to template format for display compatibility
          const configTemplates = data.data.map((config: any) => ({
            id: config.id,
            templateName: config.name,
            statementType: config.type, // 'pnl' or 'cashflow'
            createdAt: config.createdAt,
            periodStart: null, // Configurations don't have fixed periods
            periodEnd: null,
            isActive: config.isActive
          }));
          
          // Separate by type
          const pnl = configTemplates.filter((t: any) => t.statementType === 'pnl');
          const cashFlow = configTemplates.filter((t: any) => t.statementType === 'cashflow');
          
          console.log('P&L configurations:', pnl.length);
          console.log('Cash Flow configurations:', cashFlow.length);
          setPnlTemplates(pnl);
          setCashFlowTemplates(cashFlow);
        }
      } else {
        console.error('Failed to fetch configurations:', response.statusText);
        // Set empty arrays if no configurations found
        setPnlTemplates([]);
        setCashFlowTemplates([]);
      }
    } catch (error) {
      console.error('Error fetching configurations:', error);
      setPnlTemplates([]);
      setCashFlowTemplates([]);
    }
  };

  const fetchFinancialStatements = async (companyId: string) => {
    console.log('Fetching financial statements for company:', companyId);
    setLoadingStatements(true);
    try {
      // Check for active configurations (Live API approach)
      const response = await fetch(`/api/configurations?companyId=${companyId}`);
      console.log('Response status:', response.status);
      console.log('Response URL:', response.url);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Active configurations:', result);
        
        if (result.success && Array.isArray(result.data)) {
          const configurations = result.data;
          // Find active configurations for each type
          const activePnlConfigs = configurations.filter((config: any) => 
            config.type === 'pnl' && config.isActive
          );
          const activeCashFlowConfigs = configurations.filter((config: any) => 
            config.type === 'cashflow' && config.isActive
          );
          
          // Transform configurations to match expected format
          const pnlData = activePnlConfigs.map((config: any) => ({
            id: `live-pnl-${config.id}`,
            statementType: 'pnl',
            periodEnd: new Date().toISOString().split('T')[0],
            createdAt: config.createdAt,
            updatedAt: config.updatedAt,
            processingMethod: 'live-api'
          }));
            
          const cashFlowData = activeCashFlowConfigs.map((config: any) => ({
            id: `live-cashflow-${config.id}`,
            statementType: 'cashflow',
            periodEnd: new Date().toISOString().split('T')[0],
            createdAt: config.createdAt,
            updatedAt: config.updatedAt,
            processingMethod: 'live-api'
          }));
          
          setPnlStatements(pnlData);
          setCashFlowStatements(cashFlowData);
          console.log('Set P&L statements:', pnlData.length, 'records (from live configurations)');
          console.log('Set Cash Flow statements:', cashFlowData.length, 'records (from live configurations)');
          
          // Set template names for configuration-based data
          if (pnlData.length > 0) {
            setPnlTemplateName('Live P&L Configuration');
          }
          if (cashFlowData.length > 0) {
            setCashFlowTemplateName('Live Cash Flow Configuration');
          }
        } else {
          console.log('No active configurations found for this company');
          setPnlStatements([]);
          setCashFlowStatements([]);
        }
      } else {
        console.log('Failed to fetch configurations:', response.status);
        setPnlStatements([]);
        setCashFlowStatements([]);
      }
    } catch (error) {
      console.error('Error fetching configurations:', error);
      setPnlStatements([]);
      setCashFlowStatements([]);
    } finally {
      setLoadingStatements(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm(locale?.startsWith('es') ? '¿Estás seguro de eliminar esta configuración?' : 'Are you sure you want to delete this configuration?')) {
      return;
    }

    try {
      const response = await fetch(`/api/configurations/${templateId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh templates/configurations list
        fetchTemplates(selectedCompanyId);
      } else {
        alert(locale?.startsWith('es') ? 'Error al eliminar configuración' : 'Failed to delete configuration');
      }
    } catch (error) {
      alert(locale?.startsWith('es') ? 'Error de red' : 'Network error');
    }
  };

  const fetchConfigurations = async (companyId: string) => {
    try {
      setConfigurationsLoading(true);
      const response = await fetch(`/api/configurations?companyId=${companyId}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setConfigurations(data.data);
        }
      } else {
        console.error('Failed to fetch configurations:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching configurations:', error);
    } finally {
      setConfigurationsLoading(false);
    }
  };

  const formatTemplatePeriodRange = (template: any) => {
    if (!template.periodStart || !template.periodEnd) return '';
    
    try {
      const start = new Date(template.periodStart);
      const end = new Date(template.periodEnd);
      const options: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric' };
      
      return `${start.toLocaleDateString(locale || 'es-MX', options)} - ${end.toLocaleDateString(locale || 'es-MX', options)}`;
    } catch (e) {
      return '';
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
                          onClick={() => {
                            setSelectedCompanyId(company.id);
                            sessionStorage.setItem('selectedCompanyName', company.name);
                          }}
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
                  sessionStorage.removeItem('selectedCompanyName');
                }}
                className="mb-2"
              >
                ← {locale?.startsWith('es') ? 'Volver a empresas' : 'Back to companies'}
              </Button>
            </div>
          ) : null}

          {selectedCompanyId ? (
            <div className="space-y-6">
              {loadingStatements ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Company Header with Status and AI Chat */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Company Context Header - Left Half */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center space-x-4">
                        <BuildingOfficeIcon className="w-6 h-6 text-blue-600" />
                        <div>
                          <h2 className="text-lg font-semibold text-gray-900">
                            {getSelectedCompany()?.name}
                          </h2>
                          <p className="text-sm text-gray-600">
                            {getSelectedCompany()?.industry || locale?.startsWith('es') ? 'Sin industria' : 'No industry'} • 
                            {locale?.startsWith('es') ? 'Última actualización:' : 'Last updated:'} {formatLastUpload(pnlStatements.concat(cashFlowStatements), locale) || locale?.startsWith('es') ? 'Sin datos' : 'No data'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Status and AI Chat - Right Half */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between h-full">
                        {/* P&L Status */}
                        <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                          pnlStatements.length > 0 ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'
                        }`}>
                          <ChartBarIcon className={`w-5 h-5 ${pnlStatements.length > 0 ? 'text-blue-600' : 'text-gray-400'}`} />
                          <span className="font-medium text-sm">P&L</span>
                          <span className={`text-xs font-semibold ${pnlStatements.length > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                            {pnlStatements.length > 0 ? '✓' : '−'}
                          </span>
                        </div>

                        {/* Cash Flow Status */}
                        <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                          (cashFlowStatements.length > 0 || getSelectedCompany()?.cashflowDirectMode) ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
                        }`}>
                          <BanknotesIcon className={`w-5 h-5 ${(cashFlowStatements.length > 0 || getSelectedCompany()?.cashflowDirectMode) ? 'text-green-600' : 'text-gray-400'}`} />
                          <span className="font-medium text-sm">CF</span>
                          <span className={`text-xs font-semibold ${(cashFlowStatements.length > 0 || getSelectedCompany()?.cashflowDirectMode) ? 'text-green-600' : 'text-gray-400'}`}>
                            {(cashFlowStatements.length > 0 || getSelectedCompany()?.cashflowDirectMode) ? '✓' : '−'}
                          </span>
                        </div>

                        {/* AI Chat Button */}
                        <Button
                          variant="primary"
                          onClick={() => {
                            sessionStorage.setItem('selectedCompanyId', selectedCompanyId);
                            router.push('/dashboard/company-admin/financial-chat');
                          }}
                          leftIcon={<ChatBubbleBottomCenterTextIcon className="w-4 h-4" />}
                          disabled={pnlStatements.length === 0 && cashFlowStatements.length === 0 && !getSelectedCompany()?.cashflowDirectMode}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          ✨ {locale?.startsWith('es') ? 'AI Chat' : 'AI Chat'}
                        </Button>
                      </div>
                    </div>
                  </div>


                  {/* Primary Action Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* P&L Dashboard */}
                    <Button
                      variant={pnlStatements.length > 0 ? "primary" : "secondary"}
                      onClick={() => {
                        sessionStorage.setItem('selectedCompanyId', selectedCompanyId);
                        router.push('/dashboard/company-admin/pnl');
                      }}
                      disabled={pnlStatements.length === 0}
                      className={`h-20 flex flex-col justify-center ${
                        pnlStatements.length > 0 
                          ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                          : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <ChartBarIcon className="w-6 h-6 mb-1" />
                      <span className="text-sm font-medium">
                        {locale?.startsWith('es') ? 'Ver P&L' : 'View P&L'}
                      </span>
                    </Button>

                    {/* Cash Flow Dashboard */}
                    <Button
                      variant={(cashFlowStatements.length > 0 || getSelectedCompany()?.cashflowDirectMode) ? "primary" : "secondary"}
                      onClick={() => {
                        sessionStorage.setItem('selectedCompanyId', selectedCompanyId);
                        router.push('/dashboard/company-admin/cashflow');
                      }}
                      disabled={cashFlowStatements.length === 0 && !getSelectedCompany()?.cashflowDirectMode}
                      className={`h-20 flex flex-col justify-center ${
                        (cashFlowStatements.length > 0 || getSelectedCompany()?.cashflowDirectMode)
                          ? 'bg-green-600 hover:bg-green-700 text-white' 
                          : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <BanknotesIcon className="w-6 h-6 mb-1" />
                      <span className="text-sm font-medium">
                        {locale?.startsWith('es') ? 'Ver Cash Flow' : 'View Cash Flow'}
                      </span>
                    </Button>

                    {/* Configurations */}
                    <Button
                      variant="secondary"
                      onClick={() => {
                        sessionStorage.setItem('selectedCompanyId', selectedCompanyId);
                        router.push('/dashboard/company-admin/configurations');
                      }}
                      className="h-20 flex flex-col justify-center bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                    >
                      <CogIcon className="w-6 h-6 mb-1" />
                      <span className="text-sm font-medium">
                        {locale?.startsWith('es') ? 'Configuraciones' : 'Configurations'}
                      </span>
                    </Button>

                    {/* Upload Data */}
                    <Button
                      variant="secondary"
                      onClick={() => {
                        sessionStorage.setItem('selectedCompanyId', selectedCompanyId);
                        router.push('/dashboard/company-admin/upload-data');
                      }}
                      className="h-20 flex flex-col justify-center bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
                    >
                      <CloudArrowUpIcon className="w-6 h-6 mb-1" />
                      <span className="text-sm font-medium">
                        {locale?.startsWith('es') ? 'Subir Datos' : 'Upload Data'}
                      </span>
                    </Button>
                  </div>

                  {/* Configuration Summary */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <CogIcon className="w-6 h-6 text-purple-600" />
                        <div>
                          <h3 className="text-base font-semibold text-gray-900">
                            {locale?.startsWith('es') ? 'Configuraciones Activas' : 'Active Configurations'}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {configurations.length} {locale?.startsWith('es') ? 'configuraciones totales,' : 'total configurations,'} {configurations.filter(c => c.isActive).length} {locale?.startsWith('es') ? 'activas' : 'active'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-6">
                        {/* P&L Config Count */}
                        <div className="text-center">
                          <div className="text-lg font-semibold text-blue-600">
                            {configurations.filter(c => c.type === 'pnl').length}
                          </div>
                          <div className="text-xs text-gray-500">P&L</div>
                        </div>
                        
                        {/* Cash Flow Config Count */}
                        <div className="text-center">
                          <div className="text-lg font-semibold text-green-600">
                            {configurations.filter(c => c.type === 'cashflow').length}
                          </div>
                          <div className="text-xs text-gray-500">CF</div>
                        </div>
                        
                        {/* New Configuration Button */}
                        <Button
                          variant="secondary"
                          onClick={() => {
                            sessionStorage.setItem('selectedCompanyId', selectedCompanyId);
                            router.push('/dashboard/company-admin/configurations/new');
                          }}
                          leftIcon={<PlusIcon className="w-4 h-4" />}
                          className="text-purple-700 border-purple-200 hover:bg-purple-50"
                        >
                          {locale?.startsWith('es') ? 'Nueva' : 'New'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
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