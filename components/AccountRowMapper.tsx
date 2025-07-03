"use client";

import { useState, useMemo, useEffect } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { detectTotalRows, TotalDetectionResult, TotalDetectionConfig } from "@/lib/total-detection";
import { getCombinedCategories, ExtendedFinancialCategory } from "@/lib/custom-categories";
import { CategoryManager } from "@/components/CategoryManager";
import { parsePeriodHeader, parsePeriodHeaders, ParsedPeriod, extractPeriodValues, suggestYearRange } from "@/lib/period-parser";
import { suggestCategoriesForSection, CategorySuggestion } from "@/lib/smart-account-mapping";
import { 
  BanknotesIcon,
  BuildingOfficeIcon,
  CreditCardIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalculatorIcon,
  ScaleIcon,
  CurrencyDollarIcon,
  CheckIcon,
  XMarkIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
  FolderIcon,
  SparklesIcon
} from "@heroicons/react/24/outline";

interface AccountRowMapperProps {
  rawData: any[][];
  onMappingComplete: (mapping: AccountMapping) => void;
  locale: string;
  quickMode?: boolean; // Skip setup steps, go straight to mapping
  companyId?: string; // For loading custom categories
  customCategories?: ExtendedFinancialCategory[]; // Pre-loaded custom categories
}

export interface AccountMapping {
  statementType: 'balance_sheet' | 'profit_loss' | 'cash_flow';
  currency: string;
  headerRow: number;
  dataStartRow: number;
  dataEndRow: number;
  accountCodeColumn: number;
  accountNameColumn: number;
  periodColumns: {
    index: number;
    label: string;
    type: 'month' | 'quarter' | 'year' | 'custom';
    parsedPeriod?: ParsedPeriod;
  }[];
  accounts: {
    rowIndex: number;
    code: string;
    name: string;
    category: FinancialCategory;
    subcategory?: string;
    isInflow: boolean;
    isCustomCategory?: boolean;
    group?: string; // Category group (e.g., Revenue, Cost of Sales, etc.)
    isSectionHeader?: boolean; // Is this row a section header?
    parentSection?: number; // Row index of the parent section header
  }[];
  totalRows: TotalDetectionResult[]; // Detected total rows
  totalDetectionConfig: TotalDetectionConfig; // Total detection settings
  // Time series data
  periods?: {
    date: string; // ISO date string
    label: string;
    type: string;
  }[];
  values?: { // accountId -> period -> value
    [accountId: string]: {
      [periodDate: string]: number;
    };
  };
}

type FinancialCategory = 
  // Balance Sheet
  | 'current_assets'
  | 'non_current_assets'
  | 'current_liabilities'
  | 'non_current_liabilities'
  | 'equity'
  // P&L - Revenue
  | 'revenue'
  | 'service_revenue'
  | 'other_revenue'
  | 'interest_income'
  // P&L - Cost of Sales
  | 'cost_of_sales'
  | 'direct_materials'
  | 'direct_labor'
  | 'manufacturing_overhead'
  // P&L - Operating Expenses
  | 'salaries_wages'
  | 'payroll_taxes'
  | 'benefits'
  | 'rent_utilities'
  | 'marketing_advertising'
  | 'professional_services'
  | 'travel_entertainment'
  | 'office_supplies'
  | 'depreciation'
  | 'insurance'
  | 'training_development'
  // P&L - Other Income/Expenses
  | 'gain_on_sale'
  | 'loss_on_sale'
  | 'interest_expense'
  | 'foreign_exchange'
  // P&L - Taxes
  | 'income_tax'
  | 'other_taxes'
  // P&L - Calculated Totals
  | 'total_revenue'
  | 'gross_profit'
  | 'gross_margin'
  | 'operating_income'
  | 'ebitda'
  | 'ebit'
  | 'net_income'
  | 'total_expenses'
  // Cash Flow - Operating
  | 'cash_from_customers'
  | 'cash_to_suppliers'
  | 'cash_to_employees'
  | 'interest_paid'
  | 'taxes_paid'
  // Cash Flow - Investing
  | 'purchase_ppe'
  | 'sale_ppe'
  | 'purchase_investments'
  | 'sale_investments'
  // Cash Flow - Financing
  | 'proceeds_debt'
  | 'repayment_debt'
  | 'equity_issued'
  | 'dividends_paid';

interface CategoryOption {
  value: FinancialCategory;
  label: string;
  icon: React.ReactNode;
  isInflow: boolean;
  statementType: AccountMapping['statementType'];
}

