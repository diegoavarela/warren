"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MatrixExcelViewer } from "@/components/MatrixExcelViewer";
import { MatrixMapping, DocumentStructure, AccountClassification } from "@/types";
import { Header } from "@/components/Header";
import { readExcelFile } from "@/lib/excel-reader";
import { useLocale } from "@/contexts/LocaleContext";

export default function AdvancedMapperPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useLocale();
  const [loading, setLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState<string>("Inicializando...");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [excelData, setExcelData] = useState<any[][] | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [sheetName, setSheetName] = useState<string>("");
  const [excelMetadata, setExcelMetadata] = useState<any>(null);

  useEffect(() => {
    const loadExcelData = async () => {
      try {
        setLoadingStep("Verificando datos de sesión...");
        const uploadSession = searchParams.get('session') || sessionStorage.getItem('uploadSession');
        const uploadedFileStr = sessionStorage.getItem('uploadedFile');
        
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
      // Store results for persistence
      sessionStorage.setItem('validationResults', JSON.stringify(results));
      sessionStorage.setItem('matrixMapping', JSON.stringify(mapping));
      
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
      mapping.periodColumns.forEach(pc => {
        const value = row[pc.columnIndex];
        if (value !== null && value !== undefined) {
          periodData[pc.periodLabel] = value;
        }
      });
      
      results.push({
        rowIndex: rowIdx,
        accountCode: accountCode || `ROW_${rowIdx}`,
        accountName: accountName || 'Sin nombre',
        category: 'other_revenue', // Default category
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
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-center max-w-md">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-lg text-gray-600 mb-2">Preparando mapeador visual avanzado</p>
            <p className="text-sm text-blue-600 font-medium">{loadingStep}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-center max-w-md">
            <div className="text-red-600 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Volver a cargar archivo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {locale?.startsWith('es') ? 'Mapeador Visual Avanzado' : 'Advanced Visual Mapper'}
            </h1>
            <p className="text-gray-600">
              {locale?.startsWith('es') ? 'Archivo:' : 'File:'} <span className="font-medium">{fileName}</span> • 
              {locale?.startsWith('es') ? 'Hoja:' : 'Sheet:'} <span className="font-medium">{sheetName}</span> • 
              <span className="font-medium">{excelData?.length || 0} {locale?.startsWith('es') ? 'filas totales' : 'total rows'}</span>
            </p>
          </div>

          {excelData && (
            <div className="relative">
              <MatrixExcelViewer
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
      </main>
    </div>
  );
}