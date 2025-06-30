import { Buffer } from 'buffer'
import * as ExcelJS from 'exceljs'
import { logger } from '../utils/logger'
import { ConfigurationService } from './ConfigurationService'
import { FinancialStatementParser } from './FinancialStatementParser'
import { pool } from '../config/database'
import { encryptionService } from '../utils/encryption'

interface PnLRow {
  lineItem: string
  category?: string
  [key: string]: string | number | undefined // For dynamic month columns
}

interface PnLMetrics {
  month: string
  revenue: number
  cogs: number
  grossProfit: number
  grossMargin: number
  operatingExpenses: number
  operatingIncome: number
  operatingMargin: number
  otherIncomeExpenses: number
  netIncome: number
  netMargin: number
  ebitda: number
  ebitdaMargin: number
  // Personnel Cost Details
  personnelSalariesCoR?: number
  payrollTaxesCoR?: number
  personnelSalariesOp?: number
  payrollTaxesOp?: number
  healthCoverage?: number
  personnelBenefits?: number
  totalPersonnelCost?: number
  // Cost Structure
  contractServicesCoR?: number
  contractServicesOp?: number
  professionalServices?: number
  salesMarketing?: number
  facilitiesAdmin?: number
}

interface PnLSummary {
  totalRevenue: number
  totalCOGS: number
  totalGrossProfit: number
  avgGrossMargin: number
  totalOperatingExpenses: number
  totalOperatingIncome: number
  avgOperatingMargin: number
  totalEBITDA: number
  avgEBITDAMargin: number
  totalNetIncome: number
  avgNetMargin: number
}

export class PnLService {
  private static instance: PnLService
  private storedData: PnLRow[] = []
  private storedMetrics: PnLMetrics[] = []
  private lastUploadDate: Date | null = null
  private lastUploadedFileName: string | null = null
  private processedFormat: 'vortex' | 'standard' | 'custom' | null = null
  private vortexYTDEbitda: number | null = null
  private configService: ConfigurationService

  private constructor() {
    this.configService = ConfigurationService.getInstance()
  }

  static getInstance(): PnLService {
    if (!PnLService.instance) {
      PnLService.instance = new PnLService()
    }
    return PnLService.instance
  }

  async processExcelFile(buffer: Buffer): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      logger.info('Starting P&L Excel file processing')
      
      // PRIORITY 1: Check if this is Vortex format - MUST ALWAYS WORK
      const isVortexFormat = await this.checkIfVortexFormat(buffer);
      if (isVortexFormat) {
        logger.info('Detected Vortex P&L format - using dedicated Vortex processor')
        return this.processWithVortexStructure(buffer)
      }
      
