/**
 * Local Account Classification System
 * Provides intelligent fallback when AI service is unavailable
 */

export interface LocalClassification {
  accountName: string;
  suggestedCategory: string;
  isInflow: boolean;
  confidence: number;
  reasoning: string;
  detectionMethod: 'keyword' | 'value' | 'pattern' | 'section' | 'default';
}

export class LocalAccountClassifier {
  // Comprehensive keyword mappings for different categories
  private static categoryPatterns = {
    // Revenue categories
    revenue: {
      keywords: [
        'revenue', 'sales', 'income', 'turnover', 'receipts',
        'ingresos', 'ventas', 'facturacion', 'facturación',
        'servicios prestados', 'consulting fees', 'honorarios',
        'service income', 'rental income', 'commission'
      ],
      excludeIfContains: ['cost', 'expense', 'refund', 'return', 'discount'],
      isInflow: true
    },
    
    // Cost of Sales
    cost_of_sales: {
      keywords: [
        'cost of sales', 'cost of goods', 'cogs', 'cost of revenue',
        'direct cost', 'direct material', 'direct labor',
        'costo de ventas', 'costo de mercancia', 'costo directo',
        'materia prima', 'mano de obra directa', '(cor)', 'cost of service'
      ],
      isInflow: false
    },
    
    // Salaries and Wages
    salaries_wages: {
      keywords: [
        'salary', 'salaries', 'wage', 'wages', 'payroll',
        'sueldo', 'sueldos', 'salario', 'salarios', 'nomina', 'nómina',
        'compensation', 'employee cost', 'personnel', 'staff cost'
      ],
      excludeIfContains: ['tax', 'benefit', 'insurance'],
      isInflow: false
    },
    
    // Payroll Taxes
    payroll_taxes: {
      keywords: [
        'payroll tax', 'social security', 'medicare', 'fica',
        'employer tax', 'seguro social', 'imss', 'infonavit',
        'afore', 'sar', 'contribuciones patronales'
      ],
      isInflow: false
    },
    
    // Benefits
    benefits: {
      keywords: [
        'benefit', 'health insurance', 'life insurance', 'pension',
        'retirement', '401k', 'prestaciones', 'seguro de vida',
        'seguro medico', 'seguro médico', 'aguinaldo', 'bonos'
      ],
      isInflow: false
    },
    
    // Rent and Utilities
    rent_utilities: {
      keywords: [
        'rent', 'lease', 'utilities', 'electricity', 'water', 'gas',
        'renta', 'arrendamiento', 'servicios', 'luz', 'agua', 'gas',
        'internet', 'phone', 'telephone', 'teléfono'
      ],
      isInflow: false
    },
    
    // Marketing and Advertising
    marketing_advertising: {
      keywords: [
        'marketing', 'advertising', 'promotion', 'publicity',
        'mercadotecnia', 'publicidad', 'promoción', 'promocion',
        'ads', 'google ads', 'facebook ads', 'social media'
      ],
      isInflow: false
    },
    
    // Professional Services
    professional_services: {
      keywords: [
        'professional', 'legal', 'accounting', 'consulting', 'audit',
        'profesionales', 'legales', 'contabilidad', 'consultoría',
        'consultoria', 'auditoria', 'auditoría', 'notario'
      ],
      isInflow: false
    },
    
    // Office and Administrative
    office_supplies: {
      keywords: [
        'office', 'supplies', 'stationery', 'computer', 'software',
        'oficina', 'papelería', 'papeleria', 'suministros',
        'equipo de computo', 'equipo de cómputo', 'licencias'
      ],
      isInflow: false
    },
    
    // Travel and Entertainment
    travel_entertainment: {
      keywords: [
        'travel', 'transportation', 'hotel', 'meals', 'entertainment',
        'viaje', 'transporte', 'hotel', 'comidas', 'viáticos',
        'viaticos', 'gasolina', 'gasoline', 'uber', 'taxi'
      ],
      isInflow: false
    },
    
    // Bank Fees and Charges
    bank_fees: {
      keywords: [
        'bank fee', 'bank charge', 'service charge', 'commission',
        'comision bancaria', 'comisión bancaria', 'cargo bancario',
        'bank commission', 'processing fee', 'transaction fee'
      ],
      isInflow: false
    },
    
    // Interest Expense
    interest_expense: {
      keywords: [
        'interest expense', 'interest paid', 'finance charge',
        'gasto por interes', 'gasto por interés', 'intereses pagados',
        'costo financiero', 'finance cost'
      ],
      isInflow: false
    },
    
    // Interest Income
    interest_income: {
      keywords: [
        'interest income', 'interest earned', 'interest received',
        'ingreso por interes', 'ingreso por interés', 'intereses ganados',
        'rendimiento', 'investment income'
      ],
      isInflow: true
    },
    
    // Taxes
    income_tax: {
      keywords: [
        'income tax', 'corporate tax', 'isr', 'impuesto sobre la renta',
        'impuesto a las ganancias', 'tax expense', 'provision for tax'
      ],
      isInflow: false
    },
    
    // Other Taxes
    other_taxes: {
      keywords: [
        'tax', 'impuesto', 'iva', 'vat', 'sales tax',
        'property tax', 'impuesto predial', 'municipal tax',
        'levy', 'duty', 'contribución', 'contribucion'
      ],
      excludeIfContains: ['income', 'payroll', 'deferred', 'credit'],
      isInflow: false
    },
    
    // Depreciation and Amortization
    depreciation: {
      keywords: [
        'depreciation', 'amortization', 'depreciación', 'depreciacion',
        'amortización', 'amortizacion', 'depletion'
      ],
      isInflow: false
    },
    
    // Insurance
    insurance: {
      keywords: [
        'insurance', 'seguro', 'policy', 'póliza', 'poliza',
        'coverage', 'cobertura', 'premium', 'prima'
      ],
      excludeIfContains: ['health', 'life', 'employee'],
      isInflow: false
    },
    
    // Other Income
    other_income: {
      keywords: [
        'other income', 'miscellaneous income', 'otros ingresos',
        'ingreso diverso', 'extraordinary income', 'gain on sale'
      ],
      isInflow: true
    },
    
    // Other Expenses
    other_expense: {
      keywords: [
        'other expense', 'miscellaneous expense', 'otros gastos',
        'gasto diverso', 'extraordinary expense', 'loss on sale',
        'fee', 'charge', 'cost', 'expense', 'gasto'
      ],
      isInflow: false
    }
  };

