import { NextRequest, NextResponse } from "next/server";
import { readExcelFile } from "@/lib/excel-reader";
import { getUploadBySession } from "@/lib/services/upload-storage";
import { AccountMapping } from "@/components/AccountRowMapper";
import { ParseResults, Locale } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      uploadSession, 
      sheetName, 
      accountMapping,
      locale = 'es-MX' 
    }: {
      uploadSession: string;
      sheetName: string;
      accountMapping: AccountMapping;
      locale: string;
    } = body;

    if (!uploadSession || !sheetName || !accountMapping) {
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
    
    // Parse data based on account mapping
    const parsedData = parseAccountData(excelData.rawData, accountMapping, locale as Locale);
    
    // Calculate totals by category
    const categoryTotals = calculateCategoryTotals(parsedData);
    
    // Create parse results
    const results: ParseResults = {
      totalRows: parsedData.length,
      validRows: parsedData.filter(row => row.isValid).length,
      invalidRows: parsedData.filter(row => !row.isValid).length,
      warnings: collectWarnings(parsedData),
      errors: collectErrors(parsedData),
      preview: parsedData.slice(0, 20),
      data: parsedData,
      mapping: {
        statementType: accountMapping.statementType,
        confidence: 100, // Manual mapping = 100% confidence
        mappedColumns: accountMapping.accounts.length,
        totalColumns: accountMapping.periodColumns.length
      },
      categoryTotals // Add category totals for dashboard
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

interface ParsedAccountRow {
  rowIndex: number;
  accountCode: string;
  accountName: string;
  category: string;
  subcategory?: string;
  isInflow: boolean;
  periods: {
    label: string;
    amount: number;
    originalValue: any;
    isValid: boolean;
  }[];
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

function parseAccountData(
  rawData: any[][], 
  mapping: AccountMapping,
  locale: Locale
): ParsedAccountRow[] {
  const results: ParsedAccountRow[] = [];
  
  // Process each mapped account
  mapping.accounts.forEach(account => {
    const row = rawData[account.rowIndex];
    if (!row) return;
    
    const parsedRow: ParsedAccountRow = {
      rowIndex: account.rowIndex,
      accountCode: account.code,
      accountName: account.name,
      category: account.category,
      subcategory: account.subcategory,
      isInflow: account.isInflow,
      periods: [],
      isValid: true,
      errors: [],
      warnings: []
    };
    
    // Extract period data
    mapping.periodColumns.forEach(period => {
      const value = row[period.index];
      const parsed = parseAmount(value, locale, mapping.currency);
      
      // Apply sign convention based on inflow/outflow
      let finalAmount = parsed.value;
      if (!account.isInflow && finalAmount > 0) {
        finalAmount = -finalAmount; // Make outflows negative
      }
      
      parsedRow.periods.push({
        label: period.label,
        amount: finalAmount,
        originalValue: value,
        isValid: parsed.isValid
      });
      
      if (!parsed.isValid && value) {
        parsedRow.warnings.push(`Invalid amount in ${period.label}: ${value}`);
      }
    });
    
    // Validate row
    if (parsedRow.periods.every(p => !p.isValid || p.amount === 0)) {
      parsedRow.warnings.push('No valid period data found');
    }
    
    results.push(parsedRow);
  });
  
  return results;
}

function parseAmount(
  value: any, 
  locale: Locale, 
  currency: string
): { value: number; isValid: boolean } {
  if (value === null || value === undefined || value === '') {
    return { value: 0, isValid: true };
  }
  
  if (typeof value === 'number') {
    return { value: Math.abs(value), isValid: true }; // Use absolute value, sign handled elsewhere
  }
  
  let str = String(value).trim();
  
  // Check if negative (parentheses or minus sign)
  const isNegative = str.startsWith('(') && str.endsWith(')') || str.startsWith('-');
  
  // Remove currency symbols and negative indicators
  str = str.replace(/[$€¥£₹R\$S\/\(\)\-]/g, '').trim();
  
  // Handle locale-specific formatting
  if (locale.startsWith('es')) {
    // Spanish/LATAM format: 1.234.567,89
    str = str.replace(/\./g, '').replace(',', '.');
  } else {
    // English format: 1,234,567.89
    str = str.replace(/,/g, '');
  }
  
  const parsed = parseFloat(str);
  
  if (isNaN(parsed)) {
    return { value: 0, isValid: false };
  }
  
  // Return absolute value - sign is handled by isInflow property
  return { value: Math.abs(parsed), isValid: true };
}

function calculateCategoryTotals(data: ParsedAccountRow[]) {
  const totals: Record<string, Record<string, number>> = {};
  
  data.forEach(row => {
    if (!totals[row.category]) {
      totals[row.category] = {};
    }
    
    row.periods.forEach(period => {
      if (!totals[row.category][period.label]) {
        totals[row.category][period.label] = 0;
      }
      totals[row.category][period.label] += period.amount;
    });
  });
  
  return totals;
}

function collectWarnings(data: ParsedAccountRow[]): string[] {
  const warnings = new Set<string>();
  
  data.forEach(row => {
    row.warnings.forEach(w => {
      const baseWarning = w.split(':')[0];
      warnings.add(baseWarning);
    });
  });
  
  return Array.from(warnings).slice(0, 10);
}

function collectErrors(data: ParsedAccountRow[]): string[] {
  const errors = new Set<string>();
  
  data.forEach(row => {
    row.errors.forEach(e => {
      const baseError = e.split(':')[0];
      errors.add(baseError);
    });
  });
  
  return Array.from(errors).slice(0, 10);
}