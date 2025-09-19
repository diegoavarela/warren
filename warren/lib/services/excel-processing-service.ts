import { db } from '@/lib/db';
import {
  financialDataFiles,
  processedFinancialData,
  companyConfigurations
} from '@/lib/db';
import {
  CashFlowConfiguration,
  PLConfiguration,
  ProcessedData,
  ExcelProcessingResult
} from '@/lib/types/configurations';

type Configuration = CashFlowConfiguration | PLConfiguration;
import { eq } from 'drizzle-orm';
import * as XLSX from 'xlsx';
import * as fs from 'fs';

// Debug logging interface
interface DebugLog {
  timestamp: string;
  filename: string;
  configId: string;
  sheetName: string;
  configuration: any;
  periodMappings: any[];
  periodMetadata: any;
  dataExtractions: any[];
  transformations: any[];
  finalData: any;
}

export class ExcelProcessingService {

  private debugLog: DebugLog | null = null;

  /**
   * Initialize debug logging for this processing session
   */
  private initializeDebugLog(filename: string, configId: string, sheetName: string, configuration: any): void {
    this.debugLog = {
      timestamp: new Date().toISOString(),
      filename,
      configId,
      sheetName,
      configuration: JSON.parse(JSON.stringify(configuration)),
      periodMappings: [],
      periodMetadata: {},
      dataExtractions: [],
      transformations: [],
      finalData: {}
    };

    console.log('🔍 [DEBUG] Starting Excel processing debug session for:', filename);
  }

  /**
   * Write debug log to file
   */
  private writeDebugLog(): void {
    if (!this.debugLog) return;

    try {
      const debugFilename = `/tmp/excel_processing_debug_${Date.now()}.json`;
      fs.writeFileSync(debugFilename, JSON.stringify(this.debugLog, null, 2));
      console.log('📝 [DEBUG] Debug log written to:', debugFilename);
    } catch (error) {
      console.error('❌ [DEBUG] Failed to write debug log:', error);
    }
  }

  /**
   * Parse an Excel file from database content using a specific configuration
   */
  async parseExcelFromDatabase(
    fileContentBase64: string,
    configId: string,
    originalFilename: string
  ): Promise<ExcelProcessingResult> {
    try {
      // Get configuration from database
      const configResult = await db
        .select()
        .from(companyConfigurations)
        .where(eq(companyConfigurations.id, configId))
        .limit(1);

      if (configResult.length === 0) {
        throw new Error('Configuration not found');
      }

      const configData = configResult[0].configJson as any;
      const configuration = configData as Configuration;

      // Convert base64 to buffer and read Excel file
      const buffer = Buffer.from(fileContentBase64, 'base64');
      const workbook = XLSX.read(buffer, { type: 'buffer' });

      // Use smart detection for sheet selection (same logic as other methods)
      let sheetName = workbook.SheetNames[0]; // Default to first sheet

      
      // Check if there are sheets with names that suggest cash flow data
      const dataSheetNames = workbook.SheetNames.filter(name => 
        name.toLowerCase().includes('cash') || 
        name.toLowerCase().includes('flow') ||
        name.toLowerCase().includes('flujo') ||
        name.toLowerCase().includes('data') ||
        name.toLowerCase().includes('main') ||
        name.toLowerCase().includes('principal')
      );
      
      if (dataSheetNames.length > 0) {
        sheetName = dataSheetNames[0];
      }
      
      const worksheet = workbook.Sheets[sheetName];
      
      // Process based on configuration type
      let processedData: ProcessedData;
      
      if (configuration.type === 'cashflow') {
        processedData = await this.processCashFlowData(worksheet, configuration as CashFlowConfiguration);
      } else if (configuration.type === 'pnl') {
        processedData = await this.processPLData(worksheet, configuration as PLConfiguration);
      } else {
        throw new Error(`Unsupported configuration type: ${(configuration as any).type}`);
      }
      
      return {
        success: true,
        data: processedData,
        metadata: {
          fileName: originalFilename,
          configurationId: configId,
          configurationType: configuration.type,
          processedAt: new Date(),
          currency: configuration.metadata.currency,
          units: configuration.metadata.units,
          locale: configuration.metadata.locale
        }
      };
      
    } catch (error) {
      console.error('Excel processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during processing',
        metadata: {
          fileName: originalFilename,
          configurationId: configId,
          processedAt: new Date()
        }
      };
    }
  }
  
  /**
   * Parse an Excel file using a specific configuration
   */
  async parseExcelWithConfiguration(
    filePath: string,
    configId: string
  ): Promise<ExcelProcessingResult> {
    try {
      // Get configuration from database
      const configResult = await db
        .select()
        .from(companyConfigurations)
        .where(eq(companyConfigurations.id, configId))
        .limit(1);
      
      if (configResult.length === 0) {
        throw new Error('Configuration not found');
      }
      
      const configData = configResult[0].configJson as any;
      const configuration = configData as Configuration;
      
      // Read Excel file
      const workbook = XLSX.readFile(filePath);
      
      // Use smart detection for sheet selection (same logic as other methods)
      let sheetName = workbook.SheetNames[0]; // Default to first sheet
      
      // Check if there are sheets with names that suggest cash flow data
      const dataSheetNames = workbook.SheetNames.filter(name => 
        name.toLowerCase().includes('cash') || 
        name.toLowerCase().includes('flow') ||
        name.toLowerCase().includes('flujo') ||
        name.toLowerCase().includes('data') ||
        name.toLowerCase().includes('main') ||
        name.toLowerCase().includes('principal')
      );
      
      if (dataSheetNames.length > 0) {
        sheetName = dataSheetNames[0];
      }
      
      const worksheet = workbook.Sheets[sheetName];
      
      // Process based on configuration type
      let processedData: ProcessedData;
      
      if (configuration.type === 'cashflow') {
        processedData = await this.processCashFlowData(worksheet, configuration as CashFlowConfiguration);
      } else if (configuration.type === 'pnl') {
        processedData = await this.processPLData(worksheet, configuration as PLConfiguration);
      } else {
        throw new Error(`Unsupported configuration type: ${(configuration as any).type}`);
      }
      
      return {
        success: true,
        data: processedData,
        metadata: {
          fileName: filePath.split('/').pop() || 'unknown',
          configurationId: configId,
          configurationType: configuration.type,
          processedAt: new Date(),
          currency: configuration.metadata.currency,
          units: configuration.metadata.units,
          locale: configuration.metadata.locale
        }
      };
      
    } catch (error) {
      console.error('Excel processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during processing',
        metadata: {
          fileName: filePath.split('/').pop() || 'unknown',
          configurationId: configId,
          processedAt: new Date()
        }
      };
    }
  }
  
