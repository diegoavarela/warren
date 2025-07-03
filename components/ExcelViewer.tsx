"use client";

import { useState, useMemo } from "react";
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  XCircleIcon,
  AdjustmentsHorizontalIcon,
  EyeIcon,
  EyeSlashIcon
} from "@heroicons/react/24/outline";
import { ExcelViewerProps, ColumnDetection, ColumnMapping, ConfidenceLevel } from "@/types";
import { MappingPanel } from "./MappingPanel";

export function ExcelViewer({
  data,
  headers = [],
  columnDetections,
  onMappingChange,
  locale,
  maxRows = 20,
  maxCols = 10,
  highlightIssues = true
}: ExcelViewerProps) {
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null);
  const [showMappingPanel, setShowMappingPanel] = useState(true);
  const [visibleRows, setVisibleRows] = useState(maxRows);

  // Truncate data for display
  const displayData = useMemo(() => {
    const truncatedData = data.slice(0, visibleRows);
    return truncatedData.map(row => row.slice(0, maxCols));
  }, [data, visibleRows, maxCols]);

  const displayHeaders = headers.slice(0, maxCols);

  const getConfidenceLevel = (confidence: number): ConfidenceLevel => {
    if (confidence >= 90) return 'high';
    if (confidence >= 60) return 'medium';
    return 'low';
  };

  const getConfidenceColor = (confidence: number) => {
    const level = getConfidenceLevel(confidence);
    switch (level) {
      case 'high': return 'border-l-green-500 bg-green-50';
      case 'medium': return 'border-l-yellow-500 bg-yellow-50';
      case 'low': return 'border-l-red-500 bg-red-50';
    }
  };

  const getConfidenceIcon = (confidence: number) => {
    const level = getConfidenceLevel(confidence);
    const iconClass = "w-4 h-4";
    
    switch (level) {
      case 'high': return <CheckCircleIcon className={`${iconClass} text-green-600`} />;
      case 'medium': return <ExclamationTriangleIcon className={`${iconClass} text-yellow-600`} />;
      case 'low': return <XCircleIcon className={`${iconClass} text-red-600`} />;
    }
  };

  const handleColumnClick = (columnIndex: number) => {
    setSelectedColumn(columnIndex === selectedColumn ? null : columnIndex);
  };

  const handleMappingUpdate = (columnIndex: number, field: string, dataType: string) => {
    console.log('Mapping update:', { columnIndex, field, dataType });
    
    const currentDetection = columnDetections.find(d => d.columnIndex === columnIndex);
    console.log('Current detection:', currentDetection);

    const updatedMapping: Partial<ColumnMapping> = {
      targetField: field,
      dataType: dataType as any,
      confidence: field === 'unmapped' ? 0 : 95
    };

    console.log('Updated mapping:', updatedMapping);
    onMappingChange(columnIndex, updatedMapping);
    setSelectedColumn(null);
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Vista previa del archivo Excel
          </h3>
          <div className="text-sm text-gray-500">
            {data.length} filas × {headers.length} columnas
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowMappingPanel(!showMappingPanel)}
            className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {showMappingPanel ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
            <span>{showMappingPanel ? 'Ocultar' : 'Mostrar'} mapeo</span>
          </button>
          
          {data.length > maxRows && (
            <button
              onClick={() => setVisibleRows(prev => prev === maxRows ? data.length : maxRows)}
              className="px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              {visibleRows === maxRows ? 'Ver todo' : 'Ver menos'}
            </button>
          )}
        </div>
      </div>

      {/* Confidence Legend */}
      <div className="flex items-center space-x-6 p-3 bg-gray-50 rounded-lg text-sm">
        <span className="font-medium text-gray-700">Confianza del mapeo:</span>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-gray-600">Alta (90-100%)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <span className="text-gray-600">Media (60-89%)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span className="text-gray-600">Baja (&lt;60%)</span>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Excel Table */}
        <div className="flex-1">
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto excel-scrollbar">
              <table className="min-w-full divide-y divide-gray-200">
                {/* Headers */}
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                      #
                    </th>
                    {displayHeaders.map((header, index) => {
                      const detection = columnDetections.find(d => d.columnIndex === index);
                      const confidence = detection?.confidence || 0;
                      const isSelected = selectedColumn === index;
                      
                      return (
                        <th
                          key={index}
                          onClick={() => handleColumnClick(index)}
                          className={`
                            px-3 py-2 text-left text-xs font-medium text-gray-900 uppercase tracking-wider cursor-pointer
                            transition-all border-l-4 min-w-[120px]
                            ${getConfidenceColor(confidence)}
                            ${isSelected ? 'ring-2 ring-blue-500 ring-inset' : ''}
                            hover:bg-opacity-75
                          `}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 truncate">
                                {header || `Columna ${index + 1}`}
                              </div>
                              {detection && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {detection.detectedType} ({confidence}%)
                                </div>
                              )}
                            </div>
                            <div className="ml-2 flex-shrink-0">
                              {getConfidenceIcon(confidence)}
                            </div>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                {/* Data Rows */}
                <tbody className="bg-white divide-y divide-gray-200">
                  {displayData.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-sm text-gray-500 font-mono">
                        {rowIndex + 1}
                      </td>
                      {row.map((cell, cellIndex) => {
                        const detection = columnDetections.find(d => d.columnIndex === cellIndex);
                        const hasIssues = detection?.issues && detection.issues.length > 0;
                        
                        return (
                          <td
                            key={cellIndex}
                            className={`
                              px-3 py-2 text-sm text-gray-900 border-l-4 border-l-transparent
                              ${selectedColumn === cellIndex ? 'bg-blue-50' : ''}
                              ${hasIssues && highlightIssues ? 'bg-red-50' : ''}
                            `}
                            title={hasIssues ? detection?.issues.join(', ') : undefined}
                          >
                            <div className="max-w-[200px] truncate">
                              {cell !== null && cell !== undefined ? String(cell) : ''}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {data.length > visibleRows && (
            <div className="mt-3 text-center">
              <p className="text-sm text-gray-500">
                Mostrando {visibleRows} de {data.length} filas
              </p>
            </div>
          )}
        </div>

        {/* Mapping Panel */}
        {showMappingPanel && selectedColumn !== null && (
          <div className="w-96 flex-shrink-0">
            <MappingPanel
              selectedColumn={selectedColumn}
              detection={columnDetections.find(d => d.columnIndex === selectedColumn)}
              onMappingUpdate={handleMappingUpdate}
              onClose={() => setSelectedColumn(null)}
              locale={locale}
              statementType="profit_loss"
            />
          </div>
        )}
      </div>
    </div>
  );
}