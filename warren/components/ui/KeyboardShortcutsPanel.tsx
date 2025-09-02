'use client';

import { useState, useEffect } from 'react';
import { X, Keyboard, Command } from 'lucide-react';
import { Button } from './Button';
import { Badge } from './badge';
import { cn } from '@/lib/utils';

interface ShortcutItem {
  id: string;
  keys: string[];
  description: string;
  category: 'navigation' | 'actions' | 'forms' | 'categories';
}

interface KeyboardShortcutsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: ShortcutItem[];
  currentSection?: string;
}

export function KeyboardShortcutsPanel({
  isOpen,
  onClose,
  shortcuts,
  currentSection
}: KeyboardShortcutsPanelProps) {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const categorizedShortcuts = {
    navigation: shortcuts.filter(s => s.category === 'navigation'),
    actions: shortcuts.filter(s => s.category === 'actions'),
    categories: shortcuts.filter(s => s.category === 'categories'),
    forms: shortcuts.filter(s => s.category === 'forms')
  };

  const renderKey = (key: string) => {
    const displayKey = key
      .replace('Ctrl', isMac ? '⌘' : 'Ctrl')
      .replace('Meta', '⌘')
      .replace('Alt', isMac ? '⌥' : 'Alt')
      .replace('Shift', isMac ? '⇧' : 'Shift')
      .replace('Enter', '⏎')
      .replace('Escape', 'Esc')
      .replace('ArrowUp', '↑')
      .replace('ArrowDown', '↓')
      .replace('ArrowLeft', '←')
      .replace('ArrowRight', '→')
      .replace('Delete', 'Del');

    return (
      <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded-lg shadow-sm">
        {displayKey}
      </kbd>
    );
  };

  const ShortcutGroup = ({ title, items, icon }: { 
    title: string; 
    items: ShortcutItem[];
    icon: React.ReactNode;
  }) => {
    if (items.length === 0) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {icon}
          <h4 className="font-semibold text-gray-900">{title}</h4>
        </div>
        <div className="space-y-2">
          {items.map((shortcut) => (
            <div key={shortcut.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-700 flex-1">{shortcut.description}</span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, index) => (
                  <span key={index} className="flex items-center gap-1">
                    {index > 0 && <span className="text-gray-400 text-xs">+</span>}
                    {renderKey(key)}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] md:max-h-[80vh] max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Keyboard className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Atajos de Teclado</h3>
              {currentSection && (
                <p className="text-sm text-gray-600">
                  Sección actual: <Badge variant="secondary">{currentSection}</Badge>
                </p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 md:p-6 p-4 overflow-y-auto max-h-[60vh] md:max-h-[60vh] max-h-[70vh] space-y-6">
          {/* Navigation */}
          <ShortcutGroup
            title="Navegación"
            items={categorizedShortcuts.navigation}
            icon={<Command className="h-4 w-4 text-blue-600" />}
          />

          {/* Actions */}
          <ShortcutGroup
            title="Acciones"
            items={categorizedShortcuts.actions}
            icon={<Keyboard className="h-4 w-4 text-green-600" />}
          />

          {/* Category Management */}
          <ShortcutGroup
            title="Gestión de Categorías"
            items={categorizedShortcuts.categories}
            icon={<span className="h-4 w-4 text-purple-600 font-bold text-sm">📋</span>}
          />

          {/* Forms */}
          <ShortcutGroup
            title="Formularios"
            items={categorizedShortcuts.forms}
            icon={<span className="h-4 w-4 text-orange-600 font-bold text-sm">✏️</span>}
          />

          {/* Tips */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">💡 Consejos</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Los atajos no funcionan cuando escribes en campos de texto</li>
              <li>• Presiona <kbd className="px-1 py-0.5 bg-blue-100 rounded text-xs">?</kbd> en cualquier momento para ver esta ayuda</li>
              <li>• Usa <kbd className="px-1 py-0.5 bg-blue-100 rounded text-xs">Esc</kbd> para cerrar ventanas y cancelar acciones</li>
              <li className="md:hidden">• En móvil: Usa el botón flotante para agregar categorías rápidamente</li>
              <li className="md:hidden">• Mantén presionado en categorías para acciones adicionales</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 bg-gray-50">
          <Button onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}

export default KeyboardShortcutsPanel;

// Default shortcuts for CategoryBuilder
export const DEFAULT_CATEGORY_SHORTCUTS: ShortcutItem[] = [
  // Navigation
  { id: 'section-1', keys: ['Ctrl', '1'], description: 'Ir a primera sección', category: 'navigation' },
  { id: 'section-2', keys: ['Ctrl', '2'], description: 'Ir a segunda sección', category: 'navigation' },
  { id: 'section-3', keys: ['Ctrl', '3'], description: 'Ir a tercera sección', category: 'navigation' },
  { id: 'section-4', keys: ['Ctrl', '4'], description: 'Ir a cuarta sección', category: 'navigation' },
  { id: 'section-5', keys: ['Ctrl', '5'], description: 'Ir a quinta sección', category: 'navigation' },
  { id: 'section-6', keys: ['Ctrl', '6'], description: 'Ir a sexta sección', category: 'navigation' },

  // Actions
  { id: 'add-new', keys: ['Ctrl', 'N'], description: 'Agregar nueva categoría', category: 'actions' },
  { id: 'add-quick', keys: ['A'], description: 'Modo agregar rápido', category: 'actions' },
  { id: 'excel-preview', keys: ['Ctrl', 'E'], description: 'Ver vista previa Excel', category: 'actions' },
  { id: 'save', keys: ['Ctrl', 'S'], description: 'Guardar configuración', category: 'actions' },
  { id: 'help', keys: ['?'], description: 'Mostrar ayuda', category: 'actions' },
  { id: 'plus-add', keys: ['+'], description: 'Agregar categoría', category: 'actions' },

  // Category management
  { id: 'edit', keys: ['Enter'], description: 'Editar categoría seleccionada', category: 'categories' },
  { id: 'delete', keys: ['Delete'], description: 'Eliminar categoría seleccionada', category: 'categories' },
  { id: 'map-excel', keys: ['M'], description: 'Mapear a Excel', category: 'categories' },
  { id: 'arrow-up', keys: ['↑'], description: 'Subir en la lista', category: 'categories' },
  { id: 'arrow-down', keys: ['↓'], description: 'Bajar en la lista', category: 'categories' },

  // Forms
  { id: 'submit', keys: ['Ctrl', 'Enter'], description: 'Enviar formulario', category: 'forms' },
  { id: 'cancel', keys: ['Escape'], description: 'Cancelar edición', category: 'forms' },
];