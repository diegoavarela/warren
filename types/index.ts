// Core application types and interfaces

export interface UploadedFile {
  name: string;
  size: number;
  type: string;
  data: Buffer;
  uploadedAt: Date;
}

export interface ExcelSheet {
  name: string;
  rows: number;
  cols: number;
  hasData: boolean;
  preview?: any[][]; // First few rows for preview
}

export interface ExcelFileMetadata {
  fileName: string;
  fileSize: number;
  sheets: ExcelSheet[];
  detectedLocale?: string;
  uploadSession: string;
}

// Financial statement detection
export interface FinancialStatementDetection {
  primaryType: 'profit_loss' | 'cash_flow' | 'balance_sheet' | 'unknown';
  confidence: number; // 0-100
  detectedElements: string[];
  suggestedMapping: ColumnMapping[];
  locale: string;
  currency?: string;
}

// Column mapping and detection
export interface ColumnDetection {
  columnIndex: number;
  headerText: string;
  detectedType: string; // date, amount, description, account, etc.
  confidence: number; // 0-100
  mappedField?: string;
  sampleValues: any[];
  issues: string[]; // validation issues
}

export interface ColumnMapping {
  columnIndex: number;
  sourceHeader: string;
  targetField: string;
  dataType: 'date' | 'number' | 'currency' | 'text' | 'category';
  confidence: number;
  transformation?: string; // any data transformation needed
  validation?: ValidationRule[];
}

export interface ValidationRule {
  type: 'required' | 'format' | 'range' | 'pattern';
  params?: Record<string, any>;
  message: string;
}

// Sheet analysis results
export interface SheetAnalysis {
  sheetName: string;
  totalRows: number;
  totalCols: number;
  headerRow?: number;
  dataStartRow?: number;
  dataEndRow?: number;
  columnDetections: ColumnDetection[];
  financialDetection: FinancialStatementDetection;
  issues: AnalysisIssue[];
  suggestedTemplate?: string; // mapping template ID
}

export interface AnalysisIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  row?: number;
  column?: number;
  severity: 'low' | 'medium' | 'high';
}

// Parsing results
export interface ParsedRow {
  rowIndex: number;
  data: Record<string, any>;
  originalData: any[];
  issues: string[];
  confidence: number;
}

export interface ParseResults {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  warnings: string[];
  errors: string[];
  preview: any[];
  data: any[];
  mapping: {
    statementType: string;
    confidence: number;
    mappedColumns: number;
    totalColumns: number;
  };
  categoryTotals?: Record<string, Record<string, number>>;
}

// Matrix mapping interface for advanced mapper
export interface MatrixMapping {
  // Define which columns contain account/concept information
  conceptColumns: {
    columnIndex: number;
    columnType: 'account_code' | 'account_name' | 'category' | 'subcategory';
  }[];
  
  // Define which row contains the period headers
  periodHeaderRow: number;
  
  // Define which columns contain period data
  periodColumns: {
    columnIndex: number;
    periodLabel: string;
    periodType: 'month' | 'quarter' | 'year' | 'custom';
  }[];
  
  // Define the data range
  dataRange: {
    startRow: number;
    endRow: number;
    startCol: number;
    endCol: number;
  };
  
  // Additional metadata
  hasSubtotals: boolean;
  hasTotals: boolean;
  currency: string;
  
  // AI analysis data (optional)
  aiAnalysis?: DocumentStructure;
  accountClassifications?: AccountClassification[];
  detectedTotalRows?: any[];
}

// AI-powered document analysis interfaces
export interface DocumentStructure {
  statementType: 'profit_loss' | 'balance_sheet' | 'cash_flow' | 'unknown';
  confidence: number;
  headerRows: number[];
  dataStartRow: number;
  dataEndRow: number;
  totalRows: number[];
  subtotalRows: number[];
  accountColumns: {
    codeColumn?: number;
    nameColumn?: number;
    confidence: number;
  };
  periodColumns: {
    columnIndex: number;
    periodLabel: string;
    periodType: 'month' | 'quarter' | 'year' | 'custom';
    confidence: number;
  }[];
  currency: string;
  fiscalYear?: number;
  reasoning: string;
}

export interface AccountClassification {
  accountName: string;
  suggestedCategory: string;
  isInflow: boolean;
  confidence: number;
  reasoning: string;
  alternativeCategories?: {
    category: string;
    confidence: number;
  }[];
}

export interface ValidationIssue {
  type: 'error' | 'warning' | 'suggestion';
  message: string;
  rowIndex?: number;
  columnIndex?: number;
  suggestedFix?: string;
}

