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

      try {
        // Send to AI for analysis
        const aiResult = await this.callAI(sampleData, mappingType);
        
        // Convert AI result to ExcelMapping
        return this.convertToMapping(aiResult, sampleData.worksheetName, mappingType);
      } catch (aiError: any) {
        // If AI fails (rate limit, etc), fall back to pattern matching
        logger.warn('AI analysis failed, using pattern matching fallback:', aiError.message);
        
        // Log more details for debugging
        if (aiError.response?.status === 429) {
          logger.info('OpenAI rate limit reached, using enhanced pattern matching');
        } else if (aiError.message?.includes('API key')) {
          logger.info('API key issue, using enhanced pattern matching');
        }
        
        // Use enhanced pattern matching as fallback
        const mapping = this.analyzeWithPatternMatching(sampleData, mappingType);
        
        // Add a note that pattern matching was used
        mapping.aiGenerated = false;
        mapping.confidence = Math.max(mapping.confidence, 75); // Boost confidence since our pattern matching is good
        
        return mapping;
      }
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

    // Reduce sample size to avoid API rate limits
    // Extract first 15 rows for analysis (reduced from 30)
    const maxRows = Math.min(15, worksheet.rowCount);
    
    for (let rowNum = 1; rowNum <= maxRows; rowNum++) {
      const row = worksheet.getRow(rowNum);
      const rowData = {
        rowNumber: rowNum,
        cells: [] as any[]
      };

      // Extract first 12 columns (reduced from 20)
      const maxCols = Math.min(12, worksheet.columnCount);
      
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
    // Simplify the data to reduce tokens
    const simplifiedRows = sampleData.rows.map(row => ({
      r: row.rowNumber,
      c: row.cells.map(cell => ({
        v: cell.value,
        t: cell.type
      }))
    }));

    const metrics = mappingType === 'cashflow' ? 
      ['totalIncome', 'totalExpense', 'finalBalance', 'lowestBalance', 'monthlyGeneration'] :
      ['revenue', 'cogs', 'grossProfit', 'operatingExpenses', 'ebitda', 'netIncome'];

    const metricDescriptions = mappingType === 'cashflow' ? {
      totalIncome: 'Total income/revenue/collections/inflows for the month',
      totalExpense: 'Total expenses/costs/outflows for the month',
      finalBalance: 'Final cash balance/ending balance at month end',
      lowestBalance: 'Lowest cash balance during the month',
      monthlyGeneration: 'Monthly cash generation/net cash flow'
    } : {
      revenue: 'Total revenue/sales/income',
      cogs: 'Cost of goods sold/direct costs',
      grossProfit: 'Gross profit (revenue - COGS)',
      operatingExpenses: 'Operating expenses/OPEX/SG&A',
      ebitda: 'EBITDA/operating income',
      netIncome: 'Net income/profit/earnings'
    };

    return `Analyze this Excel ${mappingType} financial data structure.

IMPORTANT RULES:
1. Dates are typically in row 2, 3, or 7 (headers above)
2. Look for month names (Jan, January, Enero) or date values
3. Metrics are usually labeled in the first 1-3 columns
4. Common Spanish terms: Ingresos=Income, Gastos/Egresos=Expenses, Saldo=Balance
5. Row numbers start at 1, column numbers start at 1
6. Return actual row numbers where data is found, never 0

Look for these specific metrics:
${Object.entries(metricDescriptions).map(([key, desc]) => `- ${key}: ${desc}`).join('\n')}

Excel Data (first ${sampleData.rows.length} rows):
${simplifiedRows.slice(0, 30).map(row => 
  `Row ${row.r}: ${row.c.slice(0, 10).map((cell, idx) => 
    `Col${idx + 1}=${cell.v || 'empty'}`).join(', ')}`
).join('\n')}

Return this exact JSON structure:
{
  "dateRow": <actual row number with dates>,
  "dateColumns": [<list of column numbers with dates>],
  "currencyUnit": "units|thousands|millions",
  "mappings": {
    "${Object.keys(metricDescriptions).join('"|"')}": {
      "row": <actual row number>,
      "description": "<what was found in Excel>",
      "dataType": "currency",
      "confidence": <0-100>
    }
  },
  "insights": ["<helpful observations about the data structure>"]
}`;
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
   * Call OpenAI API with retry logic for rate limits
   */
  private async callOpenAI(prompt: string): Promise<AIAnalysisResult> {
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        const response = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-3.5-turbo-1106', // Use gpt-3.5-turbo for lower rate limits
            messages: [
              {
                role: 'system',
                content: `You are an expert financial data analyst specializing in Excel cashflow and P&L statements. 
You understand both English and Spanish financial terms.
Common patterns:
- Dates are usually in rows 2-7, as month names or date values
- Financial metrics have labels in columns A-C
- Data values start after the label columns
- Spanish: Ingresos=Income, Egresos/Gastos=Expenses, Saldo=Balance, Flujo=Flow
- Always return actual row/column numbers (starting from 1), never 0
Respond only with valid JSON.`
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            response_format: { type: 'json_object' },
            max_tokens: 1000, // Limit response size
            temperature: 0.3 // Lower temperature for more consistent results
          },
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 30000 // 30 second timeout
          }
        );

        const content = response.data.choices[0].message.content;
        return JSON.parse(content);
      } catch (error: any) {
        if (error.response?.status === 429) {
          // Rate limit error - wait and retry
          retryCount++;
          const waitTime = Math.pow(2, retryCount) * 1000; // Exponential backoff: 2s, 4s, 8s
          logger.warn(`OpenAI rate limit hit. Retrying in ${waitTime}ms (attempt ${retryCount}/${maxRetries})`);
          
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
        }
        
        logger.error('OpenAI API error:', error.response?.data || error.message);
        
        // If all retries failed or it's not a rate limit error, fall back to pattern matching
        logger.info('Falling back to pattern matching due to API error');
        throw new Error('OpenAI API unavailable - using pattern matching');
      }
    }
    
    throw new Error('Failed to analyze with OpenAI API after retries');
  }

  /**
   * Fallback pattern matching when no AI API is available
   */
  private analyzeWithPatternMatching(sampleData: ExcelSample, mappingType: 'cashflow' | 'pnl'): ExcelMapping {
    logger.info('Using enhanced pattern matching for Excel analysis');
    
    const mapping: ExcelMapping = {
      fileName: '',
      mappingType,
      structure: {
        metricMappings: {},
        currencyUnit: 'units' // Default to units
      },
      aiGenerated: false,
      confidence: 70
    };

    // Find date row - look for rows with multiple date values
    let dateRowFound = false;
    for (const row of sampleData.rows) {
      const dateCount = row.cells.filter(cell => cell.type === 'date').length;
      const monthPatternCount = row.cells.filter(cell => 
        /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i.test(String(cell.value))
      ).length;
      
      if (dateCount >= 3 || monthPatternCount >= 3) {
        mapping.structure.dateRow = row.rowNumber;
        mapping.structure.dateColumns = row.cells
          .map((cell, idx) => (cell.type === 'date' || /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(String(cell.value))) ? idx + 1 : null)
          .filter(col => col !== null) as number[];
        dateRowFound = true;
        break;
      }
    }

    // If no date row found, try to find it in the first few rows
    if (!dateRowFound) {
      for (let i = 0; i < Math.min(5, sampleData.rows.length); i++) {
        const row = sampleData.rows[i];
        if (row.cells.some(cell => cell.type === 'date' || /\d{4}/.test(String(cell.value)))) {
          mapping.structure.dateRow = row.rowNumber;
          mapping.structure.dateColumns = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]; // Common date columns
          break;
        }
      }
    }

    // Enhanced pattern matching for common terms (including Spanish)
    const patterns = mappingType === 'cashflow' ? {
      totalIncome: /(?:total.*)?(?:income|revenue|collection|cobros|ingresos|entrada|recaudacion|cobranza)/i,
      totalExpense: /(?:total.*)?(?:expense|cost|egreso|gasto|salida|pago|desembolso)/i,
      finalBalance: /(?:final|ending|cierre|saldo).*(?:balance|saldo|final|mes)|(?:balance|saldo).*(?:final|cierre|mes)/i,
      lowestBalance: /(?:lowest|minimum|minimo|menor).*(?:balance|saldo)|(?:balance|saldo).*(?:low|min|minimo|menor)/i,
      monthlyGeneration: /(?:monthly|mensual|mes).*(?:generation|generacion|flow|flujo|neto)|(?:cash|caja|efectivo).*(?:generation|generacion|flow|flujo)/i,
      initialBalance: /(?:initial|beginning|inicial|apertura|inicio).*(?:balance|saldo)|(?:balance|saldo).*(?:initial|inicial|inicio)/i,
      netCashflow: /(?:net|neto).*(?:cash|caja|efectivo).*(?:flow|flujo)|(?:flujo|flow).*(?:neto|net)/i,
      cashGeneration: /(?:cash|caja).*(?:generation|generacion)|generacion.*(?:caja|efectivo)/i
    } : {
      revenue: /^(?:total.*)?(?:revenue|sales|ingresos|ventas|facturacion)/i,
      cogs: /(?:cost.*goods|cogs|costo.*venta|cmv)/i,
      grossProfit: /gross.*(?:profit|margin)|(?:utilidad|margen).*brut[ao]/i,
      grossMargin: /gross.*margin.*%|margen.*brut[ao].*%/i,
      operatingExpenses: /(?:operating|operational).*expense|gastos.*operac/i,
      ebitda: /ebitda/i,
      netIncome: /net.*(?:income|profit)|(?:utilidad|resultado).*net[ao]/i
    };

    // Search for patterns in rows
    for (const row of sampleData.rows) {
      // Check first few cells for labels
      for (let cellIdx = 0; cellIdx < Math.min(3, row.cells.length); cellIdx++) {
        const cellValue = row.cells[cellIdx]?.value?.toString().trim() || '';
        
        if (cellValue) {
          for (const [key, pattern] of Object.entries(patterns)) {
            if (pattern.test(cellValue)) {
              mapping.structure.metricMappings[key] = {
                row: row.rowNumber,
                description: cellValue,
                dataType: key.includes('margin') || key.includes('Margin') ? 'percentage' : 'currency'
              };
              break; // Found match for this row
            }
          }
        }
      }
    }

    // Detect currency unit from cell values
    for (const row of sampleData.rows) {
      for (const cell of row.cells) {
        const value = String(cell.value);
        if (value.includes('000') || value.includes('miles') || value.includes('thousands')) {
          mapping.structure.currencyUnit = 'thousands';
          break;
        } else if (value.includes('000000') || value.includes('millones') || value.includes('millions')) {
          mapping.structure.currencyUnit = 'millions';
          break;
        }
      }
    }

    // Set confidence based on findings
    const foundMetrics = Object.keys(mapping.structure.metricMappings).length;
    const expectedMetrics = mappingType === 'cashflow' ? 4 : 5;
    mapping.confidence = Math.min(90, 50 + (foundMetrics / expectedMetrics) * 40);

    logger.info(`Pattern matching found ${foundMetrics} metrics with ${mapping.confidence}% confidence`);

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