// Configuration-driven architecture types
// These define the structure of configuration files for parsing Excel files

export type ConfigurationType = 'cashflow' | 'pnl';

export interface BaseConfiguration {
  type: ConfigurationType;
  name: string;
  description?: string;
  version: number;
  metadata: ConfigurationMetadata;
}

export interface ConfigurationMetadata {
  currency: string;
  locale: string;
  units: 'normal' | 'thousands' | 'millions';
  fiscalYearStart?: number;
  dateFormat?: string;
}

// Cash Flow Configuration Structure
export interface CashFlowConfiguration extends BaseConfiguration {
  type: 'cashflow';
  structure: CashFlowStructure;
}

export interface CashFlowStructure {
  // Excel structure definition
  periodsRow: number; // Row containing period headers (e.g., Jan, Feb, Mar)
  periodsRange: string; // Excel range for periods (e.g., "B8:M8")
  
  // NEW: Explicit period mapping
  periodMapping?: PeriodMapping[]; // Optional for backward compatibility
  
  // Core data rows - required fields
  dataRows: {
    initialBalance: number;
    finalBalance: number;
    totalInflows: number;
    totalOutflows: number;
    monthlyGeneration: number;
  };
  
  // Category structure with subcategories
  categories: {
    inflows: CashFlowCategoryGroup;
    outflows: CashFlowCategoryGroup;
  };
}

// Period mapping interfaces
export interface PeriodMapping {
  column: string;        // Excel column (B, C, D, etc.)
  period: PeriodDefinition;
}

export interface PeriodDefinition {
  type: 'month' | 'quarter' | 'year' | 'custom';
  year: number;
  month?: number;        // 1-12 for monthly
  quarter?: number;      // 1-4 for quarterly  
  label: string;         // Display name (e.g., "Aug 2025", "Q3 2025")
  customValue?: string;  // For custom period types
}

export interface CashFlowCategoryGroup {
  [categoryKey: string]: CashFlowCategory;
}

export interface CashFlowCategory {
  row: number;
  required?: boolean; // Default true for core categories
  subcategories?: {
    [subcategoryKey: string]: CashFlowSubcategory;
  };
}

export interface CashFlowSubcategory {
  row: number;
  required?: boolean; // Default false for subcategories
}

// P&L Configuration Structure
export interface PLConfiguration extends BaseConfiguration {
  type: 'pnl';
  structure: PLStructure;
}

export interface PLStructure {
  // Excel structure definition
  periodsRow: number;
  periodsRange: string;
  categoriesColumn: string; // Column containing category names (e.g., "B")
  
  // NEW: Explicit period mapping (optional)
  periodMapping?: PeriodMapping[]; // Optional for backward compatibility
  
  // Core P&L line items with Spanish/English labels
  dataRows: {
    // Revenue section
    totalRevenue: number;
    grossIncome: number;
    
    // Cost sections
    cogs: number;
    totalOpex: number;
    totalOutcome: number;
    
    // Profitability metrics
    grossProfit: number;
    grossMargin: number;
    ebitda: number;
    ebitdaMargin: number;
    earningsBeforeTaxes: number;
    netIncome: number;
    
    // Other categories
    otherIncome: number;
    otherExpenses: number;
    taxes: number;
  };
  
  // Category hierarchies for detailed analysis
  categories: {
    revenue: PLCategoryGroup;
    cogs: PLCategoryGroup;
    opex: PLCategoryGroup;
    otherIncome: PLCategoryGroup;
    otherExpenses: PLCategoryGroup;
    taxes: PLCategoryGroup;
  };
}

export interface PLCategoryGroup {
  [categoryKey: string]: PLCategory;
}

export interface PLCategory {
  row: number;
  label: {
    en: string;
    es: string;
  };
  required?: boolean;
  subcategories?: {
    [subcategoryKey: string]: PLSubcategory;
  };
}

export interface PLSubcategory {
  row: number;
  label: {
    en: string;
    es: string;
  };
  required?: boolean;
}

// Configuration validation results
export interface ConfigurationValidationResult {
  isValid: boolean;
  errors: ConfigurationValidationError[];
  warnings: ConfigurationValidationWarning[];
  mappedData?: ConfigurationPreviewData;
}