export interface MappingSuggestions {
  conceptColumns: {
    columnIndex: number;
    columnType: 'account_code' | 'account_name' | 'category' | 'subcategory';
    confidence: number;
    reasoning: string;
  }[];
  periodColumns: {
    columnIndex: number;
    periodLabel: string;
    periodType: 'month' | 'quarter' | 'year' | 'custom';
    confidence: number;
  }[];
  dataRange: {
    startRow: number;
    endRow: number;
    startCol: number;
    endCol: number;
  };
  validationIssues: ValidationIssue[];
  reasoning: string;
}

// Localization and formatting
export interface LocaleConfig {
  code: string; // e.g., 'es-MX'
  name: string;
  dateFormat: string;
  numberFormat: {
    decimal: string; // ',' for Spanish
    thousands: string; // '.' for Spanish
  };
  currency: {
    code: string;
    symbol: string;
    position: 'before' | 'after';
  };
  financialTerms: Record<string, string[]>;
}

// Tier and feature management
export interface TierFeatures {
  maxCompanies: number | 'unlimited';
  maxMonthlyUploads: number | 'unlimited';
  financialStatements: string[];
  dashboardWidgets: string[] | 'all';
  apiAccess: boolean;
  historicalPeriods: number | 'unlimited';
  userSeats: number | 'unlimited';
  customMappings?: boolean;
  webhookNotifications?: boolean;
  whiteLabel?: boolean;
  sso?: boolean;
  dedicatedSupport?: boolean;
}

export interface OrganizationTier {
  name: 'starter' | 'professional' | 'enterprise';
  features: TierFeatures;
  monthlyPrice: number;
  yearlyPrice: number;
}

// API types for external integration
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

export interface ParseJobRequest {
  fileUrl?: string;
  fileData?: string; // base64 encoded
  sheetName?: string;
  mappingTemplateId?: string;
  webhookUrl?: string;
  locale?: string;
  companyId: string;
}

export interface ParseJobResponse {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'requires_review';
  progress: number; // 0-100
  estimatedDuration?: string;
  webhookConfigured: boolean;
  result?: {
    totalRows: number;
    successRate: number;
    dataId: string;
    errors: string[];
  };
}

// State management types
export interface ParserState {
  // Current step in the process
  currentStep: 'upload' | 'select' | 'analyze' | 'map' | 'validate' | 'persist';
  
  // Upload state
  uploadedFile?: ExcelFileMetadata;
  selectedSheet?: string;
  
  // Analysis state
  sheetAnalysis?: SheetAnalysis;
  columnMappings: ColumnMapping[];
  
  // Validation state
  parseResults?: ParseResults;
  isValidated: boolean;
  
  // UI state
  isLoading: boolean;
  error?: string;
  progress: number; // 0-100
  
  // Settings
  locale: string;
  companyId?: string;
  saveAsTemplate: boolean;
  templateName?: string;
}

// Component props types
export interface ExcelViewerProps {
  data: any[][];
  headers?: string[];
  columnDetections: ColumnDetection[];
  onMappingChange: (columnIndex: number, mapping: Partial<ColumnMapping>) => void;
  locale: string;
  maxRows?: number;
  maxCols?: number;
  highlightIssues?: boolean;
}

export interface MappingPanelProps {
  columnDetections: ColumnDetection[];
  mappings: ColumnMapping[];
  onMappingChange: (columnIndex: number, mapping: Partial<ColumnMapping>) => void;
  locale: string;
  statementType: string;
}

export interface ProgressStepsProps {
  currentStep: ParserState['currentStep'];
  completedSteps: string[];
  steps: Array<{
    id: string;
    name: string;
    description: string;
  }>;
}

// Financial intelligence types
export interface FinancialPattern {
  es: string[];
  en: string[];
}

export interface FinancialPatterns {
  profit_loss: FinancialPattern;
  cash_flow: FinancialPattern;
  balance_sheet: FinancialPattern;
}

export interface FinancialCalculation {
  name: string;
  formula: string;
  dependencies: string[];
  category: string;
}

export interface CurrencyDetection {
  currency: string;
  confidence: number;
  detected_from: 'symbol' | 'code' | 'format' | 'context';
  sample_values: string[];
}

// Utility types
export type Locale = 'en-US' | 'es-MX' | 'es-AR' | 'es-CO' | 'es-CL' | 'es-PE';
export type Currency = 'USD' | 'MXN' | 'ARS' | 'COP' | 'CLP' | 'PEN' | 'EUR' | 'GBP';
export type StatementType = 'profit_loss' | 'cash_flow' | 'balance_sheet';
export type ConfidenceLevel = 'high' | 'medium' | 'low';

// Error types
export class ParsingError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ParsingError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value?: any
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}