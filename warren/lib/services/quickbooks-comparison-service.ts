/**
 * QuickBooks Comparison Service
 *
 * Handles comparison calculations between current month and previous periods
 * Supports year-over-year and 3-month comparisons
 */

/**
 * Represents financial metrics for a period
 */
interface PeriodMetrics {
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  operatingExpenses: number;
  netIncome: number;
  netMargin: number;
  periodLabel: string;
  year: number;
  month: number;
}

/**
 * Represents a comparison between two periods
 */
interface ComparisonData {
  value: number;
  previousValue: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'flat';
}

/**
 * Complete comparison result
 */
interface ComparisonResult {
  current: PeriodMetrics;
  comparison: {
    revenue: ComparisonData;
    cogs: ComparisonData;
    grossProfit: ComparisonData;
    grossMargin: ComparisonData;
    operatingExpenses: ComparisonData;
    netIncome: ComparisonData;
    netMargin: ComparisonData;
  };
  comparisonPeriod: PeriodMetrics;
  comparisonType: 'year-ago' | '3-months-ago';
}

/**
 * Extract financial metrics from QuickBooks P&L response
 */
export function extractFinancialMetrics(pnlResponse: any, year: number, month: number): PeriodMetrics {
  try {
    console.log('🔍 [QB Comparison] Extracting metrics for', year, month);

    // Initialize default values
    let revenue = 0;
    let cogs = 0;
    let operatingExpenses = 0;

    // Handle both { Report: {...} } and direct { Rows: {...} } formats
    const reportData = pnlResponse.Report || pnlResponse;
    const rowsToProcess = reportData?.Rows?.Row || [];

    console.log('🔍 [QB Comparison] Processing rows:', Array.isArray(rowsToProcess) ? rowsToProcess.length : 0);

    if (Array.isArray(rowsToProcess)) {
      for (const row of rowsToProcess) {
        processRowForMetrics(row, (accountName, amount) => {
          // Map account names to metrics (simplified for comparison)
          const accountLower = accountName.toLowerCase();

          if (accountLower.includes('total income') || accountLower.includes('revenue')) {
            revenue = Math.max(revenue, amount); // Take the highest revenue value
          } else if (accountLower.includes('cost of goods sold') || accountLower.includes('cogs')) {
            cogs += amount;
          } else if (accountLower.includes('total expenses') && !accountLower.includes('other expenses')) {
            operatingExpenses = Math.max(operatingExpenses, amount); // Take the highest expense total
          }
        });
      }
    }

    // Calculate derived metrics
    const grossProfit = revenue - cogs;
    const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    const netIncome = grossProfit - operatingExpenses;
    const netMargin = revenue > 0 ? (netIncome / revenue) * 100 : 0;

    // Create period label
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const periodLabel = `${monthNames[month - 1]} ${year}`;

    const metrics: PeriodMetrics = {
      revenue,
      cogs,
      grossProfit,
      grossMargin,
      operatingExpenses,
      netIncome,
      netMargin,
      periodLabel,
      year,
      month
    };

    console.log('✅ [QB Comparison] Extracted metrics:', {
      periodLabel,
      revenue,
      grossProfit,
      netIncome
    });

    return metrics;

  } catch (error) {
    console.error('❌ [QB Comparison] Error extracting metrics:', error);

    // Return default metrics on error
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return {
      revenue: 0,
      cogs: 0,
      grossProfit: 0,
      grossMargin: 0,
      operatingExpenses: 0,
      netIncome: 0,
      netMargin: 0,
      periodLabel: `${monthNames[month - 1]} ${year}`,
      year,
      month
    };
  }
}

/**
 * Helper function to recursively process QuickBooks rows
 */
function processRowForMetrics(row: any, callback: (accountName: string, amount: number) => void) {
  if (!row) return;

  // Handle detail accounts with ColData
  if (row.ColData && Array.isArray(row.ColData)) {
    const colData = row.ColData;
    const accountName = colData[0]?.value;

    if (accountName && accountName.trim()) {
      const amount = Math.abs(parseFloat(colData[colData.length - 1]?.value || '0'));
      callback(accountName, amount);
    }
  }

  // Handle summary rows
  if (row.Summary && row.Summary.ColData) {
    const summaryData = row.Summary.ColData;
    const summaryName = summaryData[0]?.value;

    if (summaryName && summaryName.trim()) {
      const amount = Math.abs(parseFloat(summaryData[summaryData.length - 1]?.value || '0'));
      callback(summaryName, amount);
    }
  }

  // Handle header rows (main sections)
  if (row.Header && row.Header.ColData) {
    const headerData = row.Header.ColData;
    const sectionName = headerData[0]?.value;

    if (sectionName && sectionName.trim()) {
      const amount = Math.abs(parseFloat(headerData[headerData.length - 1]?.value || '0'));
      callback(sectionName, amount);
    }
  }

  // Process nested rows recursively
  if (row.Rows && row.Rows.Row && Array.isArray(row.Rows.Row)) {
    for (const nestedRow of row.Rows.Row) {
      processRowForMetrics(nestedRow, callback);
    }
  }
}

