/**
 * Period Parser Utilities
 * Handles parsing of period headers into actual dates with context
 */

export interface ParsedPeriod {
  originalLabel: string;
  type: 'month' | 'quarter' | 'year' | 'custom';
  parsedDate: Date;
  periodStart: Date;
  periodEnd: Date;
  displayLabel: string;
  year?: number;
  quarter?: number;
  month?: number;
  confidence: number; // 0-1 score for parsing confidence
}

// Spanish month mappings
const SPANISH_MONTHS: Record<string, number> = {
  'enero': 0, 'ene': 0,
  'febrero': 1, 'feb': 1,
  'marzo': 2, 'mar': 2,
  'abril': 3, 'abr': 3,
  'mayo': 4, 'may': 4,
  'junio': 5, 'jun': 5,
  'julio': 6, 'jul': 6,
  'agosto': 7, 'ago': 7,
  'septiembre': 8, 'sep': 8, 'sept': 8,
  'octubre': 9, 'oct': 9,
  'noviembre': 10, 'nov': 10,
  'diciembre': 11, 'dic': 11
};

// English month mappings
const ENGLISH_MONTHS: Record<string, number> = {
  'january': 0, 'jan': 0,
  'february': 1, 'feb': 1,
  'march': 2, 'mar': 2,
  'april': 3, 'apr': 3,
  'may': 4,
  'june': 5, 'jun': 5,
  'july': 6, 'jul': 6,
  'august': 7, 'aug': 7,
  'september': 8, 'sep': 8, 'sept': 8,
  'october': 9, 'oct': 9,
  'november': 10, 'nov': 10,
  'december': 11, 'dec': 11
};

// Quarter mappings
const QUARTER_PATTERNS: Record<string, number> = {
  'q1': 1, 'q2': 2, 'q3': 3, 'q4': 4,
  '1q': 1, '2q': 2, '3q': 3, '4q': 4,
  'trimestre 1': 1, 'trimestre 2': 2, 'trimestre 3': 3, 'trimestre 4': 4,
  'primer trimestre': 1, 'segundo trimestre': 2, 'tercer trimestre': 3, 'cuarto trimestre': 4,
  'first quarter': 1, 'second quarter': 2, 'third quarter': 3, 'fourth quarter': 4
};

/**
 * Parse a period header into a structured date object
 * @param label The period label (e.g., "Jan", "Q1 2024", "2024")
 * @param contextYear Optional year context if not in the label
 * @param locale Language locale for parsing
 */
export function parsePeriodHeader(
  label: string, 
  contextYear?: number,
  locale: 'es' | 'en' = 'es'
): ParsedPeriod | null {
  const normalizedLabel = label.toLowerCase().trim();
  let confidence = 1.0;
  
  // Try to extract year from the label
  const yearMatch = normalizedLabel.match(/\b(19|20)\d{2}\b/);
  const extractedYear = yearMatch ? parseInt(yearMatch[0]) : contextYear;
  
  if (!extractedYear) {
    // If no year found, use current year but lower confidence
    const currentYear = new Date().getFullYear();
    confidence *= 0.5;
  }
  
  const year = extractedYear || new Date().getFullYear();

  // Check for month patterns
  const monthMappings = locale === 'es' ? SPANISH_MONTHS : ENGLISH_MONTHS;
  for (const [monthName, monthIndex] of Object.entries(monthMappings)) {
    if (normalizedLabel.includes(monthName)) {
      const periodStart = new Date(year, monthIndex, 1);
      const periodEnd = new Date(year, monthIndex + 1, 0); // Last day of month
      
      return {
        originalLabel: label,
        type: 'month',
        parsedDate: periodStart,
        periodStart,
        periodEnd,
        displayLabel: formatMonthYear(periodStart, locale),
        year,
        month: monthIndex,
        confidence
      };
    }
  }

  // Check for quarter patterns
  for (const [pattern, quarter] of Object.entries(QUARTER_PATTERNS)) {
    if (normalizedLabel.includes(pattern)) {
      const quarterStartMonth = (quarter - 1) * 3;
      const periodStart = new Date(year, quarterStartMonth, 1);
      const periodEnd = new Date(year, quarterStartMonth + 3, 0);
      
      return {
        originalLabel: label,
        type: 'quarter',
        parsedDate: periodStart,
        periodStart,
        periodEnd,
        displayLabel: `Q${quarter} ${year}`,
        year,
        quarter,
        confidence
      };
    }
  }

  // Check for year-only pattern
  if (/^\d{4}$/.test(normalizedLabel)) {
    const yearValue = parseInt(normalizedLabel);
    const periodStart = new Date(yearValue, 0, 1);
    const periodEnd = new Date(yearValue, 11, 31);
    
    return {
      originalLabel: label,
      type: 'year',
      parsedDate: periodStart,
      periodStart,
      periodEnd,
      displayLabel: yearValue.toString(),
      year: yearValue,
      confidence: 1.0
    };
  }

  // Check for date patterns (DD/MM/YYYY, MM/DD/YYYY, etc.)
  const datePatterns = [
    /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/, // DD/MM/YYYY or MM/DD/YYYY
    /(\d{1,2})-(\d{1,2})-(\d{2,4})/, // DD-MM-YYYY
    /(\d{4})-(\d{1,2})-(\d{1,2})/ // YYYY-MM-DD
  ];

  for (const pattern of datePatterns) {
    const match = normalizedLabel.match(pattern);
    if (match) {
      let parsedDate: Date | null = null;
      
      if (pattern.source.startsWith('(\\d{4})')) {
        // YYYY-MM-DD format
        parsedDate = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
      } else {
        // Ambiguous format - try to determine based on locale
        const part1 = parseInt(match[1]);
        const part2 = parseInt(match[2]);
        
        if (locale === 'es' || part1 > 12) {
          // DD/MM format or unambiguous day
          parsedDate = new Date(parseInt(match[3]), part2 - 1, part1);
        } else {
          // MM/DD format
          parsedDate = new Date(parseInt(match[3]), part1 - 1, part2);
        }
      }

      if (parsedDate && !isNaN(parsedDate.getTime())) {
        return {
          originalLabel: label,
          type: 'custom',
          parsedDate,
          periodStart: parsedDate,
          periodEnd: parsedDate,
          displayLabel: formatDate(parsedDate, locale),
          year: parsedDate.getFullYear(),
          month: parsedDate.getMonth(),
          confidence: confidence * 0.8 // Lower confidence for ambiguous formats
        };
      }
    }
  }

  return null;
}

