'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Layers, 
  Plus, 
  Trash2, 
  Edit, 
  Eye,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';
import { CashFlowConfiguration, PLConfiguration } from '@/lib/types/configurations';
import { useExcelPreview } from '@/hooks/useExcelPreview';
import { ExcelGrid } from './ExcelGrid';

interface CategoryBuilderProps {
  configuration: CashFlowConfiguration | PLConfiguration;
  onChange: (config: CashFlowConfiguration | PLConfiguration) => void;
  configurationId?: string;
}

interface CategoryFormData {
  key: string;
  row: number;
  required: boolean;
  label?: {
    en: string;
    es: string;
  };
}

export function CategoryBuilder({ configuration, onChange, configurationId }: CategoryBuilderProps) {
  const [activeSection, setActiveSection] = useState(
    configuration.type === 'cashflow' ? 'inflows' : 'revenue'
  );
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [showExcelPreview, setShowExcelPreview] = useState(false);
  const [selectedCategoryForMapping, setSelectedCategoryForMapping] = useState<string | null>(null);
  const { excelData, loading, error } = useExcelPreview(configurationId);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showExcelPreview) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [showExcelPreview]);

  // Initialize structure if it doesn't exist
  useEffect(() => {
    if (!configuration.structure) {
      if (configuration.type === 'cashflow') {
        const updatedConfig: CashFlowConfiguration = { 
          ...configuration,
          type: 'cashflow',
          structure: { 
            periodsRow: 0,
            periodsRange: "A1:A1",
            dataRows: { 
              initialBalance: 0, 
              finalBalance: 0, 
              totalInflows: 0, 
              totalOutflows: 0, 
              monthlyGeneration: 0 
            },
            categories: { inflows: {}, outflows: {} }
          } 
        };
        onChange(updatedConfig);
      } else {
        const updatedConfig: PLConfiguration = { 
          ...configuration,
          type: 'pnl',
          structure: { 
            periodsRow: 0,
            periodsRange: "A1:A1",
            categoriesColumn: "A",
            dataRows: {
              totalRevenue: 0,
              grossIncome: 0,
              cogs: 0,
              totalOpex: 0,
              totalOutcome: 0,
              grossProfit: 0,
              grossMargin: 0,
              ebitda: 0,
              ebitdaMargin: 0,
              earningsBeforeTaxes: 0,
              netIncome: 0,
              otherIncome: 0,
              otherExpenses: 0,
              taxes: 0
            },
            categories: { revenue: {}, cogs: {}, opex: {}, otherIncome: {}, otherExpenses: {}, taxes: {} }
          } 
        };
        onChange(updatedConfig);
      }
    } else if (!configuration.structure.categories) {
      if (configuration.type === 'cashflow') {
        const updatedConfig: CashFlowConfiguration = { 
          ...configuration,
          type: 'cashflow',
          structure: { 
            ...configuration.structure,
            categories: { inflows: {}, outflows: {} }
          } 
        };
        onChange(updatedConfig);
      } else {
        const updatedConfig: PLConfiguration = { 
          ...configuration,
          type: 'pnl',
          structure: { 
            ...configuration.structure,
            categories: { revenue: {}, cogs: {}, opex: {}, otherIncome: {}, otherExpenses: {}, taxes: {} }
          } 
        };
        onChange(updatedConfig);
      }
    }
  }, [configuration.structure, configuration.type, onChange]);

  // Get available sections based on configuration type - memoized to prevent re-renders
  const sections = useMemo(() => {
    if (configuration.type === 'cashflow') {
      return [
        { key: 'inflows', label: 'Entradas de Efectivo' },
        { key: 'outflows', label: 'Salidas de Efectivo' }
      ];
    } else {
      return [
        { key: 'revenue', label: 'Ingresos' },
        { key: 'cogs', label: 'Costo de Ventas' },
        { key: 'opex', label: 'Gastos Operativos' },
        { key: 'otherIncome', label: 'Otros Ingresos' },
        { key: 'otherExpenses', label: 'Otros Gastos' },
        { key: 'taxes', label: 'Impuestos' }
      ];
    }
  }, [configuration.type]);

  // Get categories for a specific section
  const getCategories = (sectionKey: string) => {
    if (!configuration.structure?.categories) {
      return {};
    }
    return (configuration.structure.categories as any)[sectionKey] || {};
  };

  // Add new category - memoized to prevent re-renders
  const addCategory = useCallback((sectionKey: string, categoryData: CategoryFormData) => {
    console.log('🔵 Adding category:', { sectionKey, categoryData });
    console.log('🔵 Current configuration:', configuration);
    
    // Create a deep copy to ensure React sees the change
    const updatedConfig = JSON.parse(JSON.stringify(configuration));
    
    if (!updatedConfig.structure) {
      updatedConfig.structure = {
        periodsRow: 0,
        periodsRange: "A1:A1",
        dataRows: {},
        categories: {}
      };
    }
    if (!updatedConfig.structure.categories) {
      updatedConfig.structure.categories = configuration.type === 'cashflow' 
        ? { inflows: {}, outflows: {} }
        : { revenue: {}, cogs: {}, opex: {}, otherIncome: {}, otherExpenses: {}, taxes: {} };
    }
    if (!updatedConfig.structure.categories[sectionKey]) {
      updatedConfig.structure.categories[sectionKey] = {};
    }
    
    updatedConfig.structure.categories[sectionKey][categoryData.key] = {
      row: categoryData.row,
      required: categoryData.required,
      subcategories: {}
    };

    console.log('🟢 Updated config categories:', updatedConfig.structure.categories);
    console.log('🟢 Calling onChange with updated config');
    onChange(updatedConfig);
    console.log('🟢 onChange called successfully');
  }, [configuration, onChange]);

  // Update category - memoized to prevent re-renders
  const updateCategory = useCallback((sectionKey: string, categoryKey: string, categoryData: Partial<CategoryFormData>) => {
    const updatedConfig = { ...configuration };
    
    if (!updatedConfig.structure?.categories) return;
    
    const categories = (updatedConfig.structure.categories as any)[sectionKey] || {};
    
    if (categories[categoryKey]) {
      categories[categoryKey] = {
        ...categories[categoryKey],
        ...categoryData
      };
    }

    (updatedConfig.structure.categories as any)[sectionKey] = categories;
    onChange(updatedConfig);
  }, [configuration, onChange]);

  // Delete category - memoized to prevent re-renders
  const deleteCategory = useCallback((sectionKey: string, categoryKey: string) => {
    const updatedConfig = { ...configuration };
    
    if (!updatedConfig.structure?.categories) return;
    
    const categories = (updatedConfig.structure.categories as any)[sectionKey] || {};
    
    delete categories[categoryKey];
    (updatedConfig.structure.categories as any)[sectionKey] = categories;
    onChange(updatedConfig);
  }, [configuration, onChange]);

  // Calculate section stats
  const calculateSectionStats = (sectionKey: string) => {
    const categories = getCategories(sectionKey);
    const categoryCount = Object.keys(categories).length;
    const mappedCount = Object.values(categories).filter((cat: any) => cat.row > 0).length;
    const unmappedCount = categoryCount - mappedCount;
    
    return { categoryCount, mappedCount, unmappedCount };
  };

  // Simple Category Form Component
  const CategoryForm = ({ sectionKey, onClose }: { 
    sectionKey: string, 
    onClose: () => void
  }) => {
    const [formData, setFormData] = useState<CategoryFormData>({
      key: '',
      row: 0,
      required: false
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = () => {
      
      if (submitting) {
        console.log('Already submitting, ignoring');
        return;
      }
      
      if (!formData.key.trim()) {
        console.error('Category name is required');
        return;
      }
      
      try {
        setSubmitting(true);
        console.log('Form submitting with data:', formData);
        addCategory(sectionKey, formData);
        // Reset form data
        setFormData({
          key: '',
          row: 0,
          required: false
        });
        console.log('Category added successfully, closing form');
        onClose();
      } catch (error) {
        console.error('Error adding category:', error);
      } finally {
        setSubmitting(false);
      }
    };

    const handleMapExcelRow = () => {
      if (!formData.key.trim()) {
        console.error('Please enter a category name first');
        return;
      }
      
      addCategory(sectionKey, { ...formData, row: 0 });
      setSelectedCategoryForMapping(formData.key);
      setShowExcelPreview(true);
      onClose();
    };

    return (
      <div className="p-4 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50">
        <h4 className="font-medium text-blue-900 mb-4">Agregar Categoría</h4>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="categoryKey">Nombre de Categoría *</Label>
              <Input
                id="categoryKey"
                value={formData.key}
                onChange={(e) => setFormData({...formData, key: e.target.value})}
                placeholder="ej., salarios"
                className="bg-white"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="categoryRow">Fila Excel</Label>
              <div className="flex gap-2">
                <Input
                  id="categoryRow"
                  type="number"
                  min="1"
                  value={formData.row || ''}
                  onChange={(e) => setFormData({...formData, row: parseInt(e.target.value) || 0})}
                  placeholder="Número de fila"
                  className="bg-white"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleMapExcelRow}
                  leftIcon={<FileSpreadsheet className="h-4 w-4" />}
                >
                  Mapear
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="required"
              checked={formData.required}
              onChange={(e) => setFormData({...formData, required: e.target.checked})}
            />
            <Label htmlFor="required">Campo requerido</Label>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="button" disabled={submitting} onClick={handleSubmit}>
              {submitting ? 'Agregando...' : 'Agregar Categoría'}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Main Card with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Categorías
          </CardTitle>
          <CardDescription>
            Define las categorías para tu configuración de {configuration.type === 'cashflow' ? 'Cash Flow' : 'P&L'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {/* Section Tabs (Inflow/Outflow) */}
          <Tabs value={activeSection} onValueChange={setActiveSection} className="w-full">
            <div className="border-b">
              <TabsList className="grid w-full grid-cols-2 h-auto p-0 bg-transparent rounded-none">
                {sections.map((section) => {
                  const stats = calculateSectionStats(section.key);
                  return (
                    <TabsTrigger 
                      key={section.key} 
                      value={section.key}
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3"
                    >
                      <div className="w-full">
                        <div className="font-medium">{section.label}</div>
                        <div className="text-xs mt-1 text-muted-foreground">
                          {stats.mappedCount}/{stats.categoryCount}
                          {stats.mappedCount === stats.categoryCount && stats.categoryCount > 0 && (
                            <CheckCircle className="inline-block ml-1 h-3 w-3 text-green-600" />
                          )}
                        </div>
                      </div>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>

            {sections.map((section) => {
              const categories = getCategories(section.key);
              const stats = calculateSectionStats(section.key);

              return (
                <TabsContent key={section.key} value={section.key} className="p-6">
                  <div className="space-y-4">
                    {/* Action Buttons - Context Dependent */}
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium">
                        {stats.categoryCount > 0 
                          ? `${stats.categoryCount} categorías (${stats.mappedCount} mapeadas)`
                          : 'Sin categorías'}
                      </h3>
                      <div className="flex items-center gap-3">
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={() => setShowExcelPreview(true)}
                          leftIcon={<Eye className="h-4 w-4" />}
                        >
                          Ver Excel
                        </Button>
                        <Button 
                          type="button"
                          onClick={() => setEditingCategory('new')}
                          leftIcon={<Plus className="h-4 w-4" />}
                        >
                          Agregar Categoría
                        </Button>
                      </div>
                    </div>
                {/* Categories List */}
                {stats.categoryCount > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(categories).map(([categoryKey, categoryData]: [string, any]) => (
                      <div key={categoryKey} className="flex items-center justify-between p-4 bg-white border rounded-lg">
                        <div className="flex items-center gap-4">
                          <span className="font-medium">{categoryKey}</span>
                          {categoryData.row > 0 ? (
                            <Badge variant="outline" className="text-green-600">Fila {categoryData.row}</Badge>
                          ) : (
                            <span className="text-gray-400 text-sm">Sin mapear</span>
                          )}
                          {categoryData.row > 0 ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedCategoryForMapping(categoryKey);
                              setShowExcelPreview(true);
                            }}
                          >
                            <FileSpreadsheet className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteCategory(section.key, categoryKey)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {/* Add Category Form - Inline */}
                {editingCategory === 'new' && activeSection === section.key && (
                  <CategoryForm 
                    key={`form-${section.key}-${Date.now()}`}
                    sectionKey={section.key} 
                    onClose={() => setEditingCategory(null)}
                  />
                )}

                    {/* Empty State */}
                    {stats.categoryCount === 0 && !editingCategory && (
                      <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                        <Layers className="h-10 w-10 mx-auto mb-4 text-gray-400" />
                        <p className="font-medium text-gray-700 mb-1">No hay categorías definidas</p>
                        <p className="text-sm text-gray-500">Agrega categorías para organizar tu {section.label.toLowerCase()}</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>

      {/* Excel Preview Modal */}
      {showExcelPreview && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            margin: 0,
            padding: 0
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowExcelPreview(false);
              setSelectedCategoryForMapping(null);
            }
          }}
        >
          <div 
            className="bg-white rounded-lg w-[95vw] max-w-7xl h-[90vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-shrink-0 p-6 border-b bg-white rounded-t-lg">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium">Vista Previa Excel</h3>
                  {selectedCategoryForMapping && (
                    <p className="text-sm text-blue-600 mt-1">
                      Haz clic en una fila para mapear: <strong>{selectedCategoryForMapping}</strong>
                    </p>
                  )}
                </div>
                <Button type="button" variant="outline" onClick={() => {
                  setShowExcelPreview(false);
                  setSelectedCategoryForMapping(null);
                }}>
                  Cerrar
                </Button>
              </div>
              
              {loading && (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-sm">Cargando datos Excel...</span>
                </div>
              )}
              
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg mt-4">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}
            </div>
            
            <div className="flex-1 p-6 bg-white rounded-b-lg" style={{ overflow: 'auto' }}>
              {excelData && (
                <div className="h-full">
                  <ExcelGrid
                    excelData={excelData}
                    searchPlaceholder="Buscar..."
                    onRowClick={(rowNumber) => {
                      if (selectedCategoryForMapping) {
                        updateCategory(activeSection, selectedCategoryForMapping, { row: rowNumber });
                        setShowExcelPreview(false);
                        setSelectedCategoryForMapping(null);
                      }
                    }}
                    selectedRow={null}
                    showRowSelection={true}
                    isFullHeight={true}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}