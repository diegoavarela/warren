"use client";

import React, { useState, useEffect } from 'react';
import { SuperCoolHelpModal } from './SuperCoolHelpModal';

export function GlobalHelpSystem() {
  const [showModal, setShowModal] = useState(false);

  const openHelpModal = () => {
    // Close any existing search modals by dispatching close event
    window.dispatchEvent(new CustomEvent('closeSearchModal'));
    setShowModal(true);
  };

  // Listen for global help shortcut
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Help shortcut: Cmd+K (Mac) or Ctrl+K (Windows/Linux) - ANY K combination
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        openHelpModal();
        return;
      }
      
      // Also support ? key when not in input fields
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
          return;
        }
        
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        openHelpModal();
        return;
      }
      
      // Also support F1 for traditional help
      if (e.key === 'F1') {
        // Don't trigger if user is typing in an input field
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
          return;
        }
        
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        openHelpModal();
      }
    };

    // Also listen for custom events
    const handleGlobalHelp = () => openHelpModal();
    
    document.addEventListener('keydown', handleKeyPress, { capture: true });
    window.addEventListener('openGlobalHelp', handleGlobalHelp);
    
    return () => {
      document.removeEventListener('keydown', handleKeyPress, { capture: true });
      window.removeEventListener('openGlobalHelp', handleGlobalHelp);
    };
  }, []);

  return (
    <SuperCoolHelpModal
      isOpen={showModal}
      onClose={() => setShowModal(false)}
    />
  );
}