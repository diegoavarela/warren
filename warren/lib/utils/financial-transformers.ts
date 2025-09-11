import { Period, PnLData, YTDMetrics } from '@/types/financial';

// Transform configuration-based API data to P&L Dashboard format
function transformConfigurationBasedData(apiData: any): PnLData | null {
  
  if (!apiData?.data) {
    return null;
  }
  
  const { periods, dataRows, categories, rawExcelData, processedData, worksheet, periodMapping } = apiData.data;
  
  // DEBUG: Check COGS categories specifically
  if (categories?.cogs) {
    Object.entries(categories.cogs).forEach(([categoryName, categoryData]: [string, any]) => {
    });
  }
  
  // Debug dataRows structure in detail
  if (dataRows) {
    Object.keys(dataRows).forEach(key => {
    });
  }
  
  // Helper function to ensure numeric values (define early)
  const toNumber = (value: any): number => {
    // Handle configuration-based format: {label, values, total}
    if (value && typeof value === 'object' && 'total' in value) {
      return typeof value.total === 'number' ? value.total : 0;
    }
    
    if (typeof value === 'number') return isNaN(value) ? 0 : value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };
  
  // Helper function to get value for a period (define early)
  const getValueForPeriod = (fieldData: any, periodIndex: number): number => {
    if (fieldData && fieldData.values && Array.isArray(fieldData.values)) {
      const periodValue = fieldData.values[periodIndex];
      return toNumber(periodValue);
    }
    return toNumber(fieldData);
  };

  // Extract and transform categories into expected array format
  const transformCategories = (categoryObj: any): any[] => {
    if (!categoryObj) return [];
    
    return Object.entries(categoryObj).map(([categoryName, categoryData]: [string, any]) => {
      // For now, return basic structure - actual values will be handled by dashboard
      return {
        category: categoryName,
        label: categoryData.label?.en || categoryName,
        amount: 0, // Dashboard will calculate from period data
        percentage: 0, // Dashboard will calculate
        color: "bg-purple-600"
      };
    });
  };

  // Read COGS categories directly from Excel processed data
  const transformCOGSCategories = (processedCogsData: any, currentPeriodIndex: number): any[] => {
    if (!processedCogsData) return [];
    
    // Get total COGS for percentage calculation
    const totalCOGS = dataRows?.cogs ? Math.abs(getValueForPeriod(dataRows.cogs, currentPeriodIndex)) : 0;
    
    const cogsCategories = Object.entries(processedCogsData)
      .map(([categoryName, categoryData]: [string, any]) => {
        
        let categoryAmount = 0;
        let rawValue: any = null;
        
        // The Excel service has already processed this category and provided the values array
        if (categoryData.values && Array.isArray(categoryData.values)) {
          if (currentPeriodIndex >= 0 && currentPeriodIndex < categoryData.values.length) {
            rawValue = categoryData.values[currentPeriodIndex];
            categoryAmount = Math.abs(Number(rawValue) || 0);
          } else {
          }
        } else {
        }
        
        // Calculate percentage of total COGS
        const percentage = totalCOGS > 0 ? (categoryAmount / totalCOGS) * 100 : 0;
        
        return {
          category: categoryName,
          label: categoryData.label || categoryName,
          amount: categoryAmount,
          percentage: Math.round(percentage * 100) / 100,
          color: "bg-orange-500",
          rawValue: rawValue // Keep raw value for filtering decision
        };
      })
      .filter(category => {
        // Filter out invalid/zero categories
        const isValid = category.amount > 0 && 
                       !isNaN(category.amount) && 
                       isFinite(category.amount) &&
                       category.rawValue !== null &&
                       category.rawValue !== undefined &&
                       category.rawValue !== '';
        
        if (!isValid) {
        }
        return isValid;
      })
      .map(category => {
        // Remove rawValue from final output
        const { rawValue, ...cleanCategory } = category;
        return cleanCategory;
      });
    return cogsCategories;
  };

  // Transform Operating Expenses with real Excel data
  const transformOpexCategories = (processedOpexData: any, currentPeriodIndex: number): any[] => {
    if (!processedOpexData) return [];
    
    // Get total OPEX for percentage calculation
    const totalOpex = dataRows?.totalOpex ? Math.abs(getValueForPeriod(dataRows.totalOpex, currentPeriodIndex)) : 0;
    
    const opexCategories = Object.entries(processedOpexData)
      .map(([categoryName, categoryData]: [string, any]) => {
        
        let categoryAmount = 0;
        let rawValue: any = null;
        
        // The Excel service has already processed this category and provided the values array
        if (categoryData.values && Array.isArray(categoryData.values)) {
          if (currentPeriodIndex >= 0 && currentPeriodIndex < categoryData.values.length) {
            rawValue = categoryData.values[currentPeriodIndex];
            categoryAmount = Math.abs(Number(rawValue) || 0);
          } else {
          }
        } else {
        }
        
        // Calculate percentage of total OPEX
        const percentage = totalOpex > 0 ? (categoryAmount / totalOpex) * 100 : 0;
        
        return {
          category: categoryName,
          label: categoryData.label || categoryName,
          amount: categoryAmount,
          percentage: Math.round(percentage * 100) / 100,
          color: "bg-purple-600",
          rawValue: rawValue // Keep raw value for filtering decision
        };
      })
      .filter(category => {
        // Filter out invalid/zero categories
        const isValid = category.amount > 0 && 
                       !isNaN(category.amount) && 
                       isFinite(category.amount) &&
                       category.rawValue !== null &&
                       category.rawValue !== undefined &&
                       category.rawValue !== '';
        
        if (!isValid) {
        }
        return isValid;
      })
      .map(category => {
        // Remove rawValue from final output
        const { rawValue, ...cleanCategory } = category;
        return cleanCategory;
      });
    return opexCategories;
  };

  // Transform Tax categories with real Excel data
  const transformTaxCategories = (processedTaxData: any, currentPeriodIndex: number): any[] => {
    if (!processedTaxData) return [];
    
    // Calculate total taxes by summing all tax categories for this period
    let totalTaxes = 0;
    
    let taxCategories = Object.entries(processedTaxData)
      .map(([categoryName, categoryData]: [string, any]) => {
        
        let categoryAmount = 0;
        let rawValue: any = null;
        
        // The Excel service has already processed this category and provided the values array
        if (categoryData.values && Array.isArray(categoryData.values)) {
          if (currentPeriodIndex >= 0 && currentPeriodIndex < categoryData.values.length) {
            rawValue = categoryData.values[currentPeriodIndex];
            categoryAmount = Math.abs(Number(rawValue) || 0);
          } else {
          }
        } else {
        }
        
        // Add to total taxes
        totalTaxes += categoryAmount;
        
        // Percentage will be calculated after we have the total
        const percentage = 0; // Will be recalculated later
        
        return {
          category: categoryName,
          label: categoryData.label || categoryName,
          amount: categoryAmount,
          percentage: Math.round(percentage * 100) / 100,
          color: "bg-amber-500",
          rawValue: rawValue // Keep raw value for filtering decision
        };
      })
      .filter(category => {
        // Filter out invalid/zero categories
        const isValid = category.amount > 0 && 
                       !isNaN(category.amount) && 
                       isFinite(category.amount) &&
                       category.rawValue !== null &&
                       category.rawValue !== undefined &&
                       category.rawValue !== '';
        
        if (!isValid) {
        }
        return isValid;
      })
      .map(category => {
        // Remove rawValue from final output
        const { rawValue, ...cleanCategory } = category;
        return cleanCategory;
      });
    
    // Recalculate percentages based on filtered total
    const filteredTotal = taxCategories.reduce((sum, cat) => sum + cat.amount, 0);
    taxCategories = taxCategories.map(cat => ({
      ...cat,
      percentage: filteredTotal > 0 ? Math.round((cat.amount / filteredTotal) * 10000) / 100 : 0
    }));
    return taxCategories;
  };

  const revenueCategories = transformCategories(categories?.revenue);
  const opexCategories = transformCategories(categories?.opex);
  // Note: taxCategories will be transformed after currentPeriodIndex is defined
  
  if (!periods || !Array.isArray(periods) || periods.length === 0) {
    return null;
  }

  // Helper function to translate Spanish month names to English
  const translateMonth = (spanishMonth: string): string => {
    const monthMap: Record<string, string> = {
      'Ene': 'Jan',
      'Feb': 'Feb', 
      'Mar': 'Mar',
      'Abr': 'Apr',
      'May': 'May',
      'Jun': 'Jun',
      'Jul': 'Jul',
      'Ago': 'Aug',
      'Sep': 'Sep',
      'Oct': 'Oct',
      'Nov': 'Nov',
      'Dic': 'Dec'
    };
    
    // Extract Spanish month name from "Ene 2025" format
    const parts = spanishMonth.trim().split(' ');
    const spanishMonthName = parts[0];
    
    // Only return the English month name, not the full date
    const englishMonth = monthMap[spanishMonthName] || spanishMonthName;
    return englishMonth;
  };

  // Create periods array with proper structure
  const transformedPeriods: Period[] = periods.map((periodName: string, index: number) => {
    
    // getValueForPeriod is now defined at the top of the function
    
    const revenue = getValueForPeriod(dataRows?.totalRevenue, index);
    const cogs = Math.abs(getValueForPeriod(dataRows?.cogs, index));
    const grossProfit = getValueForPeriod(dataRows?.grossProfit, index);
    const operatingExpenses = Math.abs(getValueForPeriod(dataRows?.totalOpex, index));
    const netIncome = getValueForPeriod(dataRows?.netIncome, index);
    // Calculate taxes as sum of ALL tax categories for this period
    let taxes = 0;
    if (categories?.taxes) {
      Object.values(categories.taxes).forEach((taxCategory: any) => {
        if (taxCategory.values && Array.isArray(taxCategory.values) && taxCategory.values[index] !== undefined) {
          const taxValue = Math.abs(Number(taxCategory.values[index]) || 0);
          taxes += taxValue;
        }
      });
    }
    
    if (index === 0) {
    }
    const ebitda = getValueForPeriod(dataRows?.ebitda, index);
    const earningsBeforeTaxes = getValueForPeriod(dataRows?.earningsBeforeTaxes, index);
    const grossMarginFromData = getValueForPeriod(dataRows?.grossMargin, index);
    const ebitdaMarginFromData = getValueForPeriod(dataRows?.ebitdaMargin, index);
    
    // Calculate missing values per mapping document
    const operatingIncome = grossProfit - operatingExpenses; // UTILIDAD OPERACIONAL = gross profit - opex
    const cogsPercentage = revenue > 0 ? ((cogs / revenue) * 100) : 0; // % COGS OF REVENUE
    const opexPercentage = revenue > 0 ? ((operatingExpenses / revenue) * 100) : 0; // % OPEX OF REVENUE
    const netMargin = revenue > 0 ? ((netIncome / revenue) * 100) : 0; // Monthly Net Margin Performance
    
    // Use data margins if available, otherwise calculate
    // If grossMarginFromData exists but seems to be in decimal format (0.6 instead of 60), convert it
    let calculatedGrossMargin = revenue > 0 ? ((grossProfit / revenue) * 100) : 0;
    const grossMargin = grossMarginFromData > 0 ? 
      (grossMarginFromData < 1 ? grossMarginFromData * 100 : grossMarginFromData) : 
      calculatedGrossMargin;
    const ebitdaMargin = ebitdaMarginFromData > 0 ? ebitdaMarginFromData : (revenue > 0 ? ((ebitda / revenue) * 100) : 0);
    const operatingMargin = revenue > 0 ? ((operatingIncome / revenue) * 100) : 0;
    const earningsBeforeTax = earningsBeforeTaxes > 0 ? earningsBeforeTaxes : (netIncome + taxes);
    const earningsBeforeTaxMargin = revenue > 0 ? ((earningsBeforeTax / revenue) * 100) : 0;
    
    // Extract year from period name "Ene 2025" -> 2025
    const parts = periodName.trim().split(' ');
    const year = parts[1] ? parseInt(parts[1], 10) : 2025;
    
    return {
      id: `period-${index}`,
      month: translateMonth(periodName),
      year: year,
      revenue,
      cogs,
      grossProfit,
      grossMargin,
      operatingExpenses,
      operatingIncome,
      operatingMargin,
      earningsBeforeTax,
      earningsBeforeTaxMargin,
      taxes,
      netIncome,
      netMargin,
      ebitda,
      ebitdaMargin,
      // Additional calculated fields per mapping
      cogsPercentage,
      opexPercentage
    };
  });
  
  // Find the last period with actual data (revenue > 0) as current period
  let currentPeriod = transformedPeriods[0]; // fallback to first
  let previousPeriod: Period | undefined = undefined;
  transformedPeriods.forEach((period, i) => {
    const hasData = period.revenue > 0 || period.cogs > 0 || period.operatingExpenses > 0;
  });
  
  // Find last period with data
  for (let i = transformedPeriods.length - 1; i >= 0; i--) {
    if (transformedPeriods[i].revenue > 0 || transformedPeriods[i].cogs > 0 || transformedPeriods[i].operatingExpenses > 0) {
      currentPeriod = transformedPeriods[i];
      // Previous period is the one before current (if exists)
      if (i > 0) {
        previousPeriod = transformedPeriods[i - 1];
      }
      break;
    }
  }
  
  // Create YTD metrics - Sum all periods from beginning to current period
  // For YTD, we sum up values from all periods up to current period index
  const currentPeriodIndex = transformedPeriods.findIndex(p => p === currentPeriod);
  
  // Transform COGS categories with real Excel data using current period
  // If no COGS categories are configured, create a default one from total COGS
  let cogsCategories = transformCOGSCategories(categories?.cogs, currentPeriodIndex);
  
  // Transform Operating Expenses with real Excel data using current period
  let operatingExpenses = transformOpexCategories(categories?.opex, currentPeriodIndex);
  
  // Transform Tax categories with real Excel data using current period
  let taxCategories = transformTaxCategories(categories?.taxes, currentPeriodIndex);
  
  // Fallback: If no configured COGS categories and we have COGS data, create a default category
  if ((!categories?.cogs || Object.keys(categories.cogs).length === 0) && dataRows?.cogs) {
    const totalCOGS = Math.abs(getValueForPeriod(dataRows.cogs, currentPeriodIndex));
    
    if (totalCOGS > 0) {
      cogsCategories = [{
        category: 'totalCogs',
        label: 'Total Cost of Goods Sold',
        amount: totalCOGS,
        percentage: 100,
        color: "bg-orange-500"
      }];
    }
  }
  
  // Log all transformed categories now that cogsCategories is available
  
  const ytdPeriods = transformedPeriods.slice(0, currentPeriodIndex + 1);
  
  const ytdRevenue = ytdPeriods.reduce((sum, p) => sum + p.revenue, 0);
  const ytdCogs = ytdPeriods.reduce((sum, p) => sum + p.cogs, 0);
  const ytdGrossProfit = ytdPeriods.reduce((sum, p) => sum + p.grossProfit, 0);
  const ytdOperatingExpenses = ytdPeriods.reduce((sum, p) => sum + p.operatingExpenses, 0);
  const ytdNetIncome = ytdPeriods.reduce((sum, p) => sum + p.netIncome, 0);
  const ytdTaxes = ytdPeriods.reduce((sum, p) => sum + p.taxes, 0);
  const ytdEbitda = ytdPeriods.reduce((sum, p) => sum + p.ebitda, 0);
  const ytdOperatingIncome = ytdGrossProfit - ytdOperatingExpenses;
  
  // For totalOutcome (YTD EXPENSES), sum all periods from beginning to current
  const ytdExpenses = ytdPeriods.reduce((sum, p) => {
    // totalOutcome = cogs + operatingExpenses + taxes
    const periodTotalOutcome = p.cogs + p.operatingExpenses + p.taxes;
    return sum + periodTotalOutcome;
  }, 0);
  
  const yearToDate: YTDMetrics = {
    revenue: ytdRevenue,
    cogs: ytdCogs,
    grossProfit: ytdGrossProfit,
    grossMargin: ytdRevenue > 0 ? ((ytdGrossProfit / ytdRevenue) * 100) : 0,
    operatingExpenses: ytdOperatingExpenses,
    operatingIncome: ytdOperatingIncome,
    operatingMargin: ytdRevenue > 0 ? ((ytdOperatingIncome / ytdRevenue) * 100) : 0,
    earningsBeforeTax: ytdNetIncome + ytdTaxes,
    earningsBeforeTaxMargin: ytdRevenue > 0 ? (((ytdNetIncome + ytdTaxes) / ytdRevenue) * 100) : 0,
    taxes: ytdTaxes,
    netIncome: ytdNetIncome,
    netMargin: ytdRevenue > 0 ? ((ytdNetIncome / ytdRevenue) * 100) : 0,
    ebitda: ytdEbitda,
    ebitdaMargin: ytdRevenue > 0 ? ((ytdEbitda / ytdRevenue) * 100) : 0,
    monthsIncluded: ytdPeriods.length
  };
  
  return {
    periods: transformedPeriods,
    currentPeriod,
    previousPeriod,
    yearToDate,
    categories: {
      revenue: revenueCategories,
      cogs: cogsCategories,
      operatingExpenses: operatingExpenses,
      taxes: taxCategories
    }
  };
}

// Transform API response to P&L Dashboard format
export function transformToPnLData(apiData: any): PnLData | null {
  
  if (!apiData) return null;

  // Handle new configuration-based API format
  if (apiData.data && apiData.data.periods && apiData.data.dataRows) {
    return transformConfigurationBasedData(apiData);
  }

  // Handle legacy format
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
      return;
    }
    
    const key = `${period.month}-${period.year}`;
    if (!uniquePeriods.has(key)) {
      uniquePeriods.set(key, period);
    } else {
    }
  });
  
  const finalPeriods = Array.from(uniquePeriods.values()).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    const monthOrder = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const monthA = monthOrder.indexOf(a.month);
    const monthB = monthOrder.indexOf(b.month);
    return monthA - monthB;
  });
  
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