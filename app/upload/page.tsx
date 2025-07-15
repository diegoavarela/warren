"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileUpload } from "@/components/FileUpload";
import { AppLayout } from "@/components/AppLayout";
import { ExcelFileMetadata } from "@/types";
import { useLocale } from "@/contexts/LocaleContext";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { CompanyContextBar } from "@/components/dashboard/CompanyContextBar";
import { TemplateSelector } from "@/components/TemplateSelector";
import { CompanySelector } from "@/components/CompanySelector";
import { useTranslation } from "@/lib/translations";
import { BuildingOfficeIcon, DocumentTextIcon, CurrencyDollarIcon, PencilIcon } from "@heroicons/react/24/outline";

function UploadPage() {
  const router = useRouter();
  const { locale, isLoading } = useLocale();
  const { user } = useAuth();
  const [redirecting, setRedirecting] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [selectedUnits, setSelectedUnits] = useState<'normal' | 'thousands' | 'millions'>('normal');
  const [step, setStep] = useState<'config' | 'upload'>('config');
  const [statementType, setStatementType] = useState<'profit_loss' | 'cash_flow'>('profit_loss');
  const { t } = useTranslation(locale);

  useEffect(() => {
    // Check for company context from dashboard navigation
    const preSelectedCompanyId = sessionStorage.getItem('selectedCompanyId');
    if (preSelectedCompanyId) {
      // Fetch company details
      fetchCompanyDetails(preSelectedCompanyId);
    }
    
    // Check if this is a cash flow upload
    const uploadType = sessionStorage.getItem('uploadStatementType');
    if (uploadType === 'cash_flow') {
      setStatementType('cash_flow');
      // Clear the session storage item
      sessionStorage.removeItem('uploadStatementType');
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
                  {locale?.startsWith('es') 
                    ? (statementType === 'cash_flow' ? 'Subir Flujo de Caja' : 'Subir Estado de P&L')
                    : (statementType === 'cash_flow' ? 'Upload Cash Flow' : 'Upload P&L Statement')
                  }
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
            </div>

            {/* Configuration Step */}
            {step === 'config' && (
              <div className="space-y-6">
                {/* Company Selection - show if no company selected */}
                {!selectedCompany && (
                  <div className="bg-white rounded-2xl shadow-lg p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <BuildingOfficeIcon className="h-6 w-6 text-purple-600" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        {locale?.startsWith('es') ? 'Seleccionar Empresa' : 'Select Company'}
                      </h3>
                    </div>
                    <p className="text-gray-600 mb-6">
                      {locale?.startsWith('es') 
                        ? 'Selecciona la empresa para la cual vas a cargar datos financieros.'
                        : 'Select the company for which you will upload financial data.'}
                    </p>
                    <CompanySelector
                      selectedCompanyId={selectedCompany?.id}
                      onCompanySelect={async (companyId) => {
                        await fetchCompanyDetails(companyId);
                        sessionStorage.setItem('selectedCompanyId', companyId);
                      }}
                    />
                  </div>
                )}

                {/* Template Selection */}
                {selectedCompany && (
                  <div className="bg-white rounded-2xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <DocumentTextIcon className="h-6 w-6 text-purple-600" />
                        <h3 className="text-lg font-semibold text-gray-900">
                          {locale?.startsWith('es') ? 'Selección de Plantilla' : 'Template Selection'}
                        </h3>
                      </div>
                      <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {locale?.startsWith('es') ? 'Opcional' : 'Optional'}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-6">
                      {locale?.startsWith('es') 
                        ? 'Selecciona una plantilla guardada para aplicar automáticamente el mapeo. Si no seleccionas ninguna, podrás mapear manualmente.'
                        : 'Select a saved template to automatically apply mapping. If you don\'t select any, you can map manually.'}
                    </p>
                    <TemplateSelector
                      companyId={selectedCompany.id}
                      statementType={statementType}
                      onTemplateSelect={(template) => {
                        setSelectedTemplate(template);
                        console.log('Template selected:', template);
                      }}
                      onSkip={() => {
                        setSelectedTemplate(null);
                        console.log('Template skipped');
                      }}
                    />
                  </div>
                )}

                {/* Units Selection */}
                {selectedCompany && (
                  <div className="bg-white rounded-2xl shadow-lg p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <CurrencyDollarIcon className="h-6 w-6 text-purple-600" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        {locale?.startsWith('es') ? 'Unidades de Expresión' : 'Expression Units'}
                      </h3>
                    </div>
                    <p className="text-gray-600 mb-6">
                      {locale?.startsWith('es') 
                        ? 'Especifica en qué unidades están expresados los valores en tu archivo.'
                        : 'Specify the units in which the values in your file are expressed.'}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { value: 'normal', label: locale?.startsWith('es') ? 'Valores normales' : 'Normal values', desc: locale?.startsWith('es') ? 'Ej: 1,000,000' : 'Ex: 1,000,000' },
                        { value: 'thousands', label: locale?.startsWith('es') ? 'Miles' : 'Thousands', desc: locale?.startsWith('es') ? 'Ej: 1,000 (representa 1,000,000)' : 'Ex: 1,000 (represents 1,000,000)' },
                        { value: 'millions', label: locale?.startsWith('es') ? 'Millones' : 'Millions', desc: locale?.startsWith('es') ? 'Ej: 1 (representa 1,000,000)' : 'Ex: 1 (represents 1,000,000)' }
                      ].map((unit) => (
                        <div
                          key={unit.value}
                          className={`border rounded-lg p-4 cursor-pointer transition-all ${
                            selectedUnits === unit.value
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setSelectedUnits(unit.value as any)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900">{unit.label}</h4>
                            <input
                              type="radio"
                              name="units"
                              value={unit.value}
                              checked={selectedUnits === unit.value}
                              onChange={() => setSelectedUnits(unit.value as any)}
                              className="w-4 h-4 text-purple-600"
                            />
                          </div>
                          <p className="text-sm text-gray-600">{unit.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Continue Button */}
                {selectedCompany && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => setStep('upload')}
                      className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center space-x-2"
                    >
                      <DocumentTextIcon className="w-5 h-5" />
                      <span>
                        {selectedTemplate 
                          ? (locale?.startsWith('es') ? 'Usar plantilla y continuar' : 'Use template and continue')
                          : (locale?.startsWith('es') ? 'Mapear manualmente' : 'Map manually')
                        }
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Upload Section */}
            {step === 'upload' && (
              <div className="space-y-4">
                {/* Compact Configuration Bar */}
                <div className="bg-gray-50 rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm">
                    <div className="flex items-center space-x-1">
                      <span className="text-gray-600">{locale?.startsWith('es') ? 'Empresa:' : 'Company:'}</span>
                      <span className="font-medium text-gray-900">{selectedCompany?.name}</span>
                    </div>
                    <span className="hidden sm:inline text-gray-300">•</span>
                    <div className="flex items-center space-x-1">
                      <span className="text-gray-600">{locale?.startsWith('es') ? 'Plantilla:' : 'Template:'}</span>
                      <span className="font-medium text-gray-900">{selectedTemplate?.templateName || (locale?.startsWith('es') ? 'Mapeo manual' : 'Manual mapping')}</span>
                    </div>
                    <span className="hidden sm:inline text-gray-300">•</span>
                    <div className="flex items-center space-x-1">
                      <span className="text-gray-600">{locale?.startsWith('es') ? 'Unidades:' : 'Units:'}</span>
                      <span className="font-medium text-gray-900">
                        {selectedUnits === 'normal' ? (locale?.startsWith('es') ? 'Valores normales' : 'Normal values') :
                         selectedUnits === 'thousands' ? (locale?.startsWith('es') ? 'Miles' : 'Thousands') :
                         (locale?.startsWith('es') ? 'Millones' : 'Millions')}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setStep('config')}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1 self-start sm:self-auto"
                  >
                    <PencilIcon className="w-4 h-4" />
                    <span>{locale?.startsWith('es') ? 'Cambiar' : 'Change'}</span>
                  </button>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <FileUpload 
                    onFileUploaded={async (metadata: any) => {
                      console.log('File uploaded:', metadata);
                      setRedirecting(true);
                      
                      // Store the file data and metadata along with configuration
                      sessionStorage.setItem('uploadSession', metadata.uploadSession);
                      sessionStorage.setItem('uploadedFile', JSON.stringify({
                        fileName: metadata.fileName,
                        fileSize: metadata.fileSize,
                        sheets: metadata.sheets,
                        detectedLocale: metadata.detectedLocale,
                        uploadSession: metadata.uploadSession,
                        selectedTemplate: selectedTemplate,
                        selectedUnits: selectedUnits,
                        statementType: statementType
                      }));
                      
                      // File is now stored on server temporarily, no need for sessionStorage
                      
                      // Store company ID for mapper
                      if (selectedCompany) {
                        sessionStorage.setItem('uploadCompanyId', selectedCompany.id);
                      }
                      
                      if (selectedTemplate) {
                        // Go directly to enhanced mapper which will handle template application
                        setTimeout(() => {
                          router.push(`/enhanced-mapper?session=${metadata.uploadSession}&autoTemplate=true`);
                        }, 500);
                      } else {
                        // Redirect to sheet selection page for manual mapping
                        setTimeout(() => {
                          router.push(`/select-sheet?session=${metadata.uploadSession}`);
                        }, 500);
                      }
                    }}
                    locale={locale}
                  />
                </div>
              </div>
            )}

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