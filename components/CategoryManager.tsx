"use client";

import { useState } from "react";
import { 
  PlusIcon, 
  TrashIcon, 
  PencilIcon,
  XMarkIcon,
  CheckIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from "@heroicons/react/24/outline";
import { generateCategoryKey, validateCustomCategory } from "@/lib/custom-categories";
import type { ExtendedFinancialCategory } from "@/lib/custom-categories";

interface CategoryManagerProps {
  categories: ExtendedFinancialCategory[];
  statementType: 'balance_sheet' | 'profit_loss' | 'cash_flow';
  companyId?: string;
  onCategoriesChange: (categories: ExtendedFinancialCategory[]) => void;
  onClose: () => void;
}

export function CategoryManager({ 
  categories, 
  statementType, 
  companyId, 
  onCategoriesChange,
  onClose 
}: CategoryManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState({
    label: '',
    isInflow: true,
    description: ''
  });
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const customCategories = categories.filter(cat => cat.isCustom);
  const standardCategories = categories.filter(cat => !cat.isCustom);

  const handleAddCategory = () => {
    const categoryKey = generateCategoryKey(newCategory.label);
    const validation = validateCustomCategory(
      {
        categoryKey,
        label: newCategory.label,
        isInflow: newCategory.isInflow,
        statementType
      },
      customCategories as any
    );

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    const newCustomCategory: ExtendedFinancialCategory = {
      value: categoryKey,
      label: newCategory.label,
      icon: null,
      isInflow: newCategory.isInflow,
      statementType,
      isCustom: true,
      description: newCategory.description || undefined,
      id: `temp-${Date.now()}`, // Temporary ID
      companyId
    };

    onCategoriesChange([...categories, newCustomCategory]);
    setIsAdding(false);
    setNewCategory({ label: '', isInflow: true, description: '' });
    setErrors([]);
  };

  const handleEditCategory = (category: ExtendedFinancialCategory) => {
    if (!editingCategory) return;

    const updatedCategories = categories.map(cat => 
      cat.id === category.id 
        ? { ...cat, label: editingCategory.label, description: editingCategory.description }
        : cat
    );

    onCategoriesChange(updatedCategories);
    setEditingId(null);
    setEditingCategory(null);
  };

  const handleDeleteCategory = (categoryId: string) => {
    const updatedCategories = categories.filter(cat => cat.id !== categoryId);
    onCategoriesChange(updatedCategories);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Gestionar Categorías Financieras
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Agrega o edita categorías personalizadas para {
              statementType === 'balance_sheet' ? 'Balance General' :
              statementType === 'profit_loss' ? 'Estado de Resultados' :
              'Flujo de Efectivo'
            }
          </p>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Add New Category Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-900">Categorías Personalizadas</h4>
              {!isAdding && (
                <button
                  onClick={() => setIsAdding(true)}
                  className="flex items-center space-x-1 px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Agregar Categoría</span>
                </button>
              )}
            </div>

            {isAdding && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre de la Categoría
                    </label>
                    <input
                      type="text"
                      value={newCategory.label}
                      onChange={(e) => setNewCategory(prev => ({ ...prev, label: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Ej: Gastos de Investigación"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de Flujo
                    </label>
                    <div className="flex space-x-4">
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          checked={newCategory.isInflow}
                          onChange={() => setNewCategory(prev => ({ ...prev, isInflow: true }))}
                          className="text-purple-600"
                        />
                        <span className="flex items-center space-x-1">
                          <ArrowTrendingUpIcon className="w-4 h-4 text-green-600" />
                          <span>Entrada / Positivo</span>
                        </span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          checked={!newCategory.isInflow}
                          onChange={() => setNewCategory(prev => ({ ...prev, isInflow: false }))}
                          className="text-purple-600"
                        />
                        <span className="flex items-center space-x-1">
                          <ArrowTrendingDownIcon className="w-4 h-4 text-red-600" />
                          <span>Salida / Negativo</span>
                        </span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descripción (opcional)
                    </label>
                    <input
                      type="text"
                      value={newCategory.description}
                      onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Ej: Gastos relacionados con I+D"
                    />
                  </div>

                  {errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      {errors.map((error, idx) => (
                        <p key={idx} className="text-sm text-red-600">• {error}</p>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => {
                        setIsAdding(false);
                        setNewCategory({ label: '', isInflow: true, description: '' });
                        setErrors([]);
                      }}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleAddCategory}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      Agregar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Custom Categories List */}
            {customCategories.length > 0 ? (
              <div className="space-y-2">
                {customCategories.map(category => (
                  <div key={category.id} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                    {editingId === category.id ? (
                      <div className="flex-1 flex items-center space-x-2">
                        <input
                          type="text"
                          value={editingCategory?.label || ''}
                          onChange={(e) => setEditingCategory((prev: any) => ({ ...prev, label: e.target.value }))}
                          className="flex-1 px-2 py-1 border border-purple-300 rounded"
                        />
                        <button
                          onClick={() => handleEditCategory(category)}
                          className="p-1 text-green-600 hover:text-green-800"
                        >
                          <CheckIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditingCategory(null);
                          }}
                          className="p-1 text-gray-600 hover:text-gray-800"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${
                            category.isInflow ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {category.isInflow ? 
                              <ArrowTrendingUpIcon className="w-4 h-4" /> : 
                              <ArrowTrendingDownIcon className="w-4 h-4" />
                            }
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{category.label}</div>
                            {category.description && (
                              <div className="text-xs text-gray-500">{category.description}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => {
                              setEditingId(category.id || '');
                              setEditingCategory({ label: category.label, description: category.description });
                            }}
                            className="p-1 text-gray-600 hover:text-gray-800"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category.id || '')}
                            className="p-1 text-red-600 hover:text-red-800"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                No hay categorías personalizadas. Haz clic en "Agregar Categoría" para crear una.
              </p>
            )}
          </div>

          {/* Standard Categories Reference */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Categorías Estándar (referencia)</h4>
            <div className="grid grid-cols-2 gap-2">
              {standardCategories
                .filter(cat => !['total_revenue', 'gross_profit', 'gross_margin', 'operating_income', 'ebitda', 'ebit', 'net_income', 'total_expenses'].includes(cat.value))
                .slice(0, 8)
                .map(category => (
                <div key={category.value} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
                  <div className={`p-1 rounded ${
                    category.isInflow ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {category.isInflow ? 
                      <ArrowTrendingUpIcon className="w-3 h-3" /> : 
                      <ArrowTrendingDownIcon className="w-3 h-3" />
                    }
                  </div>
                  <span className="text-sm text-gray-700">{category.label}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Las categorías estándar no se pueden editar pero siempre están disponibles.
            </p>
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}