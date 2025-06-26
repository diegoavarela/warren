import { PnLService } from './PnLService'
import { CashflowService } from './CashflowService'
import { CashflowServiceV2Enhanced } from './CashflowServiceV2Enhanced'
import { ExtendedFinancialService } from './ExtendedFinancialService'
import { FileUploadService } from './FileUploadService'
import { pool } from '../config/database'
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
  private cashflowServiceV2: CashflowServiceV2Enhanced
  private extendedService: ExtendedFinancialService
  private fileUploadService: FileUploadService

  private constructor() {
    this.pnlService = PnLService.getInstance()
    this.cashflowService = CashflowService.getInstance()
    this.cashflowServiceV2 = new CashflowServiceV2Enhanced()
    this.extendedService = ExtendedFinancialService.getInstance()
    this.fileUploadService = new FileUploadService(pool)
  }

  static getInstance(): FinancialDataAggregator {
    if (!FinancialDataAggregator.instance) {
      FinancialDataAggregator.instance = new FinancialDataAggregator()
    }
    return FinancialDataAggregator.instance
  }

  async aggregateAllData(userId?: number, companyId?: string): Promise<FinancialDataContext> {
    try {
      logger.info(`Aggregating all financial data for AI analysis, userId: ${userId}, companyId: ${companyId}`)
      
      const pnlData = await this.aggregatePnLData(userId, companyId)
      const cashflowData = await this.aggregateCashflowData(userId, companyId)
      
      logger.info(`Aggregated data - PnL hasData: ${pnlData?.metadata?.hasData}, Cashflow hasData: ${cashflowData?.metadata?.hasData}`)
      logger.info(`Cashflow metrics length: ${cashflowData?.metrics?.inflows?.length || 0}`)
      
      return {
        pnl: pnlData,
        cashflow: cashflowData
      }
    } catch (error) {
      logger.error('Error aggregating financial data:', error)
      throw error
    }
  }

  private async aggregatePnLData(userId?: number, companyId?: string) {
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

  private async aggregateCashflowData(userId?: number, companyId?: string) {
    logger.info(`Aggregating cashflow data for userId: ${userId}, companyId: ${companyId}`)
    
    // Check if user has valid cashflow uploads in database
    let uploadData = null
    if (userId && companyId) {
      uploadData = await this.fileUploadService.getLatestValidUpload(userId, 'cashflow', companyId)
      logger.info(`Database upload data found: ${!!uploadData}`)
    }
    
    // Always check in-memory data first since that's what the dashboard uses
    const storedMetrics = this.cashflowServiceV2.getStoredMetrics()
    const storedData = this.cashflowService.getStoredData()
    const lastUpload = this.cashflowService.getLastUploadDate() || (storedMetrics.length > 0 ? new Date() : null)
    
    logger.info(`In-memory cashflow data - metrics: ${storedMetrics.length}, legacy data: ${storedData ? storedData.length : 0}`)
    
    // If we have in-memory data, use it (this is what the dashboard uses)
    if (storedMetrics.length > 0 || (storedData && storedData.length > 0)) {
      logger.info('Using in-memory data for AI analysis')
      return this.aggregateFromInMemoryData(storedMetrics, storedData, lastUpload)
    }
    
    // Otherwise, try database uploads
    if (!uploadData) {
      // No data available from any source
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

    // We have a valid cashflow upload, create summary from database record
    const extendedMetrics = await this.extendedService.getExtendedMetrics()
    
    // For now, create a simple summary based on upload metadata
    // In the future, we could store parsed metrics in the database
    const dataSummary = uploadData.dataSummary || {}
    const monthsAvailable = uploadData.monthsAvailable || 0
    
    return {
      availableMonths: monthsAvailable > 0 ? this.generateMonthsFromRange(uploadData.periodStart, uploadData.periodEnd) : [],
      metrics: {
        inflows: [],
        outflows: [],
        netCashflow: [],
        bankBalances: [],
        investments: [],
        cashPosition: []
      },
      metadata: {
        lastUpload: uploadData.uploadDate,
        dataRange: uploadData.periodStart && uploadData.periodEnd ? {
          start: format(uploadData.periodStart, 'MMMM'),
          end: format(uploadData.periodEnd, 'MMMM')
        } : null,
        currency: 'ARS',
        hasData: true
      }
    }
  }
  
  private aggregateFromInMemoryData(storedMetrics: any[], storedData: any[], lastUpload: Date | null) {
    // Get extended metrics
    const extendedMetrics = this.extendedService.getExtendedMetrics()
    
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

  private generateMonthsFromRange(startDate?: Date, endDate?: Date): string[] {
    if (!startDate || !endDate) return []
    
    const months: string[] = []
    const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1)
    
    while (current <= end) {
      months.push(format(current, 'MMMM'))
      current.setMonth(current.getMonth() + 1)
    }
    
    return months
  }

  // Helper method to check data availability for specific queries
  async checkDataAvailability(requiredMetrics: string[], userId?: number, companyId?: string): Promise<{
    available: string[]
    missing: string[]
    isComplete: boolean
  }> {
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
    
    // Check Cashflow metrics - check database first, then in-memory
    let hasCashflowData = false
    if (userId && companyId) {
      const uploadData = await this.fileUploadService.getLatestValidUpload(userId, 'cashflow', companyId)
      if (uploadData) {
        hasCashflowData = true
      }
    }
    
    if (!hasCashflowData) {
      // Fallback to in-memory data
      const cashflowV2Metrics = this.cashflowServiceV2.getStoredMetrics()
      const cashflowData = this.cashflowService.getStoredData()
      
      if (cashflowV2Metrics.length > 0) {
        hasCashflowData = true
      } else if (cashflowData && cashflowData.length > 0) {
        hasCashflowData = true
      }
    }
    
    if (hasCashflowData) {
      availableMetrics.add('cash_position')
      availableMetrics.add('bank_balances')
      availableMetrics.add('cash_inflows')
      availableMetrics.add('cash_outflows')
      availableMetrics.add('investment_income')
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