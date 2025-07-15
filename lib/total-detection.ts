/**
 * Total Detection Utilities
 * Intelligent detection of total/subtotal rows in financial statements
 */

export interface TotalDetectionResult {
  rowIndex: number;
  accountName: string;
  totalType: 'section_total' | 'grand_total' | 'calculated_total' | 'subtotal' | 'section_header';
  confidence: number; // 0-1 score
  detectionReasons: string[]; // why this was detected as a total
  relatedDetailRows?: number[]; // rows that should sum to this total
}

export interface TotalDetectionOptions {
  keywordWeight: number; // 0-1, importance of keyword matching
  positionWeight: number; // 0-1, importance of position-based detection
  formatWeight: number; // 0-1, importance of formatting clues
  mathematicalWeight: number; // 0-1, importance of mathematical validation
}

const DEFAULT_OPTIONS: TotalDetectionOptions = {
  keywordWeight: 0.4,
  positionWeight: 0.3,
  formatWeight: 0.2,
  mathematicalWeight: 0.1
};

// Common total keywords in multiple languages - MUST BE EXPLICIT
const TOTAL_KEYWORDS = {
  spanish: [
    'total', 'subtotal', 'suma total', 'total general',
    'utilidad bruta', 'utilidad neta', 'ganancia neta', 'pérdida neta',
    'margen bruto', 'margen neto', 'resultado neto',
    'ingresos totales', 'gastos totales', 'costos totales',
    // Specific Spanish P&L totals from our test file
    'total ingresos', 'total costo de ventas', 'total gastos operativos',
    'utilidad operativa', 'utilidad antes de impuestos', 'total impuestos',
    'ebitda', 'ebit', 'resultado operativo'
  ],
  english: [
    'total', 'subtotal', 'grand total', 'sub-total',
    'gross profit', 'net profit', 'gross margin', 'net margin',
    'net income', 'net loss', 'bottom line',
    'total revenue', 'total expenses', 'total costs',
    // Specific English P&L totals
    'total revenue', 'total cost of sales', 'total operating expenses',
    'operating income', 'income before taxes', 'total taxes',
    'ebitda', 'ebit', 'operating profit'
  ]
};

// Section header keywords (titles without values) - MUST BE EXACT OR VERY CLOSE MATCH
const SECTION_HEADERS = {
  spanish: [
    'ingresos', 'egresos', 'gastos', 'costos', 'gastos operativos',
    'gastos administrativos', 'gastos de operación', 'impuestos'
  ],
  english: [
    'revenue', 'expenses', 'operating expenses',
    'administrative expenses', 'cost of revenue', 'cost of sales', 'operating costs'
  ]
};

// These patterns indicate it's NOT a section header
const NOT_SECTION_PATTERNS = [
  'other', 'total', 'net', 'gross', '(cor)', '(cogs)', 'taxes'
];

// These patterns indicate it's NOT a total (false positive exclusions)
const NOT_TOTAL_PATTERNS = [
  'other revenue', 'other income', 'otros ingresos',
  'llc transfers', 'transferencias llc', 
  'professional services', 'servicios profesionales',
  'other expenses', 'otros gastos',
  'miscellaneous', 'varios', 'other',
  'consulting', 'consultoría',
  'management fees', 'honorarios de gestión',
  'salaries', 'wages', 'sueldos', 'salarios',
  'rent', 'lease', 'renta', 'arrendamiento',
  'utilities', 'servicios públicos', 'servicios',
  'marketing', 'advertising', 'publicidad',
  'insurance', 'seguros',
  'supplies', 'suministros',
  'travel', 'viajes',
  'taxes paid', 'impuestos pagados',
  'depreciation', 'depreciación',
  'amortization', 'amortización'
];

