/**
 * Smart Account Mapping
 * AI-powered account name analysis for intelligent category suggestions
 * Supports multilingual (English/Spanish) account name recognition
 */

import { ExtendedFinancialCategory } from './custom-categories';

// Confidence levels for suggestions
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface CategorySuggestion {
  category: string;
  confidence: ConfidenceLevel;
  matchedKeywords: string[];
  reason: string;
}

// Bilingual keyword mappings for each category
const CATEGORY_KEYWORDS = {
  // Revenue categories
  service_revenue: {
    en: ['service', 'services', 'consulting', 'professional fee', 'fee', 'consultancy'],
    es: ['servicio', 'servicios', 'consultoría', 'honorario', 'consultoria']
  },
  revenue: {
    en: ['revenue', 'income', 'sales', 'earning'],
    es: ['ingreso', 'venta', 'facturación', 'ganancia']
  },
  other_revenue: {
    en: ['other', 'miscellaneous', 'transfer', 'misc', 'additional'],
    es: ['otro', 'varios', 'transferencia', 'adicional', 'misceláneo']
  },
  interest_income: {
    en: ['interest income', 'interest earned', 'investment income', 'interest'],
    es: ['intereses ganados', 'ingresos por intereses', 'rendimiento', 'interés']
  },

  // Cost of Sales categories
  direct_labor: {
    en: ['personnel', 'salary', 'wage', 'labor', 'payroll', 'staff', 'employee', 'worker', 'cor', '(cor)'],
    es: ['personal', 'salario', 'sueldo', 'nómina', 'mano de obra', 'empleado', 'trabajador', 'cdv', '(cdv)']
  },
  direct_materials: {
    en: ['material', 'supply', 'supplies', 'inventory', 'raw material', 'component', 'cor', '(cor)'],
    es: ['material', 'suministro', 'inventario', 'materia prima', 'componente', 'insumo', 'cdv', '(cdv)']
  },
  manufacturing_overhead: {
    en: ['overhead', 'indirect', 'factory', 'plant', 'manufacturing', 'cor', '(cor)'],
    es: ['indirecto', 'gastos indirectos', 'fábrica', 'planta', 'fabricación', 'cdv', '(cdv)']
  },
  cost_of_sales: {
    en: ['cost', 'expense', 'cogs', 'cor', '(cor)', 'cost of revenue', 'cost of sales'],
    es: ['costo', 'gasto', 'coste', 'cdv', '(cdv)', 'costo de venta', 'costo de ventas']
  },

  // Operating Expenses categories
  payroll_taxes: {
    en: ['payroll tax', 'employment tax', 'social security', 'fica', 'payroll taxes'],
    es: ['impuesto sobre nómina', 'cargas sociales', 'seguridad social', 'cuotas patronales', 'impuestos sobre nómina']
  },
  benefits: {
    en: ['health', 'insurance', 'benefit', 'medical', 'coverage', 'healthcare', 'dental', 'vision'],
    es: ['salud', 'seguro', 'beneficio', 'médico', 'cobertura', 'prestación', 'dental', 'visión']
  },
  salaries_wages: {
    en: ['salary', 'wage', 'compensation', 'pay', 'remuneration'],
    es: ['salario', 'sueldo', 'compensación', 'pago', 'remuneración']
  },
  rent_utilities: {
    en: ['rent', 'utility', 'utilities', 'electricity', 'water', 'gas', 'lease', 'power'],
    es: ['renta', 'alquiler', 'servicio', 'luz', 'agua', 'gas', 'electricidad', 'arrendamiento']
  },
  travel_entertainment: {
    en: ['travel', 'transportation', 'entertainment', 'meal', 'lodging', 'airfare', 'hotel'],
    es: ['viaje', 'transporte', 'entretenimiento', 'comida', 'alojamiento', 'viático', 'hotel']
  },
  training_development: {
    en: ['training', 'education', 'development', 'course', 'seminar', 'workshop'],
    es: ['capacitación', 'formación', 'desarrollo', 'curso', 'seminario', 'taller', 'entrenamiento']
  },
  marketing_advertising: {
    en: ['marketing', 'advertising', 'promotion', 'publicity', 'advertisement', 'campaign'],
    es: ['marketing', 'publicidad', 'promoción', 'mercadeo', 'mercadotecnia', 'campaña']
  },
  professional_services: {
    en: ['professional', 'consulting', 'legal', 'accounting', 'audit', 'contract service', 'advisory'],
    es: ['profesional', 'consultoría', 'legal', 'contabilidad', 'auditoría', 'servicio contratado', 'asesoría']
  },
  office_supplies: {
    en: ['office', 'supply', 'supplies', 'stationery', 'equipment'],
    es: ['oficina', 'suministro', 'papelería', 'útiles', 'equipo']
  },
  insurance: {
    en: ['insurance', 'premium', 'coverage', 'policy'],
    es: ['seguro', 'prima', 'cobertura', 'póliza']
  },
  depreciation: {
    en: ['depreciation', 'amortization', 'depletion'],
    es: ['depreciación', 'amortización', 'agotamiento']
  },

  // Taxes
  income_tax: {
    en: ['income tax', 'corporate tax', 'tax expense'],
    es: ['impuesto sobre la renta', 'impuesto a las ganancias', 'isr']
  },
  other_taxes: {
    en: ['tax', 'levy', 'duty', 'assessment'],
    es: ['impuesto', 'tributo', 'gravamen', 'tasa']
  },

  // Cash Flow - Operating Activities
  cash_from_customers: {
    en: ['cash from customers', 'collections', 'customer receipts', 'sales receipts', 'revenue collections'],
    es: ['efectivo de clientes', 'cobranzas', 'recibos de clientes', 'cobros de ventas', 'recaudación']
  },
  cash_to_suppliers: {
    en: ['cash to suppliers', 'supplier payments', 'purchases paid', 'vendor payments', 'supplier disbursements'],
    es: ['efectivo a proveedores', 'pagos a proveedores', 'compras pagadas', 'desembolsos a proveedores']
  },
  cash_to_employees: {
    en: ['cash to employees', 'payroll paid', 'salary payments', 'employee payments', 'wages paid'],
    es: ['efectivo a empleados', 'nómina pagada', 'pagos de salarios', 'pagos a empleados', 'sueldos pagados']
  },
  interest_paid: {
    en: ['interest paid', 'interest expense paid', 'interest payments', 'debt service'],
    es: ['intereses pagados', 'pagos de intereses', 'gastos financieros pagados', 'servicio de deuda']
  },
  taxes_paid: {
    en: ['taxes paid', 'tax payments', 'income tax paid', 'tax disbursements'],
    es: ['impuestos pagados', 'pagos de impuestos', 'impuesto sobre la renta pagado', 'desembolsos fiscales']
  },

  // Cash Flow - Investing Activities
  purchase_ppe: {
    en: ['purchase ppe', 'ppe acquisitions', 'capital expenditures', 'equipment purchases', 'asset acquisitions', 'capex'],
    es: ['compra ppe', 'adquisición de propiedades', 'gastos de capital', 'compra de equipos', 'adquisición de activos', 'capex']
  },
  sale_ppe: {
    en: ['sale ppe', 'asset sales', 'equipment sales', 'disposal of assets', 'ppe disposals'],
    es: ['venta ppe', 'venta de activos', 'venta de equipos', 'disposición de activos', 'ventas de propiedades']
  },
  purchase_investments: {
    en: ['purchase investments', 'investment acquisitions', 'securities purchased', 'investment purchases'],
    es: ['compra de inversiones', 'adquisición de inversiones', 'compra de valores', 'inversiones adquiridas']
  },
  sale_investments: {
    en: ['sale investments', 'investment sales', 'securities sold', 'investment disposals'],
    es: ['venta de inversiones', 'venta de valores', 'disposición de inversiones', 'inversiones vendidas']
  },

  // Cash Flow - Financing Activities
  proceeds_debt: {
    en: ['proceeds debt', 'debt proceeds', 'borrowings', 'loans received', 'debt issuance'],
    es: ['préstamos obtenidos', 'producto de deuda', 'financiamiento recibido', 'emisión de deuda', 'créditos obtenidos']
  },
  repayment_debt: {
    en: ['repayment debt', 'debt payments', 'loan repayments', 'debt service', 'principal payments'],
    es: ['pago de préstamos', 'amortización de deuda', 'pagos de capital', 'servicio de deuda', 'reembolso de préstamos']
  },
  equity_issued: {
    en: ['equity issued', 'stock issuance', 'capital contributions', 'share issuance', 'equity proceeds'],
    es: ['emisión de acciones', 'aportaciones de capital', 'emisión de capital', 'producto de acciones', 'contribuciones accionistas']
  },
  dividends_paid: {
    en: ['dividends paid', 'dividend payments', 'shareholder distributions', 'profit distributions'],
    es: ['dividendos pagados', 'pagos de dividendos', 'distribuciones a accionistas', 'reparto de utilidades']
  }
};

