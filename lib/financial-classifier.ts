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
  
  other_income_expense: {
    name: 'other_income_expense',
    flowType: 'neutral',
    keywords: {
      english: ['other income / (expense)', 'other income expense', 'net other income'],
      spanish: ['otros ingresos / (gastos)', 'otros ingresos gastos', 'ingresos gastos netos'],
      generic: ['other income expense', 'other net']
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
  },
  
  // Calculated totals - these are already calculated in Excel
  gross_profit: {
    name: 'gross_profit',
    flowType: 'neutral',
    keywords: {
      english: ['gross profit', 'gross income', 'gross margin value'],
      spanish: ['utilidad bruta', 'ganancia bruta', 'margen bruto', 'resultado bruto'],
      generic: ['gross profit', 'utilidad bruta']
    },
    excludeKeywords: ['gross margin %', 'margen bruto %']
  },
  
  operating_income: {
    name: 'operating_income',
    flowType: 'neutral',
    keywords: {
      english: ['operating income', 'operating profit', 'operating result'],
      spanish: ['utilidad operativa', 'resultado operativo', 'ganancia operativa'],
      generic: ['operating income', 'ebit']
    },
    excludeKeywords: ['operating margin', 'margen operativo']
  },
  
  net_income: {
    name: 'net_income',
    flowType: 'neutral',
    keywords: {
      english: ['net income', 'net profit', 'net earnings', 'bottom line'],
      spanish: ['utilidad neta', 'resultado neto', 'ganancia neta', 'beneficio neto'],
      generic: ['net income', 'net result']
    },
    excludeKeywords: ['net margin', 'margen neto']
  },
  
  earnings_before_tax: {
    name: 'earnings_before_tax',
    flowType: 'neutral',
    keywords: {
      english: ['earnings before tax', 'pre-tax income', 'income before taxes', 'profit before tax'],
      spanish: ['utilidad antes de impuestos', 'resultado antes de impuestos', 'ganancia antes de impuestos', 'beneficio antes de impuestos'],
      generic: ['ebt', 'pre-tax', 'before tax']
    },
    excludeKeywords: ['earnings before tax margin', 'margen antes de impuestos']
  },

  ebitda: {
    name: 'ebitda',
    flowType: 'neutral',
    keywords: {
      english: ['ebitda', 'earnings before interest taxes depreciation amortization'],
      spanish: ['ebitda', 'resultado antes de intereses impuestos depreciación amortización'],
      generic: ['ebitda']
    },
    excludeKeywords: ['ebitda margin', 'margen ebitda']
  },
  
  // Margin percentages - if they exist in Excel
  gross_margin: {
    name: 'gross_margin',
    flowType: 'neutral',
    keywords: {
      english: ['gross margin %', 'gross profit margin', 'gp margin'],
      spanish: ['margen bruto %', 'porcentaje de utilidad bruta', 'margen de ganancia bruta'],
      generic: ['gross margin', 'gm %']
    }
  },
  
  operating_margin: {
    name: 'operating_margin',
    flowType: 'neutral',
    keywords: {
      english: ['operating margin %', 'operating profit margin', 'op margin'],
      spanish: ['margen operativo %', 'porcentaje de utilidad operativa', 'margen de operación'],
      generic: ['operating margin', 'om %']
    }
  },
  
  net_margin: {
    name: 'net_margin',
    flowType: 'neutral',
    keywords: {
      english: ['net margin %', 'net profit margin', 'np margin'],
      spanish: ['margen neto %', 'porcentaje de utilidad neta', 'margen de beneficio neto'],
      generic: ['net margin', 'nm %']
    }
  },
  
  ebitda_margin: {
    name: 'ebitda_margin',
    flowType: 'neutral',
    keywords: {
      english: ['ebitda margin %', 'ebitda profit margin'],
      spanish: ['margen ebitda %', 'porcentaje de ebitda'],
      generic: ['ebitda margin', 'ebitda %']
    }
  }
};

