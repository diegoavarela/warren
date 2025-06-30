/**
 * Core Financial Data Types for Warren Parser Engine
 * 
 * This file defines the comprehensive type system for financial data processing.
 * These interfaces are designed to support the world-class parser architecture.
 */

// ===============================
// CORE FINANCIAL ENTITIES
// ===============================

/**
 * Supported currency codes (ISO 4217)
 */
export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD' | 'CHF' | 'CNY' | 'MXN' | 'BRL' | string;

/**
 * Financial amount with currency information
 */
export interface FinancialAmount {
  value: number;
  currency: CurrencyCode;
  precision?: number; // Number of decimal places
  originalValue?: string; // Original string representation
}

/**
 * Date range for financial periods
 */
export interface DateRange {
  startDate: Date;
  endDate: Date;
  timezone?: string;
}

/**
 * Financial period types
 */
export type PeriodType = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

/**
 * Financial period definition
 */
export interface FinancialPeriod {
  type: PeriodType;
  startDate: Date;
  endDate: Date;
  label: string; // Human-readable period label (e.g., "Q1 2024", "Jan 2024")
  fiscalYear?: number;
  fiscalQuarter?: number;
}

/**
 * Time period for parser
 */
export interface TimePeriod {
  col: number;
  period: string;
  date?: Date | undefined;
  type: 'month' | 'quarter' | 'year';
}

// ===============================
// PARSER CORE TYPES
// ===============================

/**
 * Supported file formats for the parser
 */
export enum FileFormat {
  EXCEL = 'excel',
  CSV = 'csv',
  PDF = 'pdf',
  QIF = 'qif',
  OFX = 'ofx',
  MT940 = 'mt940',
  CAMT053 = 'camt053',
  JSON = 'json',
  XML = 'xml'
}

/**
 * Parser confidence levels
 */
export type ConfidenceLevel = 'very_high' | 'high' | 'medium' | 'low' | 'very_low';

/**
 * Data extraction confidence
 */
export interface ExtractionConfidence {
  overall: ConfidenceLevel;
  fields: {
    [fieldName: string]: ConfidenceLevel;
  };
  score: number; // 0-100
  reasoning?: string[];
}

/**
 * Cell position in a spreadsheet or table
 */
export interface CellPosition {
  row: number;
  column: number;
  sheet?: string;
  range?: string; // Excel-style range (e.g., "A1:C10")
}

/**
 * Data source information
 */
export interface DataSource {
  id: string;
  name: string;
  type: FileFormat;
  originalFileName?: string;
  size?: number;
  uploadedAt: Date;
  metadata?: Record<string, any>;
}

// ===============================
// FINANCIAL CATEGORIES
// ===============================

/**
 * Primary financial categories
 */
export type FinancialCategory = 
  | 'revenue' 
  | 'expense' 
  | 'asset' 
  | 'liability' 
  | 'equity' 
  | 'cash_inflow' 
  | 'cash_outflow'
  | 'income'
  | 'cost'
  | 'other';

/**
 * Detailed subcategories for better classification
 */
export interface FinancialSubcategory {
  code: string;
  name: string;
  category: FinancialCategory;
  description?: string;
  isCalculated?: boolean; // True if this is a calculated field
}

/**
 * Financial line item with full classification
 */
export interface FinancialLineItem {
  id: string;
  description: string;
  amount: FinancialAmount;
  category: FinancialCategory;
  subcategory?: FinancialSubcategory;
  date: Date;
  position?: CellPosition;
  confidence: ExtractionConfidence;
  tags?: string[];
  metadata?: Record<string, any>;
  isCalculated?: boolean;
  formula?: string; // If calculated, the formula used
}

// ===============================
// STATEMENT TYPES
// ===============================

/**
 * Financial statement types
 */
export type StatementType = 'profit_loss' | 'cashflow' | 'balance_sheet' | 'trial_balance' | 'general_ledger';

/**
 * Base financial statement interface
 */
