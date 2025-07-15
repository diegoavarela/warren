'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/AppLayout';
import { CheckCircleIcon, QuestionMarkCircleIcon, XCircleIcon, ChevronRightIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '@/lib/translations';
import { WorkflowBreadcrumbs } from '@/components/Breadcrumbs';

interface PeriodColumn {
  columnIndex: number;
  label: string;
  confidence: number;
  isManuallySelected?: boolean;
  parsedDate?: string;
}

function PeriodIdentificationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = searchParams.get('locale') || 'es-MX';
  const t = useTranslation(locale);
  
  console.log('Period Identification Page Loaded');
  
  const [excelData, setExcelData] = useState<any[][]>([]);
  const [periodColumns, setPeriodColumns] = useState<PeriodColumn[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<Set<number>>(new Set());
  const [yearContext, setYearContext] = useState<number>(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(true);
  const [headerRow, setHeaderRow] = useState<any[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [headerRowIndex, setHeaderRowIndex] = useState<number>(0);

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
      
      // First, use AI to detect periods
      console.log('🤖 Using AI to detect periods...');
      const aiResponse = await fetch('/api/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'detect-periods',
          rawData: rawData.slice(0, Math.min(10, rawData.length)),
          fileName: fileName
        })
      });
      
      let detectedPeriods: PeriodColumn[] = [];
      let headerRowIndex = 0;
      
      if (aiResponse.ok) {
        const aiResult = await aiResponse.json();
        if (aiResult.success && aiResult.data?.periodColumns) {
          console.log('✅ AI detected periods:', aiResult.data.periodColumns);
          detectedPeriods = aiResult.data.periodColumns.map((col: any) => ({
            columnIndex: col.columnIndex,
            label: col.label,
            confidence: 95, // High confidence for AI detection
            isManuallySelected: false
          }));
          headerRowIndex = aiResult.data.headerRowIndex || 0;
        }
      }
      
      // If AI didn't detect periods, fall back to local detection
      if (detectedPeriods.length === 0) {
        console.log('⚠️ AI detection failed, using local detection');
        const result = detectPeriodColumnsWithHeaderRow(rawData);
        detectedPeriods = result.periods;
        headerRowIndex = result.headerRowIndex;
      }
      
      setPeriodColumns(detectedPeriods);
      
      // Auto-select high confidence periods
      const autoSelected = new Set<number>();
      detectedPeriods.forEach(p => {
        if (p.confidence >= 80) {
          autoSelected.add(p.columnIndex);
        }
      });
      setSelectedColumns(autoSelected);
      
      // Set the correct header row
      const headerRow = rawData[headerRowIndex] || [];
      setHeaderRow(headerRow);
      setHeaderRowIndex(headerRowIndex);
      
    } catch (error) {
      console.error('Error loading Excel data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const detectPeriodColumnsWithHeaderRow = (data: any[][]): { periods: PeriodColumn[], headerRowIndex: number } => {
    const periods: PeriodColumn[] = [];
    if (!data || data.length < 2) return { periods, headerRowIndex: 0 };

    // Find the row with the most period-like headers
    let bestRow = 0;
    let bestScore = 0;
    let bestPeriods: PeriodColumn[] = [];
    
    // Check first 10 rows for headers
    for (let rowIndex = 0; rowIndex < Math.min(10, data.length); rowIndex++) {
      const row = data[rowIndex];
      if (!row || !Array.isArray(row)) continue;
      
      const currentPeriods: PeriodColumn[] = [];
      let rowScore = 0;
      
      row.forEach((cell, colIndex) => {
        if (!cell || colIndex === 0) return; // Skip first column (usually account names)
        
        const cellStr = String(cell).trim();
        let confidence = 0;
        
        // Check for various period patterns
        if (cellStr.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[-_\s]\d{2,4}$/i)) {
          confidence = 95;
        } else if (cellStr.match(/^(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)[-_\s]\d{2,4}$/i)) {
          confidence = 95;
        } else if (cellStr.match(/^\d{1,2}\/\d{4}$/)) {
          confidence = 90;
        } else if (cellStr.match(/^Q[1-4][\s_-]\d{4}$/i)) {
          confidence = 90;
        } else if (cellStr.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/i)) {
          confidence = 70; // Lower confidence without year
        } else if (cellStr.match(/^\d{4}$/)) {
          confidence = 60; // Could be a year
        } else if (cellStr.toLowerCase() === 'total') {
          confidence = 50; // Total column
        }
        
        if (confidence > 0) {
          currentPeriods.push({
            columnIndex: colIndex,
            label: cellStr,
            confidence
          });
          rowScore += confidence;
        }
      });
      
      // If this row has more period-like columns, use it
      if (rowScore > bestScore && currentPeriods.length > 0) {
        bestScore = rowScore;
        bestRow = rowIndex;
        bestPeriods = currentPeriods;
      }
    }
    
    console.log(`Found best period row at index ${bestRow} with score ${bestScore}:`, bestPeriods);
    
    return {
      periods: bestPeriods.sort((a, b) => a.columnIndex - b.columnIndex),
      headerRowIndex: bestRow
    };
  };

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
      const detected = periodColumns.find(p => p.columnIndex === colIndex);
      const label = detected?.label || headerRow[colIndex] || `Column ${colIndex}`;
      
      return {
        columnIndex: colIndex,
        label: label,
        periodLabel: label,
        periodType: 'month', // Default, could be enhanced
        confidence: detected?.confidence || 100,
        isManuallySelected: !detected || detected.confidence < 80
      };
    });

    // Store period configuration
    sessionStorage.setItem('confirmedPeriods', JSON.stringify(finalPeriods));
    sessionStorage.setItem('periodYearContext', yearContext.toString());

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

            {/* Year Context Selector */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                <CalendarIcon className="w-5 h-5 text-blue-600" />
                <span>Contexto del año (para periodos sin año explícito):</span>
                <select
                  value={yearContext}
                  onChange={(e) => setYearContext(Number(e.target.value))}
                  className="ml-2 px-3 py-1 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  {[2023, 2024, 2025, 2026].map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </label>
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
                      Detección
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Confianza
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Es Periodo
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {headerRow.map((header, index) => {
                    if (index === 0) return null; // Skip first column
                    
                    const detected = periodColumns.find(p => p.columnIndex === index);
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
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              AI detectado
                            </span>
                          ) : (
                            <span className="text-gray-400">No detectado</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center space-x-2">
                            {detected && (
                              <>
                                {getConfidenceIcon(detected.confidence)}
                                <span className="text-gray-600">{detected.confidence}%</span>
                              </>
                            )}
                          </div>
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