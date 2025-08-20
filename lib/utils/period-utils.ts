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

// ==========================================
// Configuration-based Period Metadata Utils
// ==========================================

export interface PeriodDefinition {
  type: 'month' | 'quarter' | 'year' | 'custom';
  year: number;
  month?: number;
  quarter?: number;
  customValue?: string;
  label: string;
}

export interface PeriodMetadata {
  [periodLabel: string]: {
    isActual: boolean;
    isProjected: boolean;
  };
}

export interface Configuration {
  type: 'cashflow' | 'pnl';
  structure: {
    lastActualPeriod?: PeriodDefinition;
    periodMapping?: Array<{
      column: string;
      period: PeriodDefinition;
    }>;
  };
}

/**
 * Extract the last actual period from a configuration
 */
export function getLastActualPeriod(configuration: Configuration): PeriodDefinition | null {
  return configuration.structure?.lastActualPeriod || null;
}

/**
 * Check if a period is actual based on period metadata
 */
export function isPeriodActual(periodLabel: string, periodMetadata: PeriodMetadata): boolean {
  return periodMetadata[periodLabel]?.isActual || false;
}

/**
 * Check if a period is projected based on period metadata
 */
export function isPeriodProjected(periodLabel: string, periodMetadata: PeriodMetadata): boolean {
  return periodMetadata[periodLabel]?.isProjected || false;
}

/**
 * Format a period definition into a human-readable label
 */
export function formatPeriodLabel(period: PeriodDefinition, locale: string = 'en'): string {
  if (period.label) {
    return period.label;
  }
  
  if (period.type === 'month' && period.month && period.year) {
    const monthNames = locale.startsWith('es') 
      ? ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
      : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    return `${monthNames[period.month - 1]} ${period.year}`;
  }
  
  if (period.type === 'quarter' && period.quarter && period.year) {
    const quarterLabel = locale.startsWith('es') ? 'T' : 'Q';
    return `${quarterLabel}${period.quarter} ${period.year}`;
  }
  
  if (period.type === 'year' && period.year) {
    return period.year.toString();
  }
  
  if (period.type === 'custom' && period.customValue) {
    return period.customValue;
  }
  
  return 'Unknown Period';
}

/**
 * Get appropriate default period based on configuration
 * Returns last actual period if available, otherwise current month
 */
export function getDefaultPeriod(configuration: Configuration | null, locale: string = 'en'): string {
  if (configuration) {
    const lastActualPeriod = getLastActualPeriod(configuration);
    if (lastActualPeriod) {
      return formatPeriodLabel(lastActualPeriod, locale);
    }
  }
  
  // Fallback to current month
  const currentDate = new Date();
  return currentDate.toLocaleDateString(locale.startsWith('es') ? 'es-MX' : 'en-US', { 
    month: 'long', 
    year: 'numeric' 
  });
}

/**
 * Generate a sortable key for period comparison
 * Format: YYYYMMDD (year + month/quarter as MM + day as 01)
 */
export function getPeriodSortKey(period: PeriodDefinition): number {
  const year = period.year || 0;
  let month = 1;
  
  if (period.type === 'month' && period.month) {
    month = period.month;
  } else if (period.type === 'quarter' && period.quarter) {
    month = (period.quarter - 1) * 3 + 1; // Q1=1, Q2=4, Q3=7, Q4=10
  } else if (period.type === 'year') {
    month = 12; // Year periods sort to end
  } else if (period.type === 'custom') {
    month = 6; // Custom periods sort to middle
  }
  
  return year * 10000 + month * 100 + 1;
}

/**
 * Find all actual periods from period metadata
 */
export function getActualPeriods(periodMetadata: PeriodMetadata): string[] {
  return Object.entries(periodMetadata)
    .filter(([_, meta]) => meta?.isActual)
    .map(([label]) => label);
}

/**
 * Find all projected periods from period metadata
 */
export function getProjectedPeriods(periodMetadata: PeriodMetadata): string[] {
  return Object.entries(periodMetadata)
    .filter(([_, meta]) => meta?.isProjected)
    .map(([label]) => label);
}

/**
 * Get the last actual period label from period metadata
 */
export function getLastActualPeriodLabel(periodMetadata: PeriodMetadata): string | null {
  const actualPeriods = getActualPeriods(periodMetadata);
  return actualPeriods.length > 0 ? actualPeriods[actualPeriods.length - 1] : null;
}

/**
 * Count actual and projected periods
 */
export function getPeriodCounts(periodMetadata: PeriodMetadata): { actual: number; projected: number; total: number } {
  const actualCount = getActualPeriods(periodMetadata).length;
  const projectedCount = getProjectedPeriods(periodMetadata).length;
  
  return {
    actual: actualCount,
    projected: projectedCount,
    total: actualCount + projectedCount
  };
}

/**
 * Create a helper function that can be passed to components for checking if a period is actual
 */
export function createIsPeriodActualFunction(periodMetadata: PeriodMetadata) {
  return (periodLabel: string): boolean => isPeriodActual(periodLabel, periodMetadata);
}

/**
 * Create a helper function that can be passed to components for checking if a period is projected
 */
export function createIsPeriodProjectedFunction(periodMetadata: PeriodMetadata) {
  return (periodLabel: string): boolean => isPeriodProjected(periodLabel, periodMetadata);
}