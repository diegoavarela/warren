import { Period, PnLData, YTDMetrics } from '@/types/financial';

// Transform API response to P&L Dashboard format
export function transformToPnLData(apiData: any): PnLData | null {
  if (!apiData) return null;

  const { currentMonth, previousMonth, yearToDate, categories, trends } = apiData;

  if (!currentMonth) return null;

  // Transform current period
  const currentPeriod: Period = {
    id: currentMonth.id || `${currentMonth.year}-${currentMonth.month}`,
    month: currentMonth.monthName || getMonthName(currentMonth.month),
    year: currentMonth.year || new Date().getFullYear(),
    revenue: currentMonth.revenue || 0,
    cogs: currentMonth.cogs || 0,
    grossProfit: currentMonth.grossProfit || 0,
    grossMargin: currentMonth.grossMargin || 0,
    operatingExpenses: currentMonth.operatingExpenses || 0,
    operatingIncome: currentMonth.operatingIncome || 0,
    operatingMargin: currentMonth.operatingMargin || 0,
    taxes: currentMonth.taxes || 0,
    netIncome: currentMonth.netIncome || 0,
    netMargin: currentMonth.netMargin || 0,
    ebitda: currentMonth.ebitda || 0,
    ebitdaMargin: currentMonth.ebitdaMargin || 0
  };

  // Transform previous period if available
  const previousPeriod: Period | undefined = previousMonth ? {
    id: previousMonth.id || `${previousMonth.year}-${previousMonth.month}`,
    month: previousMonth.monthName || getMonthName(previousMonth.month),
    year: previousMonth.year || new Date().getFullYear(),
    revenue: previousMonth.revenue || 0,
    cogs: previousMonth.cogs || 0,
    grossProfit: previousMonth.grossProfit || 0,
    grossMargin: previousMonth.grossMargin || 0,
    operatingExpenses: previousMonth.operatingExpenses || 0,
    operatingIncome: previousMonth.operatingIncome || 0,
    operatingMargin: previousMonth.operatingMargin || 0,
    taxes: previousMonth.taxes || 0,
    netIncome: previousMonth.netIncome || 0,
    netMargin: previousMonth.netMargin || 0,
    ebitda: previousMonth.ebitda || 0,
    ebitdaMargin: previousMonth.ebitdaMargin || 0
  } : undefined;

  // Transform YTD metrics
  const ytdMetrics: YTDMetrics = {
    revenue: yearToDate?.revenue || 0,
    cogs: yearToDate?.cogs || 0,
    grossProfit: yearToDate?.grossProfit || 0,
    grossMargin: yearToDate?.grossMargin || 0,
    operatingExpenses: yearToDate?.operatingExpenses || 0,
    operatingIncome: yearToDate?.operatingIncome || 0,
    operatingMargin: yearToDate?.operatingMargin || 0,
    taxes: yearToDate?.taxes || 0,
    netIncome: yearToDate?.netIncome || 0,
    netMargin: yearToDate?.netMargin || 0,
    ebitda: yearToDate?.ebitda || 0,
    ebitdaMargin: yearToDate?.ebitdaMargin || 0,
    monthsIncluded: yearToDate?.monthsIncluded || 1
  };

  // Transform categories
  const transformedCategories = {
    revenue: categories?.revenue || [],
    cogs: categories?.cogs || [],
    operatingExpenses: categories?.operatingExpenses || []
  };

  // Transform historical periods from trends
  const periods: Period[] = trends?.revenue?.map((item: any, index: number) => ({
    id: item.id || `period-${index}`,
    month: item.month || getMonthName(index + 1),
    year: item.year || new Date().getFullYear(),
    revenue: item.value || 0,
    cogs: trends.cogs?.[index]?.value || 0,
    grossProfit: (item.value || 0) - (trends.cogs?.[index]?.value || 0),
    grossMargin: item.value ? ((item.value - (trends.cogs?.[index]?.value || 0)) / item.value) * 100 : 0,
    operatingExpenses: trends.operatingExpenses?.[index]?.value || 0,
    operatingIncome: 0, // Calculate if needed
    operatingMargin: 0,
    taxes: trends.taxes?.[index]?.value || 0,
    netIncome: trends.netIncome?.[index]?.value || 0,
    netMargin: trends.netMargin?.[index]?.value || 0,
    ebitda: trends.ebitda?.[index]?.value || 0,
    ebitdaMargin: trends.ebitdaMargin?.[index]?.value || 0
  })) || [];

  // Add current and previous periods to the list if not already included
  if (!periods.find(p => p.id === currentPeriod.id)) {
    periods.push(currentPeriod);
  }
  if (previousPeriod && !periods.find(p => p.id === previousPeriod.id)) {
    periods.push(previousPeriod);
  }

  // Generate forecasts based on trends
  const forecasts = generateForecasts(periods, currentPeriod);

  return {
    periods,
    currentPeriod,
    previousPeriod,
    yearToDate: ytdMetrics,
    categories: transformedCategories,
    forecasts
  };
}

