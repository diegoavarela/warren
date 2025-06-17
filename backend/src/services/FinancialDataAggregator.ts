import { PnLService } from './PnLService'
import { CashflowService } from './CashflowService'
import { ExtendedFinancialService } from './ExtendedFinancialService'
import { logger } from '../utils/logger'

export interface MonthlyData {
  month: string
  value: number
  date: string
}

export interface DetailedCosts {
  month: string
  category: string
  amount: number
  percentage?: number
}

export interface MarginData {
  month: string
  grossMargin: number
  operatingMargin: number
  netMargin: number
  ebitdaMargin: number
}

export interface PersonnelBreakdown {
  month: string
  salaries: number
  payrollTaxes: number
  benefits: number
  total: number
}

export interface DetailedInflows {
  month: string
  category: string
  amount: number
}

export interface DetailedOutflows {
  month: string
  category: string
  amount: number
}

export interface BankData {
  month: string
  bank: string
  balance: number
}

export interface InvestmentData {
  month: string
  portfolioValue: number
  dividends: number
  fees: number
}

export interface FinancialDataContext {
  pnl: {
    availableMonths: string[]
    metrics: {
      revenue: MonthlyData[]
      costs: DetailedCosts[]
      margins: MarginData[]
      personnelCosts: PersonnelBreakdown[]
      ebitda: MonthlyData[]
      operatingExpenses: MonthlyData[]
      netIncome: MonthlyData[]
    }
    metadata: {
      lastUpload: Date | null
      dataRange: { start: string, end: string } | null
      currency: string
      hasData: boolean
    }
  }
  cashflow: {
    availableMonths: string[]
    metrics: {
      inflows: DetailedInflows[]
      outflows: DetailedOutflows[]
      netCashflow: MonthlyData[]
      bankBalances: BankData[]
      investments: InvestmentData[]
      cashPosition: MonthlyData[]
    }
    metadata: {
      lastUpload: Date | null
      dataRange: { start: string, end: string } | null
      currency: string
      hasData: boolean
    }
  }
}

export class FinancialDataAggregator {
  private static instance: FinancialDataAggregator
  private pnlService: PnLService
  private cashflowService: CashflowService
  private extendedService: ExtendedFinancialService

  private constructor() {
    this.pnlService = PnLService.getInstance()
    this.cashflowService = CashflowService.getInstance()
    this.extendedService = ExtendedFinancialService.getInstance()
  }

  static getInstance(): FinancialDataAggregator {
    if (!FinancialDataAggregator.instance) {
      FinancialDataAggregator.instance = new FinancialDataAggregator()
    }
    return FinancialDataAggregator.instance
  }

  async aggregateAllData(): Promise<FinancialDataContext> {
    try {
      logger.info('Aggregating all financial data for AI analysis')
      
      const pnlData = await this.aggregatePnLData()
      const cashflowData = await this.aggregateCashflowData()
      
      return {
        pnl: pnlData,
        cashflow: cashflowData
      }
    } catch (error) {
      logger.error('Error aggregating financial data:', error)
      throw error
    }
  }

