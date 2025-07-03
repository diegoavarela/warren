"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Header } from "@/components/Header";
import { CompanySelector } from "@/components/CompanySelector";
import { CheckCircleIcon, CloudArrowUpIcon } from "@heroicons/react/24/outline";

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
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');

  useEffect(() => {
    // Load validation results and mapping from session
    const resultsStr = sessionStorage.getItem('validationResults');
    const mappingStr = sessionStorage.getItem('accountMapping');
    
    if (!resultsStr || !mappingStr) {
      setError('No se encontraron datos para guardar');
      return;
    }
    
    setValidationResults(JSON.parse(resultsStr));
    setAccountMapping(JSON.parse(mappingStr));
  }, []);

  const handlePersist = async () => {
    if (!selectedCompanyId) {
      setError(locale?.startsWith('es') ? 'Por favor selecciona una empresa' : 'Please select a company');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/persist-encrypted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadSession: sessionStorage.getItem('uploadSession'),
          validationResults,
          accountMapping,
          companyId: selectedCompanyId,
          saveAsTemplate,
          templateName: saveAsTemplate ? templateName : undefined,
          encrypt: true // Enable encryption
        })
      });

      if (!response.ok) {
        throw new Error('Error al guardar los datos');
      }

      const result = await response.json();
      setSuccess(true);
      
      // Clear session data
      sessionStorage.removeItem('uploadSession');
      sessionStorage.removeItem('uploadedFile');
      sessionStorage.removeItem('validationResults');
      sessionStorage.removeItem('accountMapping');
      
      // Redirect after 3 seconds
      setTimeout(() => {
        router.push('/');
      }, 3000);

    } catch (err) {
      console.error('Persistence error:', err);
      setError('Error al guardar los datos');
    } finally {
      setLoading(false);
    }
  };

  if (!validationResults || !accountMapping) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-center">
            <p className="text-lg text-gray-600">Cargando datos...</p>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-center">
            <CheckCircleIcon className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Datos Guardados!</h2>
            <p className="text-gray-600 mb-4">
              Todos los datos han sido encriptados y almacenados de forma segura.
            </p>
            <p className="text-sm text-gray-500">Redirigiendo al inicio...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {locale?.startsWith('es') ? 'Guardar Datos Financieros' : 'Save Financial Data'}
              </h1>
              <p className="text-gray-600">
                {locale?.startsWith('es') 
                  ? 'Los datos serán encriptados antes de almacenarse en la base de datos.'
                  : 'Data will be encrypted before being stored in the database.'
                }
              </p>
              {user && (
                <p className="text-sm text-gray-500 mt-2">
                  {locale?.startsWith('es') ? 'Usuario:' : 'User:'} {user.firstName} {user.lastName}
                </p>
              )}
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
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
            </div>

            {/* Company Selection */}
            <CompanySelector
              selectedCompanyId={selectedCompanyId}
              onCompanySelect={setSelectedCompanyId}
              className="mb-8"
            />

            {/* Template Option */}
            <div className="mb-8">
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
                  className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              )}
            </div>

            {/* Security Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
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
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between">
              <button
                onClick={() => router.push('/mapper')}
                className="px-6 py-2 text-gray-600 hover:text-gray-800"
              >
                ← Volver al mapeo
              </button>
              
              <button
                onClick={handlePersist}
                disabled={loading || !selectedCompanyId}
                className="px-8 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>{locale?.startsWith('es') ? 'Guardando...' : 'Saving...'}</span>
                  </>
                ) : (
                  <>
                    <CloudArrowUpIcon className="w-5 h-5" />
                    <span>
                      {locale?.startsWith('es') ? 'Guardar Datos Encriptados' : 'Save Encrypted Data'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function PersistPage() {
  return (
    <ProtectedRoute>
      <PersistPageContent />
    </ProtectedRoute>
  );
}