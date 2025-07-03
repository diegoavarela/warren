import { NextRequest, NextResponse } from "next/server";
import { ParseResults, ColumnMapping, ValidationRule } from "@/types";
import { parseLatamDate } from "@/lib/financial-intelligence";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uploadSession, sheetName, columnMappings, locale = 'es-MX' } = body;

    if (!uploadSession || !sheetName || !columnMappings) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // In a real implementation, you would:
    // 1. Fetch the actual Excel file using uploadSession
    // 2. Parse the sheet data according to columnMappings
    // 3. Validate each row against the mapping rules
    
    // For demonstration, we'll simulate the validation process
    const mockData = generateMockDataForValidation(sheetName, columnMappings);
    const parseResults = await validateAndParseData(mockData, columnMappings, locale);

    return NextResponse.json(parseResults);

  } catch (error) {
    console.error("Validation error:", error);
    return NextResponse.json(
      { error: "Internal server error during validation" },
      { status: 500 }
    );
  }
}

async function validateAndParseData(
  rawData: any[][],
  columnMappings: ColumnMapping[],
  locale: string
): Promise<ParseResults> {
  const parsedData: any[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  let successfulRows = 0;
  let failedRows = 0;

  // Skip header row
  const dataRows = rawData.slice(1);

  for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
    const row = dataRows[rowIndex];
    const parsedRow: any = {
      rowIndex: rowIndex + 1,
      data: {},
      originalData: row,
      issues: [],
      confidence: 100
    };

    let rowHasErrors = false;

    // Process each mapped column
    for (const mapping of columnMappings) {
      if (mapping.targetField === 'unmapped') continue;

      const cellValue = row[mapping.columnIndex];
      const fieldName = mapping.targetField;

      try {
        const validatedValue = await validateAndTransformValue(
          cellValue,
          mapping,
          locale,
          rowIndex + 1
        );

        parsedRow.data[fieldName] = validatedValue.value;
        
        if (validatedValue.warnings.length > 0) {
          parsedRow.issues.push(...validatedValue.warnings);
          parsedRow.confidence = Math.min(parsedRow.confidence, 80);
        }

        if (validatedValue.errors.length > 0) {
          parsedRow.issues.push(...validatedValue.errors);
          rowHasErrors = true;
        }

      } catch (error) {
        const errorMsg = `Error en fila ${rowIndex + 1}, columna ${mapping.sourceHeader}: ${error instanceof Error ? error.message : 'Error desconocido'}`;
        parsedRow.issues.push(errorMsg);
        errors.push(errorMsg);
        rowHasErrors = true;
      }
    }

    parsedData.push(parsedRow);

    if (rowHasErrors) {
      failedRows++;
    } else {
      successfulRows++;
    }
  }

  // Calculate summary statistics
  const amounts = parsedData
    .map(row => row.data.amount || row.data.cash_amount)
    .filter(amount => typeof amount === 'number');
    
  const totalAmount = amounts.reduce((sum, amount) => sum + amount, 0);

  const dates = parsedData
    .map(row => row.data.period || row.data.date)
    .filter(date => date instanceof Date);

  const dateRange = dates.length > 0 ? {
    start: new Date(Math.min(...dates.map(d => d.getTime()))),
    end: new Date(Math.max(...dates.map(d => d.getTime())))
  } : undefined;

  const successRate = (successfulRows / (successfulRows + failedRows)) * 100;

  return {
    totalRows: dataRows.length,
    validRows: successfulRows,
    invalidRows: failedRows,
    warnings,
    errors,
    preview: parsedData.slice(0, 10),
    data: parsedData,
    mapping: {
      statementType: 'unknown',
      confidence: 0,
      mappedColumns: 0,
      totalColumns: 0
    }
  };
}

