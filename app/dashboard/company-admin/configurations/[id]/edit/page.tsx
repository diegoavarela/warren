'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Save, Settings, Grid3x3, Database, Layers, Eye } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppLayout } from '@/components/AppLayout';
import { ExcelGridHelper } from '@/components/configuration/ExcelGridHelper';
import { DataRowsEditor } from '@/components/configuration/DataRowsEditor';
import { CategoryBuilder } from '@/components/configuration/CategoryBuilder';
import { ConfigurationPreview } from '@/components/configuration/ConfigurationPreview';
import { CashFlowConfiguration, PLConfiguration } from '@/lib/types/configurations';
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

interface ConfigurationFormData {
  name: string;
  description: string;
  type: 'cashflow' | 'pnl';
  isTemplate: boolean;
  isActive: boolean;
  metadata: {
    currency: string;
    locale: string;
    units: 'normal' | 'thousands' | 'millions';
  };
}

export default function EditConfigurationPage() {
  const router = useRouter();
  const params = useParams();
  // For now, use a mock selected company until we integrate with the context
  const selectedCompany = { id: 'b1dea3ff-cac4-45cc-be78-5488e612c2a8', name: 'VTEX Solutions SRL' };
  const { t } = useTranslation('es');
  const toast = useToast();
  
  const [configuration, setConfiguration] = useState<Configuration | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configData, setConfigData] = useState<CashFlowConfiguration | PLConfiguration | null>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [rawJson, setRawJson] = useState('');
  
  const [formData, setFormData] = useState<ConfigurationFormData>({
    name: '',
    description: '',
    type: 'cashflow',
    isTemplate: false,
    isActive: true,
    metadata: {
      currency: 'USD',
      locale: 'en',
      units: 'normal'
    }
  });

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
      const config = result.data;
      setConfiguration(config);
      
      // Populate form with existing data
      setFormData({
        name: config.name,
        description: config.description || '',
        type: config.type,
        isTemplate: config.isTemplate,
        isActive: config.isActive,
        metadata: {
          currency: config.metadata?.currency || 'USD',
          locale: config.metadata?.locale || 'en',
          units: config.metadata?.units || 'normal'
        }
      });
      
      // Set the configuration data for editing
      setConfigData(config.configJson as CashFlowConfiguration | PLConfiguration);
      setRawJson(JSON.stringify(config.configJson, null, 2));
      
    } catch (error) {
      console.error('Error fetching configuration:', error);
      toast.error(t('config.errors.loadFailed'));
      router.push('/dashboard/company-admin/configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    // Update formData
    if (field.startsWith('metadata.')) {
      const metadataField = field.replace('metadata.', '');
      setFormData(prev => ({
        ...prev,
        metadata: {
          ...prev.metadata,
          [metadataField]: value
        }
      }));
      
      // Also update configData metadata
      if (configData) {
        const updatedConfigData = { ...configData };
        updatedConfigData.metadata = {
          ...updatedConfigData.metadata,
          [metadataField]: value as any
        };
        setConfigData(updatedConfigData);
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
      
      // Also update configData basic fields
      if (configData && (field === 'name' || field === 'description')) {
        const updatedConfigData = { ...configData };
        (updatedConfigData as any)[field] = value;
        setConfigData(updatedConfigData);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (saving) {
      console.log('⚠️ Save already in progress, ignoring duplicate submission');
      return;
    }
    
    if (!selectedCompany?.id) {
      toast.error(t('config.errors.selectCompany'));
      return;
    }

    if (!formData.name.trim()) {
      toast.error(t('config.errors.enterName'));
      return;
    }

    // Get the configuration data
    if (!configData) {
      toast.error(t('config.errors.dataNotLoaded'));
      return;
    }

    const parsedConfigJson = configData;

    try {
      setSaving(true);
      
      console.log('💾 Starting configuration save process...');
      
      // Add required fields to configJson
      parsedConfigJson.name = formData.name;
      parsedConfigJson.version = (configuration?.version || 0) + 1;
      
      const payload = {
        name: formData.name,
        description: formData.description || '',
        type: formData.type,
        isTemplate: formData.isTemplate,
        isActive: formData.isActive,
        configJson: parsedConfigJson,
        metadata: formData.metadata
      };
      
      console.log('Updating configuration with payload:', payload);
      
      const response = await fetch(`/api/configurations/${configId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Configuration update error details:', error);
        const errorMessage = error.message || t('config.errors.updateFailed');
        const validationDetails = error.details ? `\n\n${t('config.errors.validationErrors')}:\n${JSON.stringify(error.details, null, 2)}` : '';
        throw new Error(errorMessage + validationDetails);
      }

      const result = await response.json();
      console.log('✅ Configuration saved successfully:', result);
      
      toast.success(t('config.success.updated'));
      
      // Force refresh of processed data cache after configuration changes
      await fetch(`/api/processed-data/${selectedCompany.id}/invalidate`, { method: 'POST' })
        .catch(err => console.warn('⚠️ Could not invalidate cache:', err));
      
      // Navigate back to the configuration detail page
      router.push(`/dashboard/company-admin/configurations/${configId}`);
      
    } catch (error) {
      console.error('❌ Error updating configuration:', error);
      
      const errorMessage = error instanceof Error ? error.message : t('config.errors.updateFailed');
      
      // Show more user-friendly error messages
      if (errorMessage.includes('Validation failed')) {
        toast.error(`${t('config.errors.validationFailed')}: Please check your configuration format.`);
      } else if (errorMessage.includes('not found')) {
        toast.error(t('config.errors.notFound'));
      } else if (errorMessage.includes('permissions')) {
        toast.error(t('config.errors.insufficientPermissions'));
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setSaving(false);
      console.log('💾 Save process completed');
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
      <AppLayout>
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
      </AppLayout>
    );
  }

  if (!configuration) {
    return (
      <AppLayout>
        <div className="container mx-auto py-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                {t('config.errors.notFound')}
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <ToastContainer 
        toasts={toast.toasts} 
        onClose={toast.removeToast} 
        position="top-right" 
      />
      <div className="container mx-auto py-6 max-w-6xl">
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            onClick={() => router.push(`/dashboard/company-admin/configurations/${configId}`)}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            {t('common.back')}
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{t('config.title.edit')}</h1>
            <p className="text-muted-foreground mt-2">
              {t('config.subtitle.edit')}: {configuration.name}
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              {t('config.tabs.basic')}
            </TabsTrigger>
            <TabsTrigger value="structure" className="flex items-center gap-2">
              <Grid3x3 className="h-4 w-4" />
              {t('config.tabs.structure')}
            </TabsTrigger>
            <TabsTrigger value="datarows" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              {t('config.tabs.datarows')}
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              {t('config.tabs.categories')}
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              {t('config.tabs.preview')}
            </TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit}>
            {/* Basic Information Tab */}
            <TabsContent value="basic" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('config.basic.title')}</CardTitle>
                  <CardDescription>
                    {t('config.basic.description')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">{t('config.form.name')} *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder={t('config.form.namePlaceholder')}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="type">{t('config.form.type')} *</Label>
                      <Select 
                        value={formData.type} 
                        onValueChange={(value: 'cashflow' | 'pnl') => handleInputChange('type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('config.form.typePlaceholder')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cashflow">{t('config.type.cashflow')}</SelectItem>
                          <SelectItem value="pnl">{t('config.type.pnl')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">{t('config.form.description')}</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder={t('config.form.descriptionPlaceholder')}
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isTemplate"
                        checked={formData.isTemplate}
                        onCheckedChange={(checked: boolean) => handleInputChange('isTemplate', checked)}
                      />
                      <Label htmlFor="isTemplate">
                        {t('config.form.isTemplate')}
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isActive"
                        checked={formData.isActive}
                        onCheckedChange={(checked: boolean) => handleInputChange('isActive', checked)}
                      />
                      <Label htmlFor="isActive">
                        {t('config.form.isActive')}
                      </Label>
                    </div>
                  </div>

                  {/* Metadata Section */}
                  <div className="border-t pt-6">
                    <div className="mb-4">
                      <h3 className="text-lg font-medium">{t('config.metadata.title')}</h3>
                      <p className="text-sm text-muted-foreground">
                        {t('config.metadata.description')}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="currency">{t('config.form.currency')}</Label>
                        <Select 
                          value={formData.metadata.currency} 
                          onValueChange={(value) => handleInputChange('metadata.currency', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('config.form.currencyPlaceholder')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD - US Dollar</SelectItem>
                            <SelectItem value="EUR">EUR - Euro</SelectItem>
                            <SelectItem value="GBP">GBP - British Pound</SelectItem>
                            <SelectItem value="ARS">ARS - Argentine Peso</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="locale">{t('config.form.locale')}</Label>
                        <Select 
                          value={formData.metadata.locale} 
                          onValueChange={(value) => handleInputChange('metadata.locale', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('config.form.localePlaceholder')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en">{t('config.locale.english')}</SelectItem>
                            <SelectItem value="es">{t('config.locale.spanish')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="units">{t('config.form.units')}</Label>
                        <Select 
                          value={formData.metadata.units} 
                          onValueChange={(value) => handleInputChange('metadata.units', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('config.form.unitsPlaceholder')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="normal">{t('config.units.normal')}</SelectItem>
                            <SelectItem value="thousands">{t('config.units.thousands')}</SelectItem>
                            <SelectItem value="millions">{t('config.units.millions')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Excel Structure Tab */}
            <TabsContent value="structure" className="space-y-6">
              {configData ? (
                <ExcelGridHelper
                  periodsRow={configData.structure.periodsRow}
                  periodsRange={configData.structure.periodsRange}
                  categoriesColumn={configData.type === 'pnl' ? (configData as PLConfiguration).structure.categoriesColumn : undefined}
                  onPeriodsRowChange={(row) => {
                    const updatedConfig = { ...configData };
                    updatedConfig.structure.periodsRow = row;
                    setConfigData(updatedConfig);
                  }}
                  onPeriodsRangeChange={(range) => {
                    const updatedConfig = { ...configData };
                    updatedConfig.structure.periodsRange = range;
                    setConfigData(updatedConfig);
                  }}
                  onCategoriesColumnChange={configData.type === 'pnl' ? (column) => {
                    const updatedConfig = { ...configData } as PLConfiguration;
                    updatedConfig.structure.categoriesColumn = column;
                    setConfigData(updatedConfig);
                  } : undefined}
                  configurationType={configData.type}
                  configurationId={configId}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>{t('config.loading')}</p>
                </div>
              )}
            </TabsContent>

            {/* Data Rows Tab */}
            <TabsContent value="datarows" className="space-y-6">
              {configData ? (
                <DataRowsEditor
                  configuration={configData}
                  onChange={setConfigData}
                  configurationId={configId}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>{t('config.loading')}</p>
                </div>
              )}
            </TabsContent>

            {/* Categories Tab */}
            <TabsContent value="categories" className="space-y-6">
              {configData ? (
                <CategoryBuilder
                  configuration={configData}
                  onChange={setConfigData}
                  configurationId={configId}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>{t('config.loading')}</p>
                </div>
              )}
            </TabsContent>

            {/* Preview & Test Tab */}
            <TabsContent value="preview" className="space-y-6">
              {configData ? (
                <ConfigurationPreview
                  configuration={configData}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>{t('config.loading')}</p>
                </div>
              )}
            </TabsContent>

            {/* Actions - Fixed at Bottom */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => router.push(`/dashboard/company-admin/configurations/${configId}`)}
              >
                {t('common.cancel')}
              </Button>
              <Button 
                type="submit" 
                disabled={saving}
                leftIcon={!saving ? <Save className="h-4 w-4" /> : undefined}
              >
                {saving ? t('common.saving') : t('config.actions.saveChanges')}
              </Button>
            </div>
          </form>
        </Tabs>
      </div>
    </AppLayout>
  );
}