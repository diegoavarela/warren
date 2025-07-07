/**
 * Custom Financial Categories Management
 * Handles company-specific financial category definitions
 */

import { CustomFinancialCategory, NewCustomFinancialCategory } from '@/lib/db/schema';

export interface CategoryOption {
  value: string;
  label: string;
  icon: React.ReactNode;
  isInflow: boolean;
  statementType: 'balance_sheet' | 'profit_loss' | 'cash_flow';
  isCustom: boolean;
  description?: string;
  parentCategory?: string;
  group?: string; // Category group for organization
  categoryType?: 'account' | 'section' | 'total'; // New field for row type
}

export interface ExtendedFinancialCategory extends CategoryOption {
  id?: string;
  companyId?: string;
  sortOrder?: number;
  isActive?: boolean;
}

// Category groups for P&L
export const CATEGORY_GROUPS = {
  // P&L Groups
  REVENUE: 'Revenue',
  COST_OF_SALES: 'Cost of Sales',
  OPERATING_EXPENSES: 'Operating Expenses',
  OTHER_INCOME_EXPENSES: 'Other Income/Expenses',
  TAXES: 'Taxes',
  CALCULATED_TOTALS: 'Calculated Totals',
  // Balance Sheet Groups
  ASSETS: 'Assets',
  LIABILITIES: 'Liabilities',
  EQUITY: 'Equity',
  // Cash Flow Groups
  OPERATING_ACTIVITIES: 'Operating Activities',
  INVESTING_ACTIVITIES: 'Investing Activities',
  FINANCING_ACTIVITIES: 'Financing Activities'
};

