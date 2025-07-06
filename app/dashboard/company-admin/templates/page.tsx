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
  DocumentDuplicateIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckBadgeIcon,
  SparklesIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { ROLES } from '@/lib/auth/rbac';

interface Template {
  id: string;
  templateName: string;
  statementType: string;
  locale?: string;
  isDefault: boolean;
  usageCount: number;
  createdAt: Date;
  lastUsed?: Date;
}

function TemplateManagementPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { locale } = useLocale();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get selected company from session storage
    const companyId = sessionStorage.getItem('selectedCompanyId');
    if (companyId) {
      setSelectedCompanyId(companyId);
      fetchTemplates(companyId);
    } else {
      // Redirect back if no company selected
      router.push('/dashboard/company-admin');
    }
  }, [router]);

  const fetchTemplates = async (companyId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/templates?companyId=${companyId}`);
      if (response.ok) {
        const data = await response.json();
        const templatesData = data.success ? data.data : (data.templates || []);
        const mappedTemplates = templatesData?.map((template: any) => ({
          ...template,
          createdAt: new Date(template.createdAt),
          lastUsed: template.lastUsedAt ? new Date(template.lastUsedAt) : undefined
        })) || [];
        setTemplates(mappedTemplates);
      } else {
        setError(locale?.startsWith('es') ? 'Error al cargar plantillas' : 'Failed to load templates');
      }
    } catch (error) {
      setError(locale?.startsWith('es') ? 'Error de red' : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = () => {
    // Store company context and navigate to upload/mapping
    sessionStorage.setItem('selectedCompanyId', selectedCompanyId);
    router.push('/upload');
  };

  const handleBack = () => {
    router.push('/dashboard/company-admin');
  };

  const handleSetDefault = async (templateId: string) => {
    try {
      const response = await fetch(`/api/v1/templates/${templateId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isDefault: true,
          companyId: selectedCompanyId
        }),
      });

      if (response.ok) {
        // Refresh templates list
        fetchTemplates(selectedCompanyId);
      } else {
        alert(locale?.startsWith('es') ? 'Error al actualizar plantilla' : 'Failed to update template');
      }
    } catch (error) {
      alert(locale?.startsWith('es') ? 'Error de red' : 'Network error');
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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(locale || 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
                  {locale?.startsWith('es') ? 'Gestión de Plantillas' : 'Template Management'}
                </h1>
                <p className="text-gray-600 mt-2">
                  {locale?.startsWith('es')
                    ? 'Administra las plantillas de mapeo de tu empresa'
                    : 'Manage your company mapping templates'}
                </p>
              </div>
              <Button
                variant="primary"
                leftIcon={<PlusIcon className="w-4 h-4" />}
                onClick={handleCreateTemplate}
              >
                {locale?.startsWith('es') ? 'Crear Plantilla' : 'Create Template'}
              </Button>
            </div>
          </div>

          {/* Templates Grid */}
          <div className="grid gap-6">
            {loading ? (
              <Card>
                <CardBody className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-gray-500">
                    {locale?.startsWith('es') ? 'Cargando plantillas...' : 'Loading templates...'}
                  </p>
                </CardBody>
              </Card>
            ) : error ? (
              <Card>
                <CardBody className="text-center py-12">
                  <p className="text-red-500 mb-4">{error}</p>
                  <Button variant="outline" onClick={() => fetchTemplates(selectedCompanyId)}>
                    {locale?.startsWith('es') ? 'Reintentar' : 'Retry'}
                  </Button>
                </CardBody>
              </Card>
            ) : templates.length === 0 ? (
              <Card>
                <CardBody className="text-center py-12">
                  <DocumentDuplicateIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {locale?.startsWith('es')
                      ? 'No hay plantillas'
                      : 'No templates found'}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {locale?.startsWith('es')
                      ? 'Crea tu primera plantilla subiendo un archivo Excel'
                      : 'Create your first template by uploading an Excel file'}
                  </p>
                  <Button variant="primary" onClick={handleCreateTemplate}>
                    {locale?.startsWith('es') ? 'Crear Primera Plantilla' : 'Create First Template'}
                  </Button>
                </CardBody>
              </Card>
            ) : (
              templates.map((template) => (
                <Card key={template.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          template.isDefault ? 'bg-yellow-100' : 'bg-blue-100'
                        }`}>
                          {template.isDefault ? (
                            <CheckBadgeIcon className="w-6 h-6 text-yellow-600" />
                          ) : (
                            <DocumentDuplicateIcon className="w-6 h-6 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <CardTitle className="flex items-center space-x-2">
                            <span>{template.templateName}</span>
                            {template.isDefault && (
                              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                                {locale?.startsWith('es') ? 'Predeterminada' : 'Default'}
                              </span>
                            )}
                          </CardTitle>
                          <CardDescription>
                            {getStatementTypeLabel(template.statementType)}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {!template.isDefault && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSetDefault(template.id)}
                          >
                            {locale?.startsWith('es') ? 'Predeterminada' : 'Set Default'}
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          size="sm"
                          title={locale?.startsWith('es') ? 'Editar' : 'Edit'}
                        >
                          <PencilIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteTemplate(template.id)}
                          title={locale?.startsWith('es') ? 'Eliminar' : 'Delete'}
                        >
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardBody>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <SparklesIcon className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-gray-600">{locale?.startsWith('es') ? 'Usos' : 'Usage'}</p>
                          <p className="font-medium">{template.usageCount}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <ClockIcon className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-gray-600">{locale?.startsWith('es') ? 'Creada' : 'Created'}</p>
                          <p className="font-medium">{formatDate(template.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <ClockIcon className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-gray-600">{locale?.startsWith('es') ? 'Último Uso' : 'Last Used'}</p>
                          <p className="font-medium">
                            {template.lastUsed ? formatDate(template.lastUsed) : '-'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div>
                          <p className="text-gray-600">{locale?.startsWith('es') ? 'Idioma' : 'Locale'}</p>
                          <p className="font-medium">{template.locale || 'es-MX'}</p>
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default function TemplateManagementPageWrapper() {
  return (
    <ProtectedRoute requireRole={[ROLES.COMPANY_ADMIN, ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN]}>
      <TemplateManagementPage />
    </ProtectedRoute>
  );
}