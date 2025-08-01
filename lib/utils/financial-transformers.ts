import { Period, PnLData, YTDMetrics } from '@/types/financial';

// Transform API response to P&L Dashboard format
export function transformToPnLData(apiData: any): PnLData | null {
  if (!apiData) return null;

  const { currentMonth, previousMonth, yearToDate, categories, trends, chartData, comparisonData, comparisonPeriod } = apiData;

  if (!currentMonth) return null;

  // Transform current period
  // Extract month name and year from the API response
  let monthName = currentMonth.month;
  let year = currentMonth.year || new Date().getFullYear();
  
  // If month is in format "May 2025", parse it
  if (monthName && monthName.includes(' ')) {
    const parts = monthName.split(' ');
    monthName = parts[0];
    if (parts[1]) {
      year = parseInt(parts[1], 10);
    }
  }
  
  // Ensure year is a number
  if (typeof year === 'string') {
    year = parseInt(year, 10);
  }
  
  const currentPeriod: Period = {
    id: currentMonth.id || `${year}-${getMonthIndex(monthName)}`,
    month: monthName,
    year: year,
    revenue: currentMonth.revenue || 0,
    cogs: currentMonth.cogs || 0,
    grossProfit: currentMonth.grossProfit || 0,
    grossMargin: currentMonth.grossMargin || 0,
    operatingExpenses: currentMonth.operatingExpenses || 0,
    operatingIncome: currentMonth.operatingIncome || 0,
    operatingMargin: currentMonth.operatingMargin || 0,
    earningsBeforeTax: currentMonth.earningsBeforeTax || 0,
    earningsBeforeTaxMargin: currentMonth.earningsBeforeTaxMargin || 0,
    taxes: currentMonth.taxes || 0,
    netIncome: currentMonth.netIncome || 0,
    netMargin: currentMonth.netMargin || 0,
    ebitda: currentMonth.ebitda || 0,
    ebitdaMargin: currentMonth.ebitdaMargin || 0,
    // Personnel costs
    totalPersonnelCost: currentMonth.totalPersonnelCost,
    personnelSalariesCoR: currentMonth.personnelSalariesCoR,
    payrollTaxesCoR: currentMonth.payrollTaxesCoR,
    personnelSalariesOp: currentMonth.personnelSalariesOp,
    payrollTaxesOp: currentMonth.payrollTaxesOp,
    healthCoverage: currentMonth.healthCoverage,
    personnelBenefits: currentMonth.personnelBenefits,
    // Contract services
    contractServicesCoR: currentMonth.contractServicesCoR,
    contractServicesOp: currentMonth.contractServicesOp,
    professionalServices: currentMonth.professionalServices,
    salesMarketing: currentMonth.salesMarketing,
    facilitiesAdmin: currentMonth.facilitiesAdmin
  };

  // Transform previous period if available
  let previousPeriod: Period | undefined = undefined;
  
  if (previousMonth) {
    let prevMonthName = previousMonth.month;
    let prevYear = previousMonth.year || new Date().getFullYear();
    
    // If month is in format "May 2025", parse it
    if (prevMonthName && prevMonthName.includes(' ')) {
      const parts = prevMonthName.split(' ');
      prevMonthName = parts[0];
      if (parts[1]) {
        prevYear = parseInt(parts[1], 10);
      }
    }
    
    // Ensure year is a number
    if (typeof prevYear === 'string') {
      prevYear = parseInt(prevYear, 10);
    }
    
    previousPeriod = {
      id: previousMonth.id || `${prevYear}-${getMonthIndex(prevMonthName)}`,
      month: prevMonthName,
      year: prevYear,
      revenue: previousMonth.revenue || 0,
      cogs: previousMonth.cogs || 0,
      grossProfit: previousMonth.grossProfit || 0,
      grossMargin: previousMonth.grossMargin || 0,
      operatingExpenses: previousMonth.operatingExpenses || 0,
      operatingIncome: previousMonth.operatingIncome || 0,
      operatingMargin: previousMonth.operatingMargin || 0,
      earningsBeforeTax: previousMonth.earningsBeforeTax || 0,
      earningsBeforeTaxMargin: previousMonth.earningsBeforeTaxMargin || 0,
      taxes: previousMonth.taxes || 0,
      netIncome: previousMonth.netIncome || 0,
      netMargin: previousMonth.netMargin || 0,
      ebitda: previousMonth.ebitda || 0,
      ebitdaMargin: previousMonth.ebitdaMargin || 0,
      // Personnel costs
      totalPersonnelCost: previousMonth.totalPersonnelCost,
      personnelSalariesCoR: previousMonth.personnelSalariesCoR,
      payrollTaxesCoR: previousMonth.payrollTaxesCoR,
      personnelSalariesOp: previousMonth.personnelSalariesOp,
      payrollTaxesOp: previousMonth.payrollTaxesOp,
      healthCoverage: previousMonth.healthCoverage,
      personnelBenefits: previousMonth.personnelBenefits,
      // Contract services
      contractServicesCoR: previousMonth.contractServicesCoR,
      contractServicesOp: previousMonth.contractServicesOp,
      professionalServices: previousMonth.professionalServices,
      salesMarketing: previousMonth.salesMarketing,
      facilitiesAdmin: previousMonth.facilitiesAdmin
    };
  }

  // Transform YTD metrics
  const ytdMetrics: YTDMetrics = {
    revenue: yearToDate?.revenue || 0,
    cogs: yearToDate?.cogs || 0,
    grossProfit: yearToDate?.grossProfit || 0,
    grossMargin: yearToDate?.grossMargin || 0,
    operatingExpenses: yearToDate?.operatingExpenses || 0,
    operatingIncome: yearToDate?.operatingIncome || 0,
    operatingMargin: yearToDate?.operatingMargin || 0,
    earningsBeforeTax: yearToDate?.earningsBeforeTax || 0,
    earningsBeforeTaxMargin: yearToDate?.earningsBeforeTaxMargin || 0,
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

  // Transform historical periods from chartData or trends
  let periods: Period[] = [];
  
  if (chartData && Array.isArray(chartData)) {
    // Use chartData if available (from API)
    periods = chartData
      .filter((item: any) => {
        // Validate period data
        if (!item.month || !item.year || item.month === 'undefined' || item.month === 'Unknown') {
          console.warn('❌ Filtering out invalid period data:', {
            month: item.month,
            year: item.year,
            revenue: item.revenue,
            id: item.id
          });
          return false;
        }
        
        // Skip periods with no data
        if (!item.revenue && !item.cogs && !item.operatingExpenses) {
          return false;
        }
        
        // Enhanced year parsing with fallback
        let year = item.year;
        if (typeof year === 'string') {
          year = parseInt(year, 10);
        }
        
        // Skip future periods
        const monthIndex = getMonthIndexFromName(item.month);
        if (monthIndex === -1 || isNaN(year)) {
          console.warn('Invalid month name or year:', { 
            month: item.month, 
            year: item.year, 
            parsedYear: year,
            monthIndex 
          });
          return false;
        }
        
        const periodDate = new Date(year, monthIndex);
        const currentDate = new Date();
        if (periodDate > currentDate) {
          return false;
        }
        
        return true;
      })
      .map((item: any) => {
        let monthName = item.month;
        let year = item.year;
        
        // Handle cases where month might be in "Month Year" format
        if (monthName && monthName.includes(' ')) {
          const parts = monthName.split(' ');
          monthName = parts[0];
          if (parts[1] && !year) {
            year = parseInt(parts[1], 10);
          }
        }
        
        // Ensure year is a number
        if (typeof year === 'string') {
          year = parseInt(year, 10);
        }
        
        const periodId = item.id || `${year}-${getMonthIndex(monthName)}`;
        
        return {
          id: periodId,
          month: monthName,
          year: year,
          revenue: item.revenue || 0,
          cogs: item.cogs || 0,
          grossProfit: item.grossProfit || 0,
          grossMargin: item.grossMargin || 0,
          operatingExpenses: item.operatingExpenses || 0,
          operatingIncome: item.operatingIncome || 0,
          operatingMargin: item.operatingMargin || 0,
          earningsBeforeTax: item.earningsBeforeTax || 0,
          earningsBeforeTaxMargin: item.earningsBeforeTaxMargin || 0,
          taxes: item.taxes || 0,
          netIncome: item.netIncome || 0,
          netMargin: item.netMargin || 0,
          ebitda: item.ebitda || 0,
          ebitdaMargin: item.ebitdaMargin || 0,
          // Personnel costs
          totalPersonnelCost: item.totalPersonnelCost,
          personnelSalariesCoR: item.personnelSalariesCoR,
          payrollTaxesCoR: item.payrollTaxesCoR,
          personnelSalariesOp: item.personnelSalariesOp,
          payrollTaxesOp: item.payrollTaxesOp,
          healthCoverage: item.healthCoverage,
          personnelBenefits: item.personnelBenefits,
          // Contract services
          contractServicesCoR: item.contractServicesCoR,
          contractServicesOp: item.contractServicesOp,
          professionalServices: item.professionalServices,
          salesMarketing: item.salesMarketing,
          facilitiesAdmin: item.facilitiesAdmin
        };
      });
  } else if (trends?.revenue) {
    // Fallback to trends if chartData is not available
    periods = trends.revenue.map((item: any, index: number) => ({
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
    }));
  }

  // Add current and previous periods to the list if not already included
  // Use month+year matching instead of ID matching for more reliable duplicate detection
  const currentPeriodExists = periods.find(p => 
    p.month === currentPeriod.month && p.year === currentPeriod.year
  );
  if (!currentPeriodExists) {
    periods.push(currentPeriod);
  }
  
  if (previousPeriod) {
    const previousPeriodExists = periods.find(p => 
      p.month === previousPeriod.month && p.year === previousPeriod.year
    );
    if (!previousPeriodExists) {
      periods.push(previousPeriod);
    }
  }

  // Final deduplication: Remove any remaining duplicates based on month+year
  const uniquePeriods = new Map<string, any>();
  periods.forEach(period => {
    // Skip invalid periods
    if (!period.month || period.month === 'undefined' || period.month === 'Unknown' || 
        !period.year || isNaN(period.year)) {
      console.warn('Skipping invalid period in transformer:', period);
      return;
    }
    
    const key = `${period.month}-${period.year}`;
    if (!uniquePeriods.has(key)) {
      uniquePeriods.set(key, period);
    } else {
      console.warn('Removing duplicate period in frontend transformer:', period.month, period.year);
    }
  });
  
  const finalPeriods = Array.from(uniquePeriods.values()).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    const monthOrder = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const monthA = monthOrder.indexOf(a.month);
    const monthB = monthOrder.indexOf(b.month);
    return monthA - monthB;
  });

  console.log('Final periods after deduplication:', finalPeriods.map(p => `${p.month} ${p.year}`).join(', '));
  
  // Debug: Check for any undefined or invalid months
  finalPeriods.forEach((period, index) => {
    if (!period.month || period.month === 'undefined' || period.month === 'Unknown') {
      console.error(`❌ Invalid month found at index ${index}:`, period);
    }
    if (!period.year || isNaN(period.year)) {
      console.error(`❌ Invalid year found at index ${index}:`, period);
    }
  });

  // Generate forecasts based on trends
  const forecasts = generateForecasts(finalPeriods, currentPeriod);

  return {
    periods: finalPeriods,
    currentPeriod,
    previousPeriod,
    comparisonData,
    comparisonPeriod,
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

function getMonthIndex(monthName: string): string {
  const monthsEs = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const monthsEn = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const monthsEnFull = ['january', 'february', 'march', 'april', 'may', 'june', 
                        'july', 'august', 'september', 'october', 'november', 'december'];
  const monthsEsFull = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  
  const lowerMonth = monthName.toLowerCase().trim();
  
  // Try Spanish short
  let index = monthsEs.indexOf(lowerMonth);
  if (index !== -1) return String(index + 1).padStart(2, '0');
  
  // Try English short
  index = monthsEn.indexOf(lowerMonth);
  if (index !== -1) return String(index + 1).padStart(2, '0');
  
  // Try English full
  index = monthsEnFull.indexOf(lowerMonth);
  if (index !== -1) return String(index + 1).padStart(2, '0');
  
  // Try Spanish full
  index = monthsEsFull.indexOf(lowerMonth);
  if (index !== -1) return String(index + 1).padStart(2, '0');
  
  // Try partial matches for truncated names
  for (let i = 0; i < monthsEn.length; i++) {
    if (monthsEn[i].startsWith(lowerMonth) || lowerMonth.startsWith(monthsEn[i])) {
      return String(i + 1).padStart(2, '0');
    }
  }
  
  for (let i = 0; i < monthsEs.length; i++) {
    if (monthsEs[i].startsWith(lowerMonth) || lowerMonth.startsWith(monthsEs[i])) {
      return String(i + 1).padStart(2, '0');
    }
  }
  
  return '01'; // Default to January if not found
}

function getMonthIndexFromName(monthName: string): number {
  const monthsEs = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const monthsEn = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const monthsEnFull = ['january', 'february', 'march', 'april', 'may', 'june', 
                        'july', 'august', 'september', 'october', 'november', 'december'];
  const monthsEsFull = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  
  const lowerMonth = monthName.toLowerCase().trim();
  
  // Try Spanish short
  let index = monthsEs.indexOf(lowerMonth);
  if (index !== -1) return index;
  
  // Try English short
  index = monthsEn.indexOf(lowerMonth);
  if (index !== -1) return index;
  
  // Try English full
  index = monthsEnFull.indexOf(lowerMonth);
  if (index !== -1) return index;
  
  // Try Spanish full
  index = monthsEsFull.indexOf(lowerMonth);
  if (index !== -1) return index;
  
  // Try partial matches for truncated names
  for (let i = 0; i < monthsEn.length; i++) {
    if (monthsEn[i].startsWith(lowerMonth) || lowerMonth.startsWith(monthsEn[i])) {
      return i;
    }
  }
  
  for (let i = 0; i < monthsEs.length; i++) {
    if (monthsEs[i].startsWith(lowerMonth) || lowerMonth.startsWith(monthsEs[i])) {
      return i;
    }
  }
  
  return -1;
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

  // Month names in Spanish
  const monthNamesES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  
  // Get the last period with data (either current or last historical)
  const lastPeriod = currentPeriod || historicalPeriods[0];
  const lastMonthIndex = monthNamesES.findIndex(m => m.toLowerCase() === lastPeriod.month.toLowerCase());
  const lastYear = lastPeriod.year;
  
  // Generate next 6 months from the last period
  const months: string[] = [];
  let monthIndex = lastMonthIndex;
  let year = lastYear;
  
  for (let i = 0; i < 6; i++) {
    monthIndex++;
    if (monthIndex >= 12) {
      monthIndex = 0;
      year++;
    }
    months.push(monthNamesES[monthIndex]);
  }
  
  // Simple linear projection for demo
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