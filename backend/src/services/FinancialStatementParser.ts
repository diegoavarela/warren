import * as ExcelJS from 'exceljs'
import { logger } from '../utils/logger'

interface FinancialLineItem {
  description: string
  row: number
  col: number
  value: number
  category: 'revenue' | 'expense' | 'asset' | 'liability' | 'equity' | 'cash_inflow' | 'cash_outflow' | 'subtotal' | 'total' | 'unknown'
  subcategory?: string
  isCalculated?: boolean
}

interface TimePeriod {
  col: number
  period: string
  date?: Date
  type: 'month' | 'quarter' | 'year'
}

interface FinancialStatement {
  type: 'pnl' | 'cashflow' | 'balance_sheet'
  timePeriods: TimePeriod[]
  lineItems: FinancialLineItem[]
  data: { [period: string]: { [category: string]: number } }
}

export class FinancialStatementParser {
  private readonly revenuePatterns = [
    // English
    /\b(total\s+)?revenue\b/i,
    /\b(total\s+)?sales\b/i,
    /\b(net\s+)?income\s+from\s+operations\b/i,
    /\bservice\s+revenue\b/i,
    /\bproduct\s+revenue\b/i,
    /\bsubscription\s+revenue\b/i,
    /\blicense\s+revenue\b/i,
    /\bconsulting\s+revenue\b/i,
    /\binterest\s+income\b/i,
    /\bother\s+income\b/i,
    // Spanish
    /\bingresos?\s+(totales?)?\b/i,
    /\bventas?\s+(totales?)?\b/i,
    /\bfacturaci[óo]n\b/i,
    /\bingresos?\s+por\s+servicios?\b/i,
    /\bingresos?\s+por\s+productos?\b/i,
    /\bingresos?\s+por\s+intereses?\b/i
  ]

  private readonly expensePatterns = [
    // English
    /\bcost\s+of\s+(goods\s+sold|revenue|sales)\b/i,
    /\bcogs\b/i,
    /\boperating\s+expenses?\b/i,
    /\bsalary|salaries\b/i,
    /\bwages?\b/i,
    /\bpayroll\b/i,
    /\brent\s+expense\b/i,
    /\bmarketing\s+(expense|cost)\b/i,
    /\badvertising\b/i,
    /\bdepreciation\b/i,
    /\bamortization\b/i,
    /\binterest\s+expense\b/i,
    /\btax\s+expense\b/i,
    /\bgeneral\s+.*\s+administrative\b/i,
    /\bg&a\b/i,
    /\bresearch\s+.*\s+development\b/i,
    /\br&d\b/i,
    // Spanish
    /\bcosto\s+de\s+ventas?\b/i,
    /\bcostos?\s+directos?\b/i,
    /\bgastos?\s+operativos?\b/i,
    /\bgastos?\s+de\s+operaci[óo]n\b/i,
    /\bsueldos?\b/i,
    /\bsalarios?\b/i,
    /\bn[óo]mina\b/i,
    /\balquiler\b/i,
    /\bgastos?\s+de\s+marketing\b/i,
    /\bpublicidad\b/i,
    /\bdepreciaci[óo]n\b/i,
    /\bamortizaci[óo]n\b/i,
    /\bimpuestos?\b/i
  ]

  private readonly totalPatterns = [
    /\bgross\s+profit\b/i,
    /\boperating\s+(income|profit)\b/i,
    /\bebit(da)?\b/i,
    /\bnet\s+(income|profit|earnings?)\b/i,
    /\btotal\b/i,
    /\bsubtotal\b/i,
    // Spanish
    /\butilidad\s+bruta\b/i,
    /\bganancia\s+bruta\b/i,
    /\butilidad\s+operativa\b/i,
    /\butilidad\s+neta\b/i,
    /\bresultado\s+neto\b/i
  ]