// Special patterns and context clues
const CONTEXT_PATTERNS = {
  costOfRevenue: {
    en: ['cor', '(cor)', 'cost of revenue', 'cost of sales', 'cogs'],
    es: ['cdv', '(cdv)', 'costo de venta', 'costo de ventas']
  },
  operatingExpense: {
    en: ['opex', '(opex)', 'operating', 'operational', 'admin'],
    es: ['opex', '(opex)', 'operativo', 'operacional', 'admin']
  }
};

/**
 * Calculate match score between account name and keywords
 */
function calculateMatchScore(accountName: string, keywords: string[]): { score: number; matchedKeywords: string[] } {
  const normalizedName = accountName.toLowerCase();
  let score = 0;
  const matchedKeywords: string[] = [];

  for (const keyword of keywords) {
    const normalizedKeyword = keyword.toLowerCase();
    
    // Special high-priority patterns (COR, CDV indicators)
    if ((normalizedKeyword === 'cor' || normalizedKeyword === '(cor)' || 
         normalizedKeyword === 'cdv' || normalizedKeyword === '(cdv)') && 
         normalizedName.includes(normalizedKeyword)) {
      score += 15; // Very high score for cost indicators
      matchedKeywords.push(keyword);
    }
    // Exact match gets highest score
    else if (normalizedName === normalizedKeyword) {
      score += 10;
      matchedKeywords.push(keyword);
    }
    // Contains the full keyword
    else if (normalizedName.includes(normalizedKeyword)) {
      score += 5;
      matchedKeywords.push(keyword);
    }
    // Keyword contains significant part of account name
    else if (normalizedKeyword.includes(normalizedName) && normalizedName.length > 3) {
      score += 3;
      matchedKeywords.push(keyword);
    }
    // Word boundary match
    else {
      const wordBoundaryRegex = new RegExp(`\\b${normalizedKeyword}\\b`, 'i');
      if (wordBoundaryRegex.test(normalizedName)) {
        score += 7;
        matchedKeywords.push(keyword);
      }
    }
  }

  return { score, matchedKeywords };
}

