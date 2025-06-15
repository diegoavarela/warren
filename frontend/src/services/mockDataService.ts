// Mock data for screenshot mode
export const mockCashflowData = {
  hasData: true,
  uploadedFileName: 'Cashflow_2025.xlsx',
  currentMonth: {
    month: 'January 2025',
    totalIncome: 1250000,
    totalExpense: 980000,
    finalBalance: 270000,
    lowestBalance: 150000,
    monthlyGeneration: 270000
  },
  yearToDate: {
    totalIncome: 1250000,
    totalExpense: 980000,
    totalBalance: 270000
  },
  chartData: [
    { date: '2025-01', month: 'Jan', income: 1250000, expenses: 980000, cashflow: 770000, isActual: true },
    { date: '2025-02', month: 'Feb', income: 1180000, expenses: 950000, cashflow: 1000000, isActual: true },
    { date: '2025-03', month: 'Mar', income: 1350000, expenses: 1020000, cashflow: 1330000, isActual: true },
    { date: '2025-04', month: 'Apr', income: 1420000, expenses: 1150000, cashflow: 1600000, isActual: false },
    { date: '2025-05', month: 'May', income: 1500000, expenses: 1200000, cashflow: 1900000, isActual: false },
    { date: '2025-06', month: 'Jun', income: 1580000, expenses: 1280000, cashflow: 2200000, isActual: false },
    { date: '2025-07', month: 'Jul', income: 1650000, expenses: 1350000, cashflow: 2500000, isActual: false },
    { date: '2025-08', month: 'Aug', income: 1720000, expenses: 1420000, cashflow: 2800000, isActual: false },
    { date: '2025-09', month: 'Sep', income: 1800000, expenses: 1500000, cashflow: 3100000, isActual: false },
    { date: '2025-10', month: 'Oct', income: 1880000, expenses: 1580000, cashflow: 3400000, isActual: false },
    { date: '2025-11', month: 'Nov', income: 1950000, expenses: 1650000, cashflow: 3700000, isActual: false },
    { date: '2025-12', month: 'Dec', income: 2100000, expenses: 1800000, cashflow: 4000000, isActual: false }
  ],
  lowestPoint: {
    month: 'January 2025',
    amount: 150000
  },
  highestPoint: {
    month: 'December 2025',
    amount: 4000000
  },
  biggestGain: {
    month: 'March 2025',
    amount: 330000
  },
  smallestGain: {
    month: 'February 2025', 
    amount: 230000
  },
  highlights: {
    pastThreeMonths: [
      'January showed strong cash generation with +$270K increase',
      'February experienced slight revenue dip but maintained positive flow', 
      'March recovered with highest income of $1.35M so far'
    ],
    nextSixMonths: [
      'Projected 15% revenue growth through Q2',
      'Cash balance expected to reach $4M by December', 
      'Moderate expense growth forecasted at 12% annually'
    ]
  }
}

export const mockPnlData = {
  hasData: true,
  uploadedFileName: 'PnL_2025.xlsx',
  currentMonth: {
    month: 'March 2025',
    revenue: 1350000,
    cogs: 540000,
    grossProfit: 810000,
    grossMargin: 60.0,
    operatingExpenses: 480000,
    operatingIncome: 330000,
    operatingMargin: 24.4,
    netIncome: 270000,
    netMargin: 20.0,
    ebitda: 350000,
    ebitdaMargin: 25.9,
    // Personnel Cost Details
    totalPersonnelCost: 320000,
    personnelSalariesCoR: 150000,
    payrollTaxesCoR: 30000,
    personnelSalariesOp: 120000,
    payrollTaxesOp: 20000,
    healthCoverage: 25000,
    personnelBenefits: 15000,
    // Cost Structure
    contractServicesCoR: 80000,
    contractServicesOp: 45000,
    professionalServices: 30000,
    salesMarketing: 75000,
    facilitiesAdmin: 35000
  },
  previousMonth: {
    month: 'February 2025',
    revenue: 1180000,
    cogs: 472000,
    grossProfit: 708000,
    grossMargin: 60.0,
    operatingExpenses: 478000,
    operatingIncome: 230000,
    operatingMargin: 19.5,
    netIncome: 200000,
    netMargin: 16.9,
    ebitda: 250000,
    ebitdaMargin: 21.2
  },
  yearToDate: {
    revenue: 3780000,
    cogs: 1512000,
    grossProfit: 2268000,
    operatingExpenses: 1438000,
    netIncome: 830000
  },
  summary: {
    totalRevenue: 3780000,
    totalCOGS: 1512000,
    totalGrossProfit: 2268000,
    avgGrossMargin: 60.0,
    totalOperatingExpenses: 1438000,
    totalOperatingIncome: 830000,
    avgOperatingMargin: 21.6,
    totalNetIncome: 700000,
    avgNetMargin: 18.5
  },
  chartData: [
    { 
      month: 'Jan', 
      revenue: 1250000, 
      grossProfit: 750000, 
      operatingIncome: 270000, 
      netIncome: 230000,
      grossMargin: 60.0,
      netMargin: 18.4
    },
    { 
      month: 'Feb', 
      revenue: 1180000, 
      grossProfit: 708000, 
      operatingIncome: 230000, 
      netIncome: 200000,
      grossMargin: 60.0,
      netMargin: 16.9
    },
    { 
      month: 'Mar', 
      revenue: 1350000, 
      grossProfit: 810000, 
      operatingIncome: 330000, 
      netIncome: 270000,
      grossMargin: 60.0,
      netMargin: 20.0
    },
    { 
      month: 'Apr', 
      revenue: 1420000, 
      grossProfit: 852000, 
      operatingIncome: 320000, 
      netIncome: 270000,
      grossMargin: 60.0,
      netMargin: 19.0
    },
    { 
      month: 'May', 
      revenue: 1500000, 
      grossProfit: 900000, 
      operatingIncome: 350000, 
      netIncome: 300000,
      grossMargin: 60.0,
      netMargin: 20.0
    },
    { 
      month: 'Jun', 
      revenue: 1580000, 
      grossProfit: 948000, 
      operatingIncome: 380000, 
      netIncome: 320000,
      grossMargin: 60.0,
      netMargin: 20.3
    }
  ]
}