/**
 * Parse multiple period headers and detect year context
 */
export function parsePeriodHeaders(
  headers: string[],
  locale: 'es' | 'en' = 'es'
): {
  periods: ParsedPeriod[];
  detectedYear?: number;
  needsYearContext: boolean;
} {
  // First pass: try to detect year from any header
  let detectedYear: number | undefined;
  
  for (const header of headers) {
    const yearMatch = header.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
      detectedYear = parseInt(yearMatch[0]);
      break;
    }
  }

  // Second pass: parse all headers
  const periods: ParsedPeriod[] = [];
  let needsYearContext = false;

  for (const header of headers) {
    const parsed = parsePeriodHeader(header, detectedYear, locale);
    if (parsed) {
      periods.push(parsed);
      if (parsed.confidence < 0.8) {
        needsYearContext = true;
      }
    }
  }

  // Check if periods are sequential months (helps determine year transitions)
  if (periods.length > 1 && periods.every(p => p.type === 'month')) {
    const months = periods.map(p => p.month!);
    
    // Check for year transition (e.g., Nov, Dec, Jan, Feb)
    for (let i = 1; i < months.length; i++) {
      if (months[i] < months[i - 1] && months[i - 1] >= 10 && months[i] <= 2) {
        // Likely year transition
        needsYearContext = true;
        break;
      }
    }
  }

  return {
    periods,
    detectedYear,
    needsYearContext
  };
}

/**
 * Format a date as month and year
 */
function formatMonthYear(date: Date, locale: 'es' | 'en'): string {
  const options: Intl.DateTimeFormatOptions = { 
    month: 'long', 
    year: 'numeric' 
  };
  return date.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', options);
}

/**
 * Format a date
 */
function formatDate(date: Date, locale: 'es' | 'en'): string {
  return date.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US');
}

/**
 * Extract values from data rows for specific periods
 */
export function extractPeriodValues(
  rawData: any[][],
  headerRow: number,
  periodColumns: Array<{ index: number; period: ParsedPeriod }>,
  accountRows: number[]
): Map<number, Map<string, number>> {
  const values = new Map<number, Map<string, number>>();

  for (const rowIndex of accountRows) {
    const rowValues = new Map<string, number>();
    
    for (const { index, period } of periodColumns) {
      const cellValue = rawData[rowIndex]?.[index];
      const numericValue = parseNumericValue(cellValue);
      
      if (numericValue !== null) {
        rowValues.set(period.parsedDate.toISOString(), numericValue);
      }
    }
    
    if (rowValues.size > 0) {
      values.set(rowIndex, rowValues);
    }
  }

  return values;
}

/**
 * Parse a cell value into a numeric value
 */
function parseNumericValue(value: any): number | null {
  if (typeof value === 'number') return value;
  if (!value) return null;

  const stringValue = String(value);
  
  // Remove currency symbols and formatting
  const cleaned = stringValue
    .replace(/[$€£¥₹,\s]/g, '')
    .replace(/\(([^)]+)\)/, '-$1'); // Handle parentheses as negative

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Generate a year range selector based on context
 */
export function suggestYearRange(currentYear?: number): number[] {
  const year = currentYear || new Date().getFullYear();
  const years: number[] = [];
  
  // Suggest current year and previous 4 years
  for (let i = year - 4; i <= year + 1; i++) {
    years.push(i);
  }
  
  return years;
}