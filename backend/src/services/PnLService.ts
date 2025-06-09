import { Buffer } from 'buffer'
import * as ExcelJS from 'exceljs'
import { logger } from '../utils/logger'

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
}

interface PnLSummary {
  totalRevenue: number
  totalCOGS: number
  totalGrossProfit: number
  avgGrossMargin: number
  totalOperatingExpenses: number
  totalOperatingIncome: number
  avgOperatingMargin: number
  totalNetIncome: number
  avgNetMargin: number
}

export class PnLService {
  private static instance: PnLService
  private storedData: PnLRow[] = []
  private storedMetrics: PnLMetrics[] = []
  private lastUploadDate: Date | null = null

  private constructor() {}

  static getInstance(): PnLService {
    if (!PnLService.instance) {
      PnLService.instance = new PnLService()
    }
    return PnLService.instance
  }

  async processExcelFile(buffer: Buffer): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      logger.info('Starting P&L Excel file processing')
      
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
        netIncome: 81,
        netIncomeMargin: 82
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
        const cogs = getValue(keyRows.costOfRevenue)
        const grossProfit = getValue(keyRows.grossProfit)
        const operatingExpenses = getValue(keyRows.operatingExpenses)
        const ebitda = getValue(keyRows.ebitda)
        const netIncome = getValue(keyRows.netIncome)
        
        // Get the gross margin percentage directly from row 20
        const grossMarginPercent = getValue(keyRows.grossMargin) * 100 // Convert to percentage
        
        // Get net income margin percentage from row 82
        const netIncomeMarginPercent = getValue(keyRows.netIncomeMargin) * 100 // Convert to percentage
        
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
            ebitda
          })
        }
      })

      // Store metrics
      this.storedMetrics = metrics
      this.lastUploadDate = new Date()

      logger.info(`P&L processing complete. Processed ${metrics.length} months of data`)

      return {
        success: true,
        data: {
          months: metrics.length,
          lastMonth: metrics[metrics.length - 1]?.month || 'N/A'
        }
      }
    } catch (error) {
      logger.error('Error processing P&L Excel file:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
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
      netIncome: acc.netIncome + metric.netIncome
    }), {
      revenue: 0,
      cogs: 0,
      grossProfit: 0,
      operatingExpenses: 0,
      operatingIncome: 0,
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