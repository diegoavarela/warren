"use client";

import { useState } from "react";
import { DocumentIcon, PlayIcon } from "@heroicons/react/24/outline";
import { ExcelSheet } from "@/types";

interface SheetSelectorProps {
  sheets: ExcelSheet[];
  onSheetSelected: (sheetName: string) => void;
  isLoading?: boolean;
}

export function SheetSelector({ sheets, onSheetSelected, isLoading = false }: SheetSelectorProps) {
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);

  const handleSelectSheet = (sheetName: string) => {
    setSelectedSheet(sheetName);
  };

  const handleProceed = () => {
    if (selectedSheet) {
      onSheetSelected(selectedSheet);
    }
  };

  // Filter sheets with data
  const validSheets = sheets.filter(sheet => sheet.hasData);
  const emptySheets = sheets.filter(sheet => !sheet.hasData);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Seleccionar Hoja de Cálculo
        </h2>
        <p className="text-gray-600">
          Elige la hoja que contiene los datos financieros a procesar
        </p>
      </div>

      {/* Valid Sheets */}
      {validSheets.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Hojas con datos ({validSheets.length})
          </h3>
          <div className="grid gap-3">
            {validSheets.map((sheet) => (
              <div
                key={sheet.name}
                onClick={() => handleSelectSheet(sheet.name)}
                className={`
                  p-4 border-2 rounded-lg cursor-pointer transition-all
                  ${selectedSheet === sheet.name
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-25'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <DocumentIcon className="w-6 h-6 text-blue-600" />
                    <div>
                      <h4 className="font-medium text-gray-900">{sheet.name}</h4>
                      <p className="text-sm text-gray-500">
                        {sheet.rows.toLocaleString()} filas • {sheet.cols} columnas
                      </p>
                    </div>
                  </div>
                  
                  {/* Preview indicators */}
                  <div className="flex items-center space-x-3">
                    {/* Data type indicators */}
                    <div className="hidden md:flex space-x-2">
                      {detectSheetType(sheet.name).map((type, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                    
                    {/* Selection indicator */}
                    <div
                      className={`
                        w-5 h-5 rounded-full border-2 flex items-center justify-center
                        ${selectedSheet === sheet.name
                          ? 'border-blue-600 bg-blue-600'
                          : 'border-gray-300'
                        }
                      `}
                    >
                      {selectedSheet === sheet.name && (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Preview data if available */}
                {sheet.preview && sheet.preview.length > 0 && selectedSheet === sheet.name && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-2">Vista previa:</p>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <tbody className="space-y-1">
                          {sheet.preview.slice(0, 3).map((row, rowIndex) => (
                            <tr key={rowIndex}>
                              {row.slice(0, 5).map((cell, cellIndex) => (
                                <td
                                  key={cellIndex}
                                  className="px-2 py-1 text-gray-600 border-r border-gray-200 last:border-r-0"
                                >
                                  <div className="max-w-[100px] truncate">
                                    {cell || '—'}
                                  </div>
                                </td>
                              ))}
                              {row.length > 5 && (
                                <td className="px-2 py-1 text-gray-400">
                                  ... +{row.length - 5} más
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty Sheets */}
      {emptySheets.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-500 mb-3">
            Hojas sin datos ({emptySheets.length})
          </h3>
          <div className="grid gap-2">
            {emptySheets.map((sheet) => (
              <div
                key={sheet.name}
                className="p-3 border border-gray-100 rounded-lg bg-gray-50"
              >
                <div className="flex items-center space-x-3">
                  <DocumentIcon className="w-5 h-5 text-gray-400" />
                  <div>
                    <h4 className="font-medium text-gray-500">{sheet.name}</h4>
                    <p className="text-sm text-gray-400">
                      {sheet.rows} filas • {sheet.cols} columnas • Sin datos útiles
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="flex justify-center pt-6 border-t">
        <button
          onClick={handleProceed}
          disabled={!selectedSheet || isLoading}
          className={`
            flex items-center space-x-2 px-6 py-3 font-medium rounded-lg transition-all
            ${selectedSheet && !isLoading
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              <span>Analizando...</span>
            </>
          ) : (
            <>
              <PlayIcon className="w-4 h-4" />
              <span>Analizar Hoja Seleccionada</span>
            </>
          )}
        </button>
      </div>

      {/* Help Text */}
      <div className="text-center text-sm text-gray-500">
        <p>
          Selecciona la hoja que contiene tus estados financieros.
          <br />
          El sistema detectará automáticamente el tipo y estructura de los datos.
        </p>
      </div>
    </div>
  );
}

export default SheetSelector;

function detectSheetType(sheetName: string): string[] {
  const name = sheetName.toLowerCase();
  const types: string[] = [];

  if (name.includes('resultado') || name.includes('p&l') || name.includes('income')) {
    types.push('P&L');
  }
  if (name.includes('flujo') || name.includes('cash') || name.includes('efectivo')) {
    types.push('Flujo de Efectivo');
  }
  if (name.includes('balance') || name.includes('situacion') || name.includes('position')) {
    types.push('Balance');
  }
  if (name.includes('datos') || name.includes('data')) {
    types.push('Datos');
  }

  return types.length > 0 ? types : ['General'];
}