/**
 * Detect section context from section name
 */
function detectSectionContext(sectionName: string): string | null {
  const normalized = sectionName.toLowerCase();
  
  // Check for revenue context
  if (normalized.includes('revenue') || normalized.includes('ingreso') || 
      normalized.includes('sales') || normalized.includes('venta')) {
    return 'revenue';
  }
  
  // Check for cost of sales context - enhanced with COR detection
  if (normalized.includes('cost') || normalized.includes('costo') ||
      normalized.includes('cogs') || normalized.includes('cdv') ||
      normalized.includes('cor') || normalized.includes('(cor)') ||
      normalized.includes('(cdv)') || normalized.includes('cost of revenue') ||
      normalized.includes('costo de venta')) {
    return 'cost_of_sales';
  }
  
  // Check for operating expenses context
  if (normalized.includes('operating') && !normalized.includes('activities') || 
      normalized.includes('operativo') && !normalized.includes('actividades') ||
      normalized.includes('expense') || normalized.includes('gasto') ||
      normalized.includes('admin') || normalized.includes('opex') ||
      normalized.includes('(opex)')) {
    return 'operating_expenses';
  }
  
  // Check for cash flow operating activities
  if (normalized.includes('operating activities') || normalized.includes('actividades operativas') ||
      normalized.includes('operating cash') || normalized.includes('efectivo operativo') ||
      normalized.includes('cash from operations') || normalized.includes('efectivo de operaciones')) {
    return 'operating_activities';
  }
  
  // Check for cash flow investing activities
  if (normalized.includes('investing activities') || normalized.includes('actividades de inversión') ||
      normalized.includes('investment activities') || normalized.includes('actividades de inversiones') ||
      normalized.includes('investing cash') || normalized.includes('efectivo de inversión')) {
    return 'investing_activities';
  }
  
  // Check for cash flow financing activities
  if (normalized.includes('financing activities') || normalized.includes('actividades de financiamiento') ||
      normalized.includes('financing cash') || normalized.includes('efectivo de financiamiento') ||
      normalized.includes('financing flows') || normalized.includes('flujos de financiamiento')) {
    return 'financing_activities';
  }
  
  return null;
}

