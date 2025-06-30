/**
 * Parser Engine Core Types
 * 
 * This file defines the interfaces for the world-class parser engine architecture.
 * The parser will be modular, extensible, and capable of handling any financial format.
 */

import { 
  FileFormat,
  ExtractionConfidence,
  FinancialCategory,
  CurrencyCode,
  FinancialAmount,
  FinancialLineItem,
  TimePeriod,
  FinancialStatement
} from './financial';

// Re-export some types for convenience
export { FileFormat, FinancialLineItem, TimePeriod, FinancialStatement } from './financial';

// ===============================
// PARSER ENGINE INTERFACES
// ===============================

/**
 * Core parser engine interface - all parsers must implement this
 */
export interface IParserEngine {
  readonly format: FileFormat;
  readonly capabilities: ParserCapabilities;
  readonly version: string;
  
  /**
   * Parse a file buffer with the given configuration
   */
  parse(buffer: Buffer, config: ParserConfig): Promise<ParserResult>;
  
  /**
   * Validate a buffer before parsing
   */
  validate(buffer: Buffer): Promise<ValidationError[]>;
  
  /**
   * Validate a configuration for this parser
   */
  validateConfig(config: ParserConfig): Promise<ValidationError[]>;
  
  /**
   * Get supported file formats
   */
  getSupportedFormats(): FileFormat[];
  
  /**
   * Get parser capabilities and metadata
   */
  getCapabilities(): ParserCapabilities;
  
  /**
   * Auto-detect file format from buffer
   */
  detectFormat(buffer: Buffer, filename?: string): Promise<FileFormat | null>;
  
  /**
   * Generate a suggested configuration based on file analysis
   */
  suggestConfig(buffer: Buffer, hints?: ConfigHints): Promise<ParserConfig>;
  
  /**
   * Pre-process the data (cleaning, normalization, etc.)
   */
  preProcess(buffer: Buffer, context: ParserContext): Promise<Buffer>;
  
  /**
   * Post-process the parsed data (enrichment, validation, etc.)
   */
  postProcess(result: ParserResult, context: ParserContext): Promise<ParserResult>;
  
  /**
   * Register a plugin
   */
  registerPlugin(plugin: ParserPlugin): void;
  
  /**
   * Unregister a plugin
   */
  unregisterPlugin(pluginName: string): void;
  
  /**
   * Get registered plugins
   */
  getPlugins(): Map<string, ParserPlugin>;
  
  /**
   * Calculate confidence score for parsing result
   */
  calculateConfidence(result: ParserResult): Promise<ConfidenceScore>;
  
  /**
   * Get engine metadata
   */
  getMetadata(): ParserEngineMetadata;
}

/**
 * Parser Engine Metadata
 */
export interface ParserEngineMetadata {
  name: string;
  description: string;
  author: string;
  version: string;
  supportedFormats: FileFormat[];
  capabilities: ParserCapabilities;
  tier: 'basic' | 'professional' | 'enterprise';
  performanceRating: 'fast' | 'medium' | 'slow';
  accuracyRating: number; // 0-100
}

/**
 * Parser configuration
 */
export interface ParserConfig {
  fileName?: string;
  fileFormat: FileFormat;
  options?: ParserOptions;
  plugins?: string[];
  locale?: string;
  timezone?: string;
}

/**
 * Parser options
 */
export interface ParserOptions {
  [key: string]: any;
  sheet?: string; // For Excel
  delimiter?: string; // For CSV
  encoding?: string;
  dateFormat?: string;
  numberFormat?: string;
  headerRow?: number;
  skipRows?: number;
  skipColumns?: number;
}

/**
 * Parser result
 */
export interface ParserResult {
  success: boolean;
  data?: FinancialData;
  metadata?: any;
  confidence?: ConfidenceScore;
  warnings?: ParserWarning[];
  hints?: string[];
  errors?: ParserError[];
}

/**
 * Financial data structure
 */
export interface FinancialData {
  [period: string]: {
    revenue: number;
    expenses: number;
    netIncome: number;
    items: FinancialLineItem[];
    [key: string]: any;
  };
}

/**
 * Confidence score
 */
export interface ConfidenceScore {
  overall: number;
  fields?: { [key: string]: number };
  factors?: { [key: string]: number };
  aiEnhanced?: boolean;
}

/**
 * Parser warning
 */
export interface ParserWarning {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  details?: any;
}

/**
 * Parser error
 */
export interface ParserError extends Error {
  code: string;
  details?: any;
}

/**
 * Validation error
 */
export interface ValidationError {
  code: string;
  message: string;
  severity: 'error' | 'warning';
  field?: string;
}

/**
 * Parser context
 */
