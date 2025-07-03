"use client";

import { useEffect, useState } from "react";
import { useParserStore, useParserActions } from "@/stores/parser-store";
import { FileUpload } from "@/components/FileUpload";
import { ExcelViewer } from "@/components/ExcelViewer";
import { AccountRowMapper, AccountMapping } from "@/components/AccountRowMapper";
import { Header } from "@/components/Header";
import { ProgressSteps } from "@/components/ProgressSteps";
import { SheetSelector } from "@/components/SheetSelector";
import { ValidationResults } from "@/components/ValidationResults";
import { PersistenceOptions } from "@/components/PersistenceOptions";
import { ExcelFileMetadata, SheetAnalysis, ParseResults } from "@/types";

export default function ProcessPage() {
  const state = useParserStore();
  const actions = useParserActions();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isPersisting, setIsPersisting] = useState(false);
  const [accountMapping, setAccountMapping] = useState<AccountMapping | null>(null);

  const steps = [
    { id: 'upload', name: 'Cargar Archivo', description: 'Subir archivo Excel' },
    { id: 'select', name: 'Seleccionar Hoja', description: 'Elegir hoja de cálculo' },
    { id: 'analyze', name: 'Analizar', description: 'Detectar estructura' },
    { id: 'map', name: 'Mapear', description: 'Configurar mapeo' },
    { id: 'validate', name: 'Validar', description: 'Verificar datos' },
    { id: 'persist', name: 'Guardar', description: 'Almacenar datos' }
  ];

  const completedSteps = getCompletedSteps(state.currentStep);

  // Handle file upload
  const handleFileUploaded = (metadata: ExcelFileMetadata) => {
    actions.setUploadedFile(metadata);
  };

  // Handle sheet selection
  const handleSheetSelected = async (sheetName: string) => {
    actions.setSelectedSheet(sheetName);
    await analyzeSheet(sheetName);
  };

  // Analyze selected sheet
  const analyzeSheet = async (sheetName: string) => {
    if (!state.uploadedFile) return;

    setIsAnalyzing(true);
    actions.setLoading(true);
    actions.setError(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadSession: state.uploadedFile.uploadSession,
          sheetName,
          locale: state.locale
        })
      });

      if (!response.ok) {
        throw new Error('Error al analizar la hoja de cálculo');
      }

      const analysis: SheetAnalysis = await response.json();
      actions.setSheetAnalysis(analysis);

    } catch (error) {
      actions.setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsAnalyzing(false);
      actions.setLoading(false);
    }
  };

  // Handle validation
  const handleValidate = async () => {
    if (!state.uploadedFile || !state.selectedSheet) return;

    setIsValidating(true);
    actions.setLoading(true);
    actions.setError(null);

    try {
      // Use account validation if we have account mapping
      const endpoint = accountMapping ? '/api/validate-accounts' : '/api/validate';
      const body = accountMapping ? {
        uploadSession: state.uploadedFile.uploadSession,
        sheetName: state.selectedSheet,
        accountMapping,
        locale: state.locale
      } : {
        uploadSession: state.uploadedFile.uploadSession,
        sheetName: state.selectedSheet,
        columnMappings: state.columnMappings,
        locale: state.locale
      };
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error('Error al validar los datos');
      }

      const results: ParseResults = await response.json();
      actions.setParseResults(results);
      actions.setValidated(true);

    } catch (error) {
      actions.setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsValidating(false);
      actions.setLoading(false);
    }
  };

  // Handle persistence
  const handlePersist = async (companyId: string, saveAsTemplate: boolean, templateName?: string) => {
    if (!state.uploadedFile || !state.selectedSheet || !state.parseResults) return;

    setIsPersisting(true);
    actions.setLoading(true);
    actions.setError(null);

    try {
      const response = await fetch('/api/persist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadSession: state.uploadedFile.uploadSession,
          sheetName: state.selectedSheet,
          columnMappings: state.columnMappings,
          parseResults: state.parseResults,
          companyId,
          saveAsTemplate,
          templateName,
          locale: state.locale
        })
      });

      if (!response.ok) {
        throw new Error('Error al guardar los datos');
      }

      const result = await response.json();
      actions.setProgress(100);
      
      // Show success message and reset after delay
      setTimeout(() => {
        actions.resetState();
      }, 3000);

    } catch (error) {
      actions.setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsPersisting(false);
      actions.setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Progress Steps */}
          <ProgressSteps
            currentStep={state.currentStep}
            completedSteps={completedSteps}
            steps={steps}
          />

          {/* Error Display */}
          {state.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{state.error}</p>
                </div>
                <div className="ml-auto pl-3">
                  <button
                    onClick={() => actions.setError(null)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <span className="sr-only">Cerrar</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step Content */}
          <div className="bg-white rounded-xl shadow-sm border p-8">
            {state.currentStep === 'upload' && (
              <FileUpload
                onFileUploaded={handleFileUploaded}
                locale={state.locale}
              />
            )}

            {state.currentStep === 'select' && state.uploadedFile && (
              <SheetSelector
                sheets={state.uploadedFile.sheets}
                onSheetSelected={handleSheetSelected}
                isLoading={isAnalyzing}
              />
            )}

            {(state.currentStep === 'analyze' || state.currentStep === 'map') && isAnalyzing && (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-lg font-medium text-gray-900">Analizando estructura del archivo...</p>
                <p className="text-gray-500">Detectando tipos de columnas y patrones financieros</p>
              </div>
            )}

            {state.currentStep === 'map' && state.sheetAnalysis && !isAnalyzing && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Mapeo de Columnas</h2>
                    <p className="text-gray-600">Define qué representa cada columna de tu archivo Excel</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Columnas mapeadas</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {state.columnMappings.filter(m => m.targetField !== 'unmapped').length} / {state.columnMappings.length}
                    </div>
                  </div>
                </div>

                {/* Use AccountRowMapper for row-by-row account mapping */}
                {(state.sheetAnalysis as any).excelData ? (
                  <AccountRowMapper
                    rawData={(state.sheetAnalysis as any).excelData.rawData || []}
                    onMappingComplete={(mapping) => {
                      setAccountMapping(mapping);
                      console.log('Account mapping completed:', mapping);
                    }}
                    locale={state.locale}
                  />
                ) : (
                  <ExcelViewer
                    data={generatePreviewData(state.sheetAnalysis)}
                    headers={state.sheetAnalysis.columnDetections.map(d => d.headerText)}
                    columnDetections={state.sheetAnalysis.columnDetections}
                    onMappingChange={actions.updateColumnMapping}
                    locale={state.locale}
                  />
                )}

                <div className="flex justify-between items-center pt-6 border-t">
                  <button
                    onClick={() => actions.setCurrentStep('select')}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    ← Volver a selección de hoja
                  </button>
                  <button
                    onClick={handleValidate}
                    disabled={!accountMapping && !state.canProceedToValidation()}
                    className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Validar Datos →
                  </button>
                </div>
              </div>
            )}

            {state.currentStep === 'validate' && isValidating && (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-lg font-medium text-gray-900">Validando datos...</p>
                <p className="text-gray-500">Procesando y verificando información</p>
              </div>
            )}

            {state.currentStep === 'validate' && state.parseResults && !isValidating && (
              <ValidationResults
                results={state.parseResults}
                onProceed={() => actions.setCurrentStep('persist')}
                onGoBack={() => actions.setCurrentStep('map')}
              />
            )}

            {state.currentStep === 'persist' && state.parseResults && (
              <PersistenceOptions
                parseResults={state.parseResults}
                onPersist={handlePersist}
                onGoBack={() => actions.setCurrentStep('validate')}
                isLoading={isPersisting}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function getCompletedSteps(currentStep: string): string[] {
  const stepOrder = ['upload', 'select', 'analyze', 'map', 'validate', 'persist'];
  const currentIndex = stepOrder.indexOf(currentStep);
  return stepOrder.slice(0, currentIndex);
}

function generatePreviewData(analysis: SheetAnalysis): any[][] {
  // Generate preview data based on analysis
  const headers = analysis.columnDetections.map(d => d.headerText);
  
  // Create sample rows
  const sampleRows: any[][] = [];
  for (let i = 0; i < 5; i++) {
    const row = analysis.columnDetections.map(detection => {
      if (detection.sampleValues && detection.sampleValues.length > i) {
        return detection.sampleValues[i];
      }
      // Generate sample data based on detected type
      switch (detection.detectedType) {
        case 'date':
          return `0${i + 1}/01/2024`;
        case 'amount':
          return `$${(1000 * (i + 1)).toLocaleString()}.00`;
        case 'description':
          return `Descripción ${i + 1}`;
        case 'account':
          return `${4000 + i * 10}`;
        default:
          return `Valor ${i + 1}`;
      }
    });
    sampleRows.push(row);
  }
  
  return [headers, ...sampleRows];
}