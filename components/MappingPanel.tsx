"use client";

import { useState, useEffect } from "react";
import { 
  XCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from "@heroicons/react/24/outline";
import { ColumnDetection, ColumnMapping } from "@/types";

interface MappingPanelProps {
  selectedColumn: number;
  detection?: ColumnDetection;
  onMappingUpdate: (columnIndex: number, field: string, dataType: string) => void;
  onClose: () => void;
  locale: string;
  statementType?: string;
}

export function MappingPanel({ 
  selectedColumn, 
  detection, 
  onMappingUpdate, 
  onClose, 
  locale,
  statementType = 'profit_loss'
}: MappingPanelProps) {
  const [selectedField, setSelectedField] = useState('');
  const [selectedDataType, setSelectedDataType] = useState('');

  // Reset selections when column changes
  useEffect(() => {
    setSelectedField('');
    setSelectedDataType('');
  }, [selectedColumn]);

  if (!detection) return null;

  // Field options based on statement type
  const getFieldOptions = () => {
    const baseOptions = [
      { value: 'date', label: 'Fecha', dataType: 'date', icon: '📅' },
      { value: 'amount', label: 'Monto', dataType: 'currency', icon: '💰' },
      { value: 'description', label: 'Descripción', dataType: 'text', icon: '📝' },
      { value: 'account_code', label: 'Código de Cuenta', dataType: 'text', icon: '🔢' },
      { value: 'category', label: 'Categoría', dataType: 'category', icon: '🏷️' },
      { value: 'reference', label: 'Referencia', dataType: 'text', icon: '🔗' },
      { value: 'unmapped', label: 'No Mapear', dataType: 'text', icon: '❌' }
    ];

    if (statementType === 'profit_loss') {
      return [
        { value: 'period', label: 'Período', dataType: 'date', icon: '📊' },
        { value: 'account_code', label: 'Código de Cuenta', dataType: 'text', icon: '🔢' },
        { value: 'account_name', label: 'Nombre de Cuenta', dataType: 'text', icon: '📋' },
        { value: 'amount', label: 'Monto', dataType: 'currency', icon: '💰' },
        { value: 'description', label: 'Descripción', dataType: 'text', icon: '📝' },
        { value: 'category', label: 'Categoría', dataType: 'category', icon: '🏷️' },
        ...baseOptions.filter(opt => !['period', 'account_code', 'account_name', 'amount', 'description', 'category'].includes(opt.value))
      ];
    }

    if (statementType === 'cash_flow') {
      return [
        { value: 'period', label: 'Período', dataType: 'date', icon: '📊' },
        { value: 'activity_category', label: 'Categoría de Actividad', dataType: 'category', icon: '🔄' },
        { value: 'activity_description', label: 'Descripción de Actividad', dataType: 'text', icon: '📝' },
        { value: 'cash_amount', label: 'Monto de Efectivo', dataType: 'currency', icon: '💰' },
        ...baseOptions.filter(opt => !['period', 'amount', 'description'].includes(opt.value))
      ];
    }

    return baseOptions;
  };

  const fieldOptions = getFieldOptions();

  const dataTypeOptions = [
    { value: 'date', label: 'Fecha', icon: '📅', description: 'Fechas y períodos' },
    { value: 'currency', label: 'Moneda', icon: '💰', description: 'Montos y valores monetarios' },
    { value: 'number', label: 'Número', icon: '🔢', description: 'Valores numéricos' },
    { value: 'text', label: 'Texto', icon: '📝', description: 'Texto y descripciones' },
    { value: 'category', label: 'Categoría', icon: '🏷️', description: 'Clasificaciones y categorías' }
  ];

  const handleApplyMapping = () => {
    const field = selectedField || fieldOptions.find(opt => opt.value === detection.detectedType)?.value || 'unmapped';
    const dataType = selectedDataType || fieldOptions.find(opt => opt.value === field)?.dataType || 'text';
    onMappingUpdate(selectedColumn, field, dataType);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600 bg-green-50 border-green-200';
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 90) return <CheckCircleIcon className="w-4 h-4" />;
    if (confidence >= 60) return <ExclamationTriangleIcon className="w-4 h-4" />;
    return <XCircleIcon className="w-4 h-4" />;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-lg max-h-[80vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h4 className="text-xl font-semibold text-gray-900">
          Mapeo de Columna
        </h4>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <XCircleIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Column Info */}
      <div className={`p-4 rounded-lg border mb-6 ${getConfidenceColor(detection.confidence)}`}>
        <div className="flex items-center space-x-3 mb-3">
          {getConfidenceIcon(detection.confidence)}
          <div>
            <h5 className="font-semibold">
              {detection.headerText || `Columna ${selectedColumn + 1}`}
            </h5>
            <p className="text-sm opacity-80">
              Detectado como: {detection.detectedType} ({detection.confidence}% confianza)
            </p>
          </div>
        </div>
      </div>

      {/* Sample Values */}
      {detection.sampleValues && detection.sampleValues.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Valores de muestra:
          </label>
          <div className="space-y-2">
            {detection.sampleValues.slice(0, 5).map((value, index) => (
              <div key={index} className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg border">
                <span className="font-mono">{String(value)}</span>
              </div>
            ))}
            {detection.sampleValues.length > 5 && (
              <div className="text-xs text-gray-500 text-center">
                ... y {detection.sampleValues.length - 5} valores más
              </div>
            )}
          </div>
        </div>
      )}

      {/* Field Mapping */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Mapear a campo:
        </label>
        <div className="grid gap-2 max-h-64 overflow-y-auto">
          {fieldOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                setSelectedField(option.value);
                setSelectedDataType(option.dataType);
              }}
              className={`
                p-3 text-left border rounded-lg transition-all hover:bg-gray-50
                ${selectedField === option.value 
                  ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' 
                  : 'border-gray-200'
                }
              `}
            >
              <div className="flex items-center space-x-3">
                <span className="text-lg">{option.icon}</span>
                <div>
                  <div className="font-medium text-gray-900">{option.label}</div>
                  <div className="text-xs text-gray-500 capitalize">{option.dataType}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Data Type Override */}
      {selectedField && selectedField !== 'unmapped' && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Tipo de dato (opcional):
          </label>
          <div className="grid gap-2">
            {dataTypeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedDataType(option.value)}
                className={`
                  p-3 text-left border rounded-lg transition-all hover:bg-gray-50
                  ${selectedDataType === option.value 
                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' 
                    : 'border-gray-200'
                  }
                `}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{option.icon}</span>
                  <div>
                    <div className="font-medium text-gray-900">{option.label}</div>
                    <div className="text-xs text-gray-500">{option.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Issues */}
      {detection.issues && detection.issues.length > 0 && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <InformationCircleIcon className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-sm font-medium text-amber-800 mb-2">
                Problemas detectados:
              </div>
              <ul className="text-sm text-amber-700 space-y-1">
                {detection.issues.map((issue, index) => (
                  <li key={index} className="flex items-start space-x-1">
                    <span>•</span>
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Current Selection Summary */}
      {selectedField && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm">
            <div className="font-medium text-blue-900 mb-1">Mapeo seleccionado:</div>
            <div className="text-blue-700">
              Campo: <span className="font-medium">{fieldOptions.find(f => f.value === selectedField)?.label}</span>
            </div>
            <div className="text-blue-700">
              Tipo: <span className="font-medium">{dataTypeOptions.find(t => t.value === selectedDataType)?.label}</span>
            </div>
          </div>
        </div>
      )}

      {/* Apply Button */}
      <div className="flex space-x-3">
        <button
          onClick={handleApplyMapping}
          className="flex-1 px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Aplicar Mapeo
        </button>
        <button
          onClick={onClose}
          className="px-4 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}