export interface ParserContext {
  config: ParserConfig;
  startTime: number;
  metadata: Record<string, any>;
  warnings: ParserWarning[];
  hints: string[];
}

/**
 * Cell data
 */
export interface CellData {
  row: number;
  col: number;
  value: any;
  formula?: string;
  format?: string;
  style?: {
    bold?: boolean;
    italic?: boolean;
    color?: any;
    fill?: any;
  };
}

/**
 * Sheet structure
 */
export interface SheetStructure {
  sheetId: number;
  sheetName: string;
  rowCount: number;
  columnCount: number;
  hasFormulas: boolean;
  hasNumbers: boolean;
  confidence: number;
  score?: number;
}

/**
 * Config hints
 */
export interface ConfigHints {
  statementType?: 'pnl' | 'cashflow' | 'balance_sheet';
  language?: string;
  dateFormat?: string;
  currency?: string;
}

/**
 * Parser capabilities definition
 */
export interface ParserCapabilities {
  supportedFormats: FileFormat[];
  maxFileSize?: number;
  supportsMultiSheet?: boolean;
  supportsFormulas?: boolean;
  supportsFormatting?: boolean;
  supportsPivotTables?: boolean;
  supportsCharts?: boolean;
  aiEnhanced?: boolean;
  confidenceScoring?: boolean;
  multiLanguage?: boolean;
  customizable?: boolean;
}

/**
 * Plugin capability
 */
export type PluginCapability = 
  | 'pattern_recognition'
  | 'anomaly_detection'
  | 'data_inference'
  | 'quality_assessment'
  | 'confidence_scoring'
  | 'multi_language'
  | 'currency_conversion'
  | 'data_validation'
  | 'format_detection';

/**
 * Parser plugin interface
 */
export interface ParserPlugin {
  name: string;
  version: string;
  capabilities: PluginCapability[];
  supportedFormats?: FileFormat[];
  requiredEngineVersion?: string;
  
  onRegister?(engine: any): void;
  onUnregister?(engine: any): void;
  
  preProcess?(buffer: Buffer, context: ParserContext): Promise<Buffer>;
  parse?(result: ParserResult, context: ParserContext): Promise<ParserResult>;
  postProcess?(result: ParserResult, context: ParserContext): Promise<ParserResult>;
}

/**
 * Plugin metadata
 */
export interface PluginMetadata {
  name: string;
  version: string;
  description: string;
  author: string;
  capabilities: PluginCapability[];
  requirements?: {
    minEngineVersion?: string;
    supportedFormats?: string[];
  };
  configuration?: Record<string, any>;
}

// ===============================
// FORMAT-SPECIFIC PARSERS
// ===============================

/**
 * Excel-specific parser interface
 */
export interface IExcelParser extends IParserEngine {
  /**
   * Get worksheet information
   */
  getWorksheetInfo(buffer: Buffer): Promise<WorksheetInfo[]>;
  
  /**
   * Parse specific worksheet
   */
  parseWorksheet(buffer: Buffer, worksheetName: string, config: ParserConfig): Promise<ParserResult>;
  
  /**
   * Extract formulas from cells
   */
  extractFormulas(buffer: Buffer, range?: string): Promise<FormulaInfo[]>;
}

/**
 * Worksheet information
 */
export interface WorksheetInfo {
  name: string;
  index: number;
  rowCount: number;
  columnCount: number;
  hasData: boolean;
  dataRange?: string;
  suggestedType?: 'data' | 'summary' | 'chart' | 'notes';
}

/**
 * Formula information
 */
export interface FormulaInfo {
  cell: string;
  formula: string;
  result?: any;
  dependencies: string[];
  isCalculated: boolean;
}

/**
 * CSV-specific parser interface
 */
export interface ICSVParser extends IParserEngine {
  /**
   * Detect CSV delimiter and format
   */
  detectCSVFormat(buffer: Buffer): Promise<CSVFormat>;
  
  /**
   * Parse with streaming for large files
   */
  parseStream(stream: NodeJS.ReadableStream, config: ParserConfig): Promise<ParserResult>;
}

/**
 * CSV format detection result
 */
export interface CSVFormat {
  delimiter: string;
  quoteChar: string;
  encoding: string;
  hasHeaders: boolean;
  rowCount: number;
  columnCount: number;
  confidence: number;
}

/**
 * PDF-specific parser interface
 */
export interface IPDFParser extends IParserEngine {
  /**
   * Extract text from PDF
   */
  extractText(buffer: Buffer): Promise<string>;
  
  /**
   * Extract tables from PDF
   */
  extractTables(buffer: Buffer): Promise<TableData[]>;
  