const FINANCIAL_CATEGORIES: CategoryOption[] = [
  // Balance Sheet
  { value: 'current_assets', label: 'Activos Corrientes', icon: <BanknotesIcon className="w-5 h-5" />, isInflow: true, statementType: 'balance_sheet' },
  { value: 'non_current_assets', label: 'Activos No Corrientes', icon: <BuildingOfficeIcon className="w-5 h-5" />, isInflow: true, statementType: 'balance_sheet' },
  { value: 'current_liabilities', label: 'Pasivos Corrientes', icon: <CreditCardIcon className="w-5 h-5" />, isInflow: false, statementType: 'balance_sheet' },
  { value: 'non_current_liabilities', label: 'Pasivos No Corrientes', icon: <ScaleIcon className="w-5 h-5" />, isInflow: false, statementType: 'balance_sheet' },
  { value: 'equity', label: 'Patrimonio', icon: <ChartBarIcon className="w-5 h-5" />, isInflow: true, statementType: 'balance_sheet' },
  
  // P&L - Revenue
  { value: 'revenue', label: 'Ingresos por Ventas', icon: <ArrowTrendingUpIcon className="w-5 h-5" />, isInflow: true, statementType: 'profit_loss' },
  { value: 'service_revenue', label: 'Ingresos por Servicios', icon: <ArrowTrendingUpIcon className="w-5 h-5" />, isInflow: true, statementType: 'profit_loss' },
  { value: 'other_revenue', label: 'Otros Ingresos Operativos', icon: <ArrowTrendingUpIcon className="w-5 h-5" />, isInflow: true, statementType: 'profit_loss' },
  { value: 'interest_income', label: 'Ingresos Financieros', icon: <CurrencyDollarIcon className="w-5 h-5" />, isInflow: true, statementType: 'profit_loss' },
  
  // P&L - Cost of Sales
  { value: 'cost_of_sales', label: 'Costo de Ventas', icon: <ArrowTrendingDownIcon className="w-5 h-5" />, isInflow: false, statementType: 'profit_loss' },
  { value: 'direct_materials', label: 'Materiales Directos', icon: <ArrowTrendingDownIcon className="w-5 h-5" />, isInflow: false, statementType: 'profit_loss' },
  { value: 'direct_labor', label: 'Mano de Obra Directa', icon: <ArrowTrendingDownIcon className="w-5 h-5" />, isInflow: false, statementType: 'profit_loss' },
  { value: 'manufacturing_overhead', label: 'Gastos Indirectos de Fabricación', icon: <ArrowTrendingDownIcon className="w-5 h-5" />, isInflow: false, statementType: 'profit_loss' },
  
  // P&L - Operating Expenses
  { value: 'salaries_wages', label: 'Sueldos y Salarios', icon: <CalculatorIcon className="w-5 h-5" />, isInflow: false, statementType: 'profit_loss' },
  { value: 'payroll_taxes', label: 'Impuestos sobre Nómina', icon: <CalculatorIcon className="w-5 h-5" />, isInflow: false, statementType: 'profit_loss' },
  { value: 'benefits', label: 'Beneficios y Prestaciones', icon: <CalculatorIcon className="w-5 h-5" />, isInflow: false, statementType: 'profit_loss' },
  { value: 'rent_utilities', label: 'Renta y Servicios', icon: <BuildingOfficeIcon className="w-5 h-5" />, isInflow: false, statementType: 'profit_loss' },
  { value: 'marketing_advertising', label: 'Marketing y Publicidad', icon: <CalculatorIcon className="w-5 h-5" />, isInflow: false, statementType: 'profit_loss' },
  { value: 'professional_services', label: 'Servicios Profesionales', icon: <CalculatorIcon className="w-5 h-5" />, isInflow: false, statementType: 'profit_loss' },
  { value: 'travel_entertainment', label: 'Viajes y Entretenimiento', icon: <CalculatorIcon className="w-5 h-5" />, isInflow: false, statementType: 'profit_loss' },
  { value: 'office_supplies', label: 'Suministros de Oficina', icon: <CalculatorIcon className="w-5 h-5" />, isInflow: false, statementType: 'profit_loss' },
  { value: 'depreciation', label: 'Depreciación', icon: <ArrowTrendingDownIcon className="w-5 h-5" />, isInflow: false, statementType: 'profit_loss' },
  { value: 'insurance', label: 'Seguros', icon: <ScaleIcon className="w-5 h-5" />, isInflow: false, statementType: 'profit_loss' },
  { value: 'training_development', label: 'Capacitación y Desarrollo', icon: <CalculatorIcon className="w-5 h-5" />, isInflow: false, statementType: 'profit_loss' },
  
  // P&L - Other Income/Expenses
  { value: 'gain_on_sale', label: 'Ganancia en Venta de Activos', icon: <ArrowTrendingUpIcon className="w-5 h-5" />, isInflow: true, statementType: 'profit_loss' },
  { value: 'loss_on_sale', label: 'Pérdida en Venta de Activos', icon: <ArrowTrendingDownIcon className="w-5 h-5" />, isInflow: false, statementType: 'profit_loss' },
  { value: 'interest_expense', label: 'Gastos Financieros', icon: <ArrowTrendingDownIcon className="w-5 h-5" />, isInflow: false, statementType: 'profit_loss' },
  { value: 'foreign_exchange', label: 'Diferencia Cambiaria', icon: <CurrencyDollarIcon className="w-5 h-5" />, isInflow: true, statementType: 'profit_loss' },
  
  // P&L - Taxes
  { value: 'income_tax', label: 'Impuesto sobre la Renta', icon: <CalculatorIcon className="w-5 h-5" />, isInflow: false, statementType: 'profit_loss' },
  { value: 'other_taxes', label: 'Otros Impuestos', icon: <CalculatorIcon className="w-5 h-5" />, isInflow: false, statementType: 'profit_loss' },
  
  // P&L - Calculated Totals (Special categories for totals)
  { value: 'total_revenue', label: 'Ingresos Totales', icon: <CalculatorIcon className="w-5 h-5" />, isInflow: true, statementType: 'profit_loss' },
  { value: 'gross_profit', label: 'Utilidad Bruta', icon: <CalculatorIcon className="w-5 h-5" />, isInflow: true, statementType: 'profit_loss' },
  { value: 'gross_margin', label: 'Margen Bruto', icon: <CalculatorIcon className="w-5 h-5" />, isInflow: true, statementType: 'profit_loss' },
  { value: 'operating_income', label: 'Utilidad Operativa', icon: <CalculatorIcon className="w-5 h-5" />, isInflow: true, statementType: 'profit_loss' },
  { value: 'ebitda', label: 'EBITDA', icon: <CalculatorIcon className="w-5 h-5" />, isInflow: true, statementType: 'profit_loss' },
  { value: 'ebit', label: 'EBIT', icon: <CalculatorIcon className="w-5 h-5" />, isInflow: true, statementType: 'profit_loss' },
  { value: 'net_income', label: 'Utilidad Neta', icon: <CalculatorIcon className="w-5 h-5" />, isInflow: true, statementType: 'profit_loss' },
  { value: 'total_expenses', label: 'Gastos Totales', icon: <CalculatorIcon className="w-5 h-5" />, isInflow: false, statementType: 'profit_loss' },
  
  // Cash Flow - Operating Activities
  { value: 'cash_from_customers', label: 'Efectivo de Clientes', icon: <BanknotesIcon className="w-5 h-5" />, isInflow: true, statementType: 'cash_flow' },
  { value: 'cash_to_suppliers', label: 'Efectivo a Proveedores', icon: <ArrowTrendingDownIcon className="w-5 h-5" />, isInflow: false, statementType: 'cash_flow' },
  { value: 'cash_to_employees', label: 'Efectivo a Empleados', icon: <ArrowTrendingDownIcon className="w-5 h-5" />, isInflow: false, statementType: 'cash_flow' },
  { value: 'interest_paid', label: 'Intereses Pagados', icon: <ArrowTrendingDownIcon className="w-5 h-5" />, isInflow: false, statementType: 'cash_flow' },
  { value: 'taxes_paid', label: 'Impuestos Pagados', icon: <ArrowTrendingDownIcon className="w-5 h-5" />, isInflow: false, statementType: 'cash_flow' },
  
  // Cash Flow - Investing Activities  
  { value: 'purchase_ppe', label: 'Compra de Prop., Planta y Equipo', icon: <BuildingOfficeIcon className="w-5 h-5" />, isInflow: false, statementType: 'cash_flow' },
  { value: 'sale_ppe', label: 'Venta de Prop., Planta y Equipo', icon: <ArrowTrendingUpIcon className="w-5 h-5" />, isInflow: true, statementType: 'cash_flow' },
  { value: 'purchase_investments', label: 'Compra de Inversiones', icon: <ArrowTrendingDownIcon className="w-5 h-5" />, isInflow: false, statementType: 'cash_flow' },
  { value: 'sale_investments', label: 'Venta de Inversiones', icon: <ArrowTrendingUpIcon className="w-5 h-5" />, isInflow: true, statementType: 'cash_flow' },
  
  // Cash Flow - Financing Activities
  { value: 'proceeds_debt', label: 'Préstamos Obtenidos', icon: <CreditCardIcon className="w-5 h-5" />, isInflow: true, statementType: 'cash_flow' },
  { value: 'repayment_debt', label: 'Pago de Préstamos', icon: <ArrowTrendingDownIcon className="w-5 h-5" />, isInflow: false, statementType: 'cash_flow' },
  { value: 'equity_issued', label: 'Emisión de Acciones', icon: <ArrowTrendingUpIcon className="w-5 h-5" />, isInflow: true, statementType: 'cash_flow' },
  { value: 'dividends_paid', label: 'Dividendos Pagados', icon: <ArrowTrendingDownIcon className="w-5 h-5" />, isInflow: false, statementType: 'cash_flow' },
];

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'ARS', symbol: '$', name: 'Argentine Peso' },
  { code: 'COP', symbol: '$', name: 'Colombian Peso' },
  { code: 'CLP', symbol: '$', name: 'Chilean Peso' },
  { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol' },
];

type MappingStep = 'setup' | 'identify_structure' | 'map_accounts' | 'review';

// Helper component for category buttons
interface CategoryButtonProps {
  category: ExtendedFinancialCategory;
  onClick: (categoryValue: string) => void;
}

