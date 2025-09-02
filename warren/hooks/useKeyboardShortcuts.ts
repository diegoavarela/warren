'use client';

import { useEffect, useCallback, useRef } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  description?: string;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  target?: HTMLElement | null;
  preventDefault?: boolean;
}

export function useKeyboardShortcuts(
  shortcuts: Record<string, KeyboardShortcut & { handler: () => void }>,
  options: UseKeyboardShortcutsOptions = {}
) {
  const { enabled = true, target, preventDefault = true } = options;
  const shortcutsRef = useRef(shortcuts);

  // Update shortcuts reference when they change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts when user is typing in inputs
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLSelectElement ||
      (event.target as HTMLElement)?.contentEditable === 'true'
    ) {
      return;
    }

    for (const [id, shortcut] of Object.entries(shortcutsRef.current)) {
      const {
        key,
        ctrlKey = false,
        metaKey = false,
        shiftKey = false,
        altKey = false,
        handler,
        preventDefault: shortcutPreventDefault = preventDefault,
        stopPropagation = false
      } = shortcut;

      // Check if the key combination matches
      const keyMatches = event.key.toLowerCase() === key.toLowerCase();
      const ctrlMatches = !!event.ctrlKey === ctrlKey;
      const metaMatches = !!event.metaKey === metaKey;
      const shiftMatches = !!event.shiftKey === shiftKey;
      const altMatches = !!event.altKey === altKey;

      if (keyMatches && ctrlMatches && metaMatches && shiftMatches && altMatches) {
        if (shortcutPreventDefault) {
          event.preventDefault();
        }
        if (stopPropagation) {
          event.stopPropagation();
        }
        
        handler();
        break; // Only execute the first matching shortcut
      }
    }
  }, [enabled, preventDefault]);

  useEffect(() => {
    const element = target || document;
    
    if (enabled) {
      element.addEventListener('keydown', handleKeyDown as any);
    }

    return () => {
      element.removeEventListener('keydown', handleKeyDown as any);
    };
  }, [enabled, target, handleKeyDown]);

  return {
    shortcuts: Object.entries(shortcuts).map(([id, shortcut]) => ({
      id,
      ...shortcut
    }))
  };
}

// Hook for managing global keyboard shortcuts
export function useGlobalKeyboardShortcuts(enabled = true) {
  const shortcuts = useRef<Record<string, () => void>>({});

  const registerShortcut = useCallback((
    id: string,
    key: string,
    handler: () => void,
    options: Omit<KeyboardShortcut, 'key'> = {}
  ) => {
    shortcuts.current[id] = handler;
    return () => {
      delete shortcuts.current[id];
    };
  }, []);

  const unregisterShortcut = useCallback((id: string) => {
    delete shortcuts.current[id];
  }, []);

  return {
    registerShortcut,
    unregisterShortcut
  };
}

// Common keyboard shortcut combinations
export const KEYBOARD_SHORTCUTS = {
  // Navigation
  SECTION_1: { key: '1', ctrlKey: true, description: 'Switch to first section' },
  SECTION_2: { key: '2', ctrlKey: true, description: 'Switch to second section' },
  SECTION_3: { key: '3', ctrlKey: true, description: 'Switch to third section' },
  SECTION_4: { key: '4', ctrlKey: true, description: 'Switch to fourth section' },
  SECTION_5: { key: '5', ctrlKey: true, description: 'Switch to fifth section' },
  SECTION_6: { key: '6', ctrlKey: true, description: 'Switch to sixth section' },
  
  // Actions
  ADD_NEW: { key: 'n', ctrlKey: true, description: 'Add new category' },
  ADD_QUICK: { key: 'a', description: 'Quick add mode' },
  EXCEL_PREVIEW: { key: 'e', ctrlKey: true, description: 'Show Excel preview' },
  SAVE: { key: 's', ctrlKey: true, description: 'Save configuration' },
  HELP: { key: '?', description: 'Show help' },
  
  // Category management
  EDIT: { key: 'Enter', description: 'Edit selected category' },
  DELETE: { key: 'Delete', description: 'Delete selected category' },
  MAP_EXCEL: { key: 'm', description: 'Map to Excel' },
  
  // Form actions
  SUBMIT: { key: 'Enter', ctrlKey: true, description: 'Submit form' },
  CANCEL: { key: 'Escape', description: 'Cancel editing' },
  
  // Navigation
  ARROW_UP: { key: 'ArrowUp', description: 'Move up' },
  ARROW_DOWN: { key: 'ArrowDown', description: 'Move down' },
  
  // Plus key for quick add
  PLUS: { key: '+', description: 'Add new category' }
} as const;

export type ShortcutId = keyof typeof KEYBOARD_SHORTCUTS;