"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  MagnifyingGlassIcon, 
  XMarkIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ArrowRightIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';

interface SearchResult {
  id: string;
  type: 'organization' | 'company' | 'user' | 'template' | 'document';
  title: string;
  subtitle?: string;
  path: string;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { locale } = useLocale();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const recent = localStorage.getItem('recentSearches');
    if (recent) {
      setRecentSearches(JSON.parse(recent));
    }
  }, []);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        handleResultClick(results[selectedIndex]);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose]);

  // Debounced search
  const searchDebounceRef = useRef<NodeJS.Timeout>();
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(searchDebounceRef.current);
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
        setSelectedIndex(0);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    // Save to recent searches
    const newRecent = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    localStorage.setItem('recentSearches', JSON.stringify(newRecent));
    
    router.push(result.path);
    onClose();
    setQuery('');
  };

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'organization':
        return BuildingOfficeIcon;
      case 'company':
        return BuildingOfficeIcon;
      case 'user':
        return UserGroupIcon;
      case 'template':
      case 'document':
        return DocumentTextIcon;
      default:
        return DocumentTextIcon;
    }
  };

  const getTypeLabel = (type: SearchResult['type']) => {
    const labels = {
      organization: locale?.startsWith('es') ? 'Organización' : 'Organization',
      company: locale?.startsWith('es') ? 'Empresa' : 'Company',
      user: locale?.startsWith('es') ? 'Usuario' : 'User',
      template: locale?.startsWith('es') ? 'Plantilla' : 'Template',
      document: locale?.startsWith('es') ? 'Documento' : 'Document'
    };
    return labels[type];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-start justify-center p-4 sm:p-6 md:p-20">
        <div
          ref={modalRef}
          className="relative w-full max-w-2xl transform overflow-hidden rounded-xl bg-white shadow-2xl transition-all"
        >
          {/* Search Input */}
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="block w-full border-0 py-4 pl-11 pr-12 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-0 sm:text-sm"
              placeholder={locale?.startsWith('es') ? 'Buscar organizaciones, empresas, usuarios...' : 'Search organizations, companies, users...'}
            />
            <button
              onClick={onClose}
              className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-96 scroll-py-2 overflow-y-auto border-t border-gray-100">
            {loading ? (
              <div className="px-4 py-8 text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
              </div>
            ) : results.length > 0 ? (
              <ul className="divide-y divide-gray-100">
                {results.map((result, index) => {
                  const Icon = getIcon(result.type);
                  return (
                    <li key={result.id}>
                      <button
                        onClick={() => handleResultClick(result)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={`group flex w-full items-center justify-between px-4 py-3 hover:bg-gray-50 ${
                          index === selectedIndex ? 'bg-gray-50' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                            index === selectedIndex ? 'bg-blue-100' : 'bg-gray-100'
                          }`}>
                            <Icon className={`h-5 w-5 ${
                              index === selectedIndex ? 'text-blue-600' : 'text-gray-600'
                            }`} />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium text-gray-900">{result.title}</p>
                            <p className="text-sm text-gray-500">
                              <span className="font-medium">{getTypeLabel(result.type)}</span>
                              {result.subtitle && <span> • {result.subtitle}</span>}
                            </p>
                          </div>
                        </div>
                        <ArrowRightIcon className={`h-4 w-4 ${
                          index === selectedIndex ? 'text-gray-600' : 'text-gray-400'
                        }`} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : query.length >= 2 && !loading ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                {locale?.startsWith('es') ? 'No se encontraron resultados' : 'No results found'}
              </div>
            ) : recentSearches.length > 0 && query.length === 0 ? (
              <div className="px-4 py-3">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {locale?.startsWith('es') ? 'Búsquedas recientes' : 'Recent searches'}
                </h3>
                <ul className="space-y-1">
                  {recentSearches.map((search, index) => (
                    <li key={index}>
                      <button
                        onClick={() => setQuery(search)}
                        className="flex w-full items-center space-x-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <ClockIcon className="h-4 w-4 text-gray-400" />
                        <span>{search}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-4 py-2.5 text-xs text-gray-500">
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1">
                <kbd className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] font-medium">↑</kbd>
                <kbd className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] font-medium">↓</kbd>
                <span>{locale?.startsWith('es') ? 'navegar' : 'navigate'}</span>
              </span>
              <span className="flex items-center space-x-1">
                <kbd className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] font-medium">↵</kbd>
                <span>{locale?.startsWith('es') ? 'seleccionar' : 'select'}</span>
              </span>
              <span className="flex items-center space-x-1">
                <kbd className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] font-medium">esc</kbd>
                <span>{locale?.startsWith('es') ? 'cerrar' : 'close'}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}