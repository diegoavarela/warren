// Extended financial data interfaces for investments, banks, and taxes

export interface OperationalData {
  month: string
  date: Date
  // Operational Costs (from your Excel file)
  totalOpex?: number        // Row 52
  totalTaxes?: number       // Row 87  
  totalWages?: number       // Row 79
  totalBankAndTaxes?: number // Row 99
  totalOperationalCosts?: number // Calculated sum
}

export interface InvestmentData {
  month: string
  date: Date
  // Investment Accounts
  stockPortfolio?: number
  bondPortfolio?: number
  realEstate?: number
  cryptoAssets?: number
  privateEquity?: number
  // Investment Performance
  totalInvestmentValue?: number
  monthlyReturn?: number
  returnPercentage?: number
  dividendInflow?: number
  capitalGains?: number
  investmentFees?: number
}

export interface BankData {
  month: string
  date: Date
  // Bank Accounts
  checkingBalance?: number
  savingsBalance?: number
  moneyMarketBalance?: number
  cdBalance?: number
  // Bank Details
  bankFees?: number
  interestEarned?: number
  // Credit Facilities
  creditLineUsed?: number
  creditLineAvailable?: number
  creditLineTotal?: number
}

export interface TaxData {
  month: string
  date: Date
  // Tax Payments
  inflowTaxPaid?: number
  payrollTaxPaid?: number
  salesTaxPaid?: number
  propertyTaxPaid?: number
  otherTaxesPaid?: number
  // Tax Liabilities
  estimatedTaxLiability?: number
  taxRefundReceived?: number
  totalTaxBurden?: number
  effectiveTaxRate?: number
}

export interface ExtendedFinancialData {
  operational: OperationalData[]
  investments: InvestmentData[]
  banks: BankData[]
  taxes: TaxData[]
}

export interface FinancialSummary {
  // Investment Summary
  totalInvestmentValue: number
  totalInvestmentReturn: number
  totalDividendInflow: number
  
  // Banking Summary  
  totalCashBalance: number
  totalBankFees: number
  totalInterestEarned: number
  creditUtilization: number
  
  // Tax Summary
  totalTaxesPaid: number
  estimatedAnnualTaxLiability: number
  effectiveTaxRate: number
}