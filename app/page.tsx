"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUpload } from "@/components/FileUpload";
import { Header } from "@/components/Header";
import { ExcelFileMetadata } from "@/types";
import { useLocale } from "@/contexts/LocaleContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/lib/translations";

export default function HomePage() {
  const router = useRouter();
  const { locale, isLoading } = useLocale();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { t } = useTranslation(locale);
  const [redirecting, setRedirecting] = useState(false);

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-lg text-gray-600">Inicializando aplicación...</p>
        </div>
      </div>
    );
  }

  if (redirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-lg text-gray-600">Redirigiendo al mapeador de cuentas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {locale?.startsWith('es') 
                ? 'Analizador Inteligente de Estados Financieros'
                : 'Intelligent Financial Statement Analyzer'
              }
            </h1>
            <p className="text-xl text-gray-600 mb-2">
              {locale?.startsWith('es')
                ? 'Transforma tus archivos Excel financieros con detección automática y mapeo visual'
                : 'Transform your financial Excel files with automatic detection and visual mapping'
              }
            </p>
            <p className="text-lg text-gray-500">
              {locale?.startsWith('es')
                ? 'Soporte completo para formatos LATAM • P&L • Flujo de Efectivo • Balance General'
                : 'Full support for LATAM formats • P&L • Cash Flow • Balance Sheet'
              }
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="group bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-200 transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {locale?.startsWith('es') ? 'Detección Inteligente' : 'Smart Detection'}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {locale?.startsWith('es') 
                  ? 'Identificación automática de estados financieros y mapeo de columnas con IA'
                  : 'Automatic financial statement identification and AI-powered column mapping'
                }
              </p>
            </div>

            <div className="group bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-green-200 transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {locale?.startsWith('es') ? 'Formatos LATAM' : 'LATAM Formats'}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {locale?.startsWith('es')
                  ? 'Soporte nativo para fechas DD/MM/YYYY, decimales con coma y términos en español'
                  : 'Native support for DD/MM/YYYY dates, comma decimals and Spanish terms'
                }
              </p>
            </div>

            <div className="group bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-purple-200 transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {locale?.startsWith('es') ? 'Mapeo Visual' : 'Visual Mapping'}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {locale?.startsWith('es')
                  ? 'Interfaz interactiva tipo Excel con indicadores de confianza por colores'
                  : 'Interactive Excel-like interface with color-coded confidence indicators'
                }
              </p>
            </div>
          </div>

          {/* Upload Section */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            {isAuthenticated ? (
              <>
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    {locale?.startsWith('es') ? 'Comenzar Procesamiento' : 'Start Processing'}
                  </h2>
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
                    
                    // Redirect to mapper with the appropriate sheet
                    console.log('Redirecting to mapper with session:', metadata.uploadSession);
                    console.log('Available sheets:', metadata.sheets);
                    
                    // Use sheet 2 (index 1) as requested, or fallback to first sheet with data
                    const sheet2 = metadata.sheets[1]; // Sheet 2 (zero-indexed)
                    const firstSheetWithData = metadata.sheets.find((s: any) => s.hasData);
                    const sheetName = sheet2 ? sheet2.name : (firstSheetWithData ? firstSheetWithData.name : metadata.sheets[0]?.name);
                    
                    console.log('Using sheet:', sheet2 ? `Sheet 2: ${sheet2.name}` : 'Fallback sheet');
                    
                    if (sheetName) {
                      sessionStorage.setItem('selectedSheet', sheetName);
                      setTimeout(() => {
                        window.location.href = `/mapper?session=${metadata.uploadSession}&sheet=${encodeURIComponent(sheetName)}`;
                      }, 500);
                    } else {
                      console.error('No sheets found in uploaded file');
                      setRedirecting(false);
                    }
                  }}
                  locale={locale}
                />
              </>
            ) : (
              <div className="text-center py-12">
                <div className="mb-8">
                  <div className="w-20 h-20 mx-auto bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">
                    {locale?.startsWith('es') ? 'Inicia sesión para continuar' : 'Sign in to continue'}
                  </h2>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    {locale?.startsWith('es') 
                      ? 'Necesitas una cuenta para subir y procesar archivos financieros'
                      : 'You need an account to upload and process financial files'
                    }
                  </p>
                </div>
                <div className="space-y-3 max-w-sm mx-auto">
                  <button
                    onClick={() => router.push('/login')}
                    className="w-full px-6 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-[1.02] shadow-md"
                  >
                    {t('auth.login')}
                  </button>
                  <button
                    onClick={() => router.push('/signup')}
                    className="w-full px-6 py-3.5 bg-white text-blue-600 font-medium rounded-xl border-2 border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-all transform hover:scale-[1.02]"
                  >
                    {t('auth.createAccount')}
                  </button>
                </div>
              </div>
            )}
            
            {/* Quick Start Button - Only for authenticated users */}
            {isAuthenticated && (
              <div className="mt-8 text-center">
                <a
                  href="/mapper"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {locale?.startsWith('es') ? 'Ir al Mapeador Visual' : 'Go to Visual Mapper'}
                </a>
              </div>
            )}
          </div>

          {/* Supported Formats */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>Formatos soportados: .xlsx, .xls • Tamaño máximo: 50MB</p>
            <p className="mt-2">
              Estados financieros: P&L (Estado de Resultados) • Cash Flow (Flujo de Efectivo) • Balance General
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}