"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { 
  DocumentTextIcon, 
  CalendarIcon, 
  CurrencyDollarIcon,
  ArrowLeftIcon,
  ArrowDownTrayIcon,
  ChartBarIcon
} from "@heroicons/react/24/outline";

interface LineItem {
  id: string;
  accountCode: string;
  accountName: string;
  category: string;
  value: number;
  isInflow: boolean;
}

interface FinancialStatement {
  id: string;
  statementType: string;
  periodStart: string;
  periodEnd: string;
  currency: string;
  createdAt: string;
  sourceFile?: string;
  lineItems: LineItem[];
}

function FinancialStatementViewerPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const { locale } = useLocale();
  const [loading, setLoading] = useState(true);
  const [statement, setStatement] = useState<FinancialStatement | null>(null);
  const [companyName, setCompanyName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<'category' | 'none'>('category');

  const statementId = params.statementId as string;

  useEffect(() => {
    const loadStatement = async () => {
      try {
        // Get company context
        const companyId = sessionStorage.getItem('selectedCompanyId');
        if (!companyId) {
          setError('No se ha seleccionado una empresa');
          return;
        }

        // Fetch company details
        const companyResponse = await fetch(`/api/v1/companies/${companyId}`);
        if (companyResponse.ok) {
          const companyData = await companyResponse.json();
          setCompanyName(companyData.data.name);
        }

        // Fetch statement details
        const response = await fetch(`/api/v1/companies/${companyId}/statements/${statementId}`);
        if (!response.ok) {
          throw new Error('Error al cargar el estado financiero');
        }

        const data = await response.json();
        console.log('Statement API response:', data);
        
        if (data.success && data.data) {
          setStatement(data.data);
        } else {
          throw new Error(data.error?.message || 'Error al cargar el estado financiero');
        }
      } catch (err) {
        console.error('Error loading statement:', err);
        setError('Error al cargar el estado financiero');
      } finally {
        setLoading(false);
      }
    };

    loadStatement();
  }, [statementId]);

  const getStatementTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'profit_loss': locale?.startsWith('es') ? 'Estado de Resultados' : 'Income Statement',
      'balance_sheet': locale?.startsWith('es') ? 'Balance General' : 'Balance Sheet',
      'cash_flow': locale?.startsWith('es') ? 'Flujo de Efectivo' : 'Cash Flow',
      'trial_balance': locale?.startsWith('es') ? 'Balanza de Comprobación' : 'Trial Balance'
    };
    return labels[type] || type;
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'revenue': locale?.startsWith('es') ? 'Ingresos' : 'Revenue',
      'cost_of_sales': locale?.startsWith('es') ? 'Costo de Ventas' : 'Cost of Sales',
      'operating_expense': locale?.startsWith('es') ? 'Gastos Operativos' : 'Operating Expenses',
      'other_income': locale?.startsWith('es') ? 'Otros Ingresos' : 'Other Income',
      'other_expense': locale?.startsWith('es') ? 'Otros Gastos' : 'Other Expenses',
      'tax': locale?.startsWith('es') ? 'Impuestos' : 'Taxes',
      'asset': locale?.startsWith('es') ? 'Activos' : 'Assets',
      'liability': locale?.startsWith('es') ? 'Pasivos' : 'Liabilities',
      'equity': locale?.startsWith('es') ? 'Capital' : 'Equity'
    };
    return labels[category] || category;
  };

  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat(locale || 'es-ES', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
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
      day: 'numeric',
      year: 'numeric'
    })} - ${endDate.toLocaleDateString(locale || 'es-ES', { 
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })}`;
  };

  const groupLineItems = () => {
    if (!statement || groupBy === 'none') {
      return statement?.lineItems || [];
    }

    const grouped: Record<string, LineItem[]> = {};
    statement.lineItems.forEach(item => {
      const category = item.category || 'other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    });

    return grouped;
  };

  const calculateSubtotal = (items: LineItem[]) => {
    return items.reduce((sum, item) => {
      return sum + (item.isInflow ? item.value : -item.value);
    }, 0);
  };

  const calculateTotal = () => {
    if (!statement) return 0;
    return statement.lineItems.reduce((sum, item) => {
      return sum + (item.isInflow ? item.value : -item.value);
    }, 0);
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    alert(locale?.startsWith('es') ? 'Función de exportación próximamente' : 'Export feature coming soon');
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-lg text-gray-600">
                {locale?.startsWith('es') ? 'Cargando estado financiero...' : 'Loading financial statement...'}
              </p>
            </div>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  if (error || !statement) {
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
              <p className="text-gray-600 mb-6">{error || 'Estado financiero no encontrado'}</p>
              <button
                onClick={() => router.push('/dashboard/company-admin/financial')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {locale?.startsWith('es') ? 'Volver a la lista' : 'Back to list'}
              </button>
            </div>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  const groupedItems = groupLineItems();

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <button
                onClick={() => router.push('/dashboard/company-admin/financial')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
              >
                <ArrowLeftIcon className="w-5 h-5" />
                <span>{locale?.startsWith('es') ? 'Volver a estados financieros' : 'Back to financial statements'}</span>
              </button>
              
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {getStatementTypeLabel(statement.statementType)}
                  </h1>
                  <div className="flex items-center space-x-6 text-gray-600">
                    <div className="flex items-center space-x-2">
                      <CalendarIcon className="w-5 h-5" />
                      <span>{formatPeriod(statement.periodStart, statement.periodEnd)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CurrencyDollarIcon className="w-5 h-5" />
                      <span>{statement.currency}</span>
                    </div>
                    <div>
                      <span className="text-sm">{companyName}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handleExport}
                    className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <ArrowDownTrayIcon className="w-5 h-5" />
                    <span>{locale?.startsWith('es') ? 'Exportar' : 'Export'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <label className="text-sm font-medium text-gray-700">
                    {locale?.startsWith('es') ? 'Agrupar por:' : 'Group by:'}
                  </label>
                  <select
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value as 'category' | 'none')}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="category">
                      {locale?.startsWith('es') ? 'Categoría' : 'Category'}
                    </option>
                    <option value="none">
                      {locale?.startsWith('es') ? 'Sin agrupar' : 'No grouping'}
                    </option>
                  </select>
                </div>
                
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <ChartBarIcon className="w-5 h-5" />
                  <span>
                    {statement.lineItems.length} {locale?.startsWith('es') ? 'cuentas' : 'accounts'}
                  </span>
                </div>
              </div>
            </div>

            {/* Financial Data Table */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {locale?.startsWith('es') ? 'Código' : 'Code'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {locale?.startsWith('es') ? 'Cuenta' : 'Account'}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {locale?.startsWith('es') ? 'Monto' : 'Amount'}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {groupBy === 'category' && typeof groupedItems === 'object' ? (
                    Object.entries(groupedItems).map(([category, items]) => (
                      <React.Fragment key={category}>
                        <tr className="bg-gray-50">
                          <td colSpan={3} className="px-6 py-3">
                            <h3 className="text-sm font-semibold text-gray-900">
                              {getCategoryLabel(category)}
                            </h3>
                          </td>
                        </tr>
                        {(items as LineItem[]).map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.accountCode}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.accountName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                              <span className={item.isInflow ? 'text-green-600' : 'text-red-600'}>
                                {formatCurrency(item.value, statement.currency)}
                              </span>
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-blue-50 font-medium">
                          <td colSpan={2} className="px-6 py-3 text-sm text-blue-900">
                            {locale?.startsWith('es') ? 'Subtotal' : 'Subtotal'} {getCategoryLabel(category)}
                          </td>
                          <td className="px-6 py-3 text-sm text-right">
                            <span className={calculateSubtotal(items as LineItem[]) >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {formatCurrency(Math.abs(calculateSubtotal(items as LineItem[])), statement.currency)}
                            </span>
                          </td>
                        </tr>
                      </React.Fragment>
                    ))
                  ) : (
                    (statement.lineItems).map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.accountCode}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.accountName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          <span className={item.isInflow ? 'text-green-600' : 'text-red-600'}>
                            {formatCurrency(item.value, statement.currency)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                  
                  {/* Total Row */}
                  <tr className="bg-gray-900 text-white font-bold">
                    <td colSpan={2} className="px-6 py-4 text-sm">
                      {locale?.startsWith('es') ? 'TOTAL' : 'TOTAL'}
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      {formatCurrency(Math.abs(calculateTotal()), statement.currency)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Metadata */}
            <div className="mt-6 text-sm text-gray-500 text-center">
              <p>
                {locale?.startsWith('es') ? 'Cargado el' : 'Uploaded on'} {new Date(statement.createdAt).toLocaleDateString(locale || 'es-ES')}
                {statement.sourceFile && ` • ${locale?.startsWith('es') ? 'Archivo' : 'File'}: ${statement.sourceFile}`}
              </p>
            </div>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}

export default function FinancialStatementViewerPageWrapper() {
  return <FinancialStatementViewerPage />;
}