  private async aggregatePnLData() {
    const metrics = this.pnlService.getStoredMetrics()
    const lastUpload = this.pnlService.getLastUploadDate()
    
    if (!metrics || metrics.length === 0) {
      return {
        availableMonths: [],
        metrics: {
          revenue: [],
          costs: [],
          margins: [],
          personnelCosts: [],
          ebitda: [],
          operatingExpenses: [],
          netIncome: []
        },
        metadata: {
          lastUpload: null,
          dataRange: null,
          currency: 'ARS',
          hasData: false
        }
      }
    }

    // Extract months
    const availableMonths = metrics.map(m => m.month)
    
    // Revenue data
    const revenue: MonthlyData[] = metrics.map(m => ({
      month: m.month,
      value: m.revenue,
      date: this.getDateForMonth(m.month)
    }))

    // Cost breakdown
    const costs: DetailedCosts[] = []
    metrics.forEach(m => {
      // Add different cost categories
      costs.push({
        month: m.month,
        category: 'Cost of Goods Sold',
        amount: m.cogs,
        percentage: m.revenue > 0 ? (m.cogs / m.revenue) * 100 : 0
      })
      
      costs.push({
        month: m.month,
        category: 'Operating Expenses',
        amount: m.operatingExpenses,
        percentage: m.revenue > 0 ? (m.operatingExpenses / m.revenue) * 100 : 0
      })

      // Add personnel costs if available
      if (m.totalPersonnelCost) {
        costs.push({
          month: m.month,
          category: 'Personnel Costs',
          amount: m.totalPersonnelCost,
          percentage: m.revenue > 0 ? (m.totalPersonnelCost / m.revenue) * 100 : 0
        })
      }

      // Add contract services if available
      if (m.contractServicesCoR || m.contractServicesOp) {
        costs.push({
          month: m.month,
          category: 'Contract Services',
          amount: (m.contractServicesCoR || 0) + (m.contractServicesOp || 0),
          percentage: m.revenue > 0 ? (((m.contractServicesCoR || 0) + (m.contractServicesOp || 0)) / m.revenue) * 100 : 0
        })
      }

      // Add professional services if available
      if (m.professionalServices) {
        costs.push({
          month: m.month,
          category: 'Professional Services',
          amount: m.professionalServices,
          percentage: m.revenue > 0 ? (m.professionalServices / m.revenue) * 100 : 0
        })
      }

      // Add sales & marketing if available
      if (m.salesMarketing) {
        costs.push({
          month: m.month,
          category: 'Sales & Marketing',
          amount: m.salesMarketing,
          percentage: m.revenue > 0 ? (m.salesMarketing / m.revenue) * 100 : 0
        })
      }
    })

    // Margins
    const margins: MarginData[] = metrics.map(m => ({
      month: m.month,
      grossMargin: m.grossMargin,
      operatingMargin: m.operatingMargin,
      netMargin: m.netMargin,
      ebitdaMargin: m.ebitdaMargin
    }))

    // Personnel breakdown
    const personnelCosts: PersonnelBreakdown[] = metrics.map(m => ({
      month: m.month,
      salaries: (m.personnelSalariesCoR || 0) + (m.personnelSalariesOp || 0),
      payrollTaxes: (m.payrollTaxesCoR || 0) + (m.payrollTaxesOp || 0),
      benefits: (m.healthCoverage || 0) + (m.personnelBenefits || 0),
      total: m.totalPersonnelCost || 0
    }))

    // EBITDA
    const ebitda: MonthlyData[] = metrics.map(m => ({
      month: m.month,
      value: m.ebitda,
      date: this.getDateForMonth(m.month)
    }))

    // Operating Expenses
    const operatingExpenses: MonthlyData[] = metrics.map(m => ({
      month: m.month,
      value: m.operatingExpenses,
      date: this.getDateForMonth(m.month)
    }))

    // Net Income
    const netIncome: MonthlyData[] = metrics.map(m => ({
      month: m.month,
      value: m.netIncome,
      date: this.getDateForMonth(m.month)
    }))

    return {
      availableMonths,
      metrics: {
        revenue,
        costs,
        margins,
        personnelCosts,
        ebitda,
        operatingExpenses,
        netIncome
      },
      metadata: {
        lastUpload,
        dataRange: availableMonths.length > 0 ? {
          start: availableMonths[0],
          end: availableMonths[availableMonths.length - 1]
        } : null,
        currency: 'ARS',
        hasData: true
      }
    }
  }

