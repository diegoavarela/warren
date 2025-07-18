"use client";

import { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline';

interface Subcategory {
  value: string;
  label: string;
}

interface SubcategoryDropdownProps {
  value: string;
  onChange: (value: string) => void;
  subcategories: Subcategory[];
  onAddSubcategory?: (subcategory: Subcategory) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function SubcategoryDropdown({
  value,
  onChange,
  subcategories,
  onAddSubcategory,
  placeholder = "Seleccionar subcategoría...",
  className = "",
  disabled = false
}: SubcategoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter subcategories based on search term
  const filteredSubcategories = subcategories.filter(subcat =>
    subcat.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get current subcategory label
  const currentSubcategory = subcategories.find(subcat => subcat.value === value);

  // Handle clicks outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node) &&
          dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowAddForm(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate dropdown position
  useEffect(() => {
    if (!isOpen || !buttonRef.current) return;

    const updatePosition = () => {
      const button = buttonRef.current;
      if (!button) return;

      const rect = button.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = 320; // max height
      
      let top = rect.bottom;
      let maxHeight = dropdownHeight;
      
      // If not enough space below and more space above, show above
      if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
        top = rect.top - Math.min(dropdownHeight, spaceAbove - 10);
        maxHeight = Math.min(dropdownHeight, spaceAbove - 10);
      } else {
        maxHeight = Math.min(dropdownHeight, spaceBelow - 10);
      }
      
      setDropdownStyle({
        position: 'fixed',
        top: `${top}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        maxHeight: `${maxHeight}px`,
        zIndex: 9999,
      });
    };

    updatePosition();
    
    // Update on scroll/resize
    const handleUpdate = () => updatePosition();
    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);
    
    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [isOpen]);


  const handleAddSubcategory = () => {
    if (newSubcategoryName.trim() && onAddSubcategory) {
      const newSubcategory: Subcategory = {
        value: newSubcategoryName.toLowerCase().replace(/\s+/g, '_'),
        label: newSubcategoryName.trim()
      };
      onAddSubcategory(newSubcategory);
      onChange(newSubcategory.value);
      setNewSubcategoryName('');
      setShowAddForm(false);
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        className={`relative w-full cursor-pointer rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm ${
          disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''
        }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className="block truncate pr-2">
          {currentSubcategory?.label || placeholder}
        </span>
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <ChevronDownIcon className="h-5 w-5 text-gray-400" />
        </span>
      </button>

      {isOpen && !disabled && (
        <div 
          ref={dropdownRef}
          className="rounded-md bg-white text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm overflow-hidden"
          style={dropdownStyle}
        >
          {/* Search input */}
          <div className="sticky top-0 z-10 bg-white px-2 py-1 border-b border-gray-200">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-2 top-1.5 h-3 w-3 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar subcategoría..."
                className="w-full rounded-md border border-gray-300 py-1 pl-6 pr-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Add new subcategory button */}
          {onAddSubcategory && (
            <div className="px-2 py-1 border-b border-gray-200">
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1 w-full px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded-md"
              >
                <PlusIcon className="h-3 w-3" />
                Agregar nueva subcategoría
              </button>
            </div>
          )}

          {/* Add subcategory form */}
          {showAddForm && (
            <div className="px-2 py-2 border-b border-gray-200 bg-gray-50">
              <div className="space-y-1">
                <input
                  type="text"
                  value={newSubcategoryName}
                  onChange={(e) => setNewSubcategoryName(e.target.value)}
                  placeholder="Nombre de la subcategoría"
                  className="w-full rounded-md border border-gray-300 py-1 px-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <div className="flex gap-1">
                  <button
                    onClick={handleAddSubcategory}
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

          {/* Subcategory options */}
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(100% - 100px)' }}>
            {filteredSubcategories.map((subcategory) => (
              <button
                key={subcategory.value}
                onClick={() => {
                  onChange(subcategory.value);
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                  value === subcategory.value ? 'bg-blue-50 text-blue-600' : 'text-gray-900'
                }`}
              >
                <span className="block truncate">{subcategory.label}</span>
              </button>
            ))}
            
            {filteredSubcategories.length === 0 && (
              <div className="px-3 py-2 text-xs text-gray-500 text-center">
                No se encontraron subcategorías
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}