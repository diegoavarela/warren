'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Eye, 
  Download, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  FileJson, 
  FileSpreadsheet,
  Copy,
  Settings
} from 'lucide-react';
import { CashFlowConfiguration, PLConfiguration } from '@/lib/types/configurations';
import { useTranslation } from '@/lib/translations';

interface ConfigurationPreviewProps {
  configuration: CashFlowConfiguration | PLConfiguration;
  onExport?: (config: CashFlowConfiguration | PLConfiguration) => void;
  onTest?: (config: CashFlowConfiguration | PLConfiguration) => void;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    totalFields: number;
    mappedFields: number;
    requiredFields: number;
    categoriesCount: number;
  };
}

export function ConfigurationPreview({ 
  configuration, 
  onExport, 
  onTest 
}: ConfigurationPreviewProps) {
  const [activeTab, setActiveTab] = useState('json');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [testingStatus, setTestingStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const { t } = useTranslation('es');

  // Validate configuration
  const validateConfiguration = (): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!configuration.name?.trim()) {
      errors.push(t('config.validation.nameRequired'));
    }

    if (!configuration.structure.periodsRow || configuration.structure.periodsRow < 1) {
      errors.push(t('config.validation.periodsRowRequired'));
    }

    if (!configuration.structure.periodsRange?.match(/^[A-Z]+\d+:[A-Z]+\d+$/)) {
      errors.push(t('config.validation.periodsRangeFormat'));
    }

    // Type-specific validation
    let mappedFieldsCount = 0;
    let totalFieldsCount = 0;
    let requiredFieldsCount = 0;

    if (configuration.type === 'cashflow') {
      const cashflowConfig = configuration as CashFlowConfiguration;
      const dataRows = cashflowConfig.structure.dataRows;
      
      const requiredRows = ['initialBalance', 'finalBalance', 'totalInflows', 'totalOutflows', 'monthlyGeneration'];
      requiredFieldsCount = requiredRows.length;
      totalFieldsCount = requiredRows.length;
      
      requiredRows.forEach(row => {
        const value = dataRows[row as keyof typeof dataRows];
        if (!value || value < 1) {
          errors.push(`${row} row is required and must be a valid row number`);
        } else {
          mappedFieldsCount++;
        }
      });

      // Check for duplicate rows
      const usedRows = requiredRows.map(row => dataRows[row as keyof typeof dataRows]).filter(Boolean);
      if (new Set(usedRows).size !== usedRows.length) {
        warnings.push('Some data rows are mapped to the same Excel row');
      }

    } else {
      const plConfig = configuration as PLConfiguration;
      
      if (!plConfig.structure.categoriesColumn?.match(/^[A-Z]+$/)) {
        errors.push(t('config.validation.categoriesColumnFormat'));
      }

      // Count P&L fields
      const dataRows = plConfig.structure.dataRows;
      const allFields = Object.keys(dataRows);
      totalFieldsCount = allFields.length;
      
      const requiredFields = ['totalRevenue', 'cogs', 'totalOpex', 'netIncome'];
      requiredFieldsCount = requiredFields.length;
      
      requiredFields.forEach(field => {
        const value = dataRows[field as keyof typeof dataRows];
        if (!value || value < 1) {
          errors.push(`${field} row is required and must be a valid row number`);
        } else {
          mappedFieldsCount++;
        }
      });

      allFields.forEach(field => {
        const value = dataRows[field as keyof typeof dataRows];
        if (value && value > 0) {
          mappedFieldsCount++;
        }
      });
    }

    // Count categories
    let categoriesCount = 0;
    Object.values(configuration.structure.categories).forEach((section: any) => {
      categoriesCount += Object.keys(section).length;
      Object.values(section).forEach((category: any) => {
        if (category.subcategories) {
          categoriesCount += Object.keys(category.subcategories).length;
        }
      });
    });

    // Additional warnings
    if (categoriesCount === 0) {
      warnings.push(t('config.validation.noCategoriesWarning'));
    }

    if (mappedFieldsCount < totalFieldsCount * 0.5) {
      warnings.push(t('config.validation.lowMappingWarning'));
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      summary: {
        totalFields: totalFieldsCount,
        mappedFields: mappedFieldsCount,
        requiredFields: requiredFieldsCount,
        categoriesCount
      }
    };
  };

  // Run validation
  const runValidation = () => {
    const result = validateConfiguration();
    setValidationResult(result);
    return result;
  };

  // Copy JSON to clipboard
  const copyToClipboard = () => {
    const jsonString = JSON.stringify(configuration, null, 2);
    navigator.clipboard.writeText(jsonString);
  };

  // Export configuration
  const exportConfiguration = () => {
    const jsonString = JSON.stringify(configuration, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${configuration.name || 'configuration'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Test configuration (mock)
  const testConfiguration = async () => {
    setTestingStatus('testing');
    
    // Mock test - in real app would call API
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const validation = runValidation();
    if (validation.isValid) {
      setTestingStatus('success');
    } else {
      setTestingStatus('error');
    }
  };

  // Generate configuration summary
  const getConfigurationSummary = () => {
    const validation = validationResult || runValidation();
    
    return [
      {
        label: t('config.summary.configurationType'),
        value: configuration.type === 'cashflow' ? t('config.type.cashflow') : t('config.type.pnl')
      },
      {
        label: t('config.summary.periodsRow'),
        value: `${t('config.form.row')} ${configuration.structure.periodsRow}`
      },
      {
        label: t('config.summary.periodsRange'),
        value: configuration.structure.periodsRange
      },
      ...(configuration.type === 'pnl' ? [{
        label: t('config.summary.categoriesColumn'),
        value: `${t('config.summary.column')} ${(configuration as PLConfiguration).structure.categoriesColumn}`
      }] : []),
      {
        label: t('config.form.currency'),
        value: configuration.metadata.currency
      },
      {
        label: t('config.form.units'),
        value: configuration.metadata.units
      },
      {
        label: t('config.form.locale'),
        value: configuration.metadata.locale
      },
      {
        label: t('config.summary.categories'),
        value: `${validation.summary.categoriesCount} ${t('config.summary.defined')}`
      },
      {
        label: t('config.summary.fieldMapping'),
        value: `${validation.summary.mappedFields}/${validation.summary.totalFields} ${t('config.summary.mapped')}`
      }
    ];
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              <CardTitle>{t('config.preview.title')}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                type="button"
                variant="outline" 
                onClick={runValidation}
                leftIcon={<Settings className="h-4 w-4" />}
              >
                {t('config.actions.validate')}
              </Button>
              <Button 
                type="button"
                variant="outline" 
                onClick={testConfiguration} 
                disabled={testingStatus === 'testing'}
                leftIcon={<FileSpreadsheet className="h-4 w-4" />}
              >
                {testingStatus === 'testing' ? t('config.actions.testing') : t('config.actions.testConfiguration')}
              </Button>
            </div>
          </div>
          <CardDescription>
            {t('config.preview.description')}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Validation Results */}
      {validationResult && (
        <Card className={`${validationResult.isValid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${validationResult.isValid ? 'text-green-800' : 'text-red-800'}`}>
              {validationResult.isValid ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              {t('config.validation.title')} {validationResult.isValid ? t('config.validation.passed') : t('config.validation.failed')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Errors */}
            {validationResult.errors.length > 0 && (
              <div className="mb-4">
                <Label className="font-medium text-red-800">{t('config.validation.errors')}:</Label>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  {validationResult.errors.map((error, index) => (
                    <li key={index} className="text-red-700 text-sm">{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warnings */}
            {validationResult.warnings.length > 0 && (
              <div className="mb-4">
                <Label className="font-medium text-orange-800">{t('config.validation.warnings')}:</Label>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  {validationResult.warnings.map((warning, index) => (
                    <li key={index} className="text-orange-700 text-sm">{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <Label className="font-medium">{t('config.summary.totalFields')}</Label>
                <p className="text-muted-foreground">{validationResult.summary.totalFields}</p>
              </div>
              <div>
                <Label className="font-medium">{t('config.summary.mappedFields')}</Label>
                <p className="text-muted-foreground">{validationResult.summary.mappedFields}</p>
              </div>
              <div>
                <Label className="font-medium">{t('config.summary.requiredFields')}</Label>
                <p className="text-muted-foreground">{validationResult.summary.requiredFields}</p>
              </div>
              <div>
                <Label className="font-medium">{t('config.summary.categories')}</Label>
                <p className="text-muted-foreground">{validationResult.summary.categoriesCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Status */}
      {testingStatus !== 'idle' && (
        <Card className={`
          ${testingStatus === 'success' ? 'border-green-200 bg-green-50' : ''}
          ${testingStatus === 'error' ? 'border-red-200 bg-red-50' : ''}
          ${testingStatus === 'testing' ? 'border-blue-200 bg-blue-50' : ''}
        `}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              {testingStatus === 'testing' && <div className="animate-spin h-4 w-4 border-2 border-blue-600 rounded-full border-t-transparent" />}
              {testingStatus === 'success' && <CheckCircle className="h-4 w-4 text-green-600" />}
              {testingStatus === 'error' && <AlertCircle className="h-4 w-4 text-red-600" />}
              <span className="font-medium">
                {testingStatus === 'testing' && t('config.test.testing')}
                {testingStatus === 'success' && t('config.test.passed')}
                {testingStatus === 'error' && t('config.test.failed')}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="json">{t('config.tabs.json')}</TabsTrigger>
          <TabsTrigger value="summary">{t('config.tabs.summary')}</TabsTrigger>
          <TabsTrigger value="export">{t('config.tabs.export')}</TabsTrigger>
        </TabsList>

        <TabsContent value="json" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileJson className="h-5 w-5" />
                  {t('config.json.title')}
                </CardTitle>
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={copyToClipboard}
                  leftIcon={<Copy className="h-4 w-4" />}
                >
                  {t('config.actions.copyJson')}
                </Button>
              </div>
              <CardDescription>
                {t('config.json.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={JSON.stringify(configuration, null, 2)}
                readOnly
                rows={25}
                className="font-mono text-sm"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('config.summary.title')}</CardTitle>
              <CardDescription>
                {t('config.summary.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {getConfigurationSummary().map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <Label className="font-medium">{item.label}</Label>
                    <Badge variant="outline">{item.value}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  {t('config.export.title')}
                </CardTitle>
                <CardDescription>
                  {t('config.export.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  type="button"
                  onClick={exportConfiguration} 
                  className="w-full"
                  leftIcon={<Download className="h-4 w-4" />}
                >
                  {t('config.actions.downloadJson')}
                </Button>
                <p className="text-sm text-muted-foreground">
                  {t('config.export.details')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  {t('config.test.title')}
                </CardTitle>
                <CardDescription>
                  {t('config.test.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  type="button"
                  onClick={testConfiguration} 
                  className="w-full"
                  disabled={testingStatus === 'testing'}
                  variant={testingStatus === 'success' ? 'primary' : 'outline'}
                  leftIcon={<FileSpreadsheet className="h-4 w-4" />}
                >
                  {testingStatus === 'testing' ? t('config.actions.testing') : t('config.actions.testConfiguration')}
                </Button>
                <p className="text-sm text-muted-foreground">
                  {t('config.test.details')}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}