async function validateAndTransformValue(
  value: any,
  mapping: ColumnMapping,
  locale: string,
  rowNumber: number
) {
  const errors: string[] = [];
  const warnings: string[] = [];
  let transformedValue = value;

  // Handle null/undefined values
  if (value === null || value === undefined || value === '') {
    const isRequired = mapping.validation?.some(rule => rule.type === 'required');
    if (isRequired) {
      errors.push(`Valor requerido faltante en fila ${rowNumber}`);
    }
    return { value: null, errors, warnings };
  }

  // Transform based on data type
  switch (mapping.dataType) {
    case 'date':
      transformedValue = parseLatamDate(value, locale as any);
      if (!transformedValue) {
        errors.push(`Formato de fecha inválido: ${value}`);
      }
      break;

    case 'currency':
    case 'number':
      const numericValue = parseNumber(value, locale);
      if (isNaN(numericValue)) {
        errors.push(`Valor numérico inválido: ${value}`);
      } else {
        transformedValue = numericValue;
      }
      break;

    case 'text':
      transformedValue = String(value).trim();
      if (transformedValue.length === 0) {
        warnings.push(`Texto vacío en fila ${rowNumber}`);
      }
      break;

    case 'category':
      transformedValue = String(value).trim();
      // Could add category validation here
      break;
  }

  // Apply custom validation rules
  if (mapping.validation) {
    for (const rule of mapping.validation) {
      const validationResult = validateRule(transformedValue, rule, rowNumber);
      errors.push(...validationResult.errors);
      warnings.push(...validationResult.warnings);
    }
  }

  return { value: transformedValue, errors, warnings };
}

function parseNumber(value: any, locale: string): number {
  if (typeof value === 'number') return value;
  
  let stringValue = String(value).trim();
  
  // Remove currency symbols
  stringValue = stringValue.replace(/[$€£¥R]/g, '');
  
  // Handle different locale formats
  if (locale.startsWith('es-')) {
    // Spanish format: 1.234.567,89
    // Replace thousands separator (.) with empty, decimal separator (,) with .
    stringValue = stringValue.replace(/\./g, '').replace(',', '.');
  } else {
    // English format: 1,234,567.89
    // Remove thousands separator (,)
    stringValue = stringValue.replace(/,/g, '');
  }
  
  return parseFloat(stringValue);
}

function validateRule(value: any, rule: ValidationRule, rowNumber: number) {
  const errors: string[] = [];
  const warnings: string[] = [];

  switch (rule.type) {
    case 'required':
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        errors.push(rule.message || `Valor requerido faltante en fila ${rowNumber}`);
      }
      break;

    case 'format':
      if (rule.params?.format === 'date' && !(value instanceof Date)) {
        errors.push(rule.message || `Formato de fecha inválido en fila ${rowNumber}`);
      }
      if (rule.params?.format === 'number' && typeof value !== 'number') {
        errors.push(rule.message || `Formato numérico inválido en fila ${rowNumber}`);
      }
      break;

    case 'range':
      if (typeof value === 'number') {
        if (rule.params?.min !== undefined && value < rule.params.min) {
          warnings.push(`Valor ${value} menor que el mínimo esperado (${rule.params.min})`);
        }
        if (rule.params?.max !== undefined && value > rule.params.max) {
          warnings.push(`Valor ${value} mayor que el máximo esperado (${rule.params.max})`);
        }
      }
      break;

    case 'pattern':
      if (rule.params?.regex && typeof value === 'string') {
        const regex = new RegExp(rule.params.regex);
        if (!regex.test(value)) {
          errors.push(rule.message || `Formato inválido en fila ${rowNumber}`);
        }
      }
      break;
  }

  return { errors, warnings };
}

function detectCurrencyFromData(parsedData: any[]): string | undefined {
  // Look for currency patterns in the data
  const amounts = parsedData
    .map(row => row.originalData)
    .flat()
    .filter(value => typeof value === 'string' && /[$€£¥]/.test(value));

  if (amounts.some(amount => amount.includes('$'))) {
    return 'MXN'; // Assume MXN for $ in LATAM context
  }
  if (amounts.some(amount => amount.includes('€'))) {
    return 'EUR';
  }
  if (amounts.some(amount => amount.includes('£'))) {
    return 'GBP';
  }

  return undefined;
}

function generateMockDataForValidation(sheetName: string, columnMappings: ColumnMapping[]) {
  // Generate mock data based on the sheet type and mappings
  const headers = columnMappings.map(m => m.sourceHeader);
  
  if (sheetName.toLowerCase().includes('resultado')) {
    return [
      headers,
      ['4010', 'Ingresos por Ventas', '01/01/2024', '$125,000.00'],
      ['5010', 'Costo de Ventas', '01/01/2024', '$-75,000.00'],
      ['6010', 'Gastos Administrativos', '01/01/2024', '$-25,000.00'],
      ['6020', 'Gastos de Ventas', '01/01/2024', '$-15,000.00'],
      ['', 'Utilidad Neta', '01/01/2024', '$10,000.00']
    ];
  }
  
  return [
    headers,
    ['Item 1', '01/01/2024', '$1,000.00'],
    ['Item 2', '02/01/2024', '$2,500.50'],
    ['Item 3', '03/01/2024', '$-500.00'],
    ['Item 4', '04/01/2024', '$750.25']
  ];
}