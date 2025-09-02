"use client";

import { useState, useEffect } from 'react';
import { HeaderV2 } from './HeaderV2';
import { SearchModal } from './SearchModal';
import { Footer } from './Footer';

interface AppLayoutProps {
  children: React.ReactNode;
  showFooter?: boolean;
}

export function AppLayout({ children, showFooter = true }: AppLayoutProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  // Global keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command+K (Mac) or Ctrl+K (Windows/Linux) - but NOT if Shift is also pressed
      if ((e.metaKey || e.ctrlKey) && e.key === 'k' && !e.shiftKey) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    const handleCloseSearch = () => {
      setSearchOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('closeSearchModal', handleCloseSearch);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('closeSearchModal', handleCloseSearch);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <HeaderV2 />
      <main className="flex-1">
        {children}
      </main>
      {showFooter && (
        <Footer />
      )}
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}