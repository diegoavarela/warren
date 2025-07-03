import { FinancialPatterns, FinancialStatementDetection, ColumnDetection, CurrencyDetection, Locale } from "@/types";

// Financial statement patterns for intelligent detection
export const FINANCIAL_PATTERNS: FinancialPatterns = {
  profit_loss: {
    es: [
      "estado de resultados", "estado de perdidas y ganancias", "p&l", "pérdidas y ganancias",
      "ingresos", "gastos", "utilidad neta", "ebitda", "ventas", "costos",
      "gastos operativos", "gastos de ventas", "utilidad operativa", "utilidad bruta",
      "ingresos por ventas", "costo de ventas", "margen bruto", "gastos administrativos"
    ],
    en: [
      "profit and loss", "income statement", "p&l", "profit & loss",
      "revenue", "expenses", "net income", "ebitda", "sales", "costs",
      "operating expenses", "selling expenses", "operating income", "gross profit",
      "sales revenue", "cost of sales", "gross margin", "administrative expenses"
    ]
  },
  cash_flow: {
    es: [
      "flujo de efectivo", "flujo de caja", "cash flow", "estado de flujo de efectivo",
      "actividades operativas", "actividades de inversion", "actividades de financiamiento",
      "efectivo operativo", "efectivo de inversion", "efectivo de financiamiento",
      "flujo operativo", "flujo de inversion", "flujo de financiamiento", "efectivo inicial",
      "efectivo final", "cambio en efectivo", "flujo neto de efectivo"
    ],
    en: [
      "cash flow", "cash flow statement", "statement of cash flows",
      "operating activities", "investing activities", "financing activities",
      "operating cash flow", "investing cash flow", "financing cash flow",
      "net cash flow", "cash flow from operations", "cash flow from investing",
      "cash flow from financing", "beginning cash", "ending cash", "change in cash"
    ]
  },
  balance_sheet: {
    es: [
      "balance general", "estado de situacion financiera", "balance de situacion",
      "activos", "pasivos", "patrimonio", "capital", "activo corriente",
      "activo no corriente", "pasivo corriente", "pasivo no corriente",
      "efectivo", "cuentas por cobrar", "inventarios", "cuentas por pagar",
      "capital social", "utilidades retenidas", "reservas"
    ],
    en: [
      "balance sheet", "statement of financial position", "statement of position",
      "assets", "liabilities", "equity", "shareholders equity", "current assets",
      "non-current assets", "current liabilities", "non-current liabilities",
      "cash", "accounts receivable", "inventory", "accounts payable",
      "share capital", "retained earnings", "reserves"
    ]
  }
};

// Column type patterns for intelligent mapping
export const COLUMN_PATTERNS = {
  date: {
    es: ["fecha", "periodo", "mes", "año", "día", "trimestre", "año fiscal"],
    en: ["date", "period", "month", "year", "day", "quarter", "fiscal year"],
    formats: [
      /^\d{1,2}\/\d{1,2}\/\d{2,4}$/, // DD/MM/YYYY or MM/DD/YYYY
      /^\d{1,2}-\d{1,2}-\d{2,4}$/, // DD-MM-YYYY
      /^\d{1,2}\.\d{1,2}\.\d{2,4}$/, // DD.MM.YYYY
      /^\d{4}-\d{1,2}-\d{1,2}$/, // YYYY-MM-DD
    ]
  },
  amount: {
    es: ["importe", "monto", "valor", "cantidad", "total", "suma", "pesos", "dolares"],
    en: ["amount", "value", "total", "sum", "dollars", "currency", "money"],
    formats: [
      /^[\$\€\£]?[\d,.\s]+$/, // Currency symbols with numbers
      /^\d{1,3}([\.,]\d{3})*[\.,]\d{2}$/, // Formatted numbers
    ]
  },
  description: {
    es: ["descripcion", "concepto", "detalle", "nombre", "cuenta", "rubro", "partida"],
    en: ["description", "detail", "name", "account", "item", "concept", "category"],
  },
  account: {
    es: ["cuenta", "codigo", "numero de cuenta", "codigo contable", "cuenta contable"],
    en: ["account", "code", "account number", "account code", "gl account"],
  }
};

// Currency detection patterns
export const CURRENCY_PATTERNS = {
  symbols: {
    '$': ['USD', 'MXN', 'ARS', 'COP', 'CLP', 'PEN'], // Context-dependent
    '€': ['EUR'],
    '£': ['GBP'],
    '¥': ['JPY', 'CNY'],
    'R$': ['BRL'],
    '₹': ['INR']
  },
  codes: /\b(USD|MXN|EUR|GBP|ARS|COP|CLP|PEN|BRL|JPY|CNY|INR)\b/gi,
  formats: {
    'es-MX': /\$\s?[\d,]+\.?\d*/,
    'es-AR': /\$\s?[\d.]+,?\d*/,
    'en-US': /\$[\d,]+\.?\d*/,
    'pt-BR': /R\$\s?[\d.]+,?\d*/
  }
};