export interface FinancialStatement {
  id: string;
  type: StatementType;
  companyId: string;
  periods: FinancialPeriod[];
  currency: CurrencyCode;
  lineItems: FinancialLineItem[];
  dataSource: DataSource;
  confidence: ExtractionConfidence;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

/**
 * Profit & Loss statement specific structure
 */
export interface ProfitLossStatement extends FinancialStatement {
  type: 'profit_loss';
  structure: {
    revenue: FinancialLineItem[];
    costOfGoodsSold: FinancialLineItem[];
    operatingExpenses: FinancialLineItem[];
    otherIncome: FinancialLineItem[];
    otherExpenses: FinancialLineItem[];
    taxes: FinancialLineItem[];
  };
  calculatedFields: {
    grossProfit: FinancialAmount[];
    operatingIncome: FinancialAmount[];
    ebitda: FinancialAmount[];
    netIncome: FinancialAmount[];
  };
}

/**
 * Cashflow statement specific structure
 */
export interface CashflowStatement extends FinancialStatement {
  type: 'cashflow';
  structure: {
    operating: FinancialLineItem[];
    investing: FinancialLineItem[];
    financing: FinancialLineItem[];
  };
  calculatedFields: {
    operatingCashflow: FinancialAmount[];
    investingCashflow: FinancialAmount[];
    financingCashflow: FinancialAmount[];
    netCashflow: FinancialAmount[];
    beginningCash: FinancialAmount[];
    endingCash: FinancialAmount[];
  };
}

/**
 * Balance sheet specific structure
 */
export interface BalanceSheetStatement extends FinancialStatement {
  type: 'balance_sheet';
  structure: {
    currentAssets: FinancialLineItem[];
    nonCurrentAssets: FinancialLineItem[];
    currentLiabilities: FinancialLineItem[];
    nonCurrentLiabilities: FinancialLineItem[];
    equity: FinancialLineItem[];
  };
  calculatedFields: {
    totalAssets: FinancialAmount[];
    totalLiabilities: FinancialAmount[];
    totalEquity: FinancialAmount[];
  };
}

// ===============================
// PARSER CONFIGURATION
// ===============================

/**
 * Column mapping for structured data
 */
export interface ColumnMapping {
  sourceColumn: number | string;
  targetField: string;
  dataType: 'string' | 'number' | 'date' | 'currency' | 'percentage';
  transform?: string; // Transformation function name
  required?: boolean;
  defaultValue?: any;
}

/**
 * Parsing rules for intelligent extraction
 */
export interface ParsingRule {
  id: string;
  name: string;
  description: string;
  pattern: string | RegExp;
  category: FinancialCategory;
  subcategory?: string;
  priority: number; // Higher number = higher priority
  conditions?: Record<string, any>;
  transforms?: string[];
}

/**
 * Parser configuration for different file types
 */
export interface ParserConfig {
  id: string;
  name: string;
  fileFormat: FileFormat;
  companyId?: string;
  
  // Column/field mappings
  columnMappings: ColumnMapping[];
  
  // Data location hints
  dataStartRow?: number;
  dataEndRow?: number;
  headerRow?: number;
  skipRows?: number[];
  worksheetName?: string; // For Excel files
  
  // Parsing rules
  rules: ParsingRule[];
  
  // Format-specific settings
  csvSettings?: {
    delimiter: string;
    quoteChar: string;
    encoding: string;
  };
  
  excelSettings?: {
    worksheetIndex?: number;
    worksheetName?: string;
    dateFormat?: string;
  };
  
  pdfSettings?: {
    extractionMethod: 'text' | 'table' | 'ocr';
    tableDetection?: boolean;
    ocrLanguage?: string;
  };
  
  // Validation settings
  validation?: {
    allowNegativeAmounts?: boolean;
    requireBalancedBooks?: boolean;
    minimumConfidence?: number;
    strictDateParsing?: boolean;
  };
  
