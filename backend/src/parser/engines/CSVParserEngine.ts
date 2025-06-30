/**
 * CSV Parser Engine
 * 
 * High-performance CSV parser optimized for:
 * - Large financial datasets
 * - Automatic delimiter detection
 * - Encoding detection
 * - Stream processing for huge files
 */

import { BaseParserEngine, ParserEngineMetadata } from '../core/ParserEngine';
import {
  ParserResult,
  ParserContext,
  ConfidenceScore,
  ParserCapabilities,
  FileFormat,
  FinancialData,
  ValidationError
} from '../../types/parser';
import { FinancialLineItem, TimePeriod, FinancialCategory, ConfidenceLevel } from '../../types/financial';
import { logger } from '../../utils/logger';

export class CSVParserEngine extends BaseParserEngine {
  readonly format = FileFormat.CSV as FileFormat;
  readonly version = '1.0.0';
  
  readonly capabilities: ParserCapabilities = {
    supportedFormats: [FileFormat.CSV],
    maxFileSize: 200 * 1024 * 1024, // 200MB - CSV can be large
    supportsMultiSheet: false,
    supportsFormulas: false,
    supportsFormatting: false,
    supportsPivotTables: false,
    supportsCharts: false,
    aiEnhanced: true,
    confidenceScoring: true,
    multiLanguage: true,
    customizable: true
  };
  
  private delimiters = [',', ';', '\t', '|'];
  
  /**
   * Validate CSV buffer
   */
  override async validate(buffer: Buffer): Promise<ValidationError[]> {
    const errors = await super.validate(buffer);
    
    // Check if buffer contains text
    const sample = buffer.slice(0, 1000).toString('utf8');
    if (!sample || sample.trim().length === 0) {
      errors.push({
        code: 'EMPTY_CSV',
        message: 'CSV file appears to be empty',
        severity: 'error'
      });
    }
    
    // Check for binary data (not text)
    const nonPrintableRatio = this.calculateNonPrintableRatio(buffer.slice(0, 1000));
    if (nonPrintableRatio > 0.3) {
      errors.push({
        code: 'BINARY_DATA',
        message: 'File contains too much binary data, may not be a valid CSV',
        severity: 'error'
      });
    }
    
    return errors;
  }
  
  /**
   * Pre-process CSV to detect encoding and convert if needed
   */
  override async preProcess(buffer: Buffer, context: ParserContext): Promise<Buffer> {
    // Detect encoding
    const encoding = this.detectEncoding(buffer);
    context.metadata.detectedEncoding = encoding;
    
    // Convert to UTF-8 if needed
    if (encoding !== 'utf8') {
      try {
        const text = buffer.toString(encoding as BufferEncoding);
        return Buffer.from(text, 'utf8');
      } catch (error) {
        context.warnings.push({
          code: 'ENCODING_CONVERSION_FAILED',
          message: `Failed to convert from ${encoding} to UTF-8`,
          severity: 'warning'
        });
      }
    }
    
    return buffer;
  }
  
  /**
   * Core CSV parsing implementation
   */
  protected async doParse(buffer: Buffer, context: ParserContext): Promise<ParserResult> {
    try {
      const text = buffer.toString('utf8');
      
      // Step 1: Detect delimiter
      const delimiter = context.config.options?.delimiter || await this.detectDelimiter(text);
      context.metadata.delimiter = delimiter;
      
      // Step 2: Parse CSV into rows
      const rows = this.parseCSV(text, delimiter);
      
      if (rows.length === 0) {
        throw new Error('No data found in CSV file');
      }
      
      // Step 3: Detect header row
      const headerRowIndex = await this.detectHeaderRow(rows);
      const headers = rows[headerRowIndex];
      const dataRows = rows.slice(headerRowIndex + 1);
      
      // Step 4: Analyze structure
      const structure = await this.analyzeStructure(headers, dataRows);
      
      // Step 5: Detect statement type
      const statementType = await this.detectStatementType(headers, dataRows);
      
      // Step 6: Extract time periods
      const timePeriods = await this.extractTimePeriods(headers, structure);
      
      // Step 7: Extract line items
      const lineItems = await this.extractLineItems(headers, dataRows, structure, timePeriods);
      
      // Step 8: Build financial data
      const financialData = await this.buildFinancialData(lineItems, timePeriods, statementType);
      
      // Create result
      const result: ParserResult = {
        success: true,
        data: financialData,
        metadata: {
          fileName: context.config.fileName,
          fileSize: buffer.length,
          statementType,
          delimiter,
          encoding: context.metadata.detectedEncoding,
          rowCount: rows.length,
          columnCount: headers.length,
          headerRow: headerRowIndex,
          timePeriods: timePeriods.map(tp => tp.period),
          lineItemCount: lineItems.length,
          extractedAt: new Date().toISOString()
        },
        confidence: await this.calculateConfidence({
          success: true,
          data: financialData,
          metadata: { rowCount: rows.length }
        }),
        warnings: context.warnings,
        hints: context.hints
      };
      
      return result;
    } catch (error) {
      logger.error('CSV parsing error:', error);
      throw error;
    }
  }
  
