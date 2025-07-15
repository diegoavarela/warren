"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { CompanySelector } from "@/components/CompanySelector";
import { CheckCircleIcon, CloudArrowUpIcon, BuildingOfficeIcon, DocumentTextIcon, CurrencyDollarIcon } from "@heroicons/react/24/outline";
import { Card, CardHeader, CardBody, CardFooter, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

function PersistPageContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { locale } = useLocale();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationResults, setValidationResults] = useState<any>(null);
  const [accountMapping, setAccountMapping] = useState<any>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');

  const fetchCompanyDetails = async (companyId: string) => {
    try {
      const response = await fetch(`/api/v1/companies/${companyId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedCompany(data.data);
      } else if (response.status === 403) {
        console.warn('Permission denied to access company details');
        setError(`Sin permisos para acceder a los datos de la empresa. Contacta al administrador.`);
      } else {
        console.warn('Failed to fetch company details:', response.status);
        setError(`Error al cargar información de la empresa (${response.status})`);
      }
    } catch (err) {
      console.warn('Error fetching company details:', err);
      setError('Error de conexión al cargar información de la empresa');
    }
  };

  useEffect(() => {
    // Load validation results and mapping from session
    const resultsStr = sessionStorage.getItem('validationResults');
    const mappingStr = sessionStorage.getItem('accountMapping');
    const companyId = sessionStorage.getItem('selectedCompanyId');
    
    console.log('Persist page - Loading data from sessionStorage');
    console.log('validationResults exists:', !!resultsStr);
    console.log('accountMapping exists:', !!mappingStr);
    console.log('selectedCompanyId:', companyId);
    
    if (!resultsStr || !mappingStr) {
      console.log('No data in sessionStorage, redirecting to home page');
      // Redirect to home page if no data is available
      router.push('/');
      return;
    }
    
    try {
      const parsedResults = JSON.parse(resultsStr);
      const parsedMapping = JSON.parse(mappingStr);
      
      console.log('Parsed data successfully:', {
        resultsKeys: Object.keys(parsedResults),
        mappingKeys: Object.keys(parsedMapping),
        accountsCount: parsedMapping.accounts?.length
      });
      
      setValidationResults(parsedResults);
      setAccountMapping(parsedMapping);
      
      // Set company ID if available
      if (companyId) {
        setSelectedCompanyId(companyId);
        // Fetch company details
        fetchCompanyDetails(companyId);
      }
    } catch (err) {
      console.error('Error parsing sessionStorage data:', err);
      // Redirect to home page if data is corrupted
      router.push('/');
    }
  }, []);

  const handlePersist = async () => {
    if (!selectedCompanyId) {
      setError(locale?.startsWith('es') ? 'Por favor selecciona una empresa' : 'Please select a company');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // Get upload session from session storage
      const uploadSession = sessionStorage.getItem('uploadSession');
      
      console.log('🚀 Sending to persist-encrypted:', {
        uploadSession,
        hasValidationResults: !!validationResults,
        hasAccountMapping: !!accountMapping,
        companyId: selectedCompanyId,
        periodColumnsCount: accountMapping?.periodColumns?.length || 0,
        periodColumns: accountMapping?.periodColumns,
        accountsCount: accountMapping?.accounts?.length || 0,
        sampleAccount: accountMapping?.accounts?.[0]
      });
      
      const response = await fetch('/api/persist-encrypted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadSession: uploadSession,
          validationResults,
          accountMapping,
          companyId: selectedCompanyId,
          saveAsTemplate,
          templateName: saveAsTemplate ? templateName : undefined,
          encrypt: true, // Enable encryption
          locale: locale
          // Removed fileData and completeExcelData to avoid request size limits
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`${response.status}: ${errorData.message || 'Error al guardar los datos'}`);
      }

      const result = await response.json();
      setSuccess(true);
      
      // Clear all upload-related session data
      sessionStorage.removeItem('uploadSession');
      sessionStorage.removeItem('uploadedFile');
      sessionStorage.removeItem('validationResults');
      sessionStorage.removeItem('accountMapping');
      // Keep selectedCompanyId for dashboard context
      // sessionStorage.removeItem('selectedCompanyId');
      sessionStorage.removeItem('selectedTemplate');
      sessionStorage.removeItem('fileData');
      sessionStorage.removeItem('excelData');
      sessionStorage.removeItem('completeExcelData');
      sessionStorage.removeItem('selectedUnits');
      sessionStorage.removeItem('statementType');
      
      // Clean up temporary file on server
      if (uploadSession) {
        try {
          await fetch(`/api/upload-session/${uploadSession}`, {
            method: 'DELETE'
          });
        } catch (error) {
          console.log('Note: Could not clean up temporary file:', error);
        }
      }
      
      // Redirect to appropriate dashboard after 3 seconds based on statement type
      setTimeout(() => {
        const dashboardPath = accountMapping.statementType === 'cash_flow' 
          ? '/dashboard/company-admin/cashflow'
          : '/dashboard/company-admin/pnl';
        router.push(dashboardPath);
      }, 3000);

    } catch (err) {
      console.error('Persistence error:', err);
      if (err instanceof Error && err.message.includes('403')) {
        setError('Sin permisos para guardar datos financieros en esta empresa. Contacta al administrador.');
      } else if (err instanceof Error && err.message.includes('500')) {
        setError('Error interno del servidor. Intenta nuevamente o contacta soporte técnico.');
      } else {
        setError('Error al guardar los datos. Verifica tu conexión e intenta nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!validationResults || !accountMapping) {
    return (
      <ProtectedRoute>
        <AppLayout showFooter={false}>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-lg text-gray-600">Cargando datos...</p>
              <p className="text-sm text-gray-500 mt-2">Redirigiendo si no hay datos disponibles...</p>
            </div>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  if (success) {
    return (
      <ProtectedRoute>
        <AppLayout showFooter={false}>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <CheckCircleIcon className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Datos Guardados!</h2>
              <p className="text-gray-600 mb-4">
                Todos los datos han sido encriptados y almacenados de forma segura.
              </p>
              <p className="text-sm text-gray-500">Redirigiendo al dashboard...</p>
            </div>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppLayout showFooter={false}>
        <div className="min-h-screen bg-gray-50">
          <div className="container mx-auto px-4 py-4">
            <div className="max-w-6xl mx-auto">
              {/* Header Section */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {locale?.startsWith('es') ? 'Guardar Datos Financieros' : 'Save Financial Data'}
                  </h1>
                  <p className="text-sm text-gray-600">
                    {locale?.startsWith('es') 
                      ? 'Los datos serán encriptados antes de almacenarse en la base de datos.'
                      : 'Data will be encrypted before being stored in the database.'
                    }
                  </p>
                </div>
                {/* Company Context Display */}
                {selectedCompany && (
                  <div className="flex items-center space-x-3 px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
                    <BuildingOfficeIcon className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">{selectedCompany.name}</p>
                      <p className="text-xs text-blue-600">
                        {locale?.startsWith('es') ? 'Empresa seleccionada' : 'Selected company'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Main Content Grid - Optimized Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left Column - Validation Summary */}
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">
                        {locale?.startsWith('es') ? 'Resumen de Validación' : 'Validation Summary'}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {user && (
                          <span>
                            {locale?.startsWith('es') ? 'Usuario:' : 'User:'} {user.firstName} {user.lastName}
                          </span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardBody className="pt-0">
                      {/* Enhanced Validation Summary */}
                      <Card variant="flat" className="bg-gradient-to-br from-green-50 to-blue-50 border-green-200">
                        <CardBody className="p-3">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                <CheckCircleIcon className="w-5 h-5 text-green-600" />
                              </div>
                              <div>
                                <h3 className="text-base font-bold text-gray-900">
                                  {locale?.startsWith('es') ? '✅ Validación Completada' : '✅ Validation Complete'}
                                </h3>
                                <p className="text-xs text-green-700">
                                  {locale?.startsWith('es') ? 'Todos los datos han sido procesados correctamente' : 'All data has been processed successfully'}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xl font-bold text-green-600">{accountMapping.accounts.length}</div>
                              <div className="text-xs text-green-700 uppercase font-medium">
                                {locale?.startsWith('es') ? 'Cuentas' : 'Accounts'}
                              </div>
                            </div>
                          </div>

                          {/* Detailed Metrics Grid */}
                          <div className="grid grid-cols-3 gap-2 mb-3">
                            {/* Statement Type */}
                            <div className="bg-white rounded-lg p-2 border border-blue-200">
                              <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <DocumentTextIcon className="w-4 h-4 text-blue-600" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs text-gray-500 uppercase font-medium truncate">
                                    {locale?.startsWith('es') ? 'Tipo' : 'Type'}
                                  </p>
                                  <p className="text-xs font-bold text-gray-900 truncate">
                                    {accountMapping.statementType === 'balance_sheet' 
                                      ? (locale?.startsWith('es') ? 'Balance General' : 'Balance Sheet')
                                      : accountMapping.statementType === 'profit_loss' 
                                      ? (locale?.startsWith('es') ? 'P&L' : 'P&L')
                                      : (locale?.startsWith('es') ? 'Flujo de Caja' : 'Cash Flow')
                                    }
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Currency */}
                            <div className="bg-white rounded-lg p-2 border border-amber-200">
                              <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <CurrencyDollarIcon className="w-4 h-4 text-amber-600" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs text-gray-500 uppercase font-medium truncate">
                                    {locale?.startsWith('es') ? 'Moneda' : 'Currency'}
                                  </p>
                                  <p className="text-xs font-bold text-gray-900">{accountMapping.currency}</p>
                                </div>
                              </div>
                            </div>

                            {/* Data Quality */}
                            <div className="bg-white rounded-lg p-2 border border-purple-200">
                              <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <BuildingOfficeIcon className="w-4 h-4 text-purple-600" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs text-gray-500 uppercase font-medium truncate">
                                    {locale?.startsWith('es') ? 'Filas' : 'Rows'}
                                  </p>
                                  <p className="text-xs font-bold text-gray-900">{validationResults.totalRows}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="mb-2">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-medium text-gray-700">
                                {locale?.startsWith('es') ? 'Progreso de validación' : 'Validation Progress'}
                              </span>
                              <span className="text-xs font-bold text-green-600">100%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-1000 ease-out" style={{width: '100%'}}></div>
                            </div>
                          </div>

                          {/* Additional Details */}
                          {validationResults.errors && validationResults.errors.length > 0 && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
                              <h4 className="font-medium text-yellow-900 text-sm mb-1">
                                ⚠️ {locale?.startsWith('es') ? 'Advertencias' : 'Warnings'}
                              </h4>
                              <ul className="text-xs text-yellow-800 space-y-0.5">
                                {validationResults.errors.slice(0, 2).map((error: any, index: number) => (
                                  <li key={index}>• {error.message || error}</li>
                                ))}
                                {validationResults.errors.length > 2 && (
                                  <li className="text-yellow-600">... y {validationResults.errors.length - 2} más</li>
                                )}
                              </ul>
                            </div>
                          )}
                        </CardBody>
                      </Card>
                    </CardBody>
                  </Card>
                </div>

                {/* Right Column - Company Selection & Actions */}
                <div className="space-y-4">
                  {/* Company Selection */}
                  <CompanySelector
                    selectedCompanyId={selectedCompanyId}
                    onCompanySelect={setSelectedCompanyId}
                  />

                  {/* Template Option */}
                  <Card variant="flat">
                    <CardBody className="p-3">
                      <label className="flex items-center space-x-2">
                        <input 
                          type="checkbox"
                          checked={saveAsTemplate}
                          onChange={(e) => setSaveAsTemplate(e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          {locale?.startsWith('es') 
                            ? 'Guardar como plantilla para futuros mapeos'
                            : 'Save as template for future mappings'
                          }
                        </span>
                      </label>
                      {saveAsTemplate && (
                        <input
                          type="text"
                          value={templateName}
                          onChange={(e) => setTemplateName(e.target.value)}
                          placeholder={locale?.startsWith('es') 
                            ? 'Nombre de la plantilla (opcional)'
                            : 'Template name (optional)'
                          }
                          className="mt-2 w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      )}
                    </CardBody>
                  </Card>

                  {/* Security Notice */}
                  <Card variant="flat" className="bg-blue-50 border-blue-200">
                    <CardBody className="p-3">
                      <div className="flex items-start space-x-2">
                        <CloudArrowUpIcon className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-blue-800">
                          <p className="font-medium">Seguridad de Datos</p>
                          <p className="mt-1">
                            Todos los datos financieros serán encriptados usando AES-256 antes de almacenarse. Solo usuarios autorizados podrán acceder a la información.
                          </p>
                        </div>
                      </div>
                    </CardBody>
                  </Card>

                  {error && (
                    <Card variant="flat" className="bg-red-50 border-red-200">
                      <CardBody>
                        <p className="text-sm text-red-800">{error}</p>
                      </CardBody>
                    </Card>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col space-y-3">
                    <Button
                      variant="ghost"
                      onClick={() => router.push('/enhanced-mapper')}
                      className="w-full justify-start"
                    >
                      ← Volver al mapeo
                    </Button>
                    
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={handlePersist}
                      disabled={!selectedCompanyId}
                      loading={loading}
                      leftIcon={!loading && <CloudArrowUpIcon className="w-5 h-5" />}
                      className="w-full"
                    >
                      {loading 
                        ? (locale?.startsWith('es') ? 'Guardando...' : 'Saving...')
                        : (
                            locale?.startsWith('es') ? 'Guardar Datos Encriptados' : 'Save Encrypted Data'
                        )
                      }
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}

export default function PersistPage() {
  return <PersistPageContent />;
}