/**
 * Calculate comparison between two periods
 */
export function calculateComparison(current: PeriodMetrics, previous: PeriodMetrics): ComparisonData {
  const change = current.revenue - previous.revenue;
  const changePercent = previous.revenue !== 0 ? (change / previous.revenue) * 100 : 0;

  let trend: 'up' | 'down' | 'flat' = 'flat';
  if (changePercent > 0.1) trend = 'up';
  else if (changePercent < -0.1) trend = 'down';

  return {
    value: current.revenue,
    previousValue: previous.revenue,
    change,
    changePercent,
    trend
  };
}

/**
 * Calculate all metric comparisons between current and previous period
 */
export function calculateAllComparisons(
  current: PeriodMetrics,
  previous: PeriodMetrics,
  comparisonType: 'year-ago' | '3-months-ago'
): ComparisonResult {

  function createComparison(currentVal: number, previousVal: number): ComparisonData {
    const change = currentVal - previousVal;
    const changePercent = previousVal !== 0 ? (change / previousVal) * 100 : 0;

    let trend: 'up' | 'down' | 'flat' = 'flat';
    if (changePercent > 0.1) trend = 'up';
    else if (changePercent < -0.1) trend = 'down';

    return {
      value: currentVal,
      previousValue: previousVal,
      change,
      changePercent: Math.round(changePercent * 100) / 100, // Round to 2 decimal places
      trend
    };
  }

  console.log('🔍 [QB Comparison] Calculating comparisons:', comparisonType);
  console.log('📊 [QB Comparison] Current period:', current.periodLabel, 'Revenue:', current.revenue);
  console.log('📊 [QB Comparison] Previous period:', previous.periodLabel, 'Revenue:', previous.revenue);

  const result: ComparisonResult = {
    current,
    comparison: {
      revenue: createComparison(current.revenue, previous.revenue),
      cogs: createComparison(current.cogs, previous.cogs),
      grossProfit: createComparison(current.grossProfit, previous.grossProfit),
      grossMargin: createComparison(current.grossMargin, previous.grossMargin),
      operatingExpenses: createComparison(current.operatingExpenses, previous.operatingExpenses),
      netIncome: createComparison(current.netIncome, previous.netIncome),
      netMargin: createComparison(current.netMargin, previous.netMargin)
    },
    comparisonPeriod: previous,
    comparisonType
  };

  console.log('✅ [QB Comparison] Comparison complete:', {
    revenueChange: result.comparison.revenue.changePercent + '%',
    netIncomeChange: result.comparison.netIncome.changePercent + '%'
  });

  return result;
}

/**
 * Process QuickBooks comparison data for dashboard consumption
 */
export function processQuickBooksComparisons(
  currentResponse: any,
  yearAgoResponse: any | null,
  threeMonthsAgoResponse: any | null,
  currentYear: number,
  currentMonth: number
): {
  current: PeriodMetrics;
  yearAgo?: ComparisonResult;
  threeMonthsAgo?: ComparisonResult;
} {
  try {
    console.log('🔍 [QB Comparison] Processing QuickBooks comparison data');

    // Extract current period metrics
    const current = extractFinancialMetrics(currentResponse, currentYear, currentMonth);

    const result: any = { current };

    // Process year-ago comparison if available
    if (yearAgoResponse) {
      const yearAgoPeriods = require('./quickbooks-service').calculateComparisonPeriods(currentYear, currentMonth);
      const yearAgoMetrics = extractFinancialMetrics(
        yearAgoResponse,
        yearAgoPeriods.yearAgo.year,
        yearAgoPeriods.yearAgo.month
      );
      result.yearAgo = calculateAllComparisons(current, yearAgoMetrics, 'year-ago');
    }

    // Process 3-months-ago comparison if available
    if (threeMonthsAgoResponse) {
      const threeMonthsPeriods = require('./quickbooks-service').calculateComparisonPeriods(currentYear, currentMonth);
      const threeMonthsAgoMetrics = extractFinancialMetrics(
        threeMonthsAgoResponse,
        threeMonthsPeriods.threeMonthsAgo.year,
        threeMonthsPeriods.threeMonthsAgo.month
      );
      result.threeMonthsAgo = calculateAllComparisons(current, threeMonthsAgoMetrics, '3-months-ago');
    }

    console.log('✅ [QB Comparison] Processing complete');

    return result;

  } catch (error) {
    console.error('❌ [QB Comparison] Error processing comparisons:', error);
    throw error;
  }
}