  private readonly cashflowPatterns = {
    operating: [
      /\bcash\s+from\s+operations?\b/i,
      /\boperating\s+activities?\b/i,
      /\bnet\s+income\b/i,
      /\bdepreciation\b/i,
      /\bworking\s+capital\b/i,
      /\baccounts?\s+receivable\b/i,
      /\binventory\b/i,
      /\baccounts?\s+payable\b/i,
      // Spanish
      /\bflujo\s+de\s+efectivo\s+operativo\b/i,
      /\bactividades?\s+operativas?\b/i,
      /\bcapital\s+de\s+trabajo\b/i,
      /\bcuentas?\s+por\s+cobrar\b/i,
      /\binventario\b/i,
      /\bcuentas?\s+por\s+pagar\b/i
    ],
    investing: [
      /\binvesting\s+activities?\b/i,
      /\bcapital\s+expenditures?\b/i,
      /\bcapex\b/i,
      /\bpurchase\s+of\s+(equipment|property|assets?)\b/i,
      /\bsale\s+of\s+(equipment|property|assets?)\b/i,
      /\bacquisitions?\b/i,
      // Spanish
      /\bactividades?\s+de\s+inversi[óo]n\b/i,
      /\bgastos?\s+de\s+capital\b/i,
      /\bcompra\s+de\s+(equipo|propiedad|activos?)\b/i,
      /\bventa\s+de\s+(equipo|propiedad|activos?)\b/i,
      /\badquisiciones?\b/i
    ],
    financing: [
      /\bfinancing\s+activities?\b/i,
      /\bloan\s+(proceeds?|payments?)\b/i,
      /\bdebt\s+(issuance|repayment)\b/i,
      /\bequity\s+(raised|issued)\b/i,
      /\bdividends?\s+paid\b/i,
      /\bstock\s+(issuance|repurchase)\b/i,
      // Spanish
      /\bactividades?\s+de\s+financiamiento\b/i,
      /\bpr[ée]stamos?\b/i,
      /\bdeuda\b/i,
      /\bcapital\s+social\b/i,
      /\bdividendos?\b/i
    ]
  }

  /**
   * Main entry point - detects statement type and parses accordingly
   */
  async parseFinancialStatement(buffer: Buffer): Promise<FinancialStatement> {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    
    // Analyze all worksheets to understand the document
    const allData = this.extractAllData(workbook)
    
    // Detect what type of statement this is
    const statementType = this.detectStatementType(allData)
    logger.info(`Detected statement type: ${statementType}`)
    
    // Find time periods
    const timePeriods = this.detectTimePeriods(allData)
    logger.info(`Found ${timePeriods.length} time periods`)
    
    // Categorize line items based on financial logic
    const categorizedItems = this.categorizeLineItems(allData, statementType)
    
    // Build the financial data structure
    const financialData = this.buildFinancialData(categorizedItems, timePeriods, statementType)
    
    // Log what we found
    logger.info(`=== FINANCIAL PARSER RESULTS ===`)
    logger.info(`Statement Type: ${statementType}`)
    logger.info(`Time Periods Found: ${timePeriods.map(p => p.period).join(', ')}`)
    logger.info(`Line Items Categorized: ${categorizedItems.length}`)
    logger.info(`Sample categorizations:`)
    const sampleItems = categorizedItems.slice(0, 5)
    sampleItems.forEach(item => {
      logger.info(`  - ${item.description}: ${item.category} (${item.subcategory || 'no subcategory'})`)
    })
    logger.info(`Financial Data Summary:`)
    Object.entries(financialData).slice(0, 3).forEach(([period, data]) => {
      logger.info(`  ${period}: Revenue=${data.revenue}, Expenses=${data.operatingExpenses}`)
    })
    logger.info(`==============================`)
    
    return {
      type: statementType,
      timePeriods,
      lineItems: categorizedItems,
      data: financialData
    }
  }

  /**
   * Extract all data from workbook for analysis
   */
  private extractAllData(workbook: ExcelJS.Workbook): Array<{
    sheet: string,
    row: number,
    col: number,
    value: any,
    formula?: string
  }> {
    const allData: any[] = []
    
    workbook.worksheets.forEach(worksheet => {
      worksheet.eachRow((row, rowNum) => {
        row.eachCell((cell, colNum) => {
          if (cell.value !== null && cell.value !== undefined) {
            allData.push({
              sheet: worksheet.name,
              row: rowNum,
              col: colNum,
              value: cell.value,
              formula: cell.formula
            })
          }
        })
      })
    })
    
    return allData
  }

  /**
   * Detect if this is P&L, Cashflow, or Balance Sheet
   */
  private detectStatementType(data: any[]): 'pnl' | 'cashflow' | 'balance_sheet' {
    let pnlScore = 0
    let cashflowScore = 0
    
    data.forEach(cell => {
      const strValue = String(cell.value).toLowerCase()
      
      // Check for P&L indicators
      if (this.revenuePatterns.some(p => p.test(strValue))) pnlScore += 2
      if (this.expensePatterns.some(p => p.test(strValue))) pnlScore += 2
      if (/\bgross\s+profit\b/i.test(strValue)) pnlScore += 3
      if (/\bnet\s+income\b/i.test(strValue)) pnlScore += 3
      
      // Check for cashflow indicators
      const allCashflowPatterns = [
        ...this.cashflowPatterns.operating,
        ...this.cashflowPatterns.investing,
        ...this.cashflowPatterns.financing
      ]
      if (allCashflowPatterns.some(p => p.test(strValue))) cashflowScore += 2
      if (/\bcash\s+flow\b/i.test(strValue)) cashflowScore += 5
      if (/\bbeginning\s+cash\b/i.test(strValue)) cashflowScore += 3
      if (/\bending\s+cash\b/i.test(strValue)) cashflowScore += 3
    })
    
    logger.info(`Statement type scores - P&L: ${pnlScore}, Cashflow: ${cashflowScore}`)
    
    return cashflowScore > pnlScore ? 'cashflow' : 'pnl'
  }

