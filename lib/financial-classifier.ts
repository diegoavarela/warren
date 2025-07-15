// Generic Financial Statement Classifier
// This makes the system work with any P&L format

export interface FinancialCategory {
  name: string;
  flowType: 'inbound' | 'outbound' | 'neutral';
  keywords: {
    english: string[];
    spanish: string[];
    generic: string[];
  };
  excludeKeywords?: string[];
  alternativeCategories?: string[];
}

export const FINANCIAL_CATEGORIES: Record<string, FinancialCategory> = {
  revenue: {
    name: 'revenue',
    flowType: 'inbound',
    keywords: {
      english: ['revenue', 'sales', 'service revenue', 'product sales'],
      spanish: ['ingresos', 'ventas', 'servicios', 'productos'],
      generic: ['total revenue', 'net sales', 'gross sales']
    },
    excludeKeywords: ['net income', 'operating income', 'other income']
  },
  
  cogs: {
    name: 'cogs',
    flowType: 'outbound',
    keywords: {
      english: ['cost of goods sold', 'cost of sales', 'cost of revenue', 'direct costs', 'product costs'],
      spanish: ['costo de ventas', 'costo de productos', 'costos directos'],
      generic: ['cogs', 'cos']
    }
  },
  
  operating_expenses: {
    name: 'operating_expenses',
    flowType: 'outbound',
    keywords: {
      english: ['operating expenses', 'opex', 'administrative expenses', 'selling expenses'],
      spanish: ['gastos operativos', 'gastos administrativos', 'gastos de ventas'],
      generic: ['salaries', 'rent', 'utilities', 'marketing', 'office']
    }
  },
  
  other_income: {
    name: 'other_income',
    flowType: 'inbound',
    keywords: {
      english: ['interest income', 'investment income', 'gain on fx', 'foreign exchange gains'],
      spanish: ['ingresos financieros', 'ganancia cambiaria'],
      generic: ['interest', 'dividend', 'gain']
    }
  },
  
  other_expenses: {
    name: 'other_expenses',
    flowType: 'outbound',
    keywords: {
      english: ['interest expense', 'financial expenses', 'loss on fx', 'depreciation'],
      spanish: ['gastos financieros', 'pérdida cambiaria', 'depreciación'],
      generic: ['interest expense', 'bank fees', 'loss']
    }
  },
  
  other_net: {
    name: 'other_net',
    flowType: 'neutral',
    keywords: {
      english: ['total other income / (expense)', 'other income / (expense)', 'net other'],
      spanish: ['otros ingresos / (gastos)', 'total otros'],
      generic: ['other net']
    }
  },
  
  taxes: {
    name: 'taxes',
    flowType: 'outbound',
    keywords: {
      english: ['income tax', 'tax expense', 'gross income tax', 'withholding tax', 'iibb'],
      spanish: ['impuesto a las ganancias', 'impuestos', 'iibb', 'retenciones'],
      generic: ['tax']
    }
  }
};

export class FinancialClassifier {
  static classifyAccount(accountName: string, metadata?: any): string[] {
    const name = accountName.toLowerCase();
    const matchedCategories: string[] = [];
    
    // First, check if we have metadata from the mapper
    if (metadata?.flowType && metadata?.category) {
      const category = this.mapFlowTypeToCategory(metadata.flowType, metadata.category);
      if (category) {
        matchedCategories.push(category);
      }
    }
    
    // Then, check against our keyword patterns
    for (const [categoryKey, category] of Object.entries(FINANCIAL_CATEGORIES)) {
      const allKeywords = [
        ...category.keywords.english,
        ...category.keywords.spanish,
        ...category.keywords.generic
      ];
      
      // Check if any keyword matches
      if (allKeywords.some(keyword => name.includes(keyword.toLowerCase()))) {
        // Check excluded keywords
        if (category.excludeKeywords) {
          const isExcluded = category.excludeKeywords.some(excludeKeyword => 
            name.includes(excludeKeyword.toLowerCase())
          );
          if (isExcluded) {
            continue; // Skip this category
          }
        }
        
        if (!matchedCategories.includes(categoryKey)) {
          matchedCategories.push(categoryKey);
        }
      }
    }
    
    return matchedCategories;
  }
  
  private static mapFlowTypeToCategory(flowType: string, categoryName: string): string | null {
    const category = categoryName.toLowerCase();
    
    if (flowType === 'inbound') {
      if (category.includes('revenue') || category.includes('income') || category.includes('sales')) {
        return 'revenue';
      }
      return 'other_income';
    }
    
    if (flowType === 'outbound') {
      if (category.includes('cost') && (category.includes('goods') || category.includes('sales') || category.includes('revenue'))) {
        return 'cogs';
      }
      if (category.includes('tax')) {
        return 'taxes';
      }
      if (category.includes('other') || category.includes('financial') || category.includes('interest') || category.includes('depreciation')) {
        return 'other_expenses';
      }
      return 'operating_expenses';
    }
    
    return null;
  }
  
  static getConfidenceScore(accountName: string, categories: string[]): number {
    if (categories.length === 0) return 0;
    if (categories.length === 1) return 0.9;
    return 0.6; // Multiple matches = lower confidence
  }
}