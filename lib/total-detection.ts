/**
 * Total Detection Utilities
 * Intelligent detection of total/subtotal rows in financial statements
 */

export interface TotalDetectionResult {
  rowIndex: number;
  accountName: string;
  totalType: 'section_total' | 'grand_total' | 'calculated_total' | 'subtotal';
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
    'utilidad operativa', 'utilidad antes de impuestos', 'total impuestos'
  ],
  english: [
    'total', 'subtotal', 'grand total', 'sub-total',
    'gross profit', 'net profit', 'gross margin', 'net margin',
    'net income', 'net loss', 'bottom line',
    'total revenue', 'total expenses', 'total costs',
    // Specific English P&L totals
    'total revenue', 'total cost of sales', 'total operating expenses',
    'operating income', 'income before taxes', 'total taxes'
  ]
};

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
  accountNameColumn: number = -1
): TotalDetectionResult[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const results: TotalDetectionResult[] = [];

  for (let rowIndex = 0; rowIndex < rawData.length; rowIndex++) {
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
    if (detection.confidence > 0.3) { // Lowered threshold for better detection
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

  // 1. Keyword-based detection
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
 * Detects totals based on keywords in the account name
 */
function detectByKeywords(accountName: string, reasons: string[]): number {
  const lowerName = accountName.toLowerCase();
  let score = 0;

  // Check for explicit total keywords - exact match or starts with pattern
  const allKeywords = [...TOTAL_KEYWORDS.spanish, ...TOTAL_KEYWORDS.english];
  for (const keyword of allKeywords) {
    const lowerKeyword = keyword.toLowerCase();
    // Exact match gets highest score
    if (lowerName === lowerKeyword) {
      score = Math.max(score, 1.0);
      reasons.push(`Exact match: "${keyword}"`);
      break;
    }
    // Partial match for "total + word" patterns
    else if (lowerKeyword.startsWith('total') && lowerName.includes(lowerKeyword)) {
      score = Math.max(score, 0.9);
      reasons.push(`Total pattern match: "${keyword}"`);
      break;
    }
    // Match for utilidad patterns
    else if (lowerKeyword.startsWith('utilidad') && lowerName.includes(lowerKeyword)) {
      score = Math.max(score, 0.95);
      reasons.push(`Utilidad pattern match: "${keyword}"`);
      break;
    }
    // Contains the keyword
    else if (lowerName.includes(lowerKeyword)) {
      score = Math.max(score, 0.8);
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