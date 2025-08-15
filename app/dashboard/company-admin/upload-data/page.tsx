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
      <ProtectedRoute requireRole={[ROLES.COMPANY_ADMIN, ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN]}>
        <AppLayout>
          <div className="container mx-auto py-6">
            {/* Back Navigation */}
            <div className="mb-6">
              <Button
                variant="ghost"
                onClick={() => setStep('select-config')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                <span>{locale?.startsWith('es') ? 'Volver a Configuraciones' : 'Back to Configurations'}</span>
              </Button>
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
                  <div className="text-center py-12">
                    <DocumentArrowUpIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {locale?.startsWith('es') ? 'Funcionalidad en Desarrollo' : 'Feature in Development'}
                    </h3>
                    <p className="text-gray-600 mb-6">
                      {locale?.startsWith('es') 
                        ? 'La nueva carga basada en configuraciones estará disponible pronto.'
                        : 'The new configuration-based upload will be available soon.'}
                    </p>
                    <Button
                      variant="secondary"
                      onClick={() => router.push('/upload')}
                    >
                      {locale?.startsWith('es') ? 'Usar Carga Legacy' : 'Use Legacy Upload'}
                    </Button>
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
    <ProtectedRoute requireRole={[ROLES.COMPANY_ADMIN, ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN]}>
      <AppLayout>
        <div className="container mx-auto py-6">
          {/* Back Navigation */}
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard/company-admin')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              <span>{locale?.startsWith('es') ? 'Volver a Administración' : 'Back to Administration'}</span>
            </Button>
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