// Standard/default categories (same as before but marked as non-custom)
export const DEFAULT_FINANCIAL_CATEGORIES: CategoryOption[] = [
  // SECTION HEADERS - P&L
  { value: 'section_revenue', label: 'INGRESOS', icon: null, isInflow: true, statementType: 'profit_loss', isCustom: false, group: 'Secciones', categoryType: 'section' },
  { value: 'section_cost_of_sales', label: 'COSTO DE VENTAS', icon: null, isInflow: false, statementType: 'profit_loss', isCustom: false, group: 'Secciones', categoryType: 'section' },
  { value: 'section_operating_expenses', label: 'GASTOS OPERATIVOS', icon: null, isInflow: false, statementType: 'profit_loss', isCustom: false, group: 'Secciones', categoryType: 'section' },
  { value: 'section_other_income', label: 'OTROS INGRESOS/GASTOS', icon: null, isInflow: true, statementType: 'profit_loss', isCustom: false, group: 'Secciones', categoryType: 'section' },
  { value: 'section_taxes', label: 'IMPUESTOS', icon: null, isInflow: false, statementType: 'profit_loss', isCustom: false, group: 'Secciones', categoryType: 'section' },
  
  // SECTION HEADERS - Balance Sheet
  { value: 'section_assets', label: 'ACTIVOS', icon: null, isInflow: true, statementType: 'balance_sheet', isCustom: false, group: 'Secciones', categoryType: 'section' },
  { value: 'section_current_assets', label: 'ACTIVOS CORRIENTES', icon: null, isInflow: true, statementType: 'balance_sheet', isCustom: false, group: 'Secciones', categoryType: 'section' },
  { value: 'section_non_current_assets', label: 'ACTIVOS NO CORRIENTES', icon: null, isInflow: true, statementType: 'balance_sheet', isCustom: false, group: 'Secciones', categoryType: 'section' },
  { value: 'section_liabilities', label: 'PASIVOS', icon: null, isInflow: false, statementType: 'balance_sheet', isCustom: false, group: 'Secciones', categoryType: 'section' },
  { value: 'section_current_liabilities', label: 'PASIVOS CORRIENTES', icon: null, isInflow: false, statementType: 'balance_sheet', isCustom: false, group: 'Secciones', categoryType: 'section' },
  { value: 'section_non_current_liabilities', label: 'PASIVOS NO CORRIENTES', icon: null, isInflow: false, statementType: 'balance_sheet', isCustom: false, group: 'Secciones', categoryType: 'section' },
  { value: 'section_equity', label: 'PATRIMONIO', icon: null, isInflow: true, statementType: 'balance_sheet', isCustom: false, group: 'Secciones', categoryType: 'section' },
  
  // Balance Sheet
  { value: 'current_assets', label: 'Activos Corrientes', icon: null, isInflow: true, statementType: 'balance_sheet', isCustom: false, group: CATEGORY_GROUPS.ASSETS, categoryType: 'account' },
  { value: 'non_current_assets', label: 'Activos No Corrientes', icon: null, isInflow: true, statementType: 'balance_sheet', isCustom: false, group: CATEGORY_GROUPS.ASSETS, categoryType: 'account' },
  { value: 'current_liabilities', label: 'Pasivos Corrientes', icon: null, isInflow: false, statementType: 'balance_sheet', isCustom: false, group: CATEGORY_GROUPS.LIABILITIES, categoryType: 'account' },
  { value: 'non_current_liabilities', label: 'Pasivos No Corrientes', icon: null, isInflow: false, statementType: 'balance_sheet', isCustom: false, group: CATEGORY_GROUPS.LIABILITIES, categoryType: 'account' },
  { value: 'equity', label: 'Patrimonio', icon: null, isInflow: true, statementType: 'balance_sheet', isCustom: false, group: CATEGORY_GROUPS.EQUITY, categoryType: 'account' },
  
  // P&L - Revenue
  { value: 'revenue', label: 'Ingresos por Ventas', icon: null, isInflow: true, statementType: 'profit_loss', isCustom: false, group: CATEGORY_GROUPS.REVENUE },
  { value: 'service_revenue', label: 'Ingresos por Servicios', icon: null, isInflow: true, statementType: 'profit_loss', isCustom: false, group: CATEGORY_GROUPS.REVENUE },
  { value: 'other_revenue', label: 'Otros Ingresos Operativos', icon: null, isInflow: true, statementType: 'profit_loss', isCustom: false, group: CATEGORY_GROUPS.REVENUE },
  { value: 'interest_income', label: 'Ingresos Financieros', icon: null, isInflow: true, statementType: 'profit_loss', isCustom: false, group: CATEGORY_GROUPS.REVENUE },
  
  // P&L - Cost of Sales
  { value: 'cost_of_sales', label: 'Costo de Ventas', icon: null, isInflow: false, statementType: 'profit_loss', isCustom: false, group: CATEGORY_GROUPS.COST_OF_SALES },
  { value: 'direct_materials', label: 'Materiales Directos', icon: null, isInflow: false, statementType: 'profit_loss', isCustom: false, group: CATEGORY_GROUPS.COST_OF_SALES },
  { value: 'direct_labor', label: 'Mano de Obra Directa', icon: null, isInflow: false, statementType: 'profit_loss', isCustom: false, group: CATEGORY_GROUPS.COST_OF_SALES },
  { value: 'manufacturing_overhead', label: 'Gastos Indirectos de Fabricación', icon: null, isInflow: false, statementType: 'profit_loss', isCustom: false, group: CATEGORY_GROUPS.COST_OF_SALES },
  
  // P&L - Operating Expenses
  { value: 'salaries_wages', label: 'Sueldos y Salarios', icon: null, isInflow: false, statementType: 'profit_loss', isCustom: false, group: CATEGORY_GROUPS.OPERATING_EXPENSES },
  { value: 'payroll_taxes', label: 'Impuestos sobre Nómina', icon: null, isInflow: false, statementType: 'profit_loss', isCustom: false, group: CATEGORY_GROUPS.OPERATING_EXPENSES },
  { value: 'benefits', label: 'Beneficios y Prestaciones', icon: null, isInflow: false, statementType: 'profit_loss', isCustom: false, group: CATEGORY_GROUPS.OPERATING_EXPENSES },
  { value: 'rent_utilities', label: 'Renta y Servicios', icon: null, isInflow: false, statementType: 'profit_loss', isCustom: false, group: CATEGORY_GROUPS.OPERATING_EXPENSES },
  { value: 'marketing_advertising', label: 'Marketing y Publicidad', icon: null, isInflow: false, statementType: 'profit_loss', isCustom: false, group: CATEGORY_GROUPS.OPERATING_EXPENSES },
  { value: 'professional_services', label: 'Servicios Profesionales', icon: null, isInflow: false, statementType: 'profit_loss', isCustom: false, group: CATEGORY_GROUPS.OPERATING_EXPENSES },
  { value: 'travel_entertainment', label: 'Viajes y Entretenimiento', icon: null, isInflow: false, statementType: 'profit_loss', isCustom: false, group: CATEGORY_GROUPS.OPERATING_EXPENSES },
  { value: 'office_supplies', label: 'Suministros de Oficina', icon: null, isInflow: false, statementType: 'profit_loss', isCustom: false, group: CATEGORY_GROUPS.OPERATING_EXPENSES },
  { value: 'depreciation', label: 'Depreciación', icon: null, isInflow: false, statementType: 'profit_loss', isCustom: false, group: CATEGORY_GROUPS.OPERATING_EXPENSES },
  { value: 'insurance', label: 'Seguros', icon: null, isInflow: false, statementType: 'profit_loss', isCustom: false, group: CATEGORY_GROUPS.OPERATING_EXPENSES },
  { value: 'training_development', label: 'Capacitación y Desarrollo', icon: null, isInflow: false, statementType: 'profit_loss', isCustom: false, group: CATEGORY_GROUPS.OPERATING_EXPENSES },
  
  // P&L - Other Income/Expenses
  { value: 'gain_on_sale', label: 'Ganancia en Venta de Activos', icon: null, isInflow: true, statementType: 'profit_loss', isCustom: false, group: CATEGORY_GROUPS.OTHER_INCOME_EXPENSES },
  { value: 'loss_on_sale', label: 'Pérdida en Venta de Activos', icon: null, isInflow: false, statementType: 'profit_loss', isCustom: false, group: CATEGORY_GROUPS.OTHER_INCOME_EXPENSES },
  { value: 'interest_expense', label: 'Gastos Financieros', icon: null, isInflow: false, statementType: 'profit_loss', isCustom: false, group: CATEGORY_GROUPS.OTHER_INCOME_EXPENSES },
  { value: 'foreign_exchange', label: 'Diferencia Cambiaria', icon: null, isInflow: true, statementType: 'profit_loss', isCustom: false, group: CATEGORY_GROUPS.OTHER_INCOME_EXPENSES },
  
  // P&L - Taxes
  { value: 'income_tax', label: 'Impuesto sobre la Renta', icon: null, isInflow: false, statementType: 'profit_loss', isCustom: false, group: CATEGORY_GROUPS.TAXES },
  { value: 'other_taxes', label: 'Otros Impuestos', icon: null, isInflow: false, statementType: 'profit_loss', isCustom: false, group: CATEGORY_GROUPS.TAXES },
  
  // P&L - Calculated Totals (Special categories for totals)
  { value: 'total_revenue', label: 'TOTAL INGRESOS', icon: null, isInflow: true, statementType: 'profit_loss', isCustom: false, group: 'Totales', categoryType: 'total' },
  { value: 'total_cost_of_sales', label: 'TOTAL COSTO DE VENTAS', icon: null, isInflow: false, statementType: 'profit_loss', isCustom: false, group: 'Totales', categoryType: 'total' },
  { value: 'total_operating_expenses', label: 'TOTAL GASTOS OPERATIVOS', icon: null, isInflow: false, statementType: 'profit_loss', isCustom: false, group: 'Totales', categoryType: 'total' },
  { value: 'gross_profit', label: 'UTILIDAD BRUTA', icon: null, isInflow: true, statementType: 'profit_loss', isCustom: false, group: 'Totales', categoryType: 'total' },
  { value: 'gross_margin', label: 'MARGEN BRUTO', icon: null, isInflow: true, statementType: 'profit_loss', isCustom: false, group: 'Totales', categoryType: 'total' },
  { value: 'operating_income', label: 'UTILIDAD OPERATIVA', icon: null, isInflow: true, statementType: 'profit_loss', isCustom: false, group: 'Totales', categoryType: 'total' },
  { value: 'ebitda', label: 'EBITDA', icon: null, isInflow: true, statementType: 'profit_loss', isCustom: false, group: 'Totales', categoryType: 'total' },
  { value: 'ebit', label: 'EBIT', icon: null, isInflow: true, statementType: 'profit_loss', isCustom: false, group: 'Totales', categoryType: 'total' },
  { value: 'net_income', label: 'UTILIDAD NETA', icon: null, isInflow: true, statementType: 'profit_loss', isCustom: false, group: 'Totales', categoryType: 'total' },
  { value: 'total_expenses', label: 'GASTOS TOTALES', icon: null, isInflow: false, statementType: 'profit_loss', isCustom: false, group: 'Totales', categoryType: 'total' },
  
  // Balance Sheet Totals
  { value: 'total_current_assets', label: 'TOTAL ACTIVOS CORRIENTES', icon: null, isInflow: true, statementType: 'balance_sheet', isCustom: false, group: 'Totales', categoryType: 'total' },
  { value: 'total_non_current_assets', label: 'TOTAL ACTIVOS NO CORRIENTES', icon: null, isInflow: true, statementType: 'balance_sheet', isCustom: false, group: 'Totales', categoryType: 'total' },
  { value: 'total_assets', label: 'TOTAL ACTIVOS', icon: null, isInflow: true, statementType: 'balance_sheet', isCustom: false, group: 'Totales', categoryType: 'total' },
  { value: 'total_current_liabilities', label: 'TOTAL PASIVOS CORRIENTES', icon: null, isInflow: false, statementType: 'balance_sheet', isCustom: false, group: 'Totales', categoryType: 'total' },
  { value: 'total_non_current_liabilities', label: 'TOTAL PASIVOS NO CORRIENTES', icon: null, isInflow: false, statementType: 'balance_sheet', isCustom: false, group: 'Totales', categoryType: 'total' },
  { value: 'total_liabilities', label: 'TOTAL PASIVOS', icon: null, isInflow: false, statementType: 'balance_sheet', isCustom: false, group: 'Totales', categoryType: 'total' },
  { value: 'total_equity', label: 'TOTAL PATRIMONIO', icon: null, isInflow: true, statementType: 'balance_sheet', isCustom: false, group: 'Totales', categoryType: 'total' },
  { value: 'total_liabilities_equity', label: 'TOTAL PASIVOS Y PATRIMONIO', icon: null, isInflow: false, statementType: 'balance_sheet', isCustom: false, group: 'Totales', categoryType: 'total' },
  
  // Cash Flow - Operating
  { value: 'cash_from_customers', label: 'Efectivo de Clientes', icon: null, isInflow: true, statementType: 'cash_flow', isCustom: false, group: CATEGORY_GROUPS.OPERATING_ACTIVITIES },
  { value: 'cash_to_suppliers', label: 'Efectivo a Proveedores', icon: null, isInflow: false, statementType: 'cash_flow', isCustom: false, group: CATEGORY_GROUPS.OPERATING_ACTIVITIES },
  { value: 'cash_to_employees', label: 'Efectivo a Empleados', icon: null, isInflow: false, statementType: 'cash_flow', isCustom: false, group: CATEGORY_GROUPS.OPERATING_ACTIVITIES },
  { value: 'interest_paid', label: 'Intereses Pagados', icon: null, isInflow: false, statementType: 'cash_flow', isCustom: false, group: CATEGORY_GROUPS.OPERATING_ACTIVITIES },
  { value: 'taxes_paid', label: 'Impuestos Pagados', icon: null, isInflow: false, statementType: 'cash_flow', isCustom: false, group: CATEGORY_GROUPS.OPERATING_ACTIVITIES },
  
  // Cash Flow - Investing
  { value: 'purchase_ppe', label: 'Compra de Prop., Planta y Equipo', icon: null, isInflow: false, statementType: 'cash_flow', isCustom: false, group: CATEGORY_GROUPS.INVESTING_ACTIVITIES },
  { value: 'sale_ppe', label: 'Venta de Prop., Planta y Equipo', icon: null, isInflow: true, statementType: 'cash_flow', isCustom: false, group: CATEGORY_GROUPS.INVESTING_ACTIVITIES },
  { value: 'purchase_investments', label: 'Compra de Inversiones', icon: null, isInflow: false, statementType: 'cash_flow', isCustom: false, group: CATEGORY_GROUPS.INVESTING_ACTIVITIES },
  { value: 'sale_investments', label: 'Venta de Inversiones', icon: null, isInflow: true, statementType: 'cash_flow', isCustom: false, group: CATEGORY_GROUPS.INVESTING_ACTIVITIES },
  
  // Cash Flow - Financing
  { value: 'proceeds_debt', label: 'Préstamos Obtenidos', icon: null, isInflow: true, statementType: 'cash_flow', isCustom: false, group: CATEGORY_GROUPS.FINANCING_ACTIVITIES },
  { value: 'repayment_debt', label: 'Pago de Préstamos', icon: null, isInflow: false, statementType: 'cash_flow', isCustom: false, group: CATEGORY_GROUPS.FINANCING_ACTIVITIES },
  { value: 'equity_issued', label: 'Emisión de Acciones', icon: null, isInflow: true, statementType: 'cash_flow', isCustom: false, group: CATEGORY_GROUPS.FINANCING_ACTIVITIES },
  { value: 'dividends_paid', label: 'Dividendos Pagados', icon: null, isInflow: false, statementType: 'cash_flow', isCustom: false, group: CATEGORY_GROUPS.FINANCING_ACTIVITIES },
];

