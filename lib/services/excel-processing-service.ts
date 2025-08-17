import { db } from '@/lib/db';
import { 
  financialDataFiles, 
  processedFinancialData,
  companyConfigurations 
} from '@/lib/db/actual-schema';
import { 
  CashFlowConfiguration,
  PLConfiguration,
  ProcessedData,
  ExcelProcessingResult
} from '@/lib/types/configurations';

type Configuration = CashFlowConfiguration | PLConfiguration;
import { eq } from 'drizzle-orm';
import * as XLSX from 'xlsx';

export class ExcelProcessingService {
  
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
        console.log('🔄 Converting legacy configuration format to periodMapping...');
        periodMapping = this.convertLegacyPeriodsToMapping(worksheet, structure.periodsRow, structure.periodsRange);
        console.log('✅ Converted to periodMapping:', periodMapping.length, 'periods');
      } else {
        throw new Error('Configuration must have explicit period mapping. Auto-detection is disabled.');
      }
    }
    
    const periods = this.extractPeriodsFromMapping(periodMapping);
    console.log('🎯 Configuration-based processing - using explicit period mapping:', periods.length, 'periods');
    processedData.periods = periods;
    
    // Extract core data rows using explicit column mapping
    for (const [fieldName, rowNumber] of Object.entries(structure.dataRows)) {
      const rowData = this.extractRowDataFromMapping(worksheet, rowNumber, periodMapping);
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
        console.log('🔄 Converting legacy P&L configuration format to periodMapping...');
        periodMapping = this.convertLegacyPeriodsToMapping(worksheet, structure.periodsRow, structure.periodsRange);
        console.log('✅ Converted P&L to periodMapping:', periodMapping.length, 'periods');
      } else {
        throw new Error('Configuration must have explicit period mapping. Auto-detection is disabled.');
      }
    }
    
    const periods = this.extractPeriodsFromMapping(periodMapping);
    console.log('🎯 Configuration-based processing - using explicit period mapping for P&L:', periods.length, 'periods');
    processedData.periods = periods;
    
    // Extract core data rows using explicit column mapping
    for (const [fieldName, rowNumber] of Object.entries(structure.dataRows)) {
      const rowData = this.extractRowDataFromMapping(worksheet, rowNumber, periodMapping);
      console.log(`🔍 P&L Data Row [${fieldName}] from row ${rowNumber}:`, rowData);
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
        console.log(`📊 [EXCEL] Processing COGS categories:`, Object.keys(group));
      }
      if (groupKey === 'opex') {
        console.log(`💼 [EXCEL] Processing OPEX categories:`, Object.keys(group));
      }
      
      for (const [categoryKey, category] of Object.entries(group)) {
        const rowData = this.extractRowDataFromMapping(worksheet, category.row, periodMapping);
        
        // Special logging for COGS categories
        if (groupKey === 'cogs') {
          console.log(`📊 [EXCEL] COGS category ${categoryKey} (row ${category.row}):`, {
            rowData: rowData,
            firstThreeValues: rowData.slice(0, 3),
            total: rowData.reduce((sum, val) => (sum || 0) + (val || 0), 0)
          });
        }
        
        // Special logging for OPEX categories
        if (groupKey === 'opex') {
          console.log(`💼 [EXCEL] OPEX category ${categoryKey} (row ${category.row}):`, {
            rowData: rowData,
            firstThreeValues: rowData.slice(0, 3),
            total: rowData.reduce((sum, val) => (sum || 0) + (val || 0), 0)
          });
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
          processingStatus: 'completed',
          periodStart,
          periodEnd,
          currency: processedData.metadata.currency,
          units: processedData.metadata.units,
          processedBy
        })
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
      console.log('🗂️ Attempting to store file info:', {
        companyId,
        filename,
        originalFilename,
        fileSize,
        uploadedBy,
        uploadSession,
        fileContentLength: fileContentBase64?.length,
        hasFileHash: !!fileHash
      });

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
      
      console.log('✅ File info stored successfully:', {
        id: result[0]?.id,
        filename: result[0]?.filename,
        uploadedAt: result[0]?.uploadedAt
      });
      
      return result[0];
      
    } catch (error) {
      console.error('❌ Error storing file info:', {
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
    
    console.log(`🔄 Converting legacy range ${periodsRange} from row ${periodsRow}`);
    
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
        console.warn(`⚠️ Failed to convert Excel date ${numValue}:`, error);
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
    
    // Sort mapping by column to ensure correct order
    const sortedMapping = [...periodMapping].sort((a, b) => {
      const colA = a.column.charCodeAt(0);
      const colB = b.column.charCodeAt(0);
      return colA - colB;
    });
    
    // Extract data from exact columns specified in mapping
    for (const mapping of sortedMapping) {
      const columnIndex = mapping.column.charCodeAt(0) - 65; // Convert A, B, C to 0, 1, 2
      const value = this.getCellValue(worksheet, row, columnIndex);
      
      // Debug logging removed to prevent console flooding
      
      // Only accept numeric values, convert to null if not a number
      data.push(typeof value === 'number' ? value : null);
    }
    
    return data;
  }

  /**
   * Legacy method - kept for backward compatibility but should not be used
   * @deprecated Use extractRowDataFromMapping instead
   */
  private extractRowData(worksheet: XLSX.WorkSheet, row: number, numColumns: number): (number | null)[] {
    console.warn('⚠️ extractRowData is deprecated - use extractRowDataFromMapping instead');
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
      console.log('🔄 Calculating totalInflows from categories...');
      
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
      
      console.log('✅ Calculated totalInflows:', processedData.dataRows.totalInflows.values);
    }
    
    if (totalOutflowsZero || !processedData.dataRows.totalOutflows) {
      console.log('🔄 Calculating totalOutflows from categories...');
      
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
      
      console.log('✅ Calculated totalOutflows:', processedData.dataRows.totalOutflows.values);
    }
  }
  
  private getCellValue(worksheet: XLSX.WorkSheet, row: number, col: number): any {
    const cellAddress = XLSX.utils.encode_cell({ r: row - 1, c: col });
    const cell = worksheet[cellAddress];
    const value = cell ? cell.v : null;
    
    // Debug logging for first few reads to see what's happening
    if (Math.random() < 0.1) { // Only log 10% of reads to avoid spam
      console.log(`🔍 Cell ${cellAddress} (R${row}C${col+1}): ${value} (type: ${typeof value})`);
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
        console.log(`📋 Using manually selected sheet: "${selectedSheet}"`);
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
    console.log(`🔄 Processing Excel with live configuration for ${type}...`);
    console.log('🔍 Configuration received:', !!configuration);
    console.log('🔍 File content length:', fileContent?.length || 0);
    
    try {
      console.log('📥 Decoding base64 Excel content...');
      // Decode base64 Excel content
      const buffer = Buffer.from(fileContent, 'base64');
      console.log('📊 Buffer created, size:', buffer.length);
      
      console.log('📖 Reading Excel workbook...');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      
      console.log('📋 Excel sheets found:', workbook.SheetNames);
      
      // Smart sheet selection with manual override capability (same logic as getExcelPreview)
      let sheetName: string;
      let detectedSheetName: string;
      
      console.log('🔍 Sheet selection debug:');
      console.log('- selectedSheet parameter:', selectedSheet);
      console.log('- available sheets:', workbook.SheetNames);
      console.log('- selectedSheet exists in workbook:', selectedSheet ? workbook.SheetNames.includes(selectedSheet) : false);
      
      if (selectedSheet && workbook.SheetNames.includes(selectedSheet)) {
        sheetName = selectedSheet;
        detectedSheetName = selectedSheet;
        console.log(`📋 Using manually selected sheet: "${selectedSheet}"`);
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
      console.log('📄 Using worksheet:', sheetName);
      
      // Process using the configuration
      console.log('🔄 Processing data with configuration type:', type);
      if (type === 'cashflow') {
        console.log('💰 Processing as Cash Flow...');
        return this.processCashFlowData(worksheet, configuration);
      } else if (type === 'pnl') {
        console.log('📊 Processing as P&L...');
        return this.processPLData(worksheet, configuration);
      } else {
        throw new Error(`Unsupported data type: ${type}`);
      }
    } catch (error) {
      console.error('❌ Error processing Excel with configuration:', error);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
      throw new Error(`Failed to process Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const excelProcessingService = new ExcelProcessingService();