      // PRIORITY 2: Use the financial logic parser for all non-Vortex formats
      logger.info('Using financial logic parser for P&L analysis')
      return this.processWithFinancialLogic(buffer)
      
    } catch (error) {
      logger.error('Error processing P&L Excel file:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }
  
  /**
   * Process using financial logic parser - understands what numbers mean, not where they are
   */
  private async processWithFinancialLogic(buffer: Buffer): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      logger.info('=== STARTING FINANCIAL LOGIC PROCESSING ===')
      const parser = new FinancialStatementParser()
      const statement = await parser.parseFinancialStatement(buffer)
      
      if (statement.type !== 'pnl') {
        throw new Error('This file appears to be a ' + statement.type + ' statement, not a P&L')
      }
      
      // Convert to our metrics format
      const metrics: PnLMetrics[] = []
      
      statement.timePeriods.forEach(period => {
        const periodData = statement.data[period.period]
        if (!periodData) return
        
        const revenue = periodData.revenue || 0
        const cogs = periodData.cogs || 0
        const grossProfit = periodData.grossProfit || (revenue - cogs)
        const operatingExpenses = periodData.operatingExpenses || 0
        const operatingIncome = periodData.operatingIncome || (grossProfit - operatingExpenses)
        const netIncome = periodData.netIncome || operatingIncome
        const ebitda = periodData.ebitda || operatingIncome
        
        metrics.push({
          month: period.period,
          revenue,
          cogs,
          grossProfit,
          grossMargin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
          operatingExpenses,
          operatingIncome,
          operatingMargin: revenue > 0 ? (operatingIncome / revenue) * 100 : 0,
          otherIncomeExpenses: 0,
          netIncome,
          netMargin: revenue > 0 ? (netIncome / revenue) * 100 : 0,
          ebitda,
          ebitdaMargin: revenue > 0 ? (ebitda / revenue) * 100 : 0
        })
      })
      
      // Filter out empty months
      const validMetrics = metrics.filter(m => m.revenue > 0)
      
      if (validMetrics.length === 0) {
        throw new Error('No valid P&L data found. Please use the AI wizard to map your custom format.')
      }
      
      this.storedMetrics = validMetrics
      this.lastUploadDate = new Date()
      this.processedFormat = 'standard'
      
      logger.info(`Financial logic processing complete. Found ${validMetrics.length} months of P&L data`)
      logger.info(`=== P&L METRICS FROM PARSER ===`)
      validMetrics.forEach((m, idx) => {
        logger.info(`${idx}: ${m.month} - Revenue: ${m.revenue}, COGS: ${m.cogs}, GP: ${m.grossProfit}`)
      })
      logger.info(`==============================`)
      
      return {
        success: true,
        data: {
          months: validMetrics.length,
          lastMonth: validMetrics[validMetrics.length - 1]?.month || 'N/A',
          format: 'Financial Logic Parser'
        }
      }
    } catch (error) {
      logger.error('Error in financial logic processing:', error)
      logger.info('Falling back to standard P&L processing')
      // Fall back to the standard processor if financial logic fails
      return this.processWithDefaultStructure(buffer)
    }
  }

  /**
   * Check specifically for Vortex format files
   * These MUST always work correctly
   */
  private async checkIfVortexFormat(buffer: Buffer): Promise<boolean> {
    try {
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(buffer)
      
      // Vortex files have specific characteristics:
      // 1. Sheet name includes "Combined" and "Pesos"
      const hasVortexSheet = workbook.worksheets.some(ws => 
        ws.name.toLowerCase().includes('combined') && 
        ws.name.toLowerCase().includes('pesos')
      );
      
      if (!hasVortexSheet) {
        return false;
      }
      
      // 2. Check for Vortex-specific row structure
      const worksheet = workbook.worksheets.find(ws => 
        ws.name.toLowerCase().includes('combined') && 
        ws.name.toLowerCase().includes('pesos')
      ) || workbook.worksheets[0];
      
      // Vortex format has:
      // Row 8: Total Revenue
      // Row 18: Total Cost of Revenue
      // Row 19: Gross Profit
      const row8Label = String(worksheet.getRow(8).getCell(1).value || '').toLowerCase();
      const row18Label = String(worksheet.getRow(18).getCell(1).value || '').toLowerCase();
      const row19Label = String(worksheet.getRow(19).getCell(1).value || '').toLowerCase();
      
      const hasVortexRevenue = row8Label.includes('total revenue') || row8Label.includes('revenue');
      const hasVortexCost = row18Label.includes('total cost') || row18Label.includes('cost of revenue');
      const hasVortexGrossProfit = row19Label.includes('gross profit');
      
      const isVortex = hasVortexSheet && hasVortexRevenue && hasVortexCost;
      
      logger.info(`Vortex format check - Sheet: ${hasVortexSheet}, Revenue: ${hasVortexRevenue}, Cost: ${hasVortexCost}, Result: ${isVortex}`);
      
      return isVortex;
    } catch (error) {
      logger.error('Error checking Vortex format:', error);
      return false;
    }
  }

  /**
   * Process Vortex format files with exact logic
   * This MUST work for all Vortex files
   */
  private async processWithVortexStructure(buffer: Buffer): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(buffer)
      
      // Find the Vortex sheet
      let worksheet = workbook.worksheets.find(ws => 
        ws.name.toLowerCase().includes('combined') && ws.name.toLowerCase().includes('pesos')
      );
      
      if (!worksheet) {
        worksheet = workbook.worksheets[0];
      }

      // Vortex format key rows
      const keyRows = {
        revenue: 8,
        costOfRevenue: 18,
        grossProfit: 19,
        grossMargin: 20,
        operatingExpenses: 52,
        ebitda: 65,
        ebitdaMargin: 66,
        netIncome: 81,
        netIncomeMargin: 82,
        // Personnel Cost Details
        personnelSalariesCoR: 11,
        payrollTaxesCoR: 12,
        personnelSalariesOp: 23,
        payrollTaxesOp: 24,
        healthCoverageCoR: 14,
        healthCoverageOp: 25,
        personnelBenefits: 26,
        // Other Cost Categories
        contractServicesCoR: 13,
        contractServicesOp: 27,
        businessDevelopment: 29,
        marketingPromotion: 30,
        accountingServices: 43,
        legalServices: 46,
        officeRent: 38
      };

      // Extract month columns - Vortex has dates in even columns
      const monthColumns: { [key: string]: number } = {};
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                         'July', 'August', 'September', 'October', 'November', 'December'];
      
      const headerRow = worksheet.getRow(4); // Vortex has dates in row 4
      let monthIndex = 0;
      
      // Even columns contain values (2, 4, 6, 8, etc.)
      for (let col = 2; col <= 24; col += 2) {
        const cellValue = headerRow.getCell(col).value;
        
        if (cellValue && monthIndex < monthNames.length) {
          monthColumns[monthNames[monthIndex]] = col;
          monthIndex++;
        }
      }

      logger.info(`Vortex format: Found ${Object.keys(monthColumns).length} months`);

      // Process using existing Vortex logic
      const metrics: PnLMetrics[] = [];
      
      // Calculate YTD EBITDA by summing specific columns (B, D, F, H, J) from row 65
      const getYTDEbitda = (): number => {
        const ytdColumns = [2, 4, 6, 8, 10]; // Columns B, D, F, H, J
        let ytdEbitda = 0;
        const columnValues: any = {};
        
        ytdColumns.forEach(col => {
          const cell = worksheet!.getRow(keyRows.ebitda).getCell(col);
          const value = cell.value;
          let numValue = 0;
          
          if (typeof value === 'number') {
            numValue = value;
          } else if (value && typeof value === 'object' && 'result' in value) {
            numValue = typeof value.result === 'number' ? value.result : 0;
          }
          
          const colLetter = String.fromCharCode(64 + col); // Convert to letter (B, D, F, etc.)
          columnValues[colLetter] = numValue;
          ytdEbitda += numValue;
          
          logger.info(`EBITDA Row 65, Column ${colLetter}: ${numValue} (raw value: ${JSON.stringify(value)})`);
        });
        
        logger.info(`YTD EBITDA calculation details:`, columnValues);
        logger.info(`YTD EBITDA total: ${ytdEbitda}`);
        return ytdEbitda;
      };
      
      // Calculate YTD EBITDA once for all months
      const ytdEbitdaValue = getYTDEbitda();
      this.vortexYTDEbitda = ytdEbitdaValue; // Store for later use
      
      Object.entries(monthColumns).forEach(([month, col]) => {
        const getValue = (rowNum: number): number => {
          const cell = worksheet!.getRow(rowNum).getCell(col);
          const value = cell.value;
          
          if (typeof value === 'number') {
            return value;
          } else if (value && typeof value === 'object' && 'result' in value) {
            return typeof value.result === 'number' ? value.result : 0;
          }
          return 0;
        };

        const revenue = getValue(keyRows.revenue);
        const cogs = getValue(keyRows.costOfRevenue);
        const grossProfit = getValue(keyRows.grossProfit);
        
        if (revenue > 0) {
          const operatingExpenses = getValue(keyRows.operatingExpenses);
          // For Vortex format, individual month EBITDA values might not be meaningful
          // We'll store the individual month value but also store YTD for June
          const monthEbitda = getValue(keyRows.ebitda);
          const ebitda = monthEbitda;
          const netIncome = getValue(keyRows.netIncome);
          
          const personnelSalariesCoR = Math.abs(getValue(keyRows.personnelSalariesCoR));
          const payrollTaxesCoR = Math.abs(getValue(keyRows.payrollTaxesCoR));
          const personnelSalariesOp = Math.abs(getValue(keyRows.personnelSalariesOp));
          const payrollTaxesOp = Math.abs(getValue(keyRows.payrollTaxesOp));
          const healthCoverageCoR = Math.abs(getValue(keyRows.healthCoverageCoR));
          const healthCoverageOp = Math.abs(getValue(keyRows.healthCoverageOp));
          const personnelBenefits = Math.abs(getValue(keyRows.personnelBenefits));
          
          const totalPersonnelCost = personnelSalariesCoR + payrollTaxesCoR + 
                                    personnelSalariesOp + payrollTaxesOp + 
                                    healthCoverageCoR + healthCoverageOp + 
                                    personnelBenefits;
          
          logger.info(`Month ${month}, Column ${col}: EBITDA = ${ebitda}`);
          
          metrics.push({
            month,
            revenue,
            cogs: Math.abs(cogs),
            grossProfit,
            grossMargin: getValue(keyRows.grossMargin) * 100,
            operatingExpenses: Math.abs(operatingExpenses),
            operatingIncome: grossProfit - Math.abs(operatingExpenses),
            operatingMargin: revenue > 0 ? ((grossProfit - Math.abs(operatingExpenses)) / revenue) * 100 : 0,
            otherIncomeExpenses: 0,
            netIncome,
            netMargin: getValue(keyRows.netIncomeMargin) * 100,
            ebitda,
            ebitdaMargin: getValue(keyRows.ebitdaMargin) * 100,
            // All Vortex-specific fields
            personnelSalariesCoR,
            payrollTaxesCoR,
            personnelSalariesOp,
            payrollTaxesOp,
            healthCoverage: healthCoverageCoR + healthCoverageOp,
            personnelBenefits,
            totalPersonnelCost: totalPersonnelCost > 0 ? totalPersonnelCost : undefined,
            // Contract services
            contractServicesCoR: Math.abs(getValue(keyRows.contractServicesCoR)),
            contractServicesOp: Math.abs(getValue(keyRows.contractServicesOp)),
            // Other categories
            salesMarketing: Math.abs(getValue(keyRows.businessDevelopment)) + Math.abs(getValue(keyRows.marketingPromotion)),
            professionalServices: Math.abs(getValue(keyRows.accountingServices)) + Math.abs(getValue(keyRows.legalServices)),
            facilitiesAdmin: Math.abs(getValue(keyRows.officeRent))
          });
        }
      });

      this.storedMetrics = metrics;
      this.lastUploadDate = new Date();
      this.processedFormat = 'vortex';

      logger.info(`Vortex P&L processing complete. Processed ${metrics.length} months`);

      return {
        success: true,
        data: {
          months: metrics.length,
          lastMonth: metrics[metrics.length - 1]?.month || 'N/A',
          format: 'Vortex'
        }
      };
    } catch (error) {
      logger.error('Error processing Vortex format:', error);
      throw error;
    }
  }

  private async checkIfStandardFormat(buffer: Buffer): Promise<boolean> {
    try {
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(buffer)
      
      const worksheet = workbook.worksheets[0]
      
      // Enhanced P&L format detection - more flexible approach
      // Look for key P&L terms in first 15 rows, not just specific rows
      let revenueFound = false;
      let cogsFound = false;
      let grossProfitFound = false;
      
      for (let row = 1; row <= Math.min(15, worksheet.rowCount); row++) {
        const cellValue = String(worksheet.getRow(row).getCell(1).value || '').toLowerCase();
        
        // Enhanced revenue detection (English/Spanish)
        if (!revenueFound && (
          cellValue.includes('revenue') || 
          cellValue.includes('ingreso') || 
          cellValue.includes('sales') ||
          cellValue.includes('ventas') ||
          cellValue.includes('facturaci') ||
          /^(total.*)?ventas?$/.test(cellValue) ||
          /^(total.*)?ingresos?$/.test(cellValue) ||
          cellValue.includes('total revenue')
        )) {
          revenueFound = true;
        }
        
        // Enhanced COGS detection (English/Spanish)
        if (!cogsFound && (
          cellValue.includes('cost of goods') || 
          cellValue.includes('cost of revenue') ||
          cellValue.includes('cogs') || 
          cellValue.includes('costo de') ||
          cellValue.includes('costo de ventas') ||
          cellValue.includes('costo directo') ||
          /^(total.*)?costo/.test(cellValue)
        )) {
          cogsFound = true;
        }
        
        // Enhanced gross profit detection (English/Spanish)
        if (!grossProfitFound && (
          cellValue.includes('gross profit') || 
          cellValue.includes('utilidad bruta') || 
          cellValue.includes('ganancia bruta') ||
          cellValue.includes('margen bruto') ||
          /^(utilidad|ganancia).*bruta/.test(cellValue)
        )) {
          grossProfitFound = true;
        }
      }
      
      // More lenient check - need at least revenue indicator
      // This allows more formats to be considered "standard" and use default processing
      const isStandardLike = revenueFound && (cogsFound || grossProfitFound);
      
      logger.info(`Standard format check - Revenue: ${revenueFound}, COGS: ${cogsFound}, GP: ${grossProfitFound}, Result: ${isStandardLike}`);
      
      return isStandardLike;
    } catch (error) {
      logger.error('Error checking standard format:', error);
      return false;
    }
  }

  private async processWithConfiguration(buffer: Buffer, config: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(buffer)
      
      // Find worksheet by name from configuration
      let worksheet = workbook.worksheets.find(ws => 
        ws.name.toLowerCase() === config.worksheetName.toLowerCase()
      )
      
      if (!worksheet) {
        // Fallback to first worksheet
        worksheet = workbook.worksheets[0]
        logger.warn(`Configured worksheet '${config.worksheetName}' not found, using: ${worksheet.name}`)
      }

      // Use configured structure
      const metrics: PnLMetrics[] = []
      let validDataCount = 0;
      
      Object.entries(config.monthColumns).forEach(([month, col]: [string, any]) => {
        const getValue = (rowNum: number): number => {
          const cell = worksheet!.getRow(rowNum).getCell(col)
          const value = cell.value
          
          if (typeof value === 'number') {
            return value
          } else if (value && typeof value === 'object' && 'result' in value) {
            return typeof value.result === 'number' ? value.result : 0
          }
          return 0
        }

        const revenue = getValue(config.metricRows.revenue || 8)
        const cogs = getValue(config.metricRows.costOfRevenue || 18)
        const grossProfit = getValue(config.metricRows.grossProfit || 19)
        
        // Validate that the data makes sense
        // Revenue should be positive and typically larger than individual cost components
        // Gross profit should be positive and less than revenue
        if (revenue > 0 && revenue > cogs && grossProfit > 0 && grossProfit < revenue) {
          validDataCount++;
          const operatingExpenses = getValue(config.metricRows.operatingExpenses || 52)
          const ebitda = getValue(config.metricRows.ebitda || 65)
          const netIncome = getValue(config.metricRows.netIncome || 81)
          
          const grossMarginPercent = getValue(config.metricRows.grossMargin || 20) * 100
          const ebitdaMarginPercent = getValue(config.metricRows.ebitdaMargin || 66) * 100
          const netIncomeMarginPercent = getValue(config.metricRows.netIncomeMargin || 82) * 100
          
          const operatingIncome = grossProfit - Math.abs(operatingExpenses)
          const operatingMarginPercent = revenue > 0 ? (operatingIncome / revenue) * 100 : 0
          
          // Extract personnel costs if configured
          const personnelSalariesCoR = config.metricRows.personnelSalariesCoR ? Math.abs(getValue(config.metricRows.personnelSalariesCoR)) : 0
          const payrollTaxesCoR = config.metricRows.payrollTaxesCoR ? Math.abs(getValue(config.metricRows.payrollTaxesCoR)) : 0
          const personnelSalariesOp = config.metricRows.personnelSalariesOp ? Math.abs(getValue(config.metricRows.personnelSalariesOp)) : 0
          const payrollTaxesOp = config.metricRows.payrollTaxesOp ? Math.abs(getValue(config.metricRows.payrollTaxesOp)) : 0
          const healthCoverageCoR = config.metricRows.healthCoverageCoR ? Math.abs(getValue(config.metricRows.healthCoverageCoR)) : 0
          const healthCoverageOp = config.metricRows.healthCoverageOp ? Math.abs(getValue(config.metricRows.healthCoverageOp)) : 0
          const personnelBenefits = config.metricRows.personnelBenefits ? Math.abs(getValue(config.metricRows.personnelBenefits)) : 0
          
          const totalPersonnelCost = personnelSalariesCoR + payrollTaxesCoR + 
                                    personnelSalariesOp + payrollTaxesOp + 
                                    healthCoverageCoR + healthCoverageOp + 
                                    personnelBenefits
          
          // Extract other cost categories if configured
          const contractServicesCoR = config.metricRows.contractServicesCoR ? Math.abs(getValue(config.metricRows.contractServicesCoR)) : 0
          const contractServicesOp = config.metricRows.contractServicesOp ? Math.abs(getValue(config.metricRows.contractServicesOp)) : 0
          
          metrics.push({
            month,
            revenue,
            cogs: Math.abs(cogs),
            grossProfit,
            grossMargin: grossMarginPercent,
            operatingExpenses: Math.abs(operatingExpenses),
            operatingIncome,
            operatingMargin: operatingMarginPercent,
            otherIncomeExpenses: 0,
            netIncome,
            netMargin: netIncomeMarginPercent,
            ebitda,
            ebitdaMargin: ebitdaMarginPercent,
            personnelSalariesCoR,
            payrollTaxesCoR,
            personnelSalariesOp,
            payrollTaxesOp,
            healthCoverage: healthCoverageCoR + healthCoverageOp,
            personnelBenefits,
            totalPersonnelCost: totalPersonnelCost > 0 ? totalPersonnelCost : undefined,
            contractServicesCoR,
            contractServicesOp
          })
        }
      })

      // Check if we found valid data
      if (validDataCount === 0 || metrics.length === 0) {
        logger.warn('No valid P&L data found using current configuration');
        throw new Error('Unable to detect data structure in the Excel file. Please use the AI wizard to map your custom format.');
      }

      this.storedMetrics = metrics
      this.lastUploadDate = new Date()

      logger.info(`P&L processing complete using configuration. Processed ${metrics.length} months with ${validDataCount} valid entries`)

      const activeCompany = this.configService.getActiveCompany()
      return {
        success: true,
        data: {
          months: metrics.length,
          lastMonth: metrics[metrics.length - 1]?.month || 'N/A',
          configuration: activeCompany?.name
        }
      }
    } catch (error) {
      logger.error('Error processing with configuration:', error)
      throw error
    }
  }

  private async processWithDefaultStructure(buffer: Buffer): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(buffer)
      
      // Look for "Combined Pesos" worksheet
      let worksheet = workbook.worksheets.find(ws => 
        ws.name.toLowerCase().includes('combined') && ws.name.toLowerCase().includes('pesos')
      )
      
      if (!worksheet) {
        worksheet = workbook.worksheets[0]
        logger.info(`Using worksheet: ${worksheet.name}`)
      }

      // Check if this is standard P&L format (Revenue in row 2) or Vortex format (Revenue in row 8)
      const row2Label = String(worksheet.getRow(2).getCell(1).value || '').toLowerCase();
      const isStandardFormat = row2Label.includes('revenue') || row2Label.includes('sales');
      
      logger.info(`Detected format: ${isStandardFormat ? 'Standard P&L' : 'Vortex P&L'}`);

      // Use known structure for now (we'll enhance this later)
      const keyRows = isStandardFormat ? {
        // Standard P&L format row mappings
        revenue: 2,
        costOfRevenue: 3,
        grossProfit: 4,
        grossMargin: 5,
        operatingExpenses: 11,
        ebitda: 13,
        ebitdaMargin: 14,
        netIncome: 19,
        netIncomeMargin: 20,
        // Personnel Cost Details - not in standard format
        personnelSalariesCoR: 0,
        payrollTaxesCoR: 0,
        personnelSalariesOp: 0,
        payrollTaxesOp: 0,
        healthCoverageCoR: 0,
        healthCoverageOp: 0,
        personnelBenefits: 0,
        // Other Cost Categories
        contractServicesCoR: 0,
        contractServicesOp: 0,
        businessDevelopment: 8,
        marketingPromotion: 0,
        accountingServices: 9,
        legalServices: 0,
        officeRent: 0
      } : {
        // Vortex format row mappings
        revenue: 8,
        costOfRevenue: 18,
        grossProfit: 19,
        grossMargin: 20,
        operatingExpenses: 52,
        ebitda: 65,
        ebitdaMargin: 66,
        netIncome: 81,
        netIncomeMargin: 82,
        // Personnel Cost Details
        personnelSalariesCoR: 11,
        payrollTaxesCoR: 12,
        personnelSalariesOp: 23,
        payrollTaxesOp: 24,
        healthCoverageCoR: 14,
        healthCoverageOp: 25,
        personnelBenefits: 26,
        // Other Cost Categories
        contractServicesCoR: 13,
        contractServicesOp: 27,
        businessDevelopment: 29,
        marketingPromotion: 30,
        accountingServices: 43,
        legalServices: 46,
        officeRent: 38
      }

      // Generic month column detection - THIS IS THE KEY FIX
      const monthColumns: { [key: string]: number } = {}
      const headerRow = isStandardFormat ? worksheet.getRow(1) : worksheet.getRow(4)
      
      // Read actual month headers from Excel
      for (let col = 2; col <= Math.min(50, worksheet.columnCount); col++) {
        const cellValue = headerRow.getCell(col).value
        
        if (cellValue) {
          const cellString = String(cellValue).trim()
          // Check if this looks like a date/month
          const dateInfo = this.detectDateValue(cellValue)
          if (dateInfo.isDate) {
            monthColumns[dateInfo.originalValue] = col
            logger.info(`Found month header at column ${col}: ${dateInfo.originalValue}`)
          }
        }
      }
      
      logger.info(`Detected ${Object.keys(monthColumns).length} month columns:`, Object.keys(monthColumns))

      // Extract metrics for each month
      const metrics: PnLMetrics[] = []
      let validDataCount = 0;
      
      Object.entries(monthColumns).forEach(([monthHeader, col]) => {
        // monthHeader is now the actual Excel header like "May-25" or "Jun-25"
        const getValue = (rowNum: number): number => {
          const cell = worksheet!.getRow(rowNum).getCell(col)
          const value = cell.value
          
          if (typeof value === 'number') {
            return value
          } else if (value && typeof value === 'object' && 'result' in value) {
            // Handle formula cells
            return typeof value.result === 'number' ? value.result : 0
          }
          return 0
        }

        const revenue = getValue(keyRows.revenue)
        const cogs = getValue(keyRows.costOfRevenue)
        const grossProfit = getValue(keyRows.grossProfit)
        
        // Validate that the data makes sense
        // Skip months with no revenue or where data relationships don't make sense
        if (revenue <= 0 || revenue <= cogs || grossProfit <= 0 || grossProfit >= revenue) {
          return;
        }
        
        validDataCount++;
        const operatingExpenses = getValue(keyRows.operatingExpenses)
        const ebitda = getValue(keyRows.ebitda)
        const netIncome = getValue(keyRows.netIncome)
        
        // Get the gross margin percentage directly from row 20
        const grossMarginPercent = getValue(keyRows.grossMargin) * 100 // Convert to percentage
        
        // Get EBITDA margin percentage from row 66
        const ebitdaMarginPercent = getValue(keyRows.ebitdaMargin) * 100 // Convert to percentage
        
        // Get net income margin percentage from row 82
        const netIncomeMarginPercent = getValue(keyRows.netIncomeMargin) * 100 // Convert to percentage
        
        // Extract Personnel Cost Details
        const personnelSalariesCoR = Math.abs(getValue(keyRows.personnelSalariesCoR))
        const payrollTaxesCoR = Math.abs(getValue(keyRows.payrollTaxesCoR))
        const personnelSalariesOp = Math.abs(getValue(keyRows.personnelSalariesOp))
        const payrollTaxesOp = Math.abs(getValue(keyRows.payrollTaxesOp))
        const healthCoverageCoR = Math.abs(getValue(keyRows.healthCoverageCoR))
        const healthCoverageOp = Math.abs(getValue(keyRows.healthCoverageOp))
        const personnelBenefits = Math.abs(getValue(keyRows.personnelBenefits))
        
        const totalPersonnelCost = personnelSalariesCoR + payrollTaxesCoR + 
                                  personnelSalariesOp + payrollTaxesOp + 
                                  healthCoverageCoR + healthCoverageOp + 
                                  personnelBenefits
        
        // Extract Other Cost Categories
        const contractServicesCoR = Math.abs(getValue(keyRows.contractServicesCoR))
        const contractServicesOp = Math.abs(getValue(keyRows.contractServicesOp))
        const salesMarketing = Math.abs(getValue(keyRows.businessDevelopment)) + 
                              Math.abs(getValue(keyRows.marketingPromotion))
        const professionalServices = Math.abs(getValue(keyRows.accountingServices)) + 
                                   Math.abs(getValue(keyRows.legalServices))
        const facilitiesAdmin = Math.abs(getValue(keyRows.officeRent))
        
        // Only add month if it has data
        if (revenue > 0) {
          const operatingIncome = grossProfit - Math.abs(operatingExpenses)
          const operatingMarginPercent = revenue > 0 ? (operatingIncome / revenue) * 100 : 0
          
          metrics.push({
            month: monthHeader, // Use the actual header from Excel
            revenue,
            cogs: Math.abs(cogs), // Ensure positive
            grossProfit,
            grossMargin: grossMarginPercent,
            operatingExpenses: Math.abs(operatingExpenses),
            operatingIncome,
            operatingMargin: operatingMarginPercent,
            otherIncomeExpenses: 0, // Not extracting this for now
            netIncome,
            netMargin: netIncomeMarginPercent,
            ebitda,
            ebitdaMargin: ebitdaMarginPercent,
            // Personnel Cost Details
            personnelSalariesCoR,
            payrollTaxesCoR,
            personnelSalariesOp,
            payrollTaxesOp,
            healthCoverage: healthCoverageCoR + healthCoverageOp,
            personnelBenefits,
            totalPersonnelCost,
            // Cost Structure
            contractServicesCoR,
            contractServicesOp,
            professionalServices,
            salesMarketing,
            facilitiesAdmin
          })
        }
      })

      // Check if we found valid data
      if (validDataCount === 0 || metrics.length === 0) {
        logger.warn('No valid P&L data found using default structure');
        throw new Error('Unable to detect data structure in the Excel file. Please use the AI wizard to map your custom format.');
      }

      // Store metrics
      this.storedMetrics = metrics
      this.lastUploadDate = new Date()
      this.processedFormat = 'standard'

      logger.info(`P&L processing complete. Processed ${metrics.length} months with ${validDataCount} valid entries`)

      return {
        success: true,
        data: {
          months: metrics.length,
          lastMonth: metrics[metrics.length - 1]?.month || 'N/A'
        }
      }
    } catch (error) {
      logger.error('Error processing with default structure:', error)
      throw error
    }
  }


  getStoredData(): PnLRow[] {
    return this.storedData
  }

  getStoredMetrics(): PnLMetrics[] {
    return this.storedMetrics
  }

  getLastUploadDate(): Date | null {
    return this.lastUploadDate
  }

  getSummary(): PnLSummary {
    if (this.storedMetrics.length === 0) {
      return {
        totalRevenue: 0,
        totalCOGS: 0,
        totalGrossProfit: 0,
        avgGrossMargin: 0,
        totalOperatingExpenses: 0,
        totalOperatingIncome: 0,
        avgOperatingMargin: 0,
        totalEBITDA: 0,
        avgEBITDAMargin: 0,
        totalNetIncome: 0,
        avgNetMargin: 0
      }
    }

    const totals = this.storedMetrics.reduce((acc, metric) => ({
      revenue: acc.revenue + metric.revenue,
      cogs: acc.cogs + metric.cogs,
      grossProfit: acc.grossProfit + metric.grossProfit,
      operatingExpenses: acc.operatingExpenses + metric.operatingExpenses,
      operatingIncome: acc.operatingIncome + metric.operatingIncome,
      ebitda: acc.ebitda + metric.ebitda,
      netIncome: acc.netIncome + metric.netIncome
    }), {
      revenue: 0,
      cogs: 0,
      grossProfit: 0,
      operatingExpenses: 0,
      operatingIncome: 0,
      ebitda: 0,
      netIncome: 0
    })

    const monthCount = this.storedMetrics.length

    return {
      totalRevenue: totals.revenue,
      totalCOGS: totals.cogs,
      totalGrossProfit: totals.grossProfit,
      avgGrossMargin: totals.revenue > 0 ? (totals.grossProfit / totals.revenue) * 100 : 0,
      totalOperatingExpenses: totals.operatingExpenses,
      totalOperatingIncome: totals.operatingIncome,
      avgOperatingMargin: totals.revenue > 0 ? (totals.operatingIncome / totals.revenue) * 100 : 0,
      totalEBITDA: totals.ebitda,
      avgEBITDAMargin: totals.revenue > 0 ? (totals.ebitda / totals.revenue) * 100 : 0,
      totalNetIncome: totals.netIncome,
      avgNetMargin: totals.revenue > 0 ? (totals.netIncome / totals.revenue) * 100 : 0
    }
  }

  clearStoredData(): void {
    this.storedData = []
    this.storedMetrics = []
    this.lastUploadDate = null
    this.lastUploadedFileName = null
    this.processedFormat = null
    this.vortexYTDEbitda = null
    logger.info('P&L stored data cleared')
  }
  
  getVortexYTDEbitda(): number | null {
    return this.vortexYTDEbitda
  }

  /**
   * Generic date value detection - handles multiple formats
   */
  private detectDateValue(cellValue: any): { isDate: boolean, originalValue: string, date?: Date } {
    if (!cellValue) {
      return { isDate: false, originalValue: '' }
    }

    const originalValue = String(cellValue).trim()
    
    // Handle Excel date serial numbers
    if (cellValue instanceof Date) {
      return { isDate: true, originalValue, date: cellValue }
    }
    
    // Handle numeric date values (Excel date serial)
    if (typeof cellValue === 'number' && cellValue > 40000 && cellValue < 50000) {
      // Excel date serial number
      const date = new Date((cellValue - 25569) * 86400 * 1000)
      return { isDate: true, originalValue, date }
    }

    // Month patterns to detect (English and Spanish)
    const monthPatterns = [
      // English
      /\b(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september|oct|october|nov|november|dec|december)\b/i,
      // Spanish  
      /\b(ene|enero|feb|febrero|mar|marzo|abr|abril|may|mayo|jun|junio|jul|julio|ago|agosto|sep|septiembre|oct|octubre|nov|noviembre|dic|diciembre)\b/i
    ]

    // Common date formats
    const dateFormats = [
      /^\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}$/,     // MM/DD/YYYY or MM-DD-YYYY
      /^\d{4}[-\/]\d{1,2}[-\/]\d{1,2}$/,       // YYYY-MM-DD
      /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|ene|abr|ago|dic)[-\s]?\d{2,4}$/i,  // Jan-24, May 2024
      /^(january|february|march|april|may|june|july|august|september|october|november|december|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)[-\s]?\d{2,4}$/i  // January 2024
    ]

    // Check if it matches any month pattern
    const hasMonth = monthPatterns.some(pattern => pattern.test(originalValue))
    
    // Check if it matches any date format
    const hasDateFormat = dateFormats.some(format => format.test(originalValue))
    
    if (hasMonth || hasDateFormat) {
      // Try to parse the date
      let parsedDate: Date | undefined
      
      // Try different parsing strategies
      const dateStr = originalValue.replace(/[-\/]/g, ' ')
      const parts = dateStr.split(/\s+/)
      
      if (parts.length >= 2) {
        // Handle "Jan-24" or "January 2024" format
        const monthPart = parts[0]
        const yearPart = parts[1]
        
        // Convert 2-digit year to 4-digit
        let year = parseInt(yearPart)
        if (year < 100) {
          year = year < 50 ? 2000 + year : 1900 + year
        }
        
        // Map month names to numbers
        const monthMap: {[key: string]: number} = {
          'jan': 0, 'january': 0, 'ene': 0, 'enero': 0,
          'feb': 1, 'february': 1, 'febrero': 1,
          'mar': 2, 'march': 2, 'marzo': 2,
          'apr': 3, 'april': 3, 'abr': 3, 'abril': 3,
          'may': 4, 'mayo': 4,
          'jun': 5, 'june': 5, 'junio': 5,
          'jul': 6, 'july': 6, 'julio': 6,
          'aug': 7, 'august': 7, 'ago': 7, 'agosto': 7,
          'sep': 8, 'september': 8, 'septiembre': 8, 'sept': 8,
          'oct': 9, 'october': 9, 'octubre': 9,
          'nov': 10, 'november': 10, 'noviembre': 10,
          'dec': 11, 'december': 11, 'dic': 11, 'diciembre': 11
        }
        
        const monthNum = monthMap[monthPart.toLowerCase()]
        if (monthNum !== undefined && year) {
          parsedDate = new Date(year, monthNum, 1)
        }
      }
      
      return { isDate: true, originalValue, date: parsedDate }
    }
    
    return { isDate: false, originalValue }
  }

  /**
   * Generic metric row detection - finds P&L line items by pattern matching
   */
  private detectMetricRows(worksheet: any, startRow: number): any {
    const foundRows: any = {}
    const maxRowsToScan = 100
    
    // Patterns for detecting different metrics (bilingual)
    const metricPatterns = {
      revenue: [
        /\b(total\s+)?revenue\b/i,
        /\b(total\s+)?sales\b/i,
        /\bingresos?\s+(totales?)?\b/i,
        /\bventas?\s+(totales?)?\b/i,
        /\bfacturaci[óo]n\b/i
      ],
      costOfRevenue: [
        /\bcost\s+of\s+(goods\s+sold|revenue|sales)\b/i,
        /\bcogs\b/i,
        /\bcosto\s+de\s+ventas?\b/i,
        /\bcostos?\s+directos?\b/i
      ],
      grossProfit: [
        /\bgross\s+profit\b/i,
        /\butilidad\s+bruta\b/i,
        /\bganancia\s+bruta\b/i,
        /\bmargen\s+bruto\b/i
      ],
      grossMargin: [
        /\bgross\s+margin\s*%?\b/i,
        /\bmargen\s+bruto\s*%?\b/i
      ],
      operatingExpenses: [
        /\b(total\s+)?operating\s+expenses?\b/i,
        /\bgastos?\s+operativos?\s*(totales?)?\b/i,
        /\bgastos?\s+de\s+operaci[óo]n\b/i
      ],
      operatingIncome: [
        /\boperating\s+income\b/i,
        /\boperating\s+profit\b/i,
        /\butilidad\s+operativa\b/i,
        /\bganancia\s+operativa\b/i
      ],
      ebitda: [
        /\bebitda\b/i,
        /\bearnings?\s+before\b/i
      ],
      ebitdaMargin: [
        /\bebitda\s+margin\s*%?\b/i,
        /\bmargen\s+ebitda\s*%?\b/i
      ],
      netIncome: [
        /\bnet\s+income\b/i,
        /\bnet\s+profit\b/i,
        /\bnet\s+earnings?\b/i,
        /\butilidad\s+neta\b/i,
        /\bganancia\s+neta\b/i,
        /\bresultado\s+neto\b/i
      ],
      netIncomeMargin: [
        /\bnet\s+(income\s+)?margin\s*%?\b/i,
        /\bmargen\s+neto\s*%?\b/i
      ]
    }
    
    // Scan rows starting from after the header
    for (let row = startRow + 1; row <= Math.min(startRow + maxRowsToScan, worksheet.rowCount); row++) {
      const rowData = worksheet.getRow(row)
      const labelCell = rowData.getCell(1).value // Usually labels are in column A
      
      if (labelCell) {
        const label = String(labelCell).toLowerCase().trim()
        
        // Check each metric pattern
        for (const [metricName, patterns] of Object.entries(metricPatterns)) {
          if (!foundRows[metricName]) {
            for (const pattern of patterns) {
              if (pattern.test(label)) {
                foundRows[metricName] = row
                logger.info(`Found ${metricName} at row ${row}: "${label}"`)
                break
              }
            }
          }
        }
      }
    }
    
    // Log what we found and what's missing
    const requiredMetrics = ['revenue', 'costOfRevenue', 'grossProfit', 'operatingExpenses', 'netIncome']
    const missingMetrics = requiredMetrics.filter(m => !foundRows[m])
    
    if (missingMetrics.length > 0) {
      logger.warn(`Missing required metrics: ${missingMetrics.join(', ')}`)
    }
    
    // Fill in defaults for missing metrics
    return {
      revenue: foundRows.revenue || 0,
      costOfRevenue: foundRows.costOfRevenue || 0,
      grossProfit: foundRows.grossProfit || 0,
      grossMargin: foundRows.grossMargin || 0,
      operatingExpenses: foundRows.operatingExpenses || 0,
      operatingIncome: foundRows.operatingIncome || 0,
      operatingMargin: foundRows.operatingMargin || 0,
      ebitda: foundRows.ebitda || 0,
      ebitdaMargin: foundRows.ebitdaMargin || 0,
      netIncome: foundRows.netIncome || 0,
      netIncomeMargin: foundRows.netIncomeMargin || 0,
      // Additional metrics can be added here
      personnelSalariesCoR: 0,
      payrollTaxesCoR: 0,
      personnelSalariesOp: 0,
      payrollTaxesOp: 0,
      healthCoverageCoR: 0,
      healthCoverageOp: 0,
      personnelBenefits: 0,
      contractServicesCoR: 0,
      contractServicesOp: 0,
      businessDevelopment: 0,
      marketingPromotion: 0,
      accountingServices: 0,
      legalServices: 0,
      officeRent: 0
    }
  }

  setUploadedFileName(filename: string): void {
    this.lastUploadedFileName = filename
  }

  getUploadedFileName(): string | null {
    return this.lastUploadedFileName
  }

  getProcessedFormat(): 'vortex' | 'standard' | 'custom' | null {
    return this.processedFormat
  }

  async processExtractedData(extractedData: any, originalFilename: string): Promise<void> {
    logger.info(`Processing extracted P&L data from ${originalFilename}`)
    logger.info(`Extracted data has ${extractedData.months?.length || 0} months`)
    
    // Clear existing data
    this.clearStoredData()
    
    // Process and store the extracted metrics
    if (extractedData.months && Array.isArray(extractedData.months)) {
      logger.info(`Month names from extraction: ${extractedData.months.map((m: any) => m.month).join(', ')}`)
      
      const metrics: PnLMetrics[] = extractedData.months.map((month: any, idx: number) => {
        const revenue = month.data.revenue?.value || 0
        const cogs = Math.abs(month.data.cogs?.value || month.data.costOfGoodsSold?.value || 0)
        const grossProfit = month.data.grossProfit?.value || (revenue - cogs)
        const operatingExpenses = Math.abs(month.data.operatingExpenses?.value || month.data.totalOperatingExpenses?.value || 0)
        const netIncome = month.data.netIncome?.value || 0
        // Calculate EBITDA - if not provided, calculate as Operating Income + D&A
        const depreciation = Math.abs(month.data.depreciation?.value || month.data.depreciationAmortization?.value || 0)
        const amortization = Math.abs(month.data.amortization?.value || 0)
        const operatingIncome = grossProfit - operatingExpenses
        const ebitda = month.data.ebitda?.value || (operatingIncome + depreciation + amortization)
        
        logger.info(`Month ${idx}: ${month.month} - Revenue: ${revenue}, COGS: ${cogs}, GP: ${grossProfit}`)
        
        return {
          month: month.month,
          revenue,
          cogs,
          grossProfit,
          grossMargin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
          operatingExpenses,
          operatingIncome: grossProfit - operatingExpenses,
          operatingMargin: revenue > 0 ? ((grossProfit - operatingExpenses) / revenue) * 100 : 0,
          otherIncomeExpenses: 0,
          netIncome,
          netMargin: revenue > 0 ? (netIncome / revenue) * 100 : 0,
          ebitda,
          ebitdaMargin: revenue > 0 ? (ebitda / revenue) * 100 : 0
        }
      })
      
      this.storedMetrics = metrics
      this.lastUploadDate = new Date()
      this.lastUploadedFileName = originalFilename
      this.processedFormat = 'custom'
      
      logger.info(`Stored ${metrics.length} months of P&L data from custom mapping`)
    }
  }

  /**
   * NEW: Process with universal AI structure (handles ANY format)
   */
  async processWithUniversalStructure(buffer: Buffer, universalMapping: any): Promise<void> {
    logger.info('Processing P&L with universal AI mapping')
    
    // Clear existing data
    this.clearStoredData()
    
    try {
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(buffer)
      
      const metrics: PnLMetrics[] = []
      
      // Process based on the universal mapping structure
      universalMapping.dateStructure.locations.forEach((location: any) => {
        const worksheet = workbook.worksheets.find(ws => ws.name === location.sheet) || workbook.worksheets[0]
        
        // Extract data based on date layout
        if (universalMapping.dateStructure.layout === 'rows') {
          // Dates are in rows - typical format
          location.columns?.forEach((col: number, index: number) => {
            const monthName = worksheet.getRow(location.row).getCell(col).value
            
            // Extract all metrics for this month
            const monthData: any = {
              month: String(monthName),
              revenue: 0,
              cogs: 0,
              grossProfit: 0,
              operatingExpenses: 0,
              netIncome: 0,
              ebitda: 0,
              depreciation: 0,
              amortization: 0
            }
            
            // Get values from mapped metrics
            universalMapping.allMetrics.forEach((metric: any) => {
              if (metric.location.sheet === location.sheet) {
                const value = worksheet.getRow(metric.location.row).getCell(col).value
                const numValue = typeof value === 'number' ? value : 0
                
                // Map to standard fields based on metric type or name
                switch (metric.type) {
                  case 'revenue':
                    monthData.revenue = numValue
                    break
                  case 'cost':
                    if (metric.name.toLowerCase().includes('cogs') || 
                        metric.name.toLowerCase().includes('cost of goods')) {
                      monthData.cogs = Math.abs(numValue)
                    } else if (metric.name.toLowerCase().includes('operating')) {
                      monthData.operatingExpenses = Math.abs(numValue)
                    }
                    break
                  case 'profit':
                    if (metric.name.toLowerCase().includes('gross')) {
                      monthData.grossProfit = numValue
                    } else if (metric.name.toLowerCase().includes('net')) {
                      monthData.netIncome = numValue
                    } else if (metric.name.toLowerCase().includes('ebitda')) {
                      monthData.ebitda = numValue
                    }
                    break
                  case 'expense':
                    if (metric.name.toLowerCase().includes('depreciation') || 
                        metric.name.toLowerCase().includes('depreciación')) {
                      monthData.depreciation = Math.abs(numValue)
                    } else if (metric.name.toLowerCase().includes('amortization') || 
                               metric.name.toLowerCase().includes('amortización')) {
                      monthData.amortization = Math.abs(numValue)
                    }
                    break
                }
              }
            })
            
            // Calculate derived values
            if (monthData.revenue > 0) {
              metrics.push({
                month: monthData.month,
                revenue: monthData.revenue,
                cogs: monthData.cogs,
                grossProfit: monthData.grossProfit || (monthData.revenue - monthData.cogs),
                grossMargin: monthData.grossProfit ? (monthData.grossProfit / monthData.revenue) * 100 : 0,
                operatingExpenses: monthData.operatingExpenses,
                operatingIncome: monthData.grossProfit - monthData.operatingExpenses,
                operatingMargin: (monthData.grossProfit - monthData.operatingExpenses) / monthData.revenue * 100,
                otherIncomeExpenses: 0,
                netIncome: monthData.netIncome,
                netMargin: monthData.netIncome ? (monthData.netIncome / monthData.revenue) * 100 : 0,
                ebitda: monthData.ebitda || (monthData.grossProfit - monthData.operatingExpenses + monthData.depreciation + monthData.amortization),
                ebitdaMargin: monthData.ebitda ? (monthData.ebitda / monthData.revenue) * 100 : 0
              })
            }
          })
        } else if (universalMapping.dateStructure.layout === 'columns') {
          // Dates are in columns - less common but supported
          logger.info('Processing column-based date layout')
          // Implementation for column-based dates...
        }
      })
      
      this.storedMetrics = metrics
      this.lastUploadDate = new Date()
      
      logger.info(`Universal P&L processing complete. Processed ${metrics.length} months`)
    } catch (error) {
      logger.error('Error in universal P&L processing:', error)
      throw error
    }
  }

  /**
   * Save P&L metrics to financial_records table so widgets can access the data
   */
  async saveToFinancialRecords(companyId: string, dataSourceId?: string): Promise<void> {
    if (this.storedMetrics.length === 0) {
      logger.warn('No P&L metrics to save to financial records')
      return
    }

    try {
      logger.info(`Saving ${this.storedMetrics.length} P&L metrics to financial_records for company ${companyId}`)

      for (const metric of this.storedMetrics) {
        // Parse the month to get a proper date
        const date = new Date(metric.month + '-01')
        
        // Create individual records for each component of the P&L
        const records = [
          {
            record_type: 'revenue',
            category: 'Total Revenue',
            subcategory: 'Sales',
            description: `Revenue for ${metric.month}`,
            amount: metric.revenue
          },
          {
            record_type: 'expense',
            category: 'Cost of Goods Sold',
            subcategory: 'COGS',
            description: `COGS for ${metric.month}`,
            amount: Math.abs(metric.cogs) // Ensure positive for encryption
          },
          {
            record_type: 'expense',
            category: 'Operating Expenses',
            subcategory: 'Operations',
            description: `Operating expenses for ${metric.month}`,
            amount: Math.abs(metric.operatingExpenses)
          }
        ]

        // Insert each record
        for (const record of records) {
          const encryptedAmount = await encryptionService.encryptNumber(record.amount, companyId)
          
          await pool.query(`
            INSERT INTO financial_records (
              company_id, date, record_type, category, subcategory, 
              description, amount_encrypted, currency, data_source_id,
              metadata, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
            ON CONFLICT (company_id, date, record_type, category, subcategory) 
            DO UPDATE SET 
              amount_encrypted = EXCLUDED.amount_encrypted,
              description = EXCLUDED.description,
              updated_at = NOW()
          `, [
            companyId,
            date.toISOString().split('T')[0], // YYYY-MM-DD format
            record.record_type,
            record.category,
            record.subcategory,
            record.description,
            encryptedAmount,
            'USD', // Default currency
            dataSourceId,
            JSON.stringify({
              source: 'pnl_upload',
              month: metric.month,
              grossProfit: metric.grossProfit,
              grossMargin: metric.grossMargin,
              operatingIncome: metric.operatingIncome
            })
          ])
        }
      }

      logger.info(`Successfully saved P&L data to financial_records for company ${companyId}`)
    } catch (error) {
      logger.error('Error saving P&L data to financial_records:', error)
      throw error
    }
  }

  /**
   * Save P&L metrics to structured pnl_data table
   */
  async saveToPnLDataTable(companyId: string, dataSourceId: string, userId?: number): Promise<void> {
    if (this.storedMetrics.length === 0) {
      logger.warn('No P&L metrics to save to pnl_data table')
      return
    }

    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      logger.info(`Saving ${this.storedMetrics.length} P&L metrics to pnl_data table for company ${companyId}`)

      for (const metric of this.storedMetrics) {
        // Parse the month to get a proper date (first day of month)
        logger.info(`Processing P&L metric for month: ${metric.month}`)
        
        // Handle different month formats
        let monthDate: Date
        
        // Check if it's already in YYYY-MM format
        if (/^\d{4}-\d{2}$/.test(metric.month)) {
          monthDate = new Date(metric.month + '-01')
        } else {
          // Handle month names like "January", "February", etc.
          const currentYear = new Date().getFullYear()
          const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                             'July', 'August', 'September', 'October', 'November', 'December']
          const monthIndex = monthNames.findIndex(m => m.toLowerCase() === metric.month.toLowerCase())
          
          if (monthIndex !== -1) {
            monthDate = new Date(currentYear, monthIndex, 1)
          } else {
            logger.error(`Unable to parse month: ${metric.month}`)
            continue
          }
        }
        
        if (isNaN(monthDate.getTime())) {
          logger.error(`Invalid date for month: ${metric.month}`)
          continue
        }
        
        logger.info(`Parsed month ${metric.month} to date: ${monthDate.toISOString()}`)
        
        // Encrypt sensitive financial values
        const encryptedValues = {
          revenue_encrypted: await encryptionService.encryptNumber(metric.revenue, companyId),
          cogs_encrypted: await encryptionService.encryptNumber(Math.abs(metric.cogs), companyId),
          gross_profit_encrypted: await encryptionService.encryptNumber(metric.grossProfit, companyId),
          operating_expenses_encrypted: await encryptionService.encryptNumber(Math.abs(metric.operatingExpenses), companyId),
          operating_income_encrypted: await encryptionService.encryptNumber(metric.operatingIncome, companyId),
          ebitda_encrypted: await encryptionService.encryptNumber(metric.ebitda, companyId),
          net_income_encrypted: await encryptionService.encryptNumber(metric.netIncome, companyId)
        }

        // Prepare operating expenses breakdown
        const operatingExpensesBreakdown = {
          personnelSalariesOp: metric.personnelSalariesOp || 0,
          payrollTaxesOp: metric.payrollTaxesOp || 0,
          healthCoverage: metric.healthCoverage || 0,
          personnelBenefits: metric.personnelBenefits || 0,
          contractServicesOp: metric.contractServicesOp || 0,
          professionalServices: metric.professionalServices || 0,
          salesMarketing: metric.salesMarketing || 0,
          facilitiesAdmin: metric.facilitiesAdmin || 0
        }

        // Prepare personnel cost details
        const personnelCostDetails = {
          personnelSalariesCoR: metric.personnelSalariesCoR || 0,
          payrollTaxesCoR: metric.payrollTaxesCoR || 0,
          totalPersonnelCost: metric.totalPersonnelCost || 0
        }

        const query = `
          INSERT INTO pnl_data (
            company_id, data_source_id, month,
            revenue, revenue_encrypted,
            cogs, cogs_encrypted,
            gross_profit, gross_profit_encrypted, gross_margin,
            operating_expenses, operating_expenses_encrypted, operating_expenses_breakdown,
            operating_income, operating_income_encrypted, operating_margin,
            ebitda, ebitda_encrypted, ebitda_margin,
            net_income, net_income_encrypted, net_margin,
            personnel_cost_details,
            metadata,
            created_by
          ) VALUES (
            $1, $2, $3,
            $4, $5,
            $6, $7,
            $8, $9, $10,
            $11, $12, $13,
            $14, $15, $16,
            $17, $18, $19,
            $20, $21, $22,
            $23,
            $24,
            $25
          )
          ON CONFLICT (company_id, data_source_id, month)
          DO UPDATE SET
            revenue = EXCLUDED.revenue,
            revenue_encrypted = EXCLUDED.revenue_encrypted,
            cogs = EXCLUDED.cogs,
            cogs_encrypted = EXCLUDED.cogs_encrypted,
            gross_profit = EXCLUDED.gross_profit,
            gross_profit_encrypted = EXCLUDED.gross_profit_encrypted,
            gross_margin = EXCLUDED.gross_margin,
            operating_expenses = EXCLUDED.operating_expenses,
            operating_expenses_encrypted = EXCLUDED.operating_expenses_encrypted,
            operating_expenses_breakdown = EXCLUDED.operating_expenses_breakdown,
            operating_income = EXCLUDED.operating_income,
            operating_income_encrypted = EXCLUDED.operating_income_encrypted,
            operating_margin = EXCLUDED.operating_margin,
            ebitda = EXCLUDED.ebitda,
            ebitda_encrypted = EXCLUDED.ebitda_encrypted,
            ebitda_margin = EXCLUDED.ebitda_margin,
            net_income = EXCLUDED.net_income,
            net_income_encrypted = EXCLUDED.net_income_encrypted,
            net_margin = EXCLUDED.net_margin,
            personnel_cost_details = EXCLUDED.personnel_cost_details,
            metadata = EXCLUDED.metadata,
            updated_at = CURRENT_TIMESTAMP
        `

        const metadata = {
          source: 'pnl_upload',
          format: this.processedFormat,
          uploadDate: this.lastUploadDate,
          fileName: this.lastUploadedFileName
        }

        await client.query(query, [
          companyId,
          dataSourceId,
          monthDate,
          metric.revenue,
          encryptedValues.revenue_encrypted,
          Math.abs(metric.cogs), // Store as positive
          encryptedValues.cogs_encrypted,
          metric.grossProfit,
          encryptedValues.gross_profit_encrypted,
          metric.grossMargin,
          Math.abs(metric.operatingExpenses), // Store as positive
          encryptedValues.operating_expenses_encrypted,
          operatingExpensesBreakdown,
          metric.operatingIncome,
          encryptedValues.operating_income_encrypted,
          metric.operatingMargin,
          metric.ebitda,
          encryptedValues.ebitda_encrypted,
          metric.ebitdaMargin,
          metric.netIncome,
          encryptedValues.net_income_encrypted,
          metric.netMargin,
          personnelCostDetails,
          metadata,
          userId || null
        ])

        logger.info(`Saved P&L data for ${metric.month} to pnl_data table`)
      }

      // Also save summary metrics to financial_metrics table
      await this.saveFinancialMetrics(client, companyId, dataSourceId)

      await client.query('COMMIT')
      logger.info(`Successfully saved P&L data to pnl_data table for company ${companyId}`)
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('Error saving P&L data to pnl_data table:', error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Save calculated financial metrics for quick access
   */
  private async saveFinancialMetrics(client: any, companyId: string, dataSourceId: string): Promise<void> {
    const summary = this.getSummary()
    
    if (!this.storedMetrics.length) return

    // Get date range with proper month parsing
    const parsedDates: Date[] = []
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December']
    const currentYear = new Date().getFullYear()
    
    for (const metric of this.storedMetrics) {
      let date: Date
      
      // Check if it's already in YYYY-MM format
      if (/^\d{4}-\d{2}$/.test(metric.month)) {
        date = new Date(metric.month + '-01')
      } else {
        // Handle month names
        const monthIndex = monthNames.findIndex(m => m.toLowerCase() === metric.month.toLowerCase())
        if (monthIndex !== -1) {
          date = new Date(currentYear, monthIndex, 1)
        } else {
          continue // Skip invalid months
        }
      }
      
      if (!isNaN(date.getTime())) {
        parsedDates.push(date)
      }
    }
    
    if (parsedDates.length === 0) {
      logger.warn('No valid dates found in P&L metrics')
      return
    }
    
    const periodStart = new Date(Math.min(...parsedDates.map(d => d.getTime())))
    const periodEnd = new Date(Math.max(...parsedDates.map(d => d.getTime())))

    const metrics = [
      { type: 'revenue', name: 'total_revenue', value: summary.totalRevenue },
      { type: 'revenue', name: 'avg_monthly_revenue', value: summary.totalRevenue / this.storedMetrics.length },
      { type: 'profitability', name: 'gross_margin', value: summary.avgGrossMargin },
      { type: 'profitability', name: 'operating_margin', value: summary.avgOperatingMargin },
      { type: 'profitability', name: 'ebitda_margin', value: summary.avgEBITDAMargin },
      { type: 'profitability', name: 'net_margin', value: summary.avgNetMargin },
      { type: 'profitability', name: 'total_ebitda', value: summary.totalEBITDA },
      { type: 'expense', name: 'total_cogs', value: summary.totalCOGS },
      { type: 'expense', name: 'total_operating_expenses', value: summary.totalOperatingExpenses }
    ]

    for (const metric of metrics) {
      const encryptedValue = await encryptionService.encryptNumber(metric.value, companyId)
      
      await client.query(`
        INSERT INTO financial_metrics (
          company_id, data_source_id, metric_type, metric_name,
          period_start, period_end, value, value_encrypted,
          metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (company_id, data_source_id, metric_type, metric_name, period_start, period_end)
        DO UPDATE SET
          value = EXCLUDED.value,
          value_encrypted = EXCLUDED.value_encrypted,
          updated_at = CURRENT_TIMESTAMP
      `, [
        companyId,
        dataSourceId,
        metric.type,
        metric.name,
        periodStart,
        periodEnd,
        metric.value,
        encryptedValue,
        { source: 'pnl_upload', format: this.processedFormat }
      ])
    }
  }

  /**
   * Get P&L data from database for a specific company and data source
   */
  async getPnLDataFromDB(companyId: string, dataSourceId?: string): Promise<PnLMetrics[]> {
    try {
      let query = `
        SELECT 
          month,
          revenue,
          cogs,
          gross_profit,
          gross_margin,
          operating_expenses,
          operating_expenses_breakdown,
          operating_income,
          operating_margin,
          ebitda,
          ebitda_margin,
          net_income,
          net_margin,
          personnel_cost_details,
          metadata
        FROM pnl_data
        WHERE company_id = $1
      `
      
      const params: any[] = [companyId]
      
      if (dataSourceId) {
        query += ` AND data_source_id = $2`
        params.push(dataSourceId)
      }
      
      query += ` ORDER BY month ASC`
      
      const result = await pool.query(query, params)
      
      // Convert database rows to PnLMetrics format
      const metrics: PnLMetrics[] = []
      
      for (const row of result.rows) {
        const personnelDetails = row.personnel_cost_details || {}
        const opexBreakdown = row.operating_expenses_breakdown || {}
        
        metrics.push({
          month: row.month.toISOString().slice(0, 7), // Format as YYYY-MM
          revenue: parseFloat(row.revenue),
          cogs: -Math.abs(parseFloat(row.cogs)), // Ensure negative for consistency
          grossProfit: parseFloat(row.gross_profit),
          grossMargin: parseFloat(row.gross_margin),
          operatingExpenses: -Math.abs(parseFloat(row.operating_expenses)), // Ensure negative
          operatingIncome: parseFloat(row.operating_income),
          operatingMargin: parseFloat(row.operating_margin),
          otherIncomeExpenses: 0, // Calculate if needed
          netIncome: parseFloat(row.net_income),
          netMargin: parseFloat(row.net_margin),
          ebitda: parseFloat(row.ebitda),
          ebitdaMargin: parseFloat(row.ebitda_margin),
          // Personnel Cost Details
          personnelSalariesCoR: personnelDetails.personnelSalariesCoR || 0,
          payrollTaxesCoR: personnelDetails.payrollTaxesCoR || 0,
          personnelSalariesOp: opexBreakdown.personnelSalariesOp || 0,
          payrollTaxesOp: opexBreakdown.payrollTaxesOp || 0,
          healthCoverage: opexBreakdown.healthCoverage || 0,
          personnelBenefits: opexBreakdown.personnelBenefits || 0,
          totalPersonnelCost: personnelDetails.totalPersonnelCost || 0,
          // Cost Structure
          contractServicesCoR: 0, // Add if stored
          contractServicesOp: opexBreakdown.contractServicesOp || 0,
          professionalServices: opexBreakdown.professionalServices || 0,
          salesMarketing: opexBreakdown.salesMarketing || 0,
          facilitiesAdmin: opexBreakdown.facilitiesAdmin || 0
        })
      }
      
      return metrics
    } catch (error) {
      logger.error('Error fetching P&L data from database:', error)
      throw error
    }
  }

  /**
   * Get P&L summary from database
   */
  async getPnLSummaryFromDB(companyId: string, dataSourceId?: string): Promise<PnLSummary> {
    try {
      let query = `
        SELECT 
          SUM(revenue) as total_revenue,
          SUM(cogs) as total_cogs,
          SUM(gross_profit) as total_gross_profit,
          AVG(gross_margin) as avg_gross_margin,
          SUM(operating_expenses) as total_operating_expenses,
          SUM(operating_income) as total_operating_income,
          AVG(operating_margin) as avg_operating_margin,
          SUM(ebitda) as total_ebitda,
          AVG(ebitda_margin) as avg_ebitda_margin,
          SUM(net_income) as total_net_income,
          AVG(net_margin) as avg_net_margin,
          COUNT(*) as months_count
        FROM pnl_data
        WHERE company_id = $1
      `
      
      const params: any[] = [companyId]
      
      if (dataSourceId) {
        query += ` AND data_source_id = $2`
        params.push(dataSourceId)
      }
      
      const result = await pool.query(query, params)
      const row = result.rows[0]
      
      return {
        totalRevenue: parseFloat(row.total_revenue) || 0,
        totalCOGS: parseFloat(row.total_cogs) || 0,
        totalGrossProfit: parseFloat(row.total_gross_profit) || 0,
        avgGrossMargin: parseFloat(row.avg_gross_margin) || 0,
        totalOperatingExpenses: parseFloat(row.total_operating_expenses) || 0,
        totalOperatingIncome: parseFloat(row.total_operating_income) || 0,
        avgOperatingMargin: parseFloat(row.avg_operating_margin) || 0,
        totalEBITDA: parseFloat(row.total_ebitda) || 0,
        avgEBITDAMargin: parseFloat(row.avg_ebitda_margin) || 0,
        totalNetIncome: parseFloat(row.total_net_income) || 0,
        avgNetMargin: parseFloat(row.avg_net_margin) || 0
      }
    } catch (error) {
      logger.error('Error fetching P&L summary from database:', error)
      throw error
    }
  }
}