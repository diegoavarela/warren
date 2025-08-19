"use client";

import React, { useState, useEffect, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { 
  XMarkIcon, 
  MagnifyingGlassIcon, 
  ChevronRightIcon,
  BookOpenIcon,
  ChartBarIcon,
  CloudArrowUpIcon,
  CogIcon,
  BanknotesIcon,
  LightBulbIcon,
  AdjustmentsHorizontalIcon,
  ArrowTrendingUpIcon,
  CalculatorIcon,
  DocumentChartBarIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { useLocale } from '@/contexts/LocaleContext';
import { useTranslation } from '@/lib/translations';
import { helpTopics, getHelpTopic, getHelpTopicsByCategory } from '@/lib/help-content';

interface SuperCoolHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTopic?: string;
  initialSearch?: string;
}

interface HelpCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

const categories: HelpCategory[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    icon: <ChartBarIcon className="w-5 h-5" />,
    color: 'blue',
    description: 'P&L metrics, analytics, and visualizations'
  },
  {
    id: 'cashflow',
    name: 'Cash Flow',
    icon: <BanknotesIcon className="w-5 h-5" />,
    color: 'green',
    description: 'Cash flow analysis, runway, and forecasting'
  },
  {
    id: 'metrics',
    name: 'Financial Metrics',
    icon: <CalculatorIcon className="w-5 h-5" />,
    color: 'purple',
    description: 'Revenue, costs, profitability indicators'
  },
  {
    id: 'upload',
    name: 'Upload & Setup',
    icon: <CloudArrowUpIcon className="w-5 h-5" />,
    color: 'orange',
    description: 'File uploads, templates, and configuration'
  },
  {
    id: 'filters',
    name: 'Filters & Controls',
    icon: <AdjustmentsHorizontalIcon className="w-5 h-5" />,
    color: 'indigo',
    description: 'Period selection, currency, and display options'
  },
  {
    id: 'mapper',
    name: 'Data Mapping',
    icon: <CogIcon className="w-5 h-5" />,
    color: 'gray',
    description: 'Excel mapping, AI analysis, and data structure'
  }
];

