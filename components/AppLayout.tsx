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
      // Command+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <HeaderV2 onSearchOpen={() => setSearchOpen(true)} />
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