/**
 * Main function to suggest category for an account
 */
export function suggestCategoryForAccount(
  accountName: string,
  sectionContext: string,
  availableCategories: ExtendedFinancialCategory[],
  locale: 'es' | 'en' = 'es',
  requiredInflowType?: boolean // Optional: enforce inflow/outflow consistency
): CategorySuggestion | null {
  
  const normalizedAccountName = accountName.toLowerCase().trim();
  const sectionContextType = detectSectionContext(sectionContext);
  
  let bestMatch: {
    category: string;
    score: number;
    matchedKeywords: string[];
  } | null = null;
  
  // Check each category's keywords
  for (const [categoryKey, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    // Get keywords for the current locale
    const localeKeywords = keywords[locale] || [];
    const { score, matchedKeywords } = calculateMatchScore(normalizedAccountName, localeKeywords);
    
    // Apply context bonus
    let finalScore = score;
    if (sectionContextType) {
      // Boost score if category matches section context
      if (sectionContextType === 'revenue' && categoryKey.includes('revenue')) {
        finalScore += 3;
      } else if (sectionContextType === 'cost_of_sales' && 
                 ['direct_labor', 'direct_materials', 'manufacturing_overhead', 'cost_of_sales'].includes(categoryKey)) {
        finalScore += 3;
      } else if (sectionContextType === 'operating_expenses' && 
                 !categoryKey.includes('revenue') && !['direct_labor', 'direct_materials', 'manufacturing_overhead'].includes(categoryKey)) {
        finalScore += 2;
      } else if (sectionContextType === 'operating_activities' && 
                 ['cash_from_customers', 'cash_to_suppliers', 'cash_to_employees', 'interest_paid', 'taxes_paid'].includes(categoryKey)) {
        finalScore += 3;
      } else if (sectionContextType === 'investing_activities' && 
                 ['purchase_ppe', 'sale_ppe', 'purchase_investments', 'sale_investments'].includes(categoryKey)) {
        finalScore += 3;
      } else if (sectionContextType === 'financing_activities' && 
                 ['proceeds_debt', 'repayment_debt', 'equity_issued', 'dividends_paid'].includes(categoryKey)) {
        finalScore += 3;
      }
    }
    
    // Check if this category exists in available categories
    const categoryExists = availableCategories.some(cat => cat.value === categoryKey);
    if (!categoryExists) continue;
    
    // If requiredInflowType is specified, enforce consistency
    if (requiredInflowType !== undefined) {
      const categoryInfo = availableCategories.find(cat => cat.value === categoryKey);
      if (categoryInfo && categoryInfo.isInflow !== requiredInflowType) {
        continue; // Skip categories that don't match required inflow type
      }
    }
    
    if (finalScore > 0 && (!bestMatch || finalScore > bestMatch.score)) {
      bestMatch = {
        category: categoryKey,
        score: finalScore,
        matchedKeywords
      };
    }
  }
  
  if (!bestMatch) {
    return null;
  }
  
  // Determine confidence level
  let confidence: ConfidenceLevel;
  if (bestMatch.score >= 10) {
    confidence = 'high';
  } else if (bestMatch.score >= 5) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }
  
  // Generate reason
  const reason = bestMatch.matchedKeywords.length > 0
    ? `Palabras clave encontradas: ${bestMatch.matchedKeywords.join(', ')}`
    : 'Basado en el contexto de la sección';
  
  return {
    category: bestMatch.category,
    confidence,
    matchedKeywords: bestMatch.matchedKeywords,
    reason
  };
}

/**
 * Suggest categories for multiple accounts in a section
 */
export function suggestCategoriesForSection(
  accounts: Array<{ rowIndex: number; name: string }>,
  sectionName: string,
  availableCategories: ExtendedFinancialCategory[],
  locale: 'es' | 'en' = 'es',
  sectionInflowType?: boolean // Optional: enforce section's inflow/outflow type for all children
): Map<number, CategorySuggestion> {
  const suggestions = new Map<number, CategorySuggestion>();
  
  for (const account of accounts) {
    const suggestion = suggestCategoryForAccount(
      account.name,
      sectionName,
      availableCategories,
      locale,
      sectionInflowType // Pass the section's inflow type to enforce consistency
    );
    
    if (suggestion) {
      suggestions.set(account.rowIndex, suggestion);
    }
  }
  
  return suggestions;
}