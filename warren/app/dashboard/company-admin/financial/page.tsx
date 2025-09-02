"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { 
  DocumentTextIcon, 
  CalendarIcon, 
  CurrencyDollarIcon,
  ChevronRightIcon,
  PlusIcon,
  DocumentArrowUpIcon
} from "@heroicons/react/24/outline";

interface FinancialStatement {
  id: string;
  statementType: string;
  periodStart: string;
  periodEnd: string;
  currency: string;
  createdAt: string;
  sourceFile?: string;
}

function FinancialStatementsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { locale } = useLocale();
  const [loading, setLoading] = useState(true);
  const [statements, setStatements] = useState<FinancialStatement[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStatements = async () => {
      try {
        // Get company context from session
        const companyId = sessionStorage.getItem('selectedCompanyId');
        if (!companyId) {
          setError('No se ha seleccionado una empresa');
          return;
        }
        setSelectedCompanyId(companyId);

        // Fetch company details
        const companyResponse = await fetch(`/api/v1/companies/${companyId}`);
        if (companyResponse.ok) {
          const companyData = await companyResponse.json();
          setCompanyName(companyData.data.name);
        }

        // Fetch statements
        const response = await fetch(`/api/v1/companies/${companyId}/statements`);
        if (!response.ok) {
          throw new Error('Error al cargar estados financieros');
        }

        const data = await response.json();
        
        // The API returns { success: true, data: { statements: [...], pagination: {...} } }
        let statementsData = [];
        if (data.success && data.data) {
          if (Array.isArray(data.data.statements)) {
            statementsData = data.data.statements;
          } else if (Array.isArray(data.data)) {
            statementsData = data.data;
          }
        } else if (Array.isArray(data.statements)) {
          statementsData = data.statements;
        } else if (Array.isArray(data)) {
          statementsData = data;
        }
        setStatements(statementsData);
      } catch (err) {
        console.error('Error loading statements:', err);
        setError('Error al cargar los estados financieros');
      } finally {
        setLoading(false);
      }
    };

    loadStatements();
  }, []);

  const getStatementTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'profit_loss': locale?.startsWith('es') ? 'Estado de Resultados' : 'Income Statement',
      'balance_sheet': locale?.startsWith('es') ? 'Balance General' : 'Balance Sheet',
      'cash_flow': locale?.startsWith('es') ? 'Flujo de Efectivo' : 'Cash Flow',
      'trial_balance': locale?.startsWith('es') ? 'Balanza de Comprobación' : 'Trial Balance'
    };
    return labels[type] || type;
  };

  const getStatementIcon = (type: string) => {
    switch (type) {
      case 'profit_loss':
        return <DocumentTextIcon className="w-6 h-6 text-green-600" />;
      case 'balance_sheet':
        return <DocumentTextIcon className="w-6 h-6 text-blue-600" />;
      case 'cash_flow':
        return <CurrencyDollarIcon className="w-6 h-6 text-purple-600" />;
      case 'trial_balance':
        return <DocumentTextIcon className="w-6 h-6 text-orange-600" />;
      default:
        return <DocumentTextIcon className="w-6 h-6 text-gray-600" />;
    }
  };

  const formatPeriod = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (startDate.getTime() === endDate.getTime()) {
      return startDate.toLocaleDateString(locale || 'es-ES', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
    
    return `${startDate.toLocaleDateString(locale || 'es-ES', { 
      month: 'short',
      year: 'numeric'
    })} - ${endDate.toLocaleDateString(locale || 'es-ES', { 
      month: 'short',
      year: 'numeric'
    })}`;
  };

  const handleUploadNew = () => {
    // Store company context for upload flow
    sessionStorage.setItem('selectedCompanyId', selectedCompanyId);
    router.push('/upload');
  };

  const handleViewStatement = (statementId: string) => {
    router.push(`/dashboard/company-admin/financial/${statementId}/dashboard`);
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-lg text-gray-600">
                {locale?.startsWith('es') ? 'Cargando estados financieros...' : 'Loading financial statements...'}
              </p>
            </div>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center max-w-md">
              <div className="text-red-600 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={() => router.push('/dashboard/company-admin')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {locale?.startsWith('es') ? 'Volver al dashboard' : 'Back to dashboard'}
              </button>
            </div>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {locale?.startsWith('es') ? 'Estados Financieros' : 'Financial Statements'}
                  </h1>
                  <p className="text-gray-600">
                    {companyName} • {statements.length} {locale?.startsWith('es') ? 'documentos' : 'documents'}
                  </p>
                </div>
                <button
                  onClick={handleUploadNew}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <DocumentArrowUpIcon className="w-5 h-5" />
                  <span>{locale?.startsWith('es') ? 'Cargar nuevo' : 'Upload new'}</span>
                </button>
              </div>
            </div>

            {/* Statements List */}
            {statements.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                <DocumentTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {locale?.startsWith('es') ? 'No hay estados financieros' : 'No financial statements'}
                </h3>
                <p className="text-gray-500 mb-6">
                  {locale?.startsWith('es') 
                    ? 'Comienza cargando tu primer estado financiero'
                    : 'Start by uploading your first financial statement'}
                </p>
                <button
                  onClick={handleUploadNew}
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <PlusIcon className="w-5 h-5" />
                  <span>{locale?.startsWith('es') ? 'Cargar estado financiero' : 'Upload financial statement'}</span>
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {statements.map((statement) => (
                  <div
                    key={statement.id}
                    onClick={() => handleViewStatement(statement.id)}
                    className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {getStatementIcon(statement.statementType)}
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {getStatementTypeLabel(statement.statementType)}
                            </h3>
                            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                              <div className="flex items-center space-x-1">
                                <CalendarIcon className="w-4 h-4" />
                                <span>{formatPeriod(statement.periodStart, statement.periodEnd)}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <CurrencyDollarIcon className="w-4 h-4" />
                                <span>{statement.currency}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="text-sm text-gray-500">
                              {locale?.startsWith('es') ? 'Cargado' : 'Uploaded'}
                            </p>
                            <p className="text-sm font-medium text-gray-700">
                              {new Date(statement.createdAt).toLocaleDateString(locale || 'es-ES')}
                            </p>
                          </div>
                          <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Group by type section */}
            {statements.length > 0 && (
              <div className="mt-12">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  {locale?.startsWith('es') ? 'Por tipo de documento' : 'By document type'}
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {['profit_loss', 'balance_sheet', 'cash_flow', 'trial_balance'].map((type) => {
                    const typeStatements = statements.filter(s => s.statementType === type);
                    return (
                      <div key={type} className="bg-gray-50 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            {getStatementIcon(type)}
                            <h3 className="font-medium text-gray-900">
                              {getStatementTypeLabel(type)}
                            </h3>
                          </div>
                          <span className="text-sm font-medium text-gray-500">
                            {typeStatements.length}
                          </span>
                        </div>
                        {typeStatements.length > 0 && (
                          <div className="space-y-2">
                            {typeStatements.slice(0, 3).map((stmt) => (
                              <button
                                key={stmt.id}
                                onClick={() => handleViewStatement(stmt.id)}
                                className="w-full text-left px-3 py-2 bg-white rounded hover:bg-gray-50 transition-colors"
                              >
                                <p className="text-sm font-medium text-gray-700">
                                  {formatPeriod(stmt.periodStart, stmt.periodEnd)}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {stmt.currency} • {new Date(stmt.createdAt).toLocaleDateString(locale || 'es-ES')}
                                </p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}

export default function FinancialStatementsPageWrapper() {
  return <FinancialStatementsPage />;
}