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
  BanknotesIcon,
  TrashIcon,
  ChatBubbleBottomCenterTextIcon
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
  if (!statements || statements.length === 0) return 'Standard Template v1.0';
  
  try {
    // Get the most recent statement to check for template information
    const latestStatement = statements.reduce((latest, current) => {
      const latestDate = new Date(latest.updatedAt || latest.createdAt);
      const currentDate = new Date(current.updatedAt || current.createdAt);
      return currentDate > latestDate ? current : latest;
    });

    // Try to get template information from mapping templates
    const response = await fetch(`/api/v1/templates?companyId=${companyId}`);
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data?.length > 0) {
        // Find the most recently used template or default template
        const templates = data.data;
        const defaultTemplate = templates.find((t: any) => t.isDefault);
        const mostRecentTemplate = templates.reduce((latest: any, current: any) => {
          if (!latest) return current;
          const latestDate = new Date(latest.lastUsedAt || latest.createdAt);
          const currentDate = new Date(current.lastUsedAt || current.createdAt);
          return currentDate > latestDate ? current : latest;
        });
        
        const template = mostRecentTemplate || defaultTemplate || templates[0];
        return template.templateName || 'Standard Template v1.0';
      }
    }
  } catch (error) {
    console.warn('Could not fetch template information:', error);
  }
  
  return 'Standard Template v1.0';
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
      fetchTemplates(selectedCompanyId);
      
      // If company is selected and we have the companies list, store the company name
      const company = companies.find(c => c.id === selectedCompanyId);
      if (company) {
        sessionStorage.setItem('selectedCompanyName', company.name);
      }
    }
  }, [selectedCompanyId, companies]);

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

  const fetchTemplates = async (companyId: string) => {
    try {
      console.log('Fetching templates for company:', companyId);
      const response = await fetch(`/api/v1/templates?companyId=${companyId}`);
      console.log('Templates response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Templates data:', data);
        
        if (data.success && Array.isArray(data.data)) {
          // Separate templates by type
          const pnl = data.data.filter((t: any) => 
            t.statementType === 'profit_loss' || t.statementType === 'pnl' || t.statementType === 'income_statement'
          );
          const cashFlow = data.data.filter((t: any) => 
            t.statementType === 'cash_flow' || t.statementType === 'cashflow'
          );
          console.log('P&L templates:', pnl.length);
          console.log('Cash Flow templates:', cashFlow.length);
          setPnlTemplates(pnl);
          setCashFlowTemplates(cashFlow);
        }
      } else {
        console.error('Failed to fetch templates:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchFinancialStatements = async (companyId: string) => {
    console.log('Fetching financial statements for company:', companyId);
    setLoadingStatements(true);
    try {
      const response = await fetch(`/api/v1/companies/${companyId}/statements`);
      console.log('Response status:', response.status);
      console.log('Response URL:', response.url);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Financial statements data:', data);
        console.log('Data structure check:');
        console.log('- data.success:', data.success);
        console.log('- data.data:', data.data);
        console.log('- data.data?.statements:', data.data?.statements);
        console.log('- Array.isArray(data.data?.statements):', Array.isArray(data.data?.statements));
        
        if (data.success && data.data?.statements && Array.isArray(data.data.statements)) {
          // Sort statements by periodEnd in descending order (newest first)
          const sortedStatements = data.data.statements.sort((a: any, b: any) => {
            return new Date(b.periodEnd).getTime() - new Date(a.periodEnd).getTime();
          });
          
          // Separate P&L and Cash Flow statements
          const pnlData = sortedStatements.filter((stmt: any) => 
            stmt.statementType === 'profit_loss' || stmt.statementType === 'pnl' || !stmt.statementType
          );
          const cashFlowData = sortedStatements.filter((stmt: any) => 
            stmt.statementType === 'cash_flow' || stmt.statementType === 'cashflow'
          );
          
          setPnlStatements(pnlData);
          setCashFlowStatements(cashFlowData);
          console.log('Set P&L statements:', pnlData.length, 'records');
          console.log('Set Cash Flow statements:', cashFlowData.length, 'records');
          
          // Load template names for each statement type
          if (pnlData.length > 0) {
            getTemplateName(pnlData, companyId).then(setPnlTemplateName);
          }
          if (cashFlowData.length > 0) {
            getTemplateName(cashFlowData, companyId).then(setCashFlowTemplateName);
          }
        } else if (Array.isArray(data.data)) {
          // Fallback for flat array response - assume P&L for backward compatibility
          const sortedStatements = data.data.sort((a: any, b: any) => {
            return new Date(b.periodEnd || b.createdAt).getTime() - new Date(a.periodEnd || a.createdAt).getTime();
          });
          setPnlStatements(sortedStatements);
          setCashFlowStatements([]);
        } else {
          console.warn('Unexpected data structure:', data);
          console.log('data.data structure:', data.data);
          console.log('typeof data.data:', typeof data.data);
          console.log('data keys:', Object.keys(data));
          if (data.data) {
            console.log('data.data keys:', Object.keys(data.data));
          }
          setPnlStatements([]);
          setCashFlowStatements([]);
        }
      } else {
        console.error('API response not OK. Status:', response.status, response.statusText);
        try {
          const errorData = await response.json();
          console.error('API error data:', errorData);
        } catch (e) {
          console.error('Could not parse error response as JSON');
          const errorText = await response.text();
          console.error('Error response text:', errorText);
        }
      }
    } catch (error) {
      console.error('Error fetching financial statements:', error);
    } finally {
      setLoadingStatements(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm(locale?.startsWith('es') ? '¿Estás seguro de eliminar esta plantilla?' : 'Are you sure you want to delete this template?')) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/templates/${templateId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh templates list
        fetchTemplates(selectedCompanyId);
      } else {
        alert(locale?.startsWith('es') ? 'Error al eliminar plantilla' : 'Failed to delete template');
      }
    } catch (error) {
      alert(locale?.startsWith('es') ? 'Error de red' : 'Network error');
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
                <div className="space-y-6">
                  {/* AI Financial Chat Card - Compact with aligned cards */}
                  <Card className="border-2 border-purple-100 bg-gradient-to-r from-purple-50 to-indigo-50">
                    <CardBody className="p-3">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <ChatBubbleBottomCenterTextIcon className="w-6 h-6 text-purple-600 mr-2" />
                          <div>
                            <h3 className="text-xl font-semibold text-gray-900">
                              {locale?.startsWith('es') ? 'Chat Financiero con IA' : 'AI Financial Chat'}
                            </h3>
                            <p className="text-xs text-gray-600 mt-1">
                              {formatPeriodRange(pnlStatements.concat(cashFlowStatements), locale) || 
                                (locale?.startsWith('es') ? 'Sin datos cargados' : 'No data loaded')}
                            </p>
                          </div>
                        </div>
                        
                        {/* Right-aligned P&L and CF Cards + Periods + GPT Badge */}
                        <div className="flex items-center space-x-3">
                          {/* Periods Available */}
                          {(pnlStatements.length > 0 || cashFlowStatements.length > 0) && (
                            <div className="bg-white px-3 py-1 rounded-lg border border-purple-200">
                              <div className="text-xs text-gray-600">
                                <div className="font-medium text-purple-600">
                                  {pnlStatements.length + cashFlowStatements.length} {locale?.startsWith('es') ? 'períodos' : 'periods'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {locale?.startsWith('es') ? 'disponibles' : 'available'}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* P&L Card */}
                          <div className={`bg-white px-3 py-2 rounded-lg border-2 transition-colors ${
                            pnlStatements.length > 0 ? 'border-blue-200 bg-blue-50/50' : 'border-gray-200'
                          }`}>
                            <div className="flex items-center space-x-2">
                              <ChartBarIcon className={`w-4 h-4 ${
                                pnlStatements.length > 0 ? 'text-blue-600' : 'text-gray-400'
                              }`} />
                              <span className="font-semibold text-sm text-gray-900">P&L</span>
                              <span className={`text-sm font-bold ${
                                pnlStatements.length > 0 ? 'text-green-600' : 'text-gray-400'
                              }`}>
                                {pnlStatements.length > 0 ? '✓' : '-'}
                              </span>
                            </div>
                          </div>

                          {/* Cash Flow Card */}
                          <div className={`bg-white px-3 py-2 rounded-lg border-2 transition-colors ${
                            cashFlowStatements.length > 0 ? 'border-green-200 bg-green-50/50' : 'border-gray-200'
                          }`}>
                            <div className="flex items-center space-x-2">
                              <BanknotesIcon className={`w-4 h-4 ${
                                cashFlowStatements.length > 0 ? 'text-green-600' : 'text-gray-400'
                              }`} />
                              <span className="font-semibold text-sm text-gray-900">CF</span>
                              <span className={`text-sm font-bold ${
                                cashFlowStatements.length > 0 ? 'text-green-600' : 'text-gray-400'
                              }`}>
                                {cashFlowStatements.length > 0 ? '✓' : '-'}
                              </span>
                            </div>
                          </div>

                          {/* GPT Badge */}
                          <span className={`text-sm px-3 py-2 rounded-lg font-medium ${(pnlStatements.length > 0 || cashFlowStatements.length > 0) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            GPT-4o
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-3 items-center">
                        <Button
                          variant="primary"
                          onClick={() => {
                            sessionStorage.setItem('selectedCompanyId', selectedCompanyId);
                            router.push('/dashboard/company-admin/financial-chat');
                          }}
                          leftIcon={<ChatBubbleBottomCenterTextIcon className="w-4 h-4" />}
                          className="bg-purple-600 hover:bg-purple-700 px-4 py-2"
                          disabled={pnlStatements.length === 0 && cashFlowStatements.length === 0}
                        >
                          {locale?.startsWith('es') ? 'Abrir Chat IA' : 'Open AI Chat'}
                        </Button>
                        <div className="flex-1">
                          {(pnlStatements.length === 0 && cashFlowStatements.length === 0) ? (
                            <p className="text-xs text-gray-500">
                              {locale?.startsWith('es') 
                                ? 'Sube datos financieros para habilitar el chat'
                                : 'Upload financial data to enable chat'}
                            </p>
                          ) : (
                            <p className="text-xs text-gray-600">
                              {locale?.startsWith('es') 
                                ? 'Pregunta sobre ingresos, gastos, tendencias y análisis'
                                : 'Ask about revenue, expenses, trends and analysis'}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardBody>
                  </Card>

                  {/* P&L and Cash Flow Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* P&L Column */}
                  <div className="space-y-4">
                    {/* P&L Dashboard Card */}
                    <Card className="border-2 border-blue-100">
                    <CardBody className="p-6">
                      <div className="flex items-center mb-4">
                        <ChartBarIcon className="w-8 h-8 text-blue-600 mr-3" />
                        <h3 className="text-xl font-semibold text-gray-900">
                          {locale?.startsWith('es') ? 'Dashboard P&L' : 'P&L Dashboard'}
                        </h3>
                      </div>
                      
                      {pnlStatements.length > 0 ? (
                        <div className="space-y-4">
                          <div className="border-l-4 border-blue-500 pl-4 space-y-2">
                            <div className="text-sm text-gray-600">
                              <strong>{locale?.startsWith('es') ? 'Última subida:' : 'Last upload:'}</strong> {formatLastUpload(pnlStatements, locale)}
                            </div>
                            <div className="text-sm text-gray-600">
                              <strong>{locale?.startsWith('es') ? 'Período:' : 'Period:'}</strong> {formatPeriodRange(pnlStatements)}
                            </div>
                            <div className="text-sm text-gray-600">
                              <strong>{locale?.startsWith('es') ? 'Plantilla:' : 'Template:'}</strong> {pnlTemplateName}
                            </div>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row gap-3">
                            <Button
                              variant="primary"
                              onClick={() => {
                                sessionStorage.setItem('selectedCompanyId', selectedCompanyId);
                                router.push('/dashboard/company-admin/pnl');
                              }}
                              leftIcon={<ChartBarIcon className="w-4 h-4" />}
                              className="flex-1"
                            >
                              {locale?.startsWith('es') ? 'Ver Dashboard' : 'See Dashboard'}
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => {
                                sessionStorage.setItem('selectedCompanyId', selectedCompanyId);
                                router.push('/upload');
                              }}
                              leftIcon={<CloudArrowUpIcon className="w-4 h-4" />}
                              className="flex-1"
                            >
                              {locale?.startsWith('es') ? 'Subir Nuevos Datos' : 'Upload New Data'}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <div className="text-gray-500 mb-4">
                            {locale?.startsWith('es') ? 'No hay datos subidos aún' : 'No data uploaded yet'}
                          </div>
                          <Button
                            variant="primary"
                            onClick={() => {
                              sessionStorage.setItem('selectedCompanyId', selectedCompanyId);
                              router.push('/upload');
                            }}
                            leftIcon={<CloudArrowUpIcon className="w-4 h-4" />}
                          >
                            {locale?.startsWith('es') ? 'Subir Datos' : 'Upload Data'}
                          </Button>
                        </div>
                      )}
                    </CardBody>
                  </Card>

                  {/* P&L Templates List */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      {locale?.startsWith('es') ? 'Plantillas P&L:' : 'P&L Templates:'}
                    </h4>
                    {pnlTemplates.length > 0 ? (
                      pnlTemplates.map((template) => (
                        <Card key={template.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                          <CardBody className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{template.templateName}</p>
                                <div className="flex items-center gap-3 text-xs text-gray-600 mt-1">
                                  <span>{locale?.startsWith('es') ? 'Creada:' : 'Created:'} {new Date(template.createdAt).toLocaleDateString(locale || 'es-MX', { month: 'short', day: 'numeric' })}</span>
                                  {template.periodStart && template.periodEnd && (
                                    <span>{locale?.startsWith('es') ? 'Período:' : 'Period:'} {formatTemplatePeriodRange(template)}</span>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteTemplate(template.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardBody>
                        </Card>
                      ))
                    ) : (
                      <Card className="border border-gray-200">
                        <CardBody className="p-3 text-center">
                          <p className="text-sm text-gray-500">
                            {locale?.startsWith('es') ? 'No hay plantillas P&L guardadas' : 'No P&L templates saved'}
                          </p>
                        </CardBody>
                      </Card>
                    )}
                  </div>
                </div>

                {/* Cash Flow Column */}
                <div className="space-y-4">
                  {/* Cash Flow Dashboard Card */}
                  <Card className="border-2 border-green-100">
                    <CardBody className="p-6">
                      <div className="flex items-center mb-4">
                        <BanknotesIcon className="w-8 h-8 text-green-600 mr-3" />
                        <h3 className="text-xl font-semibold text-gray-900">
                          {locale?.startsWith('es') ? 'Dashboard Cash Flow' : 'Cash Flow Dashboard'}
                        </h3>
                      </div>
                      
                      {cashFlowStatements.length > 0 ? (
                        <div className="space-y-4">
                          <div className="border-l-4 border-green-500 pl-4 space-y-2">
                            <div className="text-sm text-gray-600">
                              <strong>{locale?.startsWith('es') ? 'Última subida:' : 'Last upload:'}</strong> {formatLastUpload(cashFlowStatements, locale)}
                            </div>
                            <div className="text-sm text-gray-600">
                              <strong>{locale?.startsWith('es') ? 'Período:' : 'Period:'}</strong> {formatPeriodRange(cashFlowStatements)}
                            </div>
                            <div className="text-sm text-gray-600">
                              <strong>{locale?.startsWith('es') ? 'Plantilla:' : 'Template:'}</strong> {cashFlowTemplateName}
                            </div>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row gap-3">
                            <Button
                              variant="primary"
                              onClick={() => {
                                sessionStorage.setItem('selectedCompanyId', selectedCompanyId);
                                router.push('/dashboard/company-admin/cashflow');
                              }}
                              leftIcon={<BanknotesIcon className="w-4 h-4" />}
                              className="flex-1"
                            >
                              {locale?.startsWith('es') ? 'Ver Dashboard' : 'See Dashboard'}
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => {
                                sessionStorage.setItem('selectedCompanyId', selectedCompanyId);
                                router.push('/upload');
                              }}
                              leftIcon={<CloudArrowUpIcon className="w-4 h-4" />}
                              className="flex-1"
                            >
                              {locale?.startsWith('es') ? 'Subir Nuevos Datos' : 'Upload New Data'}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <div className="text-gray-500 mb-4">
                            {locale?.startsWith('es') ? 'No hay datos subidos aún' : 'No data uploaded yet'}
                          </div>
                          <Button
                            variant="primary"
                            onClick={() => {
                              sessionStorage.setItem('selectedCompanyId', selectedCompanyId);
                              router.push('/upload');
                            }}
                            leftIcon={<CloudArrowUpIcon className="w-4 h-4" />}
                          >
                            {locale?.startsWith('es') ? 'Subir Datos' : 'Upload Data'}
                          </Button>
                        </div>
                      )}
                    </CardBody>
                  </Card>

                  {/* Cash Flow Templates List */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      {locale?.startsWith('es') ? 'Plantillas Cash Flow:' : 'Cash Flow Templates:'}
                    </h4>
                    {cashFlowTemplates.length > 0 ? (
                      cashFlowTemplates.map((template) => (
                        <Card key={template.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                          <CardBody className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{template.templateName}</p>
                                <div className="flex items-center gap-3 text-xs text-gray-600 mt-1">
                                  <span>{locale?.startsWith('es') ? 'Creada:' : 'Created:'} {new Date(template.createdAt).toLocaleDateString(locale || 'es-MX', { month: 'short', day: 'numeric' })}</span>
                                  {template.periodStart && template.periodEnd && (
                                    <span>{locale?.startsWith('es') ? 'Período:' : 'Period:'} {formatTemplatePeriodRange(template)}</span>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteTemplate(template.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardBody>
                        </Card>
                      ))
                    ) : (
                      <Card className="border border-gray-200">
                        <CardBody className="p-3 text-center">
                          <p className="text-sm text-gray-500">
                            {locale?.startsWith('es') ? 'No hay plantillas Cash Flow guardadas' : 'No Cash Flow templates saved'}
                          </p>
                        </CardBody>
                      </Card>
                    )}
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