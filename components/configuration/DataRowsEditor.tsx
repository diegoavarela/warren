'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Database, HelpCircle, AlertCircle, CheckCircle, FileSpreadsheet, Eye } from 'lucide-react';
import { CashFlowConfiguration, PLConfiguration } from '@/lib/types/configurations';
import { useTranslation } from '@/lib/translations';
import { useExcelPreview } from '@/hooks/useExcelPreview';
import { ExcelGrid } from './ExcelGrid';

interface DataRowsEditorProps {
  configuration: CashFlowConfiguration | PLConfiguration;
  onChange: (config: CashFlowConfiguration | PLConfiguration) => void;
  configurationId?: string;
}

interface FieldDefinition {
  key: string;
  label: string;
  description: string;
  required: boolean;
  category: string;
}

export function DataRowsEditor({ configuration, onChange, configurationId }: DataRowsEditorProps) {
  const [showExcelPreview, setShowExcelPreview] = useState(false);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const { t } = useTranslation('es');
  const { excelData, loading, error } = useExcelPreview(configurationId);

  // Define field definitions for each configuration type
  const getCashFlowFields = (): FieldDefinition[] => [
    {
      key: 'initialBalance',
      label: t('config.fields.initialBalance'),
      description: t('config.fields.initialBalanceDesc'),
      required: true,
      category: 'core'
    },
    {
      key: 'finalBalance',
      label: t('config.fields.finalBalance'),
      description: t('config.fields.finalBalanceDesc'),
      required: true,
      category: 'core'
    },
    {
      key: 'totalInflows',
      label: t('config.fields.totalInflows'),
      description: t('config.fields.totalInflowsDesc'),
      required: true,
      category: 'core'
    },
    {
      key: 'totalOutflows',
      label: t('config.fields.totalOutflows'),
      description: t('config.fields.totalOutflowsDesc'),
      required: true,
      category: 'core'
    },
    {
      key: 'monthlyGeneration',
      label: t('config.fields.monthlyGeneration'),
      description: t('config.fields.monthlyGenerationDesc'),
      required: true,
      category: 'core'
    }
  ];

  const getPLFields = (): FieldDefinition[] => [
    // Revenue Section
    {
      key: 'totalRevenue',
      label: t('config.fields.totalRevenue'),
      description: t('config.fields.totalRevenueDesc'),
      required: true,
      category: 'revenue'
    },
    {
      key: 'grossIncome',
      label: t('config.fields.grossIncome'),
      description: t('config.fields.grossIncomeDesc'),
      required: false,
      category: 'revenue'
    },
    // Cost Section
    {
      key: 'cogs',
      label: t('config.fields.cogs'),
      description: t('config.fields.cogsDesc'),
      required: false,
      category: 'costs'
    },
    {
      key: 'totalOpex',
      label: t('config.fields.totalOpex'),
      description: t('config.fields.totalOpexDesc'),
      required: false,
      category: 'costs'
    },
    {
      key: 'totalOutcome',
      label: t('config.fields.totalOutcome'),
      description: t('config.fields.totalOutcomeDesc'),
      required: false,
      category: 'costs'
    },
    // Profitability Section
    {
      key: 'grossProfit',
      label: t('config.fields.grossProfit'),
      description: t('config.fields.grossProfitDesc'),
      required: true,
      category: 'profitability'
    },
    {
      key: 'grossMargin',
      label: t('config.fields.grossMargin'),
      description: t('config.fields.grossMarginDesc'),
      required: false,
      category: 'profitability'
    },
    {
      key: 'ebitda',
      label: t('config.fields.ebitda'),
      description: t('config.fields.ebitdaDesc'),
      required: true,
      category: 'profitability'
    },
    {
      key: 'ebitdaMargin',
      label: t('config.fields.ebitdaMargin'),
      description: t('config.fields.ebitdaMarginDesc'),
      required: false,
      category: 'profitability'
    },
    {
      key: 'earningsBeforeTaxes',
      label: t('config.fields.earningsBeforeTaxes'),
      description: t('config.fields.earningsBeforeTaxesDesc'),
      required: false,
      category: 'profitability'
    },
    {
      key: 'netIncome',
      label: t('config.fields.netIncome'),
      description: t('config.fields.netIncomeDesc'),
      required: true,
      category: 'profitability'
    },
    // Other Sections
    {
      key: 'otherIncome',
      label: t('config.fields.otherIncome'),
      description: t('config.fields.otherIncomeDesc'),
      required: false,
      category: 'other'
    },
    {
      key: 'otherExpenses',
      label: t('config.fields.otherExpenses'),
      description: t('config.fields.otherExpensesDesc'),
      required: false,
      category: 'other'
    },
    {
      key: 'taxes',
      label: t('config.fields.taxes'),
      description: t('config.fields.taxesDesc'),
      required: false,
      category: 'other'
    }
  ];

  const fields = configuration.type === 'cashflow' ? getCashFlowFields() : getPLFields();
  
  // Sort fields: required first, then optional
  const sortedFields = [...fields].sort((a, b) => {
    if (a.required && !b.required) return -1;
    if (!a.required && b.required) return 1;
    return 0;
  });

  // Helper function to get human-readable field label
  const getFieldLabel = (fieldKey: string): string => {
    const field = fields.find(f => f.key === fieldKey);
    return field ? field.label : fieldKey;
  };


  const updateDataRow = (fieldKey: string, rowNumber: number) => {
    const updatedConfig = { ...configuration };
    const field = fields.find(f => f.key === fieldKey);
    
    // For optional fields, allow clearing the value (completely remove from object)
    if (!field?.required && (rowNumber === 0 || isNaN(rowNumber) || rowNumber === null || rowNumber === undefined)) {
      delete (updatedConfig.structure.dataRows as any)[fieldKey];
    } else if (rowNumber > 0) {
      // Only set if the value is valid (> 0)
      (updatedConfig.structure.dataRows as any)[fieldKey] = rowNumber;
    }
    onChange(updatedConfig);
  };

  const getRowValue = (fieldKey: string): number => {
    return (configuration.structure.dataRows as any)[fieldKey] || 0;
  };

  const validateField = (field: FieldDefinition): { isValid: boolean; message?: string } => {
    const value = getRowValue(field.key);
    
    if (field.required && (!value || value < 1)) {
      return { isValid: false, message: t('config.validation.requiredField') };
    }
    
    if (value && (value < 1 || value > 10000)) {
      return { isValid: false, message: t('config.validation.rowRange') };
    }
    
    return { isValid: true };
  };

  const getStatusIcon = (field: FieldDefinition) => {
    const validation = validateField(field);
    const value = getRowValue(field.key);
    
    if (validation.isValid && value > 0) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    } else if (!validation.isValid) {
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    }
    return <div className="h-4 w-4 border border-gray-300 rounded-full bg-gray-100" />;
  };

  // Calculate progress
  const totalRequired = fields.filter(f => f.required).length;
  const mappedRequired = fields.filter(f => f.required && getRowValue(f.key) > 0).length;
  const totalMapped = fields.filter(f => getRowValue(f.key) > 0).length;
  const progressPercentage = totalRequired > 0 ? Math.round((mappedRequired / totalRequired) * 100) : 0;

  // Handle modal background scrolling
  useEffect(() => {
    if (showExcelPreview) {
      // Prevent body scrolling when modal is open
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      
      // Cleanup function to restore scrolling
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [showExcelPreview]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!showExcelPreview) return;
      
      // Escape key to close modal
      if (event.key === 'Escape') {
        setShowExcelPreview(false);
        setSelectedField(null);
        setSelectedRow(null);
        return;
      }
      
      // Ctrl+F or Cmd+F to focus search
      if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault();
        const searchInput = document.getElementById('excel-search-input') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
        return;
      }
    };

    if (showExcelPreview) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [showExcelPreview]);

  // Excel Preview Modal Component
  const ExcelPreview = () => {
    if (!showExcelPreview) return null;

    const handleRowClick = (rowNumber: number) => {
      if (selectedField) {
        updateDataRow(selectedField, rowNumber);
        setSelectedRow(rowNumber);
        setSelectedField(null);
        setShowExcelPreview(false);
      } else {
        setSelectedRow(rowNumber);
      }
    };

    return (
      <div 
        className="fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
        style={{ margin: 0, padding: '16px' }}
        onClick={(e) => {
          // Close modal when clicking on backdrop
          if (e.target === e.currentTarget) {
            setShowExcelPreview(false);
            setSelectedField(null);
            setSelectedRow(null);
          }
        }}
      >
        <div 
          className="bg-white rounded-lg w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl mx-auto"
          style={{ maxHeight: '90vh' }}
          onClick={(e) => e.stopPropagation()} // Prevent modal from closing when clicking inside
        >
          {/* Fixed Header */}
          <div className="flex-shrink-0 p-6 border-b">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-medium">{t('config.preview.excelTitle')}</h3>
                {selectedField && (
                  <p className="text-sm text-blue-600 mt-1">
                    Click on a row to map <strong>{getFieldLabel(selectedField)}</strong>
                  </p>
                )}
              </div>
              <Button type="button" variant="outline" onClick={() => {
                setShowExcelPreview(false);
                setSelectedField(null);
                setSelectedRow(null);
              }}>
                {t('common.close')}
              </Button>
            </div>
            
            {loading && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm">Loading Excel data...</span>
              </div>
            )}
            
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg mt-4">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}
          </div>
          

          {/* Scrollable Content */}
          <div className="flex-1 overflow-hidden p-6">
            {excelData && (
              <div className="h-full">
                <ExcelGrid
                  excelData={excelData}
                  selectedRow={selectedRow}
                  selectedField={selectedField ? getFieldLabel(selectedField) : null}
                  onRowClick={handleRowClick}
                  showRowSelection={true}
                  highlightDataRows={configuration.structure.dataRows}
                  className="h-full"
                  isFullHeight={true}
                  searchPlaceholder={t('config.preview.search')}
                />
              </div>
            )}
          </div>
          
          {/* Fixed Footer */}
          <div className="flex-shrink-0 p-4 border-t bg-gray-50">
            {selectedField ? (
              <p className="text-sm text-blue-800">
                💡 {t('config.preview.clickToMap')} <strong>{getFieldLabel(selectedField)}</strong> {t('config.preview.toRow')}
              </p>
            ) : (
              <div className="flex justify-between items-center text-xs text-gray-500">
                <div>
                  <span className="font-medium">Shortcuts:</span> 
                  <span className="ml-2">ESC to close</span>
                  <span className="ml-4">Ctrl+F to search</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                {t('config.datarows.title')}
              </CardTitle>
              <CardDescription>
                {t('config.datarows.description')}
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowExcelPreview(true)}
                leftIcon={<Eye className="h-4 w-4" />}
              >
                {t('config.actions.excelPreview')}
              </Button>
              <div className="text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <span>{progressPercentage}%</span>
                </div>
                <p className="text-xs mt-1">{mappedRequired}/{totalRequired} {t('config.datarows.required')}</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium">{t('config.table.status')}</th>
                  <th className="text-left py-2 px-3 font-medium">{t('config.table.field')}</th>
                  <th className="text-left py-2 px-3 font-medium">{t('config.table.description')}</th>
                  <th className="text-left py-2 px-3 font-medium">{t('config.table.excelRow')}</th>
                  <th className="text-left py-2 px-3 font-medium">{t('config.table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {sortedFields.map((field, index) => {
                  const validation = validateField(field);
                  const value = getRowValue(field.key);
                  
                  return (
                    <tr 
                      key={field.key} 
                      className={`border-b hover:bg-gray-50 ${!validation.isValid && field.required ? 'bg-red-50' : ''}`}
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(field)}
                          {field.required && (
                            <Badge variant="secondary" className="text-xs">{t('config.datarows.requiredLabel')}</Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium">{field.label}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-sm text-muted-foreground max-w-xs">
                          {field.description}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={field.required ? "1" : "0"}
                            max="10000"
                            value={value || ''}
                            onChange={(e) => {
                              const inputValue = e.target.value;
                              if (inputValue === '' && !field.required) {
                                updateDataRow(field.key, 0); // This will trigger deletion for optional fields
                              } else {
                                const numValue = parseInt(inputValue);
                                if (!isNaN(numValue) && numValue > 0) {
                                  updateDataRow(field.key, numValue);
                                } else if (field.required) {
                                  // For required fields, don't allow invalid values
                                  updateDataRow(field.key, 0);
                                }
                              }
                            }}
                            className="w-20"
                            placeholder={field.required ? t('config.form.rowPlaceholder') : t('common.optional')}
                          />
                          {!field.required && value > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => updateDataRow(field.key, 0)}
                              className="h-8 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 hover:border-red-300"
                            >
                              ✕
                            </Button>
                          )}
                          {value > 0 && (
                            <span className="text-xs text-gray-500">{t('config.form.row')} {value}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedField(field.key);
                              setShowExcelPreview(true);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <FileSpreadsheet className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <HelpCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6 pt-4 border-t text-sm">
            <div className="text-center">
              <div className="font-medium">{fields.length}</div>
              <div className="text-muted-foreground">{t('config.summary.totalFields')}</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-red-600">{totalRequired}</div>
              <div className="text-muted-foreground">{t('config.summary.required')}</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-green-600">{totalMapped}</div>
              <div className="text-muted-foreground">{t('config.summary.mapped')}</div>
            </div>
            <div className="text-center">
              <div className={`font-medium ${fields.every(f => validateField(f).isValid) ? 'text-green-600' : 'text-red-600'}`}>
                {fields.every(f => validateField(f).isValid) ? t('config.summary.valid') : t('config.summary.issues')}
              </div>
              <div className="text-muted-foreground">{t('config.summary.status')}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <ExcelPreview />
    </div>
  );
}