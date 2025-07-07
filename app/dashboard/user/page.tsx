"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody, CardTitle, CardDescription } from '@/components/ui/Card';
import { CompanySelector } from '@/components/CompanySelector';
import { TemplateSelector } from '@/components/TemplateSelector';
import {
  DocumentTextIcon,
  CloudArrowUpIcon,
  DocumentDuplicateIcon,
  ClockIcon,
  ChartBarIcon,
  FolderOpenIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';

interface RecentDocument {
  id: string;
  fileName: string;
  uploadedAt: string;
  status: 'completed' | 'processing' | 'error';
  statementType: string;
}

function UserDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { locale } = useLocale();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [recentDocuments, setRecentDocuments] = useState<RecentDocument[]>([
    {
      id: '1',
      fileName: 'Estado_Resultados_Enero_2024.xlsx',
      uploadedAt: '2024-01-15T10:30:00',
      status: 'completed',
      statementType: 'profit_loss'
    },
    {
      id: '2',
      fileName: 'Balance_General_Q4_2023.xlsx',
      uploadedAt: '2024-01-10T14:20:00',
      status: 'completed',
      statementType: 'balance_sheet'
    }
  ]);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchTemplates();
    }
  }, [selectedCompanyId]);

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const response = await fetch(`/api/v1/templates?companyId=${selectedCompanyId}`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleTemplateSelect = (template: any) => {
    // Store template and company in session
    sessionStorage.setItem('selectedTemplate', JSON.stringify(template));
    sessionStorage.setItem('selectedCompanyId', selectedCompanyId);
    router.push('/upload');
  };

  const handleNewUpload = () => {
    sessionStorage.setItem('selectedCompanyId', selectedCompanyId);
    router.push('/upload');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale || 'es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      completed: 'bg-green-100 text-green-800',
      processing: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800'
    };
    const labels = {
      completed: locale?.startsWith('es') ? 'Completado' : 'Completed',
      processing: locale?.startsWith('es') ? 'Procesando' : 'Processing',
      error: 'Error'
    };
    return (
      <span className={`text-xs px-2 py-1 rounded-full ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const getStatementTypeLabel = (type: string) => {
    const labels = {
      profit_loss: locale?.startsWith('es') ? 'Estado de Resultados' : 'Profit & Loss',
      balance_sheet: locale?.startsWith('es') ? 'Balance General' : 'Balance Sheet',
      cash_flow: locale?.startsWith('es') ? 'Flujo de Efectivo' : 'Cash Flow'
    };
    return labels[type as keyof typeof labels] || type;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {locale?.startsWith('es') 
              ? `¡Hola, ${user?.firstName}!`
              : `Hello, ${user?.firstName}!`}
          </h1>
          <p className="text-gray-600 mt-2">
            {locale?.startsWith('es') 
              ? 'Gestiona tus documentos financieros'
              : 'Manage your financial documents'}
          </p>
        </div>

        {/* Company Selector */}
        <div className="mb-8 max-w-md">
          <CompanySelector
            selectedCompanyId={selectedCompanyId}
            onCompanySelect={setSelectedCompanyId}
          />
        </div>

        {selectedCompanyId && (
          <>
            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {/* Use Template */}
              {templates.length > 0 && (
                <Card 
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setShowTemplateSelector(true)}
                >
                  <CardBody className="flex items-center space-x-4">
                    <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
                      <DocumentDuplicateIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {locale?.startsWith('es') ? 'Usar Plantilla' : 'Use Template'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {locale?.startsWith('es') 
                          ? `${templates.length} plantilla${templates.length > 1 ? 's' : ''} disponible${templates.length > 1 ? 's' : ''}`
                          : `${templates.length} template${templates.length > 1 ? 's' : ''} available`}
                      </p>
                    </div>
                  </CardBody>
                </Card>
              )}

              {/* Upload New */}
              <Card 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={handleNewUpload}
              >
                <CardBody className="flex items-center space-x-4">
                  <div className="p-3 rounded-lg bg-green-100 text-green-600">
                    <CloudArrowUpIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {locale?.startsWith('es') ? 'Subir Nuevo' : 'Upload New'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {locale?.startsWith('es') 
                        ? 'Procesar nuevo documento'
                        : 'Process new document'}
                    </p>
                  </div>
                </CardBody>
              </Card>

              {/* View Reports */}
              <Card 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push('/dashboard/user/reports')}
              >
                <CardBody className="flex items-center space-x-4">
                  <div className="p-3 rounded-lg bg-purple-100 text-purple-600">
                    <ChartBarIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {locale?.startsWith('es') ? 'Ver Reportes' : 'View Reports'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {locale?.startsWith('es') 
                        ? 'Análisis y métricas'
                        : 'Analytics and metrics'}
                    </p>
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* Recent Documents */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>
                      {locale?.startsWith('es') ? 'Documentos Recientes' : 'Recent Documents'}
                    </CardTitle>
                    <CardDescription>
                      {locale?.startsWith('es') 
                        ? 'Tus últimos documentos procesados'
                        : 'Your recently processed documents'}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/dashboard/user/documents')}
                  >
                    {locale?.startsWith('es') ? 'Ver todos' : 'View all'}
                  </Button>
                </div>
              </CardHeader>
              <CardBody>
                {recentDocuments.length > 0 ? (
                  <div className="space-y-4">
                    {recentDocuments.map((doc) => (
                      <div 
                        key={doc.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => router.push(`/dashboard/user/documents/${doc.id}`)}
                      >
                        <div className="flex items-center space-x-4">
                          <div className="p-2 bg-gray-100 rounded">
                            <DocumentTextIcon className="w-5 h-5 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{doc.fileName}</p>
                            <div className="flex items-center space-x-4 mt-1">
                              <span className="text-sm text-gray-600">
                                {getStatementTypeLabel(doc.statementType)}
                              </span>
                              <span className="text-sm text-gray-500 flex items-center">
                                <ClockIcon className="w-4 h-4 mr-1" />
                                {formatDate(doc.uploadedAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                        {getStatusBadge(doc.status)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FolderOpenIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">
                      {locale?.startsWith('es') 
                        ? 'No hay documentos recientes'
                        : 'No recent documents'}
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      className="mt-4"
                      onClick={handleNewUpload}
                    >
                      {locale?.startsWith('es') ? 'Subir primer documento' : 'Upload first document'}
                    </Button>
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Template Selector Modal */}
            {showTemplateSelector && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6">
                    <h2 className="text-xl font-semibold mb-4">
                      {locale?.startsWith('es') ? 'Seleccionar Plantilla' : 'Select Template'}
                    </h2>
                    <TemplateSelector
                      companyId={selectedCompanyId}
                      onTemplateSelect={handleTemplateSelect}
                      onSkip={handleNewUpload}
                    />
                    <Button
                      variant="ghost"
                      className="mt-4 w-full"
                      onClick={() => setShowTemplateSelector(false)}
                    >
                      {locale?.startsWith('es') ? 'Cancelar' : 'Cancel'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {!selectedCompanyId && (
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
                  ? 'Elige una empresa para comenzar a trabajar con tus documentos'
                  : 'Choose a company to start working with your documents'}
              </p>
            </CardBody>
          </Card>
        )}
      </main>
    </div>
  );
}

export default function UserDashboardPage() {
  return (
    <ProtectedRoute>
      <UserDashboard />
    </ProtectedRoute>
  );
}