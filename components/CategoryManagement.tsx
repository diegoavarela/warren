"use client";

import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  MagnifyingGlassIcon,
  FolderIcon,
  DocumentTextIcon,
  ArchiveBoxIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { getCombinedCategories, ExtendedFinancialCategory } from '@/lib/custom-categories';

interface CategoryManagementProps {
  companyId: string;
  statementType: 'balance_sheet' | 'profit_loss' | 'cash_flow';
  onClose: () => void;
}

interface CustomCategory {
  id: string;
  categoryKey: string;
  label: string;
  isInflow: boolean;
  statementType: string;
  categoryType: 'account' | 'section' | 'total';
  description?: string;
  parentCategory?: string;
  isActive: boolean;
  isCustom: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export function CategoryManagement({ companyId, statementType, onClose }: CategoryManagementProps) {
  const [categories, setCategories] = useState<ExtendedFinancialCategory[]>([]);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<ExtendedFinancialCategory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'account' | 'section' | 'total'>('all');
  const [editingCategory, setEditingCategory] = useState<CustomCategory | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    categoryKey: '',
    label: '',
    isInflow: true,
    categoryType: 'account' as 'account' | 'section' | 'total',
    description: '',
    parentCategory: '',
    sortOrder: 0
  });

  useEffect(() => {
    fetchCategories();
  }, [companyId, statementType]);

  useEffect(() => {
    filterCategories();
  }, [categories, searchTerm, selectedType]);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch custom categories
      const response = await fetch(`/api/companies/${companyId}/categories`);
      if (response.ok) {
        const data = await response.json();
        setCustomCategories(data.data || []);
        
        // Get combined categories (default + custom)
        const combined = getCombinedCategories(statementType, data.data || []);
        setCategories(combined);
      } else {
        setError('Failed to fetch categories');
      }
    } catch (err) {
      setError('Error fetching categories');
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterCategories = () => {
    let filtered = [...categories];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(cat => 
        cat.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.value.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(cat => cat.categoryType === selectedType);
    }

    setFilteredCategories(filtered);
  };

  const resetForm = () => {
    setFormData({
      categoryKey: '',
      label: '',
      isInflow: true,
      categoryType: 'account',
      description: '',
      parentCategory: '',
      sortOrder: 0
    });
    setEditingCategory(null);
    setShowCreateForm(false);
  };

  const handleCreate = () => {
    resetForm();
    setShowCreateForm(true);
  };

  const handleEdit = (category: CustomCategory) => {
    setFormData({
      categoryKey: category.categoryKey,
      label: category.label,
      isInflow: category.isInflow,
      categoryType: category.categoryType,
      description: category.description || '',
      parentCategory: category.parentCategory || '',
      sortOrder: category.sortOrder
    });
    setEditingCategory(category);
    setShowCreateForm(true);
  };

  const handleSave = async () => {
    if (!formData.label.trim()) {
      setError('Category name is required');
      return;
    }

    // Generate key if not provided
    if (!formData.categoryKey) {
      formData.categoryKey = formData.label
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 50);
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/companies/${companyId}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          statementType
        })
      });

      if (response.ok) {
        await fetchCategories();
        resetForm();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save category');
      }
    } catch (err) {
      setError('Error saving category');
      console.error('Error saving category:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (categoryId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta categoría?')) {
      return;
    }

    try {
      const response = await fetch(`/api/companies/${companyId}/categories/${categoryId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchCategories();
      } else {
        setError('Failed to delete category');
      }
    } catch (err) {
      setError('Error deleting category');
      console.error('Error deleting category:', err);
    }
  };

  const getCategoryIcon = (type: string) => {
    switch (type) {
      case 'section':
        return <FolderIcon className="w-4 h-4 text-blue-600" />;
      case 'total':
        return <span className="text-green-600 font-mono text-sm font-bold">Σ</span>;
      default:
        return <DocumentTextIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'section':
        return 'bg-blue-100 text-blue-800';
      case 'total':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando categorías...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Gestión de Categorías - {statementType === 'profit_loss' ? 'P&L' : statementType === 'balance_sheet' ? 'Balance' : 'Flujo de Caja'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar categorías..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Type Filter */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Todos los tipos</option>
                <option value="account">Cuentas</option>
                <option value="section">Secciones</option>
                <option value="total">Totales</option>
              </select>
            </div>

            <button
              onClick={handleCreate}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Nueva Categoría</span>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mr-2" />
                <span className="text-red-800">{error}</span>
              </div>
            </div>
          )}
        </div>

        {/* Category List */}
        <div className="flex-1 overflow-y-auto" style={{ maxHeight: '400px' }}>
          <div className="px-6 py-4">
            <div className="grid gap-2">
              {filteredCategories.map((category) => (
                <div
                  key={category.value}
                  className={`p-4 rounded-lg border transition-all ${
                    category.isCustom 
                      ? 'border-purple-200 bg-purple-50' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getCategoryIcon(category.categoryType || 'account')}
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">{category.label}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(category.categoryType || 'account')}`}>
                            {category.categoryType?.toUpperCase() || 'ACCOUNT'}
                          </span>
                          {category.isCustom && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              CUSTOM
                            </span>
                          )}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            category.isInflow 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {category.isInflow ? 'INGRESO' : 'GASTO'}
                          </span>
                        </div>
                        {category.description && (
                          <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Actions - only for custom categories */}
                    {category.isCustom && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(category as unknown as CustomCategory)}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(category.id!)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Create/Edit Form */}
        {showCreateForm && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de la categoría
                </label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nombre de la categoría"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo
                </label>
                <select
                  value={formData.categoryType}
                  onChange={(e) => setFormData({ ...formData, categoryType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="account">Cuenta</option>
                  <option value="section">Sección</option>
                  <option value="total">Total</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Flujo
                </label>
                <select
                  value={formData.isInflow ? 'true' : 'false'}
                  onChange={(e) => setFormData({ ...formData, isInflow: e.target.value === 'true' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="true">Ingreso</option>
                  <option value="false">Gasto</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Orden
                </label>
                <input
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Descripción opcional"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={resetForm}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Guardando...' : editingCategory ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {filteredCategories.length} categorías mostradas
              {customCategories.length > 0 && (
                <span className="ml-2 text-purple-600">
                  ({customCategories.length} personalizadas)
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}