/**
 * Detects the type of financial statement based on content analysis
 */
export function detectFinancialStatementType(
  sheetData: any[][],
  headers: string[],
  locale: Locale
): FinancialStatementDetection {
  const language = locale.split('-')[0] as 'es' | 'en';
  const allText = [...headers, ...sheetData.flat()].join(' ').toLowerCase();
  
  const confidence = {
    profit_loss: 0,
    cash_flow: 0,
    balance_sheet: 0
  };

  // Score each statement type based on pattern matches
  for (const [statementType, patterns] of Object.entries(FINANCIAL_PATTERNS)) {
    const keywords = patterns[language] || patterns.en;
    let matches = 0;
    
    for (const keyword of keywords) {
      if (allText.includes(keyword.toLowerCase())) {
        matches++;
      }
    }
    
    // Calculate confidence score (0-100)
    confidence[statementType as keyof typeof confidence] = Math.min(
      (matches / keywords.length) * 100,
      100
    );
  }

  // Determine primary type
  const primaryType = Object.entries(confidence).reduce((a, b) => 
    confidence[a[0] as keyof typeof confidence] > confidence[b[0] as keyof typeof confidence] ? a : b
  )[0] as 'profit_loss' | 'cash_flow' | 'balance_sheet';

  // Detect specific elements
  const detectedElements: string[] = [];
  if (confidence.profit_loss > 30) {
    detectedElements.push('revenue', 'expenses');
  }
  if (confidence.cash_flow > 30) {
    detectedElements.push('operating_activities', 'cash_flow');
  }
  if (confidence.balance_sheet > 30) {
    detectedElements.push('assets', 'liabilities');
  }

  return {
    primaryType: confidence[primaryType] > 20 ? primaryType : 'unknown',
    confidence: Math.max(...Object.values(confidence)),
    detectedElements,
    suggestedMapping: [], // Will be populated by column detection
    locale: locale,
    currency: detectCurrency(sheetData, locale).currency
  };
}

/**
 * Analyzes columns to detect their types and suggest mappings
 */
export function detectColumnTypes(
  headers: string[],
  sampleData: any[][],
  locale: Locale
): ColumnDetection[] {
  const language = locale.split('-')[0] as 'es' | 'en';
  
  return headers.map((header, columnIndex) => {
    const headerLower = header.toLowerCase();
    const columnData = sampleData.map(row => row[columnIndex]).filter(Boolean);
    const sampleValues = columnData.slice(0, 5);
    
    let detectedType = 'unknown';
    let confidence = 0;
    const issues: string[] = [];

    // Date detection
    if (matchesPattern(headerLower, COLUMN_PATTERNS.date[language])) {
      detectedType = 'date';
      confidence = 70;
      
      // Validate data format
      const dateMatches = columnData.filter(value => 
        COLUMN_PATTERNS.date.formats.some(format => format.test(String(value)))
      ).length;
      
      confidence += (dateMatches / columnData.length) * 30;
      
      if (dateMatches < columnData.length * 0.8) {
        issues.push('Formato de fecha inconsistente');
      }
    }
    
    // Amount detection
    else if (matchesPattern(headerLower, COLUMN_PATTERNS.amount[language])) {
      detectedType = 'amount';
      confidence = 70;
      
      // Validate numeric data
      const numericMatches = columnData.filter(value => 
        !isNaN(parseFloat(String(value).replace(/[^\d.-]/g, '')))
      ).length;
      
      confidence += (numericMatches / columnData.length) * 30;
      
      if (numericMatches < columnData.length * 0.8) {
        issues.push('Valores no numéricos encontrados');
      }
    }
    
    // Description detection
    else if (matchesPattern(headerLower, COLUMN_PATTERNS.description[language])) {
      detectedType = 'description';
      confidence = 80;
      
      // Validate text data
      const textMatches = columnData.filter(value => 
        typeof value === 'string' && value.length > 2
      ).length;
      
      confidence += (textMatches / columnData.length) * 20;
    }
    
    // Account detection
    else if (matchesPattern(headerLower, COLUMN_PATTERNS.account[language])) {
      detectedType = 'account';
      confidence = 75;
    }

    // Auto-detect based on data patterns if header doesn't match
    if (confidence < 50) {
      const dataAnalysis = analyzeColumnData(columnData);
      if (dataAnalysis.type !== 'unknown') {
        detectedType = dataAnalysis.type;
        confidence = dataAnalysis.confidence;
      }
    }

    return {
      columnIndex,
      headerText: header,
      detectedType,
      confidence: Math.round(confidence),
      sampleValues,
      issues
    };
  });
}

/**
 * Detects currency from data content
 */
