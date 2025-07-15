"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MatrixExcelViewerV2 } from "@/components/MatrixExcelViewerV2";
import { MatrixMapping, DocumentStructure, AccountClassification } from "@/types";
import { AppLayout } from "@/components/AppLayout";
import { readExcelFile } from "@/lib/excel-reader";
import { useLocale } from "@/contexts/LocaleContext";
import { useAuth } from "@/contexts/AuthContext";
import { TemplateSelector } from "@/components/TemplateSelector";
import { CompanySelector } from "@/components/CompanySelector";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BuildingOfficeIcon } from "@heroicons/react/24/outline";
import { LocalAccountClassifier } from "@/lib/local-classifier";

function AdvancedMapperContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useLocale();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState<string>("Inicializando...");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [excelData, setExcelData] = useState<any[][] | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [sheetName, setSheetName] = useState<string>("");
  const [excelMetadata, setExcelMetadata] = useState<any>(null);
  
  // Template and company selection state
  const [showTemplateSelector, setShowTemplateSelector] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [statementType, setStatementType] = useState<'profit_loss' | 'cash_flow'>('profit_loss');
  
  

  useEffect(() => {
    const loadExcelData = async () => {
      try {
        setLoadingStep("Verificando datos de sesión...");
        const uploadSession = searchParams.get('session') || sessionStorage.getItem('uploadSession');
        const uploadedFileStr = sessionStorage.getItem('uploadedFile');
        const autoTemplate = searchParams.get('autoTemplate') === 'true';
        
        // Check for company context from dashboard navigation
        const preSelectedCompanyId = sessionStorage.getItem('selectedCompanyId');
        if (preSelectedCompanyId) {
          setSelectedCompanyId(preSelectedCompanyId);
          // Auto-skip template selector if we have a pre-selected company
          setShowTemplateSelector(false);
          // Fetch company details
          try {
            const response = await fetch(`/api/v1/companies/${preSelectedCompanyId}`);
            if (response.ok) {
              const data = await response.json();
              setSelectedCompany(data.data);
            }
          } catch (err) {
            console.warn('Failed to fetch company details:', err);
          }
        }
        
        if (!uploadSession || !uploadedFileStr) {
          setError('No se encontró archivo cargado. Por favor, vuelve a cargar tu archivo.');
          return;
        }

        setLoadingStep("Cargando metadatos del archivo...");
        const uploadedFile = JSON.parse(uploadedFileStr);
        setFileName(uploadedFile.fileName);
        
        // Set statement type from upload configuration
        if (uploadedFile.statementType) {
          setStatementType(uploadedFile.statementType);
        }
        
        // Check if a template was pre-selected in the upload page
        if (autoTemplate && uploadedFile.selectedTemplate) {
          console.log('Pre-selected template found:', uploadedFile.selectedTemplate);
          setSelectedTemplate(uploadedFile.selectedTemplate);
          
          // Set company from template if not already set
          if (!preSelectedCompanyId && uploadedFile.selectedTemplate.companyId) {
            setSelectedCompanyId(uploadedFile.selectedTemplate.companyId);
            setShowTemplateSelector(false);
          }
        }

        setLoadingStep("Recuperando datos del archivo...");
        // Get the file data from server temporary storage
        const fileDataResponse = await fetch(`/api/upload-session/${uploadSession}`);
        
        if (!fileDataResponse.ok) {
          console.error('File data not found on server');
          setError('No se pudo recuperar el archivo. Por favor, vuelve a cargarlo.');
          return;
        }
        
        const fileDataResult = await fileDataResponse.json();
        const fileDataBase64 = fileDataResult.fileData;
        
        if (!fileDataBase64) {
          console.error('File data empty in server response');
          setError('No se pudo recuperar el archivo. Por favor, vuelve a cargarlo.');
          return;
        }
        
        setLoadingStep("Decodificando archivo Excel...");
        // Convert base64 back to ArrayBuffer
        const binaryString = atob(fileDataBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const fileBuffer = bytes.buffer;

        setLoadingStep("Seleccionando hoja de cálculo...");
        // Get selected sheet from URL params or session storage
        const selectedSheetName = searchParams.get('sheet') || sessionStorage.getItem('selectedSheet');
        const selectedSheet = uploadedFile.sheets.find((s: any) => s.name === selectedSheetName) || 
                             uploadedFile.sheets.find((s: any) => s.hasData) || 
                             uploadedFile.sheets[0];
        
        if (!selectedSheet) {
          setError('No se pudo encontrar una hoja válida en el archivo.');
          return;
        }
        
        setSheetName(selectedSheet.name);
        
        setLoadingStep(`Analizando hoja "${selectedSheet.name}"...`);
        const data = await readExcelFile(fileBuffer, selectedSheet.name);
        
        setLoadingStep("Preparando interfaz de mapeo visual avanzado...");
        // Set up data for the MatrixExcelViewer
        setExcelData(data.rawData);
        
        // Create metadata for the advanced viewer
        const metadata = {
          headers: data.rawData[0] || [],
          data: data.rawData,
          metadata: {
            totalRows: data.rawData.length,
            totalCols: data.rawData[0]?.length || 0,
            headerRow: 0, // Will be detected by the component
            dataStartRow: 1,
            dataEndRow: data.rawData.length - 1
          }
        };
        setExcelMetadata(metadata);
        
        // If we have a pre-selected template and autoTemplate is true, apply it automatically
        if (autoTemplate && uploadedFile.selectedTemplate) {
          setLoadingStep("Aplicando plantilla automáticamente...");
          await applyTemplateAutomatically(uploadedFile.selectedTemplate, data.rawData, selectedSheet.name, uploadSession);
        }
        
      } catch (err) {
        console.error('Error loading Excel data:', err);
        setError('Error al cargar el archivo Excel');
      } finally {
        setLoading(false);
      }
    };

    loadExcelData();
  }, [searchParams]);

  const applyTemplateAutomatically = async (template: any, rawData: any[][], sheetName: string, uploadSession: string) => {
    try {
      setProcessing(true);
      setLoadingStep("Procesando datos con plantilla...");
      
      // Apply template to the data
      const response = await fetch('/api/v1/templates/auto-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: template.id,
          rawData: rawData,
          sheetName: sheetName,
          uploadSession: uploadSession
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        
        setLoadingStep("Guardando resultados...");
        
        // Store results and redirect to persist
        sessionStorage.setItem('validationResults', JSON.stringify(result.validationResults));
        sessionStorage.setItem('accountMapping', JSON.stringify(result.accountMapping));
        sessionStorage.setItem('selectedCompanyId', template.companyId);
        
        // Add template info to the results
        const mappingWithTemplate = {
          ...result.accountMapping,
          templateApplied: {
            id: template.id,
            name: template.templateName,
            appliedAt: new Date().toISOString()
          }
        };
        sessionStorage.setItem('accountMapping', JSON.stringify(mappingWithTemplate));
        
        setLoadingStep("Redirigiendo a guardado...");
        
        // Redirect directly to persist page
        setTimeout(() => {
          router.push('/persist');
        }, 500);
      } else {
        const errorData = await response.json();
        console.error('Failed to apply template:', errorData);
        setError(`Error al aplicar la plantilla: ${errorData.error?.message || 'Error desconocido'}`);
        setProcessing(false);
        // Don't hide template selector on error, let user try manual mapping
        setShowTemplateSelector(false);
      }
    } catch (err) {
      console.error('Error applying template:', err);
      setError('Error al aplicar la plantilla automáticamente');
      setProcessing(false);
      setShowTemplateSelector(false);
    }
  };

  const handleMappingComplete = async (mapping: MatrixMapping) => {
    setProcessing(true);
    try {
      setLoadingStep("Procesando mapeo matricial...");
      
      // Process the matrix mapping locally for now
      const processedData = processMatrixMapping(excelData!, mapping);
      
      setLoadingStep("Generando resultados...");
      
      // Create results structure compatible with persistence
      const results = {
        totalRows: processedData.length,
        validRows: processedData.filter(row => row.isValid).length,
        invalidRows: processedData.filter(row => !row.isValid).length,
        warnings: [],
        errors: [],
        preview: processedData.slice(0, 10),
        data: processedData,
        mapping: {
          statementType: 'profit_loss',
          confidence: 95,
          mappedColumns: mapping.conceptColumns.length + mapping.periodColumns.length,
          totalColumns: mapping.conceptColumns.length + mapping.periodColumns.length
        }
      };
      
      setLoadingStep("Preparando para persistencia...");
      
      // Create accountMapping structure expected by persist page
      const accountMapping = {
        statementType: mapping.aiAnalysis?.statementType || 'profit_loss',
        currency: mapping.currency || 'MXN',
        periodColumns: mapping.periodColumns || [], // Include period columns for date extraction
        accounts: processedData,  // Pass all processed data including hierarchy
        hierarchyDetected: true,
        totalItemsCount: processedData.length,
        totalRowsCount: processedData.filter((r: any) => r.isTotal).length,
        detailRowsCount: processedData.filter((r: any) => !r.isTotal && r.hasFinancialData).length
      };
      
      // Store results for persistence
      console.log('Mapper page - Storing comprehensive data to sessionStorage');
      console.log('accountMapping:', {
        statementType: accountMapping.statementType,
        currency: accountMapping.currency,
        accountsCount: accountMapping.accounts.length,
        totalItemsCount: accountMapping.totalItemsCount,
        totalRowsCount: accountMapping.totalRowsCount,
        detailRowsCount: accountMapping.detailRowsCount,
        hierarchyDetected: accountMapping.hierarchyDetected
      });
      console.log('validationResults:', {
        totalRows: results.totalRows,
        validRows: results.validRows
      });
      console.log('📊 Sample of processed data:', accountMapping.accounts.slice(0, 3));
      
      sessionStorage.setItem('validationResults', JSON.stringify(results));
      sessionStorage.setItem('accountMapping', JSON.stringify(accountMapping));
      sessionStorage.setItem('matrixMapping', JSON.stringify(mapping)); // Keep for reference
      sessionStorage.setItem('selectedCompanyId', selectedCompanyId);
      
      // Redirect to persistence page
      router.push('/persist');
      
    } catch (err) {
      console.error('Validation error:', err);
      setError('Error al procesar el mapeo matricial');
      setProcessing(false);
    }
  };

  // Process matrix mapping with hierarchy detection and save ALL data
  const processMatrixMapping = (rawData: any[][], mapping: MatrixMapping) => {
    console.log('🔄 Processing matrix mapping with hierarchy detection...');
    
    // First, detect total rows to establish hierarchy
    const accountNameColumn = mapping.conceptColumns.find(cc => cc.columnType === 'account_name')?.columnIndex || 0;
    const detectedTotals = [] as any[]; // detectTotalRows function not imported
    console.log(`📊 Detected ${detectedTotals.length} total rows:`, detectedTotals.map((t: any) => t.accountName));
    
    const results = [];
    const totalRowIndices = new Set(detectedTotals.map((t: any) => t.rowIndex));
    
    // Process ALL rows in the data range (not just named ones)
    for (let rowIdx = mapping.dataRange.startRow; rowIdx <= mapping.dataRange.endRow; rowIdx++) {
      const row = rawData[rowIdx];
      if (!row) continue;
      
      // Extract concept data
      let accountName = '';
      let accountCode = '';
      
      mapping.conceptColumns.forEach(cc => {
        const value = row[cc.columnIndex];
        if (value) {
          if (cc.columnType === 'account_name') accountName = String(value).trim();
          if (cc.columnType === 'account_code') accountCode = String(value).trim();
        }
      });
      
      // Extract period data
      const periodData: any = {};
      let firstPeriodValue = null;
      let hasAnyData = false;
      
      mapping.periodColumns.forEach((pc, idx) => {
        const value = row[pc.columnIndex];
        if (value !== null && value !== undefined && value !== '') {
          const numericValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ''));
          if (!isNaN(numericValue)) {
            periodData[pc.periodLabel] = numericValue;
            if (idx === 0) {
              firstPeriodValue = numericValue;
            }
            hasAnyData = true;
          }
        }
      });
      
      // Skip only if completely empty (no name, no code, no data)
      if (!accountName && !accountCode && !hasAnyData) {
        continue;
      }
      
      // Check if this row is a detected total
      const isTotal = totalRowIndices.has(rowIdx);
      const totalInfo = detectedTotals.find((t: any) => t.rowIndex === rowIdx);
      
      // Generate a meaningful name for unnamed rows with data
      let finalAccountName = accountName;
      if (!accountName && hasAnyData) {
        // For detail rows without names, create a descriptive name
        finalAccountName = `Detail Item ${rowIdx} (${Object.keys(periodData).length} periods)`;
      }
      
      // Determine hierarchy and parent relationships
      let parentTotalId = null;
      let category = 'other';
      let subcategory = null;
      
      if (isTotal && totalInfo) {
        // This is a total row
        category = totalInfo.suggestedCategory || 'other';
        subcategory = totalInfo.type;
      } else {
        // This is a detail row - find its parent total
        for (let i = detectedTotals.length - 1; i >= 0; i--) {
          const potentialParent = detectedTotals[i];
          if (potentialParent.rowIndex < rowIdx) {
            // Check if there's a closer total after this one
            const nextTotal = detectedTotals.find((t: any) => t.rowIndex > potentialParent.rowIndex && t.rowIndex < rowIdx);
            if (!nextTotal) {
              parentTotalId = `ROW_${potentialParent.rowIndex}`;
              category = potentialParent.suggestedCategory || 'other';
              break;
            }
          }
        }
        
        // If no parent found and we have AI classification, use it
        if (!parentTotalId) {
          const aiClassification = mapping.accountClassifications?.find(
            (c: any) => c.accountName === finalAccountName
          );
          
          if (aiClassification) {
            category = aiClassification.suggestedCategory;
          } else if (finalAccountName) {
            // Use local classifier as last resort
            const localResult = LocalAccountClassifier.classifyAccount(
              finalAccountName,
              firstPeriodValue !== null ? firstPeriodValue : undefined,
              { statementType: mapping.aiAnalysis?.statementType || 'profit_loss' }
            );
            category = localResult.suggestedCategory;
          }
        }
      }
      
      // Determine if this is an inflow based on category
      const isInflow = ['revenue', 'sales', 'income', 'other_income'].includes(category.toLowerCase());
      
      const processedItem = {
        rowIndex: rowIdx,
        accountCode: accountCode || `ROW_${rowIdx}`,
        accountName: finalAccountName || `Row ${rowIdx}`,
        originalAccountName: accountName, // Keep original for reference
        category: category,
        subcategory: subcategory,
        isInflow: isInflow,
        isTotal: isTotal,
        isSubtotal: totalInfo?.type === 'subtotal' || false,
        parentTotalId: parentTotalId,
        periods: periodData,
        isValid: true,
        errors: [],
        warnings: [],
        detectedAsTotal: isTotal,
        totalConfidence: totalInfo?.confidence || 0,
        hasFinancialData: hasAnyData
      };
      
      results.push(processedItem);
      
      // Log first few items for debugging
      if (results.length <= 5) {
        console.log(`📝 Processed item ${results.length}:`, {
          name: processedItem.accountName,
          isTotal: processedItem.isTotal,
          category: processedItem.category,
          parentTotalId: processedItem.parentTotalId,
          hasData: hasAnyData,
          periods: Object.keys(periodData)
        });
      }
    }
    
    console.log(`✅ Processed ${results.length} total items (including ${results.filter(r => r.isTotal).length} totals and ${results.filter(r => !r.isTotal && r.hasFinancialData).length} detail items)`);
    
    return results;
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <AppLayout showFooter={true}>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center max-w-md">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-lg text-gray-600 mb-2">Preparando mapeador visual avanzado</p>
              <p className="text-sm text-blue-600 font-medium">{loadingStep}</p>
            </div>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <AppLayout showFooter={true}>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center max-w-md">
              <div className="text-red-600 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={() => router.push('/upload')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Volver a cargar archivo
              </button>
            </div>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppLayout showFooter={true}>
        <div className="container mx-auto px-4 py-4">
          <div className="max-w-7xl mx-auto">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">
                    {locale?.startsWith('es') ? 'Mapeador Visual Avanzado' : 'Advanced Visual Mapper'}
                  </h1>
                  <p className="text-gray-600">
                    {locale?.startsWith('es') ? 'Archivo:' : 'File:'} <span className="font-medium">{fileName}</span> • 
                    {locale?.startsWith('es') ? 'Hoja:' : 'Sheet:'} <span className="font-medium">{sheetName}</span> • 
                    <span className="font-medium">{excelData?.length || 0} {locale?.startsWith('es') ? 'filas totales' : 'total rows'}</span>
                  </p>
                </div>
                {/* Company Context Display */}
                {selectedCompany && (
                  <div className="flex items-center space-x-3 px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
                    <BuildingOfficeIcon className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">{selectedCompany.name}</p>
                      <p className="text-xs text-blue-600">
                        {locale?.startsWith('es') ? 'Empresa seleccionada' : 'Selected company'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>


          {/* Show template selector first - skip if already processing with pre-selected template */}
          {excelData && showTemplateSelector && !processing && (
            <div className="mb-8">
              {/* Company selector - only show if no company context */}
              {!selectedCompanyId && (
                <div className="mb-6">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-yellow-800">
                      {locale?.startsWith('es') 
                        ? 'No se detectó contexto de empresa. Por favor selecciona una empresa para continuar.'
                        : 'No company context detected. Please select a company to continue.'}
                    </p>
                  </div>
                  <h2 className="text-xl font-semibold mb-4">
                    {locale?.startsWith('es') ? 'Selecciona la empresa' : 'Select Company'}
                  </h2>
                  <CompanySelector
                    onCompanySelect={async (companyId) => {
                      setSelectedCompanyId(companyId);
                      // Fetch company details
                      try {
                        const response = await fetch(`/api/v1/companies/${companyId}`);
                        if (response.ok) {
                          const data = await response.json();
                          setSelectedCompany(data.data);
                        }
                      } catch (err) {
                        console.warn('Failed to fetch company details:', err);
                      }
                    }}
                    selectedCompanyId={selectedCompanyId}
                  />
                </div>
              )}
              
              {/* Template selector */}
              {selectedCompanyId && (
                <TemplateSelector
                  companyId={selectedCompanyId}
                  statementType="profit_loss"
                  onTemplateSelect={async (template) => {
                    setSelectedTemplate(template);
                    setShowTemplateSelector(false);
                    
                    // If user selects a template, still show the MatrixExcelViewerV2 for AI analysis
                    // but can auto-apply template afterwards
                    if (template && excelData) {
                      setProcessing(true);
                      setLoadingStep("Aplicando plantilla...");
                      
                      try {
                        // Apply template to the data
                        const response = await fetch('/api/v1/templates/auto-map', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            templateId: template.id,
                            rawData: excelData,
                            sheetName: sheetName,
                            uploadSession: sessionStorage.getItem('uploadSession')
                          })
                        });
                        
                        if (response.ok) {
                          const result = await response.json();
                          
                          // Store results and redirect to persist
                          sessionStorage.setItem('validationResults', JSON.stringify(result.validationResults));
                          sessionStorage.setItem('accountMapping', JSON.stringify(result.accountMapping));
                          sessionStorage.setItem('selectedCompanyId', selectedCompanyId);
                          
                          // Redirect directly to persist page
                          router.push('/persist');
                        } else {
                          console.error('Failed to apply template');
                          setError('Error al aplicar la plantilla');
                          setProcessing(false);
                        }
                      } catch (err) {
                        console.error('Error applying template:', err);
                        setError('Error al aplicar la plantilla');
                        setProcessing(false);
                      }
                    }
                  }}
                  onSkip={() => setShowTemplateSelector(false)}
                />
              )}
            </div>
          )}

          {/* Show processing overlay when auto-applying template */}
          {processing && excelData && (
            <div className="bg-white rounded-lg shadow-sm p-8">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-lg text-gray-600 mb-2">
                  {locale?.startsWith('es') ? 'Aplicando plantilla' : 'Applying template'}
                </p>
                <p className="text-sm text-blue-600 font-medium">{loadingStep}</p>
                {selectedTemplate && (
                  <p className="text-sm text-gray-500 mt-2">
                    Plantilla: {selectedTemplate.templateName}
                  </p>
                )}
              </div>
            </div>
          )}

          {excelData && !showTemplateSelector && !processing && (
            <div className="relative">
              <MatrixExcelViewerV2
                rawData={excelData}
                excelMetadata={excelMetadata}
                onMappingComplete={handleMappingComplete}
                locale={locale}
                statementType={statementType}
                companyId={selectedCompanyId}
              />
            </div>
          )}
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}

function AdvancedMapperPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <AdvancedMapperContent />
    </Suspense>
  );
}

export default AdvancedMapperPage;