  private async aggregateCashflowData() {
    const storedData = this.cashflowService.getStoredData()
    const lastUpload = this.cashflowService.getLastUploadDate()
    
    if (!storedData || storedData.length === 0) {
      return {
        availableMonths: [],
        metrics: {
          inflows: [],
          outflows: [],
          netCashflow: [],
          bankBalances: [],
          investments: [],
          cashPosition: []
        },
        metadata: {
          lastUpload: null,
          dataRange: null,
          currency: 'ARS',
          hasData: false
        }
      }
    }

    // Get extended metrics
    const extendedMetrics = await this.extendedService.getExtendedMetrics()
    
    // Extract months
    const availableMonths = storedData.map(d => d.month).filter(m => m !== 'Total')
    
    // Inflows breakdown
    const inflows: DetailedInflows[] = []
    storedData.forEach(row => {
      if (row.month === 'Total') return
      
      // Revenue inflows
      if (row.category === 'Revenues' && row[row.month] > 0) {
        inflows.push({
          month: row.month,
          category: 'Customer Revenues',
          amount: row[row.month]
        })
      }
      
      // Investment inflows
      const investmentRows = ['Galicia Dividends', 'Balanz Dividends']
      if (investmentRows.includes(row.lineItem) && row[row.month] > 0) {
        inflows.push({
          month: row.month,
          category: row.lineItem,
          amount: row[row.month]
        })
      }
    })

    // Outflows breakdown
    const outflows: DetailedOutflows[] = []
    const outflowCategories = [
      'Personnel Costs',
      'Taxes',
      'Banking',
      'Technology & Software',
      'Professional Services',
      'Office & Administration',
      'Other Expenses'
    ]
    
    storedData.forEach(row => {
      if (row.month === 'Total') return
      if (outflowCategories.includes(row.category || '') && row[row.month] > 0) {
        outflows.push({
          month: row.month,
          category: row.category!,
          amount: Math.abs(row[row.month])
        })
      }
    })

    // Net cashflow
    const netCashflow: MonthlyData[] = []
    const cashPositionRow = storedData.find(r => r.lineItem === 'Cash Position')
    if (cashPositionRow) {
      availableMonths.forEach(month => {
        netCashflow.push({
          month,
          value: cashPositionRow[month] || 0,
          date: this.getDateForMonth(month)
        })
      })
    }

    // Bank balances
    const bankBalances: BankData[] = []
    const bankAccounts = ['Santander', 'Galicia', 'Frances', 'Payoneer', 'Brubank']
    bankAccounts.forEach(bank => {
      const bankRow = storedData.find(r => r.lineItem === bank)
      if (bankRow) {
        availableMonths.forEach(month => {
          if (bankRow[month]) {
            bankBalances.push({
              month,
              bank,
              balance: bankRow[month]
            })
          }
        })
      }
    })

    // Investments
    const investments: InvestmentData[] = extendedMetrics.investments.monthlyData || []

    // Cash position (ending balance)
    const cashPosition: MonthlyData[] = []
    const endingBalanceRow = storedData.find(r => r.lineItem === 'Ending Balance')
    if (endingBalanceRow) {
      availableMonths.forEach(month => {
        cashPosition.push({
          month,
          value: endingBalanceRow[month] || 0,
          date: this.getDateForMonth(month)
        })
      })
    }

    return {
      availableMonths,
      metrics: {
        inflows,
        outflows,
        netCashflow,
        bankBalances,
        investments,
        cashPosition
      },
      metadata: {
        lastUpload,
        dataRange: availableMonths.length > 0 ? {
          start: availableMonths[0],
          end: availableMonths[availableMonths.length - 1]
        } : null,
        currency: 'ARS',
        hasData: true
      }
    }
  }

  private getDateForMonth(month: string): string {
    const monthMap: { [key: string]: number } = {
      'January': 0, 'February': 1, 'March': 2, 'April': 3,
      'May': 4, 'June': 5, 'July': 6, 'August': 7,
      'September': 8, 'October': 9, 'November': 10, 'December': 11
    }
    
    const currentYear = new Date().getFullYear()
    const monthIndex = monthMap[month] || 0
    return new Date(currentYear, monthIndex, 1).toISOString()
  }

  // Helper method to check data availability for specific queries
  checkDataAvailability(requiredMetrics: string[]): {
    available: string[]
    missing: string[]
    isComplete: boolean
  } {
    const availableMetrics = new Set<string>()
    
    // Check P&L metrics
    const pnlMetrics = this.pnlService.getStoredMetrics()
    if (pnlMetrics && pnlMetrics.length > 0) {
      availableMetrics.add('revenue')
      availableMetrics.add('costs')
      availableMetrics.add('margins')
      availableMetrics.add('ebitda')
      availableMetrics.add('net_income')
      
      // Check for detailed metrics
      if (pnlMetrics.some(m => m.totalPersonnelCost)) {
        availableMetrics.add('personnel_costs')
      }
      if (pnlMetrics.some(m => m.contractServicesCoR || m.contractServicesOp)) {
        availableMetrics.add('contract_services')
      }
    }
    
    // Check Cashflow metrics
    const cashflowData = this.cashflowService.getStoredData()
    if (cashflowData && cashflowData.length > 0) {
      availableMetrics.add('cash_position')
      availableMetrics.add('bank_balances')
      availableMetrics.add('cash_inflows')
      availableMetrics.add('cash_outflows')
      
      // Check for investment data
      if (cashflowData.some(r => r.lineItem?.includes('Dividends'))) {
        availableMetrics.add('investment_income')
      }
    }
    
    const available = requiredMetrics.filter(m => availableMetrics.has(m))
    const missing = requiredMetrics.filter(m => !availableMetrics.has(m))
    
    return {
      available,
      missing,
      isComplete: missing.length === 0
    }
  }
}