export class FinancialClassifier {
  static classifyAccount(accountName: string, metadata?: any): string[] {
    const name = accountName.toLowerCase();
    const matchedCategories: string[] = [];
    
    // First, check if we have metadata from the mapper
    if (metadata?.flowType && metadata?.category) {
      // Special handling for the new explicit categories
      if (metadata.category === 'total' || metadata.category === 'margin' || metadata.category === 'calculation') {
        const specificCategory = this.mapSpecialCategoryToDetailed(metadata.category, accountName);
        if (specificCategory) {
          matchedCategories.push(specificCategory);
          return matchedCategories;
        }
      }
      
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
  
  private static mapSpecialCategoryToDetailed(category: string, accountName: string): string | null {
    const name = accountName.toLowerCase();
    
    if (category === 'total') {
      // Map based on account name
      if (name.includes('gross profit') || name.includes('utilidad bruta')) {
        return 'gross_profit';
      }
      if (name.includes('operating income') || name.includes('utilidad operativa')) {
        return 'operating_income';
      }
      if (name.includes('earnings before tax') || name.includes('utilidad antes de impuestos') || name.includes('pre-tax')) {
        return 'earnings_before_tax';
      }
      if (name.includes('net income') || name.includes('utilidad neta')) {
        return 'net_income';
      }
      if (name.includes('revenue') || name.includes('ingresos')) {
        return 'revenue';
      }
      if (name.includes('cogs') || name.includes('cost') || name.includes('costo')) {
        return 'cogs';
      }
      return 'gross_profit'; // Default
    }
    
    if (category === 'margin') {
      // Map based on account name
      if (name.includes('gross margin') || name.includes('margen bruto')) {
        return 'gross_margin';
      }
      if (name.includes('operating margin') || name.includes('margen operativo')) {
        return 'operating_margin';
      }
      if (name.includes('net margin') || name.includes('margen neto')) {
        return 'net_margin';
      }
      if (name.includes('ebitda margin') || name.includes('margen ebitda')) {
        return 'ebitda_margin';
      }
      return 'gross_margin'; // Default
    }
    
    if (category === 'calculation') {
      // Map based on account name
      if (name.includes('ebitda')) {
        return 'ebitda';
      }
      if (name.includes('ebit') || name.includes('operating income')) {
        return 'operating_income';
      }
      if (name.includes('gross profit') || name.includes('utilidad bruta')) {
        return 'gross_profit';
      }
      if (name.includes('earnings before tax') || name.includes('utilidad antes de impuestos') || name.includes('pre-tax')) {
        return 'earnings_before_tax';
      }
      if (name.includes('net income') || name.includes('utilidad neta')) {
        return 'net_income';
      }
      return 'operating_income'; // Default
    }
    
    return null;
  }
  
  private static mapFlowTypeToCategory(flowType: string, categoryName: string): string | null {
    const category = categoryName.toLowerCase();
    
    // Handle the new explicit categories
    if (category === 'total') {
      // Map to specific total categories based on account name
      return 'gross_profit'; // Default, but should be refined based on context
    }
    
    if (category === 'margin') {
      // Map to specific margin categories based on account name
      return 'gross_margin'; // Default, but should be refined based on context
    }
    
    if (category === 'calculation') {
      // Map to specific calculation categories based on account name
      return 'operating_income'; // Default, but should be refined based on context
    }
    
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
    
    if (flowType === 'neutral') {
      // Handle calculated totals
      if (category.includes('gross profit') || category.includes('utilidad bruta')) {
        return 'gross_profit';
      }
      if (category.includes('operating income') || category.includes('operating profit') || category.includes('utilidad operativa')) {
        return 'operating_income';
      }
      if (category.includes('earnings before tax') || category.includes('utilidad antes de impuestos') || category.includes('pre-tax')) {
        return 'earnings_before_tax';
      }
      if (category.includes('net income') || category.includes('net profit') || category.includes('utilidad neta')) {
        return 'net_income';
      }
      if (category.includes('ebitda')) {
        return 'ebitda';
      }
      // Handle margin percentages
      if (category.includes('gross margin') || category.includes('margen bruto')) {
        return 'gross_margin';
      }
      if (category.includes('operating margin') || category.includes('margen operativo')) {
        return 'operating_margin';
      }
      if (category.includes('net margin') || category.includes('margen neto')) {
        return 'net_margin';
      }
      if (category.includes('ebitda margin') || category.includes('margen ebitda')) {
        return 'ebitda_margin';
      }
      return 'other_net';
    }
    
    return null;
  }
  
  static getConfidenceScore(accountName: string, categories: string[]): number {
    if (categories.length === 0) return 0;
    if (categories.length === 1) return 0.9;
    return 0.6; // Multiple matches = lower confidence
  }
}