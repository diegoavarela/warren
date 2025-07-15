import { NextRequest, NextResponse } from "next/server";
import { readExcelFile } from "@/lib/excel-reader";
import { getUploadBySession } from "@/lib/services/upload-storage";
import { MatrixMapping, ParseResults, Locale } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      uploadSession, 
      sheetName, 
      matrixMapping,
      locale = 'es-MX' 
    }: {
      uploadSession: string;
      sheetName: string;
      matrixMapping: MatrixMapping;
      locale: string;
    } = body;

    if (!uploadSession || !sheetName || !matrixMapping) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Fetch the file from temporary storage
    const uploadRecord = getUploadBySession(uploadSession);
    
    if (!uploadRecord || !uploadRecord.fileBuffer) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }
    
    // Read the Excel file
    const excelData = await readExcelFile(uploadRecord.fileBuffer, sheetName);
    
    // Extract and transform data based on matrix mapping
    const parsedData = parseMatrixData(excelData.rawData, matrixMapping, locale as Locale);
    
    // Create parse results
    const results: ParseResults = {
      totalRows: parsedData.length,
      validRows: parsedData.filter(row => row.isValid).length,
      invalidRows: parsedData.filter(row => !row.isValid).length,
      warnings: collectWarnings(parsedData),
      errors: collectErrors(parsedData),
      preview: parsedData.slice(0, 10),
      data: parsedData,
      mapping: {
        statementType: 'profit_loss', // This could be detected or passed
        confidence: 95,
        mappedColumns: matrixMapping.conceptColumns.length + matrixMapping.periodColumns.length,
        totalColumns: matrixMapping.conceptColumns.length + matrixMapping.periodColumns.length
      }
    };
    
    return NextResponse.json(results);

  } catch (error) {
    console.error("Validation error:", error);
    return NextResponse.json(
      { error: "Internal server error during validation" },
      { status: 500 }
    );
  }
}

interface ParsedRow {
  rowIndex: number;
  accountCode?: string;
  accountName?: string;
  category?: string;
  subcategory?: string;
  periodData: {
    period: string;
    amount: number;
    originalValue: any;
  }[];
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

function parseMatrixData(
  rawData: any[][], 
  mapping: MatrixMapping,
  locale: Locale
): ParsedRow[] {
  const results: ParsedRow[] = [];
  
  // Process each data row
  for (let rowIdx = mapping.dataRange.startRow; rowIdx <= mapping.dataRange.endRow; rowIdx++) {
    const row = rawData[rowIdx];
    if (!row) continue;
    
    // Skip empty rows
    const hasData = row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '');
    if (!hasData) continue;
    
    // Extract concept columns
    const parsedRow: ParsedRow = {
      rowIndex: rowIdx,
      periodData: [],
      isValid: true,
      errors: [],
      warnings: []
    };
    
    // Get concept values
    mapping.conceptColumns.forEach(cc => {
      const value = row[cc.columnIndex];
      if (value !== null && value !== undefined) {
        switch (cc.columnType) {
          case 'account_code':
            parsedRow.accountCode = String(value).trim();
            break;
          case 'account_name':
            parsedRow.accountName = String(value).trim();
            break;
          case 'category':
            parsedRow.category = String(value).trim();
            break;
          case 'subcategory':
            parsedRow.subcategory = String(value).trim();
            break;
        }
      }
    });
    
    // Skip rows without account information
    if (!parsedRow.accountCode && !parsedRow.accountName) {
      continue;
    }
    
    // Get period data
    mapping.periodColumns.forEach(pc => {
      const value = row[pc.columnIndex];
      if (value !== null && value !== undefined && value !== '') {
        const amount = parseAmount(value, locale);
        
        parsedRow.periodData.push({
          period: pc.periodLabel,
          amount: amount.value,
          originalValue: value
        });
        
        if (!amount.isValid) {
          parsedRow.warnings.push(`Valor inválido en período ${pc.periodLabel}: ${value}`);
        }
      }
    });
    
    // Validate row
    if (parsedRow.periodData.length === 0) {
      parsedRow.warnings.push('No se encontraron datos de período');
    }
    
    results.push(parsedRow);
  }
  
  return results;
}

function parseAmount(value: any, locale: Locale): { value: number; isValid: boolean } {
  if (typeof value === 'number') {
    return { value, isValid: true };
  }
  
  const str = String(value).trim();
  
  // Remove currency symbols
  let cleaned = str.replace(/[$€¥£₹]/g, '').trim();
  
  // Handle parentheses for negative numbers
  const isNegative = cleaned.startsWith('(') && cleaned.endsWith(')');
  if (isNegative) {
    cleaned = cleaned.slice(1, -1);
  }
  
  // Handle locale-specific formatting
  if (locale.startsWith('es')) {
    // Spanish format: 1.234.567,89
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    // English format: 1,234,567.89
    cleaned = cleaned.replace(/,/g, '');
  }
  
  const parsed = parseFloat(cleaned);
  
  if (isNaN(parsed)) {
    return { value: 0, isValid: false };
  }
  
  return { value: isNegative ? -parsed : parsed, isValid: true };
}

function collectWarnings(data: ParsedRow[]): string[] {
  const warnings: string[] = [];
  const allWarnings = data.flatMap(row => row.warnings);
  
  // Deduplicate and summarize warnings
  const warningCounts = new Map<string, number>();
  allWarnings.forEach(w => {
    const key = w.split(':')[0]; // Group similar warnings
    warningCounts.set(key, (warningCounts.get(key) || 0) + 1);
  });
  
  warningCounts.forEach((count, warning) => {
    if (count > 1) {
      warnings.push(`${warning} (${count} ocurrencias)`);
    } else {
      warnings.push(warning);
    }
  });
  
  return warnings.slice(0, 10); // Limit to 10 warnings
}

function collectErrors(data: ParsedRow[]): string[] {
  const errors: string[] = [];
  const allErrors = data.flatMap(row => row.errors);
  
  // Deduplicate and summarize errors
  const errorCounts = new Map<string, number>();
  allErrors.forEach(e => {
    const key = e.split(':')[0];
    errorCounts.set(key, (errorCounts.get(key) || 0) + 1);
  });
  
  errorCounts.forEach((count, error) => {
    if (count > 1) {
      errors.push(`${error} (${count} ocurrencias)`);
    } else {
      errors.push(error);
    }
  });
  
  return errors.slice(0, 10);
}