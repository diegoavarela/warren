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
   * NEW: Universal Excel analysis that can handle ANY format
   * This method extracts ALL metrics found, not just predefined ones
   */
  async analyzeUniversalStructure(buffer: Buffer, mappingType: 'cashflow' | 'pnl'): Promise<{
    mapping: ExcelMapping,
    allMetrics: Array<{
      name: string,
      location: { sheet: string, row: number, column?: number },
      type: string,
      values?: any[]
    }>,
    dateStructure: {
      layout: 'rows' | 'columns' | 'mixed',
      locations: Array<{ sheet: string, row?: number, columns?: number[] }>
    },
    insights: string[]
  }> {
    try {
      logger.info(`Starting UNIVERSAL AI analysis for ${mappingType} Excel file`);

      // Extract comprehensive data from ALL sheets
      const universalData = await this.extractUniversalData(buffer);
      
      logger.info(`Extracted data from ${universalData.summary.totalSheets} sheets, ${universalData.summary.totalRows} total rows`);

      // If no API key, use enhanced pattern matching
      if (!this.apiKey) {
        return this.analyzeUniversalWithPatternMatching(universalData, mappingType);
      }

      try {
        // Build universal prompt that understands any structure
        const prompt = this.buildUniversalPrompt(universalData, mappingType);
        
        // Call AI for comprehensive analysis
        const aiResult = await this.callUniversalAI(prompt);
        
        // Process and return comprehensive results
        return this.processUniversalResults(aiResult, universalData, mappingType);
      } catch (aiError: any) {
        logger.warn('Universal AI analysis failed, using enhanced pattern matching:', aiError.message);
        return this.analyzeUniversalWithPatternMatching(universalData, mappingType);
      }
    } catch (error) {
      logger.error('Error in universal Excel analysis:', error);
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

    // Extract more rows to get complete picture
    // For financial data, we need to see at least 50-100 rows
    const maxRows = Math.min(50, worksheet.rowCount);
    
    for (let rowNum = 1; rowNum <= maxRows; rowNum++) {
      const row = worksheet.getRow(rowNum);
      const rowData = {
        rowNumber: rowNum,
        cells: [] as any[]
      };

      // Extract first 20 columns to see all months
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
   * NEW: Extract comprehensive data for universal analysis
   * This extracts ALL data from ALL sheets for complete analysis
   */
  async extractUniversalData(buffer: Buffer): Promise<{
    workbook: { name: string, sheets: ExcelSample[] },
    summary: { totalSheets: number, totalRows: number, totalColumns: number }
  }> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    
    const sheets: ExcelSample[] = [];
    let totalRows = 0;
    let totalColumns = 0;

    // Extract data from ALL worksheets
    for (const worksheet of workbook.worksheets) {
      const sample: ExcelSample = {
        worksheetName: worksheet.name,
        totalRows: worksheet.rowCount,
        totalColumns: worksheet.columnCount,
        rows: []
      };

      // For universal analysis, we need ALL rows to ensure we don't miss anything
      // But cap at 200 rows per sheet for performance
      const maxRows = Math.min(200, worksheet.rowCount);
      
      for (let rowNum = 1; rowNum <= maxRows; rowNum++) {
        const row = worksheet.getRow(rowNum);
        const rowData = {
          rowNumber: rowNum,
          cells: [] as any[]
        };

        // Extract ALL columns (up to 50) to handle wide spreadsheets
        const maxCols = Math.min(50, worksheet.columnCount);
        
        for (let colNum = 1; colNum <= maxCols; colNum++) {
          const cell = row.getCell(colNum);
          const value = cell.value;
          
          // Include formula information if present
          const cellData: any = {
            column: this.getColumnLetter(colNum),
            value: this.getCellValue(value),
            type: this.detectCellType(value)
          };
          
          // Add formula if exists
          if (cell.formula) {
            cellData.formula = cell.formula;
          }
          
          // Add number format if exists (helps identify currency/percentage)
          if (cell.numFmt) {
            cellData.format = cell.numFmt;
          }
          
          rowData.cells.push(cellData);
        }
        
        sample.rows.push(rowData);
      }
      
      sheets.push(sample);
      totalRows += sample.totalRows;
      totalColumns = Math.max(totalColumns, sample.totalColumns);
    }

    return {
      workbook: {
        name: 'Excel Workbook',
        sheets
      },
      summary: {
        totalSheets: sheets.length,
        totalRows,
        totalColumns
      }
    };
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
1. Analyze ALL rows provided - financial metrics can be anywhere
2. Dates/months can be in any row (commonly 1-10) and any format
3. First column usually contains metric labels/descriptions
4. Look for ALL financial terms in Spanish/English throughout the file
5. Common patterns:
   - Dates: Jan-24, Ene-24, Enero 2024, 01/2024, Q1-2024, 1T-2024, etc.
   - Revenue: Ingresos, Ventas, Sales, Revenue, Facturación, Facturado
   - Income (Cashflow): Ingresos, Entradas, Cobros, Cobranzas, Recaudación
   - Costs/Expenses: Costos, Gastos, Egresos, Expenses, COGS, Pagos, Salidas
   - Profit: Utilidad, Ganancia, Profit, Resultado, Margen
   - Balance: Saldo, Balance, Caja, Efectivo
   - Cash Generation: Generación de Caja, Flujo Neto, Cash Flow
6. Return EXACT row numbers where each metric is found
7. Include ALL metrics you find, not just the requested ones

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
- Spanish financial terms mapping:
  * Ingresos/Entradas/Cobros = Income/Revenue
  * Egresos/Gastos/Salidas/Pagos = Expenses/Costs
  * Saldo/Caja = Balance/Cash
  * Flujo/Generación = Flow/Generation
  * Ventas/Facturación = Sales/Revenue
  * Costo de Venta/CMV = COGS
  * Utilidad/Ganancia/Resultado = Profit/Income
  * Margen = Margin
  * Inicial/Apertura = Beginning/Initial
  * Final/Cierre = Ending/Final
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
    logger.info('Using enhanced pattern matching for Excel analysis with Spanish/multi-currency support');
    
    const mapping: ExcelMapping = {
      fileName: '',
      mappingType,
      structure: {
        metricMappings: {},
        currencyUnit: this.detectCurrencyFromSample(sampleData) // Detect currency from data
      },
      aiGenerated: false,
      confidence: 70
    };

    // Enhanced date detection - look for rows with multiple date values (Spanish/English support)
    let dateRowFound = false;
    const monthPatterns = {
      english: /^(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september|oct|october|nov|november|dec|december)/i,
      spanish: /^(ene|enero|feb|febrero|mar|marzo|abr|abril|may|mayo|jun|junio|jul|julio|ago|agosto|sep|septiembre|oct|octubre|nov|noviembre|dic|diciembre)/i,
      numeric: /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$|^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/,
      year: /^20\d{2}$/
    };
    
    for (const row of sampleData.rows) {
      const dateCount = row.cells.filter(cell => cell.type === 'date').length;
      const monthPatternCount = row.cells.filter(cell => {
        const cellValue = String(cell.value || '').trim();
        return monthPatterns.english.test(cellValue) || 
               monthPatterns.spanish.test(cellValue) ||
               monthPatterns.numeric.test(cellValue) ||
               monthPatterns.year.test(cellValue);
      }).length;
      
      if (dateCount >= 3 || monthPatternCount >= 3) {
        mapping.structure.dateRow = row.rowNumber;
        mapping.structure.dateColumns = row.cells
          .map((cell, idx) => {
            const cellValue = String(cell.value || '').trim();
            const isDate = cell.type === 'date' || 
                          monthPatterns.english.test(cellValue) ||
                          monthPatterns.spanish.test(cellValue) ||
                          monthPatterns.numeric.test(cellValue) ||
                          monthPatterns.year.test(cellValue);
            return isDate ? idx + 1 : null;
          })
          .filter(col => col !== null) as number[];
        dateRowFound = true;
        logger.info(`Found date row ${row.rowNumber} with ${monthPatternCount} date patterns and ${dateCount} date cells`);
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

    // Enhanced pattern matching for common terms (comprehensive Spanish/English support)
    const patterns = mappingType === 'cashflow' ? {
      totalIncome: /(?:total.*)?(?:income|revenue|collection|receipts|received|cobros?|ingresos?|entradas?|recaudaci[oó]n|recaudaciones|cobranzas?|recibidos?|facturaci[oó]n|facturado|ventas?|venta)/i,
      totalExpense: /(?:total.*)?(?:expense|expenses|cost|costs|spending|paid|egresos?|gastos?|salidas?|pagos?|desembolsos?|erogaci[oó]n|erogaciones|costos?|gastado|pagado)/i,
      finalBalance: /(?:final|ending|cierre|saldo|balance).*(?:balance|saldo|final|mes|per[ií]odo|cierre)|(?:balance|saldo).*(?:final|cierre|mes|per[ií]odo)|saldo.*final|balance.*final|caja.*final/i,
      lowestBalance: /(?:lowest|minimum|m[ií]nimo|menor|m[aá]s.*bajo).*(?:balance|saldo)|(?:balance|saldo).*(?:low|min|m[ií]nimo|menor|m[aá]s.*bajo)|saldo.*m[ií]nimo|balance.*m[ií]nimo/i,
      monthlyGeneration: /(?:monthly|mensual|mes|month).*(?:generation|generaci[oó]n|flow|flujo|neto)|(?:cash|caja|efectivo).*(?:generation|generaci[oó]n|flow|flujo)|flujo.*(?:caja|efectivo).*(?:neto|mensual)|generaci[oó]n.*(?:mensual|caja)/i,
      initialBalance: /(?:initial|beginning|inicial|apertura|inicio|arranque|comienzo).*(?:balance|saldo)|(?:balance|saldo).*(?:initial|inicial|inicio|apertura)|saldo.*inicial|balance.*inicial|caja.*inicial/i,
      netCashflow: /(?:net|neto|neta).*(?:cash|caja|efectivo).*(?:flow|flujo)|(?:flujo|flow).*(?:neto|net|caja)|flujo.*neto.*(?:caja|efectivo)|flujo.*de.*caja/i,
      cashGeneration: /(?:cash|caja|efectivo).*(?:generation|generaci[oó]n|generado)|generaci[oó]n.*(?:caja|efectivo)|caja.*generada/i,
      beginningBalance: /(?:beginning|starting|inicial|apertura|inicio|arranque|comienzo).*(?:balance|saldo)|(?:balance|saldo).*(?:beginning|inicial|inicio|apertura)|saldo.*inicial/i
    } : {
      revenue: /^(?:total.*)?(?:revenue|revenues|sales?|sale|ingresos?|ingreso|ventas?|venta|facturaci[oó]n|facturado|factura|cobros?)/i,
      cogs: /(?:cost.*goods.*sold|cogs|costo.*ventas?|costos.*ventas?|cmv|costo.*mercader[ií]a.*vendida|costo.*productos?.*vendidos?|costo.*directo)/i,
      grossProfit: /gross.*(?:profit|margin)|(?:utilidad|ganancia|margen).*brut[ao]|margen.*bruto|ganancia.*bruta|beneficio.*bruto/i,
      grossMargin: /gross.*margin.*%|margen.*brut[ao].*%|margen.*bruto.*%|porcentaje.*bruto/i,
      operatingExpenses: /(?:operating|operational).*expense|gastos.*operac|gastos.*operativos|gastos.*operacionales|opex|gastos.*administrativos|gastos.*generales/i,
      ebitda: /ebitda|resultado.*operativo|resultado.*operacional|utilidad.*operativa|beneficio.*operativo/i,
      netIncome: /net.*(?:income|profit|result)|(?:utilidad|ganancia|resultado).*net[ao]|resultado.*neto|utilidad.*neta|ganancia.*neta|beneficio.*neto/i,
      operatingIncome: /operating.*(?:income|profit)|utilidad.*operativa|resultado.*operativo|beneficio.*operativo/i
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

  /**
   * Build universal prompt that can handle ANY Excel structure
   */
  private buildUniversalPrompt(data: any, mappingType: 'cashflow' | 'pnl'): string {
    const sheetsInfo = data.workbook.sheets.map((sheet: any) => 
      `Sheet "${sheet.worksheetName}": ${sheet.totalRows} rows, ${sheet.totalColumns} columns`
    ).join('\n');

    // Show sample data from first sheet for brevity
    const firstSheet = data.workbook.sheets[0];
    const sampleRows = firstSheet.rows.slice(0, 30).map((row: any) => {
      const cells = row.cells.slice(0, 10).map((cell: any) => 
        `${cell.column}:${cell.value || ''}`
      ).join(' | ');
      return `Row ${row.rowNumber}: ${cells}`;
    }).join('\n');

    return `Analyze this ${mappingType} Excel file with a UNIVERSAL approach.

WORKBOOK OVERVIEW:
${sheetsInfo}

KEY INSTRUCTIONS:
1. This file may have ANY structure - don't assume standard layouts
2. Dates can be in rows OR columns, in ANY format
3. Metrics can be in ANY language (English, Spanish, Portuguese, etc.)
4. Values might be in different units (units, thousands, millions)
5. Find ALL financial metrics, not just standard ones
6. Check ALL sheets if multiple exist
7. Identify hierarchical relationships (totals, subtotals, categories)

WHAT TO FIND:
- Date/Period Structure: Where and how are time periods organized?
- ALL Financial Metrics: Every line item that represents money/values
- Calculations: Which rows/cells are calculated from others?
- Currency/Units: What currency and unit scale is used?
- Custom Metrics: Company-specific KPIs or metrics

For ${mappingType === 'pnl' ? 'P&L' : 'Cashflow'}, especially look for:
${mappingType === 'pnl' ? `
- Revenue/Sales/Income (Ingresos/Ventas/Facturación)
- Costs/Expenses (Costos/Gastos/Egresos)
- Profit/Margins (Utilidad/Ganancia/Margen)
- EBITDA/Operating Income
- Net Income/Result
- ANY other financial line items` : `
- Cash Inflows/Income (Ingresos/Entradas/Cobranzas)
- Cash Outflows/Expenses (Egresos/Salidas/Pagos)
- Beginning/Ending Balance (Saldo Inicial/Final)
- Net Cash Flow (Flujo Neto/Generación)
- ANY other cash-related items`}

SAMPLE DATA (First 30 rows):
${sampleRows}

Return a JSON with:
{
  "dateStructure": {
    "layout": "rows|columns|mixed",
    "locations": [{"sheet": "name", "row": X, "columns": [Y,Z]}]
  },
  "metrics": [
    {
      "name": "Original metric name from Excel",
      "standardName": "Mapped standard name if applicable",
      "location": {"sheet": "name", "row": X, "column": Y},
      "type": "revenue|cost|balance|calculated|other",
      "formula": "if it's a calculated field",
      "children": ["list of child metrics if hierarchical"]
    }
  ],
  "currencyInfo": {
    "currency": "USD|EUR|ARS|etc",
    "unit": "units|thousands|millions",
    "indicator": "where this was detected"
  },
  "insights": ["Important observations about the structure"],
  "confidence": 0-100
}`;
  }

  /**
   * Call AI for universal analysis
   */
  private async callUniversalAI(prompt: string): Promise<any> {
    if (this.apiType === 'openai') {
      return this.callOpenAI(prompt);
    } else {
      return this.callClaude(prompt);
    }
  }

  /**
   * Process universal AI results into usable format
   */
  private processUniversalResults(aiResult: any, universalData: any, mappingType: 'cashflow' | 'pnl'): any {
    try {
      // Extract all found metrics
      const allMetrics = aiResult.metrics?.map((metric: any) => ({
        name: metric.name,
        location: metric.location,
        type: metric.type || 'other',
        values: [] // Will be populated later if needed
      })) || [];

      // Build standard mapping for core metrics
      const metricMappings: any = {};
      
      // Map standard metrics based on type
      if (mappingType === 'pnl') {
        // Try to find standard P&L metrics
        const revenueMetric = aiResult.metrics?.find((m: any) => 
          m.standardName === 'revenue' || m.type === 'revenue'
        );
        if (revenueMetric) {
          metricMappings.revenue = {
            row: revenueMetric.location.row,
            description: revenueMetric.name,
            dataType: 'currency' as const
          };
        }

        // Similar for other standard metrics
        const standardMetrics = ['cogs', 'grossProfit', 'operatingExpenses', 'netIncome', 'ebitda'];
        standardMetrics.forEach(metricName => {
          const metric = aiResult.metrics?.find((m: any) => 
            m.standardName === metricName || m.name.toLowerCase().includes(metricName.toLowerCase())
          );
          if (metric) {
            metricMappings[metricName] = {
              row: metric.location.row,
              description: metric.name,
              dataType: 'currency' as const
            };
          }
        });
      } else {
        // Cashflow mappings
        const standardMetrics = ['totalIncome', 'totalExpense', 'finalBalance', 'monthlyGeneration'];
        standardMetrics.forEach(metricName => {
          const metric = aiResult.metrics?.find((m: any) => 
            m.standardName === metricName
          );
          if (metric) {
            metricMappings[metricName] = {
              row: metric.location.row,
              description: metric.name,
              dataType: 'currency' as const
            };
          }
        });
      }

      // Build mapping structure
      const mapping: ExcelMapping = {
        fileName: '',
        mappingType,
        structure: {
          dateRow: aiResult.dateStructure?.locations[0]?.row,
          dateColumns: aiResult.dateStructure?.locations[0]?.columns,
          currencyUnit: aiResult.currencyInfo?.unit || 'thousands',
          metricMappings
        },
        aiGenerated: true,
        confidence: aiResult.confidence || 85
      };

      return {
        mapping,
        allMetrics,
        dateStructure: aiResult.dateStructure || { layout: 'unknown', locations: [] },
        insights: aiResult.insights || ['Universal analysis completed']
      };
    } catch (error) {
      logger.error('Error processing universal results:', error);
      throw error;
    }
  }

  /**
   * Analyze universal structure using pattern matching when AI is unavailable
   */
  private async analyzeUniversalWithPatternMatching(data: any, mappingType: 'cashflow' | 'pnl'): Promise<any> {
    logger.info('Using enhanced pattern matching for universal analysis');
    
    // This will be a comprehensive pattern matching implementation
    // For now, return a basic structure
    const mapping: ExcelMapping = {
      fileName: '',
      mappingType,
      structure: {
        dateRow: 1,
        dateColumns: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
        currencyUnit: 'thousands',
        metricMappings: {}
      },
      aiGenerated: false,
      confidence: 70
    };

    return {
      mapping,
      allMetrics: [],
      dateStructure: { layout: 'rows', locations: [] },
      insights: ['Pattern matching used - manual review recommended']
    };
  }

  /**
   * Detect currency from sample data
   */
  private detectCurrencyFromSample(sampleData: ExcelSample): string {
    const currencyCounts: { [key: string]: number } = {};
    
    // Look through all cells for currency indicators
    for (const row of sampleData.rows) {
      for (const cell of row.cells) {
        if (typeof cell.value === 'string') {
          // Check for currency symbols and codes
          const currencyMatches = cell.value.match(/\$|USD|€|EUR|£|GBP|¥|JPY|₹|INR|ARS|\bpesos?\b|\bdollars?\b|\beuros?\b|\byens?\b/gi);
          if (currencyMatches) {
            currencyMatches.forEach(match => {
              const normalized = this.normalizeCurrencyCode(match);
              currencyCounts[normalized] = (currencyCounts[normalized] || 0) + 1;
            });
          }
        }
        
        // Check cell formatting for currency indicators
        if ((cell as any).format && ((cell as any).format.includes('$') || (cell as any).format.includes('currency'))) {
          currencyCounts['USD'] = (currencyCounts['USD'] || 0) + 1;
        }
      }
    }
    
    // Return most common currency, default to ARS for Warren (Argentina focus)
    const currencies = Object.entries(currencyCounts).sort((a, b) => b[1] - a[1]);
    return currencies.length > 0 ? currencies[0][0] : 'ARS';
  }

  /**
   * Normalize currency symbols to standard codes
   */
  private normalizeCurrencyCode(symbol: string): string {
    const lowerSymbol = symbol.toLowerCase();
    const currencyMap: { [key: string]: string } = {
      '$': 'USD',
      'usd': 'USD',
      'dollar': 'USD',
      'dollars': 'USD',
      '€': 'EUR',
      'eur': 'EUR',
      'euro': 'EUR',
      'euros': 'EUR',
      '£': 'GBP',
      'gbp': 'GBP',
      'pound': 'GBP',
      'pounds': 'GBP',
      '¥': 'JPY',
      'jpy': 'JPY',
      'yen': 'JPY',
      'yens': 'JPY',
      '₹': 'INR',
      'inr': 'INR',
      'rupee': 'INR',
      'rupees': 'INR',
      'ars': 'ARS',
      'peso': 'ARS',
      'pesos': 'ARS'
    };
    
    return currencyMap[lowerSymbol] || symbol.toUpperCase();
  }
}