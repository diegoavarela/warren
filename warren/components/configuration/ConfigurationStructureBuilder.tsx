'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { HelpCircle, Grid3x3, Database, Layers, Eye } from 'lucide-react';
import { CashFlowConfiguration, PLConfiguration } from '@/lib/types/configurations';
import { Button } from '@/components/ui/Button';
import { ExcelGridHelper } from './ExcelGridHelper';
import { DataRowsEditor } from './DataRowsEditor';
import { CategoryBuilder } from './CategoryBuilder';
import { ConfigurationPreview } from './ConfigurationPreview';

interface ConfigurationStructureBuilderProps {
  configuration: CashFlowConfiguration | PLConfiguration;
  onChange: (config: CashFlowConfiguration | PLConfiguration) => void;
  onValidate?: (isValid: boolean, errors: string[]) => void;
}

export function ConfigurationStructureBuilder({
  configuration,
  onChange,
  onValidate
}: ConfigurationStructureBuilderProps) {
  const [activeTab, setActiveTab] = useState('structure');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const getTypeColor = (type: string) => {
    return type === 'cashflow' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
  };

  const getTypeName = (type: string) => {
    return type === 'cashflow' ? 'Cash Flow' : 'P&L Statement';
  };

  const validateConfiguration = () => {
    const errors: string[] = [];
    
    // Basic validation
    if (!configuration.name?.trim()) {
      errors.push('Configuration name is required');
    }
    
    if (!configuration.structure.periodsRow || configuration.structure.periodsRow < 1) {
      errors.push('Periods row must be a valid row number');
    }
    
    if (!configuration.structure.periodsRange?.match(/^[A-Z]+\d+:[A-Z]+\d+$/)) {
      errors.push('Periods range must be in Excel format (e.g., B8:M8)');
    }

    // Type-specific validation
    if (configuration.type === 'cashflow') {
      const cashflowConfig = configuration as CashFlowConfiguration;
      const requiredRows = ['initialBalance', 'finalBalance', 'totalInflows', 'totalOutflows'];
      requiredRows.forEach(row => {
        if (!cashflowConfig.structure.dataRows[row as keyof typeof cashflowConfig.structure.dataRows] || 
            cashflowConfig.structure.dataRows[row as keyof typeof cashflowConfig.structure.dataRows] < 1) {
          errors.push(`${row} row is required and must be a valid row number`);
        }
      });
    } else {
      const plConfig = configuration as PLConfiguration;
      if (!plConfig.structure.categoriesColumn?.match(/^[A-Z]+$/)) {
        errors.push('Categories column must be a valid Excel column (e.g., B)');
      }
    }

    setValidationErrors(errors);
    const isValid = errors.length === 0;
    onValidate?.(isValid, errors);
    
    return isValid;
  };

  return (
    <div className="space-y-6">
      {/* Configuration Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle>Configuration Structure Builder</CardTitle>
              <Badge variant="secondary" className={getTypeColor(configuration.type)}>
                {getTypeName(configuration.type)}
              </Badge>
            </div>
            <Button 
              variant="outline" 
              onClick={validateConfiguration}
              leftIcon={<HelpCircle className="h-4 w-4" />}
            >
              Validate Configuration
            </Button>
          </div>
          <CardDescription>
            Build your Excel parsing configuration using visual tools instead of raw JSON
          </CardDescription>
          
          {validationErrors.length > 0 && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-medium text-red-800 mb-2">Configuration Errors:</h4>
              <ul className="list-disc list-inside space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="text-red-700 text-sm">{error}</li>
                ))}
              </ul>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Main Configuration Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="structure" className="flex items-center gap-2">
            <Grid3x3 className="h-4 w-4" />
            Excel Structure
          </TabsTrigger>
          <TabsTrigger value="datarows" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Data Rows
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Preview & Test
          </TabsTrigger>
        </TabsList>

        <TabsContent value="structure" className="space-y-6">
          <ExcelGridHelper
            periodsRow={configuration.structure.periodsRow}
            periodsRange={configuration.structure.periodsRange}
            categoriesColumn={configuration.type === 'pnl' ? (configuration as PLConfiguration).structure.categoriesColumn : undefined}
            onPeriodsRowChange={(row) => {
              const updatedConfig = { ...configuration };
              updatedConfig.structure.periodsRow = row;
              onChange(updatedConfig);
            }}
            onPeriodsRangeChange={(range) => {
              const updatedConfig = { ...configuration };
              updatedConfig.structure.periodsRange = range;
              onChange(updatedConfig);
            }}
            onCategoriesColumnChange={configuration.type === 'pnl' ? (column) => {
              const updatedConfig = { ...configuration } as PLConfiguration;
              updatedConfig.structure.categoriesColumn = column;
              onChange(updatedConfig);
            } : undefined}
            configurationType={configuration.type}
          />
        </TabsContent>

        <TabsContent value="datarows" className="space-y-6">
          <DataRowsEditor
            configuration={configuration}
            onChange={onChange}
          />
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <CategoryBuilder
            configuration={configuration}
            onChange={onChange}
          />
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <ConfigurationPreview
            configuration={configuration}
          />
        </TabsContent>
      </Tabs>

      {/* Help Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Configuration Help
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Excel Structure</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Periods Row: Row containing month/period headers</li>
                <li>• Periods Range: Excel range for period headers (e.g., B8:M8)</li>
                <li>• Categories Column: Column with category names (P&L only)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Data Rows</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Map key financial metrics to specific Excel rows</li>
                <li>• Required fields ensure proper parsing</li>
                <li>• Row numbers refer to Excel row positions</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Categories</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Organize data into logical groups</li>
                <li>• Support nested subcategories</li>
                <li>• Can include multilingual labels</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Preview & Test</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Validate configuration before saving</li>
                <li>• Test with sample Excel files</li>
                <li>• Export/import configuration presets</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}