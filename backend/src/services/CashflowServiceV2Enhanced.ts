import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { ExtendedFinancialService } from './ExtendedFinancialService';
import { logger } from '../utils/logger';

interface MonthlyMetrics {
  date: Date;
  month: string;
  columnIndex: number;
  columnLetter: string;
  totalInflow: number;
  totalOutflow: number;
  finalBalance: number;
  lowestBalance: number;
  monthlyGeneration: number;
  currency?: string;
  originalCurrency?: string;
  exchangeRate?: number;
}

interface FormatDetectionResult {
  isFormat: boolean;
  confidence: number;
  detectedPatterns: {
    dateLocation?: { row: number; columns: number[] };
    incomeLocation?: { row: number; label: string };
    expenseLocation?: { row: number; label: string };
    balanceLocation?: { row: number; label: string };
    currency?: string;
    language?: 'en' | 'es' | 'mixed';
  };
}

// Enhanced patterns for both English and Spanish
const FINANCIAL_PATTERNS = {
  dates: {
    monthNames: /^(ene|enero|jan|january|feb|febrero|mar|marzo|apr|abril|may|mayo|jun|junio|jul|julio|aug|agosto|sep|septiembre|oct|octubre|nov|noviembre|dic|diciembre)/i,
    dateFormats: /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$|^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/,
    year: /^20\d{2}$/
  },
  income: {
    exact: /^(total income|ingresos totales|total ingresos|entradas totales)$/i,
    contains: /(income|revenue|ingresos?|entradas?|cobros?|ventas?|facturaci[óo]n|recaudaci[óo]n)/i,
    exclude: /(expense|gasto|net|neto)/i
  },
  expenses: {
    exact: /^(total expense[s]?|gastos totales|total gastos|egresos totales|salidas totales)$/i,
    contains: /(expense|cost|gastos?|egresos?|salidas?|pagos?|costos?|desembolsos?)/i,
    exclude: /(income|ingreso|revenue|net|neto)/i
  },
  balance: {
    exact: /^(final balance|ending balance|saldo final|balance final|caja final)$/i,
    contains: /(balance|saldo|caja|efectivo|cash|position|posici[óo]n)/i,
    modifiers: /(final|ending|cierre|fin|ultimo|último)/i
  },
  netFlow: {
    exact: /^(net cash flow|cash flow|flujo neto|flujo de caja|generaci[óo]n de caja)$/i,
    contains: /(net|neto|flow|flujo|generaci[óo]n)/i
  },
  currency: {
    symbols: /[$€£¥₹ARS|USD|EUR|GBP|MXN|COP|CLP|PEN|BRL]/,
    inCell: /^\s*([A-Z]{3}|\$|€|£|¥|₹)\s*[\d,.-]+|[\d,.-]+\s*([A-Z]{3}|\$|€|£|¥|₹)\s*$/
  }
};

// Simple global storage for parsed data
let parsedMetrics: MonthlyMetrics[] = [];
let uploadedFileName: string = '';

