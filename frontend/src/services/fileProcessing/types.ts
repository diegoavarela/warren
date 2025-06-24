export interface ParsedData {
  sheets: Sheet[];
  metadata: FileMetadata;
  rawData?: any;
  warnings?: string[];
  errors?: string[];
}

export interface Sheet {
  name: string;
  rows: Row[];
  columns: Column[];
  dataRange: DataRange;
  headers?: HeaderInfo;
  isEmpty?: boolean;
}

export interface Row {
  index: number;
  cells: Cell[];
  isEmpty?: boolean;
  isHeader?: boolean;
}

export interface Cell {
  value: any;
  formattedValue?: string;
  type: CellType;
  format?: string;
  formula?: string;
  column: number;
  row: number;
}

export type CellType = 'string' | 'number' | 'date' | 'boolean' | 'currency' | 'percentage' | 'empty';

export interface Column {
  index: number;
  letter: string;
  name?: string;
  dataType?: CellType;
  format?: string;
  width?: number;
}

export interface DataRange {
  startRow: number;
  endRow: number;
  startColumn: number;
  endColumn: number;
  totalRows: number;
  totalColumns: number;
}

export interface FileMetadata {
  fileName: string;
  fileSize: number;
  mimeType: string;
  extension: string;
  createdDate?: Date;
  modifiedDate?: Date;
  author?: string;
  lastModifiedBy?: string;
  company?: string;
  sheets?: number;
}

export interface HeaderInfo {
  row: number;
  columns: HeaderColumn[];
  confidence: number;
}

export interface HeaderColumn {
  index: number;
  value: string;
  normalizedValue: string;
  possibleType?: string;
}

export interface ProcessingOptions {
  maxRows?: number;
  detectHeaders?: boolean;
  detectDataTypes?: boolean;
  normalizeData?: boolean;
  includeEmptyRows?: boolean;
  includeFormulas?: boolean;
  dateFormats?: string[];
  currencySymbols?: string[];
  locale?: string;
}

export interface ProcessingResult {
  success: boolean;
  data?: ParsedData;
  error?: string;
  warnings?: string[];
  processingTime?: number;
}

// Analysis types
export interface DataAnalysis {
  dateColumns: DateColumnInfo[];
  currencyColumns: CurrencyColumnInfo[];
  percentageColumns: PercentageColumnInfo[];
  textColumns: TextColumnInfo[];
  numericColumns: NumericColumnInfo[];
  emptyColumns: number[];
  headerRows: number[];
  dataStartRow: number;
  patterns: DataPattern[];
}

export interface DateColumnInfo {
  column: number;
  format: string;
  sampleValues: string[];
  confidence: number;
}

export interface CurrencyColumnInfo {
  column: number;
  symbol: string;
  format: string;
  sampleValues: string[];
  confidence: number;
}

export interface PercentageColumnInfo {
  column: number;
  format: string;
  sampleValues: string[];
  confidence: number;
}

export interface TextColumnInfo {
  column: number;
  possibleCategories?: string[];
  isIdentifier?: boolean;
  confidence: number;
}

export interface NumericColumnInfo {
  column: number;
  hasDecimals: boolean;
  range: { min: number; max: number };
  isSequential?: boolean;
  confidence: number;
}

export interface DataPattern {
  type: 'timeSeries' | 'categorical' | 'numerical' | 'mixed';
  description: string;
  affectedColumns: number[];
  confidence: number;
}