  /**
   * Classify an account based on its name and optional value
   */
  static classifyAccount(
    accountName: string,
    value?: number | string,
    context?: { statementType?: string; rowData?: any }
  ): LocalClassification {
    const normalizedName = accountName.toLowerCase().trim();
    
    // First, check if the value indicates an expense (negative or in parentheses)
    const isNegativeValue = this.isNegativeValue(value);
    
    // Try keyword-based classification with scoring
    let bestMatch = { category: '', score: 0, pattern: null as any };
    
    for (const [category, pattern] of Object.entries(this.categoryPatterns)) {
      let score = 0;
      const matchedKeywords: string[] = [];
      
      // Calculate match score based on keywords
      for (const keyword of pattern.keywords) {
        const lowerKeyword = keyword.toLowerCase();
        if (normalizedName.includes(lowerKeyword)) {
          // Exact match gets higher score
          if (normalizedName === lowerKeyword) {
            score += 10;
          } else if (normalizedName.startsWith(lowerKeyword)) {
            score += 7;
          } else {
            score += 5;
          }
          matchedKeywords.push(keyword);
        }
      }
      
      // Check exclusions
      const hasExclusion = pattern.excludeIfContains?.some(exclusion =>
        normalizedName.includes(exclusion.toLowerCase())
      ) || false;
      
      if (hasExclusion) {
        score = 0; // Exclude this category
      }
      
      // Keep track of best match
      if (score > bestMatch.score) {
        bestMatch = { category, score, pattern };
      }
    }
    
    // If we found a good match, use it
    if (bestMatch.score > 0) {
        const pattern = bestMatch.pattern;
        // Special handling for value-based detection
        let finalIsInflow = pattern.isInflow;
        let confidence = Math.min(75 + bestMatch.score, 95);
        
        // If we have a value, use it to verify the classification
        if (value !== undefined && value !== null) {
          if (isNegativeValue && pattern.isInflow) {
            // This looks like revenue but has negative value - might be a return/refund
            finalIsInflow = false;
            confidence = 60;
          } else if (!isNegativeValue && !pattern.isInflow) {
            // This looks like expense but has positive value - less common but possible
            confidence = 65;
          } else {
            // Value matches expected pattern
            confidence = 85;
          }
        }
        
        return {
          accountName,
          suggestedCategory: bestMatch.category,
          isInflow: finalIsInflow,
          confidence,
          reasoning: `Matched keywords (score: ${bestMatch.score})`,
          detectionMethod: 'keyword'
        };
    }
    
    // If no keyword match, try value-based detection
    if (value !== undefined && value !== null) {
      if (isNegativeValue) {
        // Negative values are typically expenses
        return {
          accountName,
          suggestedCategory: 'other_expense',
          isInflow: false,
          confidence: 70,
          reasoning: 'Negative value indicates expense',
          detectionMethod: 'value'
        };
      }
    }
    
    // Pattern-based detection for specific formats
    const patterns = this.detectByPattern(normalizedName);
    if (patterns) {
      return {
        accountName,
        ...patterns,
        detectionMethod: 'pattern'
      };
    }
    
    // Default classification based on common expense words
    const expenseWords = ['expense', 'cost', 'fee', 'charge', 'gasto', 'costo'];
    const hasExpenseWord = expenseWords.some(word => normalizedName.includes(word));
    
    if (hasExpenseWord) {
      return {
        accountName,
        suggestedCategory: 'other_expense',
        isInflow: false,
        confidence: 60,
        reasoning: 'Contains common expense terminology',
        detectionMethod: 'default'
      };
    }
    
    // Ultimate fallback - but now we default to expense if we have negative value
    return {
      accountName,
      suggestedCategory: isNegativeValue ? 'other_expense' : 'other_income',
      isInflow: !isNegativeValue,
      confidence: 40,
      reasoning: 'No specific pattern detected' + (isNegativeValue ? ', negative value suggests expense' : ''),
      detectionMethod: 'default'
    };
  }