export function SuperCoolHelpModal({ isOpen, onClose, initialTopic, initialSearch = '' }: SuperCoolHelpModalProps) {
  const { locale } = useLocale();
  const { t } = useTranslation(locale || 'en-US');
  const isSpanish = locale?.startsWith('es');
  
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(initialTopic || null);
  const [showSearch, setShowSearch] = useState(false);

  // Initialize with topic if provided
  useEffect(() => {
    if (initialTopic) {
      setSelectedTopic(initialTopic);
    }
  }, [initialTopic]);

  // Enhanced smart search functionality
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase().trim();
    const results: Array<{topic: any, score: number, category: string}> = [];
    
    Object.values(helpTopics).forEach(topic => {
      let score = 0;
      
      // Get translated content safely
      const title = t(topic.titleKey)?.toLowerCase() || topic.titleKey.toLowerCase();
      const content = t(topic.contentKey)?.toLowerCase() || topic.contentKey.toLowerCase();
      
      // Enhanced keyword matching
      const searchKeywords = {
        // Spanish and English terms
        'ingresos': ['revenue', 'income', 'sales', 'ventas', 'ingresos'],
        'revenue': ['revenue', 'income', 'sales', 'ventas', 'ingresos'],
        'costos': ['costs', 'expenses', 'gastos', 'costos', 'cogs'],
        'costs': ['costs', 'expenses', 'gastos', 'costos', 'cogs'],
        'gastos': ['expenses', 'costs', 'gastos', 'costos', 'opex'],
        'expenses': ['expenses', 'costs', 'gastos', 'costos', 'opex'],
        'utilidad': ['profit', 'margin', 'ganancia', 'beneficio', 'utilidad'],
        'profit': ['profit', 'margin', 'ganancia', 'beneficio', 'utilidad'],
        'efectivo': ['cash', 'flow', 'flujo', 'efectivo', 'liquidez'],
        'cash': ['cash', 'flow', 'flujo', 'efectivo', 'liquidez'],
        'flujo': ['flow', 'cash', 'efectivo', 'flujo', 'runway'],
        'flow': ['flow', 'cash', 'efectivo', 'flujo', 'runway'],
        'gráfico': ['chart', 'graph', 'visual', 'gráfico', 'visualization'],
        'chart': ['chart', 'graph', 'visual', 'gráfico', 'visualization'],
        'subir': ['upload', 'import', 'file', 'archivo', 'subir'],
        'upload': ['upload', 'import', 'file', 'archivo', 'subir'],
        'configuración': ['config', 'setup', 'template', 'plantilla', 'configuración'],
        'config': ['config', 'setup', 'template', 'plantilla', 'configuración'],
        'análisis': ['analysis', 'trends', 'tendencias', 'análisis'],
        'analysis': ['analysis', 'trends', 'tendencias', 'análisis'],
        'dashboard': ['panel', 'tablero', 'dashboard', 'overview'],
        'panel': ['dashboard', 'panel', 'tablero', 'overview'],
        'ayuda': ['help', 'support', 'ayuda', 'soporte'],
        'help': ['help', 'support', 'ayuda', 'soporte']
      };

      // Direct text matching
      if (title.includes(query)) score += 15;
      if (content.includes(query)) score += 8;
      
      // Split query into words for better matching
      const queryWords = query.split(/\s+/);
      
      queryWords.forEach(word => {
        if (word.length < 2) return; // Skip very short words
        
        // Word matching in title and content
        if (title.includes(word)) score += 5;
        if (content.includes(word)) score += 3;
        
        // Enhanced keyword matching
        const relatedTerms = searchKeywords[word as keyof typeof searchKeywords] || [];
        relatedTerms.forEach((term: string) => {
          if (title.includes(term)) score += 4;
          if (content.includes(term)) score += 2;
        });
        
        // Category matching
        if (topic.category?.toLowerCase().includes(word)) score += 6;
        
        // Topic ID matching (for technical searches)
        if (topic.id.toLowerCase().includes(word)) score += 3;
      });
      
      // Boost popular/important topics
      const importantTopics = [
        'dashboard.revenue', 'dashboard.cashflow', 'upload.template', 
        'dashboard.profitability', 'metrics.totalRevenue', 'filters.period'
      ];
      if (importantTopics.includes(topic.id)) score += 2;
      
      if (score > 0) {
        results.push({
          topic,
          score,
          category: topic.category || 'general'
        });
      }
    });
    
    // Sort by score and limit results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, 25);
  }, [searchQuery, t]);

  // Filter topics by category
  const filteredTopics = useMemo(() => {
    if (selectedCategory === 'all') {
      return Object.values(helpTopics);
    }
    return getHelpTopicsByCategory(selectedCategory);
  }, [selectedCategory]);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (selectedTopic) {
          setSelectedTopic(null);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, selectedTopic]);

  const getCategoryColor = (categoryId: string, type: 'bg' | 'text' | 'border' = 'bg') => {
    const category = categories.find(c => c.id === categoryId);
    const color = category?.color || 'gray';
    
    const colorMap = {
      blue: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
      green: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
      purple: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
      orange: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
      indigo: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
      gray: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' }
    };
    
    return colorMap[color as keyof typeof colorMap]?.[type] || colorMap.gray[type];
  };

  const renderTopicCard = (topic: any, highlight: boolean = false) => {
    const category = categories.find(c => c.id === topic.category);
    
    return (
      <button
        key={topic.id}
        onClick={() => setSelectedTopic(topic.id)}
        className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${
          highlight 
            ? 'border-blue-300 bg-blue-50 shadow-md' 
            : 'border-gray-200 bg-white hover:border-gray-300'
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {category && (
                <div className={`p-1 rounded-lg ${getCategoryColor(category.id, 'bg')}`}>
                  {category.icon}
                </div>
              )}
              <h3 className="font-semibold text-gray-900 text-sm">
                {t(topic.titleKey)}
              </h3>
            </div>
            <p className="text-xs text-gray-600 line-clamp-2">
              {t(topic.contentKey).replace(/<[^>]*>/g, '').substring(0, 100)}...
            </p>
            {topic.category && (
              <span className={`inline-block mt-2 px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(topic.category, 'bg')} ${getCategoryColor(topic.category, 'text')}`}>
                {category?.name || topic.category}
              </span>
            )}
          </div>
          <ChevronRightIcon className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
        </div>
      </button>
    );
  };

  if (selectedTopic) {
    const topic = getHelpTopic(selectedTopic);
    if (!topic) return null;
    
    return (
      <Dialog.Root open={isOpen} onOpenChange={onClose}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 animate-fade-in backdrop-blur-sm z-[9999]" />
          <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[90vh] w-[95vw] max-w-4xl translate-x-[-50%] translate-y-[-50%] rounded-3xl bg-white p-0 shadow-2xl animate-dialog-in focus:outline-none overflow-hidden z-[10000]">
            {/* Topic Detail View */}
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setSelectedTopic(null)}
                    className="p-2 rounded-xl hover:bg-white/50 transition-colors"
                  >
                    <ChevronRightIcon className="w-5 h-5 text-gray-600 rotate-180" />
                  </button>
                  <div>
                    <Dialog.Title className="text-xl font-bold text-gray-900">
                      {t(topic.titleKey)}
                    </Dialog.Title>
                    {topic.category && (
                      <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(topic.category, 'bg')} ${getCategoryColor(topic.category, 'text')}`}>
                        {categories.find(c => c.id === topic.category)?.name || topic.category}
                      </span>
                    )}
                  </div>
                </div>
                <Dialog.Close asChild>
                  <button className="p-2 rounded-xl hover:bg-white/50 transition-colors">
                    <XMarkIcon className="h-6 w-6 text-gray-400" />
                  </button>
                </Dialog.Close>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div 
                  className="prose prose-lg max-w-none [&_h4]:text-lg [&_h4]:font-bold [&_h4]:text-gray-900 [&_h4]:mt-6 [&_h4]:mb-3 [&_ul]:space-y-2 [&_li]:text-gray-700 [&_strong]:font-bold [&_strong]:text-blue-700 [&_p]:text-gray-700 [&_p]:leading-relaxed [&_p]:mb-4"
                  dangerouslySetInnerHTML={{ 
                    __html: t(topic.contentKey)
                  }} 
                />

                {/* Related Topics */}
                {topic.relatedTopics && topic.relatedTopics.length > 0 && (
                  <div className="mt-8 pt-6 border-t">
                    <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <LightBulbIcon className="w-5 h-5 text-yellow-500" />
                      {isSpanish ? 'Temas Relacionados' : 'Related Topics'}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {topic.relatedTopics.map((relatedId) => {
                        const relatedTopic = getHelpTopic(relatedId);
                        if (!relatedTopic) return null;
                        
                        return renderTopicCard(relatedTopic);
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 animate-fade-in backdrop-blur-sm z-[9999]" />
        <Dialog.Content className="fixed left-[50%] top-[50%] h-[90vh] w-[98vw] max-w-7xl translate-x-[-50%] translate-y-[-50%] rounded-3xl bg-white p-0 shadow-2xl animate-dialog-in focus:outline-none overflow-hidden z-[10000]">
          {/* Main Help View */}
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-6 border-b bg-gradient-to-r from-purple-50 via-blue-50 to-indigo-50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-500 to-blue-500 text-white">
                    <SparklesIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <Dialog.Title className="text-2xl font-bold text-gray-900">
                      {isSpanish ? '✨ Centro de Ayuda Inteligente' : '✨ Smart Help Center'}
                    </Dialog.Title>
                    <p className="text-gray-600">
                      {isSpanish ? 'Encuentra respuestas instantáneas a tus preguntas' : 'Find instant answers to your questions'}
                    </p>
                  </div>
                </div>
                <Dialog.Close asChild>
                  <button className="p-2 rounded-xl hover:bg-white/50 transition-colors">
                    <XMarkIcon className="h-6 w-6 text-gray-400" />
                  </button>
                </Dialog.Close>
              </div>

              {/* Enhanced Search Bar */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-6 w-6 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowSearch(true)}
                  placeholder={isSpanish ? 'Buscar ayuda... (ej: "ingresos", "gráficos", "subir datos", "configuración")' : 'Search help... (e.g. "revenue", "charts", "upload data", "config")'}
                  className="w-full pl-16 pr-6 py-6 text-xl border-2 border-gray-300 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md focus:shadow-lg"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-6 flex items-center"
                  >
                    <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 200px)' }}>
              {searchQuery.trim() && searchResults.length > 0 ? (
                /* Search Results */
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <MagnifyingGlassIcon className="w-5 h-5 text-blue-500" />
                    {isSpanish ? `Resultados de búsqueda (${searchResults.length})` : `Search Results (${searchResults.length})`}
                    <span className="text-sm font-normal text-gray-500">
                      {isSpanish ? `para "${searchQuery}"` : `for "${searchQuery}"`}
                    </span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
                    {searchResults.map(({ topic, score }) => (
                      <div key={topic.id} className="relative">
                        {renderTopicCard(topic, true)}
                        {/* Debug score indicator */}
                        <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                          {score}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : searchQuery.trim() && searchResults.length === 0 ? (
                /* No Results - Show Popular Topics */
                <div>
                  <div className="text-center py-8">
                    <div className="p-4 rounded-full bg-gray-100 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <MagnifyingGlassIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {isSpanish ? 'No se encontraron resultados' : 'No results found'}
                    </h3>
                    <p className="text-gray-600 mb-6">
                      {isSpanish ? `No encontramos resultados para "${searchQuery}". Aquí tienes algunos temas populares:` : `No results found for "${searchQuery}". Here are some popular topics:`}
                    </p>
                  </div>
                  
                  {/* Popular Topics */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-4">
                      {isSpanish ? '📚 Temas Populares' : '📚 Popular Topics'}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
                      {Object.values(helpTopics).slice(0, 6).map((topic) => renderTopicCard(topic))}
                    </div>
                  </div>
                  
                  <div className="text-center mt-8">
                    <button
                      onClick={() => setSearchQuery('')}
                      className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
                    >
                      {isSpanish ? 'Explorar todas las categorías' : 'Explore all categories'}
                    </button>
                  </div>
                </div>
              ) : (
                /* Category Browse */
                <div>
                  {/* Category Tabs */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                        selectedCategory === 'all'
                          ? 'bg-gray-900 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {isSpanish ? '📚 Todos' : '📚 All'}
                    </button>
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                          selectedCategory === category.id
                            ? `${getCategoryColor(category.id, 'bg')} ${getCategoryColor(category.id, 'text')} shadow-lg scale-105`
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {category.icon}
                        {category.name}
                      </button>
                    ))}
                  </div>

                  {/* Category Description */}
                  {selectedCategory !== 'all' && (
                    <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
                      <h3 className="font-bold text-gray-900 mb-1">
                        {categories.find(c => c.id === selectedCategory)?.name}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        {categories.find(c => c.id === selectedCategory)?.description}
                      </p>
                    </div>
                  )}

                  {/* Topics Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
                    {filteredTopics.map((topic) => renderTopicCard(topic))}
                  </div>

                  {filteredTopics.length === 0 && (
                    <div className="text-center py-12">
                      <div className="p-4 rounded-full bg-gray-100 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                        <BookOpenIcon className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-600">
                        {isSpanish ? 'No hay temas disponibles en esta categoría' : 'No topics available in this category'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center gap-4">
                  <span>💡 {isSpanish ? 'Consejo: Presiona' : 'Tip: Press'} <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">⌘K</kbd> {isSpanish ? 'o' : 'or'} <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">?</kbd> {isSpanish ? 'para ayuda rápida' : 'for quick help'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>{isSpanish ? 'Presiona' : 'Press'} <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">ESC</kbd> {isSpanish ? 'para cerrar' : 'to close'}</span>
                </div>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}