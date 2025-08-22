'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Save, FileSpreadsheet, Wand2, Settings } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { useTranslation } from '@/lib/translations';
import { useToast, ToastContainer } from '@/components/ui/Toast';

interface Template {
  key: string;
  name: string;
  description: string;
  locale: string;
  configuration: any;
}

interface ConfigurationFormData {
  name: string;
  description: string;
  type: 'cashflow' | 'pnl';
  isTemplate: boolean;
  metadata: {
    currency: string;
    locale: string;
    units: 'normal' | 'thousands' | 'millions';
  };
}

interface Company {
  id: string;
  name: string;
  taxId?: string;
  industry?: string;
  locale?: string;
  baseCurrency?: string;
  isActive: boolean;
  organizationId: string;
}

export default function NewConfigurationPage() {
  const router = useRouter();
  const { t } = useTranslation('es');
  const toast = useToast();
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyLoading, setCompanyLoading] = useState(true);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [useTemplate, setUseTemplate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<ConfigurationFormData>({
    name: '',
    description: '',
    type: 'cashflow',
    isTemplate: false,
    metadata: {
      currency: 'USD', // Will be updated when company loads
      locale: 'en',
      units: 'normal'
    }
  });

  // Fetch company data on mount
  useEffect(() => {
    fetchCompanyData();
  }, []);

  // Fetch templates when type changes or when company data loads (to get proper locale)
  useEffect(() => {
    if (formData.type && selectedCompany && formData.metadata.locale) {
      fetchTemplates(formData.type);
    }
  }, [formData.type, selectedCompany, formData.metadata.locale]);

  // Update currency when company data loads
  useEffect(() => {
    if (selectedCompany) {
      console.log('💱 Currency inheritance logic triggered for company:', {
        name: selectedCompany.name,
        baseCurrency: selectedCompany.baseCurrency,
        locale: selectedCompany.locale
      });
      
      const inheritedCurrency = selectedCompany.baseCurrency || 'USD';
      // Ensure locale is valid (2-10 characters as per schema)
      let inheritedLocale = selectedCompany.locale || 'en';
      // If it's a long locale like 'es-AR', convert to just 'es' for the schema
      if (inheritedLocale.includes('-')) {
        inheritedLocale = inheritedLocale.split('-')[0];
      }
      if (inheritedLocale.length < 2 || inheritedLocale.length > 10) {
        inheritedLocale = 'en';
      }
      
      console.log('💰 Inheriting currency:', inheritedCurrency, 'and locale:', inheritedLocale);
      
      setFormData(prev => ({
        ...prev,
        metadata: {
          ...prev.metadata,
          currency: inheritedCurrency,
          locale: inheritedLocale
        }
      }));
    }
  }, [selectedCompany]);

  const fetchCompanyData = async () => {
    try {
      setCompanyLoading(true);
      const response = await fetch('/api/companies');
      
      if (!response.ok) {
        throw new Error('Failed to fetch company data');
      }
      
      const result = await response.json();
      const companies = result.data || [];
      
      console.log('🏢 Configuration page: Companies fetched from API:', companies);
      console.log('🔍 Looking for companies with the following details:', companies.map((c: Company) => ({
        id: c.id,
        name: c.name,
        baseCurrency: c.baseCurrency,
        organizationId: c.organizationId
      })));
      
      // Try to get company context from session storage or header context
      const storedCompanyId = sessionStorage.getItem('selectedCompanyId');
      console.log('📦 Company ID from session storage:', storedCompanyId);
      
      let selectedCompany = null;
      
      if (storedCompanyId) {
        // First try to use the company from session storage (user's current context)
        selectedCompany = companies.find((c: Company) => c.id === storedCompanyId);
        console.log('🎯 Found company from session storage:', selectedCompany);
      }
      
      if (!selectedCompany) {
        // Look for VTEX Solutions SRL specifically
        selectedCompany = companies.find((c: Company) => 
          c.name === 'VTEX Solutions SRL' || c.name?.includes('VTEX')
        );
        console.log('🔎 Found VTEX company by name:', selectedCompany);
      }
      
      if (!selectedCompany && companies.length > 0) {
        // Fallback to first company if none found
        selectedCompany = companies[0];
        console.log('⚠️ Using fallback (first company):', selectedCompany);
      }
      
      if (selectedCompany) {
        console.log('✅ Selected company for configuration:', {
          id: selectedCompany.id,
          name: selectedCompany.name,
          baseCurrency: selectedCompany.baseCurrency,
          locale: selectedCompany.locale
        });
        setSelectedCompany(selectedCompany);
      } else {
        console.log('❌ No companies available');
        toast.error('No accessible companies found');
      }
    } catch (error) {
      console.error('Error fetching company data:', error);
      toast.error('Failed to load company information');
    } finally {
      setCompanyLoading(false);
    }
  };

  const fetchTemplates = async (type: 'cashflow' | 'pnl') => {
    try {
      setTemplatesLoading(true);
      console.log('🌐 Fetching templates with locale:', formData.metadata.locale, 'for type:', type);
      const response = await fetch(`/api/configurations/templates?type=${type}&locale=${formData.metadata.locale}`);
      
      if (!response.ok) {
        throw new Error(t('config.errors.templatesFetchFailed'));
      }

      const result = await response.json();
      setTemplates(result.data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error(t('config.errors.templatesLoadFailed'));
    } finally {
      setTemplatesLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    if (field.startsWith('metadata.')) {
      const metadataField = field.replace('metadata.', '');
      setFormData(prev => ({
        ...prev,
        metadata: {
          ...prev.metadata,
          [metadataField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleTemplateSelect = (templateKey: string) => {
    setSelectedTemplate(templateKey);
    if (templateKey) {
      const template = templates.find(t => t.key === templateKey);
      if (template) {
        setFormData(prev => ({
          ...prev,
          name: template.name,
          description: template.description,
          metadata: {
            ...prev.metadata,
            ...template.configuration.metadata
          }
        }));
      }
    }
  };

  // File upload handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      setSelectedFile(file);
      // Auto-populate name if empty
      if (!formData.name) {
        const nameWithoutExt = file.name.replace(/\.(xlsx|xls)$/, '');
        setFormData(prev => ({ ...prev, name: nameWithoutExt }));
      }
    } else {
      toast.error(t('config.upload.invalidFormat'));
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      setSelectedFile(file);
      // Auto-populate name if empty
      if (!formData.name) {
        const nameWithoutExt = file.name.replace(/\.(xlsx|xls)$/, '');
        setFormData(prev => ({ ...prev, name: nameWithoutExt }));
      }
    } else {
      toast.error(t('config.upload.invalidFormat'));
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCompany?.id) {
      toast.error(t('config.errors.selectCompany'));
      return;
    }

    if (!formData.name.trim()) {
      toast.error(t('config.errors.enterName'));
      return;
    }

    try {
      setLoading(true);
      
      // Upload Excel file first if one was selected
      let uploadedFileId = null;
      if (selectedFile) {
        try {
          const uploadSession = Date.now().toString();
          const formData = new FormData();
          formData.append('file', selectedFile);
          formData.append('companyId', selectedCompany.id);
          formData.append('uploadSession', uploadSession);

          const uploadResponse = await fetch('/api/files/upload', {
            method: 'POST',
            body: formData,
          });

          if (!uploadResponse.ok) {
            const uploadError = await uploadResponse.json();
            throw new Error(uploadError.message || 'Failed to upload Excel file');
          }

          const uploadResult = await uploadResponse.json();
          uploadedFileId = uploadResult.data.fileId;
          
          // Store upload session and filename for auto-processing
          sessionStorage.setItem('excel_upload_session', uploadSession);
          sessionStorage.setItem('excel_uploaded_filename', selectedFile.name);
          
          console.log('File uploaded successfully with ID:', uploadedFileId);
          console.log('📊 Stored upload session for auto-processing:', uploadSession);
          console.log('📁 Stored filename for auto-processing:', selectedFile.name);
        } catch (uploadError) {
          console.error('File upload failed:', uploadError);
          toast.error(`File upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
          return;
        }
      }
      
      let configJson;
      
      if (useTemplate && selectedTemplate) {
        // Use selected template configuration
        const template = templates.find(t => t.key === selectedTemplate);
        if (!template) {
          throw new Error(t('config.errors.templateNotFound'));
        }
        configJson = {
          ...template.configuration,
          name: formData.name,
          description: formData.description,
          metadata: formData.metadata
        };
      } else {
        // Create basic configuration structure
        if (formData.type === 'cashflow') {
          configJson = {
            type: 'cashflow',
            metadata: {
              ...formData.metadata,
              // Add default number formatting for consistency
              numberFormat: {
                decimalSeparator: '.',
                thousandsSeparator: ',',
                decimalPlaces: 0
              }
            },
            structure: {
              periodsRow: 8,
              periodsRange: 'B8:M8',
              dataRows: {
                initialBalance: 10,
                finalBalance: 105,
                totalInflows: 95,
                totalOutflows: 94
                // monthlyGeneration and netCashFlow are optional and will be auto-calculated
              },
              categories: {
                inflows: {},
                outflows: {}
              }
            }
          };
        } else {
          configJson = {
            type: 'pnl',
            metadata: {
              ...formData.metadata,
              // Add default number formatting for consistency
              numberFormat: {
                decimalSeparator: '.',
                thousandsSeparator: ',',
                decimalPlaces: 0
              }
            },
            structure: {
              periodsRow: 4,
              periodsRange: 'B4:M4',
              categoriesColumn: 'B',
              dataRows: {
                totalRevenue: 10,
                grossIncome: 24,
                cogs: 12,
                totalOpex: 45,
                totalOutcome: 78,
                grossProfit: 25,
                grossMargin: 26,
                ebitda: 80,
                ebitdaMargin: 82,
                earningsBeforeTaxes: 85,
                netIncome: 90,
                otherIncome: 50,
                otherExpenses: 70,
                taxes: 88
              },
              categories: {
                revenue: {},
                cogs: {},
                opex: {},
                otherIncome: {},
                otherExpenses: {},
                taxes: {}
              }
            }
          };
        }
      }

      // Add missing fields to configJson - these are required by BaseConfigurationSchema
      configJson.name = formData.name;
      configJson.description = formData.description || '';
      configJson.version = 1;
      
      // Ensure locale is valid before sending
      let finalLocale = formData.metadata.locale || 'en';
      // If it's a long locale like 'es-AR', convert to just 'es' for the schema
      if (finalLocale.includes('-')) {
        finalLocale = finalLocale.split('-')[0];
      }
      if (!finalLocale || finalLocale.length < 2 || finalLocale.length > 10) {
        console.warn('⚠️ Invalid locale detected, falling back to default');
        finalLocale = 'en';
      }
      
      // Update both formData and configJson with the valid locale
      formData.metadata.locale = finalLocale;
      configJson.metadata.locale = finalLocale;

      const payload = {
        companyId: selectedCompany.id,
        name: formData.name,
        description: formData.description || '',
        type: formData.type,
        isTemplate: formData.isTemplate,
        configJson,
        metadata: formData.metadata
        // Note: associatedFileId is not part of CompanyConfigurationCreateSchema
        // File association will be handled by the service layer after configuration creation
      };
      
      console.log('Creating configuration with payload:', payload);
      console.log('🔍 Payload metadata locale:', payload.metadata.locale);
      console.log('🔍 ConfigJson metadata locale:', payload.configJson.metadata.locale);
      
      const response = await fetch('/api/configurations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Configuration creation error details:', error);
        const errorMessage = error.message || t('config.errors.createFailed');
        const validationDetails = error.details ? `\n\n${t('config.errors.validationErrors')}:\n${JSON.stringify(error.details, null, 2)}` : '';
        throw new Error(errorMessage + validationDetails);
      }

      const result = await response.json();
      
      // Show success message based on whether file was uploaded
      if (uploadedFileId) {
        toast.success(t('config.success.createdWithFile') || 'Configuration created successfully with Excel file!');
      } else {
        toast.success(t('config.success.created'));
      }
      
      // Navigate directly to edit/mapping page when file was uploaded
      if (uploadedFileId) {
        router.push(`/dashboard/company-admin/configurations/${result.data.id}/edit`);
      } else {
        // Navigate to detail page if no file was uploaded
        router.push(`/dashboard/company-admin/configurations/${result.data.id}`);
      }
      
    } catch (error) {
      console.error('Error creating configuration:', error);
      toast.error(error instanceof Error ? error.message : t('config.errors.createFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (companyLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              {t('common.loading')} company information...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!selectedCompany) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              {t('config.errors.selectCompanyToCreate')}
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
      <div className="flex items-center gap-4 mb-8">
        <Button 
          variant="ghost" 
          onClick={() => router.back()}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
        >
          {t('common.back')}
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{t('config.new.title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('config.new.description').replace('{companyName}', selectedCompany.name)}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Configuration Setup */}
        <Card>
          <CardHeader>
            <CardTitle>{t('config.new.title')}</CardTitle>
            <CardDescription>
              {t('config.form.basicInformationDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Excel File Upload Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-lg">{t('config.upload.title')}</h3>
              </div>
              <div 
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {selectedFile ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <FileSpreadsheet className="h-8 w-8 text-green-600" />
                      <div className="text-left">
                        <p className="font-medium text-green-800">{selectedFile.name}</p>
                        <p className="text-sm text-green-600">
                          {t('config.upload.fileSelected')} • {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={removeFile}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        {t('config.upload.remove')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">{t('config.upload.dragDrop')}</p>
                    <p className="text-sm text-gray-500 mb-4">{t('config.upload.supportedFormats')}</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                    />
                    <Button type="button" variant="outline" onClick={triggerFileSelect}>
                      {t('config.upload.selectFile')}
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Divider */}
            <hr className="my-8" />

            {/* Basic Information Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-3">
                <Settings className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-lg">{t('config.form.basicInformation')}</h3>
              </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">{t('config.form.configurationName')} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder={t('config.form.configurationNamePlaceholder')}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="type">{t('config.form.configurationType')} *</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value: 'cashflow' | 'pnl') => handleInputChange('type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('config.form.selectType')} />
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

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isTemplate"
                checked={formData.isTemplate}
                onCheckedChange={(checked: boolean) => handleInputChange('isTemplate', checked)}
              />
              <Label htmlFor="isTemplate">
                {t('config.form.makeTemplate')}
              </Label>
            </div>
            </div>

            {/* Divider */}
            <hr className="my-8" />

            {/* Template Selection Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-3">
                <Wand2 className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-lg">{t('config.template.title')}</h3>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="useTemplate"
                  checked={useTemplate}
                  onCheckedChange={(checked) => setUseTemplate(checked as boolean)}
                />
                <Label htmlFor="useTemplate">
                  {t('config.template.useStandard')}
                </Label>
              </div>

              {useTemplate && (
                <div className="space-y-2">
                  <Label htmlFor="template">{t('config.template.selectTemplate')}</Label>
                  <Select 
                    value={selectedTemplate} 
                    onValueChange={handleTemplateSelect}
                    disabled={templatesLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={templatesLoading ? t('config.template.loading') : t('config.template.choose')} />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.key} value={template.key}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedTemplate && (
                    <p className="text-sm text-muted-foreground">
                      {templates.find(t => t.key === selectedTemplate)?.description}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Divider */}
            <hr className="my-8" />

            {/* Metadata Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-3">
                <Settings className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-lg">{t('config.metadata.title')}</h3>
              </div>
              <div className="grid grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="currency">{t('config.form.currency')}</Label>
                <Select 
                  value={formData.metadata.currency} 
                  onValueChange={(value) => handleInputChange('metadata.currency', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('config.form.selectCurrency')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    <SelectItem value="MXN">MXN - Mexican Peso</SelectItem>
                    <SelectItem value="ARS">ARS - Argentine Peso</SelectItem>
                  </SelectContent>
                </Select>
                {selectedCompany?.baseCurrency && formData.metadata.currency === selectedCompany.baseCurrency && (
                  <p className="text-xs text-blue-600 flex items-center gap-1">
                    <span>💰</span>
                    {t('config.form.currencyInheritedFromCompany')} {selectedCompany.name} ({selectedCompany.baseCurrency})
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="locale">{t('config.form.locale')}</Label>
                <Select 
                  value={formData.metadata.locale} 
                  onValueChange={(value) => handleInputChange('metadata.locale', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('config.form.selectLocale')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
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
                    <SelectValue placeholder={t('config.form.selectUnits')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="thousands">Thousands</SelectItem>
                    <SelectItem value="millions">Millions</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => router.back()}
          >
            {t('common.cancel')}
          </Button>
          <Button 
            type="submit" 
            disabled={loading}
            leftIcon={!loading ? <Save className="h-4 w-4" /> : undefined}
          >
            {loading ? t('config.actions.creating') : t('config.actions.createConfiguration')}
          </Button>
        </div>
      </form>
      </div>
    </AppLayout>
  );
}