// Section-specific keywords
const SECTION_KEYWORDS = {
  revenue: ['total revenue', 'total income', 'ingresos totales', 'ventas totales', 'total ingresos'],
  expenses: ['total expenses', 'total costs', 'gastos totales', 'costos totales', 'total gastos operativos'],
  gross: ['gross profit', 'gross margin', 'utilidad bruta', 'margen bruto'],
  operating: ['operating income', 'operating profit', 'resultado operativo', 'utilidad operativa'],
  net: ['net income', 'net profit', 'utilidad neta', 'resultado neto'],
  cost_of_sales: ['total cost of sales', 'total cogs', 'total costo de ventas', 'total cost of goods sold']
};

/**
 * Detects total/subtotal rows in financial data
 */
export function detectTotalRows(
  rawData: any[][],
  options: Partial<TotalDetectionOptions> = {},
  accountNameColumn: number = -1,
  dataStartRow: number = 0
): TotalDetectionResult[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const results: TotalDetectionResult[] = [];

  // Start from dataStartRow to skip headers
  for (let rowIndex = dataStartRow; rowIndex < rawData.length; rowIndex++) {
    const row = rawData[rowIndex];
    if (!row || row.length === 0) continue;

    // Use specified account name column, or try multiple columns
    let accountName = '';
    if (accountNameColumn >= 0 && accountNameColumn < row.length) {
      accountName = String(row[accountNameColumn] || '').trim();
    } else {
      // Try columns 0 and 1 for account name
      for (let col = 0; col < Math.min(2, row.length); col++) {
        const cellValue = String(row[col] || '').trim();
        if (cellValue && cellValue !== '-' && !cellValue.match(/^\d+$/)) {
          accountName = cellValue;
          break;
        }
      }
    }
    
    if (!accountName || accountName === '-') continue;

    const detection = analyzeRowForTotal(rawData, rowIndex, opts, accountName);
    if (detection.confidence > 0.75) { // Increased threshold from 0.6 to 0.75 to reduce false positives
      results.push(detection);
      console.log(`🔍 Total detected: "${accountName}" (confidence: ${detection.confidence.toFixed(2)})`, detection.detectionReasons);
    }
  }

  return results.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Analyzes a specific row to determine if it's a total
 */
function analyzeRowForTotal(
  rawData: any[][],
  rowIndex: number,
  options: TotalDetectionOptions,
  accountName?: string
): TotalDetectionResult {
  const row = rawData[rowIndex];
  const finalAccountName = accountName || String(row[0] || '').trim();
  const reasons: string[] = [];
  let totalScore = 0;
  
  // PRIORITY 1: Check if this is explicitly a total (before checking section headers)
  const lowerName = finalAccountName.toLowerCase();
  if (lowerName.includes('total') || lowerName.includes('subtotal')) {
    // This is definitely a total, not a section header
    const keywordScore = detectByKeywords(finalAccountName, reasons);
    totalScore = Math.max(keywordScore, 0.9); // Ensure high confidence
    
    const totalType = determineTotalType(finalAccountName, rowIndex, rawData.length);
    return {
      rowIndex,
      accountName: finalAccountName,
      totalType,
      confidence: totalScore,
      detectionReasons: reasons
    };
  }
  
  // PRIORITY 2: Check for key financial totals that should always be detected
  const keyFinancialTotals = [
    'gross profit', 'net income', 'operating income', 'ebitda', 'ebit',
    'gross margin', 'net margin', 'operating margin',
    'utilidad bruta', 'utilidad neta', 'utilidad operativa',
    'margen bruto', 'margen neto', 'resultado neto'
  ];
  
  const isKeyTotal = keyFinancialTotals.some(total => 
    lowerName === total || 
    (total.includes(' ') && lowerName.startsWith(total)) ||
    (lowerName.includes(total) && lowerName.includes('%'))
  );
  
  if (isKeyTotal) {
    return {
      rowIndex,
      accountName: finalAccountName,
      totalType: 'calculated_total',
      confidence: 0.85, // High confidence for key financial metrics
      detectionReasons: ['Key financial total metric']
    };
  }
  
  // PRIORITY 3: Check if this is a section header (only if not a total)
  if (isSectionHeader(row, finalAccountName)) {
    return {
      rowIndex,
      accountName: finalAccountName,
      totalType: 'section_header',
      confidence: 0.9,
      detectionReasons: ['Section header without numeric values']
    };
  }

  // 1. Keyword-based detection for other totals (utilidad, margen, etc.)
  const keywordScore = detectByKeywords(finalAccountName, reasons);
  totalScore += keywordScore * options.keywordWeight;

  // 2. Position-based detection
  const positionScore = detectByPosition(rawData, rowIndex, reasons);
  totalScore += positionScore * options.positionWeight;

  // 3. Format-based detection (simulated - would need actual Excel format data)
  const formatScore = detectByFormat(row, reasons);
  totalScore += formatScore * options.formatWeight;

  // 4. Mathematical validation
  const mathScore = detectByMath(rawData, rowIndex, reasons);
  totalScore += mathScore * options.mathematicalWeight;

  // Determine total type
  const totalType = determineTotalType(finalAccountName, rowIndex, rawData.length);

  return {
    rowIndex,
    accountName: finalAccountName,
    totalType,
    confidence: Math.min(totalScore, 1.0),
    detectionReasons: reasons
  };
}

/**
 * Check if this is a section header (title without values)
 */
function isSectionHeader(row: any[], accountName: string): boolean {
  const lowerName = accountName.toLowerCase();
  
  // First, check if it contains patterns that indicate it's NOT a section header
  for (const pattern of NOT_SECTION_PATTERNS) {
    if (lowerName.includes(pattern.toLowerCase())) {
      return false;
    }
  }
  
  // Check if it's an exact match or very close match to section header keywords
  const isHeader = [...SECTION_HEADERS.spanish, ...SECTION_HEADERS.english].some(header => {
    const lowerHeader = header.toLowerCase();
    return (
      lowerName === lowerHeader || // Exact match
      (lowerName === lowerHeader + 's') || // Plural form
      (lowerName.replace(/\s+/g, '') === lowerHeader.replace(/\s+/g, '')) // Ignore spaces
    );
  });
  
  if (!isHeader) return false;
  
  // Additional check: if the name is ALL CAPS and matches, more likely to be a header
  const isAllCaps = accountName === accountName.toUpperCase() && accountName.length > 3;
  
  // Check if row has any numeric values (headers typically don't)
  let hasNumericValues = false;
  for (let i = 1; i < row.length; i++) {
    const value = row[i];
    if (value && (typeof value === 'number' || String(value).match(/^[\d\$\-\(\),\.]+$/))) {
      hasNumericValues = true;
      break;
    }
  }
  
  return !hasNumericValues && (isHeader || isAllCaps);
}

/**
 * Detects totals based on keywords in the account name
 */
function detectByKeywords(accountName: string, reasons: string[]): number {
  const lowerName = accountName.toLowerCase();
  let score = 0;

  // First check exclusion patterns - these are NOT totals
  for (const exclusion of NOT_TOTAL_PATTERNS) {
    if (lowerName.includes(exclusion.toLowerCase())) {
      reasons.push(`Excluded pattern: "${exclusion}"`);
      return 0; // Not a total
    }
  }

  // Check for explicit total keywords - require word boundaries for better matching
  const allKeywords = [...TOTAL_KEYWORDS.spanish, ...TOTAL_KEYWORDS.english];
  for (const keyword of allKeywords) {
    const lowerKeyword = keyword.toLowerCase();
    // Exact match gets highest score
    if (lowerName === lowerKeyword) {
      score = Math.max(score, 1.0);
      reasons.push(`Exact match: "${keyword}"`);
      break;
    }
    // Partial match for "total + word" patterns - must start with "total"
    else if (lowerKeyword.startsWith('total') && lowerName.startsWith('total')) {
      score = Math.max(score, 0.9);
      reasons.push(`Total pattern match: "${keyword}"`);
      break;
    }
    // Match for utilidad patterns - must be exact or at start
    else if (lowerKeyword.includes('utilidad') && (lowerName === lowerKeyword || lowerName.startsWith('utilidad'))) {
      score = Math.max(score, 0.95);
      reasons.push(`Utilidad pattern match: "${keyword}"`);
      break;
    }
    // Match for profit/income patterns
    else if ((lowerKeyword.includes('profit') || lowerKeyword.includes('income')) && 
             (lowerName === lowerKeyword || lowerName.endsWith('profit') || lowerName.endsWith('income'))) {
      score = Math.max(score, 0.95);
      reasons.push(`Profit/Income pattern match: "${keyword}"`);
      break;
    }
    // Match for margen patterns - must be exact or at start
    else if ((lowerKeyword.includes('margen') || lowerKeyword.includes('margin')) && 
             (lowerName === lowerKeyword || lowerName.startsWith('margen') || lowerName.endsWith('margin'))) {
      score = Math.max(score, 0.9);
      reasons.push(`Margin pattern match: "${keyword}"`);
      break;
    }
    // Match for EBITDA/EBIT patterns
    else if ((lowerName === 'ebitda' || lowerName === 'ebit') && 
             (lowerKeyword === 'ebitda' || lowerKeyword === 'ebit')) {
      score = Math.max(score, 0.95);
      reasons.push(`EBITDA/EBIT match: "${keyword}"`);
      break;
    }
    // Contains the keyword - reduced score for partial matches
    else if (lowerName.includes(lowerKeyword) && lowerKeyword.length > 5) { // Only for longer keywords
      score = Math.max(score, 0.7);
      reasons.push(`Contains keyword: "${keyword}"`);
      break;
    }
  }

  // Check for section-specific keywords - require exact match
  for (const [section, keywords] of Object.entries(SECTION_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerName === keyword.toLowerCase()) {
        score = Math.max(score, 0.8);
        reasons.push(`Exact ${section} total match: "${keyword}"`);
      }
    }
  }

  // Check for calculation patterns
  if (lowerName.match(/(\+|\-|=)/)) {
    score = Math.max(score, 0.6);
    reasons.push('Contains calculation symbols');
  }

  // Check for percentage indicator (usually a calculated field)
  if (lowerName.includes('%') || lowerName.includes('percent')) {
    score = Math.max(score, 0.8);
    reasons.push('Contains percentage indicator');
  }

  return score;
}

