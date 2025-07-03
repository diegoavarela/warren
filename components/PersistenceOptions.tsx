"use client";

import { useState } from "react";
import { 
  BookmarkIcon,
  BuildingOfficeIcon,
  CheckCircleIcon
} from "@heroicons/react/24/outline";
import { ParseResults } from "@/types";

interface PersistenceOptionsProps {
  parseResults: ParseResults;
  onPersist: (companyId: string, saveAsTemplate: boolean, templateName?: string) => void;
  onGoBack: () => void;
  isLoading?: boolean;
}

export function PersistenceOptions({ 
  parseResults, 
  onPersist, 
  onGoBack, 
  isLoading = false 
}: PersistenceOptionsProps) {
  const [companyId, setCompanyId] = useState('');
  const [saveAsTemplate, setSaveAsTemplate] = useState(true);
  const [templateName, setTemplateName] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');

  // Mock companies for demo
  const mockCompanies = [
    { id: 'company-1', name: 'Empresa Demo SA de CV', industry: 'Manufactura' },
    { id: 'company-2', name: 'Comercializadora XYZ', industry: 'Retail' },
    { id: 'company-3', name: 'Servicios Financieros ABC', industry: 'Finanzas' }
  ];

  const handleSubmit = () => {
    if (!selectedCompany) return;
    
    onPersist(
      selectedCompany,
      saveAsTemplate,
      saveAsTemplate ? templateName : undefined
    );
  };

  const canProceed = selectedCompany && (!saveAsTemplate || templateName.trim());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Guardar Datos Financieros
        </h2>
        <p className="text-gray-600">
          Selecciona la empresa y configura las opciones de almacenamiento
        </p>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <CheckCircleIcon className="w-6 h-6 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">Resumen de Datos</h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-gray-500">Registros exitosos</div>
            <div className="text-xl font-bold text-green-600">{parseResults.validRows}</div>
          </div>
          <div>
            <div className="text-gray-500">Tasa de éxito</div>
            <div className="text-xl font-bold text-blue-600">{((parseResults.validRows / parseResults.totalRows) * 100).toFixed(1)}%</div>
          </div>
          <div>
            <div className="text-gray-500">Registros inválidos</div>
            <div className="text-xl font-bold text-red-600">{parseResults.invalidRows}</div>
          </div>
          <div>
            <div className="text-gray-500">Advertencias</div>
            <div className="text-lg font-bold text-yellow-600">
              {parseResults.warnings.length}
            </div>
          </div>
        </div>
      </div>

      {/* Company Selection */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <BuildingOfficeIcon className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Seleccionar Empresa</h3>
        </div>

        <div className="space-y-3">
          {mockCompanies.map((company) => (
            <div
              key={company.id}
              onClick={() => setSelectedCompany(company.id)}
              className={`
                p-4 border-2 rounded-lg cursor-pointer transition-all
                ${selectedCompany === company.id
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-blue-25'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">{company.name}</h4>
                  <p className="text-sm text-gray-500">{company.industry}</p>
                </div>
                <div
                  className={`
                    w-5 h-5 rounded-full border-2 flex items-center justify-center
                    ${selectedCompany === company.id
                      ? 'border-blue-600 bg-blue-600'
                      : 'border-gray-300'
                    }
                  `}
                >
                  {selectedCompany === company.id && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Create New Company Option */}
        <div className="mt-4 p-4 border-2 border-dashed border-gray-300 rounded-lg">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-2">¿No encuentras tu empresa?</p>
            <button className="text-blue-600 text-sm font-medium hover:text-blue-800">
              + Crear nueva empresa
            </button>
          </div>
        </div>
      </div>

      {/* Template Options */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <BookmarkIcon className="w-6 h-6 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">Plantilla de Mapeo</h3>
        </div>

        <div className="space-y-4">
          {/* Save as Template Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="saveTemplate"
                checked={saveAsTemplate}
                onChange={(e) => setSaveAsTemplate(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="saveTemplate" className="font-medium text-gray-900">
                Guardar como plantilla
              </label>
            </div>
            <div className="text-sm text-gray-500">
              Reutilizar este mapeo en futuros archivos
            </div>
          </div>

          {/* Template Name */}
          {saveAsTemplate && (
            <div className="pl-7">
              <label htmlFor="templateName" className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de la plantilla
              </label>
              <input
                type="text"
                id="templateName"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="ej. Estado de Resultados Q1 2024"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500 mt-1">
                Este nombre te ayudará a identificar la plantilla para futuros archivos similares
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Final Summary */}
      <div className="bg-gray-50 border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen Final</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Empresa seleccionada:</span>
            <span className="font-medium">
              {selectedCompany ? mockCompanies.find(c => c.id === selectedCompany)?.name : 'Ninguna'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Registros a guardar:</span>
            <span className="font-medium">{parseResults.validRows}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Plantilla:</span>
            <span className="font-medium">
              {saveAsTemplate ? templateName || 'Sin nombre' : 'No guardar'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Errores:</span>
            <span className="font-medium">{parseResults.errors.length}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center pt-6 border-t">
        <button
          onClick={onGoBack}
          disabled={isLoading}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:text-gray-400 transition-colors"
        >
          ← Volver a validación
        </button>

        <button
          onClick={handleSubmit}
          disabled={!canProceed || isLoading}
          className={`
            px-8 py-3 font-medium rounded-lg transition-all flex items-center space-x-2
            ${canProceed && !isLoading
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              <span>Guardando...</span>
            </>
          ) : (
            <>
              <CheckCircleIcon className="w-5 h-5" />
              <span>Guardar Datos Financieros</span>
            </>
          )}
        </button>
      </div>

      {/* Help Text */}
      <div className="text-center text-sm text-gray-500">
        <p>
          Los datos se almacenarán de forma segura y encriptada.
          <br />
          Podrás acceder a ellos desde el dashboard de la empresa seleccionada.
        </p>
      </div>
    </div>
  );
}