  /**
   * Check if a value is negative (including parentheses notation)
   */
  private static isNegativeValue(value?: number | string): boolean {
    if (value === undefined || value === null) return false;
    
    if (typeof value === 'number') {
      return value < 0;
    }
    
    if (typeof value === 'string') {
      // Check for parentheses (accounting notation for negative)
      if (value.includes('(') && value.includes(')')) {
        return true;
      }
      
      // Check for negative sign
      const numericValue = parseFloat(value.replace(/[^0-9.-]/g, ''));
      return !isNaN(numericValue) && numericValue < 0;
    }
    
    return false;
  }

  /**
   * Detect category by specific patterns in account names
   */
  private static detectByPattern(accountName: string): Omit<LocalClassification, 'accountName' | 'detectionMethod'> | null {
    // Account code patterns (e.g., "4000 - Sales Revenue")
    const accountCodeMatch = accountName.match(/^(\d{4,})\s*[-–]\s*(.+)/);
    if (accountCodeMatch) {
      const code = accountCodeMatch[1];
      const description = accountCodeMatch[2].toLowerCase();
      
      // Common account code ranges
      if (code.startsWith('4')) {
        return {
          suggestedCategory: 'revenue',
          isInflow: true,
          confidence: 80,
          reasoning: `Account code ${code} typically indicates revenue`
        };
      } else if (code.startsWith('5')) {
        return {
          suggestedCategory: 'cost_of_sales',
          isInflow: false,
          confidence: 80,
          reasoning: `Account code ${code} typically indicates cost of sales`
        };
      } else if (code.startsWith('6')) {
        return {
          suggestedCategory: 'operating_expense',
          isInflow: false,
          confidence: 75,
          reasoning: `Account code ${code} typically indicates operating expense`
        };
      }
    }
    
    // Total/Subtotal patterns
    if (accountName.match(/^(total|subtotal|suma)/i)) {
      return null; // Skip totals
    }
    
    return null;
  }

  /**
   * Classify multiple accounts at once
   */
  static classifyAccounts(
    accounts: Array<{ name: string; value?: number | string; rowData?: any }>,
    context?: { statementType?: string }
  ): LocalClassification[] {
    return accounts.map(account => 
      this.classifyAccount(account.name, account.value, { ...context, rowData: account.rowData })
    );
  }
}