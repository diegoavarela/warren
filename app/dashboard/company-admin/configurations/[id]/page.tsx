'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Edit, FileSpreadsheet, Settings, Play, Upload, Save, AlertCircle, CheckCircle, RotateCcw, Copy, Check } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/lib/translations';
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
  configJson: any;
  metadata: any;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface ProcessedFile {
  fileId: string;
  filename: string;
  originalFilename: string;
  processedAt: string;
  processingStatus: string;
  currency: string;
  units: string;
}

export default function ConfigurationDetailPage() {
  const router = useRouter();
  const params = useParams();
  // For now, use a mock selected company until we integrate with the context
  const selectedCompany = { id: 'b1dea3ff-cac4-45cc-be78-5488e612c2a8', name: 'VTEX Solutions SRL' };
  const { t } = useTranslation('es');
  const [configuration, setConfiguration] = useState<Configuration | null>(null);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filesLoading, setFilesLoading] = useState(false);
  const [editableJson, setEditableJson] = useState('');
  const [isJsonEdited, setIsJsonEdited] = useState(false);
  const [jsonValidation, setJsonValidation] = useState<{isValid: boolean, error?: string}>({isValid: true});
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const configId = params.id as string;

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
        throw new Error(t('config.errors.fetchFailed'));
      }

      const result = await response.json();
      setConfiguration(result.data);
      setEditableJson(JSON.stringify(result.data.configJson, null, 2));
      
      // Also fetch processed files for this configuration
      fetchProcessedFiles();
    } catch (error) {
      console.error('Error fetching configuration:', error);
      alert(t('config.errors.loadFailed'));
      router.push('/dashboard/company-admin/configurations');
    } finally {
      setLoading(false);
    }
  };

  const validateJson = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      
      // Basic validation for required structure
      if (!parsed.structure) {
        return { isValid: false, error: 'Missing required "structure" property' };
      }
      
      if (!parsed.structure.dataRows) {
        return { isValid: false, error: 'Missing required "structure.dataRows" property' };
      }
      
      if (!parsed.structure.categories) {
        return { isValid: false, error: 'Missing required "structure.categories" property' };
      }
      
      // Type-specific validation
      if (configuration?.type === 'cashflow') {
        if (!parsed.structure.categories.inflows || !parsed.structure.categories.outflows) {
          return { isValid: false, error: 'Cashflow configuration requires "inflows" and "outflows" categories' };
        }
      }
      
      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: `Invalid JSON: ${(error as Error).message}` };
    }
  };

  const handleJsonChange = (value: string) => {
    setEditableJson(value);
    setIsJsonEdited(value !== JSON.stringify(configuration?.configJson, null, 2));
    setJsonValidation(validateJson(value));
  };

  const handleSaveJson = async () => {
    if (!configuration || !jsonValidation.isValid) return;
    
    try {
      setSaving(true);
      
      const updatedConfigJson = JSON.parse(editableJson);
      
      const response = await fetch(`/api/configurations/${configId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: configuration.name,
          description: configuration.description,
          type: configuration.type,
          isTemplate: configuration.isTemplate,
          isActive: configuration.isActive,
          configJson: updatedConfigJson,
          metadata: configuration.metadata
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update configuration');
      }

      const result = await response.json();
      
      // Update local state
      setConfiguration(prev => prev ? {...prev, configJson: updatedConfigJson, version: prev.version + 1} : null);
      setIsJsonEdited(false);
      
      toast.success('Configuración actualizada correctamente');
      
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast.error(error instanceof Error ? error.message : 'Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleResetJson = () => {
    if (configuration) {
      setEditableJson(JSON.stringify(configuration.configJson, null, 2));
      setIsJsonEdited(false);
      setJsonValidation({isValid: true});
    }
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(editableJson);
      setCopied(true);
      toast.success('JSON copiado al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Error al copiar al portapapeles');
    }
  };

  const fetchProcessedFiles = async () => {
    if (!selectedCompany?.id) return;
    
    try {
      setFilesLoading(true);
      const response = await fetch(`/api/files?companyId=${selectedCompany.id}&includeProcessed=true`);
      
      if (!response.ok) {
        throw new Error(t('config.errors.filesFetchFailed'));
      }

      const result = await response.json();
      // Filter files that were processed with this configuration
      const filtered = result.data
        .filter((file: any) => 
          file.processedVersions?.some((pv: any) => pv.configId === configId)
        )
        .map((file: any) => {
          const processedVersion = file.processedVersions.find((pv: any) => pv.configId === configId);
          return {
            fileId: file.fileId,
            filename: file.filename,
            originalFilename: file.originalFilename,
            processedAt: processedVersion.processedAt,
            processingStatus: processedVersion.processingStatus,
            currency: processedVersion.currency,
            units: processedVersion.units,
          };
        });
      
      setProcessedFiles(filtered);
    } catch (error) {
      console.error('Error fetching processed files:', error);
    } finally {
      setFilesLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    return type === 'cashflow' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
  };

  const getTypeName = (type: string) => {
    return type === 'cashflow' ? t('config.type.cashflow') : t('config.type.pnl');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!selectedCompany) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              {t('config.errors.selectCompany')}
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
            <CardContent>
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </CardContent>
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
              {t('config.errors.notFound')}
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
      <div className="container mx-auto py-6">
      <div className="flex items-center gap-4 mb-8">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/dashboard/company-admin/configurations')}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
        >
          {t('config.navigation.backToConfigurations')}
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{configuration.name}</h1>
            <Badge variant="secondary" className={getTypeColor(configuration.type)}>
              {getTypeName(configuration.type)}
            </Badge>
            {configuration.isTemplate && (
              <Badge variant="outline">{t('config.status.template')}</Badge>
            )}
            {!configuration.isActive && (
              <Badge variant="destructive">{t('config.status.inactive')}</Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {t('config.info.version')} {configuration.version} • {t('config.info.created')} {new Date(configuration.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              router.push(`/dashboard/company-admin/configurations/${configId}/validate`);
            }}
            leftIcon={<Settings className="h-4 w-4" />}
          >
            {t('config.actions.test')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              router.push(`/dashboard/company-admin/configurations/${configId}/edit`);
            }}
            leftIcon={<Edit className="h-4 w-4" />}
          >
            {t('common.edit')}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">{t('config.tabs.overview')}</TabsTrigger>
          <TabsTrigger value="structure">{t('config.tabs.structure')}</TabsTrigger>
          <TabsTrigger value="processed-files">{t('config.tabs.processedFiles')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('config.details.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label className="font-medium">{t('config.form.type')}</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {getTypeName(configuration.type)}
                  </p>
                </div>
                <div>
                  <Label className="font-medium">{t('config.form.currency')}</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {configuration.metadata?.currency || t('config.info.notSet')}
                  </p>
                </div>
                <div>
                  <Label className="font-medium">{t('config.form.locale')}</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {configuration.metadata?.locale || t('config.info.notSet')}
                  </p>
                </div>
                <div>
                  <Label className="font-medium">{t('config.form.units')}</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {configuration.metadata?.units || t('config.info.notSet')}
                  </p>
                </div>
              </div>
              
              {configuration.description && (
                <div>
                  <Label className="font-medium">{t('config.form.description')}</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {configuration.description}
                  </p>
                </div>
              )}
              
              <div>
                <Label className="font-medium">{t('config.info.lastUpdated')}</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date(configuration.updatedAt).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="structure" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Estructura del Archivo Excel</CardTitle>
                  <CardDescription>
                    Ver y editar la estructura JSON de la configuración
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {isJsonEdited && (
                    <Badge variant={jsonValidation.isValid ? 'default' : 'destructive'}>
                      {jsonValidation.isValid ? 'Cambios válidos' : 'JSON inválido'}
                    </Badge>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResetJson}
                    disabled={!isJsonEdited}
                    leftIcon={<RotateCcw className="h-4 w-4" />}
                  >
                    Revertir
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveJson}
                    disabled={!isJsonEdited || !jsonValidation.isValid || saving}
                    leftIcon={saving ? undefined : <Save className="h-4 w-4" />}
                  >
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                  </Button>
                </div>
              </div>
              {jsonValidation.error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mt-4">
                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-700">{jsonValidation.error}</p>
                </div>
              )}
              {isJsonEdited && jsonValidation.isValid && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg mt-4">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <p className="text-sm text-green-700">Los cambios JSON son válidos y listos para guardar</p>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="json-editor" className="text-sm font-medium">
                      Configuración JSON (Editable)
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyJson}
                      className="h-6 px-2 text-xs hover:bg-gray-100 transition-colors opacity-70 hover:opacity-100 flex-shrink-0"
                      title="Copiar JSON"
                    >
                      {copied ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3 text-gray-500" />
                      )}
                    </Button>
                  </div>
                  <Textarea
                    id="json-editor"
                    value={editableJson}
                    onChange={(e) => handleJsonChange(e.target.value)}
                    rows={25}
                    className={`font-mono text-sm ${
                      !jsonValidation.isValid ? 'border-red-300 focus:border-red-500' : 
                      isJsonEdited ? 'border-blue-300 focus:border-blue-500' : ''
                    }`}
                    placeholder="Edita la configuración JSON aquí..."
                  />
                </div>
                <div className="text-xs text-gray-500">
                  💡 <strong>Tip:</strong> Puedes editar directamente los números de fila, agregar categorías, o modificar cualquier configuración.
                  Los cambios se validarán automáticamente. Usa el botón de copia para copiar el JSON.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processed-files" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{t('config.files.title')}</CardTitle>
                  <CardDescription>
                    {t('config.files.description')}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filesLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  ))}
                </div>
              ) : processedFiles.length === 0 ? (
                <div className="text-center py-8">
                  <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {t('config.files.noFiles')}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {processedFiles.map((file) => (
                    <div key={file.fileId} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{file.originalFilename}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className={getStatusColor(file.processingStatus)}>
                              {file.processingStatus}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {file.currency} • {file.units}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {t('config.files.processed')} {new Date(file.processedAt).toLocaleString()}
                          </p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          leftIcon={<Play className="h-4 w-4" />}
                        >
                          {t('config.actions.viewResults')}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </AppLayout>
  );
}