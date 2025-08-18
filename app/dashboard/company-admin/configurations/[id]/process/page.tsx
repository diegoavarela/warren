'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { useToast, ToastContainer } from '@/components/ui/Toast';

interface Configuration {
  id: string;
  name: string;
  type: 'cashflow' | 'pnl';
  description: string | null;
}

interface ProcessingResult {
  processedDataId: string;
  fileId: string;
  configId: string;
  fileName: string;
  configName: string;
  processedAt: string;
  processingStatus: string;
  currency: string;
  units: string;
  periodStart: string | null;
  periodEnd: string | null;
  preview: {
    periods: string[];
    dataRowsCount: number;
    categoriesCount: number;
  };
}

type ProcessingStep = 'upload' | 'processing' | 'completed' | 'error';

export default function ProcessFilePage() {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const [selectedCompany, setSelectedCompany] = useState<{ id: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [configuration, setConfiguration] = useState<Configuration | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingStep, setProcessingStep] = useState<ProcessingStep>('upload');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const configId = params.id as string;

  // Load selected company from sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedCompanyId = sessionStorage.getItem('selectedCompanyId');
      const storedCompanyName = sessionStorage.getItem('selectedCompanyName');
      
      if (storedCompanyId) {
        setSelectedCompany({
          id: storedCompanyId,
          name: storedCompanyName || 'Company'
        });
      }
    }
  }, []);

  useEffect(() => {
    if (configId) {
      fetchConfiguration();
    }
  }, [configId]);

  const fetchConfiguration = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/configurations/${configId}`);
      
      if (!response.ok) {
        throw new Error('Error al obtener la configuración');
      }

      const result = await response.json();
      setConfiguration({
        id: result.data.id,
        name: result.data.name,
        type: result.data.type,
        description: result.data.description
      });
    } catch (error) {
      console.error('Error fetching configuration:', error);
      toast.error('Error al cargar la configuración');
      router.push('/dashboard/company-admin/configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedExtensions = ['.xlsx', '.xls'];
      const isValidType = allowedExtensions.some(ext => 
        file.name.toLowerCase().endsWith(ext)
      );

      if (!isValidType) {
        toast.error('Por favor selecciona un archivo Excel (.xlsx o .xls)');
        return;
      }

      // Check file size (max 50MB)
      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error('El tamaño del archivo excede el límite de 50MB');
        return;
      }

      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUploadAndProcess = async () => {
    if (!selectedFile || !selectedCompany?.id || !configId) return;

    try {
      setProcessingStep('processing');
      setUploadProgress(0);
      setError(null);

      // Step 1: Upload the file
      const uploadFormData = new FormData();
      uploadFormData.append('file', selectedFile);
      uploadFormData.append('companyId', selectedCompany.id);
      uploadFormData.append('uploadSession', `config-process-${Date.now()}`);

      setUploadProgress(25);

      const uploadResponse = await fetch('/api/files/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!uploadResponse.ok) {
        const uploadError = await uploadResponse.json();
        throw new Error(uploadError.message || 'Error al subir archivo');
      }

      const uploadResult = await uploadResponse.json();
      const fileId = uploadResult.data.fileId;

      setUploadProgress(50);

      // Step 2: Process the file with the configuration
      const processResponse = await fetch('/api/files/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId,
          configId,
          companyId: selectedCompany.id,
        }),
      });

      setUploadProgress(75);

      if (!processResponse.ok) {
        const processError = await processResponse.json();
        throw new Error(processError.message || 'Error al procesar archivo');
      }

      const processResult = await processResponse.json();
      setProcessingResult(processResult.data);

      setUploadProgress(100);
      setProcessingStep('completed');

      toast.success('¡Archivo procesado exitosamente!');

    } catch (error) {
      console.error('Error processing file:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
      setProcessingStep('error');
      toast.error('Error al procesar archivo');
    }
  };

  const resetProcess = () => {
    setProcessingStep('upload');
    setUploadProgress(0);
    setSelectedFile(null);
    setProcessingResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getTypeColor = (type: string) => {
    return type === 'cashflow' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
  };

  const getTypeName = (type: string) => {
    return type === 'cashflow' ? 'Cash Flow' : 'P&L';
  };

  if (!selectedCompany) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Por favor selecciona una empresa para procesar archivos.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <Card>
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (!configuration) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Configuración no encontrada.
            </p>
          </CardContent>
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
      <div className="container mx-auto py-6 max-w-4xl">
      <div className="mb-8">
        <Button 
          variant="ghost" 
          onClick={() => router.push(`/dashboard/company-admin/configurations/${configId}`)}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          className="mb-4 -ml-3"
        >
          Volver a Configuración
        </Button>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">Procesar Archivo Excel</h1>
          <Badge variant="secondary" className={getTypeColor(configuration.type)}>
            {getTypeName(configuration.type)}
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Usando configuración: {configuration.name}
        </p>
      </div>

      {processingStep === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>Subir Archivo Excel</CardTitle>
            <CardDescription>
              Selecciona un archivo Excel para procesar con la configuración "{configuration.name}"
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8">
              <div className="text-center space-y-4">
                <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="text-lg font-medium mb-2">Arrastra tu archivo Excel aquí</h3>
                  <p className="text-muted-foreground mb-4">o haz clic para buscar</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    leftIcon={<Upload className="h-4 w-4" />}
                    className="whitespace-nowrap"
                  >
                    Elegir Archivo
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Formatos soportados: .xlsx, .xls • Tamaño máximo: 50MB
                </p>
              </div>
            </div>

            {selectedFile && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium">{selectedFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={resetProcess}>
                        Cancelar
                      </Button>
                      <Button 
                        onClick={handleUploadAndProcess}
                        leftIcon={<Upload className="h-4 w-4" />}
                      >
                        Subir y Procesar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}

      {processingStep === 'processing' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Procesando Archivo
            </CardTitle>
            <CardDescription>
              Por favor espera mientras procesamos tu archivo Excel...
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progreso</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                {uploadProgress >= 25 ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <div className="h-4 w-4 border-2 border-gray-300 rounded-full animate-spin" />
                )}
                <span>Subiendo archivo...</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {uploadProgress >= 75 ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : uploadProgress >= 50 ? (
                  <div className="h-4 w-4 border-2 border-gray-300 rounded-full animate-spin" />
                ) : (
                  <div className="h-4 w-4 border-2 border-gray-300 rounded-full" />
                )}
                <span>Procesando con configuración...</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {uploadProgress >= 100 ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <div className="h-4 w-4 border-2 border-gray-300 rounded-full" />
                )}
                <span>Finalizando resultados...</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {processingStep === 'completed' && processingResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Procesamiento Completado
            </CardTitle>
            <CardDescription>
              Tu archivo Excel ha sido procesado exitosamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Información del Archivo</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>Archivo: {processingResult.fileName}</p>
                  <p>Procesado: {new Date(processingResult.processedAt).toLocaleString()}</p>
                  <p>Moneda: {processingResult.currency}</p>
                  <p>Unidades: {processingResult.units}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Resumen de Datos</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>Períodos: {processingResult.preview.periods.length}</p>
                  <p>Filas de Datos: {processingResult.preview.dataRowsCount}</p>
                  <p>Categorías: {processingResult.preview.categoriesCount}</p>
                  {processingResult.periodStart && processingResult.periodEnd && (
                    <p>Período: {new Date(processingResult.periodStart).toLocaleDateString()} - {new Date(processingResult.periodEnd).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <Button variant="outline" onClick={resetProcess}>
                Procesar Otro Archivo
              </Button>
              <Button 
                variant="primary"
                onClick={() => {
                  sessionStorage.setItem('selectedCompanyId', selectedCompany.id);
                  if (configuration.type === 'pnl') {
                    router.push('/dashboard/company-admin/pnl');
                  } else {
                    router.push('/dashboard/company-admin/cashflow');
                  }
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Ver {configuration.type === 'pnl' ? 'P&L' : 'Cash Flow'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {processingStep === 'error' && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Procesamiento Fallido
            </CardTitle>
            <CardDescription>
              Ocurrió un error al procesar tu archivo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700">{error}</p>
              </div>
            )}
            
            <div className="flex justify-center">
              <Button variant="outline" onClick={resetProcess}>
                Intentar de Nuevo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </AppLayout>
  );
}