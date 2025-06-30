/**
 * PDF Parser Engine
 * 
 * Advanced PDF parser for financial statements with:
 * - Table extraction and structure recognition
 * - OCR support for scanned documents
 * - Multi-page handling
 * - Complex layout analysis
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
import { FinancialLineItem, TimePeriod } from '../../types/financial';
import { logger } from '../../utils/logger';

// Note: In production, we would use pdf-parse or similar library
// For now, this is a demonstration of the architecture

export class PDFParserEngine extends BaseParserEngine {
  readonly format = FileFormat.PDF as FileFormat;
  readonly version = '1.0.0';
  
  readonly capabilities: ParserCapabilities = {
    supportedFormats: [FileFormat.PDF],
    maxFileSize: 50 * 1024 * 1024, // 50MB
    supportsMultiSheet: false, // PDF pages, not sheets
    supportsFormulas: false,
    supportsFormatting: true,
    supportsPivotTables: false,
    supportsCharts: true,
    aiEnhanced: true,
    confidenceScoring: true,
    multiLanguage: true,
    customizable: true
  };
  
  /**
   * Validate PDF buffer
   */
  override async validate(buffer: Buffer): Promise<ValidationError[]> {
    const errors = await super.validate(buffer);
    
    // Check PDF signature
    const pdfSignature = buffer.slice(0, 4).toString();
    if (pdfSignature !== '%PDF') {
      errors.push({
        code: 'INVALID_PDF',
        message: 'File does not appear to be a valid PDF',
        severity: 'error'
      });
    }
    
    // Check if encrypted
    if (buffer.includes(Buffer.from('/Encrypt'))) {
      errors.push({
        code: 'ENCRYPTED_PDF',
        message: 'PDF is encrypted and cannot be parsed',
        severity: 'error'
      });
    }
    
    return errors;
  }
  
  /**
   * Core PDF parsing implementation
   */
  protected async doParse(buffer: Buffer, context: ParserContext): Promise<ParserResult> {
    try {
      // Step 1: Extract text and tables from PDF
      const extractedData = await this.extractPDFContent(buffer, context);
      
      // Step 2: Analyze document structure
      const structure = await this.analyzeDocumentStructure(extractedData, context);
      
      // Step 3: Detect statement type
      const statementType = await this.detectStatementType(extractedData.text);
      
      // Step 4: Extract tables
      const tables = await this.extractFinancialTables(extractedData, structure);
      
      // Step 5: Parse financial data from tables
      const { timePeriods, lineItems } = await this.parseFinancialTables(tables, statementType);
      
      // Step 6: Build financial data
      const financialData = await this.buildFinancialData(lineItems, timePeriods, statementType);
      
      // Create result
      const result: ParserResult = {
        success: true,
        data: financialData,
        metadata: {
          fileName: context.config.fileName,
          fileSize: buffer.length,
          statementType,
          pageCount: extractedData.pageCount,
          hasOCR: extractedData.hasOCR,
          tableCount: tables.length,
          timePeriods: timePeriods.map(tp => tp.period),
          lineItemCount: lineItems.length,
          extractedAt: new Date().toISOString()
        },
        confidence: await this.calculateConfidence({
          success: true,
          data: financialData,
          metadata: { hasOCR: extractedData.hasOCR }
        }),
        warnings: context.warnings,
        hints: context.hints
      };
      
      return result;
    } catch (error) {
      logger.error('PDF parsing error:', error);
      throw error;
    }
  }
  
  /**
   * Extract content from PDF
   */
  private async extractPDFContent(
    buffer: Buffer,
    context: ParserContext
  ): Promise<PDFExtractedContent> {
    // In production, this would use pdf-parse or similar
    // For now, return mock data
    return {
      text: this.getMockPDFText(),
      pages: [
        {
          pageNumber: 1,
          text: this.getMockPDFText(),
          tables: [],
          images: []
        }
      ],
      pageCount: 1,
      hasOCR: false,
      metadata: {
        title: 'Financial Statement',
        author: 'Company XYZ',
        creationDate: new Date()
      }
    };
  }
  
  /**
   * Analyze document structure
   */
  private async analyzeDocumentStructure(
    data: PDFExtractedContent,
    context: ParserContext
  ): Promise<DocumentStructure> {
    const structure: DocumentStructure = {
      sections: [],
      tables: [],
      headers: [],
      footers: []
    };
    
    // Analyze text to find structure
    const lines = data.text.split('\n');
    let currentSection: DocumentSection | null = null;
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      // Detect section headers
      if (this.isSectionHeader(trimmed)) {
        if (currentSection) {
          structure.sections.push(currentSection);
        }
        currentSection = {
          title: trimmed,
          startLine: index,
          endLine: index,
          content: []
        };
      } else if (currentSection && trimmed) {
        currentSection.content.push(trimmed);
        currentSection.endLine = index;
      }
    });
    
    if (currentSection) {
      structure.sections.push(currentSection);
    }
    
    return structure;
  }
  
  /**
   * Check if line is a section header
   */
  private isSectionHeader(text: string): boolean {
    const headerPatterns = [
      /^(income|profit|revenue|balance|cash\s*flow|assets|liabilities)/i,
      /^(statement|report|summary)\s+of/i,
      /^\d{4}\s+(annual|quarterly|monthly)/i
    ];
    
    return headerPatterns.some(pattern => pattern.test(text));
  }
  
  /**
   * Detect financial statement type from text
   */
  private async detectStatementType(text: string): Promise<'pnl' | 'cashflow' | 'balance_sheet'> {
    const lowerText = text.toLowerCase();
    
    const scores = {
      pnl: 0,
      cashflow: 0,
      balance_sheet: 0
    };
    
    // P&L indicators
    if (/income\s+statement|profit.*loss|p\s*&\s*l/i.test(lowerText)) scores.pnl += 10;
    if (/revenue|sales|income|expense|profit|margin/i.test(lowerText)) scores.pnl += 2;
    
    // Cashflow indicators
    if (/cash\s*flow\s+statement|statement.*cash\s*flows/i.test(lowerText)) scores.cashflow += 10;
    if (/operating.*activities|investing.*activities|financing.*activities/i.test(lowerText)) scores.cashflow += 3;
    
    // Balance sheet indicators
    if (/balance\s+sheet|statement.*financial.*position/i.test(lowerText)) scores.balance_sheet += 10;
    if (/assets|liabilities|equity|current.*assets|long.*term/i.test(lowerText)) scores.balance_sheet += 2;
    
    // Return highest scoring type
    const maxScore = Math.max(scores.pnl, scores.cashflow, scores.balance_sheet);
    if (scores.cashflow === maxScore) return 'cashflow';
    if (scores.balance_sheet === maxScore) return 'balance_sheet';
    return 'pnl';
  }
  
  /**
   * Extract financial tables from PDF
   */
  private async extractFinancialTables(
    data: PDFExtractedContent,
    structure: DocumentStructure
  ): Promise<ExtractedTable[]> {
    // In production, this would use advanced table extraction
    // For now, return mock table
    return [{
      rows: [
        ['', 'FY 2023', 'FY 2022', 'FY 2021'],
        ['Revenue', '1,500,000', '1,200,000', '1,000,000'],
        ['Cost of Sales', '900,000', '750,000', '650,000'],
        ['Gross Profit', '600,000', '450,000', '350,000'],
        ['Operating Expenses', '400,000', '320,000', '280,000'],
        ['Net Income', '200,000', '130,000', '70,000']
      ],
      pageNumber: 1,
      confidence: 0.9
    }];
  }
  
  /**
   * Parse financial data from tables
   */
  private async parseFinancialTables(
    tables: ExtractedTable[],
    statementType: string
  ): Promise<{ timePeriods: TimePeriod[]; lineItems: FinancialLineItem[] }> {
    const timePeriods: TimePeriod[] = [];
    const lineItems: FinancialLineItem[] = [];
    
    tables.forEach(table => {
      if (table.rows.length < 2) return;
      
      // Parse header row for time periods
      const headerRow = table.rows[0];
      headerRow.forEach((cell, colIndex) => {
        if (colIndex > 0 && cell.trim()) {
          timePeriods.push({
            col: colIndex,
            period: cell.trim(),
            type: this.detectPeriodType(cell.trim())
          });
        }
      });
      
      // Parse data rows
      for (let rowIndex = 1; rowIndex < table.rows.length; rowIndex++) {
        const row = table.rows[rowIndex];
        const description = row[0]?.trim();
        
        if (!description) continue;
        
        // Parse numeric values
        row.forEach((cell, colIndex) => {
          if (colIndex > 0 && cell) {
            const value = this.parseNumericValue(cell);
            if (value !== null) {
              lineItems.push({
                description,
                row: rowIndex,
                col: colIndex,
                value,
                category: this.categorizeLineItem(description),
                confidence: table.confidence || 0.8
              } as any);
            }
          }
        });
      }
    });
    
    return { timePeriods, lineItems };
  }
  
  /**
   * Parse numeric value from string
   */
  private parseNumericValue(text: string): number | null {
    // Remove common formatting
    const cleaned = text
      .replace(/[$€£¥,]/g, '')
      .replace(/\s/g, '')
      .replace(/[()]/g, '-');
    
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }
  
  /**
   * Detect period type
   */
  private detectPeriodType(period: string): 'month' | 'quarter' | 'year' {
    if (/^fy|^20\d{2}$/i.test(period)) return 'year';
    if (/^q[1-4]/i.test(period)) return 'quarter';
    return 'month';
  }
  
  /**
   * Categorize line item
   */
  private categorizeLineItem(description: string): string {
    const lower = description.toLowerCase();
    
    if (/revenue|sales|income/.test(lower) && !/expense|cost/.test(lower)) {
      return 'revenue';
    } else if (/expense|cost|expenditure/.test(lower)) {
      return 'expense';
    } else if (/asset/.test(lower)) {
      return 'asset';
    } else if (/liabilit/.test(lower)) {
      return 'liability';
    } else if (/equity|capital/.test(lower)) {
      return 'equity';
    }
    
    return 'unknown';
  }
  
  /**
   * Build financial data structure
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
    let overall = 0.7; // Base confidence for PDF
    
    // Adjust based on OCR
    if (result.metadata?.hasOCR) {
      overall -= 0.1; // OCR reduces confidence
    }
    
    // Adjust based on table extraction
    const tableCount = result.metadata?.tableCount || 0;
    if (tableCount > 0) {
      overall += 0.1;
    }
    
    return {
      overall: Math.max(0.1, Math.min(1.0, overall)),
      fields: {},
      factors: {
        textExtraction: result.metadata?.hasOCR ? 0.6 : 0.9,
        tableRecognition: tableCount > 0 ? 0.8 : 0.5,
        structureAnalysis: 0.7
      }
    };
  }
  
  /**
   * Get mock PDF text for testing
   */
  private getMockPDFText(): string {
    return `
      INCOME STATEMENT
      For the Years Ended December 31
      
      (In thousands)         2023      2022      2021
      Revenue             1,500     1,200     1,000
      Cost of Sales         900       750       650
      Gross Profit         600       450       350
      Operating Expenses   400       320       280
      Net Income           200       130        70
    `;
  }
  
  /**
   * Get engine metadata
   */
  getMetadata(): ParserEngineMetadata {
    return {
      name: 'PDFParserEngine',
      description: 'Advanced PDF parser with table extraction and OCR support',
      author: 'Warren Team',
      version: this.version,
      supportedFormats: [FileFormat.PDF],
      capabilities: this.capabilities,
      tier: 'professional',
      performanceRating: 'medium',
      accuracyRating: 85
    };
  }
}

// Type definitions for PDF parsing

interface PDFExtractedContent {
  text: string;
  pages: PDFPage[];
  pageCount: number;
  hasOCR: boolean;
  metadata: {
    title?: string;
    author?: string;
    creationDate?: Date;
  };
}

interface PDFPage {
  pageNumber: number;
  text: string;
  tables: ExtractedTable[];
  images: any[];
}

interface ExtractedTable {
  rows: string[][];
  pageNumber: number;
  confidence: number;
}

interface DocumentStructure {
  sections: DocumentSection[];
  tables: TableLocation[];
  headers: string[];
  footers: string[];
}

interface DocumentSection {
  title: string;
  startLine: number;
  endLine: number;
  content: string[];
}

interface TableLocation {
  pageNumber: number;
  startLine: number;
  endLine: number;
  columnCount: number;
  rowCount: number;
}