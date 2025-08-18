'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Wand2, AlertCircle, CheckCircle, X } from 'lucide-react';
import { PeriodMapping, PeriodDefinition } from '@/lib/types/configurations';
import { useTranslation } from '@/lib/translations';
import { useExcelPreview } from '@/hooks/useExcelPreview';

interface PeriodMappingEditorProps {
  periodsRange: string; // Legacy - will be deprecated
  currentMapping?: PeriodMapping[];
  onChange: (mapping: PeriodMapping[]) => void;
  onValidate?: (isValid: boolean, errors: string[]) => void;
  configurationId?: string; // For getting Excel preview data
  availableColumns?: string[]; // Override from Excel sheet data
}

export function PeriodMappingEditor({
  periodsRange,
  currentMapping = [],
  onChange,
  onValidate,
  configurationId,
  availableColumns
}: PeriodMappingEditorProps) {
  const { t } = useTranslation('es');
  // SINGLE SOURCE OF TRUTH: Use currentMapping directly, no internal state
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [voidedColumns, setVoidedColumns] = useState<Set<string>>(new Set());
  const [initialized, setInitialized] = useState(false);
  
  // Get Excel preview data to determine available columns
  const { excelData, loading: excelLoading } = useExcelPreview(configurationId);

  console.log('📥 [PERIOD EDITOR] Received currentMapping:', currentMapping);
  console.log('📥 [PERIOD EDITOR] Initialized state:', initialized);

  // Generate Excel column letters (A, B, C, ..., Z, AA, AB, etc.)
  const getColumnLetter = (index: number): string => {
    let result = '';
    while (index >= 0) {
      result = String.fromCharCode((index % 26) + 65) + result;
      index = Math.floor(index / 26) - 1;
    }
    return result;
  };

  // Get available columns from Excel data or fallback to range-based approach
  const getAvailableColumns = (): string[] => {
    // Priority 1: Use provided availableColumns override
    if (availableColumns && availableColumns.length > 0) {
      return availableColumns;
    }
    
    // Priority 2: Use Excel preview data to get actual column count
    if (excelData?.preview?.columnHeaders && excelData.preview.columnHeaders.length > 0) {
      return excelData.preview.columnHeaders;
    }
    
    // Priority 3: Use Excel data total columns
    if (excelData?.preview?.totalCols) {
      const columns: string[] = [];
      for (let i = 0; i < excelData.preview.totalCols; i++) {
        columns.push(getColumnLetter(i));
      }
      return columns;
    }
    
    // Fallback: Parse the legacy periodsRange (backward compatibility)
    const match = periodsRange.match(/^([A-Z]+)\d+:([A-Z]+)\d+$/);
    if (match) {
      const startCol = match[1];
      const endCol = match[2];
      
      const columns: string[] = [];
      let current = startCol.charCodeAt(0);
      const end = endCol.charCodeAt(0);
      
      while (current <= end) {
        columns.push(String.fromCharCode(current));
        current++;
      }
      return columns;
    }
    
    // Ultimate fallback: A reasonable default set of columns
    return ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'];
  };

  const columns = getAvailableColumns();
  
  console.log('📊 [PERIOD MAPPER] Excel data available:', !!excelData);
  console.log('📊 [PERIOD MAPPER] Column headers from Excel:', excelData?.preview?.columnHeaders);
  console.log('📊 [PERIOD MAPPER] Total cols from Excel:', excelData?.preview?.totalCols);
  console.log('📊 [PERIOD MAPPER] Available columns determined:', columns);
  console.log('📊 [PERIOD MAPPER] Column count:', columns.length);

  // Toggle voided columns
  const toggleVoidedColumn = (column: string) => {
    const newVoidedColumns = new Set(voidedColumns);
    if (newVoidedColumns.has(column)) {
      newVoidedColumns.delete(column);
      // Re-add to mapping if it was voided
      const existingIndex = currentMapping.findIndex(m => m.column === column);
      if (existingIndex === -1) {
        const newMapping = [...currentMapping, {
          column,
          period: {
            type: 'month' as const,
            year: new Date().getFullYear(),
            month: 1,
            label: t('periodMapping.months.short.jan') + ' ' + new Date().getFullYear()
          }
        }];
        onChange(newMapping);
      }
    } else {
      newVoidedColumns.add(column);
      // Remove from mapping if it was included
      const newMapping = currentMapping.filter(m => m.column !== column);
      onChange(newMapping);
    }
    setVoidedColumns(newVoidedColumns);
  };

  // SINGLE SOURCE OF TRUTH: Initialize default mapping only once if empty
  useEffect(() => {
    if (!initialized && currentMapping.length === 0 && columns.length > 0) {
      const defaultMapping = columns.map((column, index) => ({
        column,
        period: {
          type: 'month' as const,
          year: 2025,
          month: (index % 12) + 1,
          label: `${[t('periodMapping.months.short.jan'), t('periodMapping.months.short.feb'), t('periodMapping.months.short.mar'), t('periodMapping.months.short.apr'), t('periodMapping.months.short.may'), t('periodMapping.months.short.jun'), t('periodMapping.months.short.jul'), t('periodMapping.months.short.aug'), t('periodMapping.months.short.sep'), t('periodMapping.months.short.oct'), t('periodMapping.months.short.nov'), t('periodMapping.months.short.dec')][index % 12]} 2025`
        }
      }));
      console.log('🔧 [PERIOD EDITOR] Initializing default period mapping:', defaultMapping);
      setInitialized(true);
      onChange(defaultMapping); // This will update the parent's configData
    }
  }, [initialized, currentMapping.length, columns, onChange]);

  // SINGLE SOURCE OF TRUTH: Update period definition using currentMapping
  const updatePeriod = (columnIndex: number, updates: Partial<PeriodDefinition>) => {
    const newMapping = [...currentMapping];
    if (newMapping[columnIndex]) {
      newMapping[columnIndex] = {
        ...newMapping[columnIndex],
        period: { ...newMapping[columnIndex].period, ...updates }
      };
      
      // Auto-generate label if type/year/month/quarter changes
      if (updates.type || updates.year || updates.month || updates.quarter) {
        const period = newMapping[columnIndex].period;
        newMapping[columnIndex].period.label = generateLabel(period);
      }
      
      console.log('🔄 [PERIOD EDITOR] Period mapping updated:', newMapping);
      onChange(newMapping); // This will update parent's configData
      validateMapping(newMapping);
    }
  };

  // Generate display label
  const generateLabel = (period: PeriodDefinition): string => {
    switch (period.type) {
      case 'month':
        if (period.month && period.year) {
          const monthNames = [t('periodMapping.months.short.jan'), t('periodMapping.months.short.feb'), t('periodMapping.months.short.mar'), t('periodMapping.months.short.apr'), t('periodMapping.months.short.may'), t('periodMapping.months.short.jun'), t('periodMapping.months.short.jul'), t('periodMapping.months.short.aug'), t('periodMapping.months.short.sep'), t('periodMapping.months.short.oct'), t('periodMapping.months.short.nov'), t('periodMapping.months.short.dec')];
          return `${monthNames[period.month - 1]} ${period.year}`;
        }
        break;
      case 'quarter':
        if (period.quarter && period.year) {
          return `Q${period.quarter} ${period.year}`;
        }
        break;
      case 'year':
        return `${period.year}`;
      case 'custom':
        return period.customValue || t('periodMapping.customPeriod');
    }
    return t('periodMapping.invalidPeriod');
  };

  // Auto-detect periods from common patterns
  const autoDetectPeriods = () => {
    const currentYear = new Date().getFullYear();
    
    // Filter out voided columns
    const activeColumns = columns.filter(col => !voidedColumns.has(col));
    
    // Try different detection strategies based on active column count
    let autoMapping: PeriodMapping[];
    
    if (activeColumns.length === 12) {
      // Most likely monthly data
      autoMapping = activeColumns.map((column, index) => ({
        column,
        period: {
          type: 'month' as const,
          year: currentYear,
          month: (index % 12) + 1,
          label: `${[t('periodMapping.months.short.jan'), t('periodMapping.months.short.feb'), t('periodMapping.months.short.mar'), t('periodMapping.months.short.apr'), t('periodMapping.months.short.may'), t('periodMapping.months.short.jun'), t('periodMapping.months.short.jul'), t('periodMapping.months.short.aug'), t('periodMapping.months.short.sep'), t('periodMapping.months.short.oct'), t('periodMapping.months.short.nov'), t('periodMapping.months.short.dec')][index % 12]} ${currentYear}`
        }
      }));
    } else if (activeColumns.length === 4) {
      // Likely quarterly data
      autoMapping = activeColumns.map((column, index) => ({
        column,
        period: {
          type: 'quarter' as const,
          year: currentYear,
          quarter: (index % 4) + 1,
          label: `Q${(index % 4) + 1} ${currentYear}`
        }
      }));
    } else if (activeColumns.length <= 3) {
      // Likely yearly or custom periods
      autoMapping = activeColumns.map((column, index) => ({
        column,
        period: {
          type: 'year' as const,
          year: currentYear + index,
          label: `${currentYear + index}`
        }
      }));
    } else {
      // Default to monthly, wrapping to next year if needed
      autoMapping = activeColumns.map((column, index) => {
        const monthIndex = index % 12;
        const yearOffset = Math.floor(index / 12);
        return {
          column,
          period: {
            type: 'month' as const,
            year: currentYear + yearOffset,
            month: monthIndex + 1,
            label: `${[t('periodMapping.months.short.jan'), t('periodMapping.months.short.feb'), t('periodMapping.months.short.mar'), t('periodMapping.months.short.apr'), t('periodMapping.months.short.may'), t('periodMapping.months.short.jun'), t('periodMapping.months.short.jul'), t('periodMapping.months.short.aug'), t('periodMapping.months.short.sep'), t('periodMapping.months.short.oct'), t('periodMapping.months.short.nov'), t('periodMapping.months.short.dec')][monthIndex]} ${currentYear + yearOffset}`
          }
        };
      });
    }
    
    console.log('🎯 Auto-detected period mapping:', autoMapping);
    onChange(autoMapping);
    validateMapping(autoMapping);
  };

  // Validate mapping
  const validateMapping = (mappingToValidate: PeriodMapping[]) => {
    const errors: string[] = [];
    
    // Check for duplicate periods
    const labels = mappingToValidate.map(m => m.period.label);
    const duplicates = labels.filter((label, index) => labels.indexOf(label) !== index);
    if (duplicates.length > 0) {
      errors.push(`${t('periodMapping.validation.duplicatePeriods')}: ${duplicates.join(', ')}`);
    }
    
    // Check for missing required fields
    mappingToValidate.forEach((mapping, index) => {
      const { period } = mapping;
      if (!period.year) {
        errors.push(`Columna ${mapping.column}: ${t('periodMapping.validation.yearRequired')}`);
      }
      
      if (period.type === 'month' && (!period.month || period.month < 1 || period.month > 12)) {
        errors.push(`Columna ${mapping.column}: ${t('periodMapping.validation.monthRequired')}`);
      }
      
      if (period.type === 'quarter' && (!period.quarter || period.quarter < 1 || period.quarter > 4)) {
        errors.push(`Columna ${mapping.column}: ${t('periodMapping.validation.quarterRequired')}`);
      }
      
      if (period.type === 'custom' && !period.customValue?.trim()) {
        errors.push(`Columna ${mapping.column}: ${t('periodMapping.validation.customRequired')}`);
      }
    });
    
    setValidationErrors(errors);
    onValidate?.(errors.length === 0, errors);
  };

  // Run validation when currentMapping changes
  useEffect(() => {
    if (currentMapping.length > 0) {
      validateMapping(currentMapping);
    }
  }, [currentMapping]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {t('periodMapping.title')}
            </CardTitle>
            <CardDescription>
              {t('periodMapping.description')}
            </CardDescription>
          </div>
          <button
            type="button"
            onClick={autoDetectPeriods}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 border-0 shadow-lg whitespace-nowrap rounded-lg font-medium transition-colors"
          >
            <Wand2 className="h-4 w-4" />
            {t('periodMapping.autoDetect')}
          </button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {validationErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                {validationErrors.map((error, index) => (
                  <div key={index}>• {error}</div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-6 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
            <div>{t('periodMapping.table.excelColumn')}</div>
            <div>{t('periodMapping.table.periodType')}</div>
            <div>{t('periodMapping.table.year')}</div>
            <div>{t('periodMapping.table.monthQuarter')}</div>
            <div>{t('periodMapping.table.displayLabel')}</div>
            <div>{t('periodMapping.table.preview')}</div>
          </div>

          {/* Show all columns (active and voided) */}
          {columns.map((column) => {
            const columnMapping = currentMapping.find(m => m.column === column);
            const isVoided = voidedColumns.has(column);
            const index = currentMapping.findIndex(m => m.column === column);
            
            return (
              <div key={column} className={`grid grid-cols-6 gap-4 items-center ${isVoided ? 'opacity-50' : ''}`}>
                {/* Clickable Column - allows voiding */}
                <div 
                  className={`font-mono text-sm font-medium rounded px-2 py-1 text-center cursor-pointer transition-colors ${
                    isVoided 
                      ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                  onClick={() => toggleVoidedColumn(column)}
                  title={isVoided ? t('periodMapping.includeColumn') : t('periodMapping.excludeColumn')}
                >
                  {column}
                  {isVoided && <X className="inline-block ml-1 h-3 w-3" />}
                </div>
                
                {/* Show period configuration only for non-voided columns */}
                {!isVoided && columnMapping ? (
                  <>
                    {/* Period Type */}
                    <Select
                      value={columnMapping.period.type}
                      onValueChange={(value: 'month' | 'quarter' | 'year' | 'custom') => 
                        updatePeriod(index, { type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="month">{t('periodMapping.type.monthly')}</SelectItem>
                        <SelectItem value="quarter">{t('periodMapping.type.quarterly')}</SelectItem>
                        <SelectItem value="year">{t('periodMapping.type.yearly')}</SelectItem>
                        <SelectItem value="custom">{t('periodMapping.type.custom')}</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {/* Year */}
                    <Select
                      value={columnMapping.period.year.toString()}
                      onValueChange={(value) => 
                        updatePeriod(index, { year: parseInt(value) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 6 }, (_, i) => {
                          const year = new Date().getFullYear() + i - 1;
                          return (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    
                    {/* Month/Quarter selector based on type */}
                    {columnMapping.period.type === 'month' && (
                      <Select
                        value={columnMapping.period.month?.toString()}
                        onValueChange={(value) => 
                          updatePeriod(index, { month: parseInt(value) })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[t('periodMapping.months.january'), t('periodMapping.months.february'), t('periodMapping.months.march'), t('periodMapping.months.april'), t('periodMapping.months.may'), t('periodMapping.months.june'), 
                            t('periodMapping.months.july'), t('periodMapping.months.august'), t('periodMapping.months.september'), t('periodMapping.months.october'), t('periodMapping.months.november'), t('periodMapping.months.december')]
                            .map((month, i) => (
                              <SelectItem key={i + 1} value={(i + 1).toString()}>
                                {month}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    )}
                    
                    {columnMapping.period.type === 'quarter' && (
                      <Select
                        value={columnMapping.period.quarter?.toString()}
                        onValueChange={(value) => 
                          updatePeriod(index, { quarter: parseInt(value) })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Q1</SelectItem>
                          <SelectItem value="2">Q2</SelectItem>
                          <SelectItem value="3">Q3</SelectItem>
                          <SelectItem value="4">Q4</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    
                    {columnMapping.period.type === 'custom' && (
                      <input
                        type="text"
                        value={columnMapping.period.customValue || ''}
                        onChange={(e) => updatePeriod(index, { customValue: e.target.value })}
                        placeholder={t('periodMapping.customPlaceholder')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    )}
                    
                    {columnMapping.period.type === 'year' && (
                      <div className="text-sm text-gray-500">—</div>
                    )}
                    
                    {/* Display Label */}
                    <div className="text-sm font-medium">
                      {generateLabel(columnMapping.period)}
                    </div>
                    
                    {/* Preview */}
                    <div className="text-sm text-gray-600 font-mono">
                      {columnMapping.column}→{generateLabel(columnMapping.period)}
                    </div>
                  </>
                ) : (
                  /* Show placeholder for voided columns */
                  <>
                    <div className="text-sm text-gray-400 italic">{t('periodMapping.excluded')}</div>
                    <div className="text-sm text-gray-400 italic">—</div>
                    <div className="text-sm text-gray-400 italic">—</div>
                    <div className="text-sm text-gray-400 italic">—</div>
                    <div className="text-sm text-gray-400 italic">{t('periodMapping.notMapped')}</div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {validationErrors.length === 0 && currentMapping.length > 0 && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              {t('periodMapping.validation.success').replace('columnas', `${currentMapping.length} columnas`)}
            </AlertDescription>
          </Alert>
        )}

        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">{t('periodMapping.help.title')}</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• {t('periodMapping.help.point1')}</li>
            <li>• {t('periodMapping.help.point2')}</li>
            <li>• {t('periodMapping.help.point3')}</li>
            <li>• {t('periodMapping.help.point4')}</li>
            <li>• {t('periodMapping.help.point5')}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}