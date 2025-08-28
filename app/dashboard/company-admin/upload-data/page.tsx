"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardBody, CardTitle, CardDescription } from "@/components/ui/Card";
import { useLocale } from "@/contexts/LocaleContext";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { 
  ArrowLeftIcon, 
  DocumentArrowUpIcon, 
  CogIcon,
  CheckIcon,
  PlusIcon 
} from "@heroicons/react/24/outline";
import { ROLES } from "@/lib/auth/rbac";
import { useToast, ToastContainer } from '@/components/ui/Toast';

interface Configuration {
  id: string;
  companyId: string;
  type: 'cashflow' | 'pnl';
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function UploadDataPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const { user } = useAuth();
  const toast = useToast();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedCompanyName, setSelectedCompanyName] = useState<string>('');
  const [configurations, setConfigurations] = useState<Configuration[]>([]);
  const [selectedConfiguration, setSelectedConfiguration] = useState<Configuration | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'select-config' | 'upload'>('select-config');

  useEffect(() => {
    // Get company context from session storage
    const companyId = sessionStorage.getItem('selectedCompanyId');
    const companyName = sessionStorage.getItem('selectedCompanyName');
    
    if (companyId && companyName) {
      setSelectedCompanyId(companyId);
      setSelectedCompanyName(companyName);
      fetchConfigurations(companyId);
    } else {
      // Redirect back to company admin if no company context
      router.push('/dashboard/company-admin');
    }
  }, [router]);

  const fetchConfigurations = async (companyId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/configurations?companyId=${companyId}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          // Only show active configurations
          const activeConfigs = data.data.filter((config: Configuration) => config.isActive);
          setConfigurations(activeConfigs);
        }
      }
    } catch (error) {
      console.error('Error fetching configurations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigurationSelect = (config: Configuration) => {
    setSelectedConfiguration(config);
    setStep('upload');
  };

  const handleCreateConfiguration = () => {
    sessionStorage.setItem('selectedCompanyId', selectedCompanyId);
    router.push('/dashboard/company-admin/configurations/new');
  };

  const getTypeDisplayName = (type: string) => {
    if (type === 'pnl') {
      return locale?.startsWith('es') ? 'Estado de Resultados (P&L)' : 'Profit & Loss (P&L)';
    }
    return locale?.startsWith('es') ? 'Flujo de Caja' : 'Cash Flow';
  };

  const getTypeColor = (type: string) => {
    return type === 'pnl' ? 'border-blue-200 bg-blue-50' : 'border-green-200 bg-green-50';
  };

  const getTypeIcon = (type: string) => {
    return type === 'pnl' ? '📊' : '💰';
  };

  if (step === 'upload' && selectedConfiguration) {
    // TODO: Implement actual file upload component with configuration
    return (
      <ProtectedRoute requireRole={[ROLES.USER, ROLES.ORGANIZATION_ADMIN, ROLES.PLATFORM_ADMIN]}>
        <AppLayout>
          <ToastContainer 
            toasts={toast.toasts} 
            onClose={toast.removeToast} 
            position="top-right" 
          />
          <div className="container mx-auto py-6">
            {/* Back Navigation */}
            <div className="mb-6">
              <button
                onClick={() => setStep('select-config')}
                className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium whitespace-nowrap"
                style={{ minWidth: 'max-content' }}
              >
                <ArrowLeftIcon className="w-4 h-4 flex-shrink-0" />
                {locale?.startsWith('es') ? 'Volver a Configuraciones' : 'Back to Configurations'}
              </button>
            </div>

            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {locale?.startsWith('es') ? 'Subir Archivo Excel' : 'Upload Excel File'}
                </h1>
                <p className="text-gray-600">
                  {locale?.startsWith('es') ? 'Usando configuración:' : 'Using configuration:'} <span className="font-semibold">{selectedConfiguration.name}</span>
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {getTypeDisplayName(selectedConfiguration.type)}
                </p>
              </div>

              <Card>
                <CardBody className="p-8">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                    <DocumentArrowUpIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {locale?.startsWith('es') ? 'Arrastra tu archivo Excel aquí' : 'Drag your Excel file here'}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {locale?.startsWith('es') ? 'o haz clic para seleccionar' : 'or click to select'}
                    </p>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      id="file-upload"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          
                          try {
                            // Convert file to base64
                            const reader = new FileReader();
                            reader.onload = async (event) => {
                              const base64Content = event.target?.result as string;
                              const base64Data = base64Content.split(',')[1]; // Remove data:... prefix
                              
                              // Upload file to database
                              const uploadResponse = await fetch('/api/financial-data-files', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  companyId: selectedCompanyId,
                                  filename: file.name,
                                  originalFilename: file.name,
                                  fileContent: base64Data,
                                  fileSize: file.size,
                                  mimeType: file.type
                                })
                              });
                              
                              if (uploadResponse.ok) {
                                const uploadResult = await uploadResponse.json();
                                
                                // Show success and navigate to dashboard
                                toast.success(locale?.startsWith('es') 
                                  ? `Archivo ${file.name} subido exitosamente. Redirigiendo al dashboard...`
                                  : `File ${file.name} uploaded successfully. Redirecting to dashboard...`
                                );
                                
                                // Navigate to appropriate dashboard
                                const dashboardType = selectedConfiguration.type === 'cashflow' ? 'cashflow' : 'pnl';
                                router.push(`/dashboard/company-admin/${dashboardType}`);
                              } else {
                                throw new Error('Upload failed');
                              }
                            };
                            reader.readAsDataURL(file);
                          } catch (error) {
                            console.error('❌ Upload error:', error);
                            toast.error(locale?.startsWith('es') 
                              ? `Error al subir el archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`
                              : `Upload error: ${error instanceof Error ? error.message : 'Unknown error'}`
                            );
                          }
                        }
                      }}
                    />
                    <label 
                      htmlFor="file-upload" 
                      className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors cursor-pointer"
                    >
                      {locale?.startsWith('es') ? 'Seleccionar Archivo' : 'Select File'}
                    </label>
                    <p className="text-xs text-gray-500 mt-4">
                      {locale?.startsWith('es') ? 'Formatos soportados: .xlsx, .xls' : 'Supported formats: .xlsx, .xls'}
                    </p>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requireRole={[ROLES.USER, ROLES.ORGANIZATION_ADMIN, ROLES.PLATFORM_ADMIN]}>
      <AppLayout>
        <ToastContainer 
          toasts={toast.toasts} 
          onClose={toast.removeToast} 
          position="top-right" 
        />
        <div className="container mx-auto py-6">
          {/* Back Navigation */}
          <div className="mb-6">
            <button
              onClick={() => router.push('/dashboard/company-admin')}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium whitespace-nowrap"
              style={{ minWidth: 'max-content' }}
            >
              <ArrowLeftIcon className="w-4 h-4 flex-shrink-0" />
              {locale?.startsWith('es') ? 'Volver a Administración' : 'Back to Administration'}
            </button>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {locale?.startsWith('es') ? 'Subir Datos Financieros' : 'Upload Financial Data'}
              </h1>
              <p className="text-gray-600">
                {selectedCompanyName} • {locale?.startsWith('es') ? 'Selecciona una configuración' : 'Select a configuration'}
              </p>
            </div>

            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardBody className="p-6">
                      <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            ) : configurations.length > 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 mb-6">
                  {locale?.startsWith('es') 
                    ? 'Elige la configuración que corresponde al tipo de archivo que vas a subir:'
                    : 'Choose the configuration that matches the type of file you want to upload:'}
                </p>
                
                {configurations.map((config) => (
                  <Card 
                    key={config.id} 
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md border-l-4 ${getTypeColor(config.type)}`}
                    onClick={() => handleConfigurationSelect(config)}
                  >
                    <CardBody className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="text-2xl">
                            {getTypeIcon(config.type)}
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {config.name}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {getTypeDisplayName(config.type)}
                            </p>
                            {config.description && (
                              <p className="text-xs text-gray-500 mt-1">
                                {config.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            {locale?.startsWith('es') ? 'Activa' : 'Active'}
                          </span>
                          <DocumentArrowUpIcon className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardBody className="p-8 text-center">
                  <CogIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {locale?.startsWith('es') ? 'No hay configuraciones disponibles' : 'No Configurations Available'}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {locale?.startsWith('es') 
                      ? 'Necesitas crear una configuración antes de poder subir archivos.'
                      : 'You need to create a configuration before you can upload files.'}
                  </p>
                  <Button
                    variant="primary"
                    onClick={handleCreateConfiguration}
                    leftIcon={<PlusIcon className="w-4 h-4" />}
                  >
                    {locale?.startsWith('es') ? 'Crear Configuración' : 'Create Configuration'}
                  </Button>
                </CardBody>
              </Card>
            )}
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}

export default UploadDataPage;