/**
 * Combines default categories with company-specific custom categories
 */
export function getCombinedCategories(
  statementType: 'balance_sheet' | 'profit_loss' | 'cash_flow',
  customCategories: CustomFinancialCategory[] = []
): ExtendedFinancialCategory[] {
  // Get default categories for the statement type
  const defaultCategories = DEFAULT_FINANCIAL_CATEGORIES
    .filter(cat => cat.statementType === statementType)
    .map(cat => ({ ...cat, isCustom: false, categoryType: (cat.categoryType || 'account') as 'account' | 'section' | 'total' }));

  // Convert custom categories to the expected format
  const customCats: ExtendedFinancialCategory[] = customCategories
    .filter(cat => cat.statementType === statementType && cat.isActive)
    .map(cat => ({
      value: cat.categoryKey,
      label: cat.label,
      icon: null, // Custom categories don't have pre-defined icons
      isInflow: cat.isInflow,
      statementType: cat.statementType as any,
      isCustom: true,
      categoryType: (cat.categoryType || 'account') as 'account' | 'section' | 'total',
      description: cat.description || undefined,
      parentCategory: cat.parentCategory || undefined,
      group: cat.parentCategory || 'Custom', // Use parent category as group or 'Custom'
      id: cat.id,
      companyId: cat.companyId,
      sortOrder: cat.sortOrder || 0
    }));

  // Combine and sort
  const combined = [...defaultCategories, ...customCats];
  
  // Sort: custom categories by sortOrder, then default categories
  return combined.sort((a, b) => {
    if (a.isCustom && !b.isCustom) return -1;
    if (!a.isCustom && b.isCustom) return 1;
    if (a.isCustom && b.isCustom) {
      const aSort = (a as ExtendedFinancialCategory).sortOrder || 0;
      const bSort = (b as ExtendedFinancialCategory).sortOrder || 0;
      return aSort - bSort;
    }
    return 0;
  });
}

