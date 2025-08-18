/**
 * Financial Formatting Utilities
 * CRITICAL: All financial values must be accurate to the cent
 */

export function formatCurrency(
  value: number | undefined | null,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '-';
  }

  // Map currency to locale if needed
  const localeMap: { [key: string]: string } = {
    'USD': 'en-US',
    'EUR': 'de-DE',
    'GBP': 'en-GB',
    'MXN': 'es-MX',
    'BRL': 'pt-BR',
    'ARS': 'es-AR',
    'CLP': 'es-CL',
    'COP': 'es-CO'
  };

  const formatLocale = localeMap[currency] || locale;

  try {
    return new Intl.NumberFormat(formatLocale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  } catch (error) {
    // Fallback formatting
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function formatNumber(
  value: number | undefined | null,
  decimals: number = 2
): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '-';
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

export function formatPercentage(
  value: number | undefined | null,
  decimals: number = 1
): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '-';
  }

  return `${value.toFixed(decimals)}%`;
}

export function formatCompactNumber(
  value: number | undefined | null,
  currency?: string
): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '-';
  }

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  let formatted: string;
  
  if (absValue >= 1e9) {
    formatted = `${(absValue / 1e9).toFixed(1)}B`;
  } else if (absValue >= 1e6) {
    formatted = `${(absValue / 1e6).toFixed(1)}M`;
  } else if (absValue >= 1e3) {
    formatted = `${(absValue / 1e3).toFixed(1)}K`;
  } else {
    formatted = absValue.toFixed(0);
  }
  
  const result = sign + formatted;
  return currency ? `${currency} ${result}` : result;
}

export function parseNumberFromString(str: string): number | null {
  if (!str) return null;
  
  // Remove currency symbols and commas
  const cleaned = str.replace(/[$,€£¥₹]/g, '').trim();
  
  // Parse the number
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? null : parsed;
}

// Format with units (normal, thousands, millions)
export function formatWithUnits(
  value: number | undefined | null,
  units: 'normal' | 'thousands' | 'millions' = 'normal',
  decimals: number = 2
): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '-';
  }

  let adjustedValue = value;
  let suffix = '';

  switch (units) {
    case 'thousands':
      adjustedValue = value / 1000;
      suffix = 'K';
      break;
    case 'millions':
      adjustedValue = value / 1000000;
      suffix = 'M';
      break;
  }

  return formatNumber(adjustedValue, decimals) + suffix;
}

// Ensure number is accurate to the cent
export function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}

// Validate if a value is a valid financial number
export function isValidFinancialNumber(value: any): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value !== 'number') return false;
  if (isNaN(value) || !isFinite(value)) return false;
  return true;
}

// Format date for financial periods
export function formatPeriod(
  periodStart: Date | string,
  periodEnd?: Date | string,
  format: 'short' | 'long' = 'short'
): string {
  const start = typeof periodStart === 'string' ? new Date(periodStart) : periodStart;
  const end = periodEnd ? (typeof periodEnd === 'string' ? new Date(periodEnd) : periodEnd) : null;
  
  if (format === 'short') {
    const monthYear = start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    return monthYear;
  } else {
    const startStr = start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (end) {
      const endStr = end.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      return `${startStr} - ${endStr}`;
    }
    return startStr;
  }
}

// Compare two values and return the difference
export function calculateDifference(
  current: number,
  previous: number
): {
  absolute: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
} {
  const absolute = roundToCents(current - previous);
  const percentage = previous !== 0 ? roundToCents((absolute / previous) * 100) : 0;
  
  let trend: 'up' | 'down' | 'stable';
  if (Math.abs(absolute) < 0.01) {
    trend = 'stable';
  } else if (absolute > 0) {
    trend = 'up';
  } else {
    trend = 'down';
  }
  
  return { absolute, percentage, trend };
}