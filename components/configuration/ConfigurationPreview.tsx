'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Download, 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle,
  FileJson, 
  FileSpreadsheet,
  Copy,
  ExternalLink
} from 'lucide-react';
import { CashFlowConfiguration, PLConfiguration } from '@/lib/types/configurations';
import { useTranslation } from '@/lib/translations';
import { ValidationResultsModal } from './ValidationResultsModal';

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
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const { t } = useTranslation('es');

  // Auto-validate on mount and configuration changes
  useEffect(() => {
    const result = validateConfiguration();
    setValidationResult(result);
  }, [configuration]);

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
          mappedFieldsCount = Math.max(mappedFieldsCount, Object.keys(dataRows).filter(k => (dataRows as any)[k] > 0).length);
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

  // Test configuration with modal
  const testConfiguration = async () => {
    setIsModalOpen(true);
    setIsModalLoading(true);
    
    // Mock test - in real app would call API
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const validation = validateConfiguration();
    setValidationResult(validation);
    setIsModalLoading(false);
  };

  // Copy JSON to clipboard
  const copyToClipboard = async () => {
    const jsonString = JSON.stringify(configuration, null, 2);
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
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

  // Generate compact configuration summary
  const getConfigurationSummary = () => {
    const validation = validationResult || validateConfiguration();
    
    return [
      {
        label: t('config.summary.configurationType'),
        value: configuration.type === 'cashflow' ? t('config.type.cashflow') : t('config.type.pnl')
      },
      {
        label: t('config.summary.periodsRange'),
        value: configuration.structure.periodsRange
      },
      ...(configuration.type === 'pnl' ? [{
        label: t('config.summary.categoriesColumn'),
        value: (configuration as PLConfiguration).structure.categoriesColumn
      }] : []),
      {
        label: t('config.form.currency'),
        value: configuration.metadata.currency
      },
      {
        label: t('config.summary.categories'),
        value: `${validation.summary.categoriesCount}`
      }
    ];
  };

  // Get validation status for compact display
  const getValidationStatus = () => {
    if (!validationResult) return { color: 'gray', text: 'Validando...', icon: null };
    
    if (validationResult.isValid) {
      return { 
        color: 'green', 
        text: t('config.status.compact.valid'), 
        icon: <CheckCircle className="h-4 w-4" />
      };
    } else {
      const errorCount = validationResult.errors.length;
      const warningCount = validationResult.warnings.length;
      let text = '';
      if (errorCount > 0) text += t('config.status.compact.errors').replace('{count}', errorCount.toString());
      if (warningCount > 0) text += (text ? ', ' : '') + t('config.status.compact.warnings').replace('{count}', warningCount.toString());
      
      return { 
        color: 'red', 
        text, 
        icon: <AlertCircle className="h-4 w-4" />
      };
    }
  };

  const validationStatus = getValidationStatus();

  return (
    <div className="space-y-6">
      {/* Main Preview Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('config.preview.title')}</CardTitle>
          <CardDescription>
            {t('config.preview.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Compact Configuration Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-lg">
            {getConfigurationSummary().map((item, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">{item.label}:</span>
                <Badge variant="outline" className="text-xs">{item.value}</Badge>
              </div>
            ))}
          </div>

          {/* Validation Status */}
          <div className="flex items-center justify-between p-3 bg-white border rounded-lg">
            <div className="flex items-center gap-2">
              {validationStatus.icon}
              <span className={`font-medium text-${validationStatus.color}-800`}>
                Estado de Validación: {validationStatus.text}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (validationResult) {
                    setIsModalOpen(true);
                  }
                }}
                disabled={!validationResult}
                leftIcon={<ExternalLink className="h-3 w-3" />}
              >
                {t('config.status.compact.details')}
              </Button>
              <Button
                type="button"
                onClick={testConfiguration}
                leftIcon={<FileSpreadsheet className="h-4 w-4" />}
              >
                {t('config.test.title')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* JSON Configuration Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileJson className="h-5 w-5" />
              <CardTitle>{t('config.json.title')}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                type="button"
                variant="outline" 
                size="sm"
                onClick={copyToClipboard}
                leftIcon={copySuccess ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                className={copySuccess ? 'text-green-600 border-green-300' : ''}
              >
                {copySuccess ? 'Copiado!' : t('config.actions.copyJson')}
              </Button>
              <Button 
                type="button"
                onClick={exportConfiguration}
                size="sm"
                leftIcon={<Download className="h-4 w-4" />}
              >
                {t('config.actions.downloadJson')}
              </Button>
            </div>
          </div>
          <CardDescription>
            {t('config.json.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={JSON.stringify(configuration, null, 2)}
            readOnly
            rows={20}
            className="font-mono text-sm"
          />
        </CardContent>
      </Card>

      {/* Validation Results Modal */}
      <ValidationResultsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        validationResult={validationResult}
        isLoading={isModalLoading}
      />
    </div>
  );
}