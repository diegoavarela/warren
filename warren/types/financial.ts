export interface Period {
  id: string;
  month: string;
  year: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  operatingExpenses: number;
  operatingIncome: number;
  operatingMargin: number;
  otherExpenses: number;
  earningsBeforeTax: number;
  earningsBeforeTaxMargin: number;
  taxes: number;
  netIncome: number;
  netMargin: number;
  ebitda: number;
  ebitdaMargin: number;
  // Personnel costs
  totalPersonnelCost?: number;
  personnelSalariesCoR?: number;
  payrollTaxesCoR?: number;
  personnelSalariesOp?: number;
  payrollTaxesOp?: number;
  healthCoverage?: number;
  personnelBenefits?: number;
  // Contract services
  contractServicesCoR?: number;
  contractServicesOp?: number;
  professionalServices?: number;
  salesMarketing?: number;
  facilitiesAdmin?: number;
}

export interface YTDMetrics {
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  operatingExpenses: number;
  operatingIncome: number;
  operatingMargin: number;
  otherExpenses: number;
  earningsBeforeTax: number;
  earningsBeforeTaxMargin: number;
  taxes: number;
  netIncome: number;
  netMargin: number;
  ebitda: number;
  ebitdaMargin: number;
  monthsIncluded: number;
}

export interface RevenueCategory {
  category: string;
  amount: number;
  percentage: number;
}

export interface COGSCategory {
  category: string;
  amount: number;
  percentage: number;
}

export interface ExpenseCategory {
  category: string;
  amount: number;
  percentage: number;
  subcategories?: { name: string; amount: number }[];
}

export interface TaxCategory {
  category: string;
  amount: number;
  percentage: number;
}

export interface ForecastData {
  trend: number[];
  optimistic: number[];
  pessimistic: number[];
  months: string[];
}

export interface PnLData {
  periods: Period[];
  currentPeriod: Period;
  previousPeriod?: Period;
  comparisonData?: Period;
  comparisonPeriod?: string;
  yearToDate: YTDMetrics;
  categories: {
    revenue: RevenueCategory[];
    cogs: COGSCategory[];
    operatingExpenses: ExpenseCategory[];
    taxes?: TaxCategory[];
  };
  forecasts?: {
    revenue: ForecastData;
    netIncome: ForecastData;
  };
  metadata?: {
    numberFormat?: {
      decimalSeparator: '.' | ',';
      thousandsSeparator: ',' | '.' | ' ';
      decimalPlaces: number;
    };
    financials?: {
      growth?: {
        revenueGrowth: number;
        grossProfitGrowth: number;
        operatingIncomeGrowth: number;
        netIncomeGrowth: number;
        ebitdaGrowth: number;
      };
    };
  };
}

export interface CashFlowData {
  periods: CashFlowPeriod[];
  currentPeriod: CashFlowPeriod;
  previousPeriod?: CashFlowPeriod;
  yearToDate: CashFlowYTDMetrics;
  categories: {
    inflows: CashFlowCategory[];
    outflows: CashFlowCategory[];
  };
  metrics: {
    burnRate: number;
    runway: number;
    breakeven: number;
    daysOfCash: number;
  };
}

export interface CashFlowPeriod {
  id: string;
  month: string;
  year: number;
  totalInflows: number;
  totalOutflows: number;
  netCashFlow: number;
  openingBalance: number;
  closingBalance: number;
  operatingCashFlow: number;
  investingCashFlow: number;
  financingCashFlow: number;
}

export interface CashFlowYTDMetrics {
  totalInflows: number;
  totalOutflows: number;
  netCashFlow: number;
  averageMonthlyInflow: number;
  averageMonthlyOutflow: number;
  averageBurnRate: number;
  monthsIncluded: number;
}

export interface CashFlowCategory {
  category: string;
  amount: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  subcategories?: { name: string; amount: number }[];
}