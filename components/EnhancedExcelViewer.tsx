"use client";

import { useState, useMemo } from "react";
import { 
  ChevronDownIcon,
  ChevronUpIcon,
  XMarkIcon,
  CheckIcon,
  ArrowPathIcon
} from "@heroicons/react/24/outline";
import { ColumnDetection, ColumnMapping } from "@/types";

interface EnhancedExcelViewerProps {
  rawData: any[][];
  excelMetadata?: {
    headers: string[];
    data: any[][];
    metadata: {
      totalRows: number;
      totalCols: number;
      headerRow: number;
      dataStartRow: number;
      dataEndRow: number;
    };
  };
  columnDetections: ColumnDetection[];
  currentMappings: ColumnMapping[];
  onMappingChange: (columnIndex: number, mapping: Partial<ColumnMapping>) => void;
  locale: string;
  statementType?: string;
}

export function EnhancedExcelViewer({
  rawData,
  excelMetadata,
  columnDetections,
  currentMappings,
  onMappingChange,
  locale,
  statementType = 'profit_loss'
}: EnhancedExcelViewerProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set([0, 1, 2, 3, 4]));
  const [selectedColumns, setSelectedColumns] = useState<Set<number>>(new Set());
  const [showAllRows, setShowAllRows] = useState(false);
  const [mappingMode, setMappingMode] = useState<'ai' | 'manual'>('manual');

  // Use actual Excel data if available, otherwise fall back to raw data
  const displayData = useMemo(() => {
    if (excelMetadata) {
      return excelMetadata.data;
    }
    return rawData;
  }, [rawData, excelMetadata]);

  const allData = useMemo(() => {
    if (excelMetadata?.metadata) {
      return rawData;
    }
    return rawData;
  }, [rawData, excelMetadata]);

  // Get field mapping options based on statement type
  const getFieldOptions = () => {
    const baseOptions = [
      { value: 'unmapped', label: 'No mapear', icon: '❌', description: 'Ignorar esta columna' }
    ];

    if (statementType === 'profit_loss') {
      return [
        { value: 'period', label: 'Período/Fecha', icon: '📅', description: 'Mes, trimestre o año' },
        { value: 'account_code', label: 'Código de Cuenta', icon: '🔢', description: 'Número de cuenta contable' },
        { value: 'account_name', label: 'Nombre de Cuenta', icon: '📋', description: 'Descripción de la cuenta' },
        { value: 'amount', label: 'Monto', icon: '💰', description: 'Valor monetario' },
        { value: 'description', label: 'Descripción/Notas', icon: '📝', description: 'Información adicional' },
        { value: 'category', label: 'Categoría', icon: '🏷️', description: 'Clasificación de cuenta' },
        ...baseOptions
      ];
    } else if (statementType === 'cash_flow') {
      return [
        { value: 'period', label: 'Período', icon: '📅', description: 'Período del flujo' },
        { value: 'activity_category', label: 'Tipo de Actividad', icon: '🔄', description: 'Operación/Inversión/Financiamiento' },
        { value: 'activity_description', label: 'Descripción', icon: '📝', description: 'Detalle de la actividad' },
        { value: 'cash_amount', label: 'Monto de Efectivo', icon: '💵', description: 'Entrada/Salida de efectivo' },
        ...baseOptions
      ];
    } else {
      return [
        { value: 'as_of_date', label: 'Fecha del Balance', icon: '📅', description: 'Fecha de corte' },
        { value: 'account_code', label: 'Código de Cuenta', icon: '🔢', description: 'Número de cuenta' },
        { value: 'account_name', label: 'Nombre de Cuenta', icon: '📋', description: 'Descripción' },
        { value: 'balance', label: 'Saldo', icon: '💰', description: 'Monto del balance' },
        { value: 'account_type', label: 'Tipo de Cuenta', icon: '🏷️', description: 'Activo/Pasivo/Patrimonio' },
        ...baseOptions
      ];
    }
  };

  const fieldOptions = getFieldOptions();

  const toggleRow = (rowIndex: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowIndex)) {
      newExpanded.delete(rowIndex);
    } else {
      newExpanded.add(rowIndex);
    }
    setExpandedRows(newExpanded);
  };

  const toggleColumn = (colIndex: number) => {
    const newSelected = new Set(selectedColumns);
    if (newSelected.has(colIndex)) {
      newSelected.delete(colIndex);
    } else {
      newSelected.add(colIndex);
    }
    setSelectedColumns(newSelected);
  };

  const handleFieldChange = (colIndex: number, field: string) => {
    const fieldOption = fieldOptions.find(f => f.value === field);
    const dataType = field === 'unmapped' ? 'text' : 
                    field.includes('amount') || field.includes('balance') ? 'currency' :
                    field.includes('date') || field.includes('period') ? 'date' :
                    field.includes('code') ? 'text' :
                    field.includes('category') || field.includes('type') ? 'category' : 'text';
    
    onMappingChange(colIndex, {
      targetField: field,
      dataType: dataType as any,
      confidence: 100 // Manual mapping has 100% confidence
    });
  };

  const getCurrentMapping = (colIndex: number) => {
    const mapping = currentMappings.find(m => m.columnIndex === colIndex);
    return mapping?.targetField || 'unmapped';
  };

  const maxCols = Math.max(...allData.map(row => row.length));
  const visibleRows = showAllRows ? allData.length : Math.min(20, allData.length);

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Vista Completa del Excel</h3>
            <p className="text-sm text-gray-600 mt-1">
              {allData.length} filas × {maxCols} columnas
              {excelMetadata?.metadata && ` • Encabezados en fila ${excelMetadata.metadata.headerRow + 1}`}
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Modo:</span>
              <button
                onClick={() => setMappingMode('ai')}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  mappingMode === 'ai' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🤖 IA Asistida
              </button>
              <button
                onClick={() => setMappingMode('manual')}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  mappingMode === 'manual' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                ✋ Manual
              </button>
            </div>
            
            <button
              onClick={() => setShowAllRows(!showAllRows)}
              className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              {showAllRows ? 'Mostrar menos' : `Ver todas las filas (${allData.length})`}
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            <strong>Instrucciones:</strong> Selecciona qué representa cada columna usando los menús desplegables. 
            La IA ha sugerido algunos mapeos, pero puedes cambiarlos según tus necesidades.
          </p>
        </div>
      </div>

      {/* Excel Data Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            {/* Column Mapping Row */}
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase w-16">
                  Fila
                </th>
                {Array.from({ length: maxCols }).map((_, colIndex) => (
                  <th key={colIndex} className="px-3 py-4 min-w-[200px]">
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-gray-500 uppercase">
                        Columna {String.fromCharCode(65 + colIndex)}
                      </div>
                      
                      {/* Field Selector */}
                      <select
                        value={getCurrentMapping(colIndex)}
                        onChange={(e) => handleFieldChange(colIndex, e.target.value)}
                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          getCurrentMapping(colIndex) === 'unmapped' 
                            ? 'bg-gray-50 text-gray-500' 
                            : 'bg-blue-50 text-blue-900 font-medium'
                        }`}
                      >
                        {fieldOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.icon} {option.label}
                          </option>
                        ))}
                      </select>

                      {/* AI Suggestion */}
                      {mappingMode === 'ai' && columnDetections[colIndex] && (
                        <div className={`text-xs px-2 py-1 rounded ${
                          columnDetections[colIndex].confidence >= 80 
                            ? 'bg-green-100 text-green-700' 
                            : columnDetections[colIndex].confidence >= 60
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          IA: {columnDetections[colIndex].detectedType} ({columnDetections[colIndex].confidence}%)
                        </div>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Data Rows */}
            <tbody className="divide-y divide-gray-200">
              {allData.slice(0, visibleRows).map((row, rowIndex) => {
                const isExpanded = expandedRows.has(rowIndex);
                const isHeaderRow = excelMetadata?.metadata?.headerRow === rowIndex;
                
                return (
                  <tr 
                    key={rowIndex} 
                    className={`
                      hover:bg-gray-50 transition-colors
                      ${isHeaderRow ? 'bg-yellow-50 font-medium' : ''}
                    `}
                  >
                    <td className="px-3 py-2 text-sm text-gray-500 font-mono">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => toggleRow(rowIndex)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {isExpanded ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                        </button>
                        <span>{rowIndex + 1}</span>
                        {isHeaderRow && (
                          <span className="text-xs bg-yellow-200 text-yellow-800 px-1 rounded">HDR</span>
                        )}
                      </div>
                    </td>
                    
                    {Array.from({ length: maxCols }).map((_, colIndex) => {
                      const cellValue = row[colIndex];
                      const isSelected = selectedColumns.has(colIndex);
                      const mapping = getCurrentMapping(colIndex);
                      
                      return (
                        <td 
                          key={colIndex}
                          onClick={() => toggleColumn(colIndex)}
                          className={`
                            px-3 py-2 text-sm cursor-pointer transition-colors
                            ${isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''}
                            ${mapping !== 'unmapped' ? 'bg-green-50' : ''}
                          `}
                        >
                          <div className={isExpanded ? '' : 'truncate max-w-[200px]'}>
                            {cellValue !== null && cellValue !== undefined ? (
                              <span className={`
                                ${typeof cellValue === 'number' ? 'font-mono text-right' : ''}
                                ${isHeaderRow ? 'font-semibold' : ''}
                              `}>
                                {String(cellValue)}
                              </span>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {!showAllRows && allData.length > visibleRows && (
          <div className="bg-gray-50 px-4 py-3 border-t text-center">
            <p className="text-sm text-gray-600">
              Mostrando {visibleRows} de {allData.length} filas
            </p>
          </div>
        )}
      </div>

      {/* Mapping Summary */}
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Resumen del Mapeo</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {currentMappings.filter(m => m.targetField !== 'unmapped').map((mapping) => {
            const fieldOption = fieldOptions.find(f => f.value === mapping.targetField);
            const colLetter = String.fromCharCode(65 + mapping.columnIndex);
            
            return (
              <div 
                key={mapping.columnIndex}
                className="flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-lg"
              >
                <span className="text-lg">{fieldOption?.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {fieldOption?.label}
                  </div>
                  <div className="text-xs text-gray-500">
                    Columna {colLetter}
                  </div>
                </div>
                <CheckIcon className="w-4 h-4 text-green-600 flex-shrink-0" />
              </div>
            );
          })}
        </div>
        
        {currentMappings.filter(m => m.targetField !== 'unmapped').length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">
            No has mapeado ninguna columna todavía. Selecciona qué representa cada columna en los menús desplegables arriba.
          </p>
        )}
      </div>
    </div>
  );
}