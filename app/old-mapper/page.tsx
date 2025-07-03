"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AccountRowMapper, AccountMapping } from "@/components/AccountRowMapper";
import { Header } from "@/components/Header";
import { readExcelFile } from "@/lib/excel-reader";
import { getMockDatabase } from "@/lib/db/mock-db";
import { useLocale } from "@/contexts/LocaleContext";

export default function MapperPage() {
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
        
        setLoadingStep("Preparando interfaz de mapeo...");
        // Show ALL data (no limits)
        setExcelData(data.rawData);
        
      } catch (err) {
        console.error('Error loading Excel data:', err);
        setError('Error al cargar el archivo Excel');
      } finally {
        setLoading(false);
      }
    };

    loadExcelData();
  }, [searchParams]);

  const handleMappingComplete = async (mapping: AccountMapping) => {
    setProcessing(true);
    try {
      setLoadingStep("Validando mapeo de cuentas...");
      
      // Validate the mapped data
      const response = await fetch('/api/validate-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadSession: searchParams.get('session') || sessionStorage.getItem('uploadSession'),
          sheetName,
          accountMapping: mapping,
          locale: locale
        })
      });

      if (!response.ok) {
        throw new Error('Error al validar los datos');
      }

      setLoadingStep("Procesando datos financieros...");
      const results = await response.json();
      
      setLoadingStep("Preparando para persistencia...");
      // Store results for persistence
      sessionStorage.setItem('validationResults', JSON.stringify(results));
      sessionStorage.setItem('accountMapping', JSON.stringify(mapping));
      
      // Redirect to persistence page
      router.push('/persist');
      
    } catch (err) {
      console.error('Validation error:', err);
      setError('Error al validar el mapeo');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-center max-w-md">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-lg text-gray-600 mb-2">Preparando mapeo de cuentas</p>
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
              Mapeo de Cuentas Financieras
            </h1>
            <p className="text-gray-600">
              Archivo: <span className="font-medium">{fileName}</span> • 
              Hoja: <span className="font-medium">{sheetName}</span> • 
              <span className="font-medium">{excelData?.length || 0} filas totales</span>
            </p>
          </div>

          {excelData && (
            <div className="relative">
              <AccountRowMapper
                rawData={excelData}
                onMappingComplete={handleMappingComplete}
                locale={locale}
              />
              
              {/* Processing overlay */}
              {processing && (
                <div className="absolute inset-0 bg-white bg-opacity-95 flex items-center justify-center z-50 rounded-lg">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-lg text-gray-600 mb-2">Procesando mapeo</p>
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