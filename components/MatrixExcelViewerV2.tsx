"use client";

import { useState, useMemo, useEffect } from "react";
import { MatrixMapping, DocumentStructure, AccountClassification, ValidationIssue } from "@/types";
import { CategoryBadge } from "./CategoryBadge";
import { ManualCategorySelector } from "./ManualCategorySelector";
import { detectTotalRows, TotalDetectionResult } from "@/lib/total-detection";
import { Button } from "./ui/Button";
import { Card, CardHeader, CardBody, CardFooter, CardTitle, CardDescription } from "./ui/Card";
import { ProgressIndicator } from "./ui/ProgressIndicator";
import type { Step } from "./ui/ProgressIndicator";
import { 
  TableCellsIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  TagIcon,
  ArrowsPointingOutIcon,
  SparklesIcon,
  LightBulbIcon,
  CheckCircleIcon,
  DocumentMagnifyingGlassIcon
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

// LATAM Currencies
const LATAM_CURRENCIES = [
  { code: 'MXN', name: 'Peso Mexicano', symbol: '$', flag: '🇲🇽' },
  { code: 'USD', name: 'Dólar Estadounidense', symbol: '$', flag: '🇺🇸' },
  { code: 'COP', name: 'Peso Colombiano', symbol: '$', flag: '🇨🇴' },
  { code: 'ARS', name: 'Peso Argentino', symbol: '$', flag: '🇦🇷' },
  { code: 'CLP', name: 'Peso Chileno', symbol: '$', flag: '🇨🇱' },
  { code: 'PEN', name: 'Sol Peruano', symbol: 'S/', flag: '🇵🇪' },
  { code: 'BRL', name: 'Real Brasileño', symbol: 'R$', flag: '🇧🇷' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' }
];

const WIZARD_STEPS: Step[] = [
  { id: 'ai_analysis', name: 'Análisis IA', icon: <SparklesIcon className="w-5 h-5" /> },
  { id: 'concepts', name: 'Conceptos', icon: <TableCellsIcon className="w-5 h-5" /> },
  { id: 'periods', name: 'Períodos', icon: <CalendarDaysIcon className="w-5 h-5" /> },
  { id: 'data', name: 'Datos', icon: <DocumentTextIcon className="w-5 h-5" /> },
  { id: 'account_review', name: 'Clasificación', icon: <TagIcon className="w-5 h-5" /> },
  { id: 'persist', name: 'Guardar', icon: <CheckCircleIcon className="w-5 h-5" /> }
];

export function MatrixExcelViewerV2({
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
  const [mappingStep, setMappingStep] = useState<'ai_analysis' | 'concepts' | 'periods' | 'data' | 'account_review' | 'persist'>('ai_analysis');
  const [showAllRows, setShowAllRows] = useState(false);
  const [editingClassification, setEditingClassification] = useState<AccountClassification | null>(null);
  
  // AI state
  const [aiAnalysis, setAiAnalysis] = useState<DocumentStructure | null>(null);
  const [accountClassifications, setAccountClassifications] = useState<AccountClassification[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [detectedTotalRows, setDetectedTotalRows] = useState<TotalDetectionResult[]>([]);
  
  // Currency state
  const [selectedCurrency, setSelectedCurrency] = useState<string>('MXN');
  
  const displayData = useMemo(() => {
    return excelMetadata?.data || rawData;
  }, [rawData, excelMetadata]);

  const maxRows = displayData.length;
  const maxCols = Math.max(...displayData.map(row => row.length));
  const visibleRows = showAllRows ? maxRows : Math.min(20, maxRows);

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
      const structureResponse = await fetch('/api/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'structure',
          rawData: displayData,
          fileName: 'excel-file'
        })
      });

      const structureResult = await structureResponse.json();
      
      if (structureResult.success) {
        setAiAnalysis(structureResult.data);
        
        // Auto-set detected currency if valid
        if (structureResult.data.currency && LATAM_CURRENCIES.some(c => c.code === structureResult.data.currency)) {
          setSelectedCurrency(structureResult.data.currency);
        }
        
        // Apply AI suggestions if available
        const conceptCols = [];
        let nameColIndex = -1;
        
        // Look for account name column
        if (structureResult.data.accountColumns.nameColumn !== undefined) {
          const suggestedNameCol = structureResult.data.accountColumns.nameColumn;
          const headers = displayData[0] || [];
          nameColIndex = suggestedNameCol;
          
          // Look for the best column for account names
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
        
        if (conceptCols.length > 0) {
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
          
          if (structureResult.data.headerRows.length > 0) {
            setPeriodHeaderRow(structureResult.data.headerRows[0]);
          }
        }
        
        if (structureResult.data.dataStartRow !== undefined) {
          setDataRange({
            startRow: structureResult.data.dataStartRow,
            endRow: structureResult.data.dataEndRow,
            startCol: 0,
            endCol: maxCols - 1
          });
        }
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

    let startCol = 0;
    let endCol = maxCols - 1;
    
    if (periodColumns.length > 0) {
      startCol = Math.min(...periodColumns.map(pc => pc.columnIndex));
      endCol = Math.max(...periodColumns.map(pc => pc.columnIndex));
    }

    const startRow = periodHeaderRow !== -1 ? periodHeaderRow + 1 : 1;
    const endRow = displayData.length - 1;

    setDataRange({ startRow, endRow, startCol, endCol });
  };

  const completeMapping = () => {
    const mapping: MatrixMapping = {
      conceptColumns,
      periodHeaderRow,
      periodColumns,
      dataRange,
      hasSubtotals: false,
      hasTotals: false,
      currency: selectedCurrency,
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
    
    return classes;
  };

  const handleCategoryChange = (accountName: string, newCategory: string, isInflow: boolean) => {
    setAccountClassifications(prev => prev.map(c => 
      c.accountName === accountName 
        ? { ...c, suggestedCategory: newCategory, isInflow }
        : c
    ));
    setEditingClassification(null);
  };

  const canProceedToNext = () => {
    switch (mappingStep) {
      case 'ai_analysis':
        return !aiLoading;
      case 'concepts':
        return conceptColumns.length > 0;
      case 'periods':
        return true; // Allow skipping periods
      case 'data':
        return true; // Auto-detect if not set
      case 'account_review':
        return true; // Can skip classification
      default:
        return true;
    }
  };

  const getNextStep = () => {
    const currentIndex = WIZARD_STEPS.findIndex(s => s.id === mappingStep);
    if (currentIndex < WIZARD_STEPS.length - 1) {
      return WIZARD_STEPS[currentIndex + 1].id as typeof mappingStep;
    }
    return mappingStep;
  };

  const getPrevStep = () => {
    const currentIndex = WIZARD_STEPS.findIndex(s => s.id === mappingStep);
    if (currentIndex > 0) {
      return WIZARD_STEPS[currentIndex - 1].id as typeof mappingStep;
    }
    return mappingStep;
  };

  const handleNext = () => {
    if (mappingStep === 'data' && dataRange.startRow === -1) {
      detectDataRange();
    }
    if (mappingStep === 'data' && getNextStep() === 'account_review') {
      setMappingStep('account_review');
      setTimeout(() => performAccountClassification(), 100);
    } else {
      setMappingStep(getNextStep());
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <Card>
        <CardBody className="py-8">
          <ProgressIndicator steps={WIZARD_STEPS} currentStep={mappingStep} />
        </CardBody>
      </Card>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            {WIZARD_STEPS.find(s => s.id === mappingStep)?.icon}
            <span className="ml-2">{WIZARD_STEPS.find(s => s.id === mappingStep)?.name}</span>
          </CardTitle>
          <CardDescription>
            {mappingStep === 'ai_analysis' && 'Analizando la estructura del documento con inteligencia artificial'}
            {mappingStep === 'concepts' && 'Selecciona las columnas que contienen información de cuentas'}
            {mappingStep === 'periods' && 'Identifica la fila de encabezados y las columnas de períodos'}
            {mappingStep === 'data' && 'Define el rango que contiene los valores financieros'}
            {mappingStep === 'account_review' && 'Revisa y ajusta las categorías sugeridas por IA. Luego guarda los datos.'}
            {mappingStep === 'persist' && 'Confirmando y guardando los datos procesados'}
          </CardDescription>
        </CardHeader>

        <CardBody>
          {/* AI Analysis Step */}
          {mappingStep === 'ai_analysis' && (
            <div className="space-y-4">
              {aiLoading ? (
                <div className="flex flex-col items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-gray-600">Analizando documento con IA...</p>
                </div>
              ) : aiAnalysis ? (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-900 mb-2">Análisis Completado</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Tipo de Estado:</span> {aiAnalysis.statementType} (Confianza: {aiAnalysis.confidence}%)</p>
                      <p><span className="font-medium">Moneda detectada:</span> {aiAnalysis.currency}</p>
                      <p><span className="font-medium">Filas de datos:</span> {aiAnalysis.dataStartRow} - {aiAnalysis.dataEndRow}</p>
                    </div>
                  </div>
                  
                  {/* Currency Selection */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-3">Seleccionar Moneda</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {LATAM_CURRENCIES.map((currency) => (
                        <button
                          key={currency.code}
                          onClick={() => setSelectedCurrency(currency.code)}
                          className={`p-3 rounded-lg border transition-all ${
                            selectedCurrency === currency.code
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
                          }`}
                        >
                          <div className="text-lg mb-1">{currency.flag}</div>
                          <div className="font-medium text-sm">{currency.code}</div>
                          <div className="text-xs opacity-75">{currency.symbol}</div>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-blue-700 mt-2">
                      Moneda seleccionada: <span className="font-medium">{selectedCurrency}</span>
                    </p>
                  </div>
                  {aiAnalysis.reasoning && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-2">Análisis IA</h4>
                      <p className="text-sm text-blue-800">{aiAnalysis.reasoning}</p>
                    </div>
                  )}
                </div>
              ) : aiError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800">{aiError}</p>
                </div>
              ) : null}
            </div>
          )}

          {/* Excel Table - Show for all steps except AI analysis */}
          {mappingStep !== 'ai_analysis' && (
            <div className="space-y-4">
              {/* Top Navigation Buttons */}
              <div className="flex justify-between items-center">
                <Button
                  variant="secondary"
                  onClick={() => setMappingStep(getPrevStep())}
                  disabled={mappingStep === 'ai_analysis'}
                >
                  ← Anterior
                </Button>

                <div className="flex items-center space-x-3">
                  {mappingStep === 'data' && (
                    <Button
                      variant="outline"
                      onClick={detectDataRange}
                      leftIcon={<ArrowsPointingOutIcon className="w-4 h-4" />}
                    >
                      Auto-detectar
                    </Button>
                  )}
                  
                  {mappingStep === 'account_review' ? (
                    <Button
                      variant="primary"
                      onClick={completeMapping}
                      disabled={conceptColumns.length === 0 || periodColumns.length === 0 || dataRange.startRow === -1}
                      leftIcon={<CheckCircleIcon className="w-4 h-4" />}
                    >
                      Guardar Datos
                    </Button>
                  ) : mappingStep === 'persist' ? (
                    <Button
                      variant="primary"
                      onClick={completeMapping}
                      disabled={conceptColumns.length === 0 || periodColumns.length === 0 || dataRange.startRow === -1}
                      leftIcon={<CheckCircleIcon className="w-4 h-4" />}
                    >
                      Confirmar y Procesar
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      onClick={handleNext}
                      disabled={!canProceedToNext()}
                    >
                      {mappingStep === 'ai_analysis' && aiError 
                        ? 'Omitir y Continuar →'
                        : 'Siguiente →'}
                    </Button>
                  )}
                </div>
              </div>

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
                          {mappingStep === 'concepts' && (
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => handleConceptColumnToggle(cc.columnIndex, cc.columnType)}
                            >
                              ✓ Concepto
                            </Button>
                          )}
                        </div>
                      </th>
                    ))}
                    
                    {/* AI Classification Columns */}
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
                    
                    {/* Render all other columns */}
                    {Array.from({ length: maxCols })
                      .map((_, colIndex) => colIndex)
                      .filter(colIndex => !conceptColumns.some(cc => cc.columnIndex === colIndex))
                      .map((colIndex) => (
                      <th key={colIndex} className="px-3 py-2 min-w-[120px]">
                        <div className="flex flex-col items-center space-y-2">
                          <span className="text-xs font-medium text-gray-500 uppercase">
                            Col {String.fromCharCode(65 + colIndex)}
                          </span>
                          {mappingStep === 'concepts' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                const firstDataValue = displayData[1]?.[colIndex];
                                let columnType: MatrixMapping['conceptColumns'][0]['columnType'] = 'account_name';
                                
                                if (firstDataValue && typeof firstDataValue === 'string') {
                                  if (/^\d+$/.test(firstDataValue) || firstDataValue.length <= 6) {
                                    columnType = 'account_code';
                                  }
                                }
                                
                                handleConceptColumnToggle(colIndex, columnType);
                              }}
                            >
                              Marcar
                            </Button>
                          )}
                          {mappingStep === 'periods' && periodHeaderRow !== -1 && (
                            <Button
                              size="sm"
                              variant={isPeriodColumn(colIndex) ? 'primary' : 'secondary'}
                              onClick={() => handlePeriodColumnToggle(colIndex)}
                            >
                              {isPeriodColumn(colIndex) ? '✓ Período' : 'Marcar'}
                            </Button>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                
                <tbody>
                  {displayData.slice(0, visibleRows).map((row, rowIndex) => {
                    const isTotal = detectedTotalRows.some(t => t.rowIndex === rowIndex);
                    
                    return (
                      <tr 
                        key={rowIndex}
                        className={`hover:bg-gray-50 ${rowIndex === periodHeaderRow ? 'ring-2 ring-blue-500' : ''}`}
                      >
                        <td className="px-3 py-2 text-sm font-mono text-gray-500 sticky left-0 bg-white z-10">
                          <div className="flex items-center space-x-2">
                            <span>{rowIndex + 1}</span>
                            {mappingStep === 'periods' && (
                              <Button
                                size="sm"
                                variant={rowIndex === periodHeaderRow ? 'primary' : 'secondary'}
                                onClick={() => setPeriodHeaderRow(rowIndex)}
                              >
                                {rowIndex === periodHeaderRow ? '✓ HDR' : 'HDR'}
                              </Button>
                            )}
                          </div>
                        </td>
                        
                        {/* Render concept columns first */}
                        {conceptColumns.map((cc) => {
                          const cellValue = row[cc.columnIndex];
                          
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
                        
                        {/* AI Classification Data */}
                        {accountClassifications.length > 0 && mappingStep === 'account_review' && (() => {
                          if (isTotal) {
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
                            return (
                              <>
                                <td className="px-3 py-2 bg-purple-50 border-l-2 border-purple-300"></td>
                                <td className="px-3 py-2 bg-purple-50"></td>
                                <td className="px-3 py-2 bg-purple-50"></td>
                              </>
                            );
                          }
                        })()}
                        
                        {/* Render all other columns */}
                        {Array.from({ length: maxCols })
                          .map((_, colIndex) => colIndex)
                          .filter(colIndex => !conceptColumns.some(cc => cc.columnIndex === colIndex))
                          .map((colIndex) => {
                            const cellValue = row[colIndex];
                            
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
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>
          )}

          {!showAllRows && displayData.length > visibleRows && mappingStep !== 'ai_analysis' && (
            <div className="mt-4 text-center">
              <Button
                variant="ghost"
                onClick={() => setShowAllRows(true)}
              >
                Mostrar todas las filas ({displayData.length})
              </Button>
            </div>
          )}
        </CardBody>

        <CardFooter className="flex justify-between">
          <Button
            variant="secondary"
            onClick={() => setMappingStep(getPrevStep())}
            disabled={mappingStep === 'ai_analysis'}
          >
            ← Anterior
          </Button>

          <div className="flex items-center space-x-3">
            {mappingStep === 'data' && (
              <Button
                variant="outline"
                onClick={detectDataRange}
                leftIcon={<ArrowsPointingOutIcon className="w-4 h-4" />}
              >
                Auto-detectar
              </Button>
            )}
            
            {mappingStep === 'account_review' ? (
              <Button
                variant="primary"
                onClick={completeMapping}
                disabled={conceptColumns.length === 0 || periodColumns.length === 0 || dataRange.startRow === -1}
                leftIcon={<CheckCircleIcon className="w-4 h-4" />}
              >
                Guardar Datos
              </Button>
            ) : mappingStep === 'persist' ? (
              <Button
                variant="primary"
                onClick={completeMapping}
                disabled={conceptColumns.length === 0 || periodColumns.length === 0 || dataRange.startRow === -1}
                leftIcon={<CheckCircleIcon className="w-4 h-4" />}
              >
                Confirmar y Procesar
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleNext}
                disabled={!canProceedToNext()}
                loading={aiLoading}
              >
                {mappingStep === 'periods' && periodColumns.length === 0 && periodHeaderRow === -1
                  ? 'Omitir y Continuar →'
                  : 'Siguiente →'}
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>

      {/* Summary Card */}
      {mappingStep !== 'ai_analysis' && (
        <Card>
          <CardHeader>
            <CardTitle>Resumen del Mapeo</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Concept Columns */}
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-gray-700">Columnas de Conceptos</h5>
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
                <h5 className="text-sm font-medium text-gray-700">Información de Períodos</h5>
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
                <h5 className="text-sm font-medium text-gray-700">Rango de Datos</h5>
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
          </CardBody>
        </Card>
      )}

      {/* Category Selector Modal */}
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
          accountNameColumn={conceptColumns.find(cc => cc.columnType === 'account_name')?.columnIndex ?? -1}
          accountCodeColumn={conceptColumns.find(cc => cc.columnType === 'account_code')?.columnIndex ?? -1}
          onCategoryChange={(category, isInflow) => 
            handleCategoryChange(editingClassification.accountName, category, isInflow)
          }
          onClose={() => setEditingClassification(null)}
        />
      )}
    </div>
  );
}