  /**
   * Get proper label for data row fields
   */
  private getDataRowLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      // Cash Flow labels
      'initialBalance': 'Initial Balance',
      'finalBalance': 'Final Balance', 
      'totalInflows': 'Total Inflows',
      'totalOutflows': 'Total Outflows',
      'monthlyGeneration': 'Monthly Generation',
      'netCashFlow': 'Net Cash Flow',
      
      // P&L labels
      'totalRevenue': 'Total Revenue',
      'cogs': 'Cost of Goods Sold',
      'grossProfit': 'Gross Profit',
      'totalOpex': 'Total Operating Expenses',
      'ebitda': 'EBITDA',
      'depreciation': 'Depreciation',
      'ebit': 'EBIT', 
      'interestExpense': 'Interest Expense',
      'pretaxIncome': 'Pre-tax Income',
      'taxes': 'Taxes',
      'netIncome': 'Net Income'
    };
    
    return labels[fieldName] || fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
  }

  /**
   * Process cash flow data from Excel worksheet
   */
  private async processCashFlowData(
    worksheet: XLSX.WorkSheet,
    configuration: CashFlowConfiguration
  ): Promise<ProcessedData> {
    const structure = configuration.structure;
    const processedData: ProcessedData = {
      type: 'cashflow',
      periods: [],
      dataRows: {},
      categories: {
        inflows: {},
        outflows: {}
      },
      metadata: configuration.metadata
    };

    // CONFIGURATION-DRIVEN: Use ONLY explicit mapping - NO AUTO-DETECTION
    // Check for new format (periodMapping) or convert from legacy format (periodsRow + periodsRange)
    let periodMapping = structure.periodMapping;

    if (!periodMapping || periodMapping.length === 0) {
      // Try to convert from legacy format
      if (structure.periodsRow && structure.periodsRange) {
        periodMapping = this.convertLegacyPeriodsToMapping(worksheet, structure.periodsRow, structure.periodsRange);
      } else {
        throw new Error('Configuration must have explicit period mapping. Auto-detection is disabled.');
      }
    }

    // Log period mapping for debugging
    if (this.debugLog) {
      this.debugLog.periodMappings = periodMapping.map(mapping => ({
        column: mapping.column,
        period: mapping.period.label,
        fullPeriod: mapping.period
      }));
      console.log('🔍 [DEBUG] Period mappings extracted:', this.debugLog.periodMappings);
    }

    const periods = this.extractPeriodsFromMapping(periodMapping);
    processedData.periods = periods;

    console.log('🔍 [DEBUG] Extracted periods:', periods);
    
    // Extract core data rows using explicit column mapping
    for (const [fieldName, rowNumber] of Object.entries(structure.dataRows)) {
      const rowData = this.extractRowDataFromMapping(worksheet, rowNumber, periodMapping);

      // Log data extraction for debugging
      if (this.debugLog) {
        this.debugLog.dataExtractions.push({
          type: 'dataRow',
          fieldName,
          rowNumber,
          extractedValues: rowData,
          total: rowData.reduce((sum, val) => (sum || 0) + (val || 0), 0)
        });
        console.log(`🔍 [DEBUG] Extracted ${fieldName} from row ${rowNumber}:`, rowData);
      }

      processedData.dataRows[fieldName] = {
        label: this.getDataRowLabel(fieldName), // Use predefined labels instead of Excel cell values
        values: rowData,
        total: rowData.reduce((sum, val) => (sum || 0) + (val || 0), 0) as number
      };
    }
    
    // Extract inflows categories using explicit column mapping
    // Categories structure debug: inflows and outflows processing
    
    for (const [categoryKey, category] of Object.entries(structure.categories.inflows || {})) {
      const categoryValues = this.extractRowDataFromMapping(worksheet, category.row, periodMapping);

      // Log inflow category extraction
      if (this.debugLog) {
        this.debugLog.dataExtractions.push({
          type: 'inflowCategory',
          categoryKey,
          rowNumber: category.row,
          extractedValues: categoryValues,
          total: categoryValues.reduce((sum, val) => (sum || 0) + (val || 0), 0)
        });
        console.log(`🔍 [DEBUG] Extracted inflow category ${categoryKey} from row ${category.row}:`, categoryValues);
      }

      processedData.categories.inflows[categoryKey] = {
        label: categoryKey, // Use category key as label
        values: categoryValues,
        total: categoryValues.reduce((sum, val) => (sum || 0) + (val || 0), 0) as number,
        subcategories: {}
      };
      
      // Process subcategories if they exist
      if (category.subcategories) {
        for (const [subKey, subcategory] of Object.entries(category.subcategories)) {
          const subValues = this.extractRowDataFromMapping(worksheet, subcategory.row, periodMapping);
          processedData.categories.inflows[categoryKey].subcategories![subKey] = {
            label: subKey, // Use subcategory key as label
            values: subValues,
            total: subValues.reduce((sum, val) => (sum || 0) + (val || 0), 0) as number
          };
        }
      }
    }
    
    // Extract outflows categories using explicit column mapping
    for (const [categoryKey, category] of Object.entries(structure.categories.outflows || {})) {
      const categoryValues = this.extractRowDataFromMapping(worksheet, category.row, periodMapping);

      // Log outflow category extraction
      if (this.debugLog) {
        this.debugLog.dataExtractions.push({
          type: 'outflowCategory',
          categoryKey,
          rowNumber: category.row,
          extractedValues: categoryValues,
          total: categoryValues.reduce((sum, val) => (sum || 0) + (val || 0), 0)
        });
        console.log(`🔍 [DEBUG] Extracted outflow category ${categoryKey} from row ${category.row}:`, categoryValues);
      }

      processedData.categories.outflows[categoryKey] = {
        label: categoryKey, // Use category key as label
        values: categoryValues,
        total: categoryValues.reduce((sum, val) => (sum || 0) + (val || 0), 0) as number,
        subcategories: {}
      };
      
      // Process subcategories if they exist
      if (category.subcategories) {
        for (const [subKey, subcategory] of Object.entries(category.subcategories)) {
          const subValues = this.extractRowDataFromMapping(worksheet, subcategory.row, periodMapping);
          processedData.categories.outflows[categoryKey].subcategories![subKey] = {
            label: subKey, // Use subcategory key as label
            values: subValues,
            total: subValues.reduce((sum, val) => (sum || 0) + (val || 0), 0) as number
          };
        }
      }
    }
    
    // Calculate totalInflows and totalOutflows from categories if dataRows are missing/zero
    this.calculateTotalsFromCategories(processedData);
    
    // Calculate derived fields (netCashFlow and monthlyGeneration) if missing
    this.calculateDerivedFields(processedData);
    
    // Add period metadata for actual vs projected distinction (cash flow only)
    if (configuration.type === 'cashflow') {
      processedData.periodMetadata = this.generatePeriodMetadata(
        periodMapping,
        structure.lastActualPeriod
      );

      // Log period metadata generation
      if (this.debugLog) {
        this.debugLog.periodMetadata = processedData.periodMetadata;
        console.log('🔍 [DEBUG] Generated period metadata:', processedData.periodMetadata);
        console.log('🔍 [DEBUG] Last actual period configuration:', structure.lastActualPeriod);
      }
    }

    // Store final processed data and write debug log
    if (this.debugLog) {
      this.debugLog.finalData = JSON.parse(JSON.stringify(processedData));
      this.writeDebugLog();
      console.log('🔍 [DEBUG] Processing complete, debug log written');
    }

    return processedData;
  }
  
  /**
   * Process P&L data from Excel worksheet
   */
  private async processPLData(
    worksheet: XLSX.WorkSheet, 
    configuration: PLConfiguration
  ): Promise<ProcessedData> {
    const structure = configuration.structure;
    const processedData: ProcessedData = {
      type: 'pnl',
      periods: [],
      dataRows: {},
      categories: {},
      metadata: configuration.metadata
    };
    
    // CONFIGURATION-DRIVEN: Use ONLY explicit mapping - NO AUTO-DETECTION
    // Check for new format (periodMapping) or convert from legacy format (periodsRow + periodsRange)
    let periodMapping = structure.periodMapping;
    
    if (!periodMapping || periodMapping.length === 0) {
      // Try to convert from legacy format
      if (structure.periodsRow && structure.periodsRange) {
        periodMapping = this.convertLegacyPeriodsToMapping(worksheet, structure.periodsRow, structure.periodsRange);
      } else {
        throw new Error('Configuration must have explicit period mapping. Auto-detection is disabled.');
      }
    }
    
    const periods = this.extractPeriodsFromMapping(periodMapping);
    processedData.periods = periods;
    
    // Extract core data rows using explicit column mapping
    for (const [fieldName, rowNumber] of Object.entries(structure.dataRows)) {
      const rowData = this.extractRowDataFromMapping(worksheet, rowNumber, periodMapping);
      
      // Special logging for taxes to debug YTD calculation
      if (fieldName === 'taxes') {
      }
      
      processedData.dataRows[fieldName] = {
        label: this.getCellValue(worksheet, rowNumber, structure.categoriesColumn.charCodeAt(0) - 65), // Convert letter to column index
        values: rowData,
        total: rowData.reduce((sum, val) => (sum || 0) + (val || 0), 0) as number
      };
    }
    
    // Extract P&L categories using explicit column mapping
    for (const [groupKey, group] of Object.entries(structure.categories)) {
      processedData.categories[groupKey] = {};
      
      // Special logging for COGS and OPEX categories
      if (groupKey === 'cogs') {
      }
      if (groupKey === 'opex') {
      }
      
      for (const [categoryKey, category] of Object.entries(group)) {
        const rowData = this.extractRowDataFromMapping(worksheet, category.row, periodMapping);
        
        // Special logging for COGS categories
        if (groupKey === 'cogs') {
        }
        
        // Special logging for OPEX categories
        if (groupKey === 'opex') {
        }
        
        processedData.categories[groupKey][categoryKey] = {
          label: category.label ? 
                 (category.label as any)[configuration.metadata.locale] || (category.label as any).en || 'Unknown' : 
                 this.getCellValue(worksheet, category.row, structure.categoriesColumn.charCodeAt(0) - 65) || 'Unknown',
          values: rowData,
          total: rowData.reduce((sum, val) => (sum || 0) + (val || 0), 0) as number
        };
      }
    }
    
    return processedData;
  }
  
  /**
   * Store processed data in database
   */
  async storeProcessedData(
    companyId: string,
    configId: string,
    fileId: string,
    processedData: ProcessedData,
    processedBy: string
  ) {
    try {
      // Determine period range from processed data
      const periodStart = processedData.periods.length > 0 ? new Date(processedData.periods[0]) : null;
      const periodEnd = processedData.periods.length > 0 ? 
        new Date(processedData.periods[processedData.periods.length - 1]) : null;
      
      const result = await db
        .insert(processedFinancialData)
        .values({
          companyId,
          configId,
          fileId,
          dataJson: processedData,
          processingStatus: 'completed' as const,
          periodStart,
          periodEnd,
          currency: processedData.metadata.currency,
          units: processedData.metadata.units,
          processedBy
        } as any)
        .returning();
      
      return result[0];
      
    } catch (error) {
      console.error('Error storing processed data:', error);
      throw new Error('Failed to store processed data in database');
    }
  }
  
  /**
   * Store uploaded file information with content in database
   */
  async storeFileInfo(
    companyId: string,
    filename: string,
    originalFilename: string,
    fileContentBase64: string,
    fileSize: number,
    uploadedBy: string,
    uploadSession?: string,
    fileHash?: string
  ) {
    try {

      const result = await db
        .insert(financialDataFiles)
        .values({
          companyId,
          filename,
          originalFilename,
          fileContent: fileContentBase64,
          fileSize,
          fileHash,
          uploadedBy,
          uploadSession
        })
        .returning();
      
      return result[0];
      
    } catch (error) {
      console.error('Error storing file info:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorName: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        companyId,
        filename,
        uploadedBy
      });
      throw new Error('Failed to store file information in database');
    }
  }
  
  // Private helper methods
  
  /**
   * Convert legacy configuration format (periodsRow + periodsRange) to new periodMapping format
   * This provides backward compatibility for existing configurations
   */
  private convertLegacyPeriodsToMapping(worksheet: XLSX.WorkSheet, periodsRow: number, periodsRange: string): any[] {
    const periodMapping: any[] = [];
    
    // Parse the periods range (e.g., "B3:N3")
    const match = periodsRange.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
    if (!match) {
      throw new Error(`Invalid periods range format: ${periodsRange}. Expected format: A1:Z1`);
    }
    
    const [, startCol, startRow, endCol, endRow] = match;
    const startColIndex = this.columnLetterToIndex(startCol);
    const endColIndex = this.columnLetterToIndex(endCol);
    
    // Extract period labels from the specified row and range
    for (let col = startColIndex; col <= endColIndex; col++) {
      const columnLetter = this.getColumnLetter(col);
      const cellValue = this.getCellValue(worksheet, periodsRow, col);
      
      if (cellValue && cellValue.toString().trim()) {
        // Check if the cell value is an Excel date serial number
        const readableLabel = this.convertExcelDateToReadable(cellValue);
        
        periodMapping.push({
          column: columnLetter,
          period: {
            label: readableLabel
          }
        });
        // Legacy mapping: ${columnLetter} → ${cellValue} → ${readableLabel}
      }
    }
    
    return periodMapping;
  }

  /**
   * Convert Excel date serial number to readable date format
   */
  private convertExcelDateToReadable(cellValue: any): string {
    // If it's already a string and doesn't look like a number, return as-is
    if (typeof cellValue === 'string' && !cellValue.match(/^\d+(\.\d+)?$/)) {
      return cellValue;
    }
    
    // If it's a number that could be an Excel date serial number
    const numValue = typeof cellValue === 'number' ? cellValue : parseFloat(cellValue);
    
    // Excel date serial numbers are typically between 1 (Jan 1, 1900) and ~50000 (around 2036)
    // But we'll be more liberal and check for reasonable date ranges
    if (numValue > 40000 && numValue < 60000) {
      try {
        // Excel date serial number: days since January 1, 1900
        // Note: Excel incorrectly treats 1900 as a leap year, so we need to account for that
        const excelEpoch = new Date(1900, 0, 1);
        const millisecondsPerDay = 24 * 60 * 60 * 1000;
        
        // Subtract 1 because Excel counts from day 1, not day 0
        // Subtract another 1 to account for Excel's leap year bug
        const adjustedDays = numValue - 2;
        const resultDate = new Date(excelEpoch.getTime() + (adjustedDays * millisecondsPerDay));
        
        // Format as "MMM YYYY" (e.g., "Jan 2025")
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = monthNames[resultDate.getMonth()];
        const year = resultDate.getFullYear();
        
        return `${month} ${year}`;
      } catch (error) {
        return cellValue.toString();
      }
    }
    
    // If it doesn't look like a date serial number, return as-is
    return cellValue.toString();
  }

  /**
   * Convert column letter (A, B, C, etc.) to index (0, 1, 2, etc.)
   */
  private columnLetterToIndex(columnLetter: string): number {
    let result = 0;
    for (let i = 0; i < columnLetter.length; i++) {
      result = result * 26 + (columnLetter.charCodeAt(i) - 64);
    }
    return result - 1; // Convert to 0-based
  }

  /**
   * Extract periods from explicit period mapping configuration
   * This is the ONLY way periods should be determined - no auto-detection
   */
  private extractPeriodsFromMapping(periodMapping: any[]): string[] {
    const periods: string[] = [];
    
    // Sort by column to ensure correct order (A, B, C, etc.)
    const sortedMapping = [...periodMapping].sort((a, b) => {
      const colA = a.column.charCodeAt(0);
      const colB = b.column.charCodeAt(0);
      return colA - colB;
    });
    
    for (const mapping of sortedMapping) {
      periods.push(mapping.period.label);
      // Period mapping: ${mapping.column} → ${mapping.period.label}
    }
    
    // Configuration-based periods: ${periods.length} total
    return periods;
  }

  // REMOVED: Auto-detection methods are no longer used
  // All period detection must be done through explicit configuration mapping
  // This ensures exact column-to-period mapping with no guessing
  
  /**
   * Extract row data using explicit column mapping from configuration
   * NO AUTO-DETECTION - uses exact columns specified in period mapping
   */
  private extractRowDataFromMapping(worksheet: XLSX.WorkSheet, row: number, periodMapping: any[]): (number | null)[] {
    const data: (number | null)[] = [];
    const cellExtractions: any[] = [];

    // Sort mapping by column to ensure correct order
    const sortedMapping = [...periodMapping].sort((a, b) => {
      const colA = a.column.charCodeAt(0);
      const colB = b.column.charCodeAt(0);
      return colA - colB;
    });

    // Extract data from exact columns specified in mapping
    for (const mapping of sortedMapping) {
      const columnIndex = mapping.column.charCodeAt(0) - 65; // Convert A, B, C to 0, 1, 2
      const rawValue = this.getCellValue(worksheet, row, columnIndex);
      const processedValue = typeof rawValue === 'number' ? rawValue : null;

      // Log detailed cell extraction for debugging
      cellExtractions.push({
        column: mapping.column,
        columnIndex,
        period: mapping.period.label,
        rawValue,
        processedValue,
        cellAddress: `${mapping.column}${row}`
      });

      data.push(processedValue);
    }

    // Add cell extractions to debug log if available
    if (this.debugLog) {
      this.debugLog.dataExtractions.push({
        type: 'cellExtraction',
        row,
        cellExtractions
      });
    }

    return data;
  }

  /**
   * Legacy method - kept for backward compatibility but should not be used
   * @deprecated Use extractRowDataFromMapping instead
   */
  private extractRowData(worksheet: XLSX.WorkSheet, row: number, numColumns: number): (number | null)[] {
    const data: (number | null)[] = [];
    
    // Start from column B (index 1) for data, skip label column
    for (let col = 1; col < numColumns; col++) {
      const value = this.getCellValue(worksheet, row, col);
      data.push(typeof value === 'number' ? value : null);
    }
    
    return data;
  }

  /**
   * Calculate totalInflows and totalOutflows from categories when dataRows are zero/missing
   */
  private calculateTotalsFromCategories(processedData: ProcessedData): void {
    const periods = processedData.periods;
    
    // Check if totalInflows and totalOutflows need to be calculated
    const totalInflowsZero = processedData.dataRows.totalInflows?.values.every(v => v === 0 || v === null);
    const totalOutflowsZero = processedData.dataRows.totalOutflows?.values.every(v => v === 0 || v === null);
    
    if (totalInflowsZero || !processedData.dataRows.totalInflows) {
      
      // Initialize totalInflows if it doesn't exist
      if (!processedData.dataRows.totalInflows) {
        processedData.dataRows.totalInflows = {
          label: 'Total Inflows',
          values: new Array(periods.length).fill(0),
          total: 0
        };
      }
      
      // Sum all inflow categories for each period
      for (let periodIndex = 0; periodIndex < periods.length; periodIndex++) {
        let periodTotal = 0;
        
        for (const categoryKey of Object.keys(processedData.categories.inflows)) {
          const categoryValues = processedData.categories.inflows[categoryKey].values;
          if (categoryValues[periodIndex]) {
            periodTotal += categoryValues[periodIndex] || 0;
          }
        }
        
        processedData.dataRows.totalInflows.values[periodIndex] = periodTotal;
      }
      
      // Calculate total across all periods
      processedData.dataRows.totalInflows.total = 
        processedData.dataRows.totalInflows.values.reduce((sum, val) => (sum || 0) + (val || 0), 0) as number;
    }
    
    if (totalOutflowsZero || !processedData.dataRows.totalOutflows) {
      
      // Initialize totalOutflows if it doesn't exist
      if (!processedData.dataRows.totalOutflows) {
        processedData.dataRows.totalOutflows = {
          label: 'Total Outflows',
          values: new Array(periods.length).fill(0),
          total: 0
        };
      }
      
      // Sum all outflow categories for each period (outflows are typically negative)
      for (let periodIndex = 0; periodIndex < periods.length; periodIndex++) {
        let periodTotal = 0;
        
        for (const categoryKey of Object.keys(processedData.categories.outflows)) {
          const categoryValues = processedData.categories.outflows[categoryKey].values;
          if (categoryValues[periodIndex]) {
            periodTotal += Math.abs(categoryValues[periodIndex] || 0); // Take absolute value for total outflows
          }
        }
        
        processedData.dataRows.totalOutflows.values[periodIndex] = periodTotal;
      }
      
      // Calculate total across all periods
      processedData.dataRows.totalOutflows.total = 
        processedData.dataRows.totalOutflows.values.reduce((sum, val) => (sum || 0) + (val || 0), 0) as number;
    }
  }

  /**
   * Calculate derived fields (netCashFlow and monthlyGeneration) if missing or zero
   */
  private calculateDerivedFields(processedData: ProcessedData): void {
    const periods = processedData.periods;

    // Check if netCashFlow needs to be calculated
    const netCashFlowMissing = !processedData.dataRows.netCashFlow ||
      processedData.dataRows.netCashFlow.values.every(v => v === 0 || v === null || v === undefined);

    if (netCashFlowMissing) {
      console.log(`🔍 [DEBUG] netCashFlow missing, checking if monthlyGeneration exists...`);

      // If monthlyGeneration exists, use it for netCashFlow (they should be the same)
      if (processedData.dataRows.monthlyGeneration &&
          processedData.dataRows.monthlyGeneration.values.some(v => v !== 0 && v !== null && v !== undefined)) {

        console.log(`✅ [DEBUG] Using monthlyGeneration values for netCashFlow`);
        console.log(`📊 [DEBUG] monthlyGeneration values: ${JSON.stringify(processedData.dataRows.monthlyGeneration.values)}`);

        // Initialize netCashFlow if it doesn't exist
        if (!processedData.dataRows.netCashFlow) {
          processedData.dataRows.netCashFlow = {
            label: 'Net Cash Flow',
            values: new Array(periods.length).fill(0),
            total: 0
          };
        }

        // Copy monthlyGeneration values to netCashFlow
        processedData.dataRows.netCashFlow.values = [...processedData.dataRows.monthlyGeneration.values];
        processedData.dataRows.netCashFlow.total = processedData.dataRows.monthlyGeneration.total;

        console.log(`✅ [DEBUG] netCashFlow now matches monthlyGeneration: ${JSON.stringify(processedData.dataRows.netCashFlow.values)}`);

      } else {
        // Fallback: Calculate Net Cash Flow = Total Inflows - Total Outflows (only if monthlyGeneration not available)
        console.log(`⚠️  [DEBUG] monthlyGeneration not available, calculating netCashFlow from inflows-outflows`);

        // Initialize netCashFlow if it doesn't exist
        if (!processedData.dataRows.netCashFlow) {
          processedData.dataRows.netCashFlow = {
            label: 'Net Cash Flow',
            values: new Array(periods.length).fill(0),
            total: 0
          };
        }

        // Calculate Net Cash Flow = Total Inflows - Total Outflows
        for (let periodIndex = 0; periodIndex < periods.length; periodIndex++) {
          const inflow = processedData.dataRows.totalInflows?.values[periodIndex] || 0;
          const outflow = processedData.dataRows.totalOutflows?.values[periodIndex] || 0;
          processedData.dataRows.netCashFlow.values[periodIndex] = inflow - outflow;
        }

        // Calculate total across all periods
        processedData.dataRows.netCashFlow.total =
          processedData.dataRows.netCashFlow.values.reduce((sum, val) => (sum || 0) + (val || 0), 0) as number;
      }
    }
    
    // Check if monthlyGeneration needs to be calculated
    const monthlyGenerationMissing = !processedData.dataRows.monthlyGeneration || 
      processedData.dataRows.monthlyGeneration.values.every(v => v === 0 || v === null || v === undefined);
    
    if (monthlyGenerationMissing) {
      
      // Initialize monthlyGeneration if it doesn't exist
      if (!processedData.dataRows.monthlyGeneration) {
        processedData.dataRows.monthlyGeneration = {
          label: 'Monthly Generation',
          values: new Array(periods.length).fill(0),
          total: 0
        };
      }
      
      // Calculate Monthly Generation = Final Balance - Initial Balance
      for (let periodIndex = 0; periodIndex < periods.length; periodIndex++) {
        const finalBalance = processedData.dataRows.finalBalance?.values[periodIndex] || 0;
        const initialBalance = processedData.dataRows.initialBalance?.values[periodIndex] || 0;
        processedData.dataRows.monthlyGeneration.values[periodIndex] = finalBalance - initialBalance;
      }
      
      // Calculate total across all periods
      processedData.dataRows.monthlyGeneration.total = 
        processedData.dataRows.monthlyGeneration.values.reduce((sum, val) => (sum || 0) + (val || 0), 0) as number;
    }
  }
  
  private getCellValue(worksheet: XLSX.WorkSheet, row: number, col: number): any {
    const cellAddress = XLSX.utils.encode_cell({ r: row - 1, c: col });
    const cell = worksheet[cellAddress];
    const value = cell ? cell.v : null;
    
    // Debug logging for first few reads to see what's happening
    if (Math.random() < 0.1) { // Only log 10% of reads to avoid spam
    }
    
    return value;
  }
  
  /**
   * Apply data transformations based on configuration metadata
   */
  private transformData(data: ProcessedData): ProcessedData {
    // Apply unit conversions
    if (data.metadata.units === 'thousands') {
      this.multiplyNumericValues(data, 1000);
    } else if (data.metadata.units === 'millions') {
      this.multiplyNumericValues(data, 1000000);
    }
    
    // Apply any other transformations here
    
    return data;
  }
  
  private multiplyNumericValues(data: ProcessedData, multiplier: number) {
    // Transform data rows
    for (const fieldName of Object.keys(data.dataRows)) {
      data.dataRows[fieldName].values = data.dataRows[fieldName].values.map(val => 
        val !== null ? val * multiplier : val
      );
      data.dataRows[fieldName].total *= multiplier;
    }
    
    // Transform categories
    for (const groupKey of Object.keys(data.categories)) {
      for (const categoryKey of Object.keys(data.categories[groupKey])) {
        const category = data.categories[groupKey][categoryKey];
        category.values = category.values.map(val => val !== null ? val * multiplier : val);
        category.total *= multiplier;
        
        // Transform subcategories if they exist
        if (category.subcategories) {
          for (const subKey of Object.keys(category.subcategories)) {
            const subcategory = category.subcategories[subKey];
            subcategory.values = subcategory.values.map(val => val !== null ? val * multiplier : val);
            subcategory.total *= multiplier;
          }
        }
      }
    }
  }

  /**
   * Get Excel file preview data for displaying in the configuration editor
   */
  async getExcelPreview(
    fileContentBase64: string,
    originalFilename: string,
    configuration: any,
    selectedSheet?: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Convert base64 content back to buffer and read as Excel
      const buffer = Buffer.from(fileContentBase64, 'base64');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      
      // Smart sheet selection with manual override capability
      let sheetName: string;
      let detectedSheetName: string;
      
      // If a specific sheet is requested, use it (manual override)
      if (selectedSheet && workbook.SheetNames.includes(selectedSheet)) {
        sheetName = selectedSheet;
        detectedSheetName = selectedSheet;
      } else {
        // Smart detection: Look for the main data sheet - try to find one with cash flow or financial data
        detectedSheetName = workbook.SheetNames[0]; // Default to first sheet
        
        // Check if there are sheets with names that suggest cash flow data
        const dataSheetNames = workbook.SheetNames.filter(name => 
          name.toLowerCase().includes('cash') || 
          name.toLowerCase().includes('flow') ||
          name.toLowerCase().includes('flujo') ||
          name.toLowerCase().includes('data') ||
          name.toLowerCase().includes('main') ||
          name.toLowerCase().includes('principal')
        );
        
        if (dataSheetNames.length > 0) {
          detectedSheetName = dataSheetNames[0];
        }
        
        sheetName = detectedSheetName;
        // Smart detection selected sheet: ${detectedSheetName}
      }
      
      const worksheet = workbook.Sheets[sheetName];

      // Get sheet range
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:Z100');
      
      // Extract more rows and columns for comprehensive preview (for row selection)
      const previewRows = Math.min(200, range.e.r - range.s.r + 1); // Up to 200 rows or all available
      const previewCols = Math.min(20, range.e.c - range.s.c + 1); // Up to 20 columns or all available
      const previewData: any[][] = [];

      for (let row = range.s.r; row <= Math.min(range.e.r, range.s.r + previewRows - 1); row++) {
        const rowData: any[] = [];
        for (let col = range.s.c; col <= Math.min(range.e.c, range.s.c + previewCols - 1); col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const cellValue = worksheet[cellAddress] ? worksheet[cellAddress].v : null;
          rowData.push(cellValue);
        }
        previewData.push(rowData);
      }

      // Generate column headers (A, B, C, etc.)
      const columnHeaders = [];
      for (let col = 0; col < previewCols; col++) {
        columnHeaders.push(this.getColumnLetter(col));
      }

      // Identify highlighted areas based on configuration
      const highlights = this.getConfigurationHighlights(configuration);

      return {
        success: true,
        data: {
          filename: originalFilename,
          sheetName,
          detectedSheetName: selectedSheet ? detectedSheetName : sheetName, // Show what was detected when manual selection is used
          availableSheets: workbook.SheetNames,
          columnHeaders,
          rowData: previewData,
          highlights,
          totalRows: range.e.r - range.s.r + 1,
          totalCols: range.e.c - range.s.c + 1,
          isManualSelection: !!selectedSheet && workbook.SheetNames.includes(selectedSheet)
        }
      };
    } catch (error) {
      console.error('Excel preview error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown preview error'
      };
    }
  }

  /**
   * Generate column letter (A, B, C, ..., AA, AB, etc.)
   */
  private getColumnLetter(index: number): string {
    let result = '';
    while (index >= 0) {
      result = String.fromCharCode((index % 26) + 65) + result;
      index = Math.floor(index / 26) - 1;
    }
    return result;
  }

  /**
   * Get configuration-based highlights for the preview
   */
  private getConfigurationHighlights(configuration: any): any {
    const highlights: any = {
      periodsRow: null,
      periodsRange: null,
      categoriesColumn: null,
      dataRows: []
    };

    if (configuration?.structure) {
      const structure = configuration.structure;
      
      // Periods row highlight
      if (structure.periodsRow) {
        highlights.periodsRow = structure.periodsRow - 1; // Convert to 0-based
      }

      // Periods range highlight
      if (structure.periodsRange) {
        const match = structure.periodsRange.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
        if (match) {
          const [, startColStr, startRowStr, endColStr, endRowStr] = match;
          const startRow = parseInt(startRowStr) - 1; // Convert to 0-based
          const endRow = parseInt(endRowStr) - 1;
          const startCol = startColStr.split('').reduce((acc: number, char: string) => acc * 26 + char.charCodeAt(0) - 64, 0) - 1;
          const endCol = endColStr.split('').reduce((acc: number, char: string) => acc * 26 + char.charCodeAt(0) - 64, 0) - 1;
          
          highlights.periodsRange = {
            startRow,
            endRow,
            startCol,
            endCol
          };
        }
      }

      // Categories column (for P&L)
      if (structure.categoriesColumn) {
        const colIndex = structure.categoriesColumn.charCodeAt(0) - 65; // Convert to 0-based
        highlights.categoriesColumn = colIndex;
      }

      // Data rows
      if (structure.dataRows) {
        highlights.dataRows = Object.values(structure.dataRows).map((row: any) => row - 1); // Convert to 0-based
      }
    }

    return highlights;
  }

  /**
   * Process Excel file with configuration (from base64 content)
   */
  async processExcelWithConfiguration(fileContent: string, configuration: any, type: 'pnl' | 'cashflow', selectedSheet?: string): Promise<ProcessedData> {
    
    try {
      // Decode base64 Excel content
      const buffer = Buffer.from(fileContent, 'base64');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      
      // Smart sheet selection with manual override capability (same logic as getExcelPreview)
      let sheetName: string;
      let detectedSheetName: string;
      
      if (selectedSheet && workbook.SheetNames.includes(selectedSheet)) {
        sheetName = selectedSheet;
        detectedSheetName = selectedSheet;
      } else {
        // Smart detection: Look for the main data sheet - try to find one with cash flow or financial data
        detectedSheetName = workbook.SheetNames[0]; // Default to first sheet
        
        // Check if there are sheets with names that suggest cash flow data
        const dataSheetNames = workbook.SheetNames.filter(name => 
          name.toLowerCase().includes('cash') || 
          name.toLowerCase().includes('flow') ||
          name.toLowerCase().includes('flujo') ||
          name.toLowerCase().includes('data') ||
          name.toLowerCase().includes('main') ||
          name.toLowerCase().includes('principal')
        );
        
        if (dataSheetNames.length > 0) {
          detectedSheetName = dataSheetNames[0];
        }
        
        sheetName = detectedSheetName;
        // Smart detection selected sheet: ${detectedSheetName}
      }
      
      const worksheet = workbook.Sheets[sheetName];

      // Initialize debug logging for processExcelWithConfiguration
      this.initializeDebugLog(`live_processing_${Date.now()}.xlsx`, 'live_config', sheetName, configuration);

      console.log('🔍 [DEBUG] Live processing configuration loaded:', {
        type: configuration.type,
        lastActualPeriod: configuration.structure?.lastActualPeriod,
        sheetSelected: sheetName
      });

      // Process using the configuration
      if (type === 'cashflow') {
        return this.processCashFlowData(worksheet, configuration);
      } else if (type === 'pnl') {
        return this.processPLData(worksheet, configuration);
      } else {
        throw new Error(`Unsupported data type: ${type}`);
      }
    } catch (error) {
      console.error('Error processing Excel with configuration:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
      throw new Error(`Failed to process Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate period metadata for actual vs projected distinction
   */
  private generatePeriodMetadata(
    periodMapping: any[],
    lastActualPeriod?: any
  ): { [periodLabel: string]: { isActual: boolean; isProjected: boolean } } {
    const periodMetadata: { [periodLabel: string]: { isActual: boolean; isProjected: boolean } } = {};
    const debugInfo: any[] = [];

    if (!lastActualPeriod) {
      // No actual period set, all periods are projected
      periodMapping.forEach(mapping => {
        periodMetadata[mapping.period.label] = {
          isActual: false,
          isProjected: true
        };
        debugInfo.push({
          period: mapping.period.label,
          reason: 'No lastActualPeriod set',
          isActual: false,
          isProjected: true
        });
      });

      if (this.debugLog) {
        this.debugLog.transformations.push({
          type: 'periodMetadataGeneration',
          reason: 'No lastActualPeriod configured',
          lastActualPeriod: null,
          periodDecisions: debugInfo
        });
        console.log('🔍 [DEBUG] Period metadata: All periods marked as projected (no lastActualPeriod)');
      }

      return periodMetadata;
    }

    // Sort periods by date to determine which are actual vs projected
    const sortedPeriods = periodMapping.sort((a, b) => {
      return this.getPeriodSortKey(a.period) - this.getPeriodSortKey(b.period);
    });

    const lastActualSortKey = this.getPeriodSortKey(lastActualPeriod);

    sortedPeriods.forEach(mapping => {
      const periodSortKey = this.getPeriodSortKey(mapping.period);
      const isActual = periodSortKey <= lastActualSortKey;

      periodMetadata[mapping.period.label] = {
        isActual: isActual,
        isProjected: !isActual
      };

      debugInfo.push({
        period: mapping.period.label,
        periodData: mapping.period,
        periodSortKey,
        lastActualSortKey,
        comparison: `${periodSortKey} <= ${lastActualSortKey}`,
        isActual,
        isProjected: !isActual
      });
    });

    if (this.debugLog) {
      this.debugLog.transformations.push({
        type: 'periodMetadataGeneration',
        lastActualPeriod,
        lastActualSortKey,
        periodDecisions: debugInfo
      });
      console.log('🔍 [DEBUG] Period metadata generation details:', {
        lastActualPeriod,
        lastActualSortKey,
        decisions: debugInfo
      });
    }

    return periodMetadata;
  }

  /**
   * Generate a sortable key for period comparison
   */
  private getPeriodSortKey(period: any): number {
    // Create a sortable number for period comparison
    // Format: YYYYMMDD (year + month/quarter as MM + day as 01)
    const year = period.year || 0;
    let month = 1;
    
    if (period.type === 'month' && period.month) {
      month = period.month;
    } else if (period.type === 'quarter' && period.quarter) {
      month = (period.quarter - 1) * 3 + 1; // Q1=1, Q2=4, Q3=7, Q4=10
    } else if (period.type === 'year') {
      month = 12; // Year periods go at end of year
    }
    
    return year * 10000 + month * 100 + 1;
  }
}

export const excelProcessingService = new ExcelProcessingService();