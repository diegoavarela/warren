"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { 
  DocumentIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  ChevronRightIcon 
} from "@heroicons/react/24/outline";

interface ExcelSheet {
  name: string;
  rows: number;
  cols: number;
  hasData: boolean;
  preview: any[][];
}

function SelectSheetContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheets, setSheets] = useState<ExcelSheet[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);

  useEffect(() => {
    const loadSheets = async () => {
      try {
        console.log('Loading sheets...');
        const uploadSession = searchParams.get('session') || sessionStorage.getItem('uploadSession');
        const uploadedFileStr = sessionStorage.getItem('uploadedFile');
        
        console.log('Upload session:', uploadSession);
        console.log('Uploaded file string:', uploadedFileStr);
        
        if (!uploadSession || !uploadedFileStr) {
          console.error('Missing session or file data');
          setError('No se encontró archivo cargado. Por favor, vuelve a cargar tu archivo.');
          return;
        }

        const uploadedFile = JSON.parse(uploadedFileStr);
        setFileName(uploadedFile.fileName);
        setSheets(uploadedFile.sheets);
        
        // Auto-select first sheet with data
        const firstSheetWithData = uploadedFile.sheets.find((s: ExcelSheet) => s.hasData);
        if (firstSheetWithData) {
          setSelectedSheet(firstSheetWithData.name);
        }
        
      } catch (err) {
        console.error('Error loading sheets:', err);
        setError('Error al cargar las hojas del archivo');
      } finally {
        setLoading(false);
      }
    };

    loadSheets();
  }, [searchParams]);

  const handleSheetSelect = (sheetName: string) => {
    setSelectedSheet(sheetName);
  };

  const handleContinue = () => {
    if (!selectedSheet) return;
    
    // Store selected sheet in session storage
    sessionStorage.setItem('selectedSheet', selectedSheet);
    
    // Redirect to mapper
    const uploadSession = searchParams.get('session') || sessionStorage.getItem('uploadSession');
    router.push(`/mapper?session=${uploadSession}&sheet=${selectedSheet}`);
  };

  const formatCellValue = (value: any) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string' && value.trim() === '') return '';
    return String(value);
  };

  const getSheetIcon = (sheet: ExcelSheet) => {
    if (!sheet.hasData) {
      return <ExclamationTriangleIcon className="w-6 h-6 text-gray-400" />;
    }
    
    // Try to detect sheet type by name
    const name = sheet.name.toLowerCase();
    if (name.includes('balance') || name.includes('sheet')) {
      return <DocumentIcon className="w-6 h-6 text-blue-600" />;
    } else if (name.includes('p&l') || name.includes('profit') || name.includes('loss') || name.includes('resultado')) {
      return <DocumentIcon className="w-6 h-6 text-green-600" />;
    } else if (name.includes('cash') || name.includes('flow') || name.includes('flujo')) {
      return <DocumentIcon className="w-6 h-6 text-purple-600" />;
    }
    
    return <DocumentIcon className="w-6 h-6 text-blue-600" />;
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <AppLayout showFooter={true}>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-lg text-gray-600">Analizando hojas del archivo...</p>
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
                <ExclamationTriangleIcon className="w-16 h-16 mx-auto" />
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
        </AppLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppLayout showFooter={true}>
        <div className="container mx-auto px-4 py-4 pb-24">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                Seleccionar Hoja de Cálculo
              </h1>
              <p className="text-gray-600">
                Archivo: <span className="font-medium">{fileName}</span> • 
                {sheets.length} hoja{sheets.length !== 1 ? 's' : ''} encontrada{sheets.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
              <h3 className="font-medium text-blue-900 mb-1">Instrucciones</h3>
              <p className="text-sm text-blue-800">
                Selecciona la hoja que contiene los datos financieros que quieres mapear. 
                Puedes ver una vista previa de cada hoja antes de seleccionarla.
              </p>
            </div>

            {/* Sheets Grid */}
            <div className="grid gap-4 mb-8">
              {sheets.map((sheet, index) => (
                <div 
                  key={index}
                  onClick={() => sheet.hasData && handleSheetSelect(sheet.name)}
                  className={`
                    border rounded-lg transition-all cursor-pointer
                    ${!sheet.hasData ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-60' :
                      selectedSheet === sheet.name 
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50 bg-white'
                    }
                  `}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {getSheetIcon(sheet)}
                        <div>
                          <h3 className={`text-lg font-semibold ${
                            sheet.hasData ? 'text-gray-900' : 'text-gray-500'
                          }`}>
                            {sheet.name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {sheet.rows.toLocaleString()} filas • {sheet.cols} columnas
                            {!sheet.hasData && ' • Sin datos'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        {selectedSheet === sheet.name && (
                          <CheckCircleIcon className="w-6 h-6 text-blue-600" />
                        )}
                        {sheet.hasData && (
                          <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {/* Sheet Preview */}
                    {sheet.hasData && sheet.preview && sheet.preview.length > 0 && (
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-2 py-1 border-b border-gray-200">
                          <p className="text-xs font-medium text-gray-700">Vista previa</p>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full">
                            <tbody className="divide-y divide-gray-200">
                              {sheet.preview.slice(0, 3).map((row, rowIndex) => (
                                <tr key={rowIndex} className="hover:bg-gray-50">
                                  {row.slice(0, 8).map((cell, cellIndex) => (
                                    <td 
                                      key={cellIndex} 
                                      className="px-2 py-1 text-sm text-gray-900 max-w-[120px] truncate"
                                    >
                                      {formatCellValue(cell)}
                                    </td>
                                  ))}
                                  {row.length > 8 && (
                                    <td className="px-2 py-1 text-sm text-gray-500">
                                      ... +{row.length - 8} más
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {sheet.preview.length > 3 && (
                          <div className="bg-gray-50 px-2 py-1 border-t border-gray-200">
                            <p className="text-xs text-gray-500">
                              ... y {sheet.rows - 3} filas más
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
        
        {/* Fixed Bottom Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4 shadow-lg z-50">
          <div className="container mx-auto max-w-4xl">
            <div className="flex justify-between items-center">
              <button
                onClick={() => router.push('/upload')}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                ← Cargar otro archivo
              </button>
              
              <button
                onClick={handleContinue}
                disabled={!selectedSheet}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2 shadow-md"
              >
                <span>{selectedSheet ? `Continuar con "${selectedSheet}"` : 'Selecciona una hoja para continuar'}</span>
                {selectedSheet && <ChevronRightIcon className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}

export default function SelectSheetPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <SelectSheetContent />
    </Suspense>
  );
}