// Transform API response to Executive Dashboard format
export function transformToExecutiveDashboard(apiData: any): any {
  if (!apiData) return null;

  const { currentMonth, previousMonth, yearToDate } = apiData;

  return {
    currentCashPosition: currentMonth?.cashBalance || currentMonth?.revenue * 2.5, // Estimate if not available
    revenueGrowthYTD: calculateGrowthPercentage(yearToDate?.revenue || 0, previousMonth?.revenue || 0),
    cashRunwayMonths: calculateCashRunway(currentMonth),
    totalRevenue: currentMonth?.revenue || 0,
    totalExpenses: (currentMonth?.cogs || 0) + (currentMonth?.operatingExpenses || 0),
    netIncome: currentMonth?.netIncome || 0,
    cashFlow: currentMonth?.cashFlow || currentMonth?.netIncome || 0,
    grossProfit: currentMonth?.grossProfit || 0,
    grossMargin: currentMonth?.grossMargin || 0,
    operatingIncome: currentMonth?.operatingIncome || 0,
    operatingMargin: currentMonth?.operatingMargin || 0,
    ebitda: currentMonth?.ebitda || 0,
    ebitdaMargin: currentMonth?.ebitdaMargin || 0,
    previousMonth: previousMonth ? {
      revenue: previousMonth.revenue || 0,
      expenses: (previousMonth.cogs || 0) + (previousMonth.operatingExpenses || 0),
      netIncome: previousMonth.netIncome || 0,
      cashFlow: previousMonth.cashFlow || previousMonth.netIncome || 0
    } : undefined
  };
}

// Helper functions
function getMonthName(month: number): string {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return months[(month - 1) % 12] || 'Ene';
}

function calculateGrowthPercentage(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

function calculateCashRunway(currentMonth: any): number {
  if (!currentMonth) return 0;
  const monthlyBurn = (currentMonth.operatingExpenses || 0) + (currentMonth.cogs || 0) - (currentMonth.revenue || 0);
  const cash = currentMonth.cashBalance || currentMonth.revenue * 2.5;
  
  if (monthlyBurn <= 0) return 999; // Profitable
  return Math.floor(cash / monthlyBurn);
}

function generateForecasts(historicalPeriods: Period[], currentPeriod: Period) {
  if (historicalPeriods.length < 3) return undefined;

  // Simple linear projection for demo
  const months = ['Dic', 'Ene', 'Feb', 'Mar', 'Abr', 'May'];
  const revenueGrowthRate = 0.05; // 5% monthly growth
  const optimisticMultiplier = 1.2;
  const pessimisticMultiplier = 0.8;

  const baseRevenue = currentPeriod.revenue;
  const baseNetIncome = currentPeriod.netIncome;

  return {
    revenue: {
      trend: months.map((_, i) => baseRevenue * Math.pow(1 + revenueGrowthRate, i)),
      optimistic: months.map((_, i) => baseRevenue * Math.pow(1 + revenueGrowthRate, i) * optimisticMultiplier),
      pessimistic: months.map((_, i) => baseRevenue * Math.pow(1 + revenueGrowthRate, i) * pessimisticMultiplier),
      months
    },
    netIncome: {
      trend: months.map((_, i) => baseNetIncome * Math.pow(1 + revenueGrowthRate, i)),
      optimistic: months.map((_, i) => baseNetIncome * Math.pow(1 + revenueGrowthRate, i) * optimisticMultiplier),
      pessimistic: months.map((_, i) => baseNetIncome * Math.pow(1 + revenueGrowthRate, i) * pessimisticMultiplier),
      months
    }
  };
}