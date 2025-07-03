"use client";

import { useState, useMemo } from "react";
import { XMarkIcon, MagnifyingGlassIcon, CheckIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { AccountClassification } from "@/types";
import { getCombinedCategories, ExtendedFinancialCategory } from "@/lib/custom-categories";

interface CategoryEditorProps {
  classification: AccountClassification;
  statementType: 'balance_sheet' | 'profit_loss' | 'cash_flow';
  onCategoryChange: (newCategory: string, isInflow: boolean) => void;
  onClose: () => void;
}

export function CategoryEditor({ 
  classification, 
  statementType, 
  onCategoryChange, 
  onClose 
}: CategoryEditorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Get available categories
  const availableCategories = useMemo(() => {
    return getCombinedCategories(statementType, []);
  }, [statementType]);
  
  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    if (!searchLower) return availableCategories;
    
    return availableCategories.filter(cat => 
      cat.label.toLowerCase().includes(searchLower) ||
      cat.value.toLowerCase().includes(searchLower)
    );
  }, [availableCategories, searchTerm]);
  
  // Group categories by type
  const groupedCategories = useMemo(() => {
    const groups = new Map<string, ExtendedFinancialCategory[]>();
    
    filteredCategories.forEach(cat => {
      const group = cat.group || 'Otros';
      if (!groups.has(group)) {
        groups.set(group, []);
      }
      groups.get(group)!.push(cat);
    });
    
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredCategories]);
  
  const handleCategorySelect = (category: ExtendedFinancialCategory) => {
    onCategoryChange(category.value, category.isInflow);
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Editar Categoría
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Cuenta: <span className="font-medium">{classification.accountName}</span>
              </p>
              <div className="flex items-center space-x-2 mt-2">
                <SparklesIcon className="w-4 h-4 text-purple-600" />
                <span className="text-xs text-purple-600">
                  Categoría actual: {classification.suggestedCategory.replace(/_/g, ' ')} 
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
          
          {/* Search */}
          <div className="mt-4 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar categoría..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              autoFocus
            />
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
                  <h4 className="text-sm font-medium text-gray-700 mb-3 uppercase tracking-wider">
                    {group}
                  </h4>
                  <div className="grid gap-2">
                    {categories.map(category => (
                      <button
                        key={category.value}
                        onClick={() => handleCategorySelect(category)}
                        className={`
                          p-4 rounded-lg border-2 text-left transition-all
                          hover:shadow-md hover:border-purple-300
                          ${classification.suggestedCategory === category.value 
                            ? 'border-purple-500 bg-purple-50' 
                            : 'border-gray-200 hover:bg-gray-50'
                          }
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-900">
                                {category.label}
                              </span>
                              <span className={`
                                inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                                ${category.isInflow 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-red-100 text-red-700'
                                }
                              `}>
                                {category.isInflow ? '↑ Ingreso' : '↓ Gasto'}
                              </span>
                              {category.isCustom && (
                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                                  Personalizada
                                </span>
                              )}
                            </div>
                            {category.description && (
                              <p className="text-sm text-gray-600 mt-1">
                                {category.description}
                              </p>
                            )}
                          </div>
                          {classification.suggestedCategory === category.value && (
                            <CheckIcon className="w-5 h-5 text-purple-600 flex-shrink-0" />
                          )}
                        </div>
                        
                        {/* Show if this is an AI alternative */}
                        {classification.alternativeCategories?.some(alt => alt.category === category.value) && (
                          <div className="mt-2 flex items-center space-x-2">
                            <SparklesIcon className="w-4 h-4 text-purple-600" />
                            <span className="text-xs text-purple-600">
                              Alternativa IA ({
                                classification.alternativeCategories.find(alt => alt.category === category.value)?.confidence
                              }% confianza)
                            </span>
                          </div>
                        )}
                      </button>
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
            <p className="text-sm text-gray-600">
              {filteredCategories.length} categoría{filteredCategories.length !== 1 ? 's' : ''} disponible{filteredCategories.length !== 1 ? 's' : ''}
            </p>
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