export class CashflowServiceV2Enhanced {
  /**
   * Enhanced format detection with confidence scoring
   */
  async detectFormat(buffer: Buffer): Promise<FormatDetectionResult> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return { isFormat: false, confidence: 0, detectedPatterns: {} };
    }

    // First, check if it's Vortex format (highest priority)
    const vortexResult = await this.checkVortexFormatWithConfidence(worksheet);
    if (vortexResult.confidence > 0.8) {
      return vortexResult;
    }

    // Then check for standard format
    const standardResult = await this.checkStandardFormatWithConfidence(worksheet);
    if (standardResult.confidence > 0.7) {
      return standardResult;
    }

    // Finally, try flexible detection
    return await this.detectFlexibleFormat(worksheet);
  }

  /**
   * Check Vortex format with confidence scoring
   */
  private async checkVortexFormatWithConfidence(worksheet: ExcelJS.Worksheet): Promise<FormatDetectionResult> {
    const patterns: any = {
      dateLocation: undefined,
      incomeLocation: undefined,
      expenseLocation: undefined,
      balanceLocation: undefined,
      currency: 'ARS', // Default for Vortex
      language: 'en' as const
    };

    let confidence = 0;
    let matches = 0;
    const totalChecks = 4;

    // Check specific Vortex rows
    const row24 = worksheet.getRow(24).getCell(1).value;
    const row100 = worksheet.getRow(100).getCell(1).value;
    const row104 = worksheet.getRow(104).getCell(1).value;
    
    if (String(row24 || '').toLowerCase().includes('total income')) {
      patterns.incomeLocation = { row: 24, label: String(row24) };
      matches++;
    }
    
    if (String(row100 || '').toLowerCase().includes('total expense')) {
      patterns.expenseLocation = { row: 100, label: String(row100) };
      matches++;
    }
    
    if (String(row104 || '').toLowerCase().includes('final balance')) {
      patterns.balanceLocation = { row: 104, label: String(row104) };
      matches++;
    }

    // Check for dates in row 3
    const dateColumns = this.detectDateColumns(worksheet.getRow(3));
    if (dateColumns.length > 0) {
      patterns.dateLocation = { row: 3, columns: dateColumns };
      matches++;
    }

    confidence = matches / totalChecks;
    
    logger.info(`Vortex format detection: confidence ${confidence}, patterns:`, patterns);

    return {
      isFormat: confidence > 0.8,
      confidence,
      detectedPatterns: patterns
    };
  }

  /**
   * Check standard format with confidence scoring
   */
  private async checkStandardFormatWithConfidence(worksheet: ExcelJS.Worksheet): Promise<FormatDetectionResult> {
    const patterns: any = {
      dateLocation: undefined,
      incomeLocation: undefined,
      expenseLocation: undefined,
      balanceLocation: undefined,
      language: 'mixed' as const
    };

    let confidence = 0;
    let matches = 0;
    const weights = { dates: 0.3, income: 0.25, expenses: 0.25, balance: 0.2 };

    // Check first 10 rows for standard patterns
    for (let rowNum = 1; rowNum <= Math.min(10, worksheet.rowCount); rowNum++) {
      const row = worksheet.getRow(rowNum);
      const firstCellValue = String(row.getCell(1).value || '').toLowerCase().trim();

      // Check for dates in header
      if (rowNum === 1) {
        const dateColumns = this.detectDateColumns(row);
        if (dateColumns.length >= 3) {
          patterns.dateLocation = { row: rowNum, columns: dateColumns };
          confidence += weights.dates;
        }
      }

      // Check for income patterns
      if (FINANCIAL_PATTERNS.income.contains.test(firstCellValue) && 
          !FINANCIAL_PATTERNS.income.exclude.test(firstCellValue)) {
        patterns.incomeLocation = { row: rowNum, label: row.getCell(1).value as string };
        confidence += weights.income;
        matches++;
      }

      // Check for expense patterns
      if (FINANCIAL_PATTERNS.expenses.contains.test(firstCellValue) && 
          !FINANCIAL_PATTERNS.expenses.exclude.test(firstCellValue)) {
        patterns.expenseLocation = { row: rowNum, label: row.getCell(1).value as string };
        confidence += weights.expenses;
        matches++;
      }

      // Check for balance patterns
      if (FINANCIAL_PATTERNS.balance.contains.test(firstCellValue)) {
        patterns.balanceLocation = { row: rowNum, label: row.getCell(1).value as string };
        confidence += weights.balance;
        matches++;
      }
    }

    // Detect currency from cells
    patterns.currency = this.detectCurrencyFromWorksheet(worksheet);

    // Detect language
    patterns.language = this.detectLanguage(worksheet);

    logger.info(`Standard format detection: confidence ${confidence}, patterns:`, patterns);

    return {
      isFormat: confidence > 0.5,
      confidence,
      detectedPatterns: patterns
    };
  }

  /**
   * Flexible format detection for non-standard files
   */
  private async detectFlexibleFormat(worksheet: ExcelJS.Worksheet): Promise<FormatDetectionResult> {
    const patterns: any = {
      dateLocation: undefined,
      incomeLocation: undefined,
      expenseLocation: undefined,
      balanceLocation: undefined,
      language: 'mixed' as const
    };

    let confidence = 0;

    // Search entire sheet for patterns (up to row 50)
    const maxRow = Math.min(50, worksheet.rowCount);
    const dateLocations: Array<{ row: number; columns: number[] }> = [];
    const metricLocations: Array<{ row: number; label: string; type: string }> = [];

    for (let rowNum = 1; rowNum <= maxRow; rowNum++) {
      const row = worksheet.getRow(rowNum);
      
      // Check for date rows
      const dateColumns = this.detectDateColumns(row);
      if (dateColumns.length >= 3) {
        dateLocations.push({ row: rowNum, columns: dateColumns });
      }

      // Check each cell in the row for financial terms
      for (let colNum = 1; colNum <= Math.min(5, row.cellCount); colNum++) {
        const cellValue = String(row.getCell(colNum).value || '').trim();
        if (!cellValue) continue;

        // Check for income
        if (FINANCIAL_PATTERNS.income.contains.test(cellValue) && 
            !FINANCIAL_PATTERNS.income.exclude.test(cellValue)) {
          metricLocations.push({ row: rowNum, label: cellValue, type: 'income' });
        }

        // Check for expenses
        if (FINANCIAL_PATTERNS.expenses.contains.test(cellValue) && 
            !FINANCIAL_PATTERNS.expenses.exclude.test(cellValue)) {
          metricLocations.push({ row: rowNum, label: cellValue, type: 'expense' });
        }

        // Check for balance
        if (FINANCIAL_PATTERNS.balance.contains.test(cellValue)) {
          metricLocations.push({ row: rowNum, label: cellValue, type: 'balance' });
        }
      }
    }

    // Analyze findings
    if (dateLocations.length > 0) {
      patterns.dateLocation = dateLocations[0];
      confidence += 0.3;
    }

    // Find best matches for each metric type
    const incomeMetrics = metricLocations.filter(m => m.type === 'income');
    const expenseMetrics = metricLocations.filter(m => m.type === 'expense');
    const balanceMetrics = metricLocations.filter(m => m.type === 'balance');

    if (incomeMetrics.length > 0) {
      patterns.incomeLocation = { row: incomeMetrics[0].row, label: incomeMetrics[0].label };
      confidence += 0.2;
    }

    if (expenseMetrics.length > 0) {
      patterns.expenseLocation = { row: expenseMetrics[0].row, label: expenseMetrics[0].label };
      confidence += 0.2;
    }

    if (balanceMetrics.length > 0) {
      patterns.balanceLocation = { row: balanceMetrics[0].row, label: balanceMetrics[0].label };
      confidence += 0.2;
    }

    // Detect currency and language
    patterns.currency = this.detectCurrencyFromWorksheet(worksheet);
    patterns.language = this.detectLanguage(worksheet);

    // Boost confidence if we found a consistent structure
    if (patterns.dateLocation && (patterns.incomeLocation || patterns.expenseLocation)) {
      confidence += 0.1;
    }

    logger.info(`Flexible format detection: confidence ${confidence}, patterns:`, patterns);

    return {
      isFormat: confidence > 0.3,
      confidence,
      detectedPatterns: patterns
    };
  }

  /**
   * Detect date columns in a row
   */
  private detectDateColumns(row: ExcelJS.Row): number[] {
    const dateColumns: number[] = [];
    
    for (let col = 1; col <= row.cellCount; col++) {
      const cellValue = row.getCell(col).value;
      
      // Check if it's a date
      if (cellValue instanceof Date) {
        dateColumns.push(col);
      } else if (typeof cellValue === 'string') {
        const strValue = cellValue.trim();
        
        // Check for month names
        if (FINANCIAL_PATTERNS.dates.monthNames.test(strValue)) {
          dateColumns.push(col);
        }
        // Check for date patterns
        else if (FINANCIAL_PATTERNS.dates.dateFormats.test(strValue)) {
          dateColumns.push(col);
        }
      }
    }
    
    return dateColumns;
  }

  /**
   * Detect currency from worksheet cells
   */
  private detectCurrencyFromWorksheet(worksheet: ExcelJS.Worksheet): string {
    const currencyCounts: { [key: string]: number } = {};
    
    // Sample first 20 rows
    for (let row = 1; row <= Math.min(20, worksheet.rowCount); row++) {
      for (let col = 1; col <= Math.min(15, worksheet.columnCount); col++) {
        const cell = worksheet.getRow(row).getCell(col);
        const value = cell.value;
        
        if (typeof value === 'string') {
          // Check for currency symbols
          const currencyMatch = value.match(/[$€£¥₹]|ARS|USD|EUR|GBP|MXN|COP|CLP|PEN|BRL/);
          if (currencyMatch) {
            const currency = this.normalizeCurrency(currencyMatch[0]);
            currencyCounts[currency] = (currencyCounts[currency] || 0) + 1;
          }
        }
        
        // Check cell format
        if (cell.numFmt && cell.numFmt.includes('$')) {
          currencyCounts['USD'] = (currencyCounts['USD'] || 0) + 1;
        }
      }
    }
    
    // Return most common currency
    const currencies = Object.entries(currencyCounts).sort((a, b) => b[1] - a[1]);
    return currencies.length > 0 ? currencies[0][0] : 'USD';
  }

  /**
   * Normalize currency symbols to codes
   */
  private normalizeCurrency(symbol: string): string {
    const map: { [key: string]: string } = {
      '$': 'USD',
      '€': 'EUR',
      '£': 'GBP',
      '¥': 'JPY',
      '₹': 'INR'
    };
    return map[symbol] || symbol;
  }

  /**
   * Detect language from content
   */
  private detectLanguage(worksheet: ExcelJS.Worksheet): 'en' | 'es' | 'mixed' {
    let englishCount = 0;
    let spanishCount = 0;
    
    const englishTerms = /income|expense|balance|cash|flow|total|final|revenue|cost/i;
    const spanishTerms = /ingreso|gasto|egreso|saldo|caja|flujo|total|final|entrada|salida/i;
    
    // Sample first 20 rows
    for (let row = 1; row <= Math.min(20, worksheet.rowCount); row++) {
      for (let col = 1; col <= Math.min(5, worksheet.columnCount); col++) {
        const value = String(worksheet.getRow(row).getCell(col).value || '');
        
        if (englishTerms.test(value)) englishCount++;
        if (spanishTerms.test(value)) spanishCount++;
      }
    }
    
    if (englishCount > spanishCount * 2) return 'en';
    if (spanishCount > englishCount * 2) return 'es';
    return 'mixed';
  }

  /**
   * Convert Excel value to number with multi-format support
   */
  private toNumber(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Handle different decimal separators
      let cleaned = value.replace(/[$€£¥₹\s]/g, '').trim();
      
      // Handle Latin American format (comma as decimal separator)
      if (cleaned.includes(',') && cleaned.includes('.')) {
        // Determine which is decimal separator based on position
        const lastComma = cleaned.lastIndexOf(',');
        const lastDot = cleaned.lastIndexOf('.');
        
        if (lastComma > lastDot) {
          // Comma is decimal separator (e.g., 1.234,56)
          cleaned = cleaned.replace(/\./g, '').replace(',', '.');
        } else {
          // Dot is decimal separator (e.g., 1,234.56)
          cleaned = cleaned.replace(/,/g, '');
        }
      } else if (cleaned.includes(',')) {
        // Only comma present - could be decimal or thousand separator
        const parts = cleaned.split(',');
        if (parts.length === 2 && parts[1].length <= 2) {
          // Likely decimal separator
          cleaned = cleaned.replace(',', '.');
        } else {
          // Likely thousand separator
          cleaned = cleaned.replace(/,/g, '');
        }
      }
      
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  }

  /**
   * Get column letter from number (1=A, 2=B, etc)
   */
  private getColumnLetter(col: number): string {
    let letter = '';
    while (col > 0) {
      const mod = (col - 1) % 26;
      letter = String.fromCharCode(65 + mod) + letter;
      col = Math.floor((col - 1) / 26);
    }
    return letter;
  }

  /**
   * Main processing method that integrates with the enhanced detection
   */
  async processExcelFile(buffer: Buffer, filename?: string): Promise<{ metrics: MonthlyMetrics[], format: string }> {
    logger.info('Starting enhanced Excel file processing');
    
    // Use enhanced format detection
    const detectionResult = await this.detectFormat(buffer);
    
    logger.info('Format detection result:', {
      confidence: detectionResult.confidence,
      patterns: detectionResult.detectedPatterns
    });
    
    // PRIORITY 1: Vortex format (highest confidence)
    if (detectionResult.detectedPatterns.incomeLocation?.row === 24 && 
        detectionResult.detectedPatterns.expenseLocation?.row === 100) {
      logger.info('Processing as Vortex format');
      return this.processVortexFormat(buffer, filename);
    }
    
    // PRIORITY 2: Standard format
    if (detectionResult.confidence > 0.5 && 
        detectionResult.detectedPatterns.dateLocation &&
        (detectionResult.detectedPatterns.incomeLocation || detectionResult.detectedPatterns.expenseLocation)) {
      logger.info('Processing as enhanced standard format');
      return this.processEnhancedStandardFormat(buffer, detectionResult, filename);
    }
    
    // PRIORITY 3: Non-standard format - trigger AI wizard
    logger.info('Non-standard format detected - triggering AI wizard');
    this.clearStoredData();
    throw new Error('Unable to detect standard format. Please use the AI wizard to map your custom format.');
  }

  /**
   * Process Vortex format (preserved original implementation)
   */
  private async processVortexFormat(buffer: Buffer, filename?: string): Promise<{ metrics: MonthlyMetrics[], format: string }> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('No worksheet found');
    }
    
    const metrics = this.parseWorksheet(worksheet, filename);
    return { metrics, format: 'Vortex' };
  }

  /**
   * Enhanced standard format processing using detected patterns
   */
  private async processEnhancedStandardFormat(buffer: Buffer, detectionResult: FormatDetectionResult, filename?: string): Promise<{ metrics: MonthlyMetrics[], format: string }> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('No worksheet found');
    }
    
    // Clear previous data
    parsedMetrics = [];
    if (filename) {
      uploadedFileName = filename;
    }
    
    const metrics: MonthlyMetrics[] = [];
    const patterns = detectionResult.detectedPatterns;
    
    // Use detected date location
    if (!patterns.dateLocation) {
      throw new Error('No date location detected');
    }
    
    const dateRow = worksheet.getRow(patterns.dateLocation.row);
    const monthColumns: Array<{col: number, date: Date | null, month: string}> = [];
    
    // Process detected date columns
    for (const col of patterns.dateLocation.columns) {
      const cellValue = dateRow.getCell(col).value;
      let processedDate: Date | null = null;
      let monthName = '';
      
      if (cellValue instanceof Date) {
        processedDate = cellValue;
        monthName = format(cellValue, 'MMMM');
      } else if (typeof cellValue === 'string') {
        // Try to parse month names in Spanish or English
        if (FINANCIAL_PATTERNS.dates.monthNames.test(cellValue)) {
          // Create date from month name
          const currentYear = new Date().getFullYear();
          const monthIndex = this.getMonthIndex(cellValue);
          if (monthIndex !== -1) {
            processedDate = new Date(currentYear, monthIndex, 1);
            monthName = format(processedDate, 'MMMM');
          } else {
            monthName = cellValue;
          }
        } else {
          monthName = cellValue;
        }
      } else {
        monthName = `Column ${col}`;
      }
      
      monthColumns.push({
        col,
        date: processedDate,
        month: monthName
      });
    }
    
    logger.info(`Found ${monthColumns.length} month columns using enhanced detection`);
    
    // Extract values using detected metric locations
    for (const monthInfo of monthColumns) {
      const totalIncome = patterns.incomeLocation ? 
        this.toNumber(worksheet.getRow(patterns.incomeLocation.row).getCell(monthInfo.col).value) : 0;
      
      const totalExpenses = patterns.expenseLocation ? 
        this.toNumber(worksheet.getRow(patterns.expenseLocation.row).getCell(monthInfo.col).value) : 0;
      
      const finalBalance = patterns.balanceLocation ? 
        this.toNumber(worksheet.getRow(patterns.balanceLocation.row).getCell(monthInfo.col).value) : 0;
      
      const netCashFlow = totalIncome - Math.abs(totalExpenses);
      
      metrics.push({
        date: monthInfo.date || new Date(),
        month: monthInfo.month,
        columnIndex: monthInfo.col,
        columnLetter: this.getColumnLetter(monthInfo.col),
        totalInflow: totalIncome,
        totalOutflow: -Math.abs(totalExpenses),
        finalBalance: finalBalance,
        lowestBalance: finalBalance, // Default to final balance
        monthlyGeneration: netCashFlow,
        currency: patterns.currency,
        originalCurrency: patterns.currency
      });
    }
    
    // Store the metrics globally
    parsedMetrics = metrics;
    logger.info(`Enhanced standard format: Stored ${metrics.length} months`);
    
    return { 
      metrics, 
      format: `Enhanced Standard (${patterns.language?.toUpperCase()}, ${patterns.currency})` 
    };
  }

  /**
   * Get month index from month name (supports Spanish and English)
   */
  private getMonthIndex(monthName: string): number {
    const lowerName = monthName.toLowerCase();
    
    const monthMap: { [key: string]: number } = {
      // English
      'january': 0, 'jan': 0,
      'february': 1, 'feb': 1,
      'march': 2, 'mar': 2,
      'april': 3, 'apr': 3,
      'may': 4,
      'june': 5, 'jun': 5,
      'july': 6, 'jul': 6,
      'august': 7, 'aug': 7,
      'september': 8, 'sep': 8,
      'october': 9, 'oct': 9,
      'november': 10, 'nov': 10,
      'december': 11, 'dec': 11,
      // Spanish
      'enero': 0, 'ene': 0,
      'febrero': 1,
      'marzo': 2,
      'abril': 3, 'abr': 3,
      'mayo': 4,
      'junio': 5,
      'julio': 6,
      'agosto': 7, 'ago': 7,
      'septiembre': 8,
      'octubre': 9,
      'noviembre': 10,
      'diciembre': 11
    };
    
    return monthMap[lowerName] ?? -1;
  }

  /**
   * Parse worksheet for Vortex format (original implementation)
   */
  parseWorksheet(worksheet: ExcelJS.Worksheet, filename?: string): MonthlyMetrics[] {
    // Clear previous data
    parsedMetrics = [];
    
    if (filename) {
      uploadedFileName = filename;
    }
    
    // Vortex format row numbers
    const ROW_NUMBERS = {
      DATES: 3,
      TOTAL_INFLOW: 24,
      TOTAL_OUTFLOW: 100,
      FINAL_BALANCE: 104,
      LOWEST_BALANCE: 112,
      MONTHLY_GENERATION: 113
    };
    
    const dateRow = worksheet.getRow(ROW_NUMBERS.DATES);
    const monthColumns: Array<{col: number, date: Date, month: string}> = [];
    
    // Check columns B (2) through P (16) for Vortex format
    for (let col = 2; col <= 16; col++) {
      const cellValue = dateRow.getCell(col).value;
      
      if (cellValue === 'Dollars' || (typeof cellValue === 'string' && cellValue.includes('USD'))) {
        break;
      }
      
      if (cellValue instanceof Date) {
        const monthName = format(cellValue, 'MMMM');
        monthColumns.push({
          col,
          date: cellValue,
          month: monthName
        });
      }
    }
    
    // Extract values for each month
    for (const monthInfo of monthColumns) {
      const metrics: MonthlyMetrics = {
        date: monthInfo.date,
        month: monthInfo.month,
        columnIndex: monthInfo.col,
        columnLetter: this.getColumnLetter(monthInfo.col),
        totalInflow: this.toNumber(worksheet.getRow(ROW_NUMBERS.TOTAL_INFLOW).getCell(monthInfo.col).value),
        totalOutflow: this.toNumber(worksheet.getRow(ROW_NUMBERS.TOTAL_OUTFLOW).getCell(monthInfo.col).value),
        finalBalance: this.toNumber(worksheet.getRow(ROW_NUMBERS.FINAL_BALANCE).getCell(monthInfo.col).value),
        lowestBalance: this.toNumber(worksheet.getRow(ROW_NUMBERS.LOWEST_BALANCE).getCell(monthInfo.col).value),
        monthlyGeneration: this.toNumber(worksheet.getRow(ROW_NUMBERS.MONTHLY_GENERATION).getCell(monthInfo.col).value)
      };
      
      parsedMetrics.push(metrics);
    }
    
    return parsedMetrics;
  }

  /**
   * Generate dashboard data (preserved from original)
   */
  generateDashboard() {
    if (parsedMetrics.length === 0) {
      return this.getMockData();
    }
    
    const now = new Date();
    const currentMonthName = format(now, 'MMMM');
    
    let currentMonthData = parsedMetrics.find(m => m.month === currentMonthName);
    if (!currentMonthData) {
      currentMonthData = parsedMetrics[parsedMetrics.length - 1];
    }
    
    const currentMonthIndex = parsedMetrics.findIndex(m => m.month === currentMonthData.month);
    const previousMonthData = currentMonthIndex > 0 ? parsedMetrics[currentMonthIndex - 1] : null;
    
    let ytdInflow = 0;
    let ytdExpense = 0;
    let ytdInvestment = 0;
    
    const currentMonthArrayIndex = parsedMetrics.findIndex(m => m.month === currentMonthData.month);
    const extendedService = ExtendedFinancialService.getInstance();
    const extendedData = extendedService.getStoredExtendedData();
    const investmentData = extendedData.investments || [];
    
    for (let i = 0; i <= currentMonthArrayIndex && i < parsedMetrics.length; i++) {
      ytdInflow += parsedMetrics[i].totalInflow;
      ytdExpense += parsedMetrics[i].totalOutflow;
      
      if (investmentData[i]) {
        ytdInvestment += investmentData[i].totalInvestmentValue || 0;
      }
    }
    
    const ytdBalance = ytdInflow + ytdExpense;
    
    const chartData = [];
    for (let i = 0; i < parsedMetrics.length; i++) {
      const metricDate = parsedMetrics[i].date;
      const isActual = metricDate <= now || parsedMetrics[i].month === currentMonthName;
      
      chartData.push({
        date: format(parsedMetrics[i].date, 'yyyy-MM'),
        month: parsedMetrics[i].month,
        income: parsedMetrics[i].totalInflow,
        expenses: Math.abs(parsedMetrics[i].totalOutflow),
        cashflow: parsedMetrics[i].finalBalance,
        isActual: isActual
      });
    }
    
    const insights = this.generateInsights(parsedMetrics, currentMonthArrayIndex);
    const projections = this.generateProjections(parsedMetrics, currentMonthArrayIndex);
    
    return {
      hasData: true,
      uploadedFileName: uploadedFileName,
      currentMonth: {
        month: currentMonthData.month,
        totalIncome: currentMonthData.totalInflow,
        totalExpense: currentMonthData.totalOutflow,
        finalBalance: currentMonthData.finalBalance,
        lowestBalance: currentMonthData.lowestBalance,
        monthlyGeneration: currentMonthData.monthlyGeneration
      },
      previousMonth: previousMonthData ? {
        month: previousMonthData.month,
        totalIncome: previousMonthData.totalInflow,
        totalExpense: previousMonthData.totalOutflow,
        finalBalance: previousMonthData.finalBalance,
        lowestBalance: previousMonthData.lowestBalance,
        monthlyGeneration: previousMonthData.monthlyGeneration
      } : null,
      yearToDate: {
        totalIncome: ytdInflow,
        totalExpense: ytdExpense,
        totalBalance: ytdBalance,
        totalInvestment: ytdInvestment
      },
      chartData: chartData,
      highlights: {
        pastThreeMonths: insights,
        nextSixMonths: projections
      },
      isRealData: true
    };
  }

  /**
   * Process extracted data from AI mapping
   */
  async processExtractedData(extractedData: any, originalFilename: string): Promise<void> {
    logger.info(`Processing extracted cashflow data from ${originalFilename}`);
    
    parsedMetrics = [];
    uploadedFileName = originalFilename;
    
    if (extractedData.months && Array.isArray(extractedData.months)) {
      const metrics: MonthlyMetrics[] = extractedData.months.map((month: any, index: number) => {
        const totalInflow = month.data.totalIncome?.value || 
                           month.data.totalInflow?.value || 
                           month.data.revenue?.value || 0;
        
        const totalOutflow = Math.abs(month.data.totalExpense?.value || 
                                     month.data.totalOutflow?.value || 
                                     month.data.expenses?.value || 0);
        
        const finalBalance = month.data.finalBalance?.value || 
                            month.data.endingBalance?.value || 
                            month.data.cashBalance?.value || 0;
        
        const lowestBalance = month.data.lowestBalance?.value || 
                             month.data.minimumBalance?.value || 
                             finalBalance;
        
        const monthlyGeneration = month.data.monthlyGeneration?.value || 
                                 month.data.cashGeneration?.value || 
                                 month.data.netCashFlow?.value || 
                                 (totalInflow - totalOutflow);
        
        let date = new Date();
        if (month.date instanceof Date) {
          date = month.date;
        } else if (typeof month.date === 'string') {
          date = new Date(month.date);
        } else {
          const currentYear = new Date().getFullYear();
          const monthIndex = ['January', 'February', 'March', 'April', 'May', 'June',
                             'July', 'August', 'September', 'October', 'November', 'December']
                             .indexOf(month.month);
          if (monthIndex !== -1) {
            date = new Date(currentYear, monthIndex, 1);
          } else {
            date = new Date(currentYear, index, 1);
          }
        }
        
        return {
          date,
          month: month.month || format(date, 'MMMM'),
          columnIndex: index + 2,
          columnLetter: this.getColumnLetter(index + 2),
          totalInflow,
          totalOutflow: -Math.abs(totalOutflow),
          finalBalance,
          lowestBalance,
          monthlyGeneration
        };
      });
      
      parsedMetrics = metrics;
      
      const extendedService = ExtendedFinancialService.getInstance();
      if (extractedData.extendedData) {
        extendedService.clearStoredData();
      }
      
      logger.info(`Stored ${metrics.length} months of cashflow data from custom mapping`);
    }
  }

  /**
   * Clear stored data
   */
  clearStoredData(): void {
    parsedMetrics = [];
    uploadedFileName = '';
    logger.info('Enhanced cashflow stored data cleared');
  }

  /**
   * Get stored metrics
   */
  getStoredMetrics(): MonthlyMetrics[] {
    return parsedMetrics;
  }

  /**
   * Helper methods from original service
   */
  private getMockData() {
    return {
      hasData: false,
      uploadedFileName: uploadedFileName || null,
      currentMonth: {
        month: 'June',
        totalIncome: 61715728.02,
        totalExpense: -69286881.42,
        finalBalance: 26924011.97,
        lowestBalance: 17129280.86,
        monthlyGeneration: -7571153.41
      },
      yearToDate: {
        totalIncome: 400616487.75,
        totalExpense: -388691108.59,
        totalBalance: 11925379.16
      },
      chartData: [
        { date: '2025-01', month: 'January', income: 70346123.45, expenses: 65432198.76, cashflow: 35000000.00, isActual: true },
        { date: '2025-02', month: 'February', income: 68234567.89, expenses: 67123456.78, cashflow: 36111111.11, isActual: true },
        { date: '2025-03', month: 'March', income: 69876543.21, expenses: 68765432.10, cashflow: 37222222.22, isActual: true },
        { date: '2025-04', month: 'April', income: 65432109.87, expenses: 69876543.21, cashflow: 32777788.88, isActual: true },
        { date: '2025-05', month: 'May', income: 63210987.65, expenses: 70123456.78, cashflow: 25865319.75, isActual: true },
        { date: '2025-06', month: 'June', income: 61715728.02, expenses: 69286881.42, cashflow: 26924011.97, isActual: true },
        { date: '2025-07', month: 'July', income: 61715728.02, expenses: 69286881.42, cashflow: 19352858.56, isActual: false },
        { date: '2025-08', month: 'August', income: 61715728.02, expenses: 69286881.42, cashflow: 11781705.15, isActual: false },
        { date: '2025-09', month: 'September', income: 61715728.02, expenses: 69286881.42, cashflow: 4210551.74, isActual: false },
        { date: '2025-10', month: 'October', income: 61715728.02, expenses: 69286881.42, cashflow: -3360601.67, isActual: false },
        { date: '2025-11', month: 'November', income: 61715728.02, expenses: 69286881.42, cashflow: -10931755.08, isActual: false },
        { date: '2025-12', month: 'December', income: 61715728.02, expenses: 69286881.42, cashflow: -18502908.49, isActual: false }
      ],
      highlights: {
        pastThreeMonths: [
          'Inflow decreased by 12.5% over the last 3 months',
          'Average monthly cash burn of $7.6M over the last 3 months',
          'Cash balance has remained stable with low volatility'
        ],
        nextSixMonths: [
          'Excel projections show $45.4M in cash consumption over the next 6 months',
          'Warning: Projections indicate negative cash balance in 4 months (October)',
          'Projected average monthly inflow: $61.7M',
          'Projected average monthly outflows: $69.3M',
          'Year-end projected cash balance: -$18.5M'
        ]
      },
      isRealData: false
    };
  }

  private generateInsights(metrics: MonthlyMetrics[], currentIndex: number): string[] {
    const insights: string[] = [];
    const start = Math.max(0, currentIndex - 2);
    const lastThreeMonths = metrics.slice(start, currentIndex + 1);
    
    if (lastThreeMonths.length >= 2) {
      const inflowChange = ((lastThreeMonths[lastThreeMonths.length - 1].totalInflow - 
                            lastThreeMonths[0].totalInflow) / lastThreeMonths[0].totalInflow * 100);
      if (Math.abs(inflowChange) > 5) {
        insights.push(`Inflow ${inflowChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(inflowChange).toFixed(1)}% over the last ${lastThreeMonths.length} months`);
      }
      
      const outflowChange = ((Math.abs(lastThreeMonths[lastThreeMonths.length - 1].totalOutflow) - 
                             Math.abs(lastThreeMonths[0].totalOutflow)) / Math.abs(lastThreeMonths[0].totalOutflow) * 100);
      if (Math.abs(outflowChange) > 5) {
        insights.push(`Outflows ${outflowChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(outflowChange).toFixed(1)}% over the last ${lastThreeMonths.length} months`);
      }
      
      const avgGeneration = lastThreeMonths.reduce((sum, m) => sum + m.monthlyGeneration, 0) / lastThreeMonths.length;
      if (avgGeneration > 0) {
        insights.push(`Average monthly cash generation of ${this.formatCurrency(avgGeneration)} over the last ${lastThreeMonths.length} months`);
      } else {
        insights.push(`Average monthly cash burn of ${this.formatCurrency(Math.abs(avgGeneration))} over the last ${lastThreeMonths.length} months`);
      }
    }
    
    if (insights.length === 0) {
      insights.push('Upload more months of data for detailed trend analysis');
    }
    
    return insights;
  }

  private generateProjections(metrics: MonthlyMetrics[], currentIndex: number): string[] {
    const projections: string[] = [];
    const futureMonths = metrics.slice(currentIndex + 1);
    
    if (futureMonths.length > 0) {
      const next6Months = futureMonths.slice(0, 6);
      
      if (next6Months.length > 0) {
        const totalGeneration = next6Months.reduce((sum, m) => sum + m.monthlyGeneration, 0);
        if (totalGeneration > 0) {
          projections.push(`Excel projections show ${this.formatCurrency(totalGeneration)} in cash generation over the next ${next6Months.length} months`);
        } else {
          projections.push(`Excel projections show ${this.formatCurrency(Math.abs(totalGeneration))} in cash consumption over the next ${next6Months.length} months`);
        }
        
        const negativeMonth = futureMonths.find(m => m.finalBalance < 0);
        if (negativeMonth && metrics[currentIndex].finalBalance > 0) {
          const monthsUntilNegative = futureMonths.indexOf(negativeMonth) + 1;
          projections.push(`Warning: Projections indicate negative cash balance in ${monthsUntilNegative} months (${negativeMonth.month})`);
        }
        
        const avgFutureInflow = next6Months.reduce((sum, m) => sum + m.totalInflow, 0) / next6Months.length;
        const avgFutureExpense = next6Months.reduce((sum, m) => sum + Math.abs(m.totalOutflow), 0) / next6Months.length;
        
        projections.push(`Projected average monthly inflow: ${this.formatCurrency(avgFutureInflow)}`);
        projections.push(`Projected average monthly outflows: ${this.formatCurrency(avgFutureExpense)}`);
        
        const lastMonth = futureMonths[futureMonths.length - 1];
        if (lastMonth) {
          projections.push(`Year-end projected cash balance: ${this.formatCurrency(lastMonth.finalBalance)}`);
        }
      }
    }
    
    if (projections.length === 0) {
      projections.push('No future projections available in Excel file');
    }
    
    return projections;
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));
  }
}