function CategoryButton({ category, onClick }: CategoryButtonProps) {
  const isTotalCategory = ['total_revenue', 'gross_profit', 'gross_margin', 'operating_income', 'ebitda', 'ebit', 'net_income', 'total_expenses'].includes(category.value);
  
  return (
    <button
      onClick={() => onClick(category.value)}
      className={`p-3 rounded-lg border-2 transition-all hover:shadow-md text-left ${
        isTotalCategory
          ? 'border-orange-200 hover:border-orange-400 hover:bg-orange-50'
          : category.isCustom 
          ? 'border-purple-200 hover:border-purple-400 hover:bg-purple-50'
          : category.isInflow 
            ? 'border-green-200 hover:border-green-400 hover:bg-green-50' 
            : 'border-red-200 hover:border-red-400 hover:bg-red-50'
      }`}
    >
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-lg ${
          isTotalCategory
            ? 'bg-orange-100 text-orange-700'
            : category.isCustom
            ? 'bg-purple-100 text-purple-700'
            : category.isInflow 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
        }`}>
          {category.icon || (isTotalCategory ? '🧮' : category.isCustom ? '⚙️' : '📊')}
        </div>
        <div className="flex-1">
          <div className="font-medium text-gray-900 flex items-center space-x-2">
            <span>{category.label}</span>
            {isTotalCategory && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">Total Calculado</span>}
            {category.isCustom && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">Personalizada</span>}
          </div>
          <div className="text-sm text-gray-500">
            {category.isInflow ? 'Entrada / Positivo' : 'Salida / Negativo'}
            {category.description && ` • ${category.description}`}
          </div>
        </div>
        <div className={`text-2xl ${
          category.isCustom 
            ? 'text-purple-600'
            : category.isInflow 
              ? 'text-green-600' 
              : 'text-red-600'
        }`}>
          {category.isInflow ? '+' : '-'}
        </div>
      </div>
    </button>
  );
}

export function AccountRowMapper({
  rawData,
  onMappingComplete,
  locale: propLocale,
  quickMode = false,
  companyId,
  customCategories = []
}: AccountRowMapperProps) {
  const { locale: contextLocale, currency: detectedCurrency } = useLocale();
  const locale = propLocale || contextLocale;
  const [step, setStep] = useState<MappingStep>(quickMode ? 'identify_structure' : 'setup');
  const [statementType, setStatementType] = useState<AccountMapping['statementType']>('profit_loss');
  const [currency, setCurrency] = useState<string>(detectedCurrency || 'USD');
  const [headerRow, setHeaderRow] = useState<number>(-1);
  const [accountCodeColumn, setAccountCodeColumn] = useState<number>(-1);
  const [accountNameColumn, setAccountNameColumn] = useState<number>(-1);
  const [periodColumns, setPeriodColumns] = useState<AccountMapping['periodColumns']>([]);
  const [accountMappings, setAccountMappings] = useState<Map<number, AccountMapping['accounts'][0]>>(new Map());
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [showCategoryPanel, setShowCategoryPanel] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [managedCategories, setManagedCategories] = useState<ExtendedFinancialCategory[]>([]);
  const [contextYear, setContextYear] = useState<number>(2025); // For the test data
  const [showYearSelector, setShowYearSelector] = useState(false);
  const [parsedPeriods, setParsedPeriods] = useState<Map<number, ParsedPeriod>>(new Map());
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  
  // Total detection state
  const [detectedTotals, setDetectedTotals] = useState<TotalDetectionResult[]>([]);
  const [totalDetectionConfig, setTotalDetectionConfig] = useState<TotalDetectionConfig>({
    autoDetect: true,
    manualOverrides: [],
    excludeFromMapping: []
  });
  const [showTotalDetection, setShowTotalDetection] = useState(false);
  
  // Section header state
  const [sectionHeaders, setSectionHeaders] = useState<Set<number>>(new Set());
  const [showSectionDialog, setShowSectionDialog] = useState(false);
  const [selectedSectionRow, setSelectedSectionRow] = useState<number | null>(null);
  const [smartMappingMode, setSmartMappingMode] = useState(true); // Toggle for smart vs uniform mapping
  const [smartSuggestions, setSmartSuggestions] = useState<Map<number, CategorySuggestion>>(new Map());

  // Update currency when detected currency changes
  useEffect(() => {
    if (detectedCurrency && !currency) {
      setCurrency(detectedCurrency);
    }
  }, [detectedCurrency, currency]);

  // Auto-detect structure on data load if in quickMode
  useEffect(() => {
    if (quickMode && rawData.length > 0 && headerRow === -1) {
      autoDetectStructure();
    }
  }, [rawData, quickMode]);

  // Check if we need year context when periods change
  useEffect(() => {
    if (periodColumns.length > 0) {
      const headers = periodColumns.map(p => p.label);
      const { needsYearContext, detectedYear } = parsePeriodHeaders(headers, locale === 'es-MX' ? 'es' : 'en');
      
      // Only show year selector if we haven't already selected a year and it's needed
      if (needsYearContext && !detectedYear && !contextYear) {
        setShowYearSelector(true);
      } else if (detectedYear && detectedYear !== contextYear) {
        setContextYear(detectedYear);
      }
      
      // Re-parse all periods with context year
      const newParsedPeriods = new Map<number, ParsedPeriod>();
      periodColumns.forEach(col => {
        const parsed = parsePeriodHeader(col.label, contextYear, locale === 'es-MX' ? 'es' : 'en');
        if (parsed) {
          newParsedPeriods.set(col.index, parsed);
        }
      });
      setParsedPeriods(newParsedPeriods);
    }
  }, [periodColumns, contextYear, locale]);

  // Run total detection when data or config changes
  useEffect(() => {
    if (rawData.length > 0 && totalDetectionConfig.autoDetect) {
      const totals = detectTotalRows(rawData, {}, accountNameColumn);
      setDetectedTotals(totals);
      
      // Update exclude list with detected totals
      const totalRowIndices = totals.map(t => t.rowIndex);
      setTotalDetectionConfig(prev => ({
        ...prev,
        excludeFromMapping: Array.from(new Set([...prev.excludeFromMapping, ...totalRowIndices]))
      }));
    }
  }, [rawData, totalDetectionConfig.autoDetect, accountNameColumn]);

  // Handle body overflow when modal is open
  useEffect(() => {
    if (showCategoryPanel || showSectionDialog) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showCategoryPanel, showSectionDialog]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showCategoryPanel) {
          setShowCategoryPanel(false);
          setSelectedRow(null);
          setCategorySearchTerm('');
        } else if (showSectionDialog) {
          setShowSectionDialog(false);
          setSelectedSectionRow(null);
        }
      }
    };
    
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [showCategoryPanel, showSectionDialog]);

  const maxCols = Math.max(...rawData.map(row => row?.length || 0));
  const visibleRows = rawData.length; // Show ALL rows, no limits

  // Auto-detect structure for quickMode
  const autoDetectStructure = () => {
    if (rawData.length === 0) return;
    
    // Find header row - look for row with column names like "Cuenta", "Descripción", month names
    let detectedHeaderRow = -1;
    for (let i = 0; i < Math.min(5, rawData.length); i++) {
      const row = rawData[i];
      if (row && row.length > 2) {
        const rowText = row.map(cell => String(cell || '').toLowerCase().trim());
        if (rowText.some(text => 
          text.includes('cuenta') || text.includes('description') || 
          text.includes('descripción') || text.includes('account') ||
          text.match(/^(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)/) ||
          text.match(/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/)
        )) {
          detectedHeaderRow = i;
          break;
        }
      }
    }
    
    if (detectedHeaderRow >= 0) {
      setHeaderRow(detectedHeaderRow);
      
      // Auto-detect columns
      const headerRow = rawData[detectedHeaderRow];
      let accountCodeCol = -1;
      let accountNameCol = -1;
      const periodCols: AccountMapping['periodColumns'] = [];
      
      for (let colIndex = 0; colIndex < headerRow.length; colIndex++) {
        const header = String(headerRow[colIndex] || '').toLowerCase().trim();
        
        if (header.includes('cuenta') || header.includes('account')) {
          accountCodeCol = colIndex;
        } else if (header.includes('descripción') || header.includes('description') || header.includes('nombre')) {
          accountNameCol = colIndex;
        } else if (header.match(/^(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)/) ||
                   header.match(/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/) ||
                   header.match(/\d{4}/) || header.includes('202')) { // month or year patterns
          periodCols.push({
            index: colIndex,
            label: String(headerRow[colIndex] || ''),
            type: 'month'
          });
        }
      }
      
      // Set detected columns
      setAccountCodeColumn(accountCodeCol);
      setAccountNameColumn(accountNameCol >= 0 ? accountNameCol : (accountCodeCol >= 0 ? accountCodeCol + 1 : 1));
      setPeriodColumns(periodCols);
      
      // If structure is detected, go directly to mapping
      if (periodCols.length > 0) {
        setStep('map_accounts');
      }
    }
  };

  // Combine default and custom categories based on statement type
  const availableCategories = useMemo(() => {
    const combined = getCombinedCategories(statementType, []);
    // If we have managed categories, use those instead
    return managedCategories.length > 0 ? managedCategories : combined;
  }, [statementType, managedCategories]);

  const handleColumnClick = (colIndex: number) => {
    if (step !== 'identify_structure' || headerRow === -1) return;

    // Check if this is a period column (has date-like or period-like header)
    const headerValue = rawData[headerRow][colIndex];
    const headerStr = String(headerValue || '').toLowerCase();
    
    if (headerStr.match(/\d{4}|ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|q\d|trimestre|quarter|mes|año|year|month/)) {
      // Toggle period column
      setPeriodColumns(prev => {
        const exists = prev.findIndex(p => p.index === colIndex);
        if (exists >= 0) {
          // Remove period
          const newPeriods = prev.filter(p => p.index !== colIndex);
          // Remove from parsed periods
          setParsedPeriods(current => {
            const newMap = new Map(current);
            newMap.delete(colIndex);
            return newMap;
          });
          return newPeriods;
        } else {
          // Add period and try to parse it
          const parsed = parsePeriodHeader(String(headerValue), contextYear, locale === 'es-MX' ? 'es' : 'en');
          if (parsed) {
            setParsedPeriods(current => new Map(current).set(colIndex, parsed));
          }
          return [...prev, {
            index: colIndex,
            label: String(headerValue),
            type: detectPeriodType(headerStr),
            parsedPeriod: parsed || undefined
          }];
        }
      });
    } else {
      // Check for account code or name
      const sampleValue = rawData[headerRow + 1]?.[colIndex];
      if (sampleValue && (typeof sampleValue === 'number' || /^\d+$/.test(String(sampleValue)))) {
        setAccountCodeColumn(colIndex);
      } else {
        setAccountNameColumn(colIndex);
      }
    }
  };

  const detectPeriodType = (str: string): AccountMapping['periodColumns'][0]['type'] => {
    if (str.match(/q\d|trimestre|quarter/i)) return 'quarter';
    if (str.match(/\d{4}|año|year/i)) return 'year';
    if (str.match(/ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic|jan|apr|aug|dec|mes|month/i)) return 'month';
    return 'custom';
  };

  const handleAccountRowClick = (rowIndex: number) => {
    if (step !== 'map_accounts') return;
    
    // Allow clicking on header row if it's a likely section
    if (rowIndex === headerRow) {
      if (!isLikelySection(rowIndex)) return;
    } else if (rowIndex < headerRow) {
      return;
    }

    const accountCode = accountCodeColumn >= 0 ? String(rawData[rowIndex][accountCodeColumn] || '') : '';
    const accountName = accountNameColumn >= 0 ? String(rawData[rowIndex][accountNameColumn] || '') : '';

    // Allow clicking if we have either account code OR account name (or at least some text in the row)
    const hasAccountData = accountCode.trim() || accountName.trim() || 
                          (rawData[rowIndex] && rawData[rowIndex].some(cell => 
                            cell && String(cell).trim() && String(cell).trim() !== '-'
                          ));

    if (!hasAccountData) return;

    console.log(`Clicked row ${rowIndex}: "${accountName}" (code: "${accountCode}")`);
    setSelectedRow(rowIndex);
    setShowCategoryPanel(true);
  };

  const handleCategorySelect = (categoryValue: string) => {
    if (selectedRow === null) return;

    const accountCode = accountCodeColumn >= 0 ? String(rawData[selectedRow][accountCodeColumn] || '') : '';
    const accountName = accountNameColumn >= 0 ? String(rawData[selectedRow][accountNameColumn] || '') : '';
    
    // If no explicit name column is set, try to get the first non-empty cell as the account name
    let finalAccountName = accountName;
    if (!finalAccountName && rawData[selectedRow]) {
      for (let i = 0; i < rawData[selectedRow].length; i++) {
        const cellValue = String(rawData[selectedRow][i] || '').trim();
        if (cellValue && cellValue !== '-' && !cellValue.match(/^\$?\d+[\d,.\s]*$/)) {
          finalAccountName = cellValue;
          break;
        }
      }
    }
    
    // Find category info from available categories (includes custom)
    const categoryInfo = availableCategories.find(c => c.value === categoryValue);

    const newMapping: AccountMapping['accounts'][0] = {
      rowIndex: selectedRow,
      code: accountCode,
      name: finalAccountName || `Row ${selectedRow + 1}`,
      category: categoryValue as FinancialCategory,
      isInflow: categoryInfo?.isInflow || false,
      isCustomCategory: categoryInfo?.isCustom || false,
      group: categoryInfo?.group
    };

    console.log('Creating mapping:', newMapping);
    setAccountMappings(prev => new Map(prev).set(selectedRow, newMapping));
    setShowCategoryPanel(false);
    setSelectedRow(null);
    setCategorySearchTerm('');
  };

  const isRowClickable = (rowIndex: number) => {
    if (step !== 'map_accounts') return false;
    
    // Allow clicking on header row if it's a likely section
    if (rowIndex === headerRow && isLikelySection(rowIndex)) return true;
    
    // For rows after header, standard check
    if (rowIndex <= headerRow) return false;

    // Check if row has any meaningful data
    return rawData[rowIndex] && rawData[rowIndex].some(cell => 
      cell && String(cell).trim() && String(cell).trim() !== '-'
    );
  };

  const isRowTotal = (rowIndex: number) => {
    return detectedTotals.some(total => total.rowIndex === rowIndex);
  };

  const toggleTotalStatus = (rowIndex: number) => {
    const isCurrentlyTotal = isRowTotal(rowIndex);
    
    if (isCurrentlyTotal) {
      // Remove from totals
      setTotalDetectionConfig(prev => ({
        ...prev,
        manualOverrides: [
          ...prev.manualOverrides.filter(o => o.rowIndex !== rowIndex),
          { rowIndex, isTotal: false }
        ],
        excludeFromMapping: prev.excludeFromMapping.filter(idx => idx !== rowIndex)
      }));
    } else {
      // Add to totals
      const accountName = accountNameColumn >= 0 ? String(rawData[rowIndex][accountNameColumn] || '') : '';
      setTotalDetectionConfig(prev => ({
        ...prev,
        manualOverrides: [
          ...prev.manualOverrides.filter(o => o.rowIndex !== rowIndex),
          { rowIndex, isTotal: true, totalType: 'section_total' }
        ],
        excludeFromMapping: Array.from(new Set([...prev.excludeFromMapping, rowIndex]))
      }));
      
      // Remove any existing mapping for this row
      setAccountMappings(prev => {
        const newMap = new Map(prev);
        newMap.delete(rowIndex);
        return newMap;
      });
    }
  };

  const isRowSectionHeader = (rowIndex: number) => {
    return sectionHeaders.has(rowIndex);
  };

  const isLikelySection = (rowIndex: number) => {
    // Check if this row looks like a section header
    // Has account name but no numeric values in period columns
    if (rowIndex < 0 || rowIndex >= rawData.length) return false;
    
    const accountName = accountNameColumn >= 0 ? String(rawData[rowIndex][accountNameColumn] || '').trim() : '';
    if (!accountName || accountName === '-') return false;
    
    // Check if all period columns are empty or non-numeric
    const hasNoNumericValues = periodColumns.every(col => {
      const value = rawData[rowIndex][col.index];
      if (!value || value === '-' || value === '0') return true;
      
      // Check if it's a numeric value
      const strValue = String(value).trim();
      return !strValue.match(/^\$?[\d,]+\.?\d*$/);
    });
    
    // Also check it's not already a total
    const isTotal = isRowTotal(rowIndex);
    
    return hasNoNumericValues && !isTotal;
  };

  const toggleSectionHeaderStatus = (rowIndex: number) => {
    if (isRowSectionHeader(rowIndex)) {
      // Remove section header status
      setSectionHeaders(prev => {
        const newSet = new Set(prev);
        newSet.delete(rowIndex);
        return newSet;
      });
      
      // Remove any mappings that were auto-created from this section
      const childRows = findSectionChildren(rowIndex);
      setAccountMappings(prev => {
        const newMap = new Map(prev);
        childRows.forEach(childRow => {
          const mapping = newMap.get(childRow);
          if (mapping?.parentSection === rowIndex) {
            newMap.delete(childRow);
          }
        });
        return newMap;
      });
    } else {
      // Show section dialog to select category
      setSelectedSectionRow(rowIndex);
      
      // Get section name
      const sectionName = accountNameColumn >= 0 
        ? String(rawData[rowIndex][accountNameColumn] || '') 
        : 'Section';
      
      // If smart mapping is enabled, get AI suggestions
      if (smartMappingMode) {
        const childRows = findSectionChildren(rowIndex);
        const accounts = childRows.map(childRow => ({
          rowIndex: childRow,
          name: accountNameColumn >= 0 ? String(rawData[childRow][accountNameColumn] || '') : ''
        }));
        
        const suggestions = suggestCategoriesForSection(
          accounts,
          sectionName,
          availableCategories,
          locale === 'es' ? 'es' : 'en'
        );
        
        setSmartSuggestions(suggestions);
      }
      
      setShowSectionDialog(true);
    }
  };

  const findSectionChildren = (headerRow: number): number[] => {
    const children: number[] = [];
    
    // Start from the row after the header
    for (let i = headerRow + 1; i < rawData.length; i++) {
      // Stop if we hit another section header
      if (isRowSectionHeader(i)) break;
      
      // Stop if we hit a total row
      if (isRowTotal(i)) break;
      
      // Skip empty rows
      const hasData = rawData[i] && rawData[i].some(cell => 
        cell && String(cell).trim() && String(cell).trim() !== '-'
      );
      if (!hasData) continue;
      
      // This is a child row
      children.push(i);
    }
    
    return children;
  };

  const handleSectionCategorySelect = (categoryValue: string, useSmartMapping: boolean = false) => {
    if (selectedSectionRow === null) return;
    
    // Mark as section header
    setSectionHeaders(prev => new Set(prev).add(selectedSectionRow));
    
    // Get section name
    const sectionName = accountNameColumn >= 0 
      ? String(rawData[selectedSectionRow][accountNameColumn] || '') 
      : 'Section';
    
    // Find category info
    const categoryInfo = availableCategories.find(c => c.value === categoryValue);
    
    // Map the section header itself
    const sectionMapping: AccountMapping['accounts'][0] = {
      rowIndex: selectedSectionRow,
      code: '',
      name: sectionName,
      category: categoryValue as FinancialCategory,
      isInflow: categoryInfo?.isInflow || false,
      isCustomCategory: categoryInfo?.isCustom || false,
      group: categoryInfo?.group,
      isSectionHeader: true
    };
    
    // Find all children and map them
    const childRows = findSectionChildren(selectedSectionRow);
    const childMappings: AccountMapping['accounts'] = childRows.map(childRow => {
      const accountCode = accountCodeColumn >= 0 ? String(rawData[childRow][accountCodeColumn] || '') : '';
      const accountName = accountNameColumn >= 0 ? String(rawData[childRow][accountNameColumn] || '') : '';
      
      // If using smart mapping, get the suggestion for this account
      let selectedCategory = categoryValue;
      let selectedCategoryInfo = categoryInfo;
      
      if (useSmartMapping && smartSuggestions.has(childRow)) {
        const suggestion = smartSuggestions.get(childRow)!;
        const suggestedCategoryInfo = availableCategories.find(c => c.value === suggestion.category);
        
        // Ensure the suggested category matches the section's inflow/outflow type
        if (suggestedCategoryInfo && suggestedCategoryInfo.isInflow === categoryInfo?.isInflow) {
          selectedCategory = suggestion.category;
          selectedCategoryInfo = suggestedCategoryInfo;
        }
        // If suggestion doesn't match section's inflow type, fall back to section category
      }
      
      return {
        rowIndex: childRow,
        code: accountCode,
        name: accountName || `Row ${childRow + 1}`,
        category: selectedCategory as FinancialCategory,
        isInflow: selectedCategoryInfo?.isInflow || false,
        isCustomCategory: selectedCategoryInfo?.isCustom || false,
        group: selectedCategoryInfo?.group,
        parentSection: selectedSectionRow
      };
    });
    
    // Update mappings
    setAccountMappings(prev => {
      const newMap = new Map(prev);
      newMap.set(selectedSectionRow, sectionMapping);
      childMappings.forEach(mapping => {
        newMap.set(mapping.rowIndex, mapping);
      });
      return newMap;
    });
    
    // Close dialog and reset
    setShowSectionDialog(false);
    setSelectedSectionRow(null);
    setSmartSuggestions(new Map());
  };

  const getRowTitle = (rowIndex: number) => {
    if (isRowTotal(rowIndex)) {
      const total = detectedTotals.find(t => t.rowIndex === rowIndex);
      return `Total detectado (${total?.totalType}) - Puedes mapearlo a una categoría de total`;
    }
    if (isRowSectionHeader(rowIndex)) {
      const mapping = accountMappings.get(rowIndex);
      if (mapping) {
        const category = availableCategories.find(c => c.value === mapping.category);
        const childCount = findSectionChildren(rowIndex).length;
        return `Encabezado de sección: ${category?.label} (${childCount} cuentas)`;
      }
      return 'Haz clic en "H" para marcar como encabezado de sección';
    }
    if (accountMappings.has(rowIndex)) {
      const mapping = accountMappings.get(rowIndex);
      const category = availableCategories.find(c => c.value === mapping?.category);
      if (mapping?.parentSection !== undefined) {
        return `Mapeado a: ${category?.label || mapping?.category} (heredado de sección)`;
      }
      return `Mapeado a: ${category?.label || mapping?.category} (${mapping?.isInflow ? 'Entrada →' : 'Salida ←'})`;
    }
    // Special message for likely section headers
    if (isLikelySection(rowIndex)) {
      return 'Esta fila parece ser un encabezado de sección. Haz clic en "H" para mapear toda la sección';
    }
    return 'Haz clic para mapear esta cuenta';
  };

  const getRowStyle = (rowIndex: number) => {
    if (rowIndex === headerRow) return 'bg-yellow-100 font-semibold';
    
    // Style section headers
    if (isRowSectionHeader(rowIndex)) {
      const mapping = accountMappings.get(rowIndex);
      if (mapping) {
        return `bg-blue-100 border-l-4 border-blue-600 font-semibold ${
          mapping.isInflow ? 'text-green-800' : 'text-red-800'
        }`;
      }
      return 'bg-gray-100 border-l-4 border-gray-400 font-semibold';
    }
    
    // Style total rows differently
    if (isRowTotal(rowIndex)) {
      const total = detectedTotals.find(t => t.rowIndex === rowIndex);
      return `bg-orange-50 border-l-4 border-orange-400 font-semibold ${
        total?.confidence && total.confidence > 0.7 ? 'text-orange-800' : 'text-orange-600'
      }`;
    }
    
    if (accountMappings.has(rowIndex)) {
      const mapping = accountMappings.get(rowIndex);
      // Different styling for child accounts under sections
      if (mapping?.parentSection !== undefined) {
        return mapping?.isInflow 
          ? 'border-l-8 border-green-300 bg-green-50/30 pl-4' 
          : 'border-l-8 border-red-300 bg-red-50/30 pl-4';
      }
      return mapping?.isInflow 
        ? 'border-l-4 border-green-500 bg-green-50/50' 
        : 'border-l-4 border-red-500 bg-red-50/50';
    }
    if (isRowClickable(rowIndex) && step === 'map_accounts') {
      // Special styling for likely section headers
      if (isLikelySection(rowIndex)) {
        return 'hover:bg-blue-100 border-l-2 border-transparent hover:border-blue-400 font-medium';
      }
      return 'hover:bg-blue-50/50 border-l-2 border-transparent hover:border-blue-300';
    }
    return '';
  };

  const canProceed = () => {
    switch (step) {
      case 'setup':
        return statementType && currency;
      case 'identify_structure':
        return headerRow >= 0 && (accountCodeColumn >= 0 || accountNameColumn >= 0) && periodColumns.length > 0;
      case 'map_accounts':
        return accountMappings.size > 0;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const completeMapping = () => {
    // Extract time series values
    const accountRows = Array.from(accountMappings.keys());
    const periodColumnsWithParsed = periodColumns.map(col => ({
      index: col.index,
      period: parsedPeriods.get(col.index)!
    })).filter(col => col.period);
    
    const extractedValues = extractPeriodValues(
      rawData,
      headerRow,
      periodColumnsWithParsed,
      accountRows
    );
    
    // Convert to the final format
    const periods = periodColumnsWithParsed.map(({ period }) => ({
      date: period.parsedDate.toISOString(),
      label: period.displayLabel,
      type: period.type
    }));
    
    const values: { [accountId: string]: { [periodDate: string]: number } } = {};
    extractedValues.forEach((periodValues, rowIndex) => {
      const account = accountMappings.get(rowIndex);
      if (account) {
        const accountId = `${account.name}_${rowIndex}`;
        values[accountId] = Object.fromEntries(periodValues);
      }
    });
    
    const mapping: AccountMapping = {
      statementType,
      currency,
      headerRow,
      dataStartRow: headerRow + 1,
      dataEndRow: rawData.length - 1,
      accountCodeColumn,
      accountNameColumn,
      periodColumns: periodColumns.map(col => ({
        ...col,
        parsedPeriod: parsedPeriods.get(col.index)
      })),
      accounts: Array.from(accountMappings.values()),
      totalRows: detectedTotals,
      totalDetectionConfig,
      periods,
      values
    };
    onMappingComplete(mapping);
  };

  return (
    <div className="space-y-6">
      {/* Progress and Instructions */}
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">Mapeo de Cuentas Financieras</h3>
          <div className="flex space-x-2">
            {(['setup', 'identify_structure', 'map_accounts', 'review'] as const).map((s, index) => (
              <div
                key={s}
                className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm font-medium ${
                  step === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                <span>{index + 1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Step Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          {step === 'setup' && (
            <>
              <h4 className="font-medium text-blue-900 mb-2">Configuración Inicial</h4>
              <p className="text-sm text-blue-800">Selecciona el tipo de estado financiero y la moneda de tus datos.</p>
            </>
          )}
          {step === 'identify_structure' && (
            <>
              <h4 className="font-medium text-blue-900 mb-2">Identificar Estructura</h4>
              <p className="text-sm text-blue-800">
                1. Haz clic en la fila de encabezados<br/>
                2. Haz clic en las columnas de código y nombre de cuenta<br/>
                3. Haz clic en las columnas de períodos (meses, trimestres, años)
              </p>
              {/* Progress indicators */}
              <div className="mt-3 flex items-center space-x-4 text-xs">
                <div className={`flex items-center space-x-1 ${headerRow >= 0 ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-2 h-2 rounded-full ${headerRow >= 0 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span>Fila de encabezados {headerRow >= 0 ? '✓' : ''}</span>
                </div>
                <div className={`flex items-center space-x-1 ${(accountCodeColumn >= 0 || accountNameColumn >= 0) ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-2 h-2 rounded-full ${(accountCodeColumn >= 0 || accountNameColumn >= 0) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span>Columnas de cuenta {(accountCodeColumn >= 0 || accountNameColumn >= 0) ? '✓' : ''}</span>
                </div>
                <div className={`flex items-center space-x-1 ${periodColumns.length > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-2 h-2 rounded-full ${periodColumns.length > 0 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span>Períodos ({periodColumns.length}) {periodColumns.length > 0 ? '✓' : ''}</span>
                </div>
              </div>
            </>
          )}
          {step === 'map_accounts' && (
            <>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-blue-900">Mapear Cuentas</h4>
                <button
                  onClick={() => setShowCategoryManager(true)}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                  title="Gestionar categorías financieras"
                >
                  <Cog6ToothIcon className="w-4 h-4" />
                  <span>Editar Categorías</span>
                </button>
              </div>
              <p className="text-sm text-blue-800">
                Haz clic en cada fila de cuenta para asignarle una categoría financiera.
                Las cuentas de entrada (ingresos, activos) se mostrarán en verde, las de salida (gastos, pasivos) en rojo.
              </p>
              <div className="mt-2 space-y-1 text-xs">
                <div className="text-blue-700">
                  💡 <strong>Consejo:</strong> Las filas con datos aparecerán resaltadas al pasar el mouse.
                </div>
                <div className="text-blue-700">
                  📁 <strong>Mapeo Jerárquico:</strong> Usa el botón "H" para marcar encabezados de sección (ej: "Revenue", "Cost of Sales") y mapear todas sus cuentas automáticamente.
                </div>
                <div className="text-orange-700">
                  🧮 <strong>Totales:</strong> Las filas naranjas son totales detectados. Puedes mapearlos a categorías especiales como Utilidad Bruta, EBITDA, etc.
                </div>
                {detectedTotals.length > 0 && (
                  <div className="text-green-700">
                    ✅ <strong>Detectados:</strong> {detectedTotals.length} total{detectedTotals.length !== 1 ? 'es' : ''} encontrado{detectedTotals.length !== 1 ? 's' : ''}
                  </div>
                )}
                {periodColumns.length > 0 && (
                  <div className="text-purple-700">
                    📅 <strong>Períodos:</strong> Mapearás {periodColumns.length} período{periodColumns.length !== 1 ? 's' : ''} de datos
                  </div>
                )}
              </div>
              {/* Mapping progress */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-blue-800">Progreso del mapeo</span>
                  <span className="font-medium text-blue-900">{accountMappings.size} cuenta{accountMappings.size !== 1 ? 's' : ''} mapeada{accountMappings.size !== 1 ? 's' : ''}</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${Math.min(100, (accountMappings.size / Math.max(1, visibleRows - headerRow - 1)) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </>
          )}
          {step === 'review' && (
            <>
              <h4 className="font-medium text-blue-900 mb-2">Revisar Mapeo</h4>
              <p className="text-sm text-blue-800">Revisa el mapeo completo antes de continuar.</p>
            </>
          )}
        </div>
      </div>

      {/* Mapping Summary Card - Show statistics */}
      {step === 'map_accounts' && periodColumns.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200 shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-900">{visibleRows - headerRow - 1}</div>
              <div className="text-xs text-gray-600">Filas totales</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{accountMappings.size}</div>
              <div className="text-xs text-gray-600">Cuentas mapeadas</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{periodColumns.length}</div>
              <div className="text-xs text-gray-600">Períodos</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {accountMappings.size} × {periodColumns.length} = {accountMappings.size * periodColumns.length}
              </div>
              <div className="text-xs text-gray-600">Puntos de datos</div>
            </div>
          </div>
          {accountMappings.size > 0 && periodColumns.length > 0 && (
            <div className="mt-3 text-center">
              <p className="text-sm text-gray-700">
                Estás mapeando <strong>{accountMappings.size}</strong> cuenta{accountMappings.size !== 1 ? 's' : ''} a través de <strong>{periodColumns.length}</strong> período{periodColumns.length !== 1 ? 's' : ''}, 
                lo que generará <strong>{accountMappings.size * periodColumns.length}</strong> punto{(accountMappings.size * periodColumns.length) !== 1 ? 's' : ''} de datos financieros.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Year Context Selector */}
      {showYearSelector && periodColumns.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-medium text-yellow-900">📅 Selecciona el Año de los Períodos</h4>
              <p className="text-xs text-yellow-700 mt-1">
                No se detectó el año en los encabezados. Por favor, selecciona el año correcto para los períodos: {periodColumns.map(p => p.label).join(', ')}
              </p>
            </div>
            <button
              onClick={() => setShowYearSelector(false)}
              className="text-yellow-600 hover:text-yellow-800"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestYearRange(new Date().getFullYear()).map(year => (
              <button
                key={year}
                onClick={() => {
                  setContextYear(year);
                  setShowYearSelector(false);
                }}
                className={`px-4 py-2 rounded-lg border-2 transition-all font-medium ${
                  year === contextYear
                    ? 'bg-yellow-600 text-white border-yellow-600 shadow-lg'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-yellow-400 hover:bg-yellow-50'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
          {contextYear && (
            <div className="mt-3 text-xs text-yellow-800">
              Año seleccionado: <strong>{contextYear}</strong>
            </div>
          )}
        </div>
      )}

      {/* Period Summary - Show selected periods */}
      {periodColumns.length > 0 && (step === 'identify_structure' || step === 'map_accounts') && (
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900 flex items-center space-x-2">
              <span>📅 Períodos Seleccionados</span>
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                {periodColumns.length} columna{periodColumns.length !== 1 ? 's' : ''}
              </span>
            </h4>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {periodColumns.map((period) => {
              const parsed = parsedPeriods.get(period.index);
              // Get sample values from the first few data rows
              const sampleValues = [];
              for (let i = headerRow + 1; i < Math.min(headerRow + 4, rawData.length); i++) {
                const value = rawData[i]?.[period.index];
                if (value && String(value).trim() && String(value).trim() !== '-') {
                  sampleValues.push(String(value));
                }
              }
              
              return (
                <div key={period.index} className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-purple-900">Columna {String.fromCharCode(65 + period.index)}</span>
                    <span className="text-xs bg-purple-200 text-purple-800 px-2 py-0.5 rounded">
                      {period.type === 'month' ? 'Mensual' : 
                       period.type === 'quarter' ? 'Trimestral' : 
                       period.type === 'year' ? 'Anual' : 'Personalizado'}
                    </span>
                  </div>
                  <div className="font-medium text-purple-900">{period.label}</div>
                  {parsed ? (
                    <div className="text-sm text-purple-800 mt-1">
                      📅 {parsed.displayLabel}
                      {parsed.confidence < 0.8 && (
                        <span className="text-xs text-yellow-600 ml-1">(verificar año)</span>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-yellow-600 mt-1">
                      ⚠️ Parseando fecha...
                    </div>
                  )}
                  {sampleValues.length > 0 && (
                    <div className="mt-2 text-xs text-purple-700">
                      <div className="font-medium">Valores ejemplo:</div>
                      {sampleValues.slice(0, 2).map((val, idx) => (
                        <div key={idx} className="truncate">• {val}</div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {step === 'map_accounts' && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">
                <strong>Nota:</strong> Los valores de estas {periodColumns.length} columnas serán extraídos para cada cuenta mapeada.
                {periodColumns.length > 1 && ' Esto creará una serie temporal con múltiples períodos.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Setup Options */}
      {step === 'setup' && (
        <>
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Tipo de Estado Financiero</h4>
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => setStatementType('balance_sheet')}
                className={`p-4 rounded-lg border-2 text-center transition-all ${
                  statementType === 'balance_sheet' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <ScaleIcon className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                <div className="font-medium">Balance General</div>
                <div className="text-xs text-gray-500">Activos, Pasivos, Patrimonio</div>
              </button>
              
              <button
                onClick={() => setStatementType('profit_loss')}
                className={`p-4 rounded-lg border-2 text-center transition-all ${
                  statementType === 'profit_loss' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <ChartBarIcon className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                <div className="font-medium">Estado de Resultados</div>
                <div className="text-xs text-gray-500">Ingresos, Gastos, Utilidad</div>
              </button>
              
              <button
                onClick={() => setStatementType('cash_flow')}
                className={`p-4 rounded-lg border-2 text-center transition-all ${
                  statementType === 'cash_flow' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <BanknotesIcon className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                <div className="font-medium">Flujo de Efectivo</div>
                <div className="text-xs text-gray-500">Operación, Inversión, Financiamiento</div>
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Moneda</h4>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              {CURRENCIES.map(curr => (
                <button
                  key={curr.code}
                  onClick={() => setCurrency(curr.code)}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    currency === curr.code
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-lg font-bold">{curr.symbol}</div>
                  <div className="text-xs text-gray-600">{curr.code}</div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Excel Data Table */}
      {(step === 'identify_structure' || step === 'map_accounts') && (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase">
                    #
                  </th>
                  {Array.from({ length: maxCols }).map((_, colIndex) => (
                    <th key={colIndex} className="px-3 py-2 min-w-[120px]">
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-gray-500 uppercase">
                          {String.fromCharCode(65 + colIndex)}
                        </div>
                        {step === 'identify_structure' && headerRow >= 0 && (
                          <button
                            onClick={() => handleColumnClick(colIndex)}
                            className={`w-full px-2 py-1 rounded text-xs font-medium transition-colors border ${
                              colIndex === accountCodeColumn ? 'bg-blue-100 border-blue-300' :
                              colIndex === accountNameColumn ? 'bg-green-100 border-green-300' :
                              periodColumns.some(p => p.index === colIndex) ? 'bg-purple-100 border-purple-300' :
                              'bg-gray-50 border-gray-200'
                            }`}
                          >
                            {colIndex === accountCodeColumn ? '🆔 Código' :
                             colIndex === accountNameColumn ? '📄 Nombre' :
                             periodColumns.some(p => p.index === colIndex) ? 
                               `📅 ${periodColumns.find(p => p.index === colIndex)?.label || 'Período'}` :
                             'Clic para seleccionar'}
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              
              <tbody>
                {rawData.slice(0, visibleRows).map((row, rowIndex) => (
                  <tr 
                    key={rowIndex}
                    onClick={() => {
                      if (step === 'identify_structure') {
                        setHeaderRow(rowIndex);
                      } else if (isRowClickable(rowIndex)) {
                        handleAccountRowClick(rowIndex);
                      }
                    }}
                    title={getRowTitle(rowIndex)}
                    className={`
                      ${step === 'identify_structure' ? 'cursor-pointer hover:bg-yellow-50' : ''}
                      ${isRowClickable(rowIndex) ? 'cursor-pointer group' : ''}
                      ${getRowStyle(rowIndex)}
                      transition-all duration-150
                    `}
                  >
                    <td className="px-3 py-2 text-sm font-mono text-gray-500">
                      <div className="flex items-center space-x-2">
                        <span>{rowIndex + 1}</span>
                        
                        {/* Show buttons on header row if it's a section, or any row after header */}
                        {step === 'map_accounts' && (rowIndex >= headerRow) && (
                          <>
                            {/* Show T button for all data rows (including totals that might be sections) */}
                            {rowIndex > headerRow && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleTotalStatus(rowIndex);
                                }}
                                className={`w-6 h-6 rounded text-xs font-bold transition-all ${
                                  isRowTotal(rowIndex)
                                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                                    : 'bg-gray-200 text-gray-400 hover:bg-gray-300 hover:text-gray-600'
                                }`}
                                title={isRowTotal(rowIndex) ? 'Marcar como cuenta normal' : 'Marcar como total'}
                              >
                                T
                              </button>
                            )}
                            
                            {/* Show H button for likely section headers or any data row */}
                            {(isLikelySection(rowIndex) || rowIndex > headerRow) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSectionHeaderStatus(rowIndex);
                                }}
                                className={`w-6 h-6 rounded text-xs font-bold transition-all ${
                                  isRowSectionHeader(rowIndex)
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : 'bg-gray-200 text-gray-400 hover:bg-gray-300 hover:text-gray-600'
                                }`}
                                title={isRowSectionHeader(rowIndex) 
                                  ? `Encabezado de sección (${findSectionChildren(rowIndex).length} cuentas)` 
                                  : 'Marcar como encabezado de sección'}
                              >
                                H
                              </button>
                            )}
                          </>
                        )}
                        
                        {accountMappings.has(rowIndex) && (() => {
                          const mapping = accountMappings.get(rowIndex);
                          const category = availableCategories.find(c => c.value === mapping?.category);
                          return (
                            <div className="flex items-center space-x-1">
                              <CheckIcon className={`w-4 h-4 ${mapping?.isInflow ? 'text-green-600' : 'text-red-600'}`} />
                              {category && (
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  mapping?.isInflow 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {category.label.length > 15 ? category.label.substring(0, 15) + '...' : category.label}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                        {isRowTotal(rowIndex) && (
                          <div className="flex items-center space-x-1">
                            <CalculatorIcon className="w-4 h-4 text-orange-600" />
                          </div>
                        )}
                        {isRowSectionHeader(rowIndex) && (
                          <div className="flex items-center space-x-1">
                            <FolderIcon className="w-4 h-4 text-blue-600" />
                            {(() => {
                              const childCount = findSectionChildren(rowIndex).length;
                              if (childCount > 0) {
                                return (
                                  <span className="text-xs text-blue-600 font-medium">
                                    ({childCount})
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        )}
                        {isRowClickable(rowIndex) && !accountMappings.has(rowIndex) && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </td>
                    
                    {Array.from({ length: maxCols }).map((_, colIndex) => {
                      const cellValue = row?.[colIndex];
                      return (
                        <td 
                          key={colIndex}
                          className={`px-3 py-2 text-sm border-l ${
                            colIndex === accountCodeColumn ? 'font-mono text-blue-900' : 
                            colIndex === accountNameColumn ? 'font-medium' :
                            periodColumns.some(p => p.index === colIndex) ? 'bg-purple-50 font-medium text-purple-900' : ''
                          }`}
                        >
                          <div className="truncate max-w-[150px]">
                            {cellValue !== null && cellValue !== undefined ? String(cellValue) : '-'}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Category Selection Panel */}
      {showCategoryPanel && selectedRow !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Seleccionar Categoría Financiera</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Fila {selectedRow + 1}: {(() => {
                      // Get account name from the defined column or first non-empty cell
                      const accountName = accountNameColumn >= 0 ? String(rawData[selectedRow][accountNameColumn] || '') : '';
                      const accountCode = accountCodeColumn >= 0 ? String(rawData[selectedRow][accountCodeColumn] || '') : '';
                      
                      if (accountName) return accountName;
                      if (accountCode) return accountCode;
                      
                      // Find first non-empty, non-numeric cell
                      for (let i = 0; i < rawData[selectedRow].length; i++) {
                        const cellValue = String(rawData[selectedRow][i] || '').trim();
                        if (cellValue && cellValue !== '-' && !cellValue.match(/^\$?\d+[\d,.\s]*$/)) {
                          return cellValue;
                        }
                      }
                      return 'Cuenta sin nombre';
                    })()}
                    {accountCodeColumn >= 0 && rawData[selectedRow][accountCodeColumn] && ` (${rawData[selectedRow][accountCodeColumn]})`}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowCategoryPanel(false);
                    setSelectedRow(null);
                    setCategorySearchTerm('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            {/* Search input */}
            <div className="px-6 py-3 border-b">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={categorySearchTerm}
                  onChange={(e) => setCategorySearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Buscar categorías..."
                  autoFocus
                />
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[50vh]">
              {/* Category sections */}
              <div className="space-y-4">
                {(() => {
                  // Filter categories based on search term
                  const searchLower = categorySearchTerm.toLowerCase().trim();
                  const filterBySearch = (cat: ExtendedFinancialCategory) => {
                    if (!searchLower) return true;
                    return cat.label.toLowerCase().includes(searchLower) || 
                           cat.value.toLowerCase().includes(searchLower) ||
                           (cat.description?.toLowerCase().includes(searchLower) || false);
                  };

                  const calculatedTotals = availableCategories.filter(cat => 
                    ['total_revenue', 'gross_profit', 'gross_margin', 'operating_income', 'ebitda', 'ebit', 'net_income', 'total_expenses'].includes(cat.value) &&
                    filterBySearch(cat)
                  );
                  
                  const customCategories = availableCategories.filter(cat => 
                    cat.isCustom && filterBySearch(cat)
                  );
                  
                  const standardCategories = availableCategories.filter(cat => 
                    !cat.isCustom && 
                    !['total_revenue', 'gross_profit', 'gross_margin', 'operating_income', 'ebitda', 'ebit', 'net_income', 'total_expenses'].includes(cat.value) &&
                    filterBySearch(cat)
                  );

                  const hasResults = calculatedTotals.length > 0 || customCategories.length > 0 || standardCategories.length > 0;

                  if (!hasResults && searchLower) {
                    return (
                      <div className="text-center py-8 text-gray-500">
                        <p className="text-sm">No se encontraron categorías que coincidan con "{categorySearchTerm}"</p>
                      </div>
                    );
                  }

                  return (
                    <>
                      {/* Show special notice if this is a total row */}
                      {isRowTotal(selectedRow) && !searchLower && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <p className="text-sm text-orange-800">
                            🧮 Esta fila fue detectada como un <strong>total</strong>. Puedes mapearla a una categoría de total calculado como Utilidad Bruta, EBITDA, etc.
                          </p>
                        </div>
                      )}
                      
                      {/* Calculated Total categories (for P&L) */}
                      {statementType === 'profit_loss' && calculatedTotals.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
                            <span>🧮 Totales Calculados</span>
                          </h4>
                          <div className="grid gap-2">
                            {calculatedTotals.map(category => (
                              <CategoryButton key={category.value} category={category} onClick={handleCategorySelect} />
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Custom categories */}
                      {customCategories.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
                            <span>📝 Categorías Personalizadas</span>
                          </h4>
                          <div className="grid gap-2">
                            {customCategories.map(category => (
                              <CategoryButton key={category.value} category={category} onClick={handleCategorySelect} />
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Standard categories (excluding calculated totals) */}
                      {standardCategories.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
                            <span>🏛️ Categorías Estándar</span>
                          </h4>
                          <div className="grid gap-2">
                            {standardCategories.map(category => (
                              <CategoryButton key={category.value} category={category} onClick={handleCategorySelect} />
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Summary */}
      {step === 'review' && (
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Resumen del Mapeo</h4>
          
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-500 mb-2">Información General</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <CheckIcon className="w-5 h-5 text-green-600" />
                  <span>Tipo: {statementType === 'balance_sheet' ? 'Balance General' : 
                               statementType === 'profit_loss' ? 'Estado de Resultados' : 
                               'Flujo de Efectivo'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
                  <span>Moneda: {currency}</span>
                </div>
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-500 mb-2">Estructura Identificada</div>
              <div className="space-y-1 text-sm">
                <div>• Fila de encabezados: {headerRow + 1}</div>
                <div>• Columna de códigos: {accountCodeColumn >= 0 ? String.fromCharCode(65 + accountCodeColumn) : 'No definida'}</div>
                <div>• Columna de nombres: {accountNameColumn >= 0 ? String.fromCharCode(65 + accountNameColumn) : 'No definida'}</div>
                <div>• Períodos: {periodColumns.map(p => {
                  const parsed = parsedPeriods.get(p.index);
                  return parsed ? parsed.displayLabel : p.label;
                }).join(', ')}</div>
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-500 mb-2">Cuentas Mapeadas ({accountMappings.size})</div>
              <div className="max-h-48 overflow-y-auto border rounded-lg p-3">
                {(() => {
                  // Group accounts by their group
                  const accountsByGroup = new Map<string, Array<AccountMapping['accounts'][0]>>();
                  Array.from(accountMappings.values()).forEach(account => {
                    const group = account.group || 'Other';
                    if (!accountsByGroup.has(group)) {
                      accountsByGroup.set(group, []);
                    }
                    accountsByGroup.get(group)!.push(account);
                  });

                  return Array.from(accountsByGroup.entries()).map(([group, accounts]) => (
                    <div key={group} className="mb-3">
                      <div className="font-medium text-xs text-gray-700 mb-1 uppercase">{group}</div>
                      {accounts.map((account, index) => {
                        const category = availableCategories.find(c => c.value === account.category);
                        return (
                          <div key={`${group}-${index}`} className="flex items-center justify-between py-1 text-sm pl-3">
                            <span>{account.name} {account.code && `(${account.code})`}</span>
                            <span className={`font-medium ${account.isInflow ? 'text-green-600' : 'text-red-600'}`}>
                              {category?.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ));
                })()}
              </div>
            </div>
            
            {/* Time Series Preview */}
            {periodColumns.length > 0 && accountMappings.size > 0 && (
              <div>
                <div className="text-sm text-gray-500 mb-2">Vista Previa de Serie Temporal</div>
                <div className="bg-gray-50 rounded-lg p-3 text-xs">
                  <p className="text-gray-700 mb-2">
                    Se extraerán <strong>{accountMappings.size * periodColumns.length}</strong> puntos de datos:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {Array.from(accountMappings.values()).slice(0, 3).map((account, idx) => (
                      <div key={idx} className="bg-white p-2 rounded border border-gray-200">
                        <div className="font-medium text-gray-900 truncate">{account.name}</div>
                        <div className="text-gray-600 mt-1">
                          {periodColumns.slice(0, 3).map(p => {
                            const parsed = parsedPeriods.get(p.index);
                            const value = rawData[account.rowIndex]?.[p.index];
                            return (
                              <div key={p.index} className="flex justify-between">
                                <span>{parsed?.displayLabel || p.label}:</span>
                                <span className="font-mono">{value || '-'}</span>
                              </div>
                            );
                          })}
                          {periodColumns.length > 3 && <div className="text-center">...</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                  {accountMappings.size > 3 && (
                    <p className="text-center text-gray-500 mt-2">... y {accountMappings.size - 3} cuentas más</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Category Manager Modal */}
      {showCategoryManager && (
        <CategoryManager
          categories={availableCategories}
          statementType={statementType}
          companyId={companyId}
          onCategoriesChange={(newCategories) => {
            setManagedCategories(newCategories);
          }}
          onClose={() => setShowCategoryManager(false)}
        />
      )}

      {/* Section Header Category Selection Dialog */}
      {showSectionDialog && selectedSectionRow !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Seleccionar Categoría para Sección</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Sección: <strong>{accountNameColumn >= 0 ? String(rawData[selectedSectionRow][accountNameColumn] || '') : `Fila ${selectedSectionRow + 1}`}</strong>
                  </p>
                  <p className="text-xs text-blue-600 mt-2">
                    <FolderIcon className="w-4 h-4 inline mr-1" />
                    Esta categoría se aplicará a {findSectionChildren(selectedSectionRow).length} cuentas automáticamente
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowSectionDialog(false);
                    setSelectedSectionRow(null);
                    setSmartSuggestions(new Map());
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="space-y-4">
                {/* Smart Mapping Toggle */}
                <div className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <SparklesIcon className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium text-purple-900">Mapeo Inteligente con IA</span>
                  </div>
                  <button
                    onClick={() => setSmartMappingMode(!smartMappingMode)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      smartMappingMode ? 'bg-purple-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        smartMappingMode ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Cuentas que se mapearán:</strong>
                  </p>
                  {smartMappingMode && smartSuggestions.size > 0 ? (
                    <div className="mt-2 space-y-2">
                      {findSectionChildren(selectedSectionRow).slice(0, 5).map(childRow => {
                        const accountName = accountNameColumn >= 0 
                          ? String(rawData[childRow][accountNameColumn] || '') 
                          : `Fila ${childRow + 1}`;
                        const suggestion = smartSuggestions.get(childRow);
                        const suggestedCategory = suggestion ? availableCategories.find(c => c.value === suggestion.category) : null;
                        
                        return (
                          <div key={childRow} className="flex items-center justify-between text-xs">
                            <span className="text-blue-700 flex-1">• {accountName}</span>
                            {suggestion && suggestedCategory && (
                              <div className="flex items-center space-x-1">
                                <span className="text-purple-600 font-medium">
                                  → {suggestedCategory.label}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded text-xs ${
                                  suggestion.confidence === 'high' ? 'bg-green-100 text-green-700' :
                                  suggestion.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {suggestion.confidence === 'high' ? 'Alta' :
                                   suggestion.confidence === 'medium' ? 'Media' : 'Baja'}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {findSectionChildren(selectedSectionRow).length > 5 && (
                        <p className="text-blue-600 italic text-xs">
                          ... y {findSectionChildren(selectedSectionRow).length - 5} más
                        </p>
                      )}
                    </div>
                  ) : (
                    <ul className="mt-2 text-xs space-y-1">
                      {findSectionChildren(selectedSectionRow).slice(0, 5).map(childRow => {
                        const accountName = accountNameColumn >= 0 
                          ? String(rawData[childRow][accountNameColumn] || '') 
                          : `Fila ${childRow + 1}`;
                        return (
                          <li key={childRow} className="text-blue-700">
                            • {accountName}
                          </li>
                        );
                      })}
                      {findSectionChildren(selectedSectionRow).length > 5 && (
                        <li className="text-blue-600 italic">
                          ... y {findSectionChildren(selectedSectionRow).length - 5} más
                        </li>
                      )}
                    </ul>
                  )}
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    {smartMappingMode ? 'Selecciona categoría base para la sección:' : 'Selecciona una categoría:'}
                  </h4>
                  {smartMappingMode && smartSuggestions.size > 0 && (
                    <p className="text-xs text-purple-600 mb-3">
                      <SparklesIcon className="w-4 h-4 inline mr-1" />
                      Las sugerencias de IA se aplicarán automáticamente a cada cuenta
                    </p>
                  )}
                  <div className="grid gap-2">
                    {availableCategories
                      .filter(cat => !['total_revenue', 'gross_profit', 'gross_margin', 'operating_income', 'ebitda', 'ebit', 'net_income', 'total_expenses'].includes(cat.value))
                      .map(category => (
                        <button
                          key={category.value}
                          onClick={() => {
                            // When using smart mapping, regenerate suggestions with the selected category's inflow type
                            if (smartMappingMode && selectedSectionRow !== null) {
                              const childRows = findSectionChildren(selectedSectionRow);
                              const accounts = childRows.map(childRow => ({
                                rowIndex: childRow,
                                name: accountNameColumn >= 0 ? String(rawData[childRow][accountNameColumn] || '') : ''
                              }));
                              const sectionName = accountNameColumn >= 0 
                                ? String(rawData[selectedSectionRow][accountNameColumn] || '') 
                                : 'Section';
                              
                              // Get suggestions with enforced inflow type
                              const newSuggestions = suggestCategoriesForSection(
                                accounts,
                                sectionName,
                                availableCategories,
                                locale === 'es' ? 'es' : 'en',
                                category.isInflow // Enforce the selected category's inflow type
                              );
                              setSmartSuggestions(newSuggestions);
                            }
                            
                            handleSectionCategorySelect(category.value, smartMappingMode);
                          }}
                          className={`p-3 rounded-lg border-2 transition-all hover:shadow-md text-left ${
                            category.isInflow 
                              ? 'border-green-200 hover:border-green-400 hover:bg-green-50' 
                              : 'border-red-200 hover:border-red-400 hover:bg-red-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-900">{category.label}</div>
                              <div className="text-xs text-gray-500">
                                {category.group} • {category.isInflow ? 'Entrada' : 'Salida'}
                              </div>
                            </div>
                            <div className={`text-2xl ${category.isInflow ? 'text-green-600' : 'text-red-600'}`}>
                              {category.isInflow ? '+' : '-'}
                            </div>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => {
            switch (step) {
              case 'identify_structure': setStep('setup'); break;
              case 'map_accounts': setStep('identify_structure'); break;
              case 'review': setStep('map_accounts'); break;
            }
          }}
          disabled={step === 'setup'}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:text-gray-400"
        >
          ← Anterior
        </button>
        
        <button
          onClick={() => {
            switch (step) {
              case 'setup': setStep('identify_structure'); break;
              case 'identify_structure': setStep('map_accounts'); break;
              case 'map_accounts': setStep('review'); break;
              case 'review': completeMapping(); break;
            }
          }}
          disabled={!canProceed()}
          className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {step === 'review' ? 'Confirmar Mapeo' : 'Siguiente →'}
        </button>
      </div>
    </div>
  );
}