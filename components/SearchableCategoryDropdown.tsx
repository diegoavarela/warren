"use client";

import { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline';

interface Category {
  value: string;
  label: string;
  group: string;
}

interface SearchableCategoryDropdownProps {
  value: string;
  onChange: (value: string) => void;
  categories: Category[];
  onAddCategory?: (category: Category) => void;
  placeholder?: string;
  className?: string;
}

export function SearchableCategoryDropdown({
  value,
  onChange,
  categories,
  onAddCategory,
  placeholder = "Buscar categoría...",
  className = ""
}: SearchableCategoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryGroup, setNewCategoryGroup] = useState('Otros');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter categories based on search term
  const filteredCategories = categories.filter(cat =>
    cat.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cat.group.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group filtered categories
  const groupedCategories = filteredCategories.reduce((groups, category) => {
    if (!groups[category.group]) {
      groups[category.group] = [];
    }
    groups[category.group].push(category);
    return groups;
  }, {} as Record<string, Category[]>);

  // Get current category label
  const currentCategory = categories.find(cat => cat.value === value);

  // Handle clicks outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowAddForm(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddCategory = () => {
    if (newCategoryName.trim() && onAddCategory) {
      const newCategory: Category = {
        value: newCategoryName.toLowerCase().replace(/\s+/g, '_'),
        label: newCategoryName.trim(),
        group: newCategoryGroup
      };
      onAddCategory(newCategory);
      onChange(newCategory.value);
      setNewCategoryName('');
      setShowAddForm(false);
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        className="relative w-full cursor-pointer rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="block truncate">
          {currentCategory?.label || 'Seleccionar categoría'}
        </span>
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <ChevronDownIcon className="h-5 w-5 text-gray-400" />
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
          {/* Search input */}
          <div className="sticky top-0 z-10 bg-white px-2 py-1 border-b border-gray-200">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-2 top-1.5 h-3 w-3 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-md border border-gray-300 py-1 pl-6 pr-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Add new category button */}
          {onAddCategory && (
            <div className="px-2 py-1 border-b border-gray-200">
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1 w-full px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded-md"
              >
                <PlusIcon className="h-3 w-3" />
                Agregar nueva
              </button>
            </div>
          )}

          {/* Add category form */}
          {showAddForm && (
            <div className="px-2 py-2 border-b border-gray-200 bg-gray-50">
              <div className="space-y-1">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Nombre de la categoría"
                  className="w-full rounded-md border border-gray-300 py-1 px-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <select
                  value={newCategoryGroup}
                  onChange={(e) => setNewCategoryGroup(e.target.value)}
                  className="w-full rounded-md border border-gray-300 py-1 px-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Ingresos">Ingresos</option>
                  <option value="Costos">Costos</option>
                  <option value="Gastos Operativos">Gastos Operativos</option>
                  <option value="Otros Ingresos">Otros Ingresos</option>
                  <option value="Otros Gastos">Otros Gastos</option>
                  <option value="Otros Ingresos/Gastos">Otros Ingresos/Gastos</option>
                  <option value="Impuestos">Impuestos</option>
                  <option value="Totales">Totales</option>
                  <option value="Otros">Otros</option>
                </select>
                <div className="flex gap-1">
                  <button
                    onClick={handleAddCategory}
                    className="flex-1 px-2 py-1 bg-blue-600 text-white rounded-md text-xs hover:bg-blue-700"
                  >
                    Agregar
                  </button>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 px-2 py-1 bg-gray-200 text-gray-700 rounded-md text-xs hover:bg-gray-300"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Category options */}
          <div className="max-h-32 overflow-y-auto">
            {Object.entries(groupedCategories).map(([group, groupCategories]) => (
              <div key={group}>
                <div className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-200">
                  {group}
                </div>
                {groupCategories.map((category) => (
                  <button
                    key={category.value}
                    onClick={() => {
                      onChange(category.value);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={`w-full text-left px-3 py-1 text-xs hover:bg-gray-100 ${
                      value === category.value ? 'bg-blue-50 text-blue-600' : 'text-gray-900'
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            ))}
            
            {filteredCategories.length === 0 && (
              <div className="px-3 py-2 text-xs text-gray-500 text-center">
                No se encontraron categorías
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}