/**
 * Detects totals based on position in the data
 */
function detectByPosition(rawData: any[][], rowIndex: number, reasons: string[]): number {
  let score = 0;

  // Check if preceded by detail rows and followed by blank/different section
  const prevRow = rowIndex > 0 ? rawData[rowIndex - 1] : null;
  const nextRow = rowIndex < rawData.length - 1 ? rawData[rowIndex + 1] : null;

  // If next row is blank or starts a new section
  if (nextRow && (isEmpty(nextRow) || isNewSection(nextRow))) {
    score += 0.4;
    reasons.push('Followed by blank row or new section');
  }

  // If this is near the end of a group of similar rows
  const similarRowsBefore = countSimilarRowsBefore(rawData, rowIndex);
  if (similarRowsBefore >= 2) {
    score += 0.3;
    reasons.push(`Follows ${similarRowsBefore} similar detail rows`);
  }

  return Math.min(score, 1.0);
}

/**
 * Detects totals based on formatting clues (simulated)
 */
function detectByFormat(row: any[], reasons: string[]): number {
  let score = 0;

  // Check if amounts are formatted differently (would need actual Excel formatting)
  // For now, check for bold indicators or special formatting patterns
  const accountName = String(row[0] || '');
  
  // Check for ALL CAPS (often used for totals)
  if (accountName === accountName.toUpperCase() && accountName.length > 3) {
    score += 0.3;
    reasons.push('Account name in ALL CAPS');
  }

  // Check for percentage values (margins, ratios)
  for (let i = 1; i < row.length; i++) {
    const cellValue = String(row[i] || '');
    if (cellValue.includes('%')) {
      score += 0.2;
      reasons.push('Contains percentage values');
      break;
    }
  }

  return Math.min(score, 1.0);
}

