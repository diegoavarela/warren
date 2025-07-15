import { NextRequest, NextResponse } from "next/server";
import { readExcelFile } from "@/lib/excel-reader";
import { getUploadBySession } from "@/lib/services/upload-storage";
import { SimpleMapping } from "@/components/SimpleExcelMapper";
import { ParseResults, Locale } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      uploadSession, 
      sheetName, 
      simpleMapping,
      locale = 'es-MX' 
    }: {
      uploadSession: string;
      sheetName: string;
      simpleMapping: SimpleMapping;
      locale: string;
    } = body;

    if (!uploadSession || !sheetName || !simpleMapping) {
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
    
    // Extract and transform data based on simple mapping
    const parsedData = parseSimpleData(excelData.rawData, simpleMapping, locale as Locale);
    
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
        statementType: 'profit_loss', // Could be detected based on content
        confidence: 100, // Manual mapping = 100% confidence
        mappedColumns: simpleMapping.columns.filter(c => c.role !== 'ignore').length,
        totalColumns: simpleMapping.columns.length
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
  periods: {
    name: string;
    amount: number;
    originalValue: any;
    isValid: boolean;
  }[];
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

function parseSimpleData(
  rawData: any[][], 
  mapping: SimpleMapping,
  locale: Locale
): ParsedRow[] {
  const results: ParsedRow[] = [];
  
  // Get column mappings
  const accountCodeCols = mapping.columns.filter(c => c.role === 'account_code');
  const accountNameCols = mapping.columns.filter(c => c.role === 'account_name');
  const periodCols = mapping.columns.filter(c => c.role === 'period');
  
  // Process each data row
  for (let rowIdx = mapping.dataStartRow; rowIdx <= mapping.dataEndRow && rowIdx < rawData.length; rowIdx++) {
    const row = rawData[rowIdx];
    if (!row) continue;
    
    // Skip empty rows
    const hasData = row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '');
    if (!hasData) continue;
    
    const parsedRow: ParsedRow = {
      rowIndex: rowIdx,
      periods: [],
      isValid: true,
      errors: [],
      warnings: []
    };
    
    // Extract account code
    if (accountCodeCols.length > 0) {
      parsedRow.accountCode = String(row[accountCodeCols[0].index] || '').trim();
    }
    
    // Extract account name
    if (accountNameCols.length > 0) {
      parsedRow.accountName = String(row[accountNameCols[0].index] || '').trim();
    }
    
    // Skip rows without account information
    if (!parsedRow.accountCode && !parsedRow.accountName) {
      continue;
    }
    
    // Extract period data
    periodCols.forEach(col => {
      const value = row[col.index];
      if (value !== null && value !== undefined && value !== '') {
        const parsed = parseAmount(value, locale, mapping.currency);
        
        parsedRow.periods.push({
          name: col.periodName || `Period ${col.index}`,
          amount: parsed.value,
          originalValue: value,
          isValid: parsed.isValid
        });
        
        if (!parsed.isValid) {
          parsedRow.warnings.push(`Invalid amount in ${col.periodName}: ${value}`);
        }
      }
    });
    
    // Validate row
    if (parsedRow.periods.length === 0) {
      parsedRow.warnings.push('No period data found');
    }
    
    results.push(parsedRow);
  }
  
  return results;
}

function parseAmount(
  value: any, 
  locale: Locale, 
  currency: string
): { value: number; isValid: boolean } {
  if (typeof value === 'number') {
    return { value, isValid: true };
  }
  
  const str = String(value).trim();
  
  // Remove currency symbols
  let cleaned = str.replace(/[$€¥£₹R\$S\/]/g, '').trim();
  
  // Handle parentheses for negative numbers
  const isNegative = cleaned.startsWith('(') && cleaned.endsWith(')');
  if (isNegative) {
    cleaned = cleaned.slice(1, -1);
  }
  
  // Handle locale-specific formatting
  if (locale.startsWith('es')) {
    // Spanish/LATAM format: 1.234.567,89
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
  const uniqueWarnings = new Set<string>();
  
  data.forEach(row => {
    row.warnings.forEach(w => uniqueWarnings.add(w));
  });
  
  return Array.from(uniqueWarnings).slice(0, 10);
}

function collectErrors(data: ParsedRow[]): string[] {
  const errors: string[] = [];
  const uniqueErrors = new Set<string>();
  
  data.forEach(row => {
    row.errors.forEach(e => uniqueErrors.add(e));
  });
  
  return Array.from(uniqueErrors).slice(0, 10);
}