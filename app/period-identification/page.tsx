'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/AppLayout';
import { CheckCircleIcon, QuestionMarkCircleIcon, XCircleIcon, ChevronRightIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '@/lib/translations';
import { WorkflowBreadcrumbs } from '@/components/Breadcrumbs';
import { detectPeriodsWithData, formatPeriodDisplay, getPeriodColor, DetectedPeriod } from '@/lib/utils/period-detection';

// Remove old interface - using DetectedPeriod from utility

function PeriodIdentificationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = searchParams.get('locale') || 'es-MX';
  const t = useTranslation(locale);
  
  console.log('Period Identification Page Loaded');
  
  const [excelData, setExcelData] = useState<any[][]>([]);
  const [detectedPeriods, setDetectedPeriods] = useState<DetectedPeriod[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<Set<number>>(new Set());
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [headerRow, setHeaderRow] = useState<any[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [headerRowIndex, setHeaderRowIndex] = useState<number>(0);
  const [currentPeriod, setCurrentPeriod] = useState<DetectedPeriod | null>(null);
  const [effectiveDate, setEffectiveDate] = useState<Date>(new Date());

  useEffect(() => {
    loadExcelData();
  }, []);

  const loadExcelData = async () => {
    try {
      setIsLoading(true);
      const session = searchParams.get('session') || sessionStorage.getItem('uploadSession');
      const sheet = searchParams.get('sheet') || sessionStorage.getItem('selectedSheet');
      
      // Get file info from session storage
      const uploadedFileStr = sessionStorage.getItem('uploadedFile');
      if (uploadedFileStr) {
        const uploadedFile = JSON.parse(uploadedFileStr);
        setFileName(uploadedFile.fileName || '');
      }
      
      if (!session || !sheet) {
        console.error('Missing session or sheet');
        router.push('/upload');
        return;
      }

      // Fetch Excel data from API
      const response = await fetch(`/api/excel/${session}?sheet=${sheet}`);
      if (!response.ok) {
        throw new Error('Failed to load Excel data');
      }

      const data = await response.json();
      const rawData = data.data || [];
      setExcelData(rawData);
      
      // Use the new universal period detection
      console.log('🤖 Using universal period detection...');
      const detectionResult = detectPeriodsWithData(rawData, currentDate);
      
      console.log('✅ Period detection result:', {
        totalPeriods: detectionResult.periods.length,
        actualPeriods: detectionResult.actualPeriods.length,
        forecastPeriods: detectionResult.forecastPeriods.length,
        currentPeriod: detectionResult.currentPeriod?.label,
        effectiveDate: detectionResult.effectiveDate,
        headerRowIndex: detectionResult.headerRowIndex
      });
      
      setDetectedPeriods(detectionResult.periods);
      setCurrentPeriod(detectionResult.currentPeriod);
      setEffectiveDate(detectionResult.effectiveDate);
      setHeaderRowIndex(detectionResult.headerRowIndex);
      
      // Auto-select periods with data (both actual and forecast)
      const autoSelected = new Set<number>();
      detectionResult.periods.forEach(p => {
        if (p.hasData) {
          autoSelected.add(p.columnIndex);
        }
      });
      setSelectedColumns(autoSelected);
      
      // Set the correct header row
      const headerRow = rawData[detectionResult.headerRowIndex] || [];
      setHeaderRow(headerRow);
      
    } catch (error) {
      console.error('Error loading Excel data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Old detection function removed - now using universal period detection utility

  const toggleColumnSelection = (colIndex: number) => {
    const newSelected = new Set(selectedColumns);
    if (newSelected.has(colIndex)) {
      newSelected.delete(colIndex);
    } else {
      newSelected.add(colIndex);
    }
    setSelectedColumns(newSelected);
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 80) {
      return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
    } else if (confidence >= 60) {
      return <QuestionMarkCircleIcon className="w-5 h-5 text-yellow-600" />;
    } else {
      return <XCircleIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const handleContinue = () => {
    if (selectedColumns.size === 0) {
      alert('Por favor selecciona al menos una columna de periodo');
      return;
    }

    // Create final period columns array with selected columns
    const finalPeriods = Array.from(selectedColumns).map(colIndex => {
      const detected = detectedPeriods.find(p => p.columnIndex === colIndex);
      const label = detected?.label || headerRow[colIndex] || `Column ${colIndex}`;
      
      return {
        columnIndex: colIndex,
        label: label,
        periodLabel: label,
        periodType: detected?.periodType || 'monthly',
        confidence: detected?.confidence || 100,
        isManuallySelected: !detected || detected.confidence < 80,
        classification: detected?.classification || 'EMPTY',
        hasData: detected?.hasData || false,
        dataPoints: detected?.dataPoints || 0,
        parsedDate: detected?.parsedDate,
        month: detected?.month || 0,
        year: detected?.year || 0
      };
    });

    // Store enhanced period configuration
    sessionStorage.setItem('confirmedPeriods', JSON.stringify(finalPeriods));
    sessionStorage.setItem('currentPeriod', JSON.stringify(currentPeriod));
    sessionStorage.setItem('effectiveDate', effectiveDate.toISOString());
    sessionStorage.setItem('periodClassification', JSON.stringify({
      actual: detectedPeriods.filter(p => p.classification === 'ACTUAL'),
      current: currentPeriod,
      forecast: detectedPeriods.filter(p => p.classification === 'FORECAST')
    }));

    // Navigate to enhanced mapper
    const session = searchParams.get('session') || sessionStorage.getItem('uploadSession');
    const sheet = searchParams.get('sheet') || sessionStorage.getItem('selectedSheet');
    router.push(`/enhanced-mapper?session=${session}&sheet=${sheet}`);
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando datos...</p>
            </div>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumbs */}
          <div className="mb-4">
            <WorkflowBreadcrumbs 
              currentStep="identify-periods" 
              fileName={fileName}
            />
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Identificación de Periodos
              </h1>
              <p className="text-gray-600">
                Confirma las columnas que contienen periodos (meses, trimestres o años)
              </p>
            </div>

            {/* Period Summary */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <CalendarIcon className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Resumen de períodos detectados:</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Período actual:</span> {currentPeriod ? formatPeriodDisplay(currentPeriod) : 'No detectado'}
                </div>
                <div>
                  <span className="font-medium">Fecha efectiva:</span> {effectiveDate.toLocaleDateString()}
                </div>
                <div>
                  <span className="font-medium">Períodos con datos:</span> {detectedPeriods.filter(p => p.hasData).length}
                </div>
              </div>
            </div>

            {/* Column Headers Table */}
            <div className="overflow-x-auto mb-6">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Columna
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Encabezado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Clasificación
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Datos
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Incluir
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {headerRow.map((header, index) => {
                    if (index === 0) return null; // Skip first column
                    
                    const detected = detectedPeriods.find(p => p.columnIndex === index);
                    const isSelected = selectedColumns.has(index);
                    
                    return (
                      <tr key={index} className={isSelected ? 'bg-purple-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {String.fromCharCode(65 + index)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          <span className="font-medium">{header || `Columna ${index}`}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {detected ? (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPeriodColor(detected.classification)}`}>
                              {detected.classification}
                            </span>
                          ) : (
                            <span className="text-gray-400">No detectado</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {detected ? (
                            <div className="flex items-center space-x-2">
                              {detected.hasData ? (
                                <>
                                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                                  <span className="text-gray-600">{detected.dataPoints} valores</span>
                                </>
                              ) : (
                                <>
                                  <XCircleIcon className="w-4 h-4 text-gray-400" />
                                  <span className="text-gray-400">Sin datos</span>
                                </>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {detected && detected.parsedDate ? (
                            formatPeriodDisplay(detected)
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleColumnSelection(index)}
                            className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded cursor-pointer"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Data Preview */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Vista previa de datos</h3>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <tbody className="bg-white divide-y divide-gray-200">
                    {excelData.slice(0, Math.min(8, excelData.length)).map((row, rowIndex) => (
                      <tr key={rowIndex} className={rowIndex === headerRowIndex ? 'bg-blue-50' : ''}>
                        {row.map((cell, colIndex) => {
                          const isSelectedPeriod = selectedColumns.has(colIndex);
                          const isDetectedHeaderRow = rowIndex === headerRowIndex;
                          return (
                            <td
                              key={colIndex}
                              className={`px-3 py-2 whitespace-nowrap ${
                                isSelectedPeriod ? 'bg-purple-100 font-medium' : ''
                              } ${colIndex === 0 ? 'font-medium text-gray-900' : 'text-gray-600'} ${
                                isDetectedHeaderRow ? 'font-bold bg-blue-50' : ''
                              }`}
                            >
                              {cell || '-'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                La fila azul (fila {headerRowIndex + 1}) muestra los encabezados detectados. Las columnas púrpuras son los períodos seleccionados.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center">
              <button
                onClick={() => router.back()}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                ← Volver
              </button>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {selectedColumns.size} columnas seleccionadas
                </span>
                <button
                  onClick={handleContinue}
                  disabled={selectedColumns.size === 0}
                  className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2 shadow-md"
                >
                  <span>Continuar al mapeo</span>
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}

export default function PeriodIdentificationPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <PeriodIdentificationContent />
    </Suspense>
  );
}