/**
 * Detects totals based on mathematical relationships
 */
function detectByMath(rawData: any[][], rowIndex: number, reasons: string[]): number {
  // This would implement mathematical validation
  // For now, return low score as this requires more complex analysis
  return 0.1;
}

/**
 * Determines the type of total based on context
 */
function determineTotalType(
  accountName: string, 
  rowIndex: number, 
  totalRows: number
): TotalDetectionResult['totalType'] {
  const lowerName = accountName.toLowerCase();

  if (lowerName.includes('grand') || lowerName.includes('general') || rowIndex > totalRows * 0.8) {
    return 'grand_total';
  }
  
  if (lowerName.includes('subtotal') || lowerName.includes('sub-total')) {
    return 'subtotal';
  }

  if (lowerName.includes('gross') || lowerName.includes('net') || lowerName.includes('margin')) {
    return 'calculated_total';
  }

  return 'section_total';
}

// Helper functions
function isEmpty(row: any[]): boolean {
  return !row || row.every(cell => !cell || String(cell).trim() === '' || String(cell).trim() === '-');
}

function isNewSection(row: any[]): boolean {
  const firstCell = String(row[0] || '').trim().toLowerCase();
  return !!(firstCell && !firstCell.match(/^\d/) && !firstCell.includes('$') && firstCell.length > 0);
}

