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
  

  useEffect(() => {
    const loadExcelData = async () => {
      try {
        setLoadingStep("Verificando datos de sesión...");
        const uploadSession = searchParams.get('session') || sessionStorage.getItem('uploadSession');
        const uploadedFileStr = sessionStorage.getItem('uploadedFile');
        
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

        setLoadingStep("Recuperando datos del archivo...");
        // Get the file data from sessionStorage
        const fileDataBase64 = sessionStorage.getItem(`fileData_${uploadSession}`);
        
        if (!fileDataBase64) {
          console.error('File data not found in session storage');
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
        
      } catch (err) {
        console.error('Error loading Excel data:', err);
        setError('Error al cargar el archivo Excel');
      } finally {
        setLoading(false);
      }
    };

    loadExcelData();
  }, [searchParams]);

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
        accounts: processedData.map((row: any) => {
          // Try to find AI classification for this account
          const aiClassification = mapping.accountClassifications?.find(
            (c: any) => c.accountName === row.accountName
          );
          
          // Use AI classification if available, otherwise fall back to local detection
          const category = aiClassification?.suggestedCategory || row.category;
          const isInflow = aiClassification ? aiClassification.isInflow : 
            (category?.includes('revenue') || category?.includes('income') || category?.includes('other_income'));
          
          return {
            code: row.accountCode,
            name: row.accountName,
            category: category,
            isInflow: isInflow,
            periods: row.periods
          };
        })
      };
      
      // Store results for persistence
      console.log('Mapper page - Storing data to sessionStorage');
      console.log('accountMapping:', {
        statementType: accountMapping.statementType,
        currency: accountMapping.currency,
        accountsCount: accountMapping.accounts.length
      });
      console.log('validationResults:', {
        totalRows: results.totalRows,
        validRows: results.validRows
      });
      
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

  // Simple local processing function for matrix mapping
  const processMatrixMapping = (rawData: any[][], mapping: MatrixMapping) => {
    const results = [];
    
    for (let rowIdx = mapping.dataRange.startRow; rowIdx <= mapping.dataRange.endRow; rowIdx++) {
      const row = rawData[rowIdx];
      if (!row) continue;
      
      // Extract concept data
      let accountName = '';
      let accountCode = '';
      
      mapping.conceptColumns.forEach(cc => {
        const value = row[cc.columnIndex];
        if (value) {
          if (cc.columnType === 'account_name') accountName = String(value);
          if (cc.columnType === 'account_code') accountCode = String(value);
        }
      });
      
      // Skip empty rows
      if (!accountName && !accountCode) continue;
      
      // Extract period data
      const periodData: any = {};
      let firstPeriodValue = null;
      mapping.periodColumns.forEach((pc, idx) => {
        const value = row[pc.columnIndex];
        if (value !== null && value !== undefined) {
          periodData[pc.periodLabel] = value;
          if (idx === 0) {
            firstPeriodValue = value;
          }
        }
      });
      
      // Check if we have AI classification for this account
      const aiClassification = mapping.accountClassifications?.find(
        (c: any) => c.accountName === accountName
      );
      
      // Use AI classification if available, otherwise use local classifier
      let category = 'other';
      let isInflow = true;
      
      if (aiClassification) {
        category = aiClassification.suggestedCategory;
        isInflow = aiClassification.isInflow;
      } else {
        // Use local classifier with value information
        const localResult = LocalAccountClassifier.classifyAccount(
          accountName,
          firstPeriodValue !== null ? firstPeriodValue : undefined,
          { statementType: mapping.aiAnalysis?.statementType || 'profit_loss' }
        );
        category = localResult.suggestedCategory;
        isInflow = localResult.isInflow;
      }
      
      results.push({
        rowIndex: rowIdx,
        accountCode: accountCode || `ROW_${rowIdx}`,
        accountName: accountName || 'Sin nombre',
        category: category,
        isInflow: isInflow,
        periods: periodData,
        isValid: true,
        errors: [],
        warnings: []
      });
    }
    
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

          {/* Show template selector first */}
          {excelData && showTemplateSelector && (
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

          {excelData && !showTemplateSelector && (
            <div className="relative">
              <MatrixExcelViewerV2
                rawData={excelData}
                excelMetadata={excelMetadata}
                onMappingComplete={handleMappingComplete}
                locale={locale}
                statementType="profit_loss"
              />
              
              {/* Processing overlay */}
              {processing && (
                <div className="absolute inset-0 bg-white bg-opacity-95 flex items-center justify-center z-50 rounded-lg">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-lg text-gray-600 mb-2">
                      {locale?.startsWith('es') ? 'Procesando mapeo' : 'Processing mapping'}
                    </p>
                    <p className="text-sm text-blue-600 font-medium">{loadingStep}</p>
                  </div>
                </div>
              )}
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