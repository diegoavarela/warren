/**
 * Period Validation Service
 * 
 * Validates periods to prevent future dates and duplicates
 */

import { DetectedPeriod } from './period-detection';

export interface PeriodValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  validPeriods: DetectedPeriod[];
  invalidPeriods: DetectedPeriod[];
}

export interface ExistingPeriod {
  periodEnd: string;
  createdAt: Date;
  updatedAt: Date;
  id: string;
}

/**
 * Validate periods against current date and existing periods
 */
export function validatePeriods(
  periods: DetectedPeriod[],
  existingPeriods: ExistingPeriod[] = [],
  currentDate: Date = new Date()
): PeriodValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const validPeriods: DetectedPeriod[] = [];
  const invalidPeriods: DetectedPeriod[] = [];

  // Get current month/year for comparison
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const currentDay = currentDate.getDate();

  // Create a map of existing periods for quick lookup
  const existingPeriodMap = new Map<string, ExistingPeriod>();
  existingPeriods.forEach(period => {
    const key = formatPeriodKey(period.periodEnd);
    existingPeriodMap.set(key, period);
  });

  // Track seen periods in current upload to detect duplicates within the same file
  const seenPeriods = new Set<string>();

  for (const period of periods) {
    const periodErrors: string[] = [];
    const periodWarnings: string[] = [];
    
    // Skip periods without valid dates
    if (!period.parsedDate) {
      periodWarnings.push(`Period "${period.label}" could not be parsed to a valid date`);
      invalidPeriods.push(period);
      continue;
    }

    const periodYear = period.parsedDate.getFullYear();
    const periodMonth = period.parsedDate.getMonth();
    const periodKey = formatPeriodKey(period.parsedDate);

    // Check for future dates
    if (periodYear > currentYear || 
        (periodYear === currentYear && periodMonth > currentMonth) ||
        (periodYear === currentYear && periodMonth === currentMonth && currentDay < 25)) {
      periodErrors.push(`Period "${period.label}" is in the future (${formatPeriodDisplay(period.parsedDate)})`);
    }

    // Check for very old dates (more than 10 years ago)
    if (periodYear < currentYear - 10) {
      periodWarnings.push(`Period "${period.label}" is very old (${formatPeriodDisplay(period.parsedDate)})`);
    }

    // Check for duplicates within the same upload
    if (seenPeriods.has(periodKey)) {
      periodErrors.push(`Duplicate period "${period.label}" found in upload`);
    } else {
      seenPeriods.add(periodKey);
    }

    // Check for existing periods in database
    const existingPeriod = existingPeriodMap.get(periodKey);
    if (existingPeriod) {
      const timeSinceLastUpload = Math.abs(currentDate.getTime() - existingPeriod.updatedAt.getTime());
      const daysSinceLastUpload = timeSinceLastUpload / (1000 * 60 * 60 * 24);
      
      if (daysSinceLastUpload < 1) {
        periodWarnings.push(`Period "${period.label}" was recently uploaded (${formatRelativeTime(existingPeriod.updatedAt)})`);
      } else {
        periodWarnings.push(`Period "${period.label}" already exists (last updated: ${formatRelativeTime(existingPeriod.updatedAt)})`);
      }
    }

    // Check for missing data
    if (!period.hasData || period.dataPoints === 0) {
      periodWarnings.push(`Period "${period.label}" appears to have no data`);
    }

    // Consolidate errors and warnings
    if (periodErrors.length > 0) {
      errors.push(...periodErrors);
      invalidPeriods.push(period);
    } else {
      if (periodWarnings.length > 0) {
        warnings.push(...periodWarnings);
      }
      validPeriods.push(period);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    validPeriods,
    invalidPeriods
  };
}

/**
 * Format a date or period string into a consistent key for comparison
 */
function formatPeriodKey(dateOrString: Date | string): string {
  let date: Date;
  
  if (typeof dateOrString === 'string') {
    date = new Date(dateOrString);
  } else {
    date = dateOrString;
  }
  
  if (isNaN(date.getTime())) {
    return dateOrString.toString();
  }
  
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Format a date for display
 */
function formatPeriodDisplay(date: Date): string {
  return date.toLocaleDateString('es-MX', { 
    year: 'numeric', 
    month: 'long' 
  });
}

/**
 * Format relative time from a date
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 60) {
    return `${minutes} minutos`;
  } else if (hours < 24) {
    return `${hours} horas`;
  } else if (days < 30) {
    return `${days} días`;
  } else {
    return date.toLocaleDateString('es-MX');
  }
}

/**
 * Get validation status for a period
 */
export function getPeriodValidationStatus(
  period: DetectedPeriod,
  existingPeriods: ExistingPeriod[] = [],
  currentDate: Date = new Date()
): {
  status: 'valid' | 'warning' | 'error';
  message: string;
  canUpload: boolean;
} {
  if (!period.parsedDate) {
    return {
      status: 'error',
      message: 'Fecha inválida',
      canUpload: false
    };
  }

  const periodYear = period.parsedDate.getFullYear();
  const periodMonth = period.parsedDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Check for future dates
  if (periodYear > currentYear || 
      (periodYear === currentYear && periodMonth > currentMonth)) {
    return {
      status: 'error',
      message: 'Fecha futura no permitida',
      canUpload: false
    };
  }

  // Check for existing periods
  const periodKey = formatPeriodKey(period.parsedDate);
  const existingPeriod = existingPeriods.find(p => formatPeriodKey(p.periodEnd) === periodKey);
  
  if (existingPeriod) {
    const timeSinceLastUpload = Math.abs(currentDate.getTime() - existingPeriod.updatedAt.getTime());
    const daysSinceLastUpload = timeSinceLastUpload / (1000 * 60 * 60 * 24);
    
    if (daysSinceLastUpload < 1) {
      return {
        status: 'warning',
        message: 'Subido recientemente',
        canUpload: true
      };
    } else {
      return {
        status: 'warning',
        message: 'Ya existe',
        canUpload: true
      };
    }
  }

  // Check for missing data
  if (!period.hasData || period.dataPoints === 0) {
    return {
      status: 'warning',
      message: 'Sin datos',
      canUpload: true
    };
  }

  return {
    status: 'valid',
    message: 'Válido',
    canUpload: true
  };
}