  /**
   * Perform OCR on PDF
   */
  performOCR(buffer: Buffer, language?: string): Promise<OCRResult>;
}

/**
 * Table data extracted from PDF
 */
export interface TableData {
  pageNumber: number;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  headers: string[];
  rows: string[][];
  confidence: number;
}

/**
 * OCR result
 */
export interface OCRResult {
  text: string;
  confidence: number;
  words: {
    text: string;
    confidence: number;
    boundingBox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }[];
}

// ===============================
// AI-ENHANCED PARSING
// ===============================

/**
 * AI parser service interface
 */
export interface IAIParserService {
  /**
   * Analyze document structure with AI
   */
  analyzeStructure(buffer: Buffer, format: FileFormat): Promise<StructureAnalysis>;
  
  /**
   * Classify financial data with AI
   */
  classifyLineItems(lineItems: Partial<FinancialLineItem>[]): Promise<FinancialLineItem[]>;
  
  /**
   * Generate parsing rules from examples
   */
  generateRules(examples: TrainingExample[]): Promise<ParsingRule[]>;
  
  /**
   * Improve configuration based on results
   */
  optimizeConfig(config: ParserConfig, results: ParserResult[]): Promise<ParserConfig>;
}

/**
 * Document structure analysis result
 */
export interface StructureAnalysis {
  documentType: 'profit_loss' | 'cashflow' | 'balance_sheet' | 'bank_statement' | 'invoice' | 'unknown';
  confidence: number;
  sections: {
    name: string;
    startRow: number;
    endRow: number;
    type: 'header' | 'data' | 'summary' | 'footer';
    confidence: number;
  }[];
  suggestedMappings: {
    field: string;
    column: number;
    confidence: number;
  }[];
  detectedPatterns: {
    pattern: string;
    category: FinancialCategory;
    examples: string[];
    confidence: number;
  }[];
}

/**
 * Training example for AI learning
 */
export interface TrainingExample {
  input: string;
  expectedCategory: FinancialCategory;
  expectedSubcategory?: string;
  context?: Record<string, any>;
}

/**
 * Parsing rule with AI confidence
 */
export interface ParsingRule {
  id: string;
  name: string;
  pattern: string | RegExp;
  category: FinancialCategory;
  subcategory?: string;
  confidence: number;
  learnedFrom?: string; // Source of learning
  validatedBy?: string; // User who validated
}

// ===============================
// VALIDATION & QUALITY CONTROL
// ===============================

/**
 * Data validation service interface
 */
export interface IValidationService {
  /**
   * Validate financial statement consistency
   */
  validateStatement(statement: FinancialStatement): Promise<ValidationResult>;
  
  /**
   * Check data quality
   */
  checkDataQuality(lineItems: FinancialLineItem[]): Promise<QualityReport>;
  
  /**
   * Detect anomalies in financial data
   */
  detectAnomalies(statement: FinancialStatement): Promise<AnomalyReport>;
  
  /**
   * Cross-validate against rules
   */
  validateRules(statement: FinancialStatement, rules: ValidationRule[]): Promise<ValidationResult>;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  score: number; // 0-100
  suggestions: string[];
}

/**
 * Data quality report
 */
export interface QualityReport {
  overallScore: number; // 0-100
  issues: {
    type: 'missing_data' | 'inconsistent_format' | 'duplicate_entries' | 'outliers' | 'invalid_dates';
    severity: 'critical' | 'high' | 'medium' | 'low';
    count: number;
    examples: string[];
    suggestion: string;
  }[];
  completeness: number; // Percentage of complete data
  consistency: number; // Percentage of consistent formatting
  accuracy: number; // Estimated accuracy percentage
}

/**
 * Anomaly detection report
 */
export interface AnomalyReport {
  anomalies: {
    type: 'spike' | 'drop' | 'pattern_break' | 'outlier';
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    affectedItems: string[];
    confidence: number;
    timeline?: Date[];
  }[];
  summary: {
    totalAnomalies: number;
    criticalCount: number;
    riskScore: number; // 0-100
  };
}

/**
 * Validation rule definition
 */
export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  type: 'balance' | 'range' | 'pattern' | 'relationship' | 'custom';
  condition: string | ((statement: FinancialStatement) => boolean);
  severity: 'error' | 'warning' | 'info';
  message: string;
  category?: FinancialCategory;
}

// ===============================
// TRANSFORMATION & ENRICHMENT
// ===============================

/**
 * Data transformation service interface
 */
export interface ITransformationService {
  /**
   * Transform raw data to standardized format
   */
  transform(rawData: any[], config: TransformationConfig): Promise<FinancialLineItem[]>;
  
