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
      
      const worksheet = workbook.worksheets[0]
      if (!worksheet) {
        throw new Error('No worksheet found in the Excel file')
      }

      const rows: PnLRow[] = []
      const monthColumns: string[] = []
      
      // First pass: identify structure
      let headerRow: any = null
      let dataStartRow = 0
      
      worksheet.eachRow((row, rowNumber) => {
        const firstCell = row.getCell(1).value?.toString()?.trim() || ''
        
        // Look for header row with months
        if (!headerRow && rowNumber <= 10) {
          const cellValues = []
          for (let i = 1; i <= row.cellCount; i++) {
            cellValues.push(row.getCell(i).value?.toString()?.trim() || '')
          }
          
          // Check if this row contains month names
          const hasMonths = cellValues.some(val => 
            /^(January|February|March|April|May|June|July|August|September|October|November|December)/i.test(val)
          )
          
          if (hasMonths) {
            headerRow = row
            dataStartRow = rowNumber + 1
            
            // Extract month columns
            for (let i = 2; i <= row.cellCount; i++) {
              const cellValue = row.getCell(i).value?.toString()?.trim() || ''
              if (/^(January|February|March|April|May|June|July|August|September|October|November|December)/i.test(cellValue)) {
                monthColumns.push(cellValue)
              }
            }
          }
        }
      })

      if (!headerRow || monthColumns.length === 0) {
        throw new Error('Could not identify P&L structure. Please ensure the file has month columns.')
      }

      // Second pass: extract data
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber >= dataStartRow) {
          const lineItem = row.getCell(1).value?.toString()?.trim() || ''
          
          if (lineItem && !this.isHeaderOrTotal(lineItem)) {
            const pnlRow: PnLRow = {
              lineItem,
              category: this.categorizeLineItem(lineItem)
            }
            
            // Extract values for each month
            monthColumns.forEach((month, index) => {
              const cellValue = row.getCell(index + 2).value
              pnlRow[month] = this.parseNumericValue(cellValue)
            })
            
            rows.push(pnlRow)
          }
        }
      })

      // Calculate metrics
      const metrics = this.calculateMetrics(rows, monthColumns)
      
      // Store data
      this.storedData = rows
      this.storedMetrics = metrics
      this.lastUploadDate = new Date()

      logger.info(`P&L processing complete. Processed ${rows.length} line items for ${monthColumns.length} months`)

      return {
        success: true,
        data: {
          lineItems: rows.length,
          months: monthColumns.length,
          metrics: metrics.length
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

  private categorizeLineItem(lineItem: string): string {
    const item = lineItem.toLowerCase()
    
    // Revenue items
    if (item.includes('revenue') || item.includes('sales') || item.includes('income')) {
      return 'revenue'
    }
    
    // Cost of Goods Sold
    if (item.includes('cost of goods') || item.includes('cogs') || item.includes('cost of sales')) {
      return 'cogs'
    }
    
    // Operating Expenses
    if (item.includes('marketing') || item.includes('sales expense') || 
        item.includes('r&d') || item.includes('research') ||
        item.includes('administrative') || item.includes('g&a') ||
        item.includes('payroll') || item.includes('salary') ||
        item.includes('rent') || item.includes('utilities')) {
      return 'operating_expense'
    }
    
    // Other Income/Expenses
    if (item.includes('interest') || item.includes('tax') || item.includes('other')) {
      return 'other'
    }
    
    return 'uncategorized'
  }

  private isHeaderOrTotal(text: string): boolean {
    const lower = text.toLowerCase()
    return lower.includes('total') || lower.includes('subtotal') || 
           lower.includes('gross profit') || lower.includes('operating income') ||
           lower.includes('net income') || lower === ''
  }

  private parseNumericValue(value: any): number {
    if (typeof value === 'number') {
      return value
    }
    
    if (typeof value === 'string') {
      // Remove currency symbols, commas, and parentheses
      const cleaned = value.replace(/[$,()]/g, '').trim()
      
      // Handle negative numbers in parentheses
      if (value.includes('(') && value.includes(')')) {
        return -Math.abs(parseFloat(cleaned))
      }
      
      const parsed = parseFloat(cleaned)
      return isNaN(parsed) ? 0 : parsed
    }
    
    return 0
  }

  private calculateMetrics(data: PnLRow[], months: string[]): PnLMetrics[] {
    return months.map(month => {
      let revenue = 0
      let cogs = 0
      let operatingExpenses = 0
      let otherIncomeExpenses = 0
      
      data.forEach(row => {
        const amount = row[month] as number || 0
        
        switch (row.category) {
          case 'revenue':
            revenue += Math.abs(amount) // Revenue should be positive
            break
          case 'cogs':
            cogs += Math.abs(amount) // COGS is an expense (positive value)
            break
          case 'operating_expense':
            operatingExpenses += Math.abs(amount)
            break
          case 'other':
            otherIncomeExpenses += amount // Can be positive or negative
            break
        }
      })
      
      const grossProfit = revenue - cogs
      const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0
      
      const operatingIncome = grossProfit - operatingExpenses
      const operatingMargin = revenue > 0 ? (operatingIncome / revenue) * 100 : 0
      
      const netIncome = operatingIncome + otherIncomeExpenses
      const netMargin = revenue > 0 ? (netIncome / revenue) * 100 : 0
      
      // Simplified EBITDA (excluding D&A for now)
      const ebitda = operatingIncome
      
      return {
        month,
        revenue,
        cogs,
        grossProfit,
        grossMargin,
        operatingExpenses,
        operatingIncome,
        operatingMargin,
        otherIncomeExpenses,
        netIncome,
        netMargin,
        ebitda
      }
    })
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