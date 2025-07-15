"use client";

import { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface MainCategory {
  value: string;
  label: string;
  isInflow: boolean;
}

interface MainCategoryDropdownProps {
  value: string;
  onChange: (value: string) => void;
  categories: MainCategory[];
  placeholder?: string;
  className?: string;
}

export function MainCategoryDropdown({
  value,
  onChange,
  categories,
  placeholder = "Seleccionar categoría principal...",
  className = ""
}: MainCategoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get current category label
  const currentCategory = categories.find(cat => cat.value === value);

  // Handle clicks outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        className="relative w-full cursor-pointer rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="block truncate">
          {currentCategory?.label || placeholder}
        </span>
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <ChevronDownIcon className="h-5 w-5 text-gray-400" />
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
          {categories.map((category) => (
            <button
              key={category.value}
              onClick={() => {
                onChange(category.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center justify-between ${
                value === category.value ? 'bg-blue-50 text-blue-600' : 'text-gray-900'
              }`}
            >
              <span>{category.label}</span>
              <span className={`text-xs ${
                category.isInflow ? 'text-green-600' : 'text-red-600'
              }`}>
                {category.isInflow ? '↗️' : '↘️'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}