function countSimilarRowsBefore(rawData: any[][], currentIndex: number): number {
  let count = 0;
  for (let i = currentIndex - 1; i >= 0; i--) {
    const row = rawData[i];
    if (isEmpty(row) || isLikelyTotal(String(row[0] || ''))) {
      break;
    }
    if (hasNumericData(row)) {
      count++;
    }
  }
  return count;
}

function isLikelyTotal(accountName: string): boolean {
  const lowerName = accountName.toLowerCase();
  return TOTAL_KEYWORDS.spanish.some(kw => lowerName.includes(kw)) ||
         TOTAL_KEYWORDS.english.some(kw => lowerName.includes(kw));
}

function hasNumericData(row: any[]): boolean {
  return row.some(cell => {
    const str = String(cell || '');
    return str.includes('$') || str.match(/\d+/) || str.includes('%');
  });
}

/**
 * Enhanced total detection with manual overrides
 */
export interface TotalDetectionConfig {
  autoDetect: boolean;
  manualOverrides: {
    rowIndex: number;
    isTotal: boolean;
    totalType?: TotalDetectionResult['totalType'];
  }[];
  excludeFromMapping: number[]; // row indices to exclude from category mapping
}

export function applyTotalDetection(
  rawData: any[][],
  config: TotalDetectionConfig
): TotalDetectionResult[] {
  let results: TotalDetectionResult[] = [];

  // Auto-detection
  if (config.autoDetect) {
    results = detectTotalRows(rawData);
  }

  // Apply manual overrides
  for (const override of config.manualOverrides) {
    const existingIndex = results.findIndex(r => r.rowIndex === override.rowIndex);
    
    if (override.isTotal) {
      const accountName = String(rawData[override.rowIndex]?.[0] || '');
      const newResult: TotalDetectionResult = {
        rowIndex: override.rowIndex,
        accountName,
        totalType: override.totalType || 'section_total',
        confidence: 1.0,
        detectionReasons: ['Manual override']
      };
      
      if (existingIndex >= 0) {
        results[existingIndex] = newResult;
      } else {
        results.push(newResult);
      }
    } else if (existingIndex >= 0) {
      // Remove from totals if marked as not a total
      results.splice(existingIndex, 1);
    }
  }

  return results.sort((a, b) => a.rowIndex - b.rowIndex);
}