  /**
   * Detect time periods (months, quarters, years)
   */
  private detectTimePeriods(data: any[]): TimePeriod[] {
    const timePeriods: TimePeriod[] = []
    const monthPatterns = [
      // English
      /^(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september|oct|october|nov|november|dec|december)[-\s]?\d{2,4}$/i,
      // Spanish
      /^(ene|enero|feb|febrero|mar|marzo|abr|abril|may|mayo|jun|junio|jul|julio|ago|agosto|sep|septiembre|oct|octubre|nov|noviembre|dic|diciembre)[-\s]?\d{2,4}$/i,
      // Quarters
      /^q[1-4]\s*\d{2,4}$/i,
      // Years
      /^20\d{2}$/
    ]
    
    // Group by row to find header rows
    const rowGroups = new Map<number, any[]>()
    data.forEach(cell => {
      if (!rowGroups.has(cell.row)) {
        rowGroups.set(cell.row, [])
      }
      rowGroups.get(cell.row)!.push(cell)
    })
    
    // Find rows with multiple time period matches
    rowGroups.forEach((cells, rowNum) => {
      const periodMatches = cells.filter(cell => {
        const strValue = String(cell.value).trim()
        return monthPatterns.some(p => p.test(strValue)) || 
               (cell.value instanceof Date)
      })
      
      if (periodMatches.length >= 3) {
        // This is likely a header row
        logger.info(`Found potential header row ${rowNum} with ${periodMatches.length} date matches`)
        periodMatches.forEach(cell => {
          const period = this.parseTimePeriod(cell.value)
          if (period) {
            timePeriods.push({
              col: cell.col,
              period: period.period,
              date: period.date,
              type: period.type
            })
            logger.info(`Added time period: ${period.period} at column ${cell.col}`)
          }
        })
      }
    })
    
    // Sort by column to maintain order
    timePeriods.sort((a, b) => a.col - b.col)
    
    return timePeriods
  }

  /**
   * Parse a time period value
   */
  private parseTimePeriod(value: any): { period: string, date?: Date, type: 'month' | 'quarter' | 'year' } | null {
    if (value instanceof Date) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const period = `${monthNames[value.getMonth()]}-${value.getFullYear().toString().slice(-2)}`
      return { period, date: value, type: 'month' }
    }
    
    const strValue = String(value).trim()
    
    // Month patterns
    const monthMatch = strValue.match(/^(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september|oct|october|nov|november|dec|december|ene|enero|abr|abril|ago|agosto|dic|diciembre)[-\s]?(\d{2,4})$/i)
    if (monthMatch) {
      return { period: strValue, type: 'month' }
    }
    
    // Quarter patterns
    if (/^q[1-4]\s*\d{2,4}$/i.test(strValue)) {
      return { period: strValue, type: 'quarter' }
    }
    
    // Year patterns
    if (/^20\d{2}$/.test(strValue)) {
      return { period: strValue, type: 'year' }
    }
    
