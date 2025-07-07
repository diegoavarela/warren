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
import { RowTypeSelector, type RowType } from "./RowTypeSelector";
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
  const [periodColumnFlows, setPeriodColumnFlows] = useState<Record<number, boolean>>({});
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
  const [aiProgress, setAiProgress] = useState<string>('Inicializando análisis...');
  const [classificationLoading, setClassificationLoading] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [showForceButton, setShowForceButton] = useState(false);
  const [aiStarted, setAiStarted] = useState(false); // Control auto-start
  
  // Manual override state
  const [manualRowTypes, setManualRowTypes] = useState<Record<number, 'account' | 'section_header' | 'total'>>({})
  
  // Currency state - default to USD until AI detects the actual currency
  const [selectedCurrency, setSelectedCurrency] = useState<string>('USD');
  
  const displayData = useMemo(() => {
    return excelMetadata?.data || rawData;
  }, [rawData, excelMetadata]);

  const maxRows = displayData.length;
  const maxCols = Math.max(...displayData.map(row => row.length));
  const visibleRows = showAllRows ? maxRows : Math.min(20, maxRows);

  // AI Analysis Effect - removed auto-start
  useEffect(() => {
    // Don't auto-start AI analysis anymore
    // User must click to start or skip
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
    setAnalysisComplete(false);
    setProgressPercentage(10);
    setAiProgress('Analizando estructura del documento...');
    
    let structureResult: any = null;
    
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

      structureResult = await structureResponse.json();
      setProgressPercentage(30);
      
      if (structureResult.success) {
        setAiAnalysis(structureResult.data);
        setProgressPercentage(50);
        setAiProgress('Identificando columnas y períodos...');
        
        // Auto-set detected currency if valid
        if (structureResult.data.currency) {
          // Map common currency names to codes
          const currencyMappings: Record<string, string> = {
            'arg pesos': 'ARS',
            'argentine pesos': 'ARS',
            'pesos argentinos': 'ARS',
            'ars': 'ARS',
            'mxn': 'MXN',
            'usd': 'USD',
            'cop': 'COP',
            'clp': 'CLP',
            'pen': 'PEN',
            'brl': 'BRL',
            'eur': 'EUR'
          };
          
          const detectedCurrency = structureResult.data.currency.toLowerCase();
          const mappedCurrency = currencyMappings[detectedCurrency] || structureResult.data.currency;
          
          if (LATAM_CURRENCIES.some(c => c.code === mappedCurrency)) {
            setSelectedCurrency(mappedCurrency);
          }
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
        
        setAiProgress('Análisis estructural completado');
        setProgressPercentage(70);
        setAiLoading(false);
        
        // Check if we can do classification
        if (conceptCols.length > 0 && structureResult.data.dataStartRow !== undefined) {
          console.log('Starting account classification with', conceptCols.length, 'concept columns');
          // Don't show classification loading if we won't have any accounts
          const hasAccountNameColumn = conceptCols.some(cc => cc.columnType === 'account_name');
          if (!hasAccountNameColumn) {
            console.log('No account name column found, skipping classification');
            setAnalysisComplete(true);
            setProgressPercentage(100);
          } else {
            // Start classification
            setClassificationLoading(true);
            setProgressPercentage(75);
            setTimeout(() => performAccountClassification(), 100);
          }
        } else {
          console.log('No concept columns or data range, skipping classification');
          setAnalysisComplete(true);
          setProgressPercentage(100);
        }
      } else {
        setAiError(structureResult.error || "El análisis automático no está disponible en este momento.");
        setAiLoading(false);
      }
    } catch (error) {
      console.error('AI analysis error:', error);
      setAiError("No se pudo conectar con el servicio de IA. Continúa con el modo manual.");
      setAiLoading(false);
    } finally {
      // Only set loading to false if we're not continuing with classification
      if (!structureResult?.success || conceptColumns.length === 0) {
        setAiLoading(false);
      }
    }
  };

  const performAccountClassification = async () => {
    if (!aiAnalysis || accountClassifications.length > 0) {
      setClassificationLoading(false);
      setAnalysisComplete(true);
      return;
    }
    
    // Ensure we have the required data
    if (conceptColumns.length === 0 || dataRange.startRow === -1) {
      console.log('Missing required data for classification:', { 
        conceptColumns: conceptColumns.length, 
        dataRange 
      });
      setClassificationLoading(false);
      setAnalysisComplete(true);
      setProgressPercentage(100);
      return;
    }
    
    setClassificationLoading(true);
    setAiProgress('Detectando filas de totales y subtotales...');
    setProgressPercentage(78);
    
    // Add a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.log('Classification timeout reached, forcing completion');
      setClassificationLoading(false);
      setAnalysisComplete(true);
      setProgressPercentage(100);
      setShowForceButton(false);
      setAiProgress('Clasificación completada (tiempo límite alcanzado)');
    }, 15000); // 15 second timeout as a safety net
    
    try {
      // First detect total rows (skip header rows)
      const accountNameCol = conceptColumns.find(cc => cc.columnType === 'account_name')?.columnIndex ?? -1;
      const startRow = dataRange.startRow >= 0 ? dataRange.startRow : (aiAnalysis?.dataStartRow || 0);
      const detectedTotals = detectTotalRows(displayData, {}, accountNameCol, startRow);
      
      // Apply manual overrides to detected totals
      const manuallySetRows = Object.entries(manualRowTypes);
      for (const [rowIndexStr, type] of manuallySetRows) {
        const rowIndex = parseInt(rowIndexStr);
        if (type === 'section_header' || type === 'total') {
          // Add or update in detected totals
          const existingIndex = detectedTotals.findIndex(t => t.rowIndex === rowIndex);
          const accountName = displayData[rowIndex]?.[accountNameCol] || '';
          const manualTotal: TotalDetectionResult = {
            rowIndex,
            accountName: String(accountName),
            totalType: type === 'section_header' ? 'section_header' : 'section_total',
            confidence: 1.0,
            detectionReasons: ['Manual override']
          };
          
          if (existingIndex >= 0) {
            detectedTotals[existingIndex] = manualTotal;
          } else {
            detectedTotals.push(manualTotal);
          }
        } else if (type === 'account') {
          // Remove from detected totals if manually set as account
          const index = detectedTotals.findIndex(t => t.rowIndex === rowIndex);
          if (index >= 0) {
            detectedTotals.splice(index, 1);
          }
        }
      }
      
      // Sort by row index
      detectedTotals.sort((a, b) => a.rowIndex - b.rowIndex);
      setDetectedTotalRows(detectedTotals);
      
      const totalRowIndices = new Set(detectedTotals.map(t => t.rowIndex));
      
      setAiProgress('Extrayendo cuentas para clasificación...');
      setProgressPercentage(82);
      
      // Extract account names and values from the mapped data, excluding total rows and section headers
      const accounts = [];
      for (let rowIdx = dataRange.startRow; rowIdx <= dataRange.endRow; rowIdx++) {
        const row = displayData[rowIdx];
        if (!row) continue;
        
        // Check manual override first
        const manualType = manualRowTypes[rowIdx];
        
        // Skip if manually set as section header or total
        if (manualType === 'section_header' || manualType === 'total') continue;
        
        // Skip if detected as total/header and not manually overridden as account
        if (totalRowIndices.has(rowIdx) && manualType !== 'account') continue;
        
        // Skip if this is a section header
        const totalRow = detectedTotals.find(t => t.rowIndex === rowIdx);
        if (totalRow?.totalType === 'section_header' && manualType !== 'account') continue;
        
        let accountName = '';
        let firstValue = null;
        
        conceptColumns.forEach(cc => {
          const value = row[cc.columnIndex];
          if (value && cc.columnType === 'account_name') {
            accountName = String(value);
          }
        });
        
        // Get the first period value to help with classification
        if (periodColumns.length > 0) {
          firstValue = row[periodColumns[0].columnIndex];
        }
        
        if (accountName && accountName.trim()) {
          accounts.push({ 
            name: accountName, 
            rowIndex: rowIdx,
            value: firstValue
          });
        }
      }
      
      if (accounts.length === 0) {
        setAiProgress('No se encontraron cuentas para clasificar - Continuando con mapeo manual');
        setAnalysisComplete(true);
        setProgressPercentage(100);
        clearTimeout(timeoutId);
        // Keep showing the completion state briefly before hiding
        setTimeout(() => {
          setClassificationLoading(false);
        }, 1500);
        return;
      }
      
      setAiProgress(`Clasificando ${accounts.length} cuentas con inteligencia artificial...`);
      setProgressPercentage(85);
      
      // Add a small delay to ensure the UI updates
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setAiProgress('Enviando datos a OpenAI GPT-3.5...');
      setProgressPercentage(88);
      
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

      setAiProgress('Procesando respuesta de IA...');
      setProgressPercentage(92);
      
      const classificationResult = await classificationResponse.json();
      
      if (classificationResult.success) {
        setAccountClassifications(classificationResult.data);
        setProgressPercentage(100);
        const categories = classificationResult.data.reduce((acc: any, item: any) => {
          acc[item.suggestedCategory] = (acc[item.suggestedCategory] || 0) + 1;
          return acc;
        }, {});
        const categorySummary = Object.entries(categories).slice(0, 3).map(([cat, count]) => `${count} ${cat}`).join(', ');
        setAiProgress(`¡Clasificación completada! Detectadas: ${categorySummary}${Object.keys(categories).length > 3 ? '...' : ''}`);
      } else {
        // If classification failed, just log it but don't show error to user
        console.log('AI classification not available, using local detection');
      }
    } catch (error) {
      console.error('Account classification error:', error);
      // Don't show error to user, just proceed
    } finally {
      clearTimeout(timeoutId);
      // Mark analysis as complete but keep showing the classification result
      setAnalysisComplete(true);
      setProgressPercentage(100);
      setShowForceButton(false);
      
      // Auto-dismiss modal after 3 seconds
      setTimeout(() => {
        setClassificationLoading(false);
      }, 3000);
    }
  };

  // Force completion function
  const forceCompleteAnalysis = () => {
    console.log('User forcing analysis completion');
    // Immediately stop all loading states
    setClassificationLoading(false);
    setAiLoading(false);
    setAnalysisComplete(true);
    setProgressPercentage(100);
    setShowForceButton(false);
    setAiStarted(true);
    setAiProgress('Clasificación omitida - Continuando sin IA');
    
    // If we don't have any AI analysis yet, create a basic one
    if (!aiAnalysis) {
      setAiAnalysis({
        statementType: 'profit_loss',
        confidence: 50,
        headerRows: [0],
        dataStartRow: 1,
        dataEndRow: displayData.length - 1,
        totalRows: [],
        subtotalRows: [],
        accountColumns: { confidence: 50 },
        periodColumns: [],
        currency: selectedCurrency,
        reasoning: 'Análisis manual - IA omitida por el usuario'
      });
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
  
  const handlePeriodFlowToggle = (colIndex: number) => {
    setPeriodColumnFlows(prev => ({
      ...prev,
      [colIndex]: !prev[colIndex] // Toggle between true (inflow) and false (outflow)
    }));
  };
  
  const handleManualRowTypeChange = (rowIndex: number, type: 'account' | 'section_header' | 'total' | null) => {
    setManualRowTypes(prev => {
      const newTypes = { ...prev };
      if (type === null || type === 'account') {
        // Remove the manual override
        delete newTypes[rowIndex];
      } else {
        // Set the manual override
        newTypes[rowIndex] = type;
      }
      return newTypes;
    });
    
    // If changing to/from section header or total, update detectedTotalRows
    if (type === 'section_header' || type === 'total') {
      const accountNameCol = conceptColumns.find(cc => cc.columnType === 'account_name')?.columnIndex ?? 0;
      const accountName = displayData[rowIndex]?.[accountNameCol] || '';
      
      setDetectedTotalRows(prev => {
        // Remove any existing detection for this row
        const filtered = prev.filter(t => t.rowIndex !== rowIndex);
        
        // Add new detection based on manual type
        if (type === 'section_header' || type === 'total') {
          filtered.push({
            rowIndex,
            accountName: String(accountName),
            totalType: type === 'section_header' ? 'section_header' : 'section_total',
            confidence: 1.0,
            detectionReasons: ['Manual override']
          });
        }
        
        return filtered.sort((a, b) => a.rowIndex - b.rowIndex);
      });
    } else if (type === 'account' || type === null) {
      // Remove from detected totals
      setDetectedTotalRows(prev => prev.filter(t => t.rowIndex !== rowIndex));
    }
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
      detectedTotalRows: detectedTotalRows.length > 0 ? detectedTotalRows : undefined,
      periodColumnFlows: Object.keys(periodColumnFlows).length > 0 ? periodColumnFlows : undefined
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
    setAccountClassifications(prev => {
      const existingIndex = prev.findIndex(c => c.accountName === accountName);
      
      if (existingIndex >= 0) {
        // Update existing classification
        return prev.map(c => 
          c.accountName === accountName 
            ? { ...c, suggestedCategory: newCategory, isInflow }
            : c
        );
      } else {
        // Add new classification
        const newClassification: AccountClassification = {
          accountName,
          suggestedCategory: newCategory,
          isInflow,
          confidence: 100, // Manual classification has 100% confidence
          reasoning: 'Manual classification',
          alternativeCategories: []
        };
        return [...prev, newClassification];
      }
    });
    setEditingClassification(null);
  };

  const canProceedToNext = () => {
    switch (mappingStep) {
      case 'ai_analysis':
        // Can proceed if analysis is complete or no loading is happening
        return analysisComplete || (!aiLoading && !classificationLoading);
      case 'concepts':
        return conceptColumns.length > 0;
      case 'periods':
        return true; // Allow skipping periods
      case 'data':
        return true; // Auto-detect if not set
      case 'account_review':
        return !classificationLoading; // Can't proceed while classification is loading
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
    // Hide classification loading when moving away from AI analysis step
    if (mappingStep === 'ai_analysis' && classificationLoading) {
      setClassificationLoading(false);
    }
    
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
    <div className="space-y-2">
      {/* Compact Progress Indicator */}
      <Card>
        <CardBody className="py-3">
          <ProgressIndicator steps={WIZARD_STEPS} currentStep={mappingStep} />
        </CardBody>
      </Card>

      {/* Compact Step Content */}
      <Card className="flex-1">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-lg">
            {WIZARD_STEPS.find(s => s.id === mappingStep)?.icon}
            <span className="ml-2">{WIZARD_STEPS.find(s => s.id === mappingStep)?.name}</span>
          </CardTitle>
          <CardDescription className="text-sm">
            {mappingStep === 'ai_analysis' && (
              analysisComplete 
                ? '✅ Análisis IA completado - Puedes continuar'
                : classificationLoading 
                  ? 'Clasificando cuentas con IA - Por favor espera...'
                  : aiLoading
                    ? 'Analizando estructura del documento con IA'
                    : 'Listo para análisis IA'
            )}
            {mappingStep === 'concepts' && 'Selecciona columnas de cuentas'}
            {mappingStep === 'periods' && 'Identifica encabezados y períodos'}
            {mappingStep === 'data' && 'Define rango de datos'}
            {mappingStep === 'account_review' && (
              classificationLoading 
                ? '🤖 AI clasificando cuentas y agregando columna...'
                : 'Revisa categorías y guarda'
            )}
            {mappingStep === 'persist' && 'Guardando datos procesados'}
          </CardDescription>
        </CardHeader>

        <CardBody className="pt-0">
          {/* AI Analysis Step */}
          {mappingStep === 'ai_analysis' && (
            <div className="min-h-[200px] flex flex-col">
              {!aiStarted && !aiAnalysis && !aiLoading && !classificationLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center space-y-6 max-w-md mx-auto">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full">
                      <SparklesIcon className="w-10 h-10 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        Análisis Inteligente con IA
                      </h3>
                      <p className="text-gray-600 mb-6">
                        La IA puede analizar automáticamente tu documento y detectar la estructura, categorías y moneda. 
                        También puedes omitir este paso y hacer el mapeo manualmente.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button
                        variant="primary"
                        size="lg"
                        onClick={() => {
                          setAiStarted(true);
                          performAIAnalysis();
                        }}
                        leftIcon={<SparklesIcon className="w-5 h-5" />}
                      >
                        Iniciar Análisis IA
                      </Button>
                      <Button
                        variant="secondary"
                        size="lg"
                        onClick={() => {
                          // Skip AI entirely
                          setAiAnalysis({
                            statementType: 'profit_loss',
                            confidence: 0,
                            headerRows: [0],
                            dataStartRow: 1,
                            dataEndRow: displayData.length - 1,
                            totalRows: [],
                            subtotalRows: [],
                            accountColumns: { confidence: 0 },
                            periodColumns: [],
                            currency: selectedCurrency,
                            reasoning: 'Mapeo manual - IA omitida'
                          });
                          setAnalysisComplete(true);
                          setAiStarted(true);
                          setMappingStep('concepts');
                        }}
                      >
                        Mapeo Manual
                      </Button>
                    </div>
                  </div>
                </div>
              ) : aiLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="relative">
                      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
                      <SparklesIcon className="w-8 h-8 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-medium text-gray-900 mb-2">Análisis con Inteligencia Artificial</p>
                      <p className="text-sm text-blue-600 animate-pulse">{aiProgress}</p>
                    </div>
                    <div className="w-64 bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-blue-700 h-3 rounded-full transition-all duration-500 ease-out" 
                        style={{width: `${progressPercentage}%`}}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-600 font-mono">
                      {progressPercentage}% completado
                    </div>
                  </div>
                </div>
              ) : aiAnalysis && classificationLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="bg-white border border-blue-300 rounded-lg p-6 shadow-lg max-w-md mx-auto">
                    <div className="flex flex-col items-center space-y-4">
                      {analysisComplete ? (
                        // Show success state when classification is complete
                        <>
                          <div className="relative">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                              <CheckCircleIcon className="w-10 h-10 text-green-600" />
                            </div>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-medium text-gray-900 mb-2">✅ Clasificación IA Completada</p>
                            <p className="text-sm text-green-600">{aiProgress}</p>
                          </div>
                          {accountClassifications.length > 0 && (
                            <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 w-full">
                              <p className="font-medium mb-1">Resumen de clasificación:</p>
                              <p className="text-xs">{accountClassifications.length} cuentas procesadas</p>
                            </div>
                          )}
                          <Button
                            variant="primary"
                            size="lg"
                            onClick={() => {
                              setClassificationLoading(false);
                              setMappingStep('concepts');
                            }}
                            className="mt-4"
                          >
                            Continuar al Mapeo →
                          </Button>
                        </>
                      ) : (
                        // Show loading state while classification is in progress
                        <>
                          <div className="relative">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
                            <SparklesIcon className="w-8 h-8 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-medium text-gray-900 mb-2">🤖 Clasificación IA en Progreso</p>
                            <p className="text-sm text-blue-600 animate-pulse">{aiProgress}</p>
                          </div>
                          <div className="w-64 bg-gray-200 rounded-full h-3">
                            <div 
                              className="bg-gradient-to-r from-blue-500 to-blue-700 h-3 rounded-full transition-all duration-500 ease-out" 
                              style={{width: `${progressPercentage}%`}}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-600 font-mono">
                            {progressPercentage}% completado
                          </div>
                          <p className="text-xs text-center text-gray-600 max-w-xs">
                            La IA está analizando las cuentas detectadas y asignando categorías automáticamente...
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : aiAnalysis ? (
                <div className="flex-1 space-y-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <h4 className="font-semibold text-green-900 mb-1">✅ Análisis Completado</h4>
                    <div className="text-sm text-green-700">
                      <p>{aiAnalysis.statementType} ({aiAnalysis.confidence}%) | {aiAnalysis.currency} | Filas: {aiAnalysis.dataStartRow}-{aiAnalysis.dataEndRow}</p>
                    </div>
                  </div>
                  
                  {/* Classification Complete Message */}
                  {accountClassifications.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-green-600">✅</span>
                          <div>
                            <h4 className="font-semibold text-green-900">Clasificación IA Completada</h4>
                            <p className="text-sm text-green-700">
                              {accountClassifications.length} cuentas clasificadas
                            </p>
                          </div>
                        </div>
                        <button 
                          className="text-xs text-green-600 hover:text-green-800 underline"
                          onClick={() => {
                            const categories = accountClassifications.reduce((acc: any, item) => {
                              acc[item.suggestedCategory] = (acc[item.suggestedCategory] || 0) + 1;
                              return acc;
                            }, {});
                            alert(`Categorías detectadas:\n${Object.entries(categories).map(([cat, count]) => `• ${cat.replace(/_/g, ' ')}: ${count} cuentas`).join('\n')}`);
                          }}
                        >
                          Ver detalles
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Compact Currency Selection */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold text-blue-900">Moneda</h4>
                      <div className="flex items-center space-x-2">
                        {classificationLoading && !analysisComplete && (
                          <button
                            onClick={forceCompleteAnalysis}
                            className="px-3 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 transition-colors"
                          >
                            Omitir IA
                          </button>
                        )}
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleNext}
                          disabled={!canProceedToNext()}
                        >
                          {!analysisComplete && (aiLoading || classificationLoading) ? (
                            <>
                              <span className="animate-spin inline-block mr-2">⚙️</span>
                              Analizando...
                            </>
                          ) : analysisComplete || accountClassifications.length > 0 ? (
                            'Continuar →'
                          ) : (
                            'Siguiente →'
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                      {LATAM_CURRENCIES.map((currency) => (
                        <button
                          key={currency.code}
                          onClick={() => setSelectedCurrency(currency.code)}
                          className={`p-2 rounded-lg border transition-all ${
                            selectedCurrency === currency.code
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                          }`}
                        >
                          <div className="text-lg">{currency.flag}</div>
                          <div className="font-bold text-xs">{currency.code}</div>
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 text-xs text-blue-700">
                      <p>
                        <span className="font-semibold">Seleccionada:</span> {
                          LATAM_CURRENCIES.find(c => c.code === selectedCurrency)?.name || selectedCurrency
                        } ({selectedCurrency})
                      </p>
                    </div>
                  </div>
                  {aiAnalysis.reasoning && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-2">Análisis IA</h4>
                      <p className="text-sm text-blue-800">{aiAnalysis.reasoning}</p>
                    </div>
                  )}
                </div>
              ) : aiError ? (
                <div className="flex-1 space-y-6">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <LightBulbIcon className="w-5 h-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-yellow-900 mb-1">Análisis IA no disponible</h4>
                        <p className="text-sm text-yellow-800">{aiError}</p>
                        <p className="text-sm text-yellow-700 mt-2">
                          No te preocupes, puedes continuar con el mapeo manual. El sistema te guiará paso a paso.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-blue-900">Seleccionar Moneda</h4>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleNext}
                        disabled={!canProceedToNext()}
                      >
                        {!analysisComplete && (aiLoading || classificationLoading) ? (
                          <>
                            <span className="animate-spin inline-block mr-2">⚙️</span>
                            Analizando...
                          </>
                        ) : analysisComplete || accountClassifications.length > 0 ? (
                          'Continuar →'
                        ) : (
                          'Siguiente →'
                        )}
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {LATAM_CURRENCIES.map((currency) => (
                        <button
                          key={currency.code}
                          onClick={() => setSelectedCurrency(currency.code)}
                          className={`p-4 rounded-lg border-2 transition-all transform hover:scale-105 ${
                            selectedCurrency === currency.code
                              ? 'bg-blue-600 text-white border-blue-600 shadow-lg scale-105'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:shadow-md'
                          }`}
                        >
                          <div className="text-2xl mb-2">{currency.flag}</div>
                          <div className="font-bold text-base">{currency.code}</div>
                          <div className="text-sm opacity-80">{currency.symbol}</div>
                        </button>
                      ))}
                    </div>
                    <div className="mt-4 p-3 bg-white rounded-lg border border-blue-300">
                      <p className="text-sm text-blue-900">
                        <span className="font-semibold">Moneda seleccionada:</span> {
                          LATAM_CURRENCIES.find(c => c.code === selectedCurrency)?.name || selectedCurrency
                        } ({selectedCurrency})
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* AI Classification Loading Overlay for Account Review Step */}
          {mappingStep === 'account_review' && classificationLoading && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white border-2 border-blue-400 rounded-xl p-8 shadow-2xl max-w-lg mx-auto transform scale-105">
                <div className="flex flex-col items-center space-y-6">
                  {analysisComplete && progressPercentage === 100 ? (
                    // Show success state when classification is complete
                    <>
                      <div className="relative">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                          <CheckCircleIcon className="w-12 h-12 text-green-600" />
                        </div>
                      </div>
                      <div className="text-center space-y-2">
                        <h3 className="text-2xl font-bold text-gray-900">✅ ¡Clasificación Completada!</h3>
                        <p className="text-lg text-green-600 font-medium">{aiProgress}</p>
                      </div>
                      {accountClassifications.length > 0 && (
                        <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 w-full">
                          <p className="font-medium mb-1">Resumen de clasificación:</p>
                          <p className="text-xs">{accountClassifications.length} cuentas procesadas</p>
                        </div>
                      )}
                      <Button
                        variant="primary"
                        size="lg"
                        onClick={() => setClassificationLoading(false)}
                        className="mt-4 w-full"
                      >
                        Continuar →
                      </Button>
                    </>
                  ) : (
                    // Show loading state while classification is in progress
                    <>
                      <div className="relative">
                        <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-600 border-t-transparent"></div>
                        <SparklesIcon className="w-10 h-10 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                      </div>
                      <div className="text-center space-y-2">
                        <h3 className="text-2xl font-bold text-gray-900">🤖 Agregando Columna de IA</h3>
                        <p className="text-lg text-blue-600 animate-pulse font-medium">{aiProgress}</p>
                      </div>
                      <div className="w-80 bg-gray-200 rounded-full h-4 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-blue-700 h-4 rounded-full transition-all duration-500 ease-out relative"
                          style={{width: `${progressPercentage}%`}}
                        >
                          <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-700 font-mono bg-gray-100 px-3 py-1 rounded">
                        {progressPercentage}% completado
                      </div>
                      <p className="text-sm text-center text-gray-600 max-w-md">
                        La inteligencia artificial está analizando cada cuenta y agregando una nueva columna con las categorías detectadas automáticamente.
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <div className="animate-pulse">⚡</div>
                        <span>Procesando con OpenAI GPT-3.5</span>
                      </div>
                      {showForceButton && (
                        <div className="mt-4 pt-4 border-t border-gray-300 w-full">
                          <button
                            onClick={forceCompleteAnalysis}
                            className="w-full px-4 py-3 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors shadow-md"
                          >
                            🚀 Completar Ahora
                          </button>
                          <p className="text-xs text-gray-600 mt-2 text-center">
                            La clasificación está tardando más de lo esperado
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Excel Table - Show for all steps except AI analysis */}
          {mappingStep !== 'ai_analysis' && (
            <div className="space-y-4 relative mt-6">
              {/* Compact Navigation Buttons */}
              <div className="flex justify-between items-center mb-4">
                <Button
                  variant="secondary"
                  onClick={() => setMappingStep(getPrevStep())}
                  disabled={WIZARD_STEPS.findIndex(s => s.id === mappingStep) === 0}
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
                      Siguiente →
                    </Button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto overflow-y-visible">
                <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-3 py-3 text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50 z-10 min-w-[80px]">
                      Fila
                    </th>
                    {/* Render concept columns first */}
                    {conceptColumns.map((cc) => (
                      <th key={`concept-${cc.columnIndex}`} className={`px-3 py-2 min-w-[250px] ${cc.columnType === 'account_name' ? 'bg-gray-50' : 'bg-gray-50'}`}>
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-medium text-gray-600 uppercase">
                            {cc.columnType === 'account_name' ? 'Conceptos' : 'Código'}
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
                    
                    {/* Simplified Classification Column */}
                    {mappingStep === 'account_review' && (
                      <th className="px-3 py-2 min-w-[300px] bg-purple-50 border-l-2 border-purple-300">
                        <div className="flex items-center space-x-2">
                          <SparklesIcon className="w-4 h-4 text-purple-600" />
                          <span className="text-xs font-medium text-purple-700 uppercase">Clasificación</span>
                        </div>
                      </th>
                    )}
                    
                    {/* Render all other columns */}
                    {Array.from({ length: maxCols })
                      .map((_, colIndex) => colIndex)
                      .filter(colIndex => !conceptColumns.some(cc => cc.columnIndex === colIndex))
                      .map((colIndex) => (
                      <th key={colIndex} className="px-2 py-1 min-w-[100px]">
                        <div className="flex flex-col items-center space-y-1">
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
                          {mappingStep === 'account_review' && isPeriodColumn(colIndex) && (
                            <div className="flex flex-col items-center">
                              <span className="text-xs text-purple-600 font-medium">
                                {periodColumns.find(pc => pc.columnIndex === colIndex)?.periodLabel}
                              </span>
                            </div>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                
                <tbody>
                  {displayData.slice(0, visibleRows).map((row, rowIndex) => {
                    // Check manual override first, then AI detection
                    const manualType = manualRowTypes[rowIndex];
                    const totalRow = detectedTotalRows.find(t => t.rowIndex === rowIndex);
                    const isTotal = manualType === 'total' || (!manualType && !!totalRow && totalRow.totalType !== 'section_header');
                    const isSectionHeader = manualType === 'section_header' || (!manualType && totalRow?.totalType === 'section_header');
                    const isManuallySet = !!manualType;
                    
                    return (
                      <tr 
                        key={rowIndex}
                        className={`
                          ${isSectionHeader ? 'bg-blue-50 text-blue-900 border-y border-blue-200' : isTotal ? 'bg-gray-100' : 'hover:bg-gray-50'}
                          ${rowIndex === periodHeaderRow ? 'ring-2 ring-blue-500' : ''}
                        `}
                      >
                        <td className={`px-3 py-2 text-sm font-mono sticky left-0 z-10 border-r ${
                          isSectionHeader 
                            ? 'bg-blue-50 text-blue-700 border-blue-200' 
                            : isTotal
                            ? 'bg-gray-100 text-gray-600 border-gray-200'
                            : 'bg-white text-gray-500 border-gray-200'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs">{rowIndex + 1}</span>
                            {mappingStep === 'account_review' && (
                              <span className="text-base" title={
                                isSectionHeader ? 'Sección' : isTotal ? 'Total' : 'Cuenta'
                              }>
                                {isSectionHeader ? '📁' : isTotal ? 'Σ' : '📊'}
                              </span>
                            )}
                            {mappingStep === 'periods' && !isSectionHeader && (
                              <Button
                                size="sm"
                                variant={rowIndex === periodHeaderRow ? 'primary' : 'secondary'}
                                onClick={() => setPeriodHeaderRow(rowIndex)}
                              >
                                {rowIndex === periodHeaderRow ? '✓' : 'H'}
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
                              onClick={() => !isSectionHeader && setSelectedCell({row: rowIndex, col: cc.columnIndex})}
                              className={`px-3 py-3 min-w-[250px] text-sm ${
                                isSectionHeader ? 'font-bold text-blue-900 uppercase' : isTotal ? 'font-bold' : ''
                              }`}
                            >
                              {cellValue !== null && cellValue !== undefined ? (
                                <span className={isSectionHeader ? 'text-blue-900' : isTotal ? 'text-gray-900' : 'text-gray-700'}>
                                  {String(cellValue)}
                                </span>
                              ) : (
                                <span className={isSectionHeader ? 'text-blue-400' : 'text-gray-300'}>-</span>
                              )}
                            </td>
                          );
                        })}
                        
                        {/* AI Classification Data */}
                        {mappingStep === 'account_review' && (() => {
                          let accountName = '';
                          conceptColumns.forEach(cc => {
                            const value = row[cc.columnIndex];
                            if (value && cc.columnType === 'account_name') {
                              accountName = String(value);
                            }
                          });
                          
                          const classification = accountClassifications.find(c => c.accountName === accountName);
                          
                          // Simplified single classification column
                          return (
                            <td className={`px-3 py-3 border-l-2 ${
                              isSectionHeader ? 'bg-blue-50 border-blue-300' : 
                              isTotal ? 'bg-gray-100 border-gray-400' : 
                              'bg-purple-50 border-purple-300'
                            }`}>
                              <div className="space-y-2">
                                {/* Row type and classification display */}
                                <div className="flex items-center justify-between">
                                  {isSectionHeader ? (
                                    <span className="text-sm font-medium text-blue-900">Encabezado de Sección</span>
                                  ) : isTotal ? (
                                    <span className="text-sm font-medium text-gray-700">Total de Sección</span>
                                  ) : classification ? (
                                    <div className="flex items-center space-x-2 flex-1">
                                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                                        classification.isInflow 
                                          ? 'bg-green-100 text-green-800' 
                                          : 'bg-red-100 text-red-800'
                                      }`}>
                                        {classification.isInflow ? '↑' : '↓'} {classification.suggestedCategory.replace(/_/g, ' ')}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {classification.confidence}%
                                      </span>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        const tempClassification: AccountClassification = {
                                          accountName,
                                          suggestedCategory: 'other',
                                          confidence: 0,
                                          isInflow: true,
                                          reasoning: '',
                                          alternativeCategories: []
                                        };
                                        setEditingClassification(tempClassification);
                                      }}
                                      className="text-xs px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded"
                                    >
                                      + Asignar Categoría
                                    </button>
                                  )}
                                  
                                  {/* Edit button for existing classifications */}
                                  {classification && !isSectionHeader && !isTotal && (
                                    <button
                                      onClick={() => setEditingClassification(classification)}
                                      className="text-xs text-purple-600 hover:text-purple-800"
                                    >
                                      Editar
                                    </button>
                                  )}
                                </div>
                                
                                {/* Row type selector */}
                                <div className="flex items-center justify-between">
                                  <RowTypeSelector
                                    currentType={
                                      isSectionHeader ? 'section_header' : 
                                      isTotal ? 'total' : 
                                      'account'
                                    }
                                    accountName={accountName}
                                    onTypeChange={(type) => handleManualRowTypeChange(rowIndex, type as RowType)}
                                    isManuallySet={isManuallySet}
                                  />
                                </div>
                              </div>
                            </td>
                          );
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
                                onClick={() => !isSectionHeader && setSelectedCell({row: rowIndex, col: colIndex})}
                                className={
                                  isSectionHeader ? 
                                    "px-3 py-2 bg-blue-50 text-blue-400 text-center" : 
                                  isTotal ? 
                                    "px-3 py-2 bg-gray-100 font-semibold border-y border-gray-300" : 
                                    getCellStyle(rowIndex, colIndex)
                                }
                              >
                                <div className="truncate max-w-[120px]">
                                  {isSectionHeader ? (
                                    <span className="text-blue-400">-</span>
                                  ) : cellValue !== null && cellValue !== undefined ? (
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
            disabled={WIZARD_STEPS.findIndex(s => s.id === mappingStep) === 0}
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