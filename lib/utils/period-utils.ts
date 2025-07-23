export interface PeriodData {
  id: string;
  month: string;
  year: number;
  revenue?: number;
  [key: string]: any;
}

export interface ValidatedPeriod extends PeriodData {
  isValid: boolean;
  errors?: string[];
}

/**
 * Validates a single period entry
 */
export function validatePeriod(period: any): ValidatedPeriod {
  const errors: string[] = [];
  
  // Check required fields
  if (!period.month || period.month === 'undefined' || period.month === 'null') {
    errors.push('Invalid or missing month');
  }
  
  if (!period.year || isNaN(parseInt(period.year))) {
    errors.push('Invalid or missing year');
  }
  
  // Check if it's a future period
  if (period.month && period.year) {
    const monthIndex = getMonthIndex(period.month);
    if (monthIndex >= 0) {
      const periodDate = new Date(period.year, monthIndex);
      const currentDate = new Date();
      if (periodDate > currentDate) {
        errors.push('Period is in the future');
      }
    } else {
      errors.push('Unrecognized month name');
    }
  }
  
  // Check for valid year range
  const year = parseInt(period.year);
  if (!isNaN(year) && (year < 2000 || year > 2100)) {
    errors.push('Year is outside valid range (2000-2100)');
  }
  
  return {
    ...period,
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Filters and deduplicates an array of periods
 */
export function filterValidPeriods(periods: any[]): PeriodData[] {
  const validPeriods = new Map<string, PeriodData>();
  
  periods.forEach(period => {
    const validated = validatePeriod(period);
    
    // Skip invalid periods
    if (!validated.isValid) {
      console.warn(`Invalid period:`, period, validated.errors);
      return;
    }
    
    // Skip periods with no data
    if (period.revenue <= 0 && !period.cogs && !period.operatingExpenses) {
      return;
    }
    
    // Create unique key
    const key = `${period.year}-${period.month}`;
    
    // Keep the period with highest revenue if duplicate
    if (!validPeriods.has(key) || period.revenue > (validPeriods.get(key)?.revenue || 0)) {
      validPeriods.set(key, {
        id: period.id || key,
        month: period.month,
        year: parseInt(period.year),
        ...period
      });
    }
  });
  
  return Array.from(validPeriods.values());
}

/**
 * Sorts periods by date (newest first)
 */
export function sortPeriods(periods: PeriodData[]): PeriodData[] {
  const monthOrderEs = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const monthOrderEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  return [...periods].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    
    let monthA = monthOrderEs.indexOf(a.month);
    let monthB = monthOrderEs.indexOf(b.month);
    
    if (monthA === -1) monthA = monthOrderEn.indexOf(a.month);
    if (monthB === -1) monthB = monthOrderEn.indexOf(b.month);
    
    return monthB - monthA;
  });
}

/**
 * Gets the month index (0-11) from a month name in Spanish or English
 */
function getMonthIndex(monthName: string): number {
  const monthsEs = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const monthsEn = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  
  const lowerMonth = monthName.toLowerCase();
  let index = monthsEs.indexOf(lowerMonth);
  if (index === -1) {
    index = monthsEn.indexOf(lowerMonth);
  }
  
  return index;
}

/**
 * Formats a period for display
 */
export function formatPeriodDisplay(period: PeriodData, locale: string = 'es-MX'): string {
  return `${period.month} ${period.year}`;
}

/**
 * Creates a period ID from month and year
 */
export function createPeriodId(month: string, year: number): string {
  const monthIndex = getMonthIndex(month);
  if (monthIndex === -1) return `${year}-01`;
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
}