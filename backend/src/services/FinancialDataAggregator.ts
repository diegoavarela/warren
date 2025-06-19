import { PnLService } from './PnLService'
import { CashflowService } from './CashflowService'
import { CashflowServiceV2 } from './CashflowServiceV2'
import { ExtendedFinancialService } from './ExtendedFinancialService'
import { logger } from '../utils/logger'
import { format } from 'date-fns'
import { BankData as ExtendedBankData, InvestmentData as ExtendedInvestmentData } from '../interfaces/FinancialData'

interface CashflowEntry {
  date: Date
  description: string
  income: number
  expenses: number
  cashflow: number
  cumulativeCash: number
}

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

export interface SimpleBankData {
  month: string
  bank: string
  balance: number
}

export interface SimpleInvestmentData {
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
      bankBalances: SimpleBankData[]
      investments: SimpleInvestmentData[]
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
  private cashflowServiceV2: CashflowServiceV2
  private extendedService: ExtendedFinancialService

  private constructor() {
    this.pnlService = PnLService.getInstance()
    this.cashflowService = CashflowService.getInstance()
    this.cashflowServiceV2 = new CashflowServiceV2()
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
    // Try to get data from CashflowServiceV2 first (which is what the controller uses)
    const storedMetrics = this.cashflowServiceV2.getStoredMetrics()
    
    // If no data in V2, fall back to original service
    const storedData = storedMetrics.length > 0 ? [] : this.cashflowService.getStoredData()
    const lastUpload = this.cashflowService.getLastUploadDate() || (storedMetrics.length > 0 ? new Date() : null)
    
    // Check if we have data from either source
    if (storedMetrics.length === 0 && (!storedData || storedData.length === 0)) {
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
    
    // If we have data from CashflowServiceV2, use that
    if (storedMetrics.length > 0) {
      return this.aggregateFromV2Metrics(storedMetrics, extendedMetrics, lastUpload)
    }
    
    // Otherwise, use the old format
    // Extract months from cashflow data
    const monthsSet = new Set<string>()
    storedData.forEach((entry: CashflowEntry) => {
      monthsSet.add(format(entry.date, 'MMMM'))
    })
    const availableMonths = Array.from(monthsSet)
    
    // Group cashflow data by month
    const monthlyData = new Map<string, { income: number, expenses: number, cashflow: number, cumulative: number }>()
    
    storedData.forEach((entry: CashflowEntry) => {
      const month = format(entry.date, 'MMMM')
      if (!monthlyData.has(month)) {
        monthlyData.set(month, { income: 0, expenses: 0, cashflow: 0, cumulative: 0 })
      }
      const data = monthlyData.get(month)!
      data.income += entry.income
      data.expenses += entry.expenses
      data.cashflow += entry.cashflow
      data.cumulative = entry.cumulativeCash
    })
    
    // Inflows breakdown
    const inflows: DetailedInflows[] = []
    monthlyData.forEach((data, month) => {
      if (data.income > 0) {
        inflows.push({
          month,
          category: 'Total Income',
          amount: data.income
        })
      }
    })

    // Outflows breakdown
    const outflows: DetailedOutflows[] = []
    monthlyData.forEach((data, month) => {
      if (data.expenses > 0) {
        outflows.push({
          month,
          category: 'Total Expenses',
          amount: data.expenses
        })
      }
    })

    // Net cashflow
    const netCashflow: MonthlyData[] = []
    monthlyData.forEach((data, month) => {
      netCashflow.push({
        month,
        value: data.cashflow,
        date: this.getDateForMonth(month)
      })
    })

    // Bank balances from extended metrics
    const bankBalances: SimpleBankData[] = []
    extendedMetrics.banks.forEach((bankData: ExtendedBankData) => {
      if (bankData.checkingBalance || bankData.savingsBalance) {
        bankBalances.push({
          month: bankData.month,
          bank: 'Total Banks',
          balance: (bankData.checkingBalance || 0) + (bankData.savingsBalance || 0)
        })
      }
    })

    // Investments from extended metrics
    const investments: SimpleInvestmentData[] = []
    extendedMetrics.investments.forEach((inv: ExtendedInvestmentData) => {
      if (inv.totalInvestmentValue || inv.dividendInflow) {
        investments.push({
          month: inv.month,
          portfolioValue: inv.totalInvestmentValue || 0,
          dividends: inv.dividendInflow || 0,
          fees: inv.investmentFees || 0
        })
      }
    })

    // Cash position (cumulative cash)
    const cashPosition: MonthlyData[] = []
    monthlyData.forEach((data, month) => {
      cashPosition.push({
        month,
        value: data.cumulative,
        date: this.getDateForMonth(month)
      })
    })

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

  private aggregateFromV2Metrics(storedMetrics: any[], extendedMetrics: any, lastUpload: Date | null) {
    // Extract months from V2 metrics
    const availableMonths = storedMetrics.map(m => m.month)
    
    // Inflows
    const inflows: DetailedInflows[] = storedMetrics.map(m => ({
      month: m.month,
      category: 'Total Income',
      amount: m.totalInflow
    }))
    
    // Outflows
    const outflows: DetailedOutflows[] = storedMetrics.map(m => ({
      month: m.month,
      category: 'Total Expenses',
      amount: Math.abs(m.totalOutflow)
    }))
    
    // Net cashflow (monthly generation)
    const netCashflow: MonthlyData[] = storedMetrics.map(m => ({
      month: m.month,
      value: m.monthlyGeneration,
      date: this.getDateForMonth(m.month)
    }))
    
    // Cash position (final balance)
    const cashPosition: MonthlyData[] = storedMetrics.map(m => ({
      month: m.month,
      value: m.finalBalance,
      date: this.getDateForMonth(m.month)
    }))
    
    // Bank balances from extended metrics
    const bankBalances: SimpleBankData[] = []
    extendedMetrics.banks.forEach((bankData: ExtendedBankData) => {
      if (bankData.checkingBalance || bankData.savingsBalance) {
        bankBalances.push({
          month: bankData.month,
          bank: 'Total Banks',
          balance: (bankData.checkingBalance || 0) + (bankData.savingsBalance || 0)
        })
      }
    })
    
    // Investments from extended metrics
    const investments: SimpleInvestmentData[] = []
    extendedMetrics.investments.forEach((inv: ExtendedInvestmentData) => {
      if (inv.totalInvestmentValue || inv.dividendInflow) {
        investments.push({
          month: inv.month,
          portfolioValue: inv.totalInvestmentValue || 0,
          dividends: inv.dividendInflow || 0,
          fees: inv.investmentFees || 0
        })
      }
    })
    
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
    
    // Check Cashflow metrics - first check V2, then fallback to V1
    const cashflowV2Metrics = this.cashflowServiceV2.getStoredMetrics()
    const cashflowData = this.cashflowService.getStoredData()
    
    if (cashflowV2Metrics.length > 0) {
      // V2 data is available
      availableMetrics.add('cash_position')
      availableMetrics.add('bank_balances')
      availableMetrics.add('cash_inflows')
      availableMetrics.add('cash_outflows')
      availableMetrics.add('investment_income')
    } else if (cashflowData && cashflowData.length > 0) {
      // V1 data is available
      availableMetrics.add('cash_position')
      availableMetrics.add('bank_balances')
      availableMetrics.add('cash_inflows')
      availableMetrics.add('cash_outflows')
      
      // Check for investment data in description
      if (cashflowData.some((r: CashflowEntry) => r.description?.includes('Dividends'))) {
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