  // AI/ML settings
  aiSettings?: {
    useAI: boolean;
    model?: 'claude' | 'gpt4' | 'custom';
    confidence?: number;
    autoLearn?: boolean;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

// ===============================
// PARSER RESULTS
// ===============================

/**
 * Validation error details
 */
export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  position?: CellPosition;
  severity: 'error' | 'warning' | 'info';
  suggestion?: string;
}

/**
 * Parsing statistics
 */
export interface ParsingStats {
  totalRows: number;
  processedRows: number;
  skippedRows: number;
  errorRows: number;
  extractedLineItems: number;
  processingTime: number; // milliseconds
  memoryUsage?: number; // bytes
}

/**
 * Parser result with comprehensive information
 */
export interface ParserResult {
  success: boolean;
  statement?: FinancialStatement;
  confidence: ExtractionConfidence;
  errors: ValidationError[];
  warnings: ValidationError[];
  stats: ParsingStats;
  
  // Raw extracted data for debugging
  rawData?: {
    headers: string[];
    rows: any[][];
    metadata: Record<string, any>;
  };
  
  // Processing steps for audit trail
  processingSteps: {
    step: string;
    status: 'success' | 'warning' | 'error';
    message: string;
    timestamp: Date;
    duration?: number;
  }[];
  
  // Suggestions for improving parsing
  suggestions?: {
    configChanges: string[];
    ruleSuggestions: string[];
    dataQualityIssues: string[];
  };
}

// ===============================
// EXCHANGE RATES & CURRENCIES
// ===============================

/**
 * Exchange rate information
 */
export interface ExchangeRate {
  from: CurrencyCode;
  to: CurrencyCode;
  rate: number;
  date: Date;
  source: string; // Provider name
  bidRate?: number;
  askRate?: number;
}

/**
 * Multi-currency conversion result
 */
export interface CurrencyConversion {
  originalAmount: FinancialAmount;
  convertedAmount: FinancialAmount;
  exchangeRate: ExchangeRate;
  conversionDate: Date;
}

// ===============================
// ANALYTICS & INSIGHTS
// ===============================

/**
 * Financial metrics calculation
 */
export interface FinancialMetric {
  name: string;
  value: number;
  currency: CurrencyCode;
  period: FinancialPeriod;
  trend?: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
    previousValue: number;
  };
  benchmark?: {
    industry: number;
    peers: number;
  };
}

/**
 * Anomaly detection result
 */
export interface FinancialAnomaly {
  id: string;
  type: 'spike' | 'drop' | 'pattern' | 'outlier';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  affectedLineItems: string[]; // Line item IDs
  detectedAt: Date;
  confidence: number;
  suggestedAction?: string;
}

// ===============================
// API RESPONSE TYPES
// ===============================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: ValidationError[];
  metadata?: {
    timestamp: Date;
    requestId: string;
    processingTime: number;
    version: string;
  };
}

/**
 * Paginated response for large datasets
 */
export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ===============================
// COMPANY & TENANT CONTEXT
// ===============================

/**
 * Company-specific financial configuration
 */
export interface CompanyFinancialConfig {
  companyId: string;
  baseCurrency: CurrencyCode;
  fiscalYearStart: number; // Month (1-12)
  timezone: string;
  numberFormat: {
    decimalSeparator: '.' | ',';
    thousandsSeparator: ',' | '.' | ' ' | '';
    currencySymbol: string;
    currencyPosition: 'before' | 'after';
  };
  defaultParserConfigs: string[]; // Parser config IDs
  customCategories: FinancialSubcategory[];
  automationRules: ParsingRule[];
}

/**
 * User permissions for financial data
 */
export interface FinancialPermissions {
  canViewData: boolean;
  canUploadData: boolean;
  canEditData: boolean;
  canDeleteData: boolean;
  canManageConfigs: boolean;
  canExportData: boolean;
  restrictedCategories?: FinancialCategory[];
  dataRetentionDays?: number;
}

// ===============================
// EXPORT TYPES
// ===============================

/**
 * Export configuration
 */
export interface ExportConfig {
  format: 'excel' | 'csv' | 'pdf' | 'json';
  includeMetadata: boolean;
  includeSummary: boolean;
  dateRange?: DateRange;
  categories?: FinancialCategory[];
  template?: string;
  customFields?: string[];
}

/**
 * Export result
 */
export interface ExportResult {
  success: boolean;
  downloadUrl?: string;
  fileSize?: number;
  expiresAt?: Date;
  error?: string;
}