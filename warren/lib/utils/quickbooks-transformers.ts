import { PnLData, Period, YTDMetrics, RevenueCategory, COGSCategory, ExpenseCategory, TaxCategory } from '@/types/financial';

/**
 * QuickBooks P&L Data Transformer
 * Transforms QuickBooks API response to Warren dashboard PnLData format
 */

interface QuickBooksApiResponse {
  success: boolean;
  data: {
    companyId: string;
    period: {
      start: string;
      end: string;
      type: 'ytd' | 'qtd' | 'rolling_12m';
    };
    currency: string;
    categories: {
      [categoryName: string]: {
        name: string;
        total: number;
        accounts: Array<{
          accountName: string;
          accountCode: string;
          accountType: string;
          amount: number;
          subcategory: string;
          level: number;
          isDetailAccount: boolean;
          isSubtotal: boolean;
          isTotal: boolean;
          percentOfRevenue: number;
          periodLabel: string;
          currency: string;
        }>;
        subcategories: {
          [subcategoryName: string]: Array<{
            accountName: string;
            amount: number;
            accountCode: string;
            level: number;
          }>;
        };
      };
    };
    accumulative?: any;
    summary: {
      totalRevenue: number;
      totalCogs: number;
      grossProfit: number;
      grossMargin: number;
      totalOpex: number;
      operatingIncome: number;
      operatingMargin: number;
      totalTaxes: number;
      netIncome: number;
      netMargin: number;
      ebitda: number;
      ebitdaMargin: number;
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
    metadata: {
      totalRecords: number;
      lastUpdate: string;
      generatedAt: string;
    };
  };
}

/**
 * Transform QuickBooks API response to PnLData format
 */
export function transformQuickBooksData(apiResponse: QuickBooksApiResponse): PnLData | null {
  console.log('🎯 [QB Transformer] Starting transformation with response:', {
    success: apiResponse?.success,
    hasData: !!apiResponse?.data,
    dataKeys: apiResponse?.data ? Object.keys(apiResponse.data) : 'none'
  });

  if (!apiResponse?.success || !apiResponse?.data) {
    console.error('❌ [QB Transformer] Invalid QuickBooks API response:', apiResponse);
    return null;
  }

  const { data } = apiResponse;
  console.log('🎯 [QB Transformer] Data structure:', {
    categories: data.categories ? Object.keys(data.categories) : 'none',
    summary: !!data.summary,
    period: !!data.period,
    hasCategories: !!data.categories
  });

  const { categories, summary, period } = data;

  try {
    // Use API summary.financials directly if available, otherwise calculate from categories
    let calculatedSummary;

    if (data.summary?.financials) {
      // Trust the API's corrected calculations
      const financials = data.summary.financials;
      calculatedSummary = {
        totalRevenue: financials.revenue,
        totalCogs: financials.costOfGoodsSold,
        grossProfit: financials.grossProfit,
        grossMargin: financials.margins.gross,
        totalOpex: financials.operatingExpenses,
        operatingIncome: financials.operatingIncome || (financials.grossProfit - financials.operatingExpenses),
        operatingMargin: financials.margins?.operating || (financials.revenue > 0 ? (financials.operatingIncome / financials.revenue) * 100 : 0),
        totalOtherExpenses: financials.otherExpenses || 0,
        totalTaxes: 0, // TODO: Extract from API when available
        netIncome: financials.netIncome,
        netMargin: financials.margins.net,
        ebitda: financials.netIncome, // Simplified for now
        ebitdaMargin: financials.margins.net,
        financials: {
          growth: financials.growth || {
            revenueGrowth: 0,
            grossProfitGrowth: 0,
            operatingIncomeGrowth: 0,
            netIncomeGrowth: 0,
            ebitdaGrowth: 0
          }
        }
      };
      console.log('🎯 [QB Transformer] Using API summary.financials:', calculatedSummary);
    } else {
      // Fallback to calculating from categories (legacy behavior)
      calculatedSummary = summary || calculateSummaryFromCategories(categories);
      console.log('🎯 [QB Transformer] Using calculated/provided summary:', calculatedSummary);
    }

    // Create current period from summary data
    const currentPeriod: Period = createPeriodFromSummary(period, calculatedSummary);

    // Create YTD metrics (for now, same as current period - can be enhanced later)
    const yearToDate: YTDMetrics = createYTDMetrics(calculatedSummary);

    // Transform categories
    const transformedCategories = {
      revenue: transformRevenueCategories(categories),
      cogs: transformCOGSCategories(categories),
      operatingExpenses: transformOperatingExpenses(categories),
      taxes: transformTaxCategories(categories)
    };

    // Create P&L data structure
    const pnlData: PnLData = {
      periods: [currentPeriod], // Single period for now
      currentPeriod,
      yearToDate,
      categories: transformedCategories,
      metadata: {
        numberFormat: {
          decimalSeparator: '.',
          thousandsSeparator: ',',
          decimalPlaces: 2
        },
        financials: calculatedSummary.financials || undefined
      }
    };

    console.log('🎯 [QB Transformer] Successfully transformed QuickBooks data:', {
      periods: pnlData.periods.length,
      revenue: pnlData.categories.revenue.length,
      cogs: pnlData.categories.cogs.length,
      opex: pnlData.categories.operatingExpenses.length,
      taxes: pnlData.categories.taxes?.length || 0
    });

    return pnlData;

  } catch (error) {
    console.error('❌ [QB Transformer] Error transforming QuickBooks data:', error);
    return null;
  }
}

/**
 * Calculate summary metrics from categories data
 */
function calculateSummaryFromCategories(categories: any): any {
  if (!categories || typeof categories !== 'object') {
    console.warn('🎯 [QB Transformer] No categories to calculate summary from');
    return {
      totalRevenue: 0,
      totalCogs: 0,
      grossProfit: 0,
      grossMargin: 0,
      totalOpex: 0,
      operatingIncome: 0,
      operatingMargin: 0,
      totalTaxes: 0,
      netIncome: 0,
      netMargin: 0,
      ebitda: 0,
      ebitdaMargin: 0
    };
  }

  // Extract revenue from Revenue category
  const revenueCategories = Object.keys(categories).filter(key =>
    key.toLowerCase().includes('revenue') || key.toLowerCase().includes('income')
  );
  const totalRevenue = revenueCategories.reduce((sum, key) => {
    return sum + (categories[key]?.total || 0);
  }, 0);

  // Extract COGS
  const cogsCategories = Object.keys(categories).filter(key =>
    key.toLowerCase().includes('cost of goods') || key.toLowerCase().includes('cogs')
  );
  const totalCogs = cogsCategories.reduce((sum, key) => {
    return sum + Math.abs(categories[key]?.total || 0);
  }, 0);

  // Extract Operating Expenses
  const opexCategories = Object.keys(categories).filter(key => {
    const keyLower = key.toLowerCase();
    return keyLower.includes('expense') || keyLower.includes('operating');
  });
  const totalOpex = opexCategories.reduce((sum, key) => {
    return sum + Math.abs(categories[key]?.total || 0);
  }, 0);

  // Calculate derived metrics
  const grossProfit = totalRevenue - totalCogs;
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const operatingIncome = grossProfit - totalOpex;
  const operatingMargin = totalRevenue > 0 ? (operatingIncome / totalRevenue) * 100 : 0;

  console.log('🎯 [QB Transformer] Calculated summary:', {
    totalRevenue,
    totalCogs,
    grossProfit,
    totalOpex,
    operatingIncome
  });

  return {
    totalRevenue,
    totalCogs,
    grossProfit,
    grossMargin,
    totalOpex,
    operatingIncome,
    operatingMargin,
    totalTaxes: 0, // TODO: Extract from categories if available
    netIncome: operatingIncome, // Simplified for now
    netMargin: operatingMargin,
    ebitda: operatingIncome, // Simplified for now
    ebitdaMargin: operatingMargin
  };
}

/**
 * Create a Period object from QuickBooks summary data
 */
function createPeriodFromSummary(period: any, summary: any): Period {
  // Default period if not provided
  const periodDate = period?.end ? new Date(period.end) : new Date();
  const monthName = periodDate.toLocaleDateString('en-US', { month: 'long' });
  const year = periodDate.getFullYear();

  // If no summary, calculate from categories data (fallback)
  const summaryData = summary || {
    totalRevenue: 0,
    totalCogs: 0,
    grossProfit: 0,
    grossMargin: 0,
    totalOpex: 0,
    operatingIncome: 0,
    operatingMargin: 0,
    totalTaxes: 0,
    netIncome: 0,
    netMargin: 0,
    ebitda: 0,
    ebitdaMargin: 0
  };

  console.log('🎯 [QB Transformer] Creating period from summary:', summaryData);

  return {
    id: `${year}-${periodDate.getMonth() + 1}`,
    month: monthName,
    year,
    revenue: summaryData.totalRevenue || 0,
    cogs: Math.abs(summaryData.totalCogs || 0),
    grossProfit: summaryData.grossProfit || 0,
    grossMargin: summaryData.grossMargin || 0,
    operatingExpenses: Math.abs(summaryData.totalOpex || 0),
    operatingIncome: summaryData.operatingIncome || 0,
    operatingMargin: summaryData.operatingMargin || 0,
    otherExpenses: Math.abs(summaryData.totalOtherExpenses || 0),
    earningsBeforeTax: summaryData.operatingIncome || 0, // Same as operating income for now
    earningsBeforeTaxMargin: summaryData.operatingMargin || 0,
    taxes: Math.abs(summaryData.totalTaxes || 0),
    netIncome: summaryData.netIncome || 0,
    netMargin: summaryData.netMargin || 0,
    ebitda: summaryData.ebitda || 0,
    ebitdaMargin: summaryData.ebitdaMargin || 0
  };
}

/**
 * Create YTD metrics from summary
 */
function createYTDMetrics(summary: any): YTDMetrics {
  return {
    revenue: summary.totalRevenue || 0,
    cogs: Math.abs(summary.totalCogs || 0),
    grossProfit: summary.grossProfit || 0,
    grossMargin: summary.grossMargin || 0,
    operatingExpenses: Math.abs(summary.totalOpex || 0),
    operatingIncome: summary.operatingIncome || 0,
    operatingMargin: summary.operatingMargin || 0,
    otherExpenses: Math.abs(summary.totalOtherExpenses || 0),
    earningsBeforeTax: summary.operatingIncome || 0,
    earningsBeforeTaxMargin: summary.operatingMargin || 0,
    taxes: Math.abs(summary.totalTaxes || 0),
    netIncome: summary.netIncome || 0,
    netMargin: summary.netMargin || 0,
    ebitda: summary.ebitda || 0,
    ebitdaMargin: summary.ebitdaMargin || 0,
    monthsIncluded: 1 // Will be enhanced for YTD calculations
  };
}

/**
 * Transform QuickBooks revenue categories
 */
function transformRevenueCategories(categories: any): RevenueCategory[] {
  const revenueCategories: RevenueCategory[] = [];

  // Handle null/undefined categories
  if (!categories || typeof categories !== 'object') {
    console.log('🎯 [QB Transformer] No categories found, returning empty revenue array');
    return revenueCategories;
  }

  // Look for revenue-related categories
  const revenueKeys = Object.keys(categories).filter(key =>
    key.toLowerCase().includes('revenue') ||
    key.toLowerCase().includes('income') ||
    key.toLowerCase().includes('sales')
  );

  let totalRevenue = 0;
  const categoryAmounts: Array<{category: string, amount: number}> = [];

  for (const categoryKey of revenueKeys) {
    const category = categories[categoryKey];
    if (category && category.total) {
      const amount = Math.abs(category.total);
      totalRevenue += amount;
      categoryAmounts.push({ category: categoryKey, amount });
    }
  }

  // Convert to percentage-based format
  categoryAmounts.forEach(({ category, amount }) => {
    const percentage = totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0;
    revenueCategories.push({
      category,
      amount,
      percentage: Math.round(percentage * 100) / 100
    });
  });

  return revenueCategories;
}

/**
 * Transform QuickBooks COGS categories
 */
function transformCOGSCategories(categories: any): COGSCategory[] {
  const cogsCategories: COGSCategory[] = [];

  // Handle null/undefined categories
  if (!categories || typeof categories !== 'object') {
    console.log('🎯 [QB Transformer] No categories found, returning empty COGS array');
    return cogsCategories;
  }

  // Look for COGS-related categories
  const cogsKeys = Object.keys(categories).filter(key =>
    key.toLowerCase().includes('cost of goods') ||
    key.toLowerCase().includes('cogs') ||
    key.toLowerCase().includes('cost of sales')
  );

  let totalCogs = 0;
  const categoryAmounts: Array<{category: string, amount: number}> = [];

  for (const categoryKey of cogsKeys) {
    const category = categories[categoryKey];
    if (category && category.total) {
      const amount = Math.abs(category.total);
      totalCogs += amount;
      categoryAmounts.push({ category: categoryKey, amount });
    }
  }

  // Convert to percentage-based format
  categoryAmounts.forEach(({ category, amount }) => {
    const percentage = totalCogs > 0 ? (amount / totalCogs) * 100 : 0;
    cogsCategories.push({
      category,
      amount,
      percentage: Math.round(percentage * 100) / 100
    });
  });

  return cogsCategories;
}

/**
 * Transform QuickBooks operating expenses
 */
function transformOperatingExpenses(categories: any): ExpenseCategory[] {
  const expenseCategories: ExpenseCategory[] = [];

  // Handle null/undefined categories
  if (!categories || typeof categories !== 'object') {
    console.log('🎯 [QB Transformer] No categories found, returning empty expenses array');
    return expenseCategories;
  }

  // Look for expense-related categories (exclude revenue and COGS)
  const expenseKeys = Object.keys(categories).filter(key => {
    const keyLower = key.toLowerCase();
    return !keyLower.includes('revenue') &&
           !keyLower.includes('income') &&
           !keyLower.includes('sales') &&
           !keyLower.includes('cost of goods') &&
           !keyLower.includes('cogs') &&
           !keyLower.includes('cost of sales');
  });

  let totalExpenses = 0;
  const categoryAmounts: Array<{category: string, amount: number, subcategories?: any}> = [];

  for (const categoryKey of expenseKeys) {
    const category = categories[categoryKey];
    if (category && category.total) {
      const amount = Math.abs(category.total);
      totalExpenses += amount;

      // Transform subcategories if available
      const subcategories = category.subcategories ?
        Object.entries(category.subcategories).map(([subName, subAccounts]: [string, any]) => ({
          name: subName,
          amount: subAccounts.reduce((sum: number, account: any) => sum + Math.abs(account.amount || 0), 0)
        })) : undefined;

      categoryAmounts.push({
        category: categoryKey,
        amount,
        subcategories
      });
    }
  }

  // Convert to percentage-based format
  categoryAmounts.forEach(({ category, amount, subcategories }) => {
    const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
    expenseCategories.push({
      category,
      amount,
      percentage: Math.round(percentage * 100) / 100,
      subcategories
    });
  });

  return expenseCategories;
}

/**
 * Transform QuickBooks tax categories
 */
function transformTaxCategories(categories: any): TaxCategory[] {
  const taxCategories: TaxCategory[] = [];

  // Handle null/undefined categories
  if (!categories || typeof categories !== 'object') {
    console.log('🎯 [QB Transformer] No categories found, returning empty tax array');
    return taxCategories;
  }

  // Look for tax-related categories
  const taxKeys = Object.keys(categories).filter(key =>
    key.toLowerCase().includes('tax') ||
    key.toLowerCase().includes('income tax')
  );

  let totalTaxes = 0;
  const categoryAmounts: Array<{category: string, amount: number}> = [];

  for (const categoryKey of taxKeys) {
    const category = categories[categoryKey];
    if (category && category.total) {
      const amount = Math.abs(category.total);
      totalTaxes += amount;
      categoryAmounts.push({ category: categoryKey, amount });
    }
  }

  // Convert to percentage-based format
  categoryAmounts.forEach(({ category, amount }) => {
    const percentage = totalTaxes > 0 ? (amount / totalTaxes) * 100 : 0;
    taxCategories.push({
      category,
      amount,
      percentage: Math.round(percentage * 100) / 100
    });
  });

  return taxCategories;
}