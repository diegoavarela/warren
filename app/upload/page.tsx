"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileUpload } from "@/components/FileUpload";
import { AppLayout } from "@/components/AppLayout";
import { ExcelFileMetadata } from "@/types";
import { useLocale } from "@/contexts/LocaleContext";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BuildingOfficeIcon } from "@heroicons/react/24/outline";

function UploadPage() {
  const router = useRouter();
  const { locale, isLoading } = useLocale();
  const { user } = useAuth();
  const [redirecting, setRedirecting] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);

  useEffect(() => {
    // Check for company context from dashboard navigation
    const preSelectedCompanyId = sessionStorage.getItem('selectedCompanyId');
    if (preSelectedCompanyId) {
      // Fetch company details
      fetchCompanyDetails(preSelectedCompanyId);
    }
  }, []);

  const fetchCompanyDetails = async (companyId: string) => {
    try {
      const response = await fetch(`/api/v1/companies/${companyId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedCompany(data.data);
      } else {
        console.warn('Failed to fetch company details:', response.status);
      }
    } catch (err) {
      console.warn('Error fetching company details:', err);
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <AppLayout showFooter={true}>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-lg text-gray-600">Inicializando aplicación...</p>
            </div>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  if (redirecting) {
    return (
      <ProtectedRoute>
        <AppLayout showFooter={true}>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-lg text-gray-600">Analizando archivo y preparando selección de hojas...</p>
            </div>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppLayout showFooter={true}>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {locale?.startsWith('es') ? 'Comenzar Procesamiento' : 'Start Processing'}
                </h1>
                <p className="text-gray-600">
                  {locale?.startsWith('es') 
                    ? 'Sube tu archivo Excel para comenzar el análisis inteligente'
                    : 'Upload your Excel file to start intelligent analysis'
                  }
                </p>
                {user && (
                  <p className="text-sm text-gray-500 mt-2">
                    {locale?.startsWith('es') ? 'Bienvenido,' : 'Welcome,'} {user.firstName}!
                  </p>
                )}
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
            {/* Upload Section */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <FileUpload 
              onFileUploaded={async (metadata: any) => {
                console.log('File uploaded:', metadata);
                setRedirecting(true);
                
                // Store the file data and metadata
                sessionStorage.setItem('uploadSession', metadata.uploadSession);
                sessionStorage.setItem('uploadedFile', JSON.stringify({
                  fileName: metadata.fileName,
                  fileSize: metadata.fileSize,
                  sheets: metadata.sheets,
                  detectedLocale: metadata.detectedLocale,
                  uploadSession: metadata.uploadSession
                }));
                
                // Store the actual file data
                if (metadata.fileData) {
                  sessionStorage.setItem(`fileData_${metadata.uploadSession}`, metadata.fileData);
                }
                
                // Redirect to sheet selection page
                console.log('Redirecting to sheet selection with session:', metadata.uploadSession);
                console.log('Available sheets:', metadata.sheets);
                
                // Redirect to sheet selection page
                setTimeout(() => {
                  window.location.href = `/select-sheet?session=${metadata.uploadSession}`;
                }, 500);
              }}
              locale={locale}
            />
          </div>

            {/* Supported Formats */}
            <div className="mt-8 text-center text-sm text-gray-500">
              <p>Formatos soportados: .xlsx, .xls • Tamaño máximo: 50MB</p>
              <p className="mt-2">
                Estados financieros: P&L (Estado de Resultados) • Cash Flow (Flujo de Efectivo) • Balance General
              </p>
            </div>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}

export default function UploadPageWrapper() {
  return <UploadPage />;
}