export interface ConfigurationValidationError {
  field: string;
  row?: number;
  column?: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ConfigurationValidationWarning {
  field: string;
  row?: number;
  column?: string;
  message: string;
  suggestion?: string;
}

export interface ConfigurationPreviewData {
  [fieldKey: string]: {
    value: number | string | null;
    cellAddress: string;
    isValid: boolean;
    warningMessage?: string;
  };
}

// Template configurations for standard setups
export interface CashFlowTemplate {
  name: string;
  description: string;
  locale: string;
  configuration: Omit<CashFlowConfiguration, 'version' | 'name' | 'description'>;
}

export interface PLTemplate {
  name: string;
  description: string;
  locale: string;
  configuration: Omit<PLConfiguration, 'version' | 'name' | 'description'>;
}

// Standard templates that come with the system
export const STANDARD_CASHFLOW_TEMPLATES: Record<string, CashFlowTemplate> = {
  'standard-es': {
    name: 'Flujo de Caja Estándar',
    description: 'Configuración estándar para análisis de flujo de caja',
    locale: 'es',
    configuration: {
      type: 'cashflow',
      metadata: {
        currency: 'USD',
        locale: 'es',
        units: 'normal'
      },
      structure: {
        periodsRow: 8,
        periodsRange: 'B8:M8',
        dataRows: {
          initialBalance: 10,
          finalBalance: 105,
          totalInflows: 95,
          totalOutflows: 94,
          monthlyGeneration: 114
        },
        categories: {
          inflows: {
            collections: { row: 20 },
            investmentIncome: { row: 23 }
          },
          outflows: {
            salaries: { row: 30 },
            contractors: { row: 35 },
            operatingExpenses: {
              row: 45,
              subcategories: {
                rent: { row: 46 },
                utilities: { row: 47 },
                professionalServices: { row: 48 },
                otherExpenses: { row: 49 }
              }
            },
            taxes: { row: 60 },
            bankExpenses: { row: 65 }
          }
        }
      }
    }
  },
  'standard-en': {
    name: 'Standard Cash Flow',
    description: 'Standard configuration for cash flow analysis',
    locale: 'en',
    configuration: {
      type: 'cashflow',
      metadata: {
        currency: 'USD',
        locale: 'en',
        units: 'normal'
      },
      structure: {
        periodsRow: 8,
        periodsRange: 'B8:M8',
        dataRows: {
          initialBalance: 10,
          finalBalance: 105,
          totalInflows: 95,
          totalOutflows: 94,
          monthlyGeneration: 114
        },
        categories: {
          inflows: {
            collections: { row: 20 },
            investmentIncome: { row: 23 }
          },
          outflows: {
            salaries: { row: 30 },
            contractors: { row: 35 },
            operatingExpenses: {
              row: 45,
              subcategories: {
                rent: { row: 46 },
                utilities: { row: 47 },
                professionalServices: { row: 48 },
                otherExpenses: { row: 49 }
              }
            },
            taxes: { row: 60 },
            bankExpenses: { row: 65 }
          }
        }
      }
    }
  }
};

export const STANDARD_PL_TEMPLATES: Record<string, PLTemplate> = {
  'standard-es': {
    name: 'P&L Estándar',
    description: 'Configuración estándar para estado de resultados',
    locale: 'es',
    configuration: {
      type: 'pnl',
      metadata: {
        currency: 'USD',
        locale: 'es',
        units: 'normal'
      },
      structure: {
        periodsRow: 4,
        periodsRange: 'C4:N4',
        categoriesColumn: 'B',
        dataRows: {
          totalRevenue: 10,
          grossIncome: 24,
          cogs: 12,
          totalOpex: 45,
          totalOutcome: 78,
          grossProfit: 25,
          grossMargin: 26,
          ebitda: 80,
          ebitdaMargin: 82,
          earningsBeforeTaxes: 85,
          netIncome: 90,
          otherIncome: 50,
          otherExpenses: 70,
          taxes: 88
        },
        categories: {
          revenue: {
            productSales: { row: 8, label: { es: 'Ventas de Productos', en: 'Product Sales' } },
            serviceRevenue: { row: 9, label: { es: 'Ingresos por Servicios', en: 'Service Revenue' } }
          },
          cogs: {
            materialCosts: { row: 14, label: { es: 'Costos de Materiales', en: 'Material Costs' } },
            laborCosts: { row: 15, label: { es: 'Costos de Mano de Obra', en: 'Labor Costs' } }
          },
          opex: {
            salaries: { row: 30, label: { es: 'Salarios', en: 'Salaries' } },
            rent: { row: 35, label: { es: 'Alquileres', en: 'Rent' } },
            utilities: { row: 36, label: { es: 'Servicios Públicos', en: 'Utilities' } },
            marketing: { row: 40, label: { es: 'Marketing', en: 'Marketing' } }
          },
          otherIncome: {
            interestIncome: { row: 52, label: { es: 'Ingresos por Intereses', en: 'Interest Income' } },
            investmentGains: { row: 53, label: { es: 'Ganancias de Inversión', en: 'Investment Gains' } }
          },
          otherExpenses: {
            interestExpense: { row: 72, label: { es: 'Gastos por Intereses', en: 'Interest Expense' } },
            depreciation: { row: 73, label: { es: 'Depreciación', en: 'Depreciation' } }
          },
          taxes: {
            incomeTax: { row: 89, label: { es: 'Impuesto sobre la Renta', en: 'Income Tax' } }
          }
        }
      }
    }
  },
  'standard-en': {
    name: 'Standard P&L',
    description: 'Standard configuration for profit and loss statement',
    locale: 'en',
    configuration: {
      type: 'pnl',
      metadata: {
        currency: 'USD',
        locale: 'en',
        units: 'normal'
      },
      structure: {
        periodsRow: 4,
        periodsRange: 'C4:N4',
        categoriesColumn: 'B',
        dataRows: {
          totalRevenue: 10,
          grossIncome: 24,
          cogs: 12,
          totalOpex: 45,
          totalOutcome: 78,
          grossProfit: 25,
          grossMargin: 26,
          ebitda: 80,
          ebitdaMargin: 82,
          earningsBeforeTaxes: 85,
          netIncome: 90,
          otherIncome: 50,
          otherExpenses: 70,
          taxes: 88
        },
        categories: {
          revenue: {
            productSales: { row: 8, label: { es: 'Ventas de Productos', en: 'Product Sales' } },
            serviceRevenue: { row: 9, label: { es: 'Ingresos por Servicios', en: 'Service Revenue' } }
          },
          cogs: {
            materialCosts: { row: 14, label: { es: 'Costos de Materiales', en: 'Material Costs' } },
            laborCosts: { row: 15, label: { es: 'Costos de Mano de Obra', en: 'Labor Costs' } }
          },
          opex: {
            salaries: { row: 30, label: { es: 'Salarios', en: 'Salaries' } },
            rent: { row: 35, label: { es: 'Alquileres', en: 'Rent' } },
            utilities: { row: 36, label: { es: 'Servicios Públicos', en: 'Utilities' } },
            marketing: { row: 40, label: { es: 'Marketing', en: 'Marketing' } }
          },
          otherIncome: {
            interestIncome: { row: 52, label: { es: 'Ingresos por Intereses', en: 'Interest Income' } },
            investmentGains: { row: 53, label: { es: 'Ganancias de Inversión', en: 'Investment Gains' } }
          },
          otherExpenses: {
            interestExpense: { row: 72, label: { es: 'Gastos por Intereses', en: 'Interest Expense' } },
            depreciation: { row: 73, label: { es: 'Depreciación', en: 'Depreciation' } }
          },
          taxes: {
            incomeTax: { row: 89, label: { es: 'Impuesto sobre la Renta', en: 'Income Tax' } }
          }
        }
      }
    }
  }
};

// Excel Processing Result Types

export interface ProcessedDataRow {
  label: string;
  values: (number | null)[];
  total: number;
}

export interface ProcessedDataCategory {
  label: string;
  values: (number | null)[];
  total: number;
  subcategories?: Record<string, ProcessedDataRow>;
}

export interface ProcessedData {
  type: 'cashflow' | 'pnl';
  periods: string[];
  dataRows: Record<string, ProcessedDataRow>;
  categories: Record<string, Record<string, ProcessedDataCategory>>;
  metadata: ConfigurationMetadata;
}

export interface ExcelProcessingResult {
  success: boolean;
  data?: ProcessedData;
  error?: string;
  metadata: {
    fileName: string;
    configurationId: string;
    configurationType?: 'cashflow' | 'pnl';
    processedAt: Date;
    currency?: string;
    units?: string;
    locale?: string;
  };
}