'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, FileSpreadsheet, Trash2, Edit, TrendingUp, DollarSign, ArrowLeft, Code2, Copy, Check } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { useToast, ToastContainer } from '@/components/ui/Toast';

interface Configuration {
  id: string;
  companyId: string;
  version: number;
  type: 'cashflow' | 'pnl';
  name: string;
  description: string | null;
  isActive: boolean;
  isTemplate: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName: string;
  createdByLastName: string;
  lastProcessedFile?: {
    fileName: string;
    fileSize: number;
    processedAt: string;
    processingStatus: string;
  } | null;
}

export default function ConfigurationsPage() {
  const router = useRouter();
  // For now, use a mock selected company until we integrate with the context
  const selectedCompany = { id: 'b1dea3ff-cac4-45cc-be78-5488e612c2a8', name: 'VTEX Solutions SRL' };
  const [configurations, setConfigurations] = useState<Configuration[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [selectedConfigJson, setSelectedConfigJson] = useState<any>(null);
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [jsonCopied, setJsonCopied] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (selectedCompany?.id) {
      fetchConfigurations();
    }
  }, [selectedCompany?.id]);

  const fetchConfigurations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/configurations?companyId=${selectedCompany?.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch configurations');
      }

      const result = await response.json();
      setConfigurations(result.data || []);
    } catch (error) {
      console.error('Error fetching configurations:', error);
      toast.error('Failed to load configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfiguration = async (configId: string) => {
    // First click sets up confirmation, second click executes
    if (deleteConfirmId !== configId) {
      setDeleteConfirmId(configId);
      toast.warning('Click delete button again to confirm deletion', 'This action cannot be undone');
      setTimeout(() => setDeleteConfirmId(null), 5000); // Reset after 5 seconds
      return;
    }

    setDeleteConfirmId(null);

    try {
      const response = await fetch(`/api/configurations/${configId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete configuration');
      }

      toast.success('Configuration deleted successfully');
      fetchConfigurations(); // Refresh the list
    } catch (error) {
      console.error('Error deleting configuration:', error);
      toast.error('Failed to delete configuration');
    }
  };

  const handleViewJson = async (configId: string) => {
    try {
      const response = await fetch(`/api/configurations/${configId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch configuration');
      }

      const data = await response.json();
      setSelectedConfigJson(data.data.configJson);
      setSelectedConfigId(configId);
      setShowJsonModal(true);
    } catch (error) {
      console.error('Error fetching configuration:', error);
      toast.error('Failed to load configuration JSON');
    }
  };

  const handleCopyJson = async () => {
    if (selectedConfigJson) {
      try {
        await navigator.clipboard.writeText(JSON.stringify(selectedConfigJson, null, 2));
        setJsonCopied(true);
        toast.success('JSON copied to clipboard');
        setTimeout(() => setJsonCopied(false), 2000);
      } catch (error) {
        toast.error('Failed to copy JSON');
      }
    }
  };

  const getTypeColor = (type: string) => {
    return type === 'cashflow' ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-green-100 text-green-800 border-green-200';
  };

  const getTypeName = (type: string) => {
    return type === 'cashflow' ? 'Cash Flow' : 'P&L Statement';
  };

  const getTypeIcon = (type: string) => {
    return type === 'cashflow' ? 
      <TrendingUp className="h-4 w-4" /> : 
      <DollarSign className="h-4 w-4" />;
  };

  const getCardBorderColor = (type: string) => {
    return type === 'cashflow' ? 'border-l-blue-500' : 'border-l-green-500';
  };

  const getTypeDescription = (type: string) => {
    return type === 'cashflow' ? 
      'Analyzes cash inflows and outflows over time' : 
      'Tracks revenue, expenses, and profitability';
  };

  if (!selectedCompany) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardBody>
            <p className="text-center text-gray-500">
              Please select a company to manage configurations.
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <AppLayout>
      <ToastContainer 
        toasts={toast.toasts} 
        onClose={toast.removeToast} 
        position="top-right" 
      />
      <div className="container mx-auto py-6">
      <div className="flex justify-between items-start mb-8">
        <div>
          {/* Back Navigation */}
          <button
            onClick={() => router.push('/dashboard/company-admin')}
            className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 mb-4 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Administración</span>
          </button>
          
          <h1 className="text-3xl font-bold">Gestión de Configuraciones</h1>
          <p className="text-muted-foreground mt-2">
            Crear y gestionar configuraciones de análisis de Excel para {selectedCompany.name}
          </p>
        </div>
        <Button 
          onClick={() => router.push('/dashboard/company-admin/configurations/new')}
          leftIcon={<PlusCircle className="h-4 w-4" />}
        >
          Nueva Configuración
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardHeader>
              <CardBody>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : configurations.length === 0 ? (
        <Card className="text-center py-12">
          <CardBody>
            <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Aún no hay configuraciones</h3>
            <p className="text-gray-500 mb-4">
              Crea tu primera configuración de análisis de Excel para comenzar.
            </p>
            <Button 
              onClick={() => router.push('/dashboard/company-admin/configurations/new')}
              leftIcon={<PlusCircle className="h-4 w-4" />}
            >
              Crear Configuración
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-6">
          {configurations.map((config) => (
            <Card key={config.id} className={`hover:shadow-md transition-shadow border-l-4 ${getCardBorderColor(config.type)}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${getTypeColor(config.type)}`}>
                        {getTypeIcon(config.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-xl">{config.name}</CardTitle>
                          {config.isTemplate && (
                            <Badge className="bg-gray-100 text-gray-800">Plantilla</Badge>
                          )}
                          {!config.isActive && (
                            <Badge className="bg-red-100 text-red-800">Inactiva</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={getTypeColor(config.type)}>
                            {getTypeName(config.type)}
                          </Badge>
                          <span className="text-sm text-gray-500">•</span>
                          <span className="text-sm text-gray-500">{getTypeDescription(config.type)}</span>
                        </div>
                      </div>
                    </div>
                    <CardDescription>
                      {config.description || 'Sin descripción proporcionada'}
                    </CardDescription>
                    <div className="text-sm text-gray-500">
                      Versión {config.version} • Creada por {config.createdByName} {config.createdByLastName} 
                      • {new Date(config.createdAt).toLocaleDateString()}
                    </div>
                    {config.lastProcessedFile && (
                      <div className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded-md inline-block mt-2">
                        📄 Mapeado con: {config.lastProcessedFile.fileName}
                        {config.lastProcessedFile.processingStatus === 'completed' && (
                          <span className="ml-2 text-green-600">✓</span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewJson(config.id)}
                      className="flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      title="View JSON Configuration"
                    >
                      <Code2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/dashboard/company-admin/configurations/${config.id}/edit`)}
                      className="flex items-center justify-center"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteConfiguration(config.id)}
                      className={`flex items-center justify-center ${
                        deleteConfirmId === config.id 
                          ? 'text-red-700 bg-red-50 hover:bg-red-100 hover:text-red-800' 
                          : 'text-destructive hover:text-destructive'
                      }`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardBody>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    Última actualización: {new Date(config.updatedAt).toLocaleDateString()}
                  </div>
                  
                  <div className="flex gap-2">
                    {config.lastProcessedFile && config.lastProcessedFile.processingStatus === 'completed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const dashboardType = config.type === 'cashflow' ? 'cashflow' : 'pnl';
                          router.push(`/dashboard/company-admin/${dashboardType}`);
                        }}
                        leftIcon={config.type === 'cashflow' ? <TrendingUp className="h-4 w-4" /> : <DollarSign className="h-4 w-4" />}
                      >
                        Ver Dashboard
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => router.push(`/dashboard/company-admin/configurations/${config.id}/process`)}
                      leftIcon={<FileSpreadsheet className="h-4 w-4" />}
                    >
                      Procesar Archivos
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* JSON Modal */}
      {showJsonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <Code2 className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-semibold">Configuration JSON</h2>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyJson}
                  leftIcon={jsonCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  className={jsonCopied ? "text-green-600 border-green-300" : ""}
                >
                  {jsonCopied ? 'Copied!' : 'Copy JSON'}
                </Button>
                <button
                  onClick={() => setShowJsonModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold p-1"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6 overflow-auto max-h-[calc(90vh-120px)]">
              <pre className="bg-gray-50 rounded-lg p-4 text-sm overflow-x-auto border">
                <code className="text-gray-800 whitespace-pre-wrap">
                  {selectedConfigJson ? JSON.stringify(selectedConfigJson, null, 2) : 'Loading...'}
                </code>
              </pre>
            </div>
            <div className="flex justify-between items-center p-6 border-t bg-gray-50">
              <div className="text-sm text-gray-600">
                <strong>Note:</strong> This is a read-only view. Use the Edit button to modify the configuration.
              </div>
              <Button
                variant="outline"
                onClick={() => setShowJsonModal(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      </div>
    </AppLayout>
  );
}