/**
 * Creates a new custom financial category
 */
export function createCustomCategory(
  companyId: string,
  categoryData: {
    categoryKey: string;
    label: string;
    isInflow: boolean;
    statementType: 'balance_sheet' | 'profit_loss' | 'cash_flow';
    categoryType?: 'account' | 'section' | 'total';
    description?: string;
    parentCategory?: string;
    sortOrder?: number;
  }
): NewCustomFinancialCategory {
  return {
    companyId,
    categoryKey: categoryData.categoryKey,
    label: categoryData.label,
    isInflow: categoryData.isInflow,
    statementType: categoryData.statementType,
    categoryType: categoryData.categoryType || 'account',
    description: categoryData.description,
    parentCategory: categoryData.parentCategory,
    sortOrder: categoryData.sortOrder || 0,
    isActive: true
  };
}

/**
 * Validates a custom category before creation
 */
export function validateCustomCategory(
  categoryData: Partial<NewCustomFinancialCategory>,
  existingCategories: CustomFinancialCategory[] = []
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields
  if (!categoryData.categoryKey?.trim()) {
    errors.push('Category key is required');
  }
  if (!categoryData.label?.trim()) {
    errors.push('Label is required');
  }
  if (categoryData.isInflow === undefined || categoryData.isInflow === null) {
    errors.push('Inflow/outflow designation is required');
  }
  if (!categoryData.statementType) {
    errors.push('Statement type is required');
  }

  // Uniqueness check
  if (categoryData.categoryKey) {
    const duplicate = existingCategories.find(
      cat => cat.categoryKey === categoryData.categoryKey && 
             cat.companyId === categoryData.companyId &&
             cat.isActive
    );
    if (duplicate) {
      errors.push('Category key already exists for this company');
    }
  }

  // Category key format validation
  if (categoryData.categoryKey && !/^[a-z0-9_]+$/.test(categoryData.categoryKey)) {
    errors.push('Category key must contain only lowercase letters, numbers, and underscores');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generates a category key from a label
 */
export function generateCategoryKey(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .substring(0, 50); // Limit length
}

/**
 * Default custom categories for different industries
 */
export const INDUSTRY_TEMPLATES = {
  software: [
    { categoryKey: 'saas_revenue', label: 'Ingresos SaaS', isInflow: true, statementType: 'profit_loss' as const },
    { categoryKey: 'cloud_hosting', label: 'Hosting en la Nube', isInflow: false, statementType: 'profit_loss' as const },
    { categoryKey: 'software_licenses', label: 'Licencias de Software', isInflow: false, statementType: 'profit_loss' as const },
    { categoryKey: 'rd_expenses', label: 'Gastos de I+D', isInflow: false, statementType: 'profit_loss' as const }
  ],
  
  retail: [
    { categoryKey: 'merchandise_sales', label: 'Ventas de Mercancía', isInflow: true, statementType: 'profit_loss' as const },
    { categoryKey: 'inventory_shrinkage', label: 'Merma de Inventario', isInflow: false, statementType: 'profit_loss' as const },
    { categoryKey: 'store_rent', label: 'Renta de Tiendas', isInflow: false, statementType: 'profit_loss' as const },
    { categoryKey: 'pos_fees', label: 'Comisiones POS', isInflow: false, statementType: 'profit_loss' as const }
  ],
  
  manufacturing: [
    { categoryKey: 'product_sales', label: 'Ventas de Productos', isInflow: true, statementType: 'profit_loss' as const },
    { categoryKey: 'raw_materials', label: 'Materias Primas', isInflow: false, statementType: 'profit_loss' as const },
    { categoryKey: 'factory_overhead', label: 'Gastos de Fábrica', isInflow: false, statementType: 'profit_loss' as const },
    { categoryKey: 'quality_control', label: 'Control de Calidad', isInflow: false, statementType: 'profit_loss' as const }
  ],

  consulting: [
    { categoryKey: 'consulting_fees', label: 'Honorarios de Consultoría', isInflow: true, statementType: 'profit_loss' as const },
    { categoryKey: 'project_expenses', label: 'Gastos de Proyecto', isInflow: false, statementType: 'profit_loss' as const },
    { categoryKey: 'subcontractor_fees', label: 'Honorarios de Subcontratistas', isInflow: false, statementType: 'profit_loss' as const },
    { categoryKey: 'client_travel', label: 'Viajes a Cliente', isInflow: false, statementType: 'profit_loss' as const }
  ]
};

/**
 * Gets industry-specific category templates
 */
export function getIndustryTemplate(industry: keyof typeof INDUSTRY_TEMPLATES): NewCustomFinancialCategory[] {
  const template = INDUSTRY_TEMPLATES[industry] || [];
  return template.map((cat, index) => ({
    ...cat,
    companyId: '', // Will be set when creating
    sortOrder: index,
    isActive: true
  }));
}