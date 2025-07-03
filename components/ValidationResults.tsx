"use client";

import { useState } from "react";
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  XCircleIcon,
  EyeIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  CalendarIcon
} from "@heroicons/react/24/outline";
import { ParseResults } from "@/types";

interface ValidationResultsProps {
  results: ParseResults;
  onProceed: () => void;
  onGoBack: () => void;
}

export function ValidationResults({ results, onProceed, onGoBack }: ValidationResultsProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'summary' | 'errors' | 'preview'>('summary');

  const successRate = (results.validRows / results.totalRows) * 100;
  const hasErrors = results.errors.length > 0;
  const hasWarnings = results.warnings.length > 0;

  const getStatusColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600';
    if (rate >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusIcon = (rate: number) => {
    if (rate >= 95) return <CheckCircleIcon className="w-8 h-8 text-green-600" />;
    if (rate >= 80) return <ExclamationTriangleIcon className="w-8 h-8 text-yellow-600" />;
    return <XCircleIcon className="w-8 h-8 text-red-600" />;
  };

  const formatCurrency = (amount: number | undefined, currency: string = 'MXN') => {
    if (amount === undefined) return 'N/A';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'N/A';
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Resultados de Validación
        </h2>
        <p className="text-gray-600">
          Revisa el procesamiento de tus datos antes de guardarlos
        </p>
      </div>

      {/* Status Overview */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center justify-center space-x-4 mb-6">
          {getStatusIcon(successRate)}
          <div className="text-center">
            <div className={`text-3xl font-bold ${getStatusColor(successRate)}`}>
              {successRate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500">Tasa de éxito</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Rows */}
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{results.totalRows}</div>
            <div className="text-sm text-blue-700">Filas totales</div>
          </div>

          {/* Successful Rows */}
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{results.validRows}</div>
            <div className="text-sm text-green-700">Procesadas correctamente</div>
          </div>

          {/* Failed Rows */}
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{results.invalidRows}</div>
            <div className="text-sm text-red-700">Con errores</div>
          </div>
        </div>
      </div>


      {/* Issues Summary */}
      {(hasErrors || hasWarnings) && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Problemas Detectados</h3>
          
          <div className="space-y-3">
            {hasErrors && (
              <div className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg">
                <XCircleIcon className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <div className="font-medium text-red-800">
                    {results.errors.length} error(es) encontrado(s)
                  </div>
                  <div className="text-sm text-red-700">
                    Algunas filas no pudieron procesarse correctamente
                  </div>
                </div>
              </div>
            )}

            {hasWarnings && (
              <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <div className="font-medium text-yellow-800">
                    {results.warnings.length} advertencia(s)
                  </div>
                  <div className="text-sm text-yellow-700">
                    Datos procesados con advertencias menores
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detailed View */}
      <div className="bg-white border rounded-lg">
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'summary', name: 'Resumen', icon: ChartBarIcon },
              { id: 'errors', name: 'Errores', icon: XCircleIcon },
              { id: 'preview', name: 'Vista Previa', icon: EyeIcon }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id as any)}
                  className={`
                    flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm
                    ${selectedTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                  {tab.id === 'errors' && (hasErrors || hasWarnings) && (
                    <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                      {results.errors.length + results.warnings.length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {selectedTab === 'summary' && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Estadísticas de Procesamiento</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Filas procesadas:</span>
                  <span className="ml-2 font-medium">{results.validRows} de {results.totalRows}</span>
                </div>
                <div>
                  <span className="text-gray-500">Tasa de éxito:</span>
                  <span className={`ml-2 font-medium ${getStatusColor(successRate)}`}>
                    {successRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {selectedTab === 'errors' && (
            <div className="space-y-4">
              {results.errors.length > 0 && (
                <div>
                  <h4 className="font-medium text-red-800 mb-2">Errores ({results.errors.length})</h4>
                  <div className="space-y-2">
                    {results.errors.slice(0, 10).map((error, index) => (
                      <div key={index} className="text-sm text-red-700 bg-red-50 p-2 rounded">
                        {error}
                      </div>
                    ))}
                    {results.errors.length > 10 && (
                      <div className="text-sm text-red-600">
                        Y {results.errors.length - 10} errores más...
                      </div>
                    )}
                  </div>
                </div>
              )}

              {results.warnings.length > 0 && (
                <div>
                  <h4 className="font-medium text-yellow-800 mb-2">Advertencias ({results.warnings.length})</h4>
                  <div className="space-y-2">
                    {results.warnings.slice(0, 5).map((warning, index) => (
                      <div key={index} className="text-sm text-yellow-700 bg-yellow-50 p-2 rounded">
                        {warning}
                      </div>
                    ))}
                    {results.warnings.length > 5 && (
                      <div className="text-sm text-yellow-600">
                        Y {results.warnings.length - 5} advertencias más...
                      </div>
                    )}
                  </div>
                </div>
              )}

              {results.errors.length === 0 && results.warnings.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircleIcon className="w-12 h-12 mx-auto mb-2 text-green-600" />
                  <p>No se encontraron errores ni advertencias</p>
                </div>
              )}
            </div>
          )}

          {selectedTab === 'preview' && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">
                Vista Previa de Datos Procesados (primeros 5 registros)
              </h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Fila
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Datos Procesados
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {results.data.slice(0, 5).map((row, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2 text-sm text-gray-900">{row.rowIndex}</td>
                        <td className="px-3 py-2 text-sm text-gray-600">
                          <div className="max-w-xs truncate">
                            {JSON.stringify(row.data)}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-sm">
                          {row.issues && row.issues.length > 0 ? (
                            <span className="text-red-600">Con problemas</span>
                          ) : (
                            <span className="text-green-600">OK</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center pt-6 border-t">
        <button
          onClick={onGoBack}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          ← Volver al mapeo
        </button>

        <div className="flex items-center space-x-4">
          {successRate < 80 && (
            <div className="text-sm text-red-600">
              ⚠️ Tasa de éxito baja. Considera revisar el mapeo.
            </div>
          )}
          <button
            onClick={onProceed}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Proceder a Guardar →
          </button>
        </div>
      </div>
    </div>
  );
}