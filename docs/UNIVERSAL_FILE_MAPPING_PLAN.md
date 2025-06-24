# Universal File Upload & Mapping System Plan

## Overview
Design a flexible system that can handle any file format and intelligently map data to our financial models.

## Supported File Formats
1. **Spreadsheets**
   - Excel (.xlsx, .xls, .xlsm)
   - CSV (.csv)
   - Google Sheets (via API or export)
   - OpenDocument (.ods)
   - TSV (.tsv)

2. **Structured Data**
   - JSON (.json)
   - XML (.xml)
   - Parquet (.parquet)

3. **Documents** (with table extraction)
   - PDF (with tables)
   - Word documents (.docx)

4. **Database Exports**
   - SQL dumps
   - Database CSV exports

## Architecture Components

### 1. File Format Detection & Parsing Layer
```typescript
interface FileParser {
  canParse(file: File): boolean;
  parse(file: File): Promise<ParsedData>;
  extractMetadata(file: File): Promise<FileMetadata>;
}

interface ParsedData {
  sheets: Sheet[];
  metadata: FileMetadata;
  rawData: any;
}

interface Sheet {
  name: string;
  rows: Row[];
  columns: Column[];
  dataRange: DataRange;
}
```

### 2. Intelligent Data Analysis Layer
```typescript
interface DataAnalyzer {
  // Detect data patterns
  detectDateColumns(sheet: Sheet): DateColumnResult[];
  detectCurrencyColumns(sheet: Sheet): CurrencyColumnResult[];
  detectHeaderRows(sheet: Sheet): number[];
  detectDataTypes(sheet: Sheet): ColumnDataType[];
  
  // Detect financial patterns
  detectFinancialMetrics(sheet: Sheet): FinancialMetric[];
  detectTimeSeriesData(sheet: Sheet): TimeSeriesInfo;
  detectCategoricalData(sheet: Sheet): CategoryInfo[];
}
```

### 3. AI-Powered Mapping Engine
```typescript
interface AIMappingEngine {
  // Analyze and suggest mappings
  suggestMappings(
    parsedData: ParsedData,
    targetSchema: FinancialSchema
  ): MappingSuggestion[];
  
  // Learn from user corrections
  learnFromCorrection(
    original: MappingSuggestion,
    corrected: UserMapping
  ): void;
  
  // Confidence scoring
  calculateConfidence(mapping: MappingSuggestion): number;
}
```

### 4. Universal Schema Definition
```typescript
interface FinancialSchema {
  type: 'cashflow' | 'pnl' | 'balance_sheet' | 'custom';
  requiredFields: SchemaField[];
  optionalFields: SchemaField[];
  validationRules: ValidationRule[];
}

interface SchemaField {
  name: string;
  dataType: DataType;
  description: string;
  aliases: string[]; // Common names for this field
  validationRules: FieldValidation[];
}
```

### 5. Data Transformation Pipeline
```typescript
interface DataTransformer {
  // Clean and normalize data
  cleanData(data: any, rules: CleaningRule[]): any;
  normalizeNumbers(value: any, format: NumberFormat): number;
  normalizeDates(value: any, format: DateFormat): Date;
  normalizeCurrency(value: any, format: CurrencyFormat): Money;
  
  // Transform to target schema
  transform(
    source: ParsedData,
    mapping: UserMapping,
    targetSchema: FinancialSchema
  ): TransformedData;
}
```

### 6. Preview & Validation System
```typescript
interface PreviewSystem {
  // Generate preview of mapped data
  generatePreview(
    data: ParsedData,
    mapping: UserMapping
  ): PreviewResult;
  
  // Validate mapped data
  validate(
    transformedData: TransformedData,
    schema: FinancialSchema
  ): ValidationResult;
  
  // Show side-by-side comparison
  compareSourceTarget(
    source: ParsedData,
    transformed: TransformedData
  ): ComparisonView;
}
```

## Implementation Strategy

### Phase 1: Enhanced File Support (Week 1-2)
1. Add CSV parser
2. Add JSON/XML parsers
3. Add PDF table extraction
4. Create unified ParsedData structure

### Phase 2: Intelligent Analysis (Week 2-3)
1. Implement pattern detection algorithms
2. Add financial metric detection
3. Create confidence scoring system
4. Build data type inference

### Phase 3: AI Mapping Engine (Week 3-4)
1. Enhance existing AI service
2. Add multiple AI provider support
3. Implement learning mechanism
4. Create mapping suggestion UI

### Phase 4: Transformation Pipeline (Week 4-5)
1. Build data cleaning functions
2. Create normalization rules
3. Implement validation system
4. Add error recovery

### Phase 5: User Interface (Week 5-6)
1. Create universal upload component
2. Build mapping wizard
3. Add preview system
4. Implement validation UI

## Key Features

### 1. Smart Column Detection
- Automatically detect date columns by pattern
- Identify currency columns by symbols/formats
- Find header rows intelligently
- Detect merged cells and handle appropriately

### 2. Multi-Language Support
- Handle files in Spanish/English
- Detect language automatically
- Translate headers if needed
- Support international number formats

### 3. Flexible Mapping
- Drag-and-drop mapping interface
- AI suggestions with confidence scores
- Save mapping templates
- Apply templates to similar files

### 4. Data Quality
- Highlight data quality issues
- Suggest corrections
- Handle missing data
- Validate against business rules

### 5. Learning System
- Learn from user corrections
- Improve suggestions over time
- Store successful mappings
- Build company-specific templates

## Technical Requirements

### Backend
1. **File Processing Service**
   - Support for multiple file formats
   - Streaming for large files
   - Background processing
   - Progress tracking

2. **AI Integration**
   - Multiple AI provider support
   - Fallback mechanisms
   - Caching for performance
   - Rate limiting

3. **Data Storage**
   - Store original files
   - Save mapping templates
   - Cache analysis results
   - Track user corrections

### Frontend
1. **Upload Component**
   - Drag-and-drop interface
   - Progress indication
   - Format validation
   - File preview

2. **Mapping Interface**
   - Visual mapping tool
   - AI suggestion panel
   - Preview pane
   - Validation feedback

3. **Data Preview**
   - Paginated data view
   - Search and filter
   - Highlight mapped columns
   - Show transformations

## Error Handling

1. **File Errors**
   - Corrupted files
   - Unsupported formats
   - Large file handling
   - Encoding issues

2. **Mapping Errors**
   - Missing required fields
   - Data type mismatches
   - Validation failures
   - Transformation errors

3. **Recovery Strategies**
   - Auto-save progress
   - Resume interrupted uploads
   - Partial data recovery
   - Alternative parsing methods

## Security Considerations

1. **File Validation**
   - Virus scanning
   - File type verification
   - Size limits
   - Content validation

2. **Data Privacy**
   - Encrypt files at rest
   - Secure transmission
   - Access control
   - Audit logging

3. **AI Security**
   - Sanitize data before AI
   - Limit sensitive data exposure
   - Use secure AI endpoints
   - Monitor AI usage

## Performance Optimization

1. **Large Files**
   - Stream processing
   - Chunked uploads
   - Background workers
   - Progress tracking

2. **Caching**
   - Cache AI analysis
   - Store parsed data
   - Reuse mappings
   - CDN for static assets

3. **Scalability**
   - Horizontal scaling
   - Queue management
   - Load balancing
   - Database optimization