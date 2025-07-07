"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { CompanySelector } from "@/components/CompanySelector";
import { CheckCircleIcon, CloudArrowUpIcon, BuildingOfficeIcon } from "@heroicons/react/24/outline";
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
      
      // Clear session data
      sessionStorage.removeItem('uploadSession');
      sessionStorage.removeItem('uploadedFile');
      sessionStorage.removeItem('validationResults');
      sessionStorage.removeItem('accountMapping');
      
      // Redirect to financial dashboard after 3 seconds
      setTimeout(() => {
        router.push(`/dashboard/company-admin/financial/${result.statementId}/dashboard`);
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
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {locale?.startsWith('es') ? 'Guardar Datos Financieros' : 'Save Financial Data'}
                </h1>
                <p className="text-gray-600">
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
            <Card>
              <CardHeader>
                <CardTitle>
                  {locale?.startsWith('es') ? 'Resumen de Validación' : 'Validation Summary'}
                </CardTitle>
                <CardDescription>
                  {user && (
                    <span>
                      {locale?.startsWith('es') ? 'Usuario:' : 'User:'} {user.firstName} {user.lastName}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
            <CardBody className="space-y-6">

              {/* Summary */}
              <Card variant="flat">
                <CardBody>
                  <h3 className="font-semibold text-gray-900 mb-4">
                    {locale?.startsWith('es') ? 'Resumen de Datos' : 'Data Summary'}
                  </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">
                    {locale?.startsWith('es') ? 'Tipo de Estado:' : 'Statement Type:'}
                  </span>
                  <span className="ml-2 font-medium">
                    {accountMapping.statementType === 'balance_sheet' 
                      ? (locale?.startsWith('es') ? 'Balance General' : 'Balance Sheet')
                      : accountMapping.statementType === 'profit_loss' 
                      ? (locale?.startsWith('es') ? 'Estado de Resultados' : 'Profit & Loss')
                      : (locale?.startsWith('es') ? 'Flujo de Efectivo' : 'Cash Flow')
                    }
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">
                    {locale?.startsWith('es') ? 'Moneda:' : 'Currency:'}
                  </span>
                  <span className="ml-2 font-medium">{accountMapping.currency}</span>
                </div>
                <div>
                  <span className="text-gray-500">
                    {locale?.startsWith('es') ? 'Filas procesadas:' : 'Rows processed:'}
                  </span>
                  <span className="ml-2 font-medium">{validationResults.totalRows}</span>
                </div>
                <div>
                  <span className="text-gray-500">
                    {locale?.startsWith('es') ? 'Cuentas mapeadas:' : 'Accounts mapped:'}
                  </span>
                  <span className="ml-2 font-medium">{accountMapping.accounts.length}</span>
                </div>
                  </div>
                </CardBody>
              </Card>

              {/* Company Selection */}
              <CompanySelector
                selectedCompanyId={selectedCompanyId}
                onCompanySelect={setSelectedCompanyId}
              />

              {/* Template Option */}
              <Card variant="flat">
                <CardBody>
                  <label className="flex items-center space-x-3">
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
                      className="mt-3 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  )}
                </CardBody>
              </Card>

              {/* Security Notice */}
              <Card variant="flat" className="bg-blue-50 border-blue-200">
                <CardBody>
                  <div className="flex items-start space-x-3">
                    <CloudArrowUpIcon className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Seguridad de Datos</p>
                      <p>
                        Todos los datos financieros serán encriptados usando AES-256 antes de 
                        almacenarse. Solo usuarios autorizados podrán acceder a la información.
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

            </CardBody>
            <CardFooter className="flex justify-between">
              <Button
                variant="ghost"
                onClick={() => router.push('/mapper')}
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
              >
                {loading 
                  ? (locale?.startsWith('es') ? 'Guardando...' : 'Saving...')
                  : (
                      locale?.startsWith('es') ? 'Guardar Datos Encriptados' : 'Save Encrypted Data'
                  )
                }
              </Button>
            </CardFooter>
          </Card>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}

export default function PersistPage() {
  return <PersistPageContent />;
}