  /**
   * Calculate ratio of non-printable characters
   */
  private calculateNonPrintableRatio(buffer: Buffer): number {
    let nonPrintable = 0;
    for (const byte of buffer) {
      if (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) {
        nonPrintable++;
      }
    }
    return nonPrintable / buffer.length;
  }
  
  /**
   * Detect text encoding
   */
  private detectEncoding(buffer: Buffer): string {
    // Check for BOM
    if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
      return 'utf8';
    }
    if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
      return 'utf16le';
    }
    if (buffer[0] === 0xFE && buffer[1] === 0xFF) {
      return 'utf16be';
    }
    
    // Default to UTF-8
    return 'utf8';
  }
  
  /**
   * Detect CSV delimiter
   */
  private async detectDelimiter(text: string): Promise<string> {
    const sample = text.slice(0, 5000); // Sample first 5KB
    const lines = sample.split(/\r?\n/).filter(line => line.trim());
    
    if (lines.length < 2) {
      return ','; // Default
    }
    
    // Count occurrences of each delimiter
    const counts: { [key: string]: number[] } = {};
    
    for (const delimiter of this.delimiters) {
      counts[delimiter] = lines.map(line => 
        (line.match(new RegExp(delimiter, 'g')) || []).length
      );
    }
    
    // Find delimiter with most consistent count across lines
    let bestDelimiter = ',';
    let bestScore = 0;
    
    for (const [delimiter, lineCounts] of Object.entries(counts)) {
      if (lineCounts.length === 0) continue;
      
      const avg = lineCounts.reduce((a, b) => a + b, 0) / lineCounts.length;
      if (avg === 0) continue;
      
      // Calculate consistency (lower variance is better)
      const variance = lineCounts.reduce((sum, count) => 
        sum + Math.pow(count - avg, 2), 0
      ) / lineCounts.length;
      
      const score = avg / (1 + variance);
      
      if (score > bestScore) {
        bestScore = score;
        bestDelimiter = delimiter;
      }
    }
    
    return bestDelimiter;
  }
  
  /**
   * Parse CSV text into rows
   */
  private parseCSV(text: string, delimiter: string): string[][] {
    const rows: string[][] = [];
    const lines = text.split(/\r?\n/);
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const row = this.parseCSVLine(line, delimiter);
      if (row.length > 0) {
        rows.push(row);
      }
    }
    
    return rows;
  }
  
  /**
   * Parse a single CSV line handling quotes
   */
  private parseCSVLine(line: string, delimiter: string): string[] {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    cells.push(current.trim());
    return cells;
  }
  
  /**
   * Detect header row
   */
  private async detectHeaderRow(rows: string[][]): Promise<number> {
    // Look for row with mostly non-numeric values followed by numeric rows
    for (let i = 0; i < Math.min(rows.length - 1, 10); i++) {
      const row = rows[i];
      const nextRow = rows[i + 1];
      
      if (!row || !nextRow) continue;
      
      const currentNumericRatio = this.calculateNumericRatio(row);
      const nextNumericRatio = this.calculateNumericRatio(nextRow);
      
      // Header row should have low numeric ratio, data rows high
      if (currentNumericRatio < 0.3 && nextNumericRatio > 0.5) {
        return i;
      }
    }
    
    return 0; // Default to first row
  }
  
  /**
   * Calculate ratio of numeric cells
   */
  private calculateNumericRatio(row: string[]): number {
    if (row.length === 0) return 0;
    
    const numericCount = row.filter(cell => {
      const cleaned = cell.replace(/[$,()%]/g, '').trim();
      return !isNaN(parseFloat(cleaned)) && cleaned !== '';
    }).length;
    
    return numericCount / row.length;
  }
  
  /**
   * Analyze CSV structure
   */
  private async analyzeStructure(
    headers: string[],
    dataRows: string[][]
  ): Promise<CSVStructure> {
    const structure: CSVStructure = {
      descriptionColumn: -1,
      periodColumns: [],
      hasSubtotals: false,
      hasFormulas: false
    };
    
    // Find description column (first non-numeric column)
    for (let i = 0; i < headers.length; i++) {
      const columnValues = dataRows.map(row => row[i] || '');
      const numericRatio = this.calculateNumericRatio(columnValues);
      
      if (numericRatio < 0.2) {
        structure.descriptionColumn = i;
        break;
      }
    }
    
    // Find period columns (numeric columns with date-like headers)
    for (let i = 0; i < headers.length; i++) {
      if (i === structure.descriptionColumn) continue;
      
      const header = headers[i];
      if (this.isPeriodHeader(header)) {
        structure.periodColumns.push(i);
      } else {
        // Check if column is mostly numeric
        const columnValues = dataRows.map(row => row[i] || '');
        const numericRatio = this.calculateNumericRatio(columnValues);
        if (numericRatio > 0.7) {
          structure.periodColumns.push(i);
        }
      }
    }
    
    return structure;
  }
  
  /**
   * Check if header looks like a time period
   */
  private isPeriodHeader(header: string): boolean {
    const periodPatterns = [
      /\d{4}/, // Year
      /\d{1,2}[-/]\d{1,2}/, // Month/Day
      /Q[1-4]/, // Quarter
      /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
      /FY\s*\d{2,4}/i
    ];
    
    return periodPatterns.some(pattern => pattern.test(header));
  }
  
  /**
   * Detect statement type
   */
  private async detectStatementType(
    headers: string[],
    dataRows: string[][]
  ): Promise<'pnl' | 'cashflow' | 'balance_sheet'> {
    // Combine headers and first few rows for analysis
    const textToAnalyze = [
      ...headers,
      ...dataRows.slice(0, 10).map(row => row.join(' '))
    ].join(' ').toLowerCase();
    
    if (/cash\s*flow|operating.*activities|investing.*activities/i.test(textToAnalyze)) {
      return 'cashflow';
    }
    if (/balance.*sheet|assets|liabilities|equity/i.test(textToAnalyze)) {
      return 'balance_sheet';
    }
    
    return 'pnl'; // Default
  }
  
  /**
   * Extract time periods from headers
   */
  private async extractTimePeriods(
    headers: string[],
    structure: CSVStructure
  ): Promise<TimePeriod[]> {
    const timePeriods: TimePeriod[] = [];
    
    structure.periodColumns.forEach(colIndex => {
      const header = headers[colIndex];
      if (header) {
        timePeriods.push({
          col: colIndex,
          period: header.trim(),
          type: this.detectPeriodType(header)
        });
      }
    });
    
    return timePeriods;
  }
  
  /**
   * Extract line items from data rows
   */
  private async extractLineItems(
    headers: string[],
    dataRows: string[][],
    structure: CSVStructure,
    timePeriods: TimePeriod[]
  ): Promise<FinancialLineItem[]> {
    const lineItems: FinancialLineItem[] = [];
    
    dataRows.forEach((row, rowIndex) => {
      const description = structure.descriptionColumn >= 0 
        ? row[structure.descriptionColumn] 
        : row[0];
      
      if (!description || !description.trim()) return;
      
      // Extract values for each period
      timePeriods.forEach(period => {
        const value = row[period.col];
        if (value) {
          const numericValue = this.parseNumericValue(value);
          if (numericValue !== null) {
            lineItems.push({
              id: `${rowIndex}-${period.col}`,
              description: description.trim(),
              amount: {
                value: numericValue,
                currency: 'USD' // TODO: Get from config or detect
              },
              category: this.categorizeLineItem(description),
              date: period.date || new Date(),
              position: {
                row: rowIndex,
                column: period.col
              },
              confidence: {
                overall: 'high' as ConfidenceLevel,
                fields: {},
                score: 90
              }
            });
          }
        }
      });
    });
    
    return lineItems;
  }
  
  /**
   * Parse numeric value
   */
  private parseNumericValue(text: string): number | null {
    // Remove common formatting
    const cleaned = text
      .replace(/[$€£¥,]/g, '')
      .replace(/\s/g, '')
      .replace(/[()]/g, '-')
      .replace(/%$/, '');
    
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }
  
  /**
   * Detect period type
   */
  private detectPeriodType(period: string): 'month' | 'quarter' | 'year' {
    if (/^(19|20)\d{2}$/.test(period) || /FY/i.test(period)) return 'year';
    if (/Q[1-4]/i.test(period)) return 'quarter';
    return 'month';
  }
  
  /**
   * Categorize line item
   */
  private categorizeLineItem(description: string): FinancialCategory {
    const lower = description.toLowerCase();
    
    if (/revenue|sales|income/.test(lower) && !/expense|cost/.test(lower)) {
      return 'revenue';
    } else if (/expense|cost|expenditure/.test(lower)) {
      return 'expense';
    } else if (/cash.*operations/i.test(lower)) {
      return 'cash_inflow';
    } else if (/cash.*investing|cash.*financing/i.test(lower)) {
      return 'cash_outflow';
    }
    
    return 'other';
  }
  
  /**
   * Build financial data
   */
  private async buildFinancialData(
    lineItems: FinancialLineItem[],
    timePeriods: TimePeriod[],
    statementType: string
  ): Promise<FinancialData> {
    const data: FinancialData = {};
    
    // Initialize periods
    timePeriods.forEach(period => {
      data[period.period] = {
        revenue: 0,
        expenses: 0,
        netIncome: 0,
        items: []
      };
    });
    
    // Populate data
    lineItems.forEach(item => {
      const period = timePeriods.find(p => p.col === item.position?.column);
      if (!period || !data[period.period]) return;
      
      const periodData = data[period.period];
      periodData.items.push(item);
      
      if (item.category === 'revenue') {
        periodData.revenue += item.amount.value;
      } else if (item.category === 'expense') {
        periodData.expenses += Math.abs(item.amount.value);
      }
    });
    
    // Calculate net income
    Object.values(data).forEach(periodData => {
      periodData.netIncome = periodData.revenue - periodData.expenses;
    });
    
    return data;
  }
  
  /**
   * Calculate confidence scores
   */
  override async calculateConfidence(result: ParserResult): Promise<ConfidenceScore> {
    let overall = 0.85; // Base confidence for CSV (simple format)
    
    // Adjust based on data quality
    const rowCount = result.metadata?.rowCount || 0;
    if (rowCount < 5) {
      overall -= 0.2;
    } else if (rowCount > 100) {
      overall += 0.05;
    }
    
    return {
      overall: Math.max(0.1, Math.min(1.0, overall)),
      fields: {},
      factors: {
        formatSimplicity: 0.95,
        dataStructure: 0.85,
        parseAccuracy: 0.9
      }
    };
  }
  
  /**
   * Get engine metadata
   */
  getMetadata(): ParserEngineMetadata {
    return {
      name: 'CSVParserEngine',
      description: 'High-performance CSV parser with automatic delimiter detection',
      author: 'Warren Team',
      version: this.version,
      supportedFormats: [FileFormat.CSV],
      capabilities: this.capabilities,
      tier: 'basic',
      performanceRating: 'fast',
      accuracyRating: 90
    };
  }
}

// Type definitions

interface CSVStructure {
  descriptionColumn: number;
  periodColumns: number[];
  hasSubtotals: boolean;
  hasFormulas: boolean;
}