// Mock data for individual widgets
export const mockWidgetData = {
  burnRate: {
    hasData: true,
    currentMonthBurn: 980000,
    threeMonthAverage: 1050000,
    sixMonthAverage: 1120000,
    twelveMonthAverage: 1100000,
    burnRateChange: -5.2,
    trend: 'improving',
    currentMonthGeneration: 270000,
    previousMonthGeneration: 230000,
    generationChange: 40000,
    generationChangePercent: 17.4,
    generationTrend: 'increasing',
    monthlyData: [
      { 
        month: 'Jan', 
        burnRate: 980000, 
        changeFromPrevious: -20000, 
        isCashPositive: true, 
        cashGeneration: 270000, 
        generationChange: 40000 
      },
      { 
        month: 'Feb', 
        burnRate: 950000, 
        changeFromPrevious: -30000, 
        isCashPositive: true, 
        cashGeneration: 230000, 
        generationChange: -40000 
      },
      { 
        month: 'Mar', 
        burnRate: 1020000, 
        changeFromPrevious: 70000, 
        isCashPositive: true, 
        cashGeneration: 330000, 
        generationChange: 100000 
      },
      { 
        month: 'Apr', 
        burnRate: 1150000, 
        changeFromPrevious: 130000, 
        isCashPositive: true, 
        cashGeneration: 270000, 
        generationChange: -60000 
      },
      { 
        month: 'May', 
        burnRate: 1200000, 
        changeFromPrevious: 50000, 
        isCashPositive: true, 
        cashGeneration: 300000, 
        generationChange: 30000 
      },
      { 
        month: 'Jun', 
        burnRate: 1280000, 
        changeFromPrevious: 80000, 
        isCashPositive: true, 
        cashGeneration: 300000, 
        generationChange: 0 
      }
    ],
    projectedBurnRate: 1050000,
    efficiency: {
      score: 78,
      trend: 'improving'
    }
  },
  
  runway: {
    hasData: true,
    monthsRemaining: 18,
    runwayDate: new Date('2026-07-15'),
    currentBalance: 4000000,
    averageBurnRate: 1120000,
    burnRateTrend: 'stable',
    confidence: {
      conservative: 15,
      moderate: 18,
      optimistic: 22
    }
  },
  
  banking: {
    hasData: true,
    accounts: [
      {
        name: 'Operating Account',
        balance: 1200000,
        currency: 'ARS',
        lastUpdated: new Date('2025-01-15')
      },
      {
        name: 'Savings Account',
        balance: 2800000,
        currency: 'ARS',
        lastUpdated: new Date('2025-01-15')
      }
    ],
    totalBalance: 4000000,
    monthlyInflows: 1250000,
    monthlyOutflows: 980000
  },
  
  investments: [
    {
      month: 'January 2025',
      date: '2025-01-15',
      stockPortfolio: 4250000,
      bondPortfolio: 2550000,
      realEstate: 1700000,
      totalInvestmentValue: 8500000,
      monthlyReturn: 212500, // 2.5% of total
      returnPercentage: 2.5,
      dividendInflow: 85000, // 1% of total
      investmentFees: 25500 // 0.3% of total
    },
    {
      month: 'December 2024',
      date: '2024-12-15',
      stockPortfolio: 4150000,
      bondPortfolio: 2500000,
      realEstate: 1650000,
      totalInvestmentValue: 8300000,
      monthlyReturn: 166000,
      returnPercentage: 2.0,
      dividendInflow: 83000,
      investmentFees: 24900
    }
  ],
  
  taxes: [
    {
      month: 'January',
      date: '2025-01-31',
      totalTaxBurden: 145000,
      effectiveTaxRate: 25
    },
    {
      month: 'February',
      date: '2025-02-28',
      totalTaxBurden: 138000,
      effectiveTaxRate: 24.5
    },
    {
      month: 'March',
      date: '2025-03-31',
      totalTaxBurden: 152000,
      effectiveTaxRate: 25.2
    },
    {
      month: 'April',
      date: '2025-04-30',
      totalTaxBurden: 159000,
      effectiveTaxRate: 25.8
    },
    {
      month: 'May',
      date: '2025-05-31',
      totalTaxBurden: 165000,
      effectiveTaxRate: 26.1
    },
    {
      month: 'June',
      date: '2025-06-30',
      totalTaxBurden: 172000,
      effectiveTaxRate: 26.5
    }
  ],
  
  operational: [
    {
      month: 'June',
      date: '2025-06-30',
      totalOpex: -235000,
      totalTaxes: -145000,
      totalBankAndTaxes: -80000,
      totalWages: -480000,
      totalOperationalCosts: -940000 // Sum of all operational costs
    },
    {
      month: 'May',
      date: '2025-05-31',
      totalOpex: -220000,
      totalTaxes: -138000,
      totalBankAndTaxes: -75000,
      totalWages: -470000,
      totalOperationalCosts: -903000
    }
  ]
}