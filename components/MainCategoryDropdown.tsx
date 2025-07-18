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
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get current category label
  const currentCategory = categories.find(cat => cat.value === value);

  // Handle clicks outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
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


  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        ref={buttonRef}
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
        <div 
          ref={dropdownRef}
          className="overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
          style={dropdownStyle}
        >
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
              <span className="block truncate flex-1">{category.label}</span>
              <span className={`text-xs flex-shrink-0 ml-2 ${
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