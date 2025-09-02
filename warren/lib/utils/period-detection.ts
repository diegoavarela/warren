/**
 * Universal Period Detection and Validation Utility
 * 
 * This utility provides robust period detection that works with:
 * - Any month/year combination
 * - Any file structure
 * - Any period format (Jan-25, Q1-2025, 2025-01, etc.)
 * - Any data range or fiscal year
 */

export interface DetectedPeriod {
  columnIndex: number;
  label: string;
  parsedDate: Date | null;
  month: number; // 1-12
  year: number;
  quarterNumber?: number;
  periodType: 'monthly' | 'quarterly' | 'yearly' | 'custom';
  confidence: number;
  hasData: boolean;
  classification: 'ACTUAL' | 'CURRENT' | 'FORECAST' | 'EMPTY';
  dataPoints: number; // Number of non-zero, non-null values
  sampleValue?: string | number; // Sample value for preview
}

export interface PeriodDetectionResult {
  periods: DetectedPeriod[];
  currentPeriod: DetectedPeriod | null;
  actualPeriods: DetectedPeriod[];
  forecastPeriods: DetectedPeriod[];
  headerRowIndex: number;
  detectionConfidence: number;
  effectiveDate: Date; // Date to use for "as of" display
}

/**
 * Parse various period formats into standardized date objects
 */
export function parsePeriodLabel(label: string): { date: Date | null; type: 'monthly' | 'quarterly' | 'yearly' | 'custom'; confidence: number } {
  if (!label || typeof label !== 'string') {
    return { date: null, type: 'custom', confidence: 0 };
  }

  const cleanLabel = label.trim().toLowerCase();
  
  // Monthly formats: Jan-25, Jan-2025, January-25, Ene-25 (Spanish)
  const monthlyPatterns = [
    /^(jan|ene|enero|january)[-_\s]?(\d{2,4})$/i,
    /^(feb|febrero|february)[-_\s]?(\d{2,4})$/i,
    /^(mar|marzo|march)[-_\s]?(\d{2,4})$/i,
    /^(apr|abr|abril|april)[-_\s]?(\d{2,4})$/i,
    /^(may|mayo|may)[-_\s]?(\d{2,4})$/i,
    /^(jun|junio|june)[-_\s]?(\d{2,4})$/i,
    /^(jul|julio|july)[-_\s]?(\d{2,4})$/i,
    /^(aug|ago|agosto|august)[-_\s]?(\d{2,4})$/i,
    /^(sep|sept|septiembre|september)[-_\s]?(\d{2,4})$/i,
    /^(oct|octubre|october)[-_\s]?(\d{2,4})$/i,
    /^(nov|noviembre|november)[-_\s]?(\d{2,4})$/i,
    /^(dec|dic|diciembre|december)[-_\s]?(\d{2,4})$/i
  ];

  // Check monthly patterns
  for (let i = 0; i < monthlyPatterns.length; i++) {
    const match = cleanLabel.match(monthlyPatterns[i]);
    if (match) {
      const monthIndex = i; // 0-based
      let year = parseInt(match[2]);
      
      // Handle 2-digit years
      if (year < 100) {
        year += 2000;
      }
      
      const date = new Date(year, monthIndex, 1);
      return { date, type: 'monthly', confidence: 95 };
    }
  }

  // Quarterly formats: Q1-2025, Q1-25, Quarter 1 2025
  const quarterlyMatch = cleanLabel.match(/^q(\d)[_\s-]?(\d{2,4})$/i);
  if (quarterlyMatch) {
    const quarter = parseInt(quarterlyMatch[1]);
    let year = parseInt(quarterlyMatch[2]);
    
    if (year < 100) {
      year += 2000;
    }
    
    // Quarter 1 = January, Quarter 2 = April, etc.
    const monthIndex = (quarter - 1) * 3;
    const date = new Date(year, monthIndex, 1);
    return { date, type: 'quarterly', confidence: 90 };
  }

  // Numeric formats: 2025-01, 01/2025, 1/25
  const numericMatch = cleanLabel.match(/^(\d{4})[-/](\d{1,2})$/) || 
                       cleanLabel.match(/^(\d{1,2})[-/](\d{4})$/) ||
                       cleanLabel.match(/^(\d{1,2})[-/](\d{2})$/);
  
  if (numericMatch) {
    let year, month;
    
    if (numericMatch[1].length === 4) {
      // Format: 2025-01
      year = parseInt(numericMatch[1]);
      month = parseInt(numericMatch[2]);
    } else if (numericMatch[2].length === 4) {
      // Format: 01/2025
      month = parseInt(numericMatch[1]);
      year = parseInt(numericMatch[2]);
    } else {
      // Format: 1/25
      month = parseInt(numericMatch[1]);
      year = parseInt(numericMatch[2]) + 2000;
    }
    
    if (month >= 1 && month <= 12) {
      const date = new Date(year, month - 1, 1);
      return { date, type: 'monthly', confidence: 85 };
    }
  }

  // Yearly formats: 2025, Year 2025
  const yearMatch = cleanLabel.match(/^(year\s+)?(\d{4})$/i);
  if (yearMatch) {
    const year = parseInt(yearMatch[2]);
    const date = new Date(year, 0, 1);
    return { date, type: 'yearly', confidence: 70 };
  }

  // Special cases: TOTAL, YTD, etc.
  if (cleanLabel.match(/^(total|ytd|sum|summary)$/i)) {
    return { date: null, type: 'custom', confidence: 50 };
  }

  return { date: null, type: 'custom', confidence: 0 };
}

/**
 * Check if a column contains actual data (not zeros, nulls, or empty)
 */
