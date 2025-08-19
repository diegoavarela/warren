/**
 * Super Cool Help System
 * Provides smart search, contextual help, and interactive assistance
 */

import { helpTopics } from '@/lib/help-content';

export interface HelpSearchResult {
  id: string;
  title: string;
  content: string;
  category: string;
  score: number;
  highlights: string[];
}

export interface HelpSuggestion {
  id: string;
  title: string;
  reason: string;
  relevance: number;
}

export class SuperCoolHelpService {
  private static instance: SuperCoolHelpService;
  private searchIndex: Map<string, any> = new Map();
  private userInteractions: Map<string, number> = new Map();

  static getInstance(): SuperCoolHelpService {
    if (!SuperCoolHelpService.instance) {
      SuperCoolHelpService.instance = new SuperCoolHelpService();
    }
    return SuperCoolHelpService.instance;
  }

  constructor() {
    this.buildSearchIndex();
    this.loadUserInteractions();
  }

  /**
   * Build smart search index with keywords, synonyms, and context
   */
  private buildSearchIndex(): void {
    // Enhanced keyword mapping for better search
    const keywords = {
      // Revenue keywords
      'revenue': ['ingresos', 'revenue', 'sales', 'ventas', 'income', 'turnover'],
      'growth': ['crecimiento', 'growth', 'increase', 'aumento', 'expansion'],
      'trend': ['tendencia', 'trend', 'pattern', 'patrón', 'evolution'],
      
      // Cost keywords  
      'cost': ['costs', 'costos', 'gastos', 'expenses', 'spending'],
      'cogs': ['cogs', 'cost of goods', 'costo de ventas', 'direct costs'],
      'opex': ['opex', 'operating expenses', 'gastos operacionales', 'operational'],
      
      // Profit keywords
      'profit': ['profit', 'utilidad', 'ganancia', 'beneficio', 'margin'],
      'ebitda': ['ebitda', 'earnings', 'ganancias', 'operating income'],
      'margin': ['margin', 'margen', 'percentage', 'porcentaje'],
      
      // Cash flow keywords
      'cash': ['cash', 'efectivo', 'flujo', 'flow', 'liquidity', 'liquidez'],
      'runway': ['runway', 'pista', 'burn rate', 'survival time'],
      'forecast': ['forecast', 'projection', 'proyección', 'prediction'],
      
      // Analysis keywords
      'analysis': ['analysis', 'análisis', 'breakdown', 'desglose'],
      'comparison': ['comparison', 'comparación', 'vs', 'versus', 'compare'],
      'ytd': ['ytd', 'year to date', 'año hasta la fecha', 'acumulado'],
      
      // Visual keywords
      'chart': ['chart', 'gráfico', 'graph', 'visualization', 'visual'],
      'heatmap': ['heatmap', 'mapa de calor', 'heat map', 'color map'],
      'dashboard': ['dashboard', 'panel', 'overview', 'resumen'],
      
      // Upload keywords
      'upload': ['upload', 'subir', 'import', 'importar', 'file', 'archivo'],
      'excel': ['excel', 'spreadsheet', 'hoja de cálculo', 'xls', 'xlsx'],
      'template': ['template', 'plantilla', 'format', 'formato'],
      'mapping': ['mapping', 'mapeo', 'configuration', 'configuración'],
      
      // Filter keywords
      'filter': ['filter', 'filtro', 'selector', 'selection'],
      'period': ['period', 'período', 'time', 'tiempo', 'date', 'fecha'],
      'currency': ['currency', 'moneda', 'exchange', 'cambio'],
      'units': ['units', 'unidades', 'scale', 'escala', 'thousands', 'millions']
    };

    // Build reverse index for fast lookup
    Object.entries(keywords).forEach(([concept, terms]) => {
      terms.forEach(term => {
        if (!this.searchIndex.has(term.toLowerCase())) {
          this.searchIndex.set(term.toLowerCase(), []);
        }
        this.searchIndex.get(term.toLowerCase())?.push(concept);
      });
    });
  }

