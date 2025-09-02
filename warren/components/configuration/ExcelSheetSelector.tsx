'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, FileSpreadsheet, Eye, RefreshCw } from 'lucide-react';
import { useTranslation } from '@/lib/translations';

interface ExcelSheetSelectorProps {
  availableSheets: string[];
  currentSheet: string;
  detectedSheet: string;
  isManualSelection: boolean;
  onSheetChange: (sheet: string) => void;
  loading?: boolean;
}

export function ExcelSheetSelector({
  availableSheets,
  currentSheet,
  detectedSheet,
  isManualSelection,
  onSheetChange,
  loading = false
}: ExcelSheetSelectorProps) {
  const { t } = useTranslation('es');

  if (!availableSheets || availableSheets.length === 0) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <FileSpreadsheet className="h-5 w-5 text-blue-600" />
        <h3 className="font-semibold text-blue-900">
          Selección de Hoja de Excel
        </h3>
        <Badge variant="outline" className="text-xs text-blue-700 border-blue-300">
          {availableSheets.length} hojas disponibles
        </Badge>
      </div>

      {/* Direct sheet selector - no collapse/expand */}
      <div className="space-y-3">
        {/* Current selection status */}
        <div className="flex items-center gap-2 text-sm text-blue-700">
          <span>Hoja actual:</span>
          <span className="font-medium">{currentSheet}</span>
          {isManualSelection ? (
            <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700 border-yellow-300">
              Manual
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 border-green-300">
              Auto-detectada
            </Badge>
          )}
        </div>

        {/* Direct sheet dropdown */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-blue-900">
            Seleccionar hoja:
          </label>
          <div className="flex items-center gap-2">
            <Select value={currentSheet} onValueChange={onSheetChange} disabled={loading}>
              <SelectTrigger className="flex-1 border-blue-300 focus:border-blue-500">
                <SelectValue placeholder="Selecciona una hoja" />
              </SelectTrigger>
              <SelectContent>
                {availableSheets.map((sheet) => (
                  <SelectItem key={sheet} value={sheet}>
                    <div className="flex items-center justify-between w-full">
                      <span>{sheet}</span>
                      {sheet === detectedSheet && !isManualSelection && (
                        <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700 border-green-300 text-xs">
                          Detectada
                        </Badge>
                      )}
                      {sheet === currentSheet && isManualSelection && (
                        <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-700 border-yellow-300 text-xs">
                          Actual
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {loading && (
              <div className="flex items-center gap-2 text-blue-600">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm">Cargando...</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick sheet preview as clickable badges */}
        <div className="text-xs text-blue-600">
          <p className="font-medium mb-2">Acceso rápido:</p>
          <div className="flex flex-wrap gap-1">
            {availableSheets.map((sheet) => (
              <Badge 
                key={sheet} 
                variant="outline" 
                className={`text-xs cursor-pointer transition-colors ${
                  sheet === currentSheet 
                    ? 'bg-blue-100 border-blue-400 text-blue-800' 
                    : 'border-blue-300 text-blue-600 hover:bg-blue-50'
                }`}
                onClick={() => onSheetChange(sheet)}
              >
                {sheet}
                {sheet === detectedSheet && (
                  <span className="ml-1 text-green-600">●</span>
                )}
              </Badge>
            ))}
          </div>
          <p className="mt-1 text-blue-500">
            <span className="text-green-600">●</span> = Hoja detectada automáticamente
          </p>
        </div>
      </div>
    </div>
  );
}