    return null
  }

  /**
   * Categorize line items based on financial logic
   */
  private categorizeLineItems(data: any[], statementType: 'pnl' | 'cashflow' | 'balance_sheet'): FinancialLineItem[] {
    const lineItems: FinancialLineItem[] = []
    
    // Group by row to analyze complete line items
    const rowGroups = new Map<number, any[]>()
    data.forEach(cell => {
      if (!rowGroups.has(cell.row)) {
        rowGroups.set(cell.row, [])
      }
      rowGroups.get(cell.row)!.push(cell)
    })
    
    rowGroups.forEach((cells, rowNum) => {
      // Find the description (usually in column 1)
      const descCell = cells.find(c => c.col === 1 && typeof c.value === 'string')
      if (!descCell) return
      
      const description = String(descCell.value).trim()
      if (!description) return
      
      // Categorize based on patterns
      let category: FinancialLineItem['category'] = 'unknown'
      let subcategory: string | undefined
      
      if (statementType === 'pnl') {
        if (this.revenuePatterns.some(p => p.test(description))) {
          category = 'revenue'
        } else if (this.expensePatterns.some(p => p.test(description))) {
          category = 'expense'
          // Further categorize expenses
          if (/\bcost\s+of\s+(goods|revenue|sales)|cogs|costo\s+de\s+ventas/i.test(description)) {
            subcategory = 'cogs'
          } else if (/\bsalar|wage|payroll|sueldo|n[óo]mina/i.test(description)) {
            subcategory = 'personnel'
          } else if (/\bmarket|advertis|publicidad/i.test(description)) {
            subcategory = 'marketing'
          } else if (/\brent|alquiler/i.test(description)) {
            subcategory = 'facilities'
          }
        } else if (this.totalPatterns.some(p => p.test(description))) {
          category = 'total'
          // Check if it's a calculated field
          const hasFormula = cells.some(c => c.formula)
          if (hasFormula) {
            lineItems.push({
              description,
              row: rowNum,
              col: descCell.col,
              value: 0,
              category: 'total',
              isCalculated: true
            })
          }
        }
      } else if (statementType === 'cashflow') {
        if (this.cashflowPatterns.operating.some(p => p.test(description))) {
          category = 'cash_inflow'
          subcategory = 'operating'
        } else if (this.cashflowPatterns.investing.some(p => p.test(description))) {
          category = /\bsale|venta/i.test(description) ? 'cash_inflow' : 'cash_outflow'
          subcategory = 'investing'
        } else if (this.cashflowPatterns.financing.some(p => p.test(description))) {
          category = /\bproceeds|raised|issued|capital/i.test(description) ? 'cash_inflow' : 'cash_outflow'
          subcategory = 'financing'
        }
      }
      
      // Add numeric values for each period
      cells.forEach(cell => {
        if (cell.col > 1 && typeof cell.value === 'number') {
          lineItems.push({
            description,
            row: rowNum,
            col: cell.col,
            value: cell.value,
            category,
            subcategory
          })
        }
      })
    })
    
    return lineItems
  }

  /**
   * Build the final financial data structure
   */
  private buildFinancialData(
    lineItems: FinancialLineItem[], 
    timePeriods: TimePeriod[], 
    statementType: 'pnl' | 'cashflow' | 'balance_sheet'
  ): { [period: string]: { [category: string]: number } } {
    const data: { [period: string]: { [category: string]: number } } = {}
    
    // Initialize periods
    timePeriods.forEach(period => {
      data[period.period] = {}
      
      if (statementType === 'pnl') {
        data[period.period] = {
          revenue: 0,
          cogs: 0,
          grossProfit: 0,
          operatingExpenses: 0,
          operatingIncome: 0,
          otherIncome: 0,
          otherExpenses: 0,
          ebitda: 0,
          netIncome: 0
        }
      } else if (statementType === 'cashflow') {
        data[period.period] = {
          operatingCashflow: 0,
          investingCashflow: 0,
          financingCashflow: 0,
          netCashflow: 0,
          beginningCash: 0,
          endingCash: 0
        }
      }
    })
    
    // Map line items to periods
    lineItems.forEach(item => {
      const period = timePeriods.find(p => p.col === item.col)
      if (!period) return
      
      const periodData = data[period.period]
      if (!periodData) return
      
      if (statementType === 'pnl') {
        if (item.category === 'revenue') {
          periodData.revenue += item.value
        } else if (item.category === 'expense') {
          if (item.subcategory === 'cogs') {
            periodData.cogs += Math.abs(item.value)
          } else {
            periodData.operatingExpenses += Math.abs(item.value)
          }
        }
      } else if (statementType === 'cashflow') {
        if (item.subcategory === 'operating') {
          periodData.operatingCashflow += item.category === 'cash_inflow' ? item.value : -Math.abs(item.value)
        } else if (item.subcategory === 'investing') {
          periodData.investingCashflow += item.category === 'cash_inflow' ? item.value : -Math.abs(item.value)
        } else if (item.subcategory === 'financing') {
          periodData.financingCashflow += item.category === 'cash_inflow' ? item.value : -Math.abs(item.value)
        }
      }
    })
    
    // Calculate derived values
    Object.keys(data).forEach(period => {
      const pd = data[period]
      
      if (statementType === 'pnl') {
        pd.grossProfit = pd.revenue - pd.cogs
        pd.operatingIncome = pd.grossProfit - pd.operatingExpenses
        pd.ebitda = pd.operatingIncome // Simplified - would add back depreciation/amortization
        pd.netIncome = pd.operatingIncome + pd.otherIncome - pd.otherExpenses
      } else if (statementType === 'cashflow') {
        pd.netCashflow = pd.operatingCashflow + pd.investingCashflow + pd.financingCashflow
      }
    })
    
    return data
  }
}