  /**
   * Load user interaction data for personalized suggestions
   */
  private loadUserInteractions(): void {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('warren_help_interactions');
      if (stored) {
        try {
          const data = JSON.parse(stored);
          this.userInteractions = new Map(Object.entries(data));
        } catch (e) {
          console.warn('Failed to load help interactions:', e);
        }
      }
    }
  }

  /**
   * Save user interaction data
   */
  private saveUserInteractions(): void {
    if (typeof window !== 'undefined') {
      const data = Object.fromEntries(this.userInteractions);
      localStorage.setItem('warren_help_interactions', JSON.stringify(data));
    }
  }

  /**
   * Track user interaction with help topic
   */
  trackInteraction(topicId: string): void {
    const current = this.userInteractions.get(topicId) || 0;
    this.userInteractions.set(topicId, current + 1);
    this.saveUserInteractions();
  }

  /**
   * Smart search with scoring and relevance
   */
  search(query: string, locale: string = 'en'): HelpSearchResult[] {
    if (!query.trim()) return [];
    
    const normalizedQuery = query.toLowerCase().trim();
    const queryTerms = normalizedQuery.split(/\s+/);
    const results: Map<string, HelpSearchResult> = new Map();

    Object.values(helpTopics).forEach(topic => {
      let score = 0;
      const highlights: string[] = [];
      
      // Get translated content for search
      const title = this.getTranslatedText(topic.titleKey, locale);
      const content = this.getTranslatedText(topic.contentKey, locale);
      
      // Direct text matching
      queryTerms.forEach(term => {
        const titleLower = title.toLowerCase();
        const contentLower = content.toLowerCase();
        
        // Exact phrase match in title (highest score)
        if (titleLower.includes(normalizedQuery)) {
          score += 20;
          highlights.push('title-exact');
        }
        
        // Individual term match in title
        if (titleLower.includes(term)) {
          score += 10;
          highlights.push(`title-${term}`);
        }
        
        // Content matching
        if (contentLower.includes(term)) {
          score += 5;
          highlights.push(`content-${term}`);
        }
      });

      // Concept-based matching using search index
      queryTerms.forEach(term => {
        const concepts = this.searchIndex.get(term) || [];
        concepts.forEach((concept: string) => {
          // Check if topic relates to this concept
          if (title.toLowerCase().includes(concept) || 
              content.toLowerCase().includes(concept) ||
              topic.category === concept) {
            score += 8;
            highlights.push(`concept-${concept}`);
          }
        });
      });

      // Category boost
      if (topic.category && queryTerms.some(term => 
          topic.category?.toLowerCase().includes(term))) {
        score += 6;
        highlights.push('category');
      }

      // User interaction boost (personalization)
      const interactionCount = this.userInteractions.get(topic.id) || 0;
      score += Math.min(interactionCount * 2, 10);

      if (score > 0) {
        results.set(topic.id, {
          id: topic.id,
          title,
          content: content.replace(/<[^>]*>/g, ''), // Remove HTML tags
          category: topic.category || 'general',
          score,
          highlights: Array.from(new Set(highlights)) // Remove duplicates
        });
      }
    });

    return Array.from(results.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }

  /**
   * Get contextual suggestions based on current page/widget
   */
  getSuggestions(context: {
    page?: string;
    widget?: string;
    category?: string;
    userLevel?: 'beginner' | 'intermediate' | 'advanced';
  }): HelpSuggestion[] {
    const suggestions: HelpSuggestion[] = [];
    
    // Context-based suggestions
    const contextMappings = {
      'pnl-dashboard': ['dashboard.revenue', 'dashboard.costs', 'dashboard.profitability', 'metrics.totalRevenue'],
      'cashflow-dashboard': ['dashboard.cashflow', 'dashboard.runway', 'dashboard.scenarios', 'dashboard.trends'],
      'upload': ['upload.template', 'upload.mapping', 'mapper.aiAnalysis'],
      'configurations': ['mapper.manualMapping', 'upload.classification', 'mapper.dataRange'],
      'filters': ['filters.period', 'filters.currency', 'filters.units']
    };

    const contextKey = context.page || context.widget || context.category;
    const relatedTopics = contextMappings[contextKey as keyof typeof contextMappings] || [];

    relatedTopics.forEach((topicId, index) => {
      const topic = helpTopics[topicId];
      if (topic) {
        suggestions.push({
          id: topicId,
          title: this.getTranslatedText(topic.titleKey, 'en'),
          reason: index === 0 ? 'Most relevant for current view' : 'Related to current context',
          relevance: 10 - index
        });
      }
    });

    // Add popular topics based on user interactions
    const popularTopics = Array.from(this.userInteractions.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([topicId]) => {
        const topic = helpTopics[topicId];
        return topic ? {
          id: topicId,
          title: this.getTranslatedText(topic.titleKey, 'en'),
          reason: 'Frequently accessed',
          relevance: 8
        } : null;
      })
      .filter(Boolean) as HelpSuggestion[];

    suggestions.push(...popularTopics);

    return suggestions
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 6);
  }

  /**
   * Get quick answers for common questions
   */
  getQuickAnswer(question: string, locale: string = 'en'): string | null {
    const lowerQuestion = question.toLowerCase();
    
    const quickAnswers = {
      'how to upload': 'Go to Upload Data section, select a template, map your Excel columns, and process the file.',
      'revenue not showing': 'Check your configuration mapping for revenue categories and ensure data is properly classified.',
      'change currency': 'Use the currency selector in the dashboard filters to convert all values.',
      'cash runway': 'Cash runway shows how long your current cash will last based on your burn rate.',
      'period comparison': 'Use the "Compare with" filter to select a different period for side-by-side analysis.',
      'export data': 'Use the export button in the top-right corner of any dashboard to download PDF or Excel reports.'
    };

    // Spanish quick answers
    const quickAnswersEs = {
      'como subir': 'Ve a Subir Datos, selecciona una plantilla, mapea las columnas de Excel y procesa el archivo.',
      'ingresos no aparecen': 'Revisa la configuración de mapeo para categorías de ingresos y asegúrate que los datos estén clasificados.',
      'cambiar moneda': 'Usa el selector de moneda en los filtros del dashboard para convertir todos los valores.',
      'runway efectivo': 'El runway de efectivo muestra cuánto tiempo durará tu efectivo actual basado en tu burn rate.',
      'comparar periodos': 'Usa el filtro "Comparar con" para seleccionar un período diferente para análisis lado a lado.',
      'exportar datos': 'Usa el botón de exportar en la esquina superior derecha de cualquier dashboard para descargar reportes PDF o Excel.'
    };

    const answers = locale.startsWith('es') ? quickAnswersEs : quickAnswers;
    
    for (const [key, answer] of Object.entries(answers)) {
      if (lowerQuestion.includes(key)) {
        return answer;
      }
    }

    return null;
  }

  /**
   * Helper to get translated text with fallbacks
   */
  private getTranslatedText(key: string, locale: string): string {
    // Create a simplified fallback translation system
    const translations: Record<string, Record<string, string>> = {
      'es': {
        'help.dashboard.revenue.title': 'Análisis de Ingresos',
        'help.dashboard.revenue.content': 'Analiza el crecimiento de ingresos, tendencias y comparaciones períodicas.',
        'help.dashboard.cashflow.title': 'Flujo de Caja',
        'help.dashboard.cashflow.content': 'Gestiona entradas, salidas y proyecciones de efectivo.',
        'help.dashboard.profitability.title': 'Rentabilidad',
        'help.dashboard.profitability.content': 'Métricas de margen bruto, operacional y neto.',
        'help.upload.template.title': 'Plantillas de Subida',
        'help.upload.template.content': 'Configurar y usar plantillas para mapear archivos Excel.',
        'help.filters.period.title': 'Filtros de Período',
        'help.filters.period.content': 'Seleccionar y comparar diferentes períodos de tiempo.',
        'help.dashboard.costs.title': 'Análisis de Costos',
        'help.dashboard.costs.content': 'Desglose de costos de ventas y gastos operacionales.',
        'help.metrics.totalRevenue.title': 'Ingresos Totales',
        'help.metrics.totalRevenue.content': 'Suma de todos los ingresos del período seleccionado.'
      },
      'en': {
        'help.dashboard.revenue.title': 'Revenue Analysis',
        'help.dashboard.revenue.content': 'Analyze revenue growth, trends, and period comparisons.',
        'help.dashboard.cashflow.title': 'Cash Flow',
        'help.dashboard.cashflow.content': 'Manage cash inflows, outflows, and projections.',
        'help.dashboard.profitability.title': 'Profitability',
        'help.dashboard.profitability.content': 'Gross, operating, and net margin metrics.',
        'help.upload.template.title': 'Upload Templates',
        'help.upload.template.content': 'Configure and use templates for Excel file mapping.',
        'help.filters.period.title': 'Period Filters',
        'help.filters.period.content': 'Select and compare different time periods.',
        'help.dashboard.costs.title': 'Cost Analysis',
        'help.dashboard.costs.content': 'Breakdown of cost of goods sold and operating expenses.',
        'help.metrics.totalRevenue.title': 'Total Revenue',
        'help.metrics.totalRevenue.content': 'Sum of all revenue for the selected period.'
      }
    };

    const lang = locale.startsWith('es') ? 'es' : 'en';
    const translation = translations[lang]?.[key];
    
    if (translation) {
      return translation;
    }
    
    // Fallback to readable key
    return key
      .replace('help.', '')
      .replace('.title', '')
      .replace('.content', '')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  }

  /**
   * Get help analytics for improving the system
   */
  getAnalytics(): {
    topSearches: string[];
    popularTopics: string[];
    userEngagement: number;
  } {
    const totalInteractions = Array.from(this.userInteractions.values())
      .reduce((sum, count) => sum + count, 0);
    
    const popularTopics = Array.from(this.userInteractions.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([topicId]) => topicId);

    return {
      topSearches: [], // Would track search queries
      popularTopics,
      userEngagement: totalInteractions
    };
  }
}

// Global instance
export const superCoolHelp = SuperCoolHelpService.getInstance();