"use client";

import { useState, useMemo, useEffect } from "react";
import { MatrixMapping, DocumentStructure, AccountClassification, ValidationIssue } from "@/types";
import { CategoryBadge } from "./CategoryBadge";
import { ManualCategorySelector } from "./ManualCategorySelector";
import { detectTotalRows, TotalDetectionResult } from "@/lib/total-detection";
import { 
  TableCellsIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  TagIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  CheckCircleIcon,
  XCircleIcon,
  SparklesIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from "@heroicons/react/24/outline";

interface MatrixExcelViewerProps {
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
  onMappingComplete: (mapping: MatrixMapping) => void;
  locale: string;
  statementType?: string;
}

export function MatrixExcelViewer({
  rawData,
  excelMetadata,
  onMappingComplete,
  locale,
  statementType = 'profit_loss'
}: MatrixExcelViewerProps) {
  // Mapping state
  const [conceptColumns, setConceptColumns] = useState<MatrixMapping['conceptColumns']>([]);
  const [periodHeaderRow, setPeriodHeaderRow] = useState<number>(-1);
  const [periodColumns, setPeriodColumns] = useState<MatrixMapping['periodColumns']>([]);
  const [dataRange, setDataRange] = useState<MatrixMapping['dataRange']>({
    startRow: -1,
    endRow: -1,
    startCol: -1,
    endCol: -1
  });
  
  // UI state
  const [selectedCell, setSelectedCell] = useState<{row: number, col: number} | null>(null);
  const [mappingStep, setMappingStep] = useState<'ai_analysis' | 'concepts' | 'periods' | 'data' | 'account_review' | 'final_review'>('ai_analysis');
  const [showAllRows, setShowAllRows] = useState(false);
  const [editingClassification, setEditingClassification] = useState<AccountClassification | null>(null);
  
  // AI state
  const [aiAnalysis, setAiAnalysis] = useState<DocumentStructure | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);
  const [accountClassifications, setAccountClassifications] = useState<AccountClassification[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [detectedTotalRows, setDetectedTotalRows] = useState<TotalDetectionResult[]>([]);
  
  const displayData = useMemo(() => {
    return excelMetadata?.data || rawData;
  }, [rawData, excelMetadata]);

  const maxRows = displayData.length;
  const maxCols = Math.max(...displayData.map(row => row.length));
  const visibleRows = showAllRows ? maxRows : Math.min(30, maxRows);

  // AI Analysis Effect
  useEffect(() => {
    if (displayData.length > 0 && mappingStep === 'ai_analysis') {
      performAIAnalysis();
    }
  }, [displayData]);
  
  // Ensure no duplicate concept columns
  useEffect(() => {
    const uniqueConceptCols = conceptColumns.filter((col, index, self) =>
      index === self.findIndex(c => c.columnIndex === col.columnIndex)
    );
    if (uniqueConceptCols.length < conceptColumns.length) {
      setConceptColumns(uniqueConceptCols);
    }
  }, [conceptColumns]);

  // AI Analysis Functions
  const performAIAnalysis = async () => {
    setAiLoading(true);
    setAiError(null);
    
    try {
      // Analyze document structure
      const structureResponse = await fetch('/api/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'structure',
          rawData: displayData,
          fileName: 'excel-file' // Could be passed as prop
        })
      });

      const structureResult = await structureResponse.json();
      
      if (structureResult.success) {
        setAiAnalysis(structureResult.data);
        
        // Apply AI suggestions if available
        const conceptCols = [];
        let nameColIndex = -1;
        
        // Look for account name column
        if (structureResult.data.accountColumns.nameColumn !== undefined) {
          const suggestedNameCol = structureResult.data.accountColumns.nameColumn;
          
          // Validate the suggestion - check headers in row 0
          const headers = displayData[0] || [];
          nameColIndex = suggestedNameCol;
          
          // Look for the best column for account names
          // Prefer "Descripción" or "Description" columns as they usually contain the full account names
          for (let i = 0; i < headers.length; i++) {
            const headerValue = String(headers[i] || '').toLowerCase();
            if (headerValue.includes('descripción') || headerValue.includes('description') || 
                headerValue.includes('detalle') || headerValue.includes('detail')) {
              nameColIndex = i;
              break;
            }
          }
          
          // If no description column found, then look for cuenta/account/concepto
          if (nameColIndex === suggestedNameCol) {
            for (let i = 0; i < headers.length; i++) {
              const headerValue = String(headers[i] || '').toLowerCase();
              if (headerValue.includes('cuenta') || headerValue.includes('account') || 
                  headerValue.includes('concepto')) {
                // Only use this if it has actual account names (not just codes)
                const sampleValue = displayData[1]?.[i];
                if (sampleValue && String(sampleValue).length > 4 && isNaN(Number(sampleValue))) {
                  nameColIndex = i;
                  break;
                }
              }
            }
          }
          
          conceptCols.push({
            columnIndex: nameColIndex,
            columnType: 'account_name' as const
          });
        }
        
        // For account code column, we typically don't need it if we have a good description column
        // Only add it if specifically needed and it's not just numeric codes
        // Skip this for now to avoid confusion with two concept columns
        
        if (conceptCols.length > 0) {
          // Deduplicate concept columns by columnIndex
          const uniqueConceptCols = conceptCols.filter((col, index, self) =>
            index === self.findIndex(c => c.columnIndex === col.columnIndex)
          );
          setConceptColumns(uniqueConceptCols);
        }
        
        if (structureResult.data.periodColumns.length > 0) {
          setPeriodColumns(structureResult.data.periodColumns.map((pc: any) => ({
            columnIndex: pc.columnIndex,
            periodLabel: pc.periodLabel,
            periodType: pc.periodType
          })));
          
          // Set period header row (first period column row)
          if (structureResult.data.headerRows.length > 0) {
            setPeriodHeaderRow(structureResult.data.headerRows[0]);
          }
        }
        
        // Set data range
        if (structureResult.data.dataStartRow !== undefined) {
          setDataRange({
            startRow: structureResult.data.dataStartRow,
            endRow: structureResult.data.dataEndRow,
            startCol: 0,
            endCol: maxCols - 1
          });
        }
        
      } else if (structureResult.fallback) {
        setAiError("AI analysis unavailable. Using manual mode.");
      } else {
        setAiError(structureResult.error || "AI analysis failed");
      }
      
    } catch (error) {
      console.error('AI analysis error:', error);
      setAiError("Failed to connect to AI service. Using manual mode.");
    } finally {
      setAiLoading(false);
    }
  };

  const performAccountClassification = async () => {
    if (!aiAnalysis || accountClassifications.length > 0) return;
    
    setAiLoading(true);
    try {
      // First detect total rows
      const accountNameCol = conceptColumns.find(cc => cc.columnType === 'account_name')?.columnIndex ?? -1;
      const detectedTotals = detectTotalRows(displayData, {}, accountNameCol);
      setDetectedTotalRows(detectedTotals);
      const totalRowIndices = new Set(detectedTotals.map(t => t.rowIndex));
      
      // Extract account names from the mapped data, excluding total rows
      const accounts = [];
      for (let rowIdx = dataRange.startRow; rowIdx <= dataRange.endRow; rowIdx++) {
        const row = displayData[rowIdx];
        if (!row) continue;
        
        // Skip if this is a total row
        if (totalRowIndices.has(rowIdx)) continue;
        
        let accountName = '';
        conceptColumns.forEach(cc => {
          const value = row[cc.columnIndex];
          if (value && cc.columnType === 'account_name') {
            accountName = String(value);
          }
        });
        
        if (accountName && accountName.trim()) {
          accounts.push({ name: accountName, rowIndex: rowIdx });
        }
      }
      
      if (accounts.length === 0) return;
      
      const classificationResponse = await fetch('/api/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'classify',
          rawData: displayData,
          accounts,
          documentContext: {
            statementType: aiAnalysis.statementType,
            currency: aiAnalysis.currency
          }
        })
      });

      const classificationResult = await classificationResponse.json();
      
      if (classificationResult.success) {
        setAccountClassifications(classificationResult.data);
      }
      
    } catch (error) {
      console.error('Account classification error:', error);
    } finally {
      setAiLoading(false);
    }
  };

  // Helper functions
  const isConceptColumn = (colIndex: number) => {
    return conceptColumns.some(cc => cc.columnIndex === colIndex);
  };

  const isPeriodColumn = (colIndex: number) => {
    return periodColumns.some(pc => pc.columnIndex === colIndex);
  };

  const isInDataRange = (rowIndex: number, colIndex: number) => {
    return dataRange.startRow !== -1 && 
           rowIndex >= dataRange.startRow && 
           rowIndex <= dataRange.endRow &&
           colIndex >= dataRange.startCol && 
           colIndex <= dataRange.endCol;
  };

  const handleConceptColumnToggle = (colIndex: number, columnType: MatrixMapping['conceptColumns'][0]['columnType']) => {
    setConceptColumns(prev => {
      const existing = prev.find(cc => cc.columnIndex === colIndex);
      if (existing) {
        return prev.filter(cc => cc.columnIndex !== colIndex);
      } else {
        // Ensure no duplicates
        const filtered = prev.filter(cc => cc.columnIndex !== colIndex);
        return [...filtered, { columnIndex: colIndex, columnType }];
      }
    });
  };

  const handlePeriodColumnToggle = (colIndex: number) => {
    if (periodHeaderRow === -1) {
      alert('Primero selecciona la fila que contiene los encabezados de período');
      return;
    }
    
    const periodLabel = displayData[periodHeaderRow][colIndex];
    setPeriodColumns(prev => {
      const existing = prev.find(pc => pc.columnIndex === colIndex);
      if (existing) {
        return prev.filter(pc => pc.columnIndex !== colIndex);
      } else {
        // Detect period type
        let periodType: MatrixMapping['periodColumns'][0]['periodType'] = 'custom';
        const labelStr = String(periodLabel).toLowerCase();
        if (labelStr.match(/\d{4}/)) periodType = 'year';
        else if (labelStr.match(/q\d|trimestre|quarter/i)) periodType = 'quarter';
        else if (labelStr.match(/ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic|jan|apr|aug|dec/i)) periodType = 'month';
        
        return [...prev, { 
          columnIndex: colIndex, 
          periodLabel: String(periodLabel),
          periodType 
        }];
      }
    });
  };

  const detectDataRange = () => {
    if (conceptColumns.length === 0) {
      alert('Primero define las columnas de conceptos');
      return;
    }

    // If no periods are selected, use all columns except concept columns
    let startCol = 0;
    let endCol = maxCols - 1;
    
    if (periodColumns.length > 0) {
      startCol = Math.min(...periodColumns.map(pc => pc.columnIndex));
      endCol = Math.max(...periodColumns.map(pc => pc.columnIndex));
    }

    const startRow = periodHeaderRow !== -1 ? periodHeaderRow + 1 : 1;
    const endRow = displayData.length - 1;

    setDataRange({ startRow, endRow, startCol, endCol });
    // Don't auto-advance, let user click next button
  };

  const completeMapping = () => {
    const mapping: MatrixMapping = {
      conceptColumns,
      periodHeaderRow,
      periodColumns,
      dataRange,
      hasSubtotals: false, // Could be detected or set by user
      hasTotals: false,    // Could be detected or set by user
      currency: aiAnalysis?.currency || 'MXN',
      // Add AI analysis data
      aiAnalysis: aiAnalysis || undefined,
      accountClassifications: accountClassifications.length > 0 ? accountClassifications : undefined,
      detectedTotalRows: detectedTotalRows.length > 0 ? detectedTotalRows : undefined
    };
    
    onMappingComplete(mapping);
  };

  const getCellStyle = (rowIndex: number, colIndex: number) => {
    let classes = 'px-3 py-2 text-sm border border-gray-200 ';
    
    if (rowIndex === periodHeaderRow) {
      classes += 'bg-blue-100 font-semibold ';
    }
    if (isConceptColumn(colIndex)) {
      classes += 'bg-green-50 ';
    }
    if (isPeriodColumn(colIndex) && rowIndex === periodHeaderRow) {
      classes += 'bg-purple-100 ';
    }
    if (isInDataRange(rowIndex, colIndex)) {
      classes += 'bg-yellow-50 ';
    }
    if (selectedCell?.row === rowIndex && selectedCell?.col === colIndex) {
      classes += 'ring-2 ring-blue-500 ';
    }
    
    return classes;
  };

  return (
    <div className="space-y-6">
      {/* Mapping Steps Navigation */}
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Configuración de Mapeo Matricial
          </h3>
          <div className="flex space-x-2">
            {(['ai_analysis', 'concepts', 'periods', 'data', 'account_review', 'final_review'] as const).map((step, index) => (
              <button
                key={step}
                onClick={() => setMappingStep(step)}
                disabled={step === 'ai_analysis' && aiLoading}
                className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                  mappingStep === step
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50'
                }`}
              >
                {step === 'ai_analysis' && <SparklesIcon className="w-4 h-4 inline mr-1" />}
                {index + 1}. {
                  step === 'ai_analysis' ? 'Análisis IA' :
                  step === 'concepts' ? 'Conceptos' :
                  step === 'periods' ? 'Períodos' :
                  step === 'data' ? 'Datos' :
                  step === 'account_review' ? 'Clasificación' : 'Revisión Final'
                }
              </button>
            ))}
          </div>
        </div>

        {/* Step Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          {mappingStep === 'ai_analysis' && (
            <div>
              <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                <SparklesIcon className="w-5 h-5 mr-2" />
                Paso 1: Análisis Inteligente del Documento
              </h4>
              {aiLoading ? (
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <p className="text-sm text-blue-800">
                    IA analizando la estructura del documento financiero...
                  </p>
                </div>
              ) : aiError ? (
                <div className="flex items-center space-x-3">
                  <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
                  <p className="text-sm text-yellow-800">{aiError}</p>
                  <button 
                    onClick={() => setMappingStep('concepts')}
                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                  >
                    Continuar Manualmente
                  </button>
                </div>
              ) : aiAnalysis ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <CheckCircleIcon className="w-5 h-5 text-green-600" />
                    <p className="text-sm text-blue-800">
                      <strong>Tipo de Estado:</strong> {
                        aiAnalysis.statementType === 'profit_loss' ? 'Estado de Resultados' :
                        aiAnalysis.statementType === 'balance_sheet' ? 'Balance General' :
                        aiAnalysis.statementType === 'cash_flow' ? 'Flujo de Efectivo' : 'Desconocido'
                      } (Confianza: {aiAnalysis.confidence}%)
                    </p>
                  </div>
                  <div className="bg-white rounded p-3 text-xs">
                    <div className="text-gray-600 mb-1">Análisis IA:</div>
                    <p className="text-gray-800">{aiAnalysis.reasoning}</p>
                  </div>
                  <button 
                    onClick={() => setMappingStep('concepts')}
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                  >
                    Continuar con Mapeo Visual →
                  </button>
                </div>
              ) : (
                <p className="text-sm text-blue-800">Iniciando análisis...</p>
              )}
            </div>
          )}
          
          {mappingStep === 'concepts' && (
            <div>
              <h4 className="font-medium text-blue-900 mb-2">Paso 1: Identificar Columnas de Conceptos</h4>
              <p className="text-sm text-blue-800 mb-3">
                Haz clic en las columnas que contienen información de cuentas (códigos, nombres, categorías).
                Típicamente son las primeras 2-3 columnas.
              </p>
              <div className="bg-white rounded p-3 text-xs font-mono">
                <div className="text-gray-600 mb-1">Ejemplo:</div>
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-green-100 p-2 rounded">4000 | </div>
                  <div className="bg-green-100 p-2 rounded">Ingresos por Ventas | </div>
                  <div className="bg-gray-100 p-2 rounded">125,000</div>
                  <div className="bg-gray-100 p-2 rounded">132,000</div>
                </div>
                <div className="text-green-600 mt-1">↑ Estas son columnas de conceptos</div>
              </div>
            </div>
          )}
          
          {mappingStep === 'periods' && (
            <div>
              <h4 className="font-medium text-blue-900 mb-2">Paso 2: Identificar Períodos</h4>
              <p className="text-sm text-blue-800 mb-3">
                1. Primero, haz clic en la FILA que contiene los encabezados de período<br/>
                2. Luego, marca las COLUMNAS que contienen datos de cada período
              </p>
              <div className="bg-white rounded p-3 text-xs font-mono">
                <div className="text-gray-600 mb-1">Ejemplo de fila de períodos:</div>
                <div className="grid grid-cols-5 gap-2">
                  <div className="bg-gray-100 p-2 rounded">Código</div>
                  <div className="bg-gray-100 p-2 rounded">Descripción</div>
                  <div className="bg-blue-100 p-2 rounded font-bold">Ene 2024</div>
                  <div className="bg-blue-100 p-2 rounded font-bold">Feb 2024</div>
                  <div className="bg-blue-100 p-2 rounded font-bold">Mar 2024</div>
                </div>
                <div className="text-blue-600 mt-1">↑ Esta fila contiene los períodos</div>
              </div>
            </div>
          )}
          
          {mappingStep === 'data' && (
            <div>
              <h4 className="font-medium text-blue-900 mb-2">Paso 3: Confirmar Rango de Datos</h4>
              <p className="text-sm text-blue-800">
                Verifica que el área amarilla contiene los montos financieros. Ajusta si es necesario.
              </p>
            </div>
          )}
          
          {mappingStep === 'account_review' && (
            <div>
              <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                <LightBulbIcon className="w-5 h-5 mr-2" />
                Paso 5: Clasificación Inteligente de Cuentas
              </h4>
              <p className="text-sm text-blue-800 mb-3">
                IA ha analizado las cuentas y sugiere categorías contables. Revisa y ajusta según sea necesario.
              </p>
              {accountClassifications.length === 0 && (
                <button 
                  onClick={performAccountClassification}
                  disabled={aiLoading}
                  className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {aiLoading ? 'Clasificando...' : 'Iniciar Clasificación IA'}
                </button>
              )}
            </div>
          )}
          
          {mappingStep === 'final_review' && (
            <div>
              <h4 className="font-medium text-blue-900 mb-2">Paso 6: Revisión Final</h4>
              <p className="text-sm text-blue-800">
                Revisa el mapeo completo y las clasificaciones antes de procesar. Verde = conceptos, Púrpura = períodos, Amarillo = datos.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Legend */}
      <div className="bg-white p-3 rounded-lg border shadow-sm">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
              <span className="text-gray-600">Columnas de Conceptos</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
              <span className="text-gray-600">Fila de Períodos</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-purple-100 border border-purple-300 rounded"></div>
              <span className="text-gray-600">Columnas de Períodos</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
              <span className="text-gray-600">Área de Datos</span>
            </div>
          </div>
          <button
            onClick={() => setShowAllRows(!showAllRows)}
            className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-800"
          >
            {showAllRows ? 'Mostrar menos' : `Ver todas (${maxRows} filas)`}
          </button>
        </div>
      </div>

      {/* Action Buttons - Top */}
      <div className="bg-white p-4 rounded-lg border shadow-sm flex justify-between items-center">
        <div>
          {mappingStep === 'concepts' && (
            <>
              <h4 className="text-lg font-medium text-gray-900">Columnas de Conceptos</h4>
              <p className="text-sm text-gray-600 mt-1">
                Selecciona las columnas que contienen códigos y nombres de cuentas
              </p>
            </>
          )}
          {mappingStep === 'periods' && (
            <>
              <h4 className="text-lg font-medium text-gray-900">Identificar Períodos</h4>
              <p className="text-sm text-gray-600 mt-1">
                Marca la fila de encabezados y las columnas de períodos
              </p>
            </>
          )}
          {mappingStep === 'data' && (
            <>
              <h4 className="text-lg font-medium text-gray-900">Rango de Datos</h4>
              <p className="text-sm text-gray-600 mt-1">
                Define el área que contiene los valores financieros
              </p>
            </>
          )}
          {mappingStep === 'account_review' && accountClassifications.length > 0 && (
            <>
              <h4 className="text-lg font-medium text-gray-900 flex items-center">
                <SparklesIcon className="w-5 h-5 mr-2 text-purple-600" />
                Clasificación IA de Cuentas Financieras
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                Las categorías sugeridas por IA se muestran junto a cada cuenta.
              </p>
            </>
          )}
        </div>
        <div className="space-x-3">
          {/* Navigation buttons based on step */}
          {mappingStep === 'concepts' && (
            <>
              {conceptColumns.length > 0 && (
                <button
                  onClick={() => setMappingStep('periods')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Siguiente: Períodos →
                </button>
              )}
            </>
          )}
          
          {mappingStep === 'periods' && (
            <>
              <button
                onClick={() => setMappingStep('concepts')}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                ← Volver
              </button>
              {periodColumns.length > 0 && periodHeaderRow !== -1 && (
                <button
                  onClick={() => setMappingStep('data')}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Siguiente: Datos →
                </button>
              )}
              <button
                onClick={() => setMappingStep('data')}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Omitir y Continuar →
              </button>
            </>
          )}
          
          {mappingStep === 'data' && (
            <>
              <button
                onClick={() => setMappingStep('periods')}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                ← Volver
              </button>
              <button
                onClick={detectDataRange}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
              >
                Auto-detectar
              </button>
              <button
                onClick={() => {
                  if (dataRange.startRow === -1) {
                    detectDataRange();
                  }
                  setMappingStep('account_review');
                  setTimeout(() => performAccountClassification(), 100);
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Siguiente: Clasificación IA →
              </button>
            </>
          )}
          
          {mappingStep === 'account_review' && accountClassifications.length > 0 && (
            <>
              <button
                onClick={() => setMappingStep('data')}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                ← Volver
              </button>
              <button
                onClick={() => {/* Add export functionality */}}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Exportar Clasificación
              </button>
              <button
                onClick={() => setMappingStep('final_review')}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Continuar a Revisión Final →
              </button>
            </>
          )}
        </div>
      </div>

      {/* Excel Preview Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50 z-10">
                  Fila
                </th>
                {/* Render concept columns first */}
                {conceptColumns.map((cc) => (
                  <th key={`concept-${cc.columnIndex}`} className="px-3 py-2 min-w-[120px]">
                    <div className="flex flex-col items-center space-y-2">
                      <span className="text-xs font-medium text-gray-500 uppercase">
                        Col {String.fromCharCode(65 + cc.columnIndex)}
                      </span>
                      
                      {/* Column action buttons based on step */}
                      {mappingStep === 'concepts' && (
                        <button
                          onClick={() => handleConceptColumnToggle(cc.columnIndex, cc.columnType)}
                          className="px-2 py-1 rounded text-xs font-medium transition-colors bg-green-600 text-white"
                        >
                          ✓ Concepto
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                
                {/* AI Classification Columns - immediately after concept columns */}
                {accountClassifications.length > 0 && mappingStep === 'account_review' && (
                  <>
                    <th className="px-3 py-2 min-w-[50px] bg-purple-50 border-l-2 border-purple-300">
                      <div className="flex flex-col items-center space-y-1">
                        <SparklesIcon className="w-4 h-4 text-purple-600" />
                        <span className="text-xs font-medium text-purple-700 uppercase">IA</span>
                      </div>
                    </th>
                    <th className="px-3 py-2 min-w-[150px] bg-purple-50">
                      <span className="text-xs font-medium text-purple-700 uppercase">Categoría</span>
                    </th>
                    <th className="px-3 py-2 min-w-[60px] bg-purple-50">
                      <span className="text-xs font-medium text-purple-700 uppercase">Tipo</span>
                    </th>
                  </>
                )}
                
                {/* Render all other columns (non-concept columns) */}
                {Array.from({ length: maxCols })
                  .map((_, colIndex) => colIndex)
                  .filter(colIndex => {
                    // Skip columns that are already rendered as concept columns
                    const isConceptColumn = conceptColumns.some(cc => cc.columnIndex === colIndex);
                    return !isConceptColumn;
                  })
                  .map((colIndex) => (
                  <th key={colIndex} className="px-3 py-2 min-w-[120px]">
                    <div className="flex flex-col items-center space-y-2">
                      <span className="text-xs font-medium text-gray-500 uppercase">
                        Col {String.fromCharCode(65 + colIndex)}
                      </span>
                      
                      {/* Column action buttons based on step */}
                      {mappingStep === 'concepts' && (
                        <button
                          onClick={() => {
                            // Toggle concept column - auto-detect type based on content
                            const firstDataValue = displayData[1]?.[colIndex];
                            let columnType: MatrixMapping['conceptColumns'][0]['columnType'] = 'account_name';
                            
                            if (firstDataValue && typeof firstDataValue === 'string') {
                              // If it looks like a code (numeric or short), mark as code
                              if (/^\d+$/.test(firstDataValue) || firstDataValue.length <= 6) {
                                columnType = 'account_code';
                              }
                            }
                            
                            handleConceptColumnToggle(colIndex, columnType);
                          }}
                          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                            isConceptColumn(colIndex) 
                              ? 'bg-green-600 text-white' 
                              : 'bg-gray-200 hover:bg-gray-300'
                          }`}
                        >
                          {isConceptColumn(colIndex) ? '✓ Concepto' : 'Marcar'}
                        </button>
                      )}
                      
                      {mappingStep === 'periods' && periodHeaderRow !== -1 && (
                        <button
                          onClick={() => handlePeriodColumnToggle(colIndex)}
                          className={`px-2 py-1 rounded text-xs ${
                            isPeriodColumn(colIndex) ? 'bg-purple-600 text-white' : 'bg-gray-200'
                          }`}
                        >
                          {isPeriodColumn(colIndex) ? '✓ Período' : 'Marcar'}
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            
            <tbody>
              {displayData.slice(0, visibleRows).map((row, rowIndex) => (
                <tr 
                  key={rowIndex}
                  className={`hover:bg-gray-50 ${rowIndex === periodHeaderRow ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <td className="px-3 py-2 text-sm font-mono text-gray-500 sticky left-0 bg-white z-10">
                    <div className="flex items-center space-x-2">
                      <span>{rowIndex + 1}</span>
                      {mappingStep === 'periods' && (
                        <button
                          onClick={() => setPeriodHeaderRow(rowIndex)}
                          className={`text-xs px-2 py-1 rounded ${
                            rowIndex === periodHeaderRow 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-gray-200 hover:bg-gray-300'
                          }`}
                        >
                          {rowIndex === periodHeaderRow ? '✓ HDR' : 'HDR'}
                        </button>
                      )}
                    </div>
                  </td>
                  
                  {/* Render concept columns first */}
                  {conceptColumns.map((cc) => {
                    const cellValue = row[cc.columnIndex];
                    const isTotal = detectedTotalRows.some(t => t.rowIndex === rowIndex);
                    
                    return (
                      <td 
                        key={`concept-${cc.columnIndex}`}
                        onClick={() => setSelectedCell({row: rowIndex, col: cc.columnIndex})}
                        className={isTotal ? 
                          "px-3 py-2 bg-gray-100 font-semibold border-y border-gray-300" : 
                          getCellStyle(rowIndex, cc.columnIndex)
                        }
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
                  
                  {/* AI Classification Data - immediately after concept columns */}
                  {accountClassifications.length > 0 && mappingStep === 'account_review' && (() => {
                    // Check if this is a total row
                    const isTotal = detectedTotalRows.some(t => t.rowIndex === rowIndex);
                    
                    if (isTotal) {
                      // For total rows, show special formatting
                      return (
                        <>
                          <td className="px-3 py-2 bg-gray-100 border-l-2 border-gray-400">
                            <div className="flex justify-center">
                              <span className="text-xs font-bold text-gray-600">TOTAL</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 bg-gray-100" colSpan={2}>
                            <span className="text-sm font-semibold text-gray-700">
                              Subtotal / Total
                            </span>
                          </td>
                        </>
                      );
                    }
                    
                    // Find classification for this row
                    let accountName = '';
                    conceptColumns.forEach(cc => {
                      const value = row[cc.columnIndex];
                      if (value && cc.columnType === 'account_name') {
                        accountName = String(value);
                      }
                    });
                    
                    const classification = accountClassifications.find(c => c.accountName === accountName);
                    
                    if (classification) {
                      return (
                        <>
                          <td className="px-3 py-2 bg-purple-50 border-l-2 border-purple-300">
                            <div className="flex justify-center">
                              <CategoryBadge 
                                classification={classification}
                                onClick={() => setEditingClassification(classification)}
                              />
                            </div>
                          </td>
                          <td className="px-3 py-2 bg-purple-50">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              classification.isInflow 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {classification.suggestedCategory.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-3 py-2 bg-purple-50 text-center">
                            <span className={`text-sm ${
                              classification.isInflow 
                                ? 'text-green-600' 
                                : 'text-red-600'
                            }`}>
                              {classification.isInflow ? '↑' : '↓'}
                            </span>
                          </td>
                        </>
                      );
                    } else {
                      // Empty cells for rows without classification
                      return (
                        <>
                          <td className="px-3 py-2 bg-purple-50 border-l-2 border-purple-300"></td>
                          <td className="px-3 py-2 bg-purple-50"></td>
                          <td className="px-3 py-2 bg-purple-50"></td>
                        </>
                      );
                    }
                  })()}
                  
                  {/* Render all other columns (non-concept columns) */}
                  {Array.from({ length: maxCols })
                    .map((_, colIndex) => colIndex)
                    .filter(colIndex => !conceptColumns.some(cc => cc.columnIndex === colIndex))
                    .map((colIndex) => {
                      const cellValue = row[colIndex];
                      const isTotal = detectedTotalRows.some(t => t.rowIndex === rowIndex);
                      
                      return (
                        <td 
                          key={`data-${colIndex}`}
                          onClick={() => setSelectedCell({row: rowIndex, col: colIndex})}
                          className={isTotal ? 
                            "px-3 py-2 bg-gray-100 font-semibold border-y border-gray-300" : 
                            getCellStyle(rowIndex, colIndex)
                          }
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
        
        {!showAllRows && displayData.length > visibleRows && (
          <div className="bg-gray-50 px-4 py-3 border-t text-center">
            <button
              onClick={() => setShowAllRows(true)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Mostrar todas las filas ({displayData.length})
            </button>
          </div>
        )}
      </div>

      {/* Bottom Navigation - Duplicate of top for convenience */}
      <div className="bg-white p-4 rounded-lg border shadow-sm flex justify-between items-center">
        <div>
          <h4 className="text-sm font-medium text-gray-700">Navegación Rápida</h4>
        </div>
        <div className="space-x-3">
          {/* Same navigation buttons as top */}
          {mappingStep === 'concepts' && conceptColumns.length > 0 && (
            <button
              onClick={() => setMappingStep('periods')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Siguiente: Períodos →
            </button>
          )}
          
          {mappingStep === 'periods' && (
            <>
              <button
                onClick={() => setMappingStep('concepts')}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                ← Volver
              </button>
              {periodColumns.length > 0 && periodHeaderRow !== -1 && (
                <button
                  onClick={() => setMappingStep('data')}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Siguiente: Datos →
                </button>
              )}
              <button
                onClick={() => setMappingStep('data')}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Omitir y Continuar →
              </button>
            </>
          )}
          
          {mappingStep === 'data' && (
            <>
              <button
                onClick={() => setMappingStep('periods')}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                ← Volver
              </button>
              <button
                onClick={detectDataRange}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
              >
                Auto-detectar
              </button>
              <button
                onClick={() => {
                  if (dataRange.startRow === -1) {
                    detectDataRange();
                  }
                  setMappingStep('account_review');
                  setTimeout(() => performAccountClassification(), 100);
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Siguiente: Clasificación IA →
              </button>
            </>
          )}
          
          {mappingStep === 'account_review' && accountClassifications.length > 0 && (
            <>
              <button
                onClick={() => setMappingStep('data')}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                ← Volver
              </button>
              <button
                onClick={() => {/* Add export functionality */}}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Exportar Clasificación
              </button>
              <button
                onClick={() => setMappingStep('final_review')}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Continuar a Revisión Final →
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mapping Summary */}
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Resumen del Mapeo</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Concept Columns */}
          <div className="space-y-2">
            <h5 className="text-xs font-medium text-gray-500 uppercase">Columnas de Conceptos</h5>
            {conceptColumns.length > 0 ? (
              <div className="space-y-1">
                {conceptColumns.map(cc => (
                  <div key={cc.columnIndex} className="flex items-center space-x-2 text-sm">
                    <CheckCircleIcon className="w-4 h-4 text-green-600" />
                    <span>Columna {String.fromCharCode(65 + cc.columnIndex)}: {cc.columnType}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No definido</p>
            )}
          </div>
          
          {/* Period Info */}
          <div className="space-y-2">
            <h5 className="text-xs font-medium text-gray-500 uppercase">Información de Períodos</h5>
            {periodHeaderRow !== -1 ? (
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-sm">
                  <CheckCircleIcon className="w-4 h-4 text-blue-600" />
                  <span>Fila de encabezados: {periodHeaderRow + 1}</span>
                </div>
                {periodColumns.map(pc => (
                  <div key={pc.columnIndex} className="flex items-center space-x-2 text-sm">
                    <CheckCircleIcon className="w-4 h-4 text-purple-600" />
                    <span>Col {String.fromCharCode(65 + pc.columnIndex)}: {pc.periodLabel}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No definido</p>
            )}
          </div>
          
          {/* Data Range */}
          <div className="space-y-2">
            <h5 className="text-xs font-medium text-gray-500 uppercase">Rango de Datos</h5>
            {dataRange.startRow !== -1 ? (
              <div className="space-y-1 text-sm">
                <div className="flex items-center space-x-2">
                  <CheckCircleIcon className="w-4 h-4 text-yellow-600" />
                  <span>Filas: {dataRange.startRow + 1} - {dataRange.endRow + 1}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircleIcon className="w-4 h-4 text-yellow-600" />
                  <span>
                    Columnas: {String.fromCharCode(65 + dataRange.startCol)} - {String.fromCharCode(65 + dataRange.endCol)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No definido</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-between">
          <button
            onClick={() => {
              // Reset mapping
              setConceptColumns([]);
              setPeriodHeaderRow(-1);
              setPeriodColumns([]);
              setDataRange({ startRow: -1, endRow: -1, startCol: -1, endCol: -1 });
              setMappingStep('concepts');
            }}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Reiniciar Mapeo
          </button>
          
          <div className="space-x-3">
            {/* Skip AI Analysis Button */}
            {mappingStep === 'ai_analysis' && (
              <button
                onClick={() => setMappingStep('concepts')}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Omitir Análisis IA →
              </button>
            )}
            
            {/* Next Step Buttons */}
            {mappingStep === 'concepts' && (
              <>
                {conceptColumns.length === 0 && (
                  <p className="text-sm text-gray-500">Selecciona al menos una columna de conceptos</p>
                )}
                {conceptColumns.length > 0 && (
                  <button
                    onClick={() => setMappingStep('periods')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Siguiente: Períodos →
                  </button>
                )}
              </>
            )}
            
            {mappingStep === 'periods' && (
              <>
                {(periodColumns.length === 0 || periodHeaderRow === -1) && (
                  <p className="text-sm text-gray-500">
                    {periodHeaderRow === -1 ? 'Selecciona la fila de encabezados' : 'Marca las columnas de períodos'}
                  </p>
                )}
                {periodColumns.length > 0 && periodHeaderRow !== -1 && (
                  <button
                    onClick={() => setMappingStep('data')}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Siguiente: Datos →
                  </button>
                )}
                {/* Always show skip button for periods */}
                <button
                  onClick={() => setMappingStep('data')}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Omitir y Continuar →
                </button>
              </>
            )}
            
            {mappingStep === 'data' && (
              <>
                <button
                  onClick={detectDataRange}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                >
                  Auto-detectar Rango de Datos
                </button>
                {/* Always show next button, whether data range is detected or not */}
                <button
                  onClick={() => {
                    if (dataRange.startRow === -1) {
                      // Auto-detect if not done yet
                      detectDataRange();
                    }
                    setMappingStep('account_review');
                    setTimeout(() => performAccountClassification(), 100);
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Siguiente: Clasificación IA →
                </button>
              </>
            )}
            
            {mappingStep === 'account_review' && (
              <>
                {accountClassifications.length === 0 ? (
                  <button
                    onClick={() => setMappingStep('final_review')}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                  >
                    Omitir Clasificación →
                  </button>
                ) : (
                  <button
                    onClick={() => setMappingStep('final_review')}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Continuar a Revisión Final →
                  </button>
                )}
              </>
            )}
            
            {mappingStep === 'final_review' && (
              <button
                onClick={completeMapping}
                disabled={conceptColumns.length === 0 || periodColumns.length === 0 || dataRange.startRow === -1}
                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                ✓ Confirmar y Procesar Mapeo
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Manual Category Selector Modal */}
      {editingClassification && (
        <ManualCategorySelector
          classification={editingClassification}
          statementType={statementType as 'balance_sheet' | 'profit_loss' | 'cash_flow'}
          rawData={displayData}
          rowIndex={displayData.findIndex(row => {
            let accountName = '';
            conceptColumns.forEach(cc => {
              const value = row[cc.columnIndex];
              if (value && cc.columnType === 'account_name') {
                accountName = String(value);
              }
            });
            return accountName === editingClassification.accountName;
          })}
          accountNameColumn={conceptColumns.find(cc => cc.columnType === 'account_name')?.columnIndex || -1}
          accountCodeColumn={conceptColumns.find(cc => cc.columnType === 'account_code')?.columnIndex || -1}
          onCategoryChange={(newCategory, isInflow) => {
            // Update the classification
            setAccountClassifications(prev => 
              prev.map(c => 
                c.accountName === editingClassification.accountName
                  ? { ...c, suggestedCategory: newCategory, isInflow }
                  : c
              )
            );
            setEditingClassification(null);
          }}
          onClose={() => setEditingClassification(null)}
        />
      )}
    </div>
  );
}