export function hasActualData(columnData: any[]): { hasData: boolean; dataPoints: number; sampleValue?: any } {
  let dataPoints = 0;
  let sampleValue: any = undefined;
  
  for (const cell of columnData) {
    if (cell === null || cell === undefined || cell === '') {
      continue;
    }
    
    // Convert to string for analysis
    const cellStr = String(cell).trim();
    
    // Skip common empty indicators
    if (cellStr === '0' || cellStr === '-' || cellStr === '—' || cellStr === 'N/A') {
      continue;
    }
    
    // Check for actual numeric values
    const numericValue = parseFloat(cellStr.replace(/[$,\s]/g, ''));
    if (!isNaN(numericValue) && numericValue !== 0) {
      dataPoints++;
      if (sampleValue === undefined) {
        sampleValue = cell;
      }
    }
  }
  
  return {
    hasData: dataPoints > 0,
    dataPoints,
    sampleValue
  };
}

/**
 * Classify period based on current date and data presence
 */
export function classifyPeriod(period: DetectedPeriod, currentDate: Date): 'ACTUAL' | 'CURRENT' | 'FORECAST' | 'EMPTY' {
  if (!period.hasData) {
    return 'EMPTY';
  }
  
  if (!period.parsedDate) {
    return 'EMPTY';
  }
  
  // Compare year and month
  const periodYear = period.parsedDate.getFullYear();
  const periodMonth = period.parsedDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  
  if (periodYear < currentYear || (periodYear === currentYear && periodMonth < currentMonth)) {
    return 'ACTUAL';
  } else if (periodYear === currentYear && periodMonth === currentMonth) {
    return 'CURRENT';
  } else {
    return 'FORECAST';
  }
}

/**
 * Main period detection function that works universally
 */
export function detectPeriodsWithData(
  rawData: any[][],
  currentDate: Date = new Date()
): PeriodDetectionResult {
  const periods: DetectedPeriod[] = [];
  let headerRowIndex = 0;
  let bestScore = 0;
  
  // Find the best header row (same logic as before but more robust)
  for (let rowIndex = 0; rowIndex < Math.min(15, rawData.length); rowIndex++) {
    const row = rawData[rowIndex];
    if (!row || !Array.isArray(row)) continue;
    
    const rowPeriods: DetectedPeriod[] = [];
    let rowScore = 0;
    
    row.forEach((cell, colIndex) => {
      if (colIndex === 0 || !cell) return; // Skip first column
      
      const parseResult = parsePeriodLabel(String(cell));
      if (parseResult.confidence > 0) {
        // Check if this column has actual data
        const columnData = rawData.slice(rowIndex + 1).map(r => r?.[colIndex]).filter(v => v !== undefined);
        const dataCheck = hasActualData(columnData);
        
        const period: DetectedPeriod = {
          columnIndex: colIndex,
          label: String(cell),
          parsedDate: parseResult.date,
          month: parseResult.date ? parseResult.date.getMonth() + 1 : 0,
          year: parseResult.date ? parseResult.date.getFullYear() : 0,
          periodType: parseResult.type,
          confidence: parseResult.confidence,
          hasData: dataCheck.hasData,
          dataPoints: dataCheck.dataPoints,
          sampleValue: dataCheck.sampleValue,
          classification: 'EMPTY' // Will be set later
        };
        
        rowPeriods.push(period);
        rowScore += parseResult.confidence;
      }
    });
    
    // Use the row with the highest score
    if (rowScore > bestScore && rowPeriods.length > 0) {
      bestScore = rowScore;
      headerRowIndex = rowIndex;
      periods.length = 0; // Clear previous periods
      periods.push(...rowPeriods);
    }
  }
  
  // Classify periods based on current date
  periods.forEach(period => {
    period.classification = classifyPeriod(period, currentDate);
  });
  
  // Sort periods by date
  periods.sort((a, b) => {
    if (!a.parsedDate && !b.parsedDate) return a.columnIndex - b.columnIndex;
    if (!a.parsedDate) return 1;
    if (!b.parsedDate) return -1;
    return a.parsedDate.getTime() - b.parsedDate.getTime();
  });
  
  // Find current period (last actual period with data)
  const actualPeriods = periods.filter(p => p.classification === 'ACTUAL' && p.hasData);
  const currentPeriod = actualPeriods.length > 0 ? actualPeriods[actualPeriods.length - 1] : null;
  
  // Update current period classification
  if (currentPeriod) {
    currentPeriod.classification = 'CURRENT';
  }
  
  const forecastPeriods = periods.filter(p => p.classification === 'FORECAST');
  
  // Calculate effective date (from current period)
  const effectiveDate = currentPeriod?.parsedDate || currentDate;
  
  return {
    periods,
    currentPeriod,
    actualPeriods: periods.filter(p => p.classification === 'ACTUAL'),
    forecastPeriods,
    headerRowIndex,
    detectionConfidence: bestScore / Math.max(periods.length, 1),
    effectiveDate
  };
}

/**
 * Format period for display
 */
export function formatPeriodDisplay(period: DetectedPeriod): string {
  if (!period.parsedDate) return period.label;
  
  const date = period.parsedDate;
  const month = date.toLocaleString('default', { month: 'short' });
  const year = date.getFullYear();
  
  return `${month} ${year}`;
}

/**
 * Get period color based on classification
 */
export function getPeriodColor(classification: string): string {
  switch (classification) {
    case 'ACTUAL': return 'text-green-600 bg-green-50';
    case 'CURRENT': return 'text-blue-600 bg-blue-50';
    case 'FORECAST': return 'text-purple-600 bg-purple-50';
    case 'EMPTY': return 'text-gray-400 bg-gray-50';
    default: return 'text-gray-600 bg-gray-50';
  }
}