import { Buffer } from 'buffer'
import * as ExcelJS from 'exceljs'
import { logger } from '../utils/logger'
import { ConfigurationService } from './ConfigurationService'

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
      
      // Get active company configuration
      const activeCompany = this.configService.getActiveCompany()
      if (!activeCompany?.excelStructure) {
        logger.info('No active company configuration found, using default structure')
        return this.processWithDefaultStructure(buffer)
      }

      logger.info(`Using configuration for company: ${activeCompany.name}`)
      return this.processWithConfiguration(buffer, activeCompany.excelStructure)
    } catch (error) {
      logger.error('Error processing P&L Excel file:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
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
        if (revenue > 0) {
          validDataCount++;
          const cogs = getValue(config.metricRows.costOfRevenue || 18)
          const grossProfit = getValue(config.metricRows.grossProfit || 19)
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

      // Based on the structure:
      // Row 4 has date headers in even columns (B=2, D=4, F=6, etc.)
      // Row 8: Total Revenue
      // Row 18: Total Cost of Goods Sold  
      // Row 19: Gross Profit (absolute value)
      // Row 20: Gross Margin (percentage)
      // Row 52: Total Operating Expenses
      // Row 65: EBITDA
      // Row 81: Net Income
      // Row 82: Net Income Margin %

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
      }

      // Extract month columns from row 4
      const monthColumns: { [key: string]: number } = {}
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                         'July', 'August', 'September', 'October', 'November', 'December']
      
      const headerRow = worksheet.getRow(4)
      let monthIndex = 0
      
      // Even columns contain values (2, 4, 6, 8, etc.)
      for (let col = 2; col <= 24; col += 2) {
        const cellValue = headerRow.getCell(col).value
        
        if (cellValue && monthIndex < monthNames.length) {
          monthColumns[monthNames[monthIndex]] = col
          monthIndex++
        }
      }

      logger.info(`Found ${Object.keys(monthColumns).length} months`)

      // Extract metrics for each month
      const metrics: PnLMetrics[] = []
      let validDataCount = 0;
      
      Object.entries(monthColumns).forEach(([month, col]) => {
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
        
        // Skip months with no revenue or invalid data
        if (revenue <= 0) {
          return;
        }
        
        validDataCount++;
        
        const cogs = getValue(keyRows.costOfRevenue)
        const grossProfit = getValue(keyRows.grossProfit)
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
            month,
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
    logger.info('P&L stored data cleared')
  }
}