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

interface PeriodMappingEditorProps {
  periodsRange: string; // e.g., "B3:M3"
  currentMapping?: PeriodMapping[];
  onChange: (mapping: PeriodMapping[]) => void;
  onValidate?: (isValid: boolean, errors: string[]) => void;
}

export function PeriodMappingEditor({
  periodsRange,
  currentMapping = [],
  onChange,
  onValidate
}: PeriodMappingEditorProps) {
  const [mapping, setMapping] = useState<PeriodMapping[]>(currentMapping);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [voidedColumns, setVoidedColumns] = useState<Set<string>>(new Set());

  // Update mapping when currentMapping prop changes
  useEffect(() => {
    console.log('📥 PeriodMappingEditor received currentMapping:', currentMapping);
    setMapping(currentMapping);
  }, [currentMapping]);

  // Parse the periods range to get columns
  const getColumnsFromRange = (range: string): string[] => {
    const match = range.match(/^([A-Z]+)\d+:([A-Z]+)\d+$/);
    if (!match) return [];
    
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
  };

  const columns = getColumnsFromRange(periodsRange);

  // Toggle voided columns
  const toggleVoidedColumn = (column: string) => {
    const newVoidedColumns = new Set(voidedColumns);
    if (newVoidedColumns.has(column)) {
      newVoidedColumns.delete(column);
      // Re-add to mapping if it was voided
      const existingIndex = mapping.findIndex(m => m.column === column);
      if (existingIndex === -1) {
        const newMapping = [...mapping, {
          column,
          period: {
            type: 'month' as const,
            year: new Date().getFullYear(),
            month: 1,
            label: 'Jan ' + new Date().getFullYear()
          }
        }];
        setMapping(newMapping);
        onChange(newMapping);
      }
    } else {
      newVoidedColumns.add(column);
      // Remove from mapping if it was included
      const newMapping = mapping.filter(m => m.column !== column);
      setMapping(newMapping);
      onChange(newMapping);
    }
    setVoidedColumns(newVoidedColumns);
  };

  // Initialize mapping if empty
  useEffect(() => {
    if (mapping.length === 0 && columns.length > 0) {
      const defaultMapping = columns.map((column, index) => ({
        column,
        period: {
          type: 'month' as const,
          year: 2025,
          month: (index % 12) + 1,
          label: `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][index % 12]} 2025`
        }
      }));
      console.log('🔧 Initializing default period mapping:', defaultMapping);
      setMapping(defaultMapping);
      onChange(defaultMapping);
    }
  }, [columns, mapping.length, onChange]);

  // Update period definition
  const updatePeriod = (columnIndex: number, updates: Partial<PeriodDefinition>) => {
    const newMapping = [...mapping];
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
      
      setMapping(newMapping);
      console.log('🔄 Period mapping updated:', newMapping);
      onChange(newMapping);
      validateMapping(newMapping);
    }
  };

  // Generate display label
  const generateLabel = (period: PeriodDefinition): string => {
    switch (period.type) {
      case 'month':
        if (period.month && period.year) {
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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
        return period.customValue || 'Custom Period';
    }
    return 'Invalid Period';
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
          label: `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][index % 12]} ${currentYear}`
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
            label: `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][monthIndex]} ${currentYear + yearOffset}`
          }
        };
      });
    }
    
    setMapping(autoMapping);
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
      errors.push(`Duplicate periods detected: ${duplicates.join(', ')}`);
    }
    
    // Check for missing required fields
    mappingToValidate.forEach((mapping, index) => {
      const { period } = mapping;
      if (!period.year) {
        errors.push(`Column ${mapping.column}: Year is required`);
      }
      
      if (period.type === 'month' && (!period.month || period.month < 1 || period.month > 12)) {
        errors.push(`Column ${mapping.column}: Valid month (1-12) is required for monthly periods`);
      }
      
      if (period.type === 'quarter' && (!period.quarter || period.quarter < 1 || period.quarter > 4)) {
        errors.push(`Column ${mapping.column}: Valid quarter (1-4) is required for quarterly periods`);
      }
      
      if (period.type === 'custom' && !period.customValue?.trim()) {
        errors.push(`Column ${mapping.column}: Custom value is required for custom periods`);
      }
    });
    
    setValidationErrors(errors);
    onValidate?.(errors.length === 0, errors);
  };

  // Run validation when mapping changes
  useEffect(() => {
    validateMapping(mapping);
  }, [mapping]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Period Mapping Configuration
            </CardTitle>
            <CardDescription>
              Define exactly what each Excel column represents. No more guessing!
            </CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={autoDetectPeriods}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 border-0 shadow-lg"
          >
            <Wand2 className="h-4 w-4" />
            Smart Auto-detect
          </Button>
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
            <div>Excel Column</div>
            <div>Period Type</div>
            <div>Year</div>
            <div>Month/Quarter</div>
            <div>Display Label</div>
            <div>Preview</div>
          </div>

          {/* Show all columns (active and voided) */}
          {columns.map((column) => {
            const columnMapping = mapping.find(m => m.column === column);
            const isVoided = voidedColumns.has(column);
            const index = mapping.findIndex(m => m.column === column);
            
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
                  title={isVoided ? 'Click to include this column' : 'Click to exclude this column (for percentages, totals, etc.)'}
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
                        <SelectItem value="month">Monthly</SelectItem>
                        <SelectItem value="quarter">Quarterly</SelectItem>
                        <SelectItem value="year">Yearly</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
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
                          {['January', 'February', 'March', 'April', 'May', 'June', 
                            'July', 'August', 'September', 'October', 'November', 'December']
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
                        placeholder="Custom period name"
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
                    <div className="text-sm text-gray-400 italic">Excluded</div>
                    <div className="text-sm text-gray-400 italic">—</div>
                    <div className="text-sm text-gray-400 italic">—</div>
                    <div className="text-sm text-gray-400 italic">—</div>
                    <div className="text-sm text-gray-400 italic">Not mapped</div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {validationErrors.length === 0 && mapping.length > 0 && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Period mapping is valid! {mapping.length} columns mapped successfully.
            </AlertDescription>
          </Alert>
        )}

        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">How Period Mapping Works</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Each Excel column is explicitly mapped to a specific period</li>
            <li>• No more guessing or interpreting Excel date formats</li>
            <li>• Dashboard will show exactly what you configure here</li>
            <li>• Supports monthly, quarterly, yearly, or custom periods</li>
            <li>• Click on column headers to exclude non-data columns (percentages, totals, etc.)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}