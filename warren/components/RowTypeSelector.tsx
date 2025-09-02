"use client";

import { useState } from "react";
import { DocumentTextIcon, FolderIcon, CalculatorIcon } from "@heroicons/react/24/outline";

export type RowType = 'account' | 'section_header' | 'total';

interface RowTypeSelectorProps {
  currentType: RowType | null;
  accountName: string;
  onTypeChange: (type: RowType | null) => void;
  isManuallySet?: boolean;
}

export function RowTypeSelector({ 
  currentType, 
  accountName,
  onTypeChange,
  isManuallySet 
}: RowTypeSelectorProps) {
  const [showPopup, setShowPopup] = useState(false);

  const getTypeIcon = (type: RowType | null) => {
    switch (type) {
      case 'account':
        return <DocumentTextIcon className="w-4 h-4" />;
      case 'section_header':
        return <FolderIcon className="w-4 h-4" />;
      case 'total':
        return <CalculatorIcon className="w-4 h-4" />;
      default:
        return <DocumentTextIcon className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: RowType | null) => {
    switch (type) {
      case 'account':
        return 'Cuenta';
      case 'section_header':
        return 'Sección';
      case 'total':
        return 'Total';
      default:
        return 'Cuenta';
    }
  };

  const types: { value: RowType; label: string; description: string; icon: JSX.Element }[] = [
    {
      value: 'account',
      label: 'Cuenta Regular',
      description: 'Una cuenta normal que debe ser categorizada',
      icon: <DocumentTextIcon className="w-5 h-5" />
    },
    {
      value: 'section_header',
      label: 'Encabezado de Sección',
      description: 'Título de sección como "INGRESOS" o "GASTOS"',
      icon: <FolderIcon className="w-5 h-5" />
    },
    {
      value: 'total',
      label: 'Total o Subtotal',
      description: 'Suma de varias cuentas',
      icon: <CalculatorIcon className="w-5 h-5" />
    }
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setShowPopup(!showPopup)}
        className="flex items-center space-x-1 px-2 py-1 rounded text-xs hover:bg-gray-100 transition-colors"
      >
        {getTypeIcon(currentType)}
        <span>{getTypeLabel(currentType)}</span>
        {isManuallySet && (
          <span className="text-orange-600 text-[10px]">●</span>
        )}
      </button>

      {showPopup && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowPopup(false)}
          />
          <div className="absolute left-0 top-8 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-80">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              ¿Qué tipo de fila es "{accountName}"?
            </h3>
            
            <div className="space-y-2">
              {types.map((type) => (
                <button
                  key={type.value}
                  onClick={() => {
                    onTypeChange(type.value === currentType ? null : type.value);
                    setShowPopup(false);
                  }}
                  className={`w-full p-3 rounded-lg border-2 text-left transition-all hover:shadow-md ${
                    currentType === type.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg ${
                      currentType === type.value ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      {type.icon}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{type.label}</div>
                      <div className="text-xs text-gray-600 mt-0.5">{type.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                {currentType && 'Haz clic en la opción seleccionada para restaurar la detección automática'}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}