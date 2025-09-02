"use client";

import { useState, useMemo } from "react";
import { 
  CheckIcon,
  XMarkIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  DocumentTextIcon,
  HashtagIcon
} from "@heroicons/react/24/outline";

interface SimpleExcelMapperProps {
  rawData: any[][];
  onMappingComplete: (mapping: SimpleMapping) => void;
  locale: string;
}

export interface SimpleMapping {
  headerRow: number;
  dataStartRow: number;
  dataEndRow: number;
  columns: {
    index: number;
    role: 'account_code' | 'account_name' | 'period' | 'ignore';
    dataType: 'text' | 'number' | 'currency' | 'date';
    periodName?: string; // For period columns
  }[];
  currency: string;
  dateFormat: string;
}

type MappingMode = 'identify_headers' | 'identify_accounts' | 'identify_periods' | 'confirm';

export function SimpleExcelMapper({
  rawData,
  onMappingComplete,
  locale
}: SimpleExcelMapperProps) {
  const [mode, setMode] = useState<MappingMode>('identify_headers');
  const [headerRow, setHeaderRow] = useState<number>(-1);
  const [mapping, setMapping] = useState<SimpleMapping>({
    headerRow: -1,
    dataStartRow: -1,
    dataEndRow: rawData.length - 1,
    columns: [],
    currency: '',
    dateFormat: 'DD/MM/YYYY'
  });
  const [selectedCurrency, setSelectedCurrency] = useState<string>('');
  const [hoveredCell, setHoveredCell] = useState<{row: number, col: number} | null>(null);

  const maxCols = Math.max(...rawData.map(row => row?.length || 0));
  const visibleRows = Math.min(30, rawData.length);

  // Common currencies
  const currencies = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
    { code: 'ARS', symbol: '$', name: 'Argentine Peso' },
    { code: 'COP', symbol: '$', name: 'Colombian Peso' },
    { code: 'CLP', symbol: '$', name: 'Chilean Peso' },
    { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol' },
  ];

  const handleHeaderRowClick = (rowIndex: number) => {
    if (mode !== 'identify_headers') return;
    
    setHeaderRow(rowIndex);
    setMapping(prev => ({
      ...prev,
      headerRow: rowIndex,
      dataStartRow: rowIndex + 1,
      columns: Array.from({ length: maxCols }, (_, i) => ({
        index: i,
        role: 'ignore' as const,
        dataType: 'text' as const
      }))
    }));
  };

  const handleColumnClick = (colIndex: number) => {
    if (headerRow === -1) return;

    if (mode === 'identify_accounts') {
      // Toggle between account_code, account_name, and ignore
      setMapping(prev => {
        const newColumns = [...prev.columns];
        const current = newColumns[colIndex];
        
        if (current.role === 'ignore') {
          // Check if it looks like a code (short, numeric-ish)
          const sampleValue = rawData[headerRow + 1]?.[colIndex];
          if (sampleValue && (typeof sampleValue === 'number' || /^\d+$/.test(String(sampleValue)))) {
            current.role = 'account_code';
          } else {
            current.role = 'account_name';
          }
          current.dataType = 'text';
        } else if (current.role === 'account_code') {
          current.role = 'account_name';
        } else if (current.role === 'account_name') {
          current.role = 'ignore';
        }
        
        return { ...prev, columns: newColumns };
      });
    } else if (mode === 'identify_periods') {
      // Toggle between period and ignore
      setMapping(prev => {
        const newColumns = [...prev.columns];
        const current = newColumns[colIndex];
        
        if (current.role === 'ignore' || current.role === 'account_code' || current.role === 'account_name') {
          current.role = 'period';
          current.dataType = 'currency';
          current.periodName = String(rawData[headerRow][colIndex] || `Period ${colIndex + 1}`);
        } else {
          current.role = 'ignore';
          delete current.periodName;
        }
        
        return { ...prev, columns: newColumns };
      });
    }
  };

  const getColumnColor = (colIndex: number) => {
    const column = mapping.columns[colIndex];
    if (!column) return '';
    
    switch (column.role) {
      case 'account_code': return 'bg-blue-100 border-blue-300';
      case 'account_name': return 'bg-green-100 border-green-300';
      case 'period': return 'bg-purple-100 border-purple-300';
      default: return 'bg-gray-50';
    }
  };

  const getColumnIcon = (role: string) => {
    switch (role) {
      case 'account_code': return <HashtagIcon className="w-4 h-4" />;
      case 'account_name': return <DocumentTextIcon className="w-4 h-4" />;
      case 'period': return <CalendarIcon className="w-4 h-4" />;
      default: return null;
    }
  };

  const canProceed = () => {
    switch (mode) {
      case 'identify_headers':
        return headerRow !== -1;
      case 'identify_accounts':
        return mapping.columns.some(c => c.role === 'account_code' || c.role === 'account_name');
      case 'identify_periods':
        return mapping.columns.some(c => c.role === 'period') && selectedCurrency !== '';
      case 'confirm':
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    switch (mode) {
      case 'identify_headers':
        setMode('identify_accounts');
        break;
      case 'identify_accounts':
        setMode('identify_periods');
        break;
      case 'identify_periods':
        setMapping(prev => ({ ...prev, currency: selectedCurrency }));
        setMode('confirm');
        break;
      case 'confirm':
        onMappingComplete(mapping);
        break;
    }
  };

  const prevStep = () => {
    switch (mode) {
      case 'identify_accounts':
        setMode('identify_headers');
        break;
      case 'identify_periods':
        setMode('identify_accounts');
        break;
      case 'confirm':
        setMode('identify_periods');
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">Configurar Mapeo de Datos</h3>
          <div className="flex space-x-2">
            {(['identify_headers', 'identify_accounts', 'identify_periods', 'confirm'] as const).map((step, index) => (
              <div
                key={step}
                className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm font-medium ${
                  mode === step ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                <span>{index + 1}</span>
                <span>
                  {step === 'identify_headers' ? 'Encabezados' :
                   step === 'identify_accounts' ? 'Cuentas' :
                   step === 'identify_periods' ? 'Períodos' : 'Confirmar'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          {mode === 'identify_headers' && (
            <div>
              <h4 className="font-medium text-blue-900 mb-2">Paso 1: ¿Cuál fila contiene los encabezados?</h4>
              <p className="text-sm text-blue-800">
                Haz clic en la fila que contiene los títulos de las columnas (ej: "Cuenta", "Descripción", "Enero 2024", etc.)
              </p>
            </div>
          )}
          
          {mode === 'identify_accounts' && (
            <div>
              <h4 className="font-medium text-blue-900 mb-2">Paso 2: ¿Qué columnas contienen información de cuentas?</h4>
              <p className="text-sm text-blue-800">
                Haz clic en las columnas que contienen códigos de cuenta o nombres/descripciones. 
                Puedes hacer clic varias veces para cambiar el tipo.
              </p>
              <div className="mt-2 flex items-center space-x-4 text-xs">
                <span className="flex items-center space-x-1">
                  <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
                  <span>= Código</span>
                </span>
                <span className="flex items-center space-x-1">
                  <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                  <span>= Nombre/Descripción</span>
                </span>
              </div>
            </div>
          )}
          
          {mode === 'identify_periods' && (
            <div>
              <h4 className="font-medium text-blue-900 mb-2">Paso 3: ¿Qué columnas contienen datos financieros?</h4>
              <p className="text-sm text-blue-800">
                Haz clic en las columnas que contienen montos (ej: columnas de meses, trimestres o años).
                También selecciona la moneda de tus datos.
              </p>
            </div>
          )}
          
          {mode === 'confirm' && (
            <div>
              <h4 className="font-medium text-blue-900 mb-2">Paso 4: Revisa tu configuración</h4>
              <p className="text-sm text-blue-800">
                Verifica que el mapeo sea correcto antes de continuar.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Currency Selection (for periods step) */}
      {mode === 'identify_periods' && (
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Selecciona la moneda de tus datos:</h4>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
            {currencies.map(currency => (
              <button
                key={currency.code}
                onClick={() => setSelectedCurrency(currency.code)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  selectedCurrency === currency.code
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-lg font-bold">{currency.symbol}</div>
                <div className="text-xs text-gray-600">{currency.code}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Excel Preview */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50">
                  #
                </th>
                {Array.from({ length: maxCols }).map((_, colIndex) => (
                  <th key={colIndex} className="px-3 py-2 min-w-[120px]">
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-gray-500 uppercase">
                        {String.fromCharCode(65 + colIndex)}
                      </div>
                      {headerRow !== -1 && (mode === 'identify_accounts' || mode === 'identify_periods') && (
                        <button
                          onClick={() => handleColumnClick(colIndex)}
                          className={`w-full px-2 py-1 rounded text-xs font-medium transition-colors ${
                            getColumnColor(colIndex)
                          } border`}
                        >
                          <div className="flex items-center justify-center space-x-1">
                            {getColumnIcon(mapping.columns[colIndex]?.role)}
                            <span>
                              {mapping.columns[colIndex]?.role === 'account_code' ? 'Código' :
                               mapping.columns[colIndex]?.role === 'account_name' ? 'Nombre' :
                               mapping.columns[colIndex]?.role === 'period' ? 'Período' : 'Clic para marcar'}
                            </span>
                          </div>
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            
            <tbody>
              {rawData.slice(0, visibleRows).map((row, rowIndex) => (
                <tr 
                  key={rowIndex}
                  onClick={() => handleHeaderRowClick(rowIndex)}
                  onMouseEnter={() => setHoveredCell({ row: rowIndex, col: -1 })}
                  onMouseLeave={() => setHoveredCell(null)}
                  className={`
                    ${mode === 'identify_headers' ? 'cursor-pointer hover:bg-blue-50' : ''}
                    ${rowIndex === headerRow ? 'bg-yellow-100 font-semibold' : ''}
                  `}
                >
                  <td className="px-3 py-2 text-sm font-mono text-gray-500 sticky left-0 bg-white">
                    <div className="flex items-center space-x-2">
                      <span>{rowIndex + 1}</span>
                      {rowIndex === headerRow && (
                        <span className="text-xs bg-yellow-500 text-white px-1 rounded">ENCABEZADOS</span>
                      )}
                    </div>
                  </td>
                  
                  {Array.from({ length: maxCols }).map((_, colIndex) => {
                    const cellValue = row?.[colIndex];
                    const columnMapping = mapping.columns[colIndex];
                    
                    return (
                      <td 
                        key={colIndex}
                        onMouseEnter={() => setHoveredCell({ row: rowIndex, col: colIndex })}
                        onMouseLeave={() => setHoveredCell(null)}
                        className={`
                          px-3 py-2 text-sm border-l
                          ${columnMapping && rowIndex > headerRow ? getColumnColor(colIndex) : ''}
                          ${hoveredCell?.row === rowIndex && hoveredCell?.col === colIndex ? 'bg-gray-100' : ''}
                        `}
                      >
                        <div className="truncate max-w-[150px]">
                          {cellValue !== null && cellValue !== undefined ? (
                            <span className={typeof cellValue === 'number' ? 'font-mono' : ''}>
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
              ))}
            </tbody>
          </table>
        </div>
        
        {rawData.length > visibleRows && (
          <div className="bg-gray-50 px-4 py-3 border-t text-center">
            <p className="text-sm text-gray-600">
              Mostrando {visibleRows} de {rawData.length} filas
            </p>
          </div>
        )}
      </div>

      {/* Summary for confirm step */}
      {mode === 'confirm' && (
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Resumen de Configuración</h4>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <CheckIcon className="w-5 h-5 text-green-600" />
              <span className="text-sm">
                <strong>Fila de encabezados:</strong> Fila {headerRow + 1}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckIcon className="w-5 h-5 text-green-600" />
              <span className="text-sm">
                <strong>Columnas de cuentas:</strong> {
                  mapping.columns
                    .filter(c => c.role === 'account_code' || c.role === 'account_name')
                    .map(c => String.fromCharCode(65 + c.index))
                    .join(', ')
                }
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckIcon className="w-5 h-5 text-green-600" />
              <span className="text-sm">
                <strong>Columnas de períodos:</strong> {
                  mapping.columns
                    .filter(c => c.role === 'period')
                    .map(c => `${String.fromCharCode(65 + c.index)} (${c.periodName})`)
                    .join(', ')
                }
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
              <span className="text-sm">
                <strong>Moneda:</strong> {mapping.currency}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={prevStep}
          disabled={mode === 'identify_headers'}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          ← Anterior
        </button>
        
        <button
          onClick={nextStep}
          disabled={!canProceed()}
          className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {mode === 'confirm' ? 'Confirmar y Continuar' : 'Siguiente →'}
        </button>
      </div>
    </div>
  );
}