export function detectCurrency(data: any[][], locale: Locale): CurrencyDetection {
  const allText = data.flat().join(' ');
  const detectedCurrencies: { [key: string]: number } = {};
  
  // Check for currency symbols
  for (const [symbol, currencies] of Object.entries(CURRENCY_PATTERNS.symbols)) {
    if (allText.includes(symbol)) {
      // Context-based detection for $ symbol
      if (symbol === '$') {
        const contextCurrency = getContextualCurrency(locale);
        detectedCurrencies[contextCurrency] = (detectedCurrencies[contextCurrency] || 0) + 10;
      } else {
        currencies.forEach(currency => {
          detectedCurrencies[currency] = (detectedCurrencies[currency] || 0) + 5;
        });
      }
    }
  }
  
  // Check for currency codes
  const codeMatches = allText.match(CURRENCY_PATTERNS.codes) || [];
  codeMatches.forEach(code => {
    const currency = code.toUpperCase();
    detectedCurrencies[currency] = (detectedCurrencies[currency] || 0) + 8;
  });
  
  // Default to locale-based currency if none detected
  if (Object.keys(detectedCurrencies).length === 0) {
    const defaultCurrency = getDefaultCurrency(locale);
    detectedCurrencies[defaultCurrency] = 3;
  }
  
  // Get most likely currency
  const topCurrency = Object.entries(detectedCurrencies)
    .sort(([,a], [,b]) => b - a)[0];
  
  return {
    currency: topCurrency ? topCurrency[0] : 'USD',
    confidence: topCurrency ? Math.min(topCurrency[1] * 10, 100) : 30,
    detected_from: 'context',
    sample_values: []
  };
}

// Helper functions
function matchesPattern(text: string, patterns: string[]): boolean {
  return patterns.some(pattern => text.includes(pattern.toLowerCase()));
}

function analyzeColumnData(data: any[]): { type: string; confidence: number } {
  if (data.length === 0) return { type: 'unknown', confidence: 0 };
  
  const sampleSize = Math.min(data.length, 10);
  const sample = data.slice(0, sampleSize);
  
  // Check if mostly numbers
  const numberCount = sample.filter(value => 
    !isNaN(parseFloat(String(value).replace(/[^\d.-]/g, '')))
  ).length;
  
  if (numberCount >= sampleSize * 0.8) {
    return { type: 'amount', confidence: 70 };
  }
  
  // Check if mostly dates
  const dateCount = sample.filter(value => {
    const dateStr = String(value);
    return COLUMN_PATTERNS.date.formats.some(format => format.test(dateStr));
  }).length;
  
  if (dateCount >= sampleSize * 0.8) {
    return { type: 'date', confidence: 70 };
  }
  
  // Default to description for text data
  return { type: 'description', confidence: 50 };
}

function getContextualCurrency(locale: Locale): string {
  const currencyMap: { [key: string]: string } = {
    'es-MX': 'MXN',
    'es-AR': 'ARS',
    'es-CO': 'COP',
    'es-CL': 'CLP',
    'es-PE': 'PEN',
    'en-US': 'USD',
    'pt-BR': 'BRL'
  };
  
  return currencyMap[locale] || 'USD';
}

function getDefaultCurrency(locale: Locale): string {
  return getContextualCurrency(locale);
}

/**
 * Parses LATAM date formats
 */
export function parseLatamDate(value: any, locale: Locale): Date | null {
  if (!value) return null;
  
  const dateStr = String(value).trim();
  const language = locale.split('-')[0];
  
  // Spanish month names
  const spanishMonths: { [key: string]: string } = {
    'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
    'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
    'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12',
    'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04',
    'may': '05', 'jun': '06', 'jul': '07', 'ago': '08',
    'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12'
  };
  
  // Replace Spanish month names
  let processedDate = dateStr.toLowerCase();
  for (const [spanish, numeric] of Object.entries(spanishMonths)) {
    processedDate = processedDate.replace(spanish, numeric);
  }
  
  // Try different date formats
  const formats = [
    /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/, // DD/MM/YYYY
    /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/, // DD/MM/YY
    /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/, // YYYY/MM/DD
  ];
  
  for (const format of formats) {
    const match = processedDate.match(format);
    if (match) {
      let [, first, second, third] = match;
      
      // Determine if it's DD/MM/YYYY or MM/DD/YYYY based on locale
      const isDDMM = language === 'es' || locale.includes('-MX') || locale.includes('-AR');
      
      if (third.length === 2) {
        third = '20' + third; // Assume 2000s for 2-digit years
      }
      
      const year = parseInt(third);
      const month = isDDMM ? parseInt(second) : parseInt(first);
      const day = isDDMM ? parseInt(first) : parseInt(second);
      
      // Validate ranges
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return new Date(year, month - 1, day);
      }
    }
  }
  
  // Fallback to standard Date parsing
  try {
    return new Date(dateStr);
  } catch {
    return null;
  }
}