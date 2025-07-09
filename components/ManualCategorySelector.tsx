"use client";

import { useState, useMemo, useEffect } from "react";
import { 
  XMarkIcon, 
  MagnifyingGlassIcon, 
  CheckIcon,
  FolderIcon,
  SparklesIcon,
  PlusIcon
} from "@heroicons/react/24/outline";
import { AccountClassification } from "@/types";
import { getCombinedCategories, ExtendedFinancialCategory } from "@/lib/custom-categories";
import { useAuth } from "@/contexts/AuthContext";

interface ManualCategorySelectorProps {
  classification: AccountClassification;
  statementType: 'balance_sheet' | 'profit_loss' | 'cash_flow';
  rawData: any[][];
  rowIndex: number;
  accountNameColumn: number;
  accountCodeColumn: number;
  companyId?: string;
  onCategoryChange: (newCategory: string, isInflow: boolean) => void;
  onClose: () => void;
}

// Category button component
function CategoryButton({ 
  category, 
  isSelected, 
  onClick 
}: { 
  category: ExtendedFinancialCategory; 
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full p-3 rounded-lg border text-left transition-all
        hover:shadow-sm hover:border-purple-300
        ${isSelected 
          ? 'border-purple-500 bg-purple-50' 
          : 'border-gray-200 hover:bg-gray-50'
        }
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            {category.categoryType === 'section' && (
              <FolderIcon className="w-4 h-4 text-gray-500" />
            )}
            {category.categoryType === 'total' && (
              <span className="text-gray-500 font-mono text-sm">Σ</span>
            )}
            <div className="font-medium text-sm text-gray-900">
              {category.label}
            </div>
          </div>
          {category.description && (
            <p className="text-xs text-gray-600 mt-0.5">
              {category.description}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {category.isCustom && (
            <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
              Custom
            </span>
          )}
          {isSelected && (
            <CheckIcon className="w-4 h-4 text-purple-600 flex-shrink-0" />
          )}
        </div>
      </div>
    </button>
  );
}

export function ManualCategorySelector({ 
  classification,
  statementType,
  rawData,
  rowIndex,
  accountNameColumn,
  accountCodeColumn,
  companyId,
  onCategoryChange,
  onClose
}: ManualCategorySelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIsInflow, setNewCategoryIsInflow] = useState(true);
  const [newCategoryType, setNewCategoryType] = useState<'account' | 'section' | 'total'>('account');
  const [customCategories, setCustomCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Get account info
  const accountName = accountNameColumn >= 0 && rowIndex >= 0 
    ? String(rawData[rowIndex]?.[accountNameColumn] || '') 
    : classification.accountName;
  const accountCode = accountCodeColumn >= 0 && rowIndex >= 0
    ? String(rawData[rowIndex]?.[accountCodeColumn] || '')
    : '';
  
  // Fetch custom categories when component mounts
  useEffect(() => {
    if (companyId) {
      fetchCustomCategories();
    }
  }, [companyId]);

  // Add escape key handler
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);
  
  const fetchCustomCategories = async () => {
    if (!companyId) return;
    
    setLoading(true);
    try {
      console.log('🔍 Fetching custom categories for company:', companyId);
      const response = await fetch(`/api/companies/${companyId}/categories`);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Fetched custom categories:', data.data?.length || 0, 'categories');
        setCustomCategories(data.data || []);
      } else {
        console.error('❌ Failed to fetch categories:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ Error fetching custom categories:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Get available categories including custom ones
  const availableCategories = useMemo(() => {
    const combined = getCombinedCategories(statementType, customCategories);
    console.log('📊 Combined categories:', {
      statementType,
      customCount: customCategories.length,
      totalCount: combined.length,
      customCategories: combined.filter(c => c.isCustom).map(c => c.label)
    });
    return combined;
  }, [statementType, customCategories]);
  
  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    if (!searchLower) return availableCategories;
    
    return availableCategories.filter(cat => 
      cat.label.toLowerCase().includes(searchLower) ||
      cat.value.toLowerCase().includes(searchLower)
    );
  }, [availableCategories, searchTerm]);
  
  // Group categories by type and flow
  const groupedCategories = useMemo(() => {
    const result: Array<[string, ExtendedFinancialCategory[]]> = [];
    
    // Separate by category type
    const sections = filteredCategories.filter(cat => cat.categoryType === 'section');
    const totals = filteredCategories.filter(cat => cat.categoryType === 'total');
    const accounts = filteredCategories.filter(cat => cat.categoryType === 'account' || !cat.categoryType);
    
    // Add sections first
    if (sections.length > 0) {
      result.push(['📁 SECCIONES', sections]);
    }
    
    // Add totals
    if (totals.length > 0) {
      result.push(['🧮 TOTALES', totals]);
    }
    
    // Add regular accounts separated by flow
    const inflowAccounts = accounts.filter(cat => cat.isInflow);
    const outflowAccounts = accounts.filter(cat => !cat.isInflow);
    
    if (inflowAccounts.length > 0) {
      result.push(['📈 CUENTAS DE INGRESO', inflowAccounts]);
    }
    
    if (outflowAccounts.length > 0) {
      result.push(['📉 CUENTAS DE GASTO', outflowAccounts]);
    }
    
    return result;
  }, [filteredCategories]);
  
  const handleCategorySelect = (category: ExtendedFinancialCategory) => {
    onCategoryChange(category.value, category.isInflow);
  };
  
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim() || !companyId) return;
    
    // Generate a key from the name
    const categoryKey = newCategoryName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
    
    setSaving(true);
    try {
      const response = await fetch(`/api/companies/${companyId}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryKey,
          label: newCategoryName,
          isInflow: newCategoryIsInflow,
          statementType,
          description: `Categoría personalizada para ${newCategoryName}`,
          sortOrder: 999,
          categoryType: newCategoryType
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Category created successfully:', data);
        
        // Refresh categories list
        console.log('🔄 Refreshing categories list...');
        await fetchCustomCategories();
        
        // Select the new category
        console.log('📌 Selecting new category:', categoryKey);
        onCategoryChange(categoryKey, newCategoryIsInflow);
        
        // Reset form
        setShowCreateForm(false);
        setNewCategoryName('');
        setNewCategoryIsInflow(true);
        setNewCategoryType('account');
      } else {
        const error = await response.json();
        alert(`Error al crear categoría: ${error.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error creating category:', error);
      alert('Error al crear la categoría. Por favor intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm"
      onClick={(e) => {
        // Close modal when clicking on backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Categoría para: {accountName}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Selecciona la categoría que mejor describe esta cuenta
                {accountCode && ` (${accountCode})`}
              </p>
              <div className="flex items-center space-x-2 mt-2">
                <SparklesIcon className="w-4 h-4 text-purple-600" />
                <span className="text-xs text-purple-600">
                  Categoría IA actual: {classification.suggestedCategory.replace(/_/g, ' ')} 
                  ({classification.confidence}% confianza)
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          
          {/* Search and Create Button */}
          <div className="mt-4 space-y-3">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar categoría..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                autoFocus={!showCreateForm}
              />
            </div>
            
            {/* Create New Category Button/Form */}
            {!showCreateForm ? (
              <button
                onClick={() => setShowCreateForm(true)}
                className="w-full py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2"
              >
                <span className="text-lg">+</span>
                <span>Crear Nueva Categoría</span>
              </button>
            ) : (
              <div className="border-2 border-purple-400 rounded-lg p-4 bg-purple-50">
                <h4 className="font-medium text-purple-900 mb-3">Nueva Categoría Personalizada</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre de la categoría
                    </label>
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Ej: Gastos de Marketing Digital"
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      autoFocus
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de categoría
                    </label>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <button
                        onClick={() => setNewCategoryType('account')}
                        className={`py-2 px-3 rounded-md border-2 text-sm transition-colors ${
                          newCategoryType === 'account'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-300 text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        📄 Cuenta
                      </button>
                      <button
                        onClick={() => setNewCategoryType('section')}
                        className={`py-2 px-3 rounded-md border-2 text-sm transition-colors ${
                          newCategoryType === 'section'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-300 text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        📁 Sección
                      </button>
                      <button
                        onClick={() => setNewCategoryType('total')}
                        className={`py-2 px-3 rounded-md border-2 text-sm transition-colors ${
                          newCategoryType === 'total'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-300 text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        Σ Total
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de flujo
                    </label>
                    <div className="flex space-x-4">
                      <button
                        onClick={() => setNewCategoryIsInflow(true)}
                        className={`flex-1 py-2 px-4 rounded-md border-2 transition-colors ${
                          newCategoryIsInflow
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-300 text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        ↑ Ingreso
                      </button>
                      <button
                        onClick={() => setNewCategoryIsInflow(false)}
                        className={`flex-1 py-2 px-4 rounded-md border-2 transition-colors ${
                          !newCategoryIsInflow
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : 'border-gray-300 text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        ↓ Gasto
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 pt-2">
                    <button
                      onClick={handleCreateCategory}
                      disabled={!newCategoryName.trim() || saving || !companyId}
                      className="flex-1 py-2 px-4 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      {saving ? 'Guardando...' : 'Crear y Asignar'}
                    </button>
                    <button
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewCategoryName('');
                        setNewCategoryIsInflow(true);
                      }}
                      className="py-2 px-4 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Category List */}
        <div className="flex-1 overflow-y-auto p-6">
          {groupedCategories.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No se encontraron categorías que coincidan con "{searchTerm}"
            </p>
          ) : (
            <div className="space-y-6">
              {groupedCategories.map(([group, categories]) => (
                <div key={group}>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    {group}
                  </h4>
                  <div className="grid gap-2">
                    {categories.map(category => (
                      <CategoryButton
                        key={category.value}
                        category={category}
                        isSelected={classification.suggestedCategory === category.value}
                        onClick={() => handleCategorySelect(category)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {filteredCategories.length} categoría{filteredCategories.length !== 1 ? 's' : ''} disponible{filteredCategories.length !== 1 ? 's' : ''}
              {classification.alternativeCategories && classification.alternativeCategories.length > 0 && (
                <span className="ml-2 text-purple-600">
                  ({classification.alternativeCategories.length} alternativas IA)
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}