  /**
   * Enrich data with additional information
   */
  enrich(lineItems: FinancialLineItem[], enrichmentOptions: EnrichmentOptions): Promise<FinancialLineItem[]>;
  
  /**
   * Normalize amounts and currencies
   */
  normalize(amounts: FinancialAmount[], targetCurrency: CurrencyCode): Promise<FinancialAmount[]>;
  
  /**
   * Apply business rules
   */
  applyBusinessRules(lineItems: FinancialLineItem[], rules: BusinessRule[]): Promise<FinancialLineItem[]>;
}

/**
 * Transformation configuration
 */
export interface TransformationConfig {
  dateFormats: string[];
  currencySymbols: Record<string, CurrencyCode>;
  numberFormats: {
    decimalSeparator: string;
    thousandsSeparator: string;
  };
  categoryMappings: Record<string, FinancialCategory>;
  customTransforms: {
    field: string;
    transform: string | ((value: any) => any);
  }[];
}

/**
 * Data enrichment options
 */
export interface EnrichmentOptions {
  addTaxonomyTags: boolean;
  detectVendors: boolean;
  categorizeAutomatically: boolean;
  fetchExchangeRates: boolean;
  addSeasonalTrends: boolean;
  benchmarkAgainstIndustry: boolean;
}

/**
 * Business rule for data processing
 */
export interface BusinessRule {
  id: string;
  name: string;
  condition: string | ((item: FinancialLineItem) => boolean);
  action: 'reclassify' | 'flag' | 'transform' | 'reject';
  parameters: Record<string, any>;
  priority: number;
}

// ===============================
// PARSER FACTORY & REGISTRY
// ===============================

/**
 * Parser factory interface
 */
export interface IParserFactory {
  /**
   * Create parser for specific format
   */
  createParser(format: FileFormat): Promise<IParserEngine>;
  
  /**
   * Register new parser
   */
  registerParser(format: FileFormat, parser: IParserEngine): void;
  
  /**
   * Get available parsers
   */
  getAvailableParsers(): Record<FileFormat, ParserCapabilities>;
  
  /**
   * Auto-select best parser for file
   */
  selectParser(buffer: Buffer, filename?: string): Promise<IParserEngine>;
}

/**
 * Parser registry for managing parsers
 */
export interface IParserRegistry {
  /**
   * Register parser with capabilities
   */
  register(format: FileFormat, parser: IParserEngine, capabilities: ParserCapabilities): void;
  
  /**
   * Get parser by format
   */
  get(format: FileFormat): IParserEngine | null;
  
  /**
   * List all registered parsers
   */
  list(): Record<FileFormat, ParserCapabilities>;
  
  /**
   * Check if format is supported
   */
  supports(format: FileFormat): boolean;
  
  /**
   * Get parser performance metrics
   */
  getMetrics(format: FileFormat): ParserMetrics | null;
}

/**
 * Parser performance metrics
 */
export interface ParserMetrics {
  totalParses: number;
  successRate: number;
  averageProcessingTime: number;
  averageAccuracy: number;
  memoryUsage: {
    min: number;
    max: number;
    average: number;
  };
  errorRate: number;
  lastUpdated: Date;
}

// ===============================
// PLUGIN SYSTEM
// ===============================

/**
 * Parser plugin interface for extensibility
 */
export interface IParserPlugin {
  /**
   * Plugin metadata
   */
  readonly metadata: PluginMetadata;
  
  /**
   * Initialize plugin
   */
  initialize(config: any): Promise<void>;
  
  /**
   * Pre-processing hook
   */
  beforeParse?(buffer: Buffer, config: ParserConfig): Promise<{ buffer: Buffer; config: ParserConfig }>;
  
  /**
   * Post-processing hook
   */
  afterParse?(result: ParserResult): Promise<ParserResult>;
  
  /**
   * Custom validation hook
   */
  validate?(statement: FinancialStatement): Promise<ValidationError[]>;
  
  /**
   * Cleanup resources
   */
  cleanup?(): Promise<void>;
}

/**
 * Plugin metadata
 */
export interface PluginMetadata {
  name: string;
  version: string;
  description: string;
  author: string;
  supportedFormats: FileFormat[];
  dependencies: string[];
  configSchema?: any;
}

/**
 * Plugin manager interface
 */
export interface IPluginManager {
  /**
   * Load plugin
   */
  loadPlugin(plugin: IParserPlugin): Promise<void>;
  
  /**
   * Unload plugin
   */
  unloadPlugin(name: string): Promise<void>;
  
  /**
   * Get loaded plugins
   */
  getPlugins(): IParserPlugin[];
  
  /**
   * Execute plugin hooks
   */
  executeHook<T>(hookName: string, ...args: any[]): Promise<T[]>;
}