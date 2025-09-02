'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectItem } from '@/components/ui/native-select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Wand2, AlertCircle, CheckCircle, X, TrendingUp, HelpCircle } from 'lucide-react';
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
  // NEW: Actual vs Projected period support
  lastActualPeriod?: PeriodDefinition;
  onLastActualPeriodChange?: (period: PeriodDefinition | undefined) => void;
  configurationType?: 'cashflow' | 'pnl'; // Only show actual/projected for cashflow
  locale?: string;
}

export function PeriodMappingEditor({
  periodsRange,
  currentMapping = [],
  onChange,
  onValidate,
  configurationId,
  availableColumns,
  lastActualPeriod,
  onLastActualPeriodChange,
  configurationType = 'cashflow',
  locale
}: PeriodMappingEditorProps) {
  const { t } = useTranslation(locale || 'es');
  const isSpanish = (locale || 'es').startsWith('es');
  // SINGLE SOURCE OF TRUTH: Use currentMapping directly, no internal state
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [voidedColumns, setVoidedColumns] = useState<Set<string>>(new Set());
  const [initialized, setInitialized] = useState(false);
  
  // Get Excel preview data to determine available columns
  const { excelData, loading: excelLoading } = useExcelPreview(configurationId);

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
    
    // Priority 2: ALWAYS use totalCols if available (this is the actual column count)
    if (excelData?.preview?.totalCols) {
      const columns: string[] = [];
      for (let i = 0; i < excelData.preview.totalCols; i++) {
        columns.push(getColumnLetter(i));
      }
      return columns;
    }
    
    // Priority 3: Fallback to columnHeaders (might be capped)
    if (excelData?.preview?.columnHeaders && excelData.preview.columnHeaders.length > 0) {
      return excelData.preview.columnHeaders;
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

  // Auto-detect periods from Excel headers and patterns
  const autoDetectPeriods = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    // IMPORTANT: For auto-detect, we should analyze ALL columns, not just active ones
    // We'll determine which to void based on the data
    const allColumns = columns;
    
    // Clear voided columns for fresh detection
    setVoidedColumns(new Set());
    
    // Try to get actual header values from Excel data
    let autoMapping: PeriodMapping[] = [];
    let columnsToVoid = new Set<string>();
    
    // Check if we have Excel data with headers
    if (excelData?.preview?.rowData && excelData.preview.rowData.length > 0) {
      // Look at first few rows for potential date headers
      const headerRows = excelData.preview.rowData.slice(0, 5);
      
      // Try to find a row with date-like values
      for (const row of headerRows) {
        const detectedPeriods: PeriodMapping[] = [];
        let hasValidDates = false;
        
        allColumns.forEach((column) => {
          // Get the actual column index from the column letter
          const actualColIndex = columns.indexOf(column);
          if (actualColIndex === -1) return;
          
          const cellValue = row[actualColIndex];
          
          // If no value, mark for potential exclusion (but we'll check data rows later)
          if (!cellValue) {
            columnsToVoid.add(column);
            return;
          }
          
          const cellStr = String(cellValue).trim();
          
          // Try to parse as Excel date serial number (days since 1900)
          if (typeof cellValue === 'number' && cellValue > 25000 && cellValue < 50000) {
            // This is likely an Excel date serial
            const excelDate = new Date((cellValue - 25569) * 86400 * 1000);
            if (!isNaN(excelDate.getTime())) {
              hasValidDates = true;
              detectedPeriods.push({
                column,
                period: {
                  type: 'month' as const,
                  year: excelDate.getFullYear(),
                  month: excelDate.getMonth() + 1,
                  label: `${[t('periodMapping.months.short.jan'), t('periodMapping.months.short.feb'), t('periodMapping.months.short.mar'), t('periodMapping.months.short.apr'), t('periodMapping.months.short.may'), t('periodMapping.months.short.jun'), t('periodMapping.months.short.jul'), t('periodMapping.months.short.aug'), t('periodMapping.months.short.sep'), t('periodMapping.months.short.oct'), t('periodMapping.months.short.nov'), t('periodMapping.months.short.dec')][excelDate.getMonth()]} ${excelDate.getFullYear()}`
                }
              });
              return;
            }
          }
          
          // Try to parse month names (Jan, Feb, January, February, etc.)
          const monthPatterns = [
            { regex: /^(jan|enero|ene)/i, month: 1 },
            { regex: /^(feb|febrero)/i, month: 2 },
            { regex: /^(mar|marzo)/i, month: 3 },
            { regex: /^(apr|april|abril|abr)/i, month: 4 },
            { regex: /^(may|mayo)/i, month: 5 },
            { regex: /^(jun|june|junio)/i, month: 6 },
            { regex: /^(jul|july|julio)/i, month: 7 },
            { regex: /^(aug|august|agosto|ago)/i, month: 8 },
            { regex: /^(sep|sept|september|septiembre)/i, month: 9 },
            { regex: /^(oct|october|octubre)/i, month: 10 },
            { regex: /^(nov|november|noviembre)/i, month: 11 },
            { regex: /^(dec|december|diciembre|dic)/i, month: 12 }
          ];
          
          for (const pattern of monthPatterns) {
            if (pattern.regex.test(cellStr)) {
              hasValidDates = true;
              // Try to extract year from the string
              const yearMatch = cellStr.match(/\d{4}/);
              const year = yearMatch ? parseInt(yearMatch[0]) : currentYear;
              
              detectedPeriods.push({
                column,
                period: {
                  type: 'month' as const,
                  year,
                  month: pattern.month,
                  label: `${[t('periodMapping.months.short.jan'), t('periodMapping.months.short.feb'), t('periodMapping.months.short.mar'), t('periodMapping.months.short.apr'), t('periodMapping.months.short.may'), t('periodMapping.months.short.jun'), t('periodMapping.months.short.jul'), t('periodMapping.months.short.aug'), t('periodMapping.months.short.sep'), t('periodMapping.months.short.oct'), t('periodMapping.months.short.nov'), t('periodMapping.months.short.dec')][pattern.month - 1]} ${year}`
                }
              });
              return;
            }
          }
          
          // Try to parse quarter patterns (Q1, Q2, etc.)
          const quarterMatch = cellStr.match(/Q(\d)\s*(\d{4})?/i);
          if (quarterMatch) {
            hasValidDates = true;
            const quarter = parseInt(quarterMatch[1]);
            const year = quarterMatch[2] ? parseInt(quarterMatch[2]) : currentYear;
            
            detectedPeriods.push({
              column,
              period: {
                type: 'quarter' as const,
                year,
                quarter,
                label: `Q${quarter} ${year}`
              }
            });
            return;
          }
          
          // Try to parse year-only patterns (2024, 2025, etc.)
          if (/^\d{4}$/.test(cellStr)) {
            const year = parseInt(cellStr);
            if (year >= 2000 && year <= 2050) {
              hasValidDates = true;
              detectedPeriods.push({
                column,
                period: {
                  type: 'year' as const,
                  year,
                  label: `${year}`
                }
              });
              return;
            }
          }
        });
        
        // If we found valid dates in this row, use them
        if (hasValidDates && detectedPeriods.length > 0) {
          autoMapping = detectedPeriods;
          break;
        }
      }
    }
    
    // Now let's check which columns actually have data
    // Look at more rows to determine which columns have financial data
    if (excelData?.preview?.rowData && excelData.preview.rowData.length > 5) {
      const dataRows = excelData.preview.rowData.slice(5, Math.min(20, excelData.preview.rowData.length));
      
      // Check each column for numeric data
      const columnsWithData = new Set<string>();
      allColumns.forEach((column) => {
        const colIndex = columns.indexOf(column);
        let hasNumericData = false;
        
        for (const row of dataRows) {
          const value = row[colIndex];
          if (value && (typeof value === 'number' || !isNaN(Number(String(value).replace(/[,$]/g, ''))))) {
            hasNumericData = true;
            break;
          }
        }
        
        if (hasNumericData) {
          columnsWithData.add(column);
          // Remove from void list if it has data
          columnsToVoid.delete(column);
        }
      });
    }
    
    // If we couldn't detect from headers, fall back to intelligent defaults
    if (autoMapping.length === 0) {
      
      // Only map columns that aren't marked for voiding
      const columnsToMap = allColumns.filter(col => !columnsToVoid.has(col));
      
      if (columnsToMap.length === 12) {
        // Most likely monthly data for current year
        autoMapping = columnsToMap.map((column, index) => ({
          column,
          period: {
            type: 'month' as const,
            year: currentYear,
            month: (index % 12) + 1,
            label: `${[t('periodMapping.months.short.jan'), t('periodMapping.months.short.feb'), t('periodMapping.months.short.mar'), t('periodMapping.months.short.apr'), t('periodMapping.months.short.may'), t('periodMapping.months.short.jun'), t('periodMapping.months.short.jul'), t('periodMapping.months.short.aug'), t('periodMapping.months.short.sep'), t('periodMapping.months.short.oct'), t('periodMapping.months.short.nov'), t('periodMapping.months.short.dec')][index % 12]} ${currentYear}`
          }
        }));
      } else if (columnsToMap.length === 24) {
        // Likely 2 years of monthly data
        autoMapping = columnsToMap.map((column, index) => {
          const monthIndex = index % 12;
          const yearOffset = Math.floor(index / 12);
          return {
            column,
            period: {
              type: 'month' as const,
              year: currentYear - 1 + yearOffset,
              month: monthIndex + 1,
              label: `${[t('periodMapping.months.short.jan'), t('periodMapping.months.short.feb'), t('periodMapping.months.short.mar'), t('periodMapping.months.short.apr'), t('periodMapping.months.short.may'), t('periodMapping.months.short.jun'), t('periodMapping.months.short.jul'), t('periodMapping.months.short.aug'), t('periodMapping.months.short.sep'), t('periodMapping.months.short.oct'), t('periodMapping.months.short.nov'), t('periodMapping.months.short.dec')][monthIndex]} ${currentYear - 1 + yearOffset}`
            }
          };
        });
      } else if (columnsToMap.length === 4 || columnsToMap.length === 8) {
        // Likely quarterly data
        autoMapping = columnsToMap.map((column, index) => {
          const quarterIndex = index % 4;
          const yearOffset = Math.floor(index / 4);
          return {
            column,
            period: {
              type: 'quarter' as const,
              year: currentYear + yearOffset,
              quarter: quarterIndex + 1,
              label: `Q${quarterIndex + 1} ${currentYear + yearOffset}`
            }
          };
        });
      } else {
        // Default to monthly starting from current month
        autoMapping = columnsToMap.map((column, index) => {
          const totalMonths = currentMonth - 1 + index;
          const yearOffset = Math.floor(totalMonths / 12);
          const monthIndex = totalMonths % 12;
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
    }
    
    // For columns that weren't mapped, add them to voided set
    const mappedColumns = new Set(autoMapping.map(m => m.column));
    allColumns.forEach(col => {
      if (!mappedColumns.has(col)) {
        columnsToVoid.add(col);
      }
    });
    
    // Set the voided columns
    setVoidedColumns(columnsToVoid);
    
    // Set the mapping
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

  // Helper functions for bulk operations
  const selectAllColumns = () => {
    setVoidedColumns(new Set());
    // Create mapping for all columns
    const allMapping = columns.map((column, index) => {
      const monthIndex = index % 12;
      const yearOffset = Math.floor(index / 12);
      return {
        column,
        period: {
          type: 'month' as const,
          year: new Date().getFullYear() + yearOffset,
          month: monthIndex + 1,
          label: `${[t('periodMapping.months.short.jan'), t('periodMapping.months.short.feb'), t('periodMapping.months.short.mar'), t('periodMapping.months.short.apr'), t('periodMapping.months.short.may'), t('periodMapping.months.short.jun'), t('periodMapping.months.short.jul'), t('periodMapping.months.short.aug'), t('periodMapping.months.short.sep'), t('periodMapping.months.short.oct'), t('periodMapping.months.short.nov'), t('periodMapping.months.short.dec')][monthIndex]} ${new Date().getFullYear() + yearOffset}`
        }
      };
    });
    onChange(allMapping);
  };

  const deselectAllColumns = () => {
    setVoidedColumns(new Set(columns));
    onChange([]);
  };

  // Helper functions for actual/projected periods
  const findPeriodInMapping = (period: PeriodDefinition): PeriodMapping | undefined => {
    return currentMapping.find(mapping => 
      mapping.period.type === period.type &&
      mapping.period.year === period.year &&
      mapping.period.month === period.month &&
      mapping.period.quarter === period.quarter &&
      mapping.period.customValue === period.customValue
    );
  };

  const isPeriodActual = (mapping: PeriodMapping): boolean => {
    if (!lastActualPeriod) return false; // No actual period set, all are projected
    
    // Compare periods to determine if this period is actual or projected
    const currentPeriodDate = getPeriodSortKey(mapping.period);
    const lastActualDate = getPeriodSortKey(lastActualPeriod);
    
    return currentPeriodDate <= lastActualDate;
  };

  const getPeriodSortKey = (period: PeriodDefinition): number => {
    // Create a sortable number for period comparison
    // Format: YYYYMMDD (year + month/quarter as MM + day as 01)
    const year = period.year || 0;
    let month = 1;
    
    if (period.type === 'month' && period.month) {
      month = period.month;
    } else if (period.type === 'quarter' && period.quarter) {
      month = (period.quarter - 1) * 3 + 1; // Q1=1, Q2=4, Q3=7, Q4=10
    } else if (period.type === 'year') {
      month = 12; // Year periods go at end of year
    }
    
    return year * 10000 + month * 100 + 1;
  };

  const getAvailablePeriods = () => {
    return currentMapping.map(mapping => ({
      mapping,
      label: mapping.period.label,
      value: JSON.stringify(mapping.period)
    })).sort((a, b) => getPeriodSortKey(a.mapping.period) - getPeriodSortKey(b.mapping.period));
  };

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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectAllColumns}
              className="px-4 py-2 text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition-colors duration-150"
              title="Include all columns"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={deselectAllColumns}
              className="px-4 py-2 text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition-colors duration-150"
              title="Exclude all columns"
            >
              Deselect All
            </button>
            <button
              type="button"
              onClick={autoDetectPeriods}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 border-0 shadow-lg whitespace-nowrap rounded-lg font-medium transition-colors duration-150"
            >
              <Wand2 className="h-4 w-4" />
              {t('periodMapping.autoDetect')}
            </button>
          </div>
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

        <div className="space-y-4 relative" style={{ contain: 'layout' }}>
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
            
            // Determine if this period is actual or projected (for cash flow)
            const isActual = configurationType === 'cashflow' && columnMapping && isPeriodActual(columnMapping);
            const isProjected = configurationType === 'cashflow' && columnMapping && !isPeriodActual(columnMapping);

            return (
              <div key={column} className={`grid grid-cols-6 gap-4 items-center relative transition-colors duration-200 ${isVoided ? 'opacity-50' : ''} ${
                isActual ? 'bg-green-50' : 
                isProjected ? 'bg-orange-50' : ''
              }`} style={{
                boxShadow: isActual ? 'inset 4px 0 0 #10b981' : 
                          isProjected ? 'inset 4px 0 0 #f97316' : 'none'
              }}>
                {/* Clickable Column - allows voiding */}
                <div 
                  className={`font-mono text-sm font-medium rounded px-2 py-1 text-center cursor-pointer transition-colors duration-150 ${
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
                    <NativeSelect
                      value={columnMapping.period.type}
                      onValueChange={(value: string) => 
                        updatePeriod(index, { type: value as 'month' | 'quarter' | 'year' | 'custom' })
                      }
                    >
                      <NativeSelectItem value="month">{t('periodMapping.type.monthly')}</NativeSelectItem>
                      <NativeSelectItem value="quarter">{t('periodMapping.type.quarterly')}</NativeSelectItem>
                      <NativeSelectItem value="year">{t('periodMapping.type.yearly')}</NativeSelectItem>
                      <NativeSelectItem value="custom">{t('periodMapping.type.custom')}</NativeSelectItem>
                    </NativeSelect>
                    
                    {/* Year */}
                    <NativeSelect
                      value={columnMapping.period.year.toString()}
                      onValueChange={(value) => 
                        updatePeriod(index, { year: parseInt(value) })
                      }
                    >
                      {Array.from({ length: 6 }, (_, i) => {
                        const year = new Date().getFullYear() + i - 1;
                        return (
                          <NativeSelectItem key={year} value={year.toString()}>
                            {year}
                          </NativeSelectItem>
                        );
                      })}
                    </NativeSelect>
                    
                    {/* Month/Quarter selector based on type */}
                    {columnMapping.period.type === 'month' && (
                      <NativeSelect
                        value={columnMapping.period.month?.toString()}
                        onValueChange={(value) => 
                          updatePeriod(index, { month: parseInt(value) })
                        }
                      >
                        {[t('periodMapping.months.january'), t('periodMapping.months.february'), t('periodMapping.months.march'), t('periodMapping.months.april'), t('periodMapping.months.may'), t('periodMapping.months.june'), 
                          t('periodMapping.months.july'), t('periodMapping.months.august'), t('periodMapping.months.september'), t('periodMapping.months.october'), t('periodMapping.months.november'), t('periodMapping.months.december')]
                          .map((month, i) => (
                            <NativeSelectItem key={i + 1} value={(i + 1).toString()}>
                              {month}
                            </NativeSelectItem>
                          ))}
                      </NativeSelect>
                    )}
                    
                    {columnMapping.period.type === 'quarter' && (
                      <NativeSelect
                        value={columnMapping.period.quarter?.toString()}
                        onValueChange={(value) => 
                          updatePeriod(index, { quarter: parseInt(value) })
                        }
                      >
                        <NativeSelectItem value="1">Q1</NativeSelectItem>
                        <NativeSelectItem value="2">Q2</NativeSelectItem>
                        <NativeSelectItem value="3">Q3</NativeSelectItem>
                        <NativeSelectItem value="4">Q4</NativeSelectItem>
                      </NativeSelect>
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
                    
                    {/* Preview with Action Button for Cash Flow */}
                    {configurationType === 'cashflow' ? (
                      <div className="flex items-center gap-2">
                        <div className="text-sm text-gray-600 font-mono">
                          {columnMapping.column}→{generateLabel(columnMapping.period)}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!onLastActualPeriodChange) {
                              return;
                            }
                            onLastActualPeriodChange(columnMapping.period);
                          }}
                          className={`text-xs px-3 py-1 rounded-full font-medium transition-colors duration-150 ${
                            isActual 
                              ? 'bg-green-500 text-white hover:bg-green-600 shadow-md' 
                              : isProjected 
                                ? 'bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-300'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                          title={isActual 
                            ? (isSpanish ? 'Este es el último período real' : 'This is the last actual period')
                            : (isSpanish ? 'Hacer este el último período real' : 'Make this the last actual period')
                          }
                        >
                          {isActual 
                            ? (isSpanish ? '✓ Último Real' : '✓ Last Actual')
                            : (isSpanish ? 'Hacer Real' : 'Set Actual')
                          }
                        </button>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600 font-mono">
                        {columnMapping.column}→{generateLabel(columnMapping.period)}
                      </div>
                    )}
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