"use client";

import { useState, useMemo, useEffect } from "react";
import { MatrixMapping, DocumentStructure, AccountClassification, ValidationIssue } from "@/types";
import { CategoryBadge } from "./CategoryBadge";
import { ManualCategorySelector } from "./ManualCategorySelector";
import { CategoryManagement } from "./CategoryManagement";
import { detectTotalRows, TotalDetectionResult } from "@/lib/total-detection";
import { LocalAccountClassifier } from "@/lib/local-classifier";
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
import { useTranslation } from "@/lib/translations";

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
  companyId?: string;
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

// Move WIZARD_STEPS inside component to access translations
// const WIZARD_STEPS will be defined inside the component

export function MatrixExcelViewerV2({
  rawData,
  excelMetadata,
  onMappingComplete,
  locale,
  statementType = 'profit_loss',
  companyId
}: MatrixExcelViewerProps) {
  const { t } = useTranslation(locale);
  
  // Define wizard steps with translations
  const WIZARD_STEPS: Step[] = [
    { id: 'ai_analysis', name: t('mapper.aiAnalysis.title'), icon: <SparklesIcon className="w-5 h-5" /> },
    { id: 'concepts', name: 'Conceptos', icon: <TableCellsIcon className="w-5 h-5" /> },
    { id: 'periods', name: 'Períodos', icon: <CalendarDaysIcon className="w-5 h-5" /> },
    { id: 'data', name: 'Datos', icon: <DocumentTextIcon className="w-5 h-5" /> },
    { id: 'account_review', name: 'Clasificación', icon: <TagIcon className="w-5 h-5" /> },
    { id: 'persist', name: 'Guardar', icon: <CheckCircleIcon className="w-5 h-5" /> }
  ];
  
  // Mapping state
  const [conceptColumns, setConceptColumns] = useState<MatrixMapping['conceptColumns']>([]);
  const [periodHeaderRow, setPeriodHeaderRow] = useState<number>(-1);
  const [periodColumns, setPeriodColumns] = useState<MatrixMapping['periodColumns']>([]);
  const [rowIncomeStatus, setRowIncomeStatus] = useState<Record<number, boolean>>({});
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
  const [showCategoryManagement, setShowCategoryManagement] = useState(false);
  
  // AI state
  const [aiAnalysis, setAiAnalysis] = useState<DocumentStructure | null>(null);
  const [accountClassifications, setAccountClassifications] = useState<AccountClassification[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [detectedTotalRows, setDetectedTotalRows] = useState<TotalDetectionResult[]>([]);
  const [aiProgress, setAiProgress] = useState<string>(t('mapper.aiAnalysis.ready'));
  const [classificationLoading, setClassificationLoading] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [showForceButton, setShowForceButton] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<'ai' | 'manual'>('ai');
  const [aiStarted, setAiStarted] = useState(false); // Control auto-start
  
  // Manual override state
  const [manualRowTypes, setManualRowTypes] = useState<Record<number, 'account' | 'section_header' | 'total'>>({})
  
  // Currency state - default to USD until AI detects the actual currency
  const [selectedCurrency, setSelectedCurrency] = useState<string>('USD');
  
  const displayData = useMemo(() => {
    return excelMetadata?.data || rawData;
  }, [rawData, excelMetadata]);

  // Function to check if a row has any meaningful data
  const isRowEmpty = (row: any[], rowIndex: number) => {
    // Don't filter header rows
    if (rowIndex === 0) return false;
    
    // Check if all cells are empty, null, undefined, or just whitespace
    return row.every(cell => {
      if (cell === null || cell === undefined) return true;
      const cellStr = String(cell).trim();
      return cellStr === '' || cellStr === '-' || cellStr === '0' || cellStr === '0.00';
    });
  };

  // Create array of row indices for non-empty rows when showing all rows
  const visibleRowIndices = useMemo(() => {
    if (!showAllRows) {
      return Array.from({ length: Math.min(20, displayData.length) }, (_, i) => i);
    }
    
    return displayData
      .map((row, index) => ({ row, index }))
      .filter(({ row, index }) => !isRowEmpty(row, index))
      .map(({ index }) => index);
  }, [displayData, showAllRows]);

  const maxRows = displayData.length;
  const maxCols = Math.max(...displayData.map(row => row.length));
  const visibleRows = visibleRowIndices.length;

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

  // Auto-detect data range when entering data step
  useEffect(() => {
    if (mappingStep === 'data' && conceptColumns.length > 0 && dataRange.startRow === -1) {
      // Auto-detect data range immediately when entering this step
      const timer = setTimeout(() => {
        detectDataRange();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [mappingStep]); // Only depend on mappingStep to ensure it runs when entering the step

  // AI Analysis Functions - UNIFIED VERSION WITH CACHING
  const performCompleteAIAnalysis = async () => {
    // Auto-clear AI cache before running analysis
    console.log('🗑️ Auto-clearing AI cache for fresh analysis...');
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.startsWith('aiAnalysisComplete_')) {
        sessionStorage.removeItem(key);
      }
    });
    
    // Generate data fingerprint for caching
    const dataFingerprint = JSON.stringify({
      dataHash: JSON.stringify(displayData.slice(0, 20)), // Use first 20 rows for fingerprint
      dataLength: displayData.length,
      columnCount: displayData[0]?.length || 0
    });
    
    // Since we cleared cache, skip cache check and proceed with fresh analysis
    const cacheKey = `aiAnalysisComplete_${btoa(dataFingerprint).slice(0, 32)}`;
    const cachedResult = null; // Force fresh analysis
    
    if (cachedResult) {
      try {
        const parsed = JSON.parse(cachedResult);
        console.log('🎯 Using cached AI analysis results - NO API CALL NEEDED!');
        
        setProgressPercentage(10);
        setAiProgress('📦 Cargando resultados desde caché...');
        
        // Apply cached results
        const { structure, classifications, confidence, processingTime } = parsed;
        setAiAnalysis(structure);
        setAccountClassifications(classifications);
        
        // Apply structure settings
        if (structure.accountColumns.nameColumn !== undefined) {
          setConceptColumns([{
            columnIndex: structure.accountColumns.nameColumn,
            columnType: 'account_name' as const
          }]);
        }
        
        if (structure.periodColumns.length > 0) {
          setPeriodColumns(structure.periodColumns.map((pc: any) => ({
            columnIndex: pc.columnIndex,
            periodLabel: pc.periodLabel,
            periodType: pc.periodType
          })));
        }
        
        if (structure.dataStartRow !== undefined) {
          setDataRange({
            startRow: structure.dataStartRow,
            endRow: structure.dataEndRow,
            startCol: 0,
            endCol: displayData[0]?.length - 1 || 0
          });
        }
        
        if (structure.currency) {
          const currencyMappings: Record<string, string> = {
            'arg pesos': 'ARS', 'ars': 'ARS', 'mxn': 'MXN', 'usd': 'USD', 'cop': 'COP'
          };
          const mappedCurrency = currencyMappings[structure.currency.toLowerCase()] || structure.currency;
          if (LATAM_CURRENCIES.some(c => c.code === mappedCurrency)) {
            setSelectedCurrency(mappedCurrency);
          }
        }
        
        setProgressPercentage(100);
        setAiProgress(`✅ Caché utilizado: ${classifications.length} clasificaciones aplicadas instantáneamente`);
        setAnalysisComplete(true);
        setAiLoading(false);
        setClassificationLoading(false);
        return;
      } catch (e) {
        console.log('Cache corrupted, proceeding with fresh analysis');
        sessionStorage.removeItem(cacheKey);
      }
    }
    
    // No cache or corrupted cache - proceed with fresh analysis
    setAiLoading(true);
    setAiError(null);
    setAnalysisComplete(false);
    setClassificationLoading(true);
    setProgressPercentage(10);
    setAiProgress('🚀 Iniciando análisis inteligente unificado... Estructura + Clasificación en una sola llamada');
    
    let structureResult: any = null;
    
    try {
      // NEW: Single unified API call for complete analysis
      console.log('🚀 Starting AI analysis with data:', {
        action: 'complete',
        dataRows: displayData.length,
        dataCols: displayData[0]?.length,
        sampleData: displayData.slice(0, 3)
      });

      const completeResponse = await fetch('/api/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete', // NEW: Complete analysis action
          rawData: displayData,
          fileName: 'excel-file'
        })
      });

      structureResult = await completeResponse.json();
      console.log('🔍 AI Analysis Result:', structureResult);
      setProgressPercentage(30);
      setAiProgress('📊 Análisis completo recibido. Procesando estructura y clasificaciones...');
      
      console.log('📊 Processing AI result with success:', structureResult.success);
      console.log('📊 Full structure result:', structureResult);
      
      if (structureResult.success) {
        const { structure, classifications, confidence, processingTime } = structureResult.data;
        
        console.log('✅ AI Analysis extracted:', {
          structure,
          classificationsCount: classifications?.length,
          confidence,
          processingTime
        });
        
        // Log detailed info about what was detected
        console.log('📊 Data Analysis Details:', {
          totalRowsInExcel: displayData.length,
          headerRows: structure.headerRows,
          dataStartRow: structure.dataStartRow,
          dataEndRow: structure.dataEndRow,
          expectedDataRows: structure.dataEndRow - structure.dataStartRow + 1,
          actualClassifications: classifications?.length,
          totalRows: structure.totalRows,
          accountColumnDetected: structure.accountColumns
        });
        
        // Show all account names that were classified
        if (classifications && classifications.length > 0) {
          console.log('📝 Classified Accounts:', classifications.map((c: any) => ({
            name: c.accountName,
            category: c.suggestedCategory,
            confidence: c.confidence
          })));
        }
        
        // Extract ALL accounts from the data range that weren't classified
        const accountColIndex = structure.accountColumns?.nameColumn || 0;
        const allAccountsInRange = [];
        
        for (let i = structure.dataStartRow; i <= structure.dataEndRow && i < displayData.length; i++) {
          const row = displayData[i];
          const accountName = row?.[accountColIndex];
          if (accountName && String(accountName).trim()) {
            allAccountsInRange.push({
              rowIndex: i,
              accountName: String(accountName).trim()
            });
          }
        }
        
        console.log('🔍 Account Detection Analysis:', {
          totalAccountsInDataRange: allAccountsInRange.length,
          accountsClassifiedByAI: classifications?.length || 0,
          missingAccounts: allAccountsInRange.length - (classifications?.length || 0),
          allAccountNames: allAccountsInRange.map(a => a.accountName)
        });
        
        // Set structure analysis results
        setAiAnalysis(structure);
        setProgressPercentage(50);
        setAiProgress(`💰 ${structure.statementType === 'profit_loss' ? 'Estado de P&L' : structure.statementType === 'balance_sheet' ? 'Balance General' : 'Flujo de Caja'} detectado. Aplicando ${classifications.length} clasificaciones...`);
        
        // Auto-set detected currency if valid
        if (structure.currency) {
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
          
          const detectedCurrency = structure.currency.toLowerCase();
          const mappedCurrency = currencyMappings[detectedCurrency] || structure.currency;
          
          if (LATAM_CURRENCIES.some(c => c.code === mappedCurrency)) {
            setSelectedCurrency(mappedCurrency);
          }
        }
        
        // Apply AI suggestions for structure
        const conceptCols = [];
        let nameColIndex = -1;
        
        if (structure.accountColumns.nameColumn !== undefined) {
          const suggestedNameCol = structure.accountColumns.nameColumn;
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
        
        if (structure.periodColumns.length > 0) {
          setPeriodColumns(structure.periodColumns.map((pc: any) => ({
            columnIndex: pc.columnIndex,
            periodLabel: pc.periodLabel,
            periodType: pc.periodType
          })));
          
          if (structure.headerRows.length > 0) {
            setPeriodHeaderRow(structure.headerRows[0]);
          }
        }
        
        if (structure.dataStartRow !== undefined) {
          setDataRange({
            startRow: structure.dataStartRow,
            endRow: structure.dataEndRow,
            startCol: 0,
            endCol: maxCols - 1
          });
        }
        
        setProgressPercentage(75);
        setAiProgress(`🎨 Aplicando ${classifications.length} clasificaciones de cuentas...`);
        
        // Apply account classifications directly (no second API call needed!)
        if (classifications && classifications.length > 0) {
          setAccountClassifications(classifications);
          setProgressPercentage(90);
          setAiProgress(`✅ ${t('mapper.aiAnalysis.completeAnalysis')}: ${conceptCols.length} ${t('mapper.aiAnalysis.columns')}, ${structure.periodColumns?.length || 0} ${t('mapper.aiAnalysis.periods')}, ${classifications.length} ${t('mapper.aiAnalysis.accountsClassified')}`);
        }
        
        // IMPORTANT: Add missing accounts that AI didn't classify
        const allClassifications = [...classifications];
        const classifiedAccountNames = new Set(classifications.map((c: any) => c.accountName.toLowerCase()));
        
        // Find ALL accounts in the data range
        const accountNameCol = structure.accountColumns?.nameColumn || 0;
        for (let i = structure.dataStartRow; i <= structure.dataEndRow && i < displayData.length; i++) {
          const row = displayData[i];
          const accountName = row?.[accountNameCol];
          
          if (accountName && String(accountName).trim()) {
            const cleanName = String(accountName).trim();
            
            // If this account wasn't classified by AI, add it with local classification
            if (!classifiedAccountNames.has(cleanName.toLowerCase())) {
              const localClassification = LocalAccountClassifier.classifyAccount(
                cleanName,
                row[1], // First value column
                { statementType: structure.statementType }
              );
              
              allClassifications.push({
                accountName: cleanName,
                suggestedCategory: localClassification.suggestedCategory,
                isInflow: localClassification.isInflow,
                confidence: localClassification.confidence,
                reasoning: 'Classified by local analyzer (AI missed this account)',
                alternativeCategories: [],
                validationApplied: true,
                validationCorrections: 0
              });
            }
          }
        }
        
        console.log(`✅ Total classifications: ${allClassifications.length} (AI: ${classifications.length}, Local: ${allClassifications.length - classifications.length})`);
        setAccountClassifications(allClassifications);
        
        if (allClassifications.length === 0) {
          console.warn('⚠️ No accounts found at all');
          setAccountClassifications([]);
        }
        
        setProgressPercentage(100);
        setAiProgress(`🚀 ${t('mapper.aiAnalysis.unifiedCompleted')} ${processingTime}ms - ${t('mapper.aiAnalysis.confidence')}: ${confidence}%`);
        setAnalysisComplete(true);
        setAiLoading(false);
        setClassificationLoading(false);
        
        // Cache the results for future use
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({
            structure,
            classifications,
            confidence,
            processingTime,
            timestamp: Date.now()
          }));
          console.log('💾 AI analysis results cached for future use');
        } catch (e) {
          console.warn('Failed to cache results:', e);
        }
        
        console.log(`✅ Unified AI Analysis completed:
          - Processing time: ${processingTime}ms  
          - Document type: ${structure.statementType}
          - Concept columns: ${conceptCols.length}
          - Period columns: ${structure.periodColumns?.length || 0}
          - Account classifications: ${classifications.length}
          - Overall confidence: ${confidence}%
          - Results cached: ✅
          - NO REDUNDANT API CALLS! 🎉`);
        
      } else {
        const errorMsg = structureResult.error || "El análisis automático no pudo procesar este documento correctamente.";
        console.error('❌ AI Analysis failed:', {
          error: errorMsg,
          success: structureResult.success,
          fullResponse: structureResult
        });
        setAiError(`❌ ${errorMsg}\n\nDEBUG: ${JSON.stringify(structureResult, null, 2)}`);
        setAiLoading(false);
        setClassificationLoading(false);
        
        // Automatically offer manual mode as fallback
        setTimeout(() => {
          if (confirm('❌ La IA no pudo analizar el documento. ¿Quieres cambiar al modo manual para configurar todo paso a paso?')) {
            setAnalysisMode('manual');
            setAiError(null);
            handleNext(); // This will now skip to concepts step
          }
        }, 2000);
      }
    } catch (error) {
      console.error('Complete AI analysis error:', error);
      
      // Different error messages based on error type
      let errorMessage = "No se pudo conectar con el servicio de IA.";
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = "Error de conexión. Verifica tu conexión a internet y vuelve a intentar.";
      } else if (error instanceof SyntaxError) {
        errorMessage = "El servicio de IA devolvió una respuesta inválida. Intenta el modo manual.";
      }
      
      setAiError(errorMessage);
      setAiLoading(false);
      setClassificationLoading(false);
      
      // Automatically switch to manual mode after 3 seconds
      setTimeout(() => {
        console.log('Auto-switching to manual mode due to AI failure');
        setAnalysisMode('manual');
        setAiError(null);
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
          reasoning: 'Análisis IA falló - Modo manual activado automáticamente'
        });
        setAnalysisComplete(true);
        setMappingStep('concepts');
      }, 3000);
    }
  };

  // Legacy function for backward compatibility - now delegates to unified analysis
  const performAIAnalysis = async () => {
    console.log('⚠️ Using legacy performAIAnalysis - delegating to unified analysis');
    await performCompleteAIAnalysis();
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
    setAiProgress('🎨 Detectando filas de totales y subtotales...');
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
      
      setAiProgress('📝 Extrayendo cuentas individuales para clasificación...');
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
        setAiProgress('⚠️ No se encontraron cuentas para clasificar - Continuando con mapeo manual');
        setAnalysisComplete(true);
        setProgressPercentage(100);
        clearTimeout(timeoutId);
        // Keep showing the completion state briefly before hiding
        setTimeout(() => {
          setClassificationLoading(false);
        }, 1500);
        return;
      }
      
      setAiProgress(`🤖 Clasificando ${accounts.length} cuentas con inteligencia artificial...`);
      setProgressPercentage(85);
      
      // Add a small delay to ensure the UI updates
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setAiProgress('🚀 Enviando datos a OpenAI GPT-4o para análisis semántico...');
      setProgressPercentage(88);
      
      // Add surrounding context for better classification
      const accountColumnIndex = conceptColumns.find(cc => cc.columnType === 'account_name')?.columnIndex || 0;
      const accountsWithContext = accounts.map(account => {
        const rowIdx = account.rowIndex;
        const context = {
          ...account,
          previousRows: displayData.slice(Math.max(0, rowIdx - 3), rowIdx).map(row => row[accountColumnIndex] || ''),
          nextRows: displayData.slice(rowIdx + 1, Math.min(displayData.length, rowIdx + 4)).map(row => row[accountColumnIndex] || '')
        };
        return context;
      });

      const classificationResponse = await fetch('/api/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'classify',
          rawData: displayData,
          accounts: accountsWithContext,
          documentContext: {
            statementType: aiAnalysis.statementType,
            currency: aiAnalysis.currency
          }
        })
      });

      setAiProgress('⚙️ Procesando respuesta de IA y aplicando clasificaciones...');
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
        setAiProgress(`✅ ¡Clasificación completada! Detectadas: ${categorySummary}${Object.keys(categories).length > 3 ? ' y más...' : ''}`);
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
    setPeriodColumns((prev: any) => ({
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
    // Find the row index for this account to update row income status
    const accountRow = displayData.findIndex(row => {
      const accountNameCol = conceptColumns.find(cc => cc.columnType === 'account_name')?.columnIndex;
      return accountNameCol !== undefined && String(row[accountNameCol]) === accountName;
    });
    
    // Update row income status
    if (accountRow >= 0) {
      setRowIncomeStatus(prev => ({
        ...prev,
        [accountRow]: isInflow
      }));
    }
    
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

  const getColumnName = (colIndex: number): string => {
    let name = '';
    while (colIndex >= 0) {
      name = String.fromCharCode(65 + (colIndex % 26)) + name;
      colIndex = Math.floor(colIndex / 26) - 1;
    }
    return name;
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
    // Handle AI analysis step based on selected mode
    if (mappingStep === 'ai_analysis' && !aiStarted) {
      if (analysisMode === 'ai') {
        // Start AI analysis
        setAiStarted(true);
        performCompleteAIAnalysis();
      } else {
        // Skip AI and go to manual mapping
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
      }
      return;
    }
    
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
                ? `✅ ${t('mapper.aiAnalysis.completed')}`
                : classificationLoading 
                  ? t('mapper.aiAnalysis.classifying')
                  : aiLoading
                    ? t('mapper.aiAnalysis.processing')
                    : t('mapper.aiAnalysis.ready')
            )}
            {mappingStep === 'concepts' && (
              <div className="space-y-1">
                <div className="font-medium">📊 Identificar columnas de cuentas</div>
                <div className="text-xs text-gray-600">
                  Haz clic en "Marcar" debajo de las columnas que contienen nombres de cuentas o códigos contables. Cada fila podrá marcarse como ingreso o gasto.
                </div>
              </div>
            )}
            {mappingStep === 'periods' && (
              <div className="space-y-1">
                <div className="font-medium">📅 Configurar períodos de tiempo</div>
                <div className="text-xs text-gray-600">
                  Primero marca la fila de encabezados con "H", luego selecciona las columnas de períodos (Ene, Feb, Mar...). Las columnas solo representan períodos de tiempo, no tipos de flujo.
                </div>
              </div>
            )}
            {mappingStep === 'data' && (
              <div className="space-y-1">
                <div className="font-medium">📋 Definir rango de datos</div>
                <div className="text-xs text-gray-600">
                  Especifica qué filas contienen los datos financieros (sin incluir encabezados ni totales finales)
                </div>
              </div>
            )}
            {mappingStep === 'account_review' && (
              classificationLoading 
                ? '🤖 AI clasificando cuentas y agregando columna...'
                : (
                  <div className="space-y-1">
                    <div className="font-medium">🏷️ Revisar y ajustar clasificaciones</div>
                    <div className="text-xs text-gray-600">
                      Verifica las categorías asignadas, ajusta si cada cuenta es ingreso/gasto, marca totales/secciones
                    </div>
                  </div>
                )
            )}
            {mappingStep === 'persist' && 'Guardando datos procesados'}
          </CardDescription>
        </CardHeader>

        <CardBody className="pt-4">
          {/* AI Analysis Step */}
          {mappingStep === 'ai_analysis' && (
            <div className="min-h-[200px] flex flex-col">
              {!aiStarted && !aiAnalysis && !aiLoading && !classificationLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="space-y-4 max-w-5xl mx-auto">
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                      {/* AI Analysis Option */}
                      <label className={`flex items-start space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        analysisMode === 'ai' ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-200 hover:border-blue-300 hover:shadow-sm'
                      }`}>
                        <input
                          type="radio"
                          name="analysisMode"
                          value="ai"
                          checked={analysisMode === 'ai'}
                          onChange={() => setAnalysisMode('ai')}
                          className="mt-1 text-blue-600"
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 flex items-center flex-wrap gap-2">
                            <SparklesIcon className="w-5 h-5 text-blue-600" />
                            <span>🤖 Análisis Automático con IA</span>
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">RECOMENDADO</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-2">
                            La IA detectará automáticamente:
                          </p>
                          <ul className="text-xs text-gray-600 mt-1 list-disc list-inside space-y-0.5">
                            <li>Columnas de cuentas y códigos</li>
                            <li>Períodos de tiempo (Ene, Feb, Mar...)</li>
                            <li>Categorías financieras por cuenta</li>
                            <li>Totales y secciones</li>
                            <li>Moneda del documento</li>
                          </ul>
                        </div>
                      </label>
                      
                      {/* Manual Mapping Option */}
                      <label className={`flex items-start space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        analysisMode === 'manual' ? 'border-orange-500 bg-orange-50 shadow-md' : 'border-gray-200 hover:border-orange-300 hover:shadow-sm'
                      }`}>
                        <input
                          type="radio"
                          name="analysisMode"
                          value="manual"
                          checked={analysisMode === 'manual'}
                          onChange={() => setAnalysisMode('manual')}
                          className="mt-1 text-orange-600"
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 flex items-center flex-wrap gap-2">
                            <TableCellsIcon className="w-5 h-5 text-orange-600" />
                            <span>⚙️ Configuración Manual</span>
                            <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">CONTROL TOTAL</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-2">
                            Tú configuras paso a paso:
                          </p>
                          <ul className="text-xs text-gray-600 mt-1 list-disc list-inside space-y-0.5">
                            <li>Seleccionar columnas de datos manualmente</li>
                            <li>Definir encabezados de períodos</li>
                            <li>Clasificar filas como cuentas/totales/secciones</li>
                            <li>Crear y asignar categorías personalizadas</li>
                            <li>Control completo sobre el mapeo</li>
                          </ul>
                          <div className="mt-2 p-2 bg-orange-100 rounded text-xs text-orange-800">
                            💡 <strong>¿Cuándo usar?</strong> Cuando la IA no detecta correctamente o necesitas control específico
                          </div>
                        </div>
                      </label>
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
                      {progressPercentage}% {t('mapper.progress.completed')}
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
                            <p className="text-lg font-medium text-gray-900 mb-2">✅ {t('mapper.aiAnalysis.classificationCompleted')}</p>
                            <p className="text-sm text-green-600">{aiProgress}</p>
                          </div>
                          {accountClassifications.length > 0 && (
                            <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 w-full">
                              <p className="font-medium mb-1">{t('mapper.aiAnalysis.analysisComplete')}:</p>
                              <p className="text-xs">{accountClassifications.length} {t('mapper.aiAnalysis.accountsClassified')}</p>
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
                            {t('common.next')} →
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
                            <p className="text-lg font-medium text-gray-900 mb-2">🤖 {t('mapper.aiAnalysis.classifying')}</p>
                            <p className="text-sm text-blue-600 animate-pulse">{aiProgress}</p>
                          </div>
                          <div className="w-64 bg-gray-200 rounded-full h-3">
                            <div 
                              className="bg-gradient-to-r from-blue-500 to-blue-700 h-3 rounded-full transition-all duration-500 ease-out" 
                              style={{width: `${progressPercentage}%`}}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-600 font-mono">
                            {progressPercentage}% {t('mapper.progress.completed')}
                          </div>
                          <p className="text-xs text-center text-gray-600 max-w-xs">
                            {t('mapper.aiAnalysis.analyzing')}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : aiAnalysis ? (
                <div className="flex-1 space-y-6 mt-4">
                  {/* Combined Success Notification */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <CheckCircleIcon className="w-6 h-6 text-green-600 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-green-900 mb-2">✅ {t('mapper.aiAnalysis.analysisComplete')}</h4>
                        <div className="space-y-2 text-sm text-green-700">
                          <p>{aiAnalysis.statementType} ({aiAnalysis.confidence}%) | {aiAnalysis.currency} | Filas: {aiAnalysis.dataStartRow}-{aiAnalysis.dataEndRow}</p>
                          {accountClassifications.length > 0 && (
                            <p>{accountClassifications.length} {t('mapper.aiAnalysis.accountsClassified')}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Compact Currency Selection */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold text-blue-900">{t('mapper.currency.title')}</h4>
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
                            `${t('common.next')} →`
                          ) : (
                            `${t('common.next')} →`
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
                        <span className="font-semibold">{t('mapper.currency.selected')}:</span> {
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
                          `${t('common.next')} →`
                        ) : (
                          `${t('common.next')} →`
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
                        {progressPercentage}% {t('mapper.progress.completed')}
                      </div>
                      <p className="text-sm text-center text-gray-600 max-w-md">
                        La inteligencia artificial está analizando cada cuenta y agregando una nueva columna con las categorías detectadas automáticamente.
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <div className="animate-pulse">⚡</div>
                        <span>Procesando con OpenAI GPT-4o</span>
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
              {/* Visual Legend */}
              {(mappingStep === 'concepts' || mappingStep === 'periods' || mappingStep === 'account_review') && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs">
                  <div className="font-medium text-gray-700 mb-2">🔍 Leyenda Visual:</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-green-100 rounded-full border border-green-300"></div>
                      <span className="text-gray-600">IA detectado</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <span className="text-gray-600">Manual</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-base">📊</span>
                      <span className="text-gray-600">Cuenta</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-base">📁</span>
                      <span className="text-gray-600">Sección</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-base">Σ</span>
                      <span className="text-gray-600">Total</span>
                    </div>
                    {(mappingStep === 'concepts' || mappingStep === 'account_review') && (
                      <>
                        <div className="flex items-center space-x-1">
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full border border-green-300">↗️ Ingreso</span>
                          <span className="text-gray-600">Cuenta de ingreso</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full border border-red-300">↘️ Gasto</span>
                          <span className="text-gray-600">Cuenta de gasto</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
              {/* Compact Navigation Buttons */}
              <div className="flex justify-between items-center mb-4">
                <Button
                  variant="secondary"
                  onClick={() => {
                    console.log('Back button clicked, current step:', mappingStep);
                    const prevStep = getPrevStep();
                    console.log('Previous step:', prevStep);
                    setMappingStep(prevStep);
                  }}
                  disabled={WIZARD_STEPS.findIndex(s => s.id === mappingStep) === 0}
                >
                  ← {t('common.previous')}
                </Button>

                <div className="flex items-center space-x-3">
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
                      {t('common.next')} →
                    </Button>
                  )}
                </div>
              </div>

              {/* Data Range Display for Data Step */}
              {mappingStep === 'data' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-blue-900 flex items-center">
                      <DocumentTextIcon className="w-4 h-4 mr-2" />
                      Rango de datos detectado
                    </h4>
                    {dataRange.startRow !== -1 && (
                      <button
                        onClick={detectDataRange}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center"
                      >
                        <ArrowsPointingOutIcon className="w-3 h-3 mr-1" />
                        Re-detectar
                      </button>
                    )}
                  </div>
                  
                  {dataRange.startRow === -1 ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        <p className="text-sm text-blue-700">Detectando rango de datos...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-medium text-gray-700">Fila inicial:</label>
                          <input
                            type="number"
                            value={dataRange.startRow + 1}
                            onChange={(e) => {
                              const newRow = parseInt(e.target.value) - 1;
                              if (!isNaN(newRow) && newRow >= 0) {
                                setDataRange(prev => ({ ...prev, startRow: newRow }));
                              }
                            }}
                            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            min="1"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium text-gray-700">Fila final:</label>
                          <input
                            type="number"
                            value={dataRange.endRow + 1}
                            onChange={(e) => {
                              const newRow = parseInt(e.target.value) - 1;
                              if (!isNaN(newRow) && newRow >= dataRange.startRow) {
                                setDataRange(prev => ({ ...prev, endRow: newRow }));
                              }
                            }}
                            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            min={dataRange.startRow + 1}
                          />
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p className="mb-1">
                          <span className="font-medium">Columnas:</span> {getColumnName(dataRange.startCol)} - {getColumnName(dataRange.endCol)}
                        </p>
                        <p>
                          <span className="font-medium">Total filas:</span> {dataRange.endRow - dataRange.startRow + 1}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

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
                        <div className="flex flex-col items-center space-y-2">
                          <div className="relative">
                            <span className="text-xs font-semibold text-green-700 uppercase bg-green-100 px-3 py-1 rounded-full">
                              📊 {cc.columnType === 'account_name' ? 'Conceptos' : 'Códigos'}
                            </span>
                            {analysisMode === 'manual' && (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-white" title="Selección manual"></div>
                            )}
                          </div>
                          {mappingStep === 'concepts' && (
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => handleConceptColumnToggle(cc.columnIndex, cc.columnType)}
                              className="w-full max-w-[100px]"
                            >
                              ✓ Seleccionado
                            </Button>
                          )}
                          <div className="text-xs text-gray-500">
                            Col {String.fromCharCode(65 + cc.columnIndex)}
                            {analysisMode === 'manual' && (
                              <span className="ml-1 text-orange-600">●</span>
                            )}
                          </div>
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
                            <div className="space-y-1">
                              <Button
                                size="sm"
                                variant="primary"
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
                                className="w-full"
                              >
                                📊 Marcar
                              </Button>
                              <div className="text-xs text-gray-500 text-center">
                                {(() => {
                                  const firstDataValue = displayData[1]?.[colIndex];
                                  if (firstDataValue && typeof firstDataValue === 'string') {
                                    if (/^\d+$/.test(firstDataValue) || firstDataValue.length <= 6) {
                                      return 'Código';
                                    }
                                  }
                                  return 'Nombre';
                                })()}
                              </div>
                            </div>
                          )}
                          {mappingStep === 'periods' && periodHeaderRow !== -1 && (
                            <div className="space-y-1">
                              <Button
                                size="sm"
                                variant={isPeriodColumn(colIndex) ? 'success' : 'primary'}
                                onClick={() => handlePeriodColumnToggle(colIndex)}
                                className="w-full"
                              >
                                {isPeriodColumn(colIndex) ? '✓ Período' : '📅 Marcar'}
                              </Button>
                              {displayData[periodHeaderRow] && displayData[periodHeaderRow][colIndex] && (
                                <div className="text-xs text-gray-500 text-center truncate max-w-[80px]">
                                  {String(displayData[periodHeaderRow][colIndex]).substring(0, 8)}
                                </div>
                              )}
                            </div>
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
                  {visibleRowIndices.map((originalRowIndex) => {
                    const row = displayData[originalRowIndex];
                    // Check manual override first, then AI detection
                    const manualType = manualRowTypes[originalRowIndex];
                    const totalRow = detectedTotalRows.find(t => t.rowIndex === originalRowIndex);
                    const isTotal = manualType === 'total' || (!manualType && !!totalRow && totalRow.totalType !== 'section_header');
                    const isSectionHeader = manualType === 'section_header' || (!manualType && totalRow?.totalType === 'section_header');
                    const isManuallySet = !!manualType;
                    
                    return (
                      <tr 
                        key={originalRowIndex}
                        className={`
                          ${isSectionHeader ? 'bg-blue-50 text-blue-900 border-y border-blue-200' : isTotal ? 'bg-gray-100' : 'hover:bg-gray-50'}
                          ${originalRowIndex === periodHeaderRow ? 'ring-2 ring-blue-500' : ''}
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
                            <div className="flex items-center space-x-1">
                              <span className="text-xs">{originalRowIndex + 1}</span>
                              {isManuallySet && (
                                <div className="w-2 h-2 bg-orange-500 rounded-full" title="Clasificación manual"></div>
                              )}
                            </div>
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
                                variant={originalRowIndex === periodHeaderRow ? 'primary' : 'secondary'}
                                onClick={() => setPeriodHeaderRow(originalRowIndex)}
                              >
                                {originalRowIndex === periodHeaderRow ? '✓' : 'H'}
                              </Button>
                            )}
                          </div>
                        </td>
                        
                        {/* Render concept columns first */}
                        {conceptColumns.map((cc) => {
                          const cellValue = row[cc.columnIndex];
                          const isAccountNameColumn = cc.columnType === 'account_name';
                          const rowIsIncome = rowIncomeStatus[originalRowIndex] !== undefined 
                            ? rowIncomeStatus[originalRowIndex] 
                            : true; // Default to income
                          
                          return (
                            <td 
                              key={`concept-${cc.columnIndex}`}
                              onClick={() => !isSectionHeader && setSelectedCell({row: originalRowIndex, col: cc.columnIndex})}
                              className={`px-3 py-3 min-w-[250px] text-sm ${
                                isSectionHeader ? 'font-bold text-blue-900 uppercase' : isTotal ? 'font-bold' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  {cellValue !== null && cellValue !== undefined ? (
                                    <span className={isSectionHeader ? 'text-blue-900' : isTotal ? 'text-gray-900' : 'text-gray-700'}>
                                      {String(cellValue)}
                                    </span>
                                  ) : (
                                    <span className={isSectionHeader ? 'text-blue-400' : 'text-gray-300'}>-</span>
                                  )}
                                </div>
                                
                                {/* Income/Expense toggle for account name column and regular account rows only */}
                                {isAccountNameColumn && !isSectionHeader && !isTotal && cellValue && (
                                  <div className="ml-2 flex-shrink-0">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setRowIncomeStatus(prev => ({
                                          ...prev,
                                          [originalRowIndex]: prev[originalRowIndex] === undefined ? false : !prev[originalRowIndex]
                                        }));
                                      }}
                                      className={`px-2 py-1 text-xs rounded-full border transition-all ${
                                        rowIsIncome
                                          ? 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200'
                                          : 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200'
                                      }`}
                                      title={`Clic para cambiar a ${rowIsIncome ? 'gasto' : 'ingreso'}`}
                                    >
                                      {rowIsIncome ? '↗️ Ingreso' : '↘️ Gasto'}
                                    </button>
                                  </div>
                                )}
                                
                                {/* Visual indicator for headers and totals (non-interactive) */}
                                {isAccountNameColumn && (isSectionHeader || isTotal) && (
                                  <div className="ml-2 flex-shrink-0">
                                    <span className={`px-2 py-1 text-xs rounded-full border ${
                                      isSectionHeader 
                                        ? 'bg-blue-100 text-blue-800 border-blue-300' 
                                        : 'bg-gray-100 text-gray-800 border-gray-300'
                                    }`}>
                                      {isSectionHeader ? '📁 Sección' : 'Σ Total'}
                                    </span>
                                  </div>
                                )}
                              </div>
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
                          const rowIsIncome = rowIncomeStatus[originalRowIndex] !== undefined 
                            ? rowIncomeStatus[originalRowIndex] 
                            : true; // Default to income
                          
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
                                        rowIsIncome 
                                          ? 'bg-green-100 text-green-800' 
                                          : 'bg-red-100 text-red-800'
                                      }`}>
                                        {rowIsIncome ? '↗️' : '↘️'} {classification.suggestedCategory.replace(/_/g, ' ')}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {classification.confidence}%
                                      </span>
                                      {/* Manual override indicator */}
                                      {rowIncomeStatus[originalRowIndex] !== undefined && (
                                        <span className="text-xs text-orange-600" title="Manual income/expense override">
                                          ⚙️
                                        </span>
                                      )}
                                      {/* Validation indicators */}
                                      {classification.requiresReview && (
                                        <span className="text-amber-600 text-xs" title="Requires manual review">
                                          ⚠️
                                        </span>
                                      )}
                                      {classification.validationCorrections && classification.validationCorrections > 0 && (
                                        <span className="text-xs text-orange-600" title={`${classification.validationCorrections} validation corrections applied`}>
                                          ({classification.validationCorrections})
                                        </span>
                                      )}
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
                                    onTypeChange={(type) => handleManualRowTypeChange(originalRowIndex, type as RowType)}
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
                                onClick={() => !isSectionHeader && setSelectedCell({row: originalRowIndex, col: colIndex})}
                                className={
                                  isSectionHeader ? 
                                    "px-3 py-2 bg-blue-50 text-blue-400 text-center" : 
                                  isTotal ? 
                                    "px-3 py-2 bg-gray-100 font-semibold border-y border-gray-300" : 
                                    getCellStyle(originalRowIndex, colIndex)
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
                Mostrar todas las filas con datos ({displayData.filter((row, index) => !isRowEmpty(row, index)).length})
              </Button>
            </div>
          )}
        </CardBody>

        <CardFooter className="flex justify-between">
          <Button
            variant="secondary"
            onClick={() => {
              console.log('Footer back button clicked, current step:', mappingStep);
              const prevStep = getPrevStep();
              console.log('Previous step:', prevStep);
              setMappingStep(prevStep);
            }}
            disabled={WIZARD_STEPS.findIndex(s => s.id === mappingStep) === 0}
          >
            ← {t('common.previous')}
          </Button>

          <div className="flex items-center space-x-3">
            {mappingStep === 'data' && (
              <Button
                variant="outline"
                onClick={detectDataRange}
                leftIcon={<ArrowsPointingOutIcon className="w-4 h-4" />}
              >
                Re-detectar
              </Button>
            )}
            
            {(mappingStep === 'concepts' || mappingStep === 'periods' || mappingStep === 'data' || mappingStep === 'account_review') && companyId && (
              <Button
                variant="outline"
                onClick={() => setShowCategoryManagement(true)}
                leftIcon={<DocumentMagnifyingGlassIcon className="w-4 h-4" />}
              >
                🏷️ Gestionar Categorías
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
                  ? `${t('common.skip')} y ${t('common.next')} →`
                  : `${t('common.next')} →`}
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
          companyId={companyId}
          onCategoryChange={(category, isInflow) => 
            handleCategoryChange(editingClassification.accountName, category, isInflow)
          }
          onClose={() => setEditingClassification(null)}
        />
      )}

      {/* Category Management Modal */}
      {showCategoryManagement && companyId && (
        <CategoryManagement
          companyId={companyId}
          statementType={statementType as 'balance_sheet' | 'profit_loss' | 'cash_flow'}
          onClose={() => setShowCategoryManagement(false)}
        />
      )}
    </div>
  );
}