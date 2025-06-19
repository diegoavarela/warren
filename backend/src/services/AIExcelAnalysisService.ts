import ExcelJS from 'exceljs';
import { logger } from '../utils/logger';
import axios from 'axios';

interface ExcelSample {
  rows: Array<{
    rowNumber: number;
    cells: Array<{
      column: string;
      value: any;
      type: string;
    }>;
  }>;
  worksheetName: string;
  totalRows: number;
  totalColumns: number;
}

interface AIAnalysisResult {
  dateRow?: number;
  dateColumns?: number[];
  currencyUnit?: string;
  exchangeRateRow?: number;
  mappings: {
    [key: string]: {
      row: number;
      description: string;
      dataType: 'currency' | 'percentage' | 'number' | 'date';
      confidence: number;
    };
  };
  insights: string[];
}

export interface ExcelMapping {
  id?: string;
  companyId?: string;
  fileName: string;
  mappingType: 'cashflow' | 'pnl';
  structure: {
    dateRow?: number;
    dateColumns?: number[];
    currencyUnit?: string;
    metricMappings: {
      [key: string]: {
        row: number;
        column?: number;
        description: string;
        dataType: 'currency' | 'percentage' | 'number' | 'date';
      };
    };
  };
  aiGenerated: boolean;
  confidence: number;
  lastValidated?: Date;
}

export class AIExcelAnalysisService {
  private static instance: AIExcelAnalysisService;
  private apiKey: string;
  private apiType: 'claude' | 'openai';

  private constructor() {
    // Check for API keys in environment
    if (process.env.ANTHROPIC_API_KEY) {
      this.apiKey = process.env.ANTHROPIC_API_KEY;
      this.apiType = 'claude';
    } else if (process.env.OPENAI_API_KEY) {
      this.apiKey = process.env.OPENAI_API_KEY;
      this.apiType = 'openai';
    } else {
      logger.warn('No AI API key found. AI Excel analysis will be limited.');
      this.apiKey = '';
      this.apiType = 'claude';
    }
  }

  static getInstance(): AIExcelAnalysisService {
    if (!AIExcelAnalysisService.instance) {
      AIExcelAnalysisService.instance = new AIExcelAnalysisService();
    }
    return AIExcelAnalysisService.instance;
  }

  /**
   * Analyze Excel file structure using AI
   */
  async analyzeExcelStructure(buffer: Buffer, mappingType: 'cashflow' | 'pnl'): Promise<ExcelMapping> {
    try {
      logger.info(`Starting AI analysis for ${mappingType} Excel file`);

      // Extract sample data from Excel
      const sampleData = await this.extractSampleData(buffer);
      
      // If no API key, use pattern matching
      if (!this.apiKey) {
        return this.analyzeWithPatternMatching(sampleData, mappingType);
      }

      // Send to AI for analysis
      const aiResult = await this.callAI(sampleData, mappingType);
      
      // Convert AI result to ExcelMapping
      return this.convertToMapping(aiResult, sampleData.worksheetName, mappingType);
    } catch (error) {
      logger.error('Error in AI Excel analysis:', error);
      throw error;
    }
  }

  /**
   * Extract sample data from Excel file
   */
  private async extractSampleData(buffer: Buffer): Promise<ExcelSample> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('No worksheet found in Excel file');
    }

    const sample: ExcelSample = {
      worksheetName: worksheet.name,
      totalRows: worksheet.rowCount,
      totalColumns: worksheet.columnCount,
      rows: []
    };

    // Extract first 30 rows for analysis
    const maxRows = Math.min(30, worksheet.rowCount);
    
    for (let rowNum = 1; rowNum <= maxRows; rowNum++) {
      const row = worksheet.getRow(rowNum);
      const rowData = {
        rowNumber: rowNum,
        cells: [] as any[]
      };

      // Extract first 20 columns
      const maxCols = Math.min(20, worksheet.columnCount);
      
      for (let colNum = 1; colNum <= maxCols; colNum++) {
        const cell = row.getCell(colNum);
        const value = cell.value;
        
        rowData.cells.push({
          column: this.getColumnLetter(colNum),
          value: this.getCellValue(value),
          type: this.detectCellType(value)
        });
      }
      
      sample.rows.push(rowData);
    }

    return sample;
  }

  /**
   * Call AI API for analysis
   */
  private async callAI(sampleData: ExcelSample, mappingType: 'cashflow' | 'pnl'): Promise<AIAnalysisResult> {
    const prompt = this.buildPrompt(sampleData, mappingType);
    
    if (this.apiType === 'claude') {
      return this.callClaude(prompt);
    } else {
      return this.callOpenAI(prompt);
    }
  }

  /**
   * Build prompt for AI analysis
   */
  private buildPrompt(sampleData: ExcelSample, mappingType: 'cashflow' | 'pnl'): string {
    const typeSpecificInstructions = mappingType === 'cashflow' ? `
      - Total Income/Revenue/Collections rows
      - Total Expenses/Costs/Outflows rows
      - Balance rows (Initial, Final, Lowest)
      - Cash generation/flow rows
      - Bank account balances
      - Investment values
    ` : `
      - Revenue/Sales rows
      - Cost of Goods Sold (COGS) rows
      - Gross Profit and Gross Margin rows
      - Operating Expenses rows
      - EBITDA rows
      - Net Income/Profit rows
      - Margin percentage rows
    `;

    return `Analyze this Excel financial data and identify the structure.

Excel Info:
- Worksheet: ${sampleData.worksheetName}
- Total Rows: ${sampleData.totalRows}
- Total Columns: ${sampleData.totalColumns}

Sample Data (first 30 rows):
${JSON.stringify(sampleData.rows, null, 2)}

Please identify:
1. Which row contains dates (month headers)?
2. Which columns contain the date values?
3. What currency/unit is being used?
4. Find these ${mappingType} metrics:
${typeSpecificInstructions}

Return a JSON object with the structure and your confidence level (0-100) for each identification.`;
  }

  /**
   * Call Claude API
   */
  private async callClaude(prompt: string): Promise<AIAnalysisResult> {
    try {
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-3-sonnet-20240229',
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: prompt
          }],
          system: 'You are a financial data analyst expert at understanding Excel structures. Always respond with valid JSON.'
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          }
        }
      );

      const content = response.data.content[0].text;
      return JSON.parse(content);
    } catch (error) {
      logger.error('Claude API error:', error);
      throw new Error('Failed to analyze with Claude API');
    }
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(prompt: string): Promise<AIAnalysisResult> {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a financial data analyst expert at understanding Excel structures. Always respond with valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const content = response.data.choices[0].message.content;
      return JSON.parse(content);
    } catch (error) {
      logger.error('OpenAI API error:', error);
      throw new Error('Failed to analyze with OpenAI API');
    }
  }

  /**
   * Fallback pattern matching when no AI API is available
   */
  private analyzeWithPatternMatching(sampleData: ExcelSample, mappingType: 'cashflow' | 'pnl'): ExcelMapping {
    logger.info('Using pattern matching for Excel analysis (no AI API)');
    
    const mapping: ExcelMapping = {
      fileName: '',
      mappingType,
      structure: {
        metricMappings: {}
      },
      aiGenerated: false,
      confidence: 50
    };

    // Find date row
    for (const row of sampleData.rows) {
      const dateCount = row.cells.filter(cell => cell.type === 'date').length;
      if (dateCount >= 3) {
        mapping.structure.dateRow = row.rowNumber;
        mapping.structure.dateColumns = row.cells
          .map((cell, idx) => cell.type === 'date' ? idx + 1 : null)
          .filter(col => col !== null) as number[];
        break;
      }
    }

    // Pattern matching for common terms
    const patterns = mappingType === 'cashflow' ? {
      totalIncome: /total.*(?:income|revenue|collection|cobros)/i,
      totalExpense: /total.*(?:expense|cost|egreso)/i,
      finalBalance: /(?:final|ending).*balance|balance.*final/i,
      lowestBalance: /lowest.*balance|balance.*(?:low|min)/i,
      monthlyGeneration: /monthly.*(?:generation|flow)|cash.*generation/i
    } : {
      revenue: /^(?:total.*)?(?:revenue|sales|ingresos)/i,
      cogs: /(?:cost.*goods|cogs|costo.*venta)/i,
      grossProfit: /gross.*profit|utilidad.*bruta/i,
      operatingExpenses: /operating.*expense|gastos.*operac/i,
      netIncome: /net.*(?:income|profit)|utilidad.*neta/i
    };

    // Search for patterns in rows
    for (const row of sampleData.rows) {
      const firstCellValue = row.cells[0]?.value?.toString() || '';
      
      for (const [key, pattern] of Object.entries(patterns)) {
        if (pattern.test(firstCellValue)) {
          mapping.structure.metricMappings[key] = {
            row: row.rowNumber,
            description: firstCellValue,
            dataType: 'currency'
          };
        }
      }
    }

    return mapping;
  }

  /**
   * Convert AI result to ExcelMapping
   */
  private convertToMapping(aiResult: AIAnalysisResult, worksheetName: string, mappingType: 'cashflow' | 'pnl'): ExcelMapping {
    const mapping: ExcelMapping = {
      fileName: '',
      mappingType,
      structure: {
        dateRow: aiResult.dateRow,
        dateColumns: aiResult.dateColumns,
        currencyUnit: aiResult.currencyUnit,
        metricMappings: {}
      },
      aiGenerated: true,
      confidence: 0
    };

    // Convert AI mappings to our format
    let totalConfidence = 0;
    let mappingCount = 0;

    for (const [key, value] of Object.entries(aiResult.mappings)) {
      mapping.structure.metricMappings[key] = {
        row: value.row,
        description: value.description,
        dataType: value.dataType
      };
      totalConfidence += value.confidence;
      mappingCount++;
    }

    mapping.confidence = mappingCount > 0 ? Math.round(totalConfidence / mappingCount) : 0;

    return mapping;
  }

  /**
   * Validate extracted data using mapping
   */
  async validateMapping(mapping: ExcelMapping, buffer: Buffer): Promise<{
    isValid: boolean;
    issues: string[];
    preview: any;
  }> {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const worksheet = workbook.worksheets[0];

      const issues: string[] = [];
      const preview: any = {};

      // Validate date row
      if (mapping.structure.dateRow) {
        const dateRow = worksheet.getRow(mapping.structure.dateRow);
        const dateCount = mapping.structure.dateColumns?.filter(col => {
          const value = dateRow.getCell(col).value;
          return value instanceof Date;
        }).length || 0;

        if (dateCount < 3) {
          issues.push(`Date row ${mapping.structure.dateRow} contains only ${dateCount} valid dates`);
        }
      }

      // Validate and preview each mapping
      for (const [key, config] of Object.entries(mapping.structure.metricMappings)) {
        const row = worksheet.getRow(config.row);
        const values: any[] = [];

        // Get values from date columns
        if (mapping.structure.dateColumns) {
          for (const col of mapping.structure.dateColumns.slice(0, 3)) {
            const value = this.getCellValue(row.getCell(col).value);
            values.push(value);
          }
        }

        preview[key] = {
          description: config.description,
          sampleValues: values,
          hasData: values.some(v => v !== null && v !== 0)
        };

        if (!preview[key].hasData) {
          issues.push(`No data found for ${key} in row ${config.row}`);
        }
      }

      return {
        isValid: issues.length === 0,
        issues,
        preview
      };
    } catch (error) {
      logger.error('Error validating mapping:', error);
      return {
        isValid: false,
        issues: ['Failed to validate mapping'],
        preview: {}
      };
    }
  }

  /**
   * Helper functions
   */
  private getCellValue(value: any): any {
    if (value === null || value === undefined) return null;
    
    if (typeof value === 'number') return value;
    if (value instanceof Date) return value;
    
    if (typeof value === 'object' && 'result' in value) {
      return value.result;
    }
    
    if (typeof value === 'string') {
      const num = parseFloat(value.replace(/[^0-9.-]/g, ''));
      return isNaN(num) ? value : num;
    }
    
    return value;
  }

  private detectCellType(value: any): string {
    if (value instanceof Date) return 'date';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'string') {
      if (/^\d+\.?\d*%$/.test(value)) return 'percentage';
      if (/^[\$€£¥₹]/.test(value)) return 'currency';
    }
    return 'text';
  }

  private getColumnLetter(col: number): string {
    let letter = '';
    while (col > 0) {
      letter = String.fromCharCode(65 + ((col - 1) % 26)) + letter;
      col = Math.floor((col - 1) / 26);
    }
    return letter;
  }
}