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
import { ArrowLeft, Save, Settings, Database, Layers, Calendar, Code, Copy, Download, Eye, HelpCircle, ChevronDown, ChevronRight, Code2, Check, X, Edit } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppLayout } from '@/components/AppLayout';
import { DataRowsEditor } from '@/components/configuration/DataRowsEditor';
import { CategoryBuilder } from '@/components/configuration/CategoryBuilder';
import { ConfigurationPreview } from '@/components/configuration/ConfigurationPreview';
import { PeriodMappingEditor } from '@/components/configuration/PeriodMappingEditor';
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
  
  // JSON Editor State
  const [isEditingJson, setIsEditingJson] = useState(false);
  const [editedJsonText, setEditedJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [jsonCopied, setJsonCopied] = useState(false);
  const [showJsonTree, setShowJsonTree] = useState(false);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [showHelperOverlay, setShowHelperOverlay] = useState(false);
  
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

  // SINGLE SOURCE OF TRUTH: Sync JSON editor when configData changes
  useEffect(() => {
    if (configData) {
      console.log('🔄 [SINGLE SOURCE] Syncing JSON editor with configData:', configData);
      console.log('🔍 [SINGLE SOURCE] Period mapping in configData:', configData.structure?.periodMapping);
      const formattedJson = JSON.stringify(configData, null, 2);
      setEditedJsonText(formattedJson);
      setRawJson(formattedJson);
      setJsonError(null); // Clear any previous errors when syncing
    }
  }, [configData]);

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
      
      // SINGLE SOURCE OF TRUTH: Set the configuration data for editing
      console.log('📁 [SINGLE SOURCE] Loaded configuration from API:', config.configJson);
      console.log('🔍 [SINGLE SOURCE] Period mappings in loaded config:', config.configJson?.structure?.periodMapping);
      console.log('🔍 [SINGLE SOURCE] Full loaded structure:', config.configJson?.structure);
      
      // Ensure the loaded config becomes the single source of truth
      const loadedConfig = config.configJson as CashFlowConfiguration | PLConfiguration;
      setConfigData(loadedConfig);
      const formattedJson = JSON.stringify(config.configJson, null, 2);
      setRawJson(formattedJson);
      setEditedJsonText(formattedJson);
      
    } catch (error) {
      console.error('Error fetching configuration:', error);
      toast.error(t('config.errors.loadFailed'));
      router.push('/dashboard/company-admin/configurations');
    } finally {
      setLoading(false);
    }
  };

  // JSON Editor Functions - SINGLE SOURCE OF TRUTH
  const handleJsonChange = (value: string) => {
    setEditedJsonText(value);
    setJsonError(null);
    
    try {
      const parsed = JSON.parse(value);
      setJsonError(null);
      // ALWAYS update configData when JSON is valid - it's the single source of truth
      setConfigData(parsed);
      setRawJson(value);
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : 'Invalid JSON');
    }
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(editedJsonText);
      setJsonCopied(true);
      setTimeout(() => setJsonCopied(false), 2000);
      toast.success('JSON copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy JSON');
    }
  };

  const handleSaveJsonChanges = () => {
    if (jsonError) {
      toast.error('Cannot save invalid JSON');
      return;
    }

    try {
      const parsed = JSON.parse(editedJsonText);
      setConfigData(parsed);
      setRawJson(editedJsonText);
      setIsEditingJson(false);
      toast.success('JSON changes applied');
    } catch (error) {
      toast.error('Failed to parse JSON');
    }
  };

  const toggleNodeCollapse = (path: string) => {
    const newCollapsed = new Set(collapsedNodes);
    if (newCollapsed.has(path)) {
      newCollapsed.delete(path);
    } else {
      newCollapsed.add(path);
    }
    setCollapsedNodes(newCollapsed);
  };

  const renderJsonTreeNode = (obj: any, path: string = '', level: number = 0): React.ReactNode => {
    const indent = level * 20;
    
    if (obj === null) return <span className="text-gray-500">null</span>;
    if (typeof obj === 'string') return <span className="text-green-600">"{obj}"</span>;
    if (typeof obj === 'number') return <span className="text-blue-600">{obj}</span>;
    if (typeof obj === 'boolean') return <span className="text-purple-600">{obj.toString()}</span>;
    
    if (Array.isArray(obj)) {
      const isCollapsed = collapsedNodes.has(path);
      return (
        <div>
          <div 
            className="flex items-center cursor-pointer hover:bg-gray-100 py-1 px-2 rounded"
            onClick={() => toggleNodeCollapse(path)}
            style={{ marginLeft: `${indent}px` }}
          >
            <span className="mr-2 text-gray-400 text-sm">
              {isCollapsed ? '▶' : '▼'}
            </span>
            <span className="text-gray-800 font-mono">[{obj.length} items]</span>
          </div>
          {!isCollapsed && (
            <div>
              {obj.map((item, index) => (
                <div key={index} style={{ marginLeft: `${indent + 20}px` }}>
                  <span className="text-gray-500 mr-2">{index}:</span>
                  {renderJsonTreeNode(item, `${path}[${index}]`, level + 1)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    
    if (typeof obj === 'object') {
      const keys = Object.keys(obj);
      const isCollapsed = collapsedNodes.has(path);
      return (
        <div>
          <div 
            className="flex items-center cursor-pointer hover:bg-gray-100 py-1 px-2 rounded"
            onClick={() => toggleNodeCollapse(path)}
            style={{ marginLeft: `${indent}px` }}
          >
            <span className="mr-2 text-gray-400 text-sm">
              {isCollapsed ? '▶' : '▼'}
            </span>
            <span className="text-gray-800 font-mono">{`{${keys.length} keys}`}</span>
          </div>
          {!isCollapsed && (
            <div>
              {keys.map((key) => (
                <div key={key} style={{ marginLeft: `${indent + 20}px` }}>
                  <span className="text-red-600 font-mono mr-2">"{key}":</span>
                  {renderJsonTreeNode(obj[key], `${path}.${key}`, level + 1)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    
    return <span>{String(obj)}</span>;
  };

  const insertJsonSnippet = (snippet: string) => {
    const textarea = document.querySelector('textarea[data-json-editor]') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end);
    const newText = before + snippet + after;

    setEditedJsonText(newText);
    
    // Set cursor position after inserted text
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + snippet.length, start + snippet.length);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const value = target.value;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      
      setEditedJsonText(newValue);
      
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    } else if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      handleSaveJsonChanges();
    } else if (e.ctrlKey && e.key === 'f') {
      e.preventDefault();
      try {
        const parsed = JSON.parse(editedJsonText);
        const formatted = JSON.stringify(parsed, null, 2);
        setEditedJsonText(formatted);
      } catch (error) {
        // Invalid JSON, can't format
      }
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
      
      // SINGLE SOURCE OF TRUTH: Also update configData metadata
      if (configData) {
        const updatedConfigData = JSON.parse(JSON.stringify(configData));
        updatedConfigData.metadata = {
          ...updatedConfigData.metadata,
          [metadataField]: value as any
        };
        console.log('📝 [SINGLE SOURCE] Updated configData metadata:', updatedConfigData.metadata);
        setConfigData(updatedConfigData);
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
      
      // SINGLE SOURCE OF TRUTH: Also update configData basic fields
      if (configData && (field === 'name' || field === 'description')) {
        const updatedConfigData = JSON.parse(JSON.stringify(configData));
        (updatedConfigData as any)[field] = value;
        console.log(`📝 [SINGLE SOURCE] Updated configData ${field}:`, value);
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

    // SINGLE SOURCE OF TRUTH: Get the configuration data from configData
    if (!configData) {
      toast.error(t('config.errors.dataNotLoaded'));
      return;
    }

    try {
      setSaving(true);
      
      console.log('💾 [SINGLE SOURCE] Starting configuration save process...');
      console.log('💾 [SINGLE SOURCE] Using configData as single source:', configData);
      console.log('💾 [SINGLE SOURCE] Period mappings to save:', configData.structure?.periodMapping);
      
      // Use configData directly (it's already up to date from all editors)
      const finalConfigJson = {
        ...configData,
        name: formData.name, // Ensure form name takes precedence
        version: (configuration?.version || 0) + 1, // Increment version
      };
      
      // Debug: Check if period mapping is included
      console.log('🔍 [SINGLE SOURCE] Period mappings in final config:', finalConfigJson.structure?.periodMapping);
      console.log('🔍 [SINGLE SOURCE] Full final structure:', finalConfigJson.structure);
      
      const payload = {
        name: formData.name,
        description: formData.description || '',
        type: formData.type,
        isTemplate: formData.isTemplate,
        isActive: formData.isActive,
        configJson: finalConfigJson,
        metadata: formData.metadata,
        lastModifiedMethod: 'wizard'
      };
      
      console.log('💾 [SINGLE SOURCE] Final payload:', payload);
      console.log('🔍 [SINGLE SOURCE] Payload period mappings:', payload.configJson.structure?.periodMapping);
      
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
      
      // Navigate back to the configurations list
      router.push('/dashboard/company-admin/configurations');
      
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
            onClick={() => router.push('/dashboard/company-admin/configurations')}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            {t('config.navigation.backToConfigurations')}
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{t('config.title.edit')}</h1>
            <p className="text-muted-foreground mt-2">
              {t('config.subtitle.edit')}: {configuration.name}
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              {t('config.tabs.basic')}
            </TabsTrigger>
            <TabsTrigger value="periods" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t('config.tabs.periods')}
            </TabsTrigger>
            <TabsTrigger value="datarows" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              {t('config.tabs.datarows')}
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              {t('config.tabs.categories')}
            </TabsTrigger>
            <TabsTrigger value="json" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              JSON
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
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

            {/* Period Mapping Tab */}
            <TabsContent value="periods" className="space-y-6">
              {configData ? (
                <PeriodMappingEditor
                  periodsRange={configData.structure.periodsRange}
                  currentMapping={configData.structure.periodMapping || []}
                  onChange={(mapping) => {
                    console.log('📝 [SINGLE SOURCE] Received period mapping onChange:', mapping);
                    if (configData) {
                      // Deep clone to avoid mutation issues
                      const updatedConfig = JSON.parse(JSON.stringify(configData));
                      updatedConfig.structure.periodMapping = mapping;
                      console.log('📝 [SINGLE SOURCE] Updated config with period mapping:', updatedConfig.structure.periodMapping);
                      console.log('📝 [SINGLE SOURCE] Full updated config:', updatedConfig);
                      setConfigData(updatedConfig);
                    }
                  }}
                  onValidate={(isValid, errors) => {
                    if (!isValid) {
                      console.warn('Period mapping validation failed:', errors);
                    }
                  }}
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

            {/* JSON Editor Tab */}
            <TabsContent value="json" className="space-y-6">
              <div className="bg-white rounded-lg shadow-xl w-full h-[calc(95vh-120px)] overflow-hidden border">
                <div className="flex items-center justify-between p-4 border-b">
                  {/* Left side - Title */}
                  <div className="flex items-center gap-3">
                    <Code2 className="h-6 w-6 text-blue-600" />
                    <h2 className="text-xl font-semibold">Edit Configuration JSON</h2>
                  </div>
                  
                  {/* Center - View Toggle */}
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setShowJsonTree(false)}
                      className={`px-4 py-2 text-sm rounded-md transition-colors ${
                        !showJsonTree 
                          ? 'bg-white text-blue-600 shadow-sm' 
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Raw JSON
                    </button>
                    <button
                      onClick={() => setShowJsonTree(true)}
                      className={`px-4 py-2 text-sm rounded-md transition-colors ${
                        showJsonTree 
                          ? 'bg-white text-blue-600 shadow-sm' 
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Tree View
                    </button>
                  </div>
                  
                  {/* Right side - Copy Button */}
                  <div className="flex items-center">
                    <button
                      onClick={handleCopyJson}
                      className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg border transition-colors ${
                        jsonCopied 
                          ? 'bg-green-50 border-green-200 text-green-700' 
                          : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                      }`}
                      title="Copy JSON to clipboard"
                    >
                      {jsonCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      <span className="font-mono text-xs">
                        {jsonCopied ? 'Copied!' : 'Copy JSON'}
                      </span>
                    </button>
                  </div>
                </div>
                <div className="p-4 overflow-hidden h-[calc(95vh-200px)] flex flex-col">
                  {!showJsonTree ? (
                    // Raw JSON Editor View
                    <div className="flex-1 relative">
                      <div className="h-full relative">
                        <textarea
                          data-json-editor
                          value={editedJsonText}
                          onChange={(e) => handleJsonChange(e.target.value)}
                          onKeyDown={handleKeyDown}
                          className={`w-full h-full p-4 text-sm font-mono border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            jsonError ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50'
                          }`}
                          placeholder="Enter valid JSON configuration..."
                          spellCheck={false}
                          style={{
                            lineHeight: '1.5',
                            tabSize: 2,
                            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace'
                          }}
                        />
                        
                        {/* Floating Helper Button */}
                        <button
                          onClick={() => setShowHelperOverlay(!showHelperOverlay)}
                          className="absolute bottom-4 right-4 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-10"
                          title="JSON Structure Helper"
                        >
                          <Code2 className="h-5 w-5" />
                        </button>

                        {/* Status Indicators */}
                        <div className="absolute top-4 right-4 space-y-2">
                          {jsonError && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-2 max-w-xs">
                              <div className="flex items-center gap-2">
                                <X className="h-4 w-4 text-red-500" />
                                <span className="text-xs font-medium text-red-800">JSON Error</span>
                              </div>
                              <p className="text-xs text-red-700 mt-1 font-mono truncate">{jsonError}</p>
                            </div>
                          )}

                          {!jsonError && editedJsonText && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                              <div className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-green-500" />
                                <span className="text-xs font-medium text-green-800">Valid JSON</span>
                                <span className="text-xs text-green-600">
                                  {editedJsonText.split('\n').length} lines
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Tree View
                    <div className="flex-1 overflow-auto">
                      <div className="bg-gray-50 border rounded-lg p-4 h-full">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-medium text-gray-800">JSON Structure Tree</h3>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setCollapsedNodes(new Set())}
                              className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                            >
                              Expand All
                            </button>
                            <button
                              onClick={() => {
                                // Collapse all first-level objects
                                try {
                                  const parsed = JSON.parse(editedJsonText);
                                  const keys = Object.keys(parsed);
                                  setCollapsedNodes(new Set(keys.map(key => `.${key}`)));
                                } catch (error) {
                                  // Handle invalid JSON
                                }
                              }}
                              className="text-xs bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700"
                            >
                              Collapse All
                            </button>
                          </div>
                        </div>
                        
                        <div className="text-sm overflow-auto h-[calc(95vh-300px)]">
                          {(() => {
                            try {
                              const parsed = JSON.parse(editedJsonText);
                              return renderJsonTreeNode(parsed, '', 0);
                            } catch (error) {
                              return (
                                <div className="text-red-600 bg-red-50 p-3 rounded border">
                                  <div className="flex items-center gap-2 mb-2">
                                    <X className="h-4 w-4" />
                                    <span className="font-medium">Invalid JSON</span>
                                  </div>
                                  <p className="text-sm">{error instanceof Error ? error.message : 'Cannot parse JSON'}</p>
                                  <p className="text-sm mt-2 text-gray-600">Switch to Raw JSON view to fix syntax errors.</p>
                                </div>
                              );
                            }
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center p-4 border-t bg-gray-50">
                  <div className="text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Edit className="h-4 w-4 text-blue-600" />
                      <span><strong>Editing mode:</strong> Make changes to the JSON configuration. Changes will be marked as manually modified.</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    <div className="flex items-center gap-4">
                      <span><kbd className="px-1 py-0.5 bg-gray-200 rounded">Tab</kbd> Indent</span>
                      <span><kbd className="px-1 py-0.5 bg-gray-200 rounded">Ctrl+S</kbd> Save</span>
                      <span><kbd className="px-1 py-0.5 bg-gray-200 rounded">Ctrl+F</kbd> Format</span>
                    </div>
                  </div>
                </div>
              </div>
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
                onClick={() => router.push('/dashboard/company-admin/configurations')}
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

        {/* JSON Helper Overlay */}
        {showHelperOverlay && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="text-lg font-semibold">JSON Structure Helper</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHelperOverlay(false)}
                  className="h-8 w-8 p-0"
                >
                  ×
                </Button>
              </div>
              
              <div className="p-4 overflow-y-auto max-h-[calc(80vh-120px)]">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Common Patterns</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => insertJsonSnippet('"newCategory": {\n  "row": 10,\n  "required": true\n}')}
                      >
                        Add Category
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => insertJsonSnippet('"newSubcategory": {\n  "row": 11,\n  "required": false\n}')}
                      >
                        Add Subcategory
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => insertJsonSnippet('"periodsRange": "B8:M8"')}
                      >
                        Period Range
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => insertJsonSnippet('"periodsRow": 8')}
                      >
                        Period Row
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => insertJsonSnippet('{\n  "year": 2024,\n  "month": 8,\n  "period": "Aug 2024"\n}')}
                      >
                        {t('config.tabs.periods')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => insertJsonSnippet('{\n  "currency": "USD",\n  "locale": "en",\n  "units": "normal"\n}')}
                      >
                        Metadata
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Data Row Examples</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => insertJsonSnippet('"totalRevenue": 15')}
                      >
                        Total Revenue
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => insertJsonSnippet('"grossIncome": 16')}
                      >
                        Gross Income
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => insertJsonSnippet('"initialBalance": 5')}
                      >
                        Initial Balance
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => insertJsonSnippet('"finalBalance": 35')}
                      >
                        Final Balance
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Shortcuts</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><kbd className="bg-gray-100 px-1 rounded">Tab</kbd> - Insert 2 spaces</p>
                      <p><kbd className="bg-gray-100 px-1 rounded">Ctrl+A</kbd> - Select all</p>
                      <p><kbd className="bg-gray-100 px-1 rounded">Ctrl+Z</kbd> - Undo</p>
                      <p><kbd className="bg-gray-100 px-1 rounded">Ctrl+F</kbd> - Find</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Validation Tips</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>• All strings must be in double quotes</p>
                      <p>• No trailing commas allowed</p>
                      <p>• Row numbers must be positive integers</p>
                      <p>• Period ranges must follow Excel format (e.g., "B8:M8")</p>
                      <p>• Required fields: type, name, version, metadata, structure</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}