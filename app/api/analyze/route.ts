import { NextRequest, NextResponse } from "next/server";
import { detectFinancialStatementType, detectColumnTypes } from "@/lib/financial-intelligence";
import { readExcelFile } from "@/lib/excel-reader";
import { SheetAnalysis, ColumnMapping, Locale } from "@/types";
import { getUploadBySession } from "@/lib/services/upload-storage";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uploadSession, sheetName, locale = 'es-MX' } = body;

    if (!uploadSession || !sheetName) {
      return NextResponse.json(
        { error: "Missing required parameters: uploadSession and sheetName" },
        { status: 400 }
      );
    }

    // Fetch the file from temporary storage
    const uploadRecord = getUploadBySession(uploadSession);
    
    if (!uploadRecord || !uploadRecord.fileBuffer) {
      // If no real file, use mock data for demo
      const mockSheetData = generateMockFinancialData(sheetName, locale as Locale);
      const analysis = await analyzeSheet(mockSheetData, sheetName, locale as Locale);
      return NextResponse.json(analysis);
    }
    
    // Read the actual Excel file
    const excelData = await readExcelFile(uploadRecord.fileBuffer, sheetName);
    
    // Combine headers and data for analysis
    const fullData = excelData.headers.length > 0 
      ? [excelData.headers, ...excelData.data]
      : excelData.rawData;
    
    const analysis = await analyzeSheet(fullData, sheetName, locale as Locale);
    
    // Add the raw Excel data to the response for full preview
    const enhancedAnalysis = {
      ...analysis,
      excelData: {
        headers: excelData.headers,
        data: excelData.data,
        rawData: excelData.rawData.slice(0, 100), // Limit raw data for performance
        metadata: excelData.metadata
      }
    };
    
    return NextResponse.json(enhancedAnalysis);

  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "Internal server error during sheet analysis" },
      { status: 500 }
    );
  }
}

async function analyzeSheet(
  sheetData: any[][],
  sheetName: string,
  locale: Locale
): Promise<SheetAnalysis> {
  
  // Step 1: Detect structure
  const structure = detectSheetStructure(sheetData);
  
  // Step 2: Extract headers and data
  const headers = structure.headerRow !== undefined 
    ? sheetData[structure.headerRow] 
    : [];
    
  const dataRows = sheetData.slice(structure.dataStartRow || 0, structure.dataEndRow);
  
  // Step 3: Detect financial statement type
  const financialDetection = detectFinancialStatementType(dataRows, headers, locale);
  
  // Step 4: Analyze columns
  const columnDetections = detectColumnTypes(headers, dataRows, locale);
  
  // Step 4.5: Enhance column detections with sample values from actual data
  columnDetections.forEach((detection, index) => {
    if (dataRows.length > 0) {
      detection.sampleValues = dataRows.slice(0, 5).map(row => row[index]).filter(val => val !== null && val !== undefined);
    }
  });
  
  // Step 5: Generate suggested mapping
  const suggestedMapping: ColumnMapping[] = columnDetections.map((detection, index) => ({
    columnIndex: index,
    sourceHeader: detection.headerText,
    targetField: mapDetectedTypeToField(detection.detectedType, financialDetection.primaryType),
    dataType: getDataType(detection.detectedType),
    confidence: detection.confidence,
    validation: generateValidationRules(detection.detectedType)
  }));
  
  // Step 6: Identify issues
  const issues = identifyIssues(columnDetections, dataRows, locale);
  
  return {
    sheetName,
    totalRows: sheetData.length,
    totalCols: headers.length,
    headerRow: structure.headerRow,
    dataStartRow: structure.dataStartRow,
    dataEndRow: structure.dataEndRow,
    columnDetections,
    financialDetection: {
      ...financialDetection,
      suggestedMapping
    },
    issues
  };
}

function detectSheetStructure(data: any[][]) {
  let headerRow: number | undefined;
  let dataStartRow: number | undefined;
  let dataEndRow: number | undefined;
  
  // Find header row (first row with text in most columns)
  for (let i = 0; i < Math.min(data.length, 10); i++) {
    const row = data[i];
    const textCells = row.filter(cell => 
      cell && typeof cell === 'string' && cell.trim().length > 0
    ).length;
    
    if (textCells >= row.length * 0.5) {
      headerRow = i;
      break;
    }
  }
  
  // Find data start (first row after header with meaningful data)
  if (headerRow !== undefined) {
    for (let i = headerRow + 1; i < data.length; i++) {
      const row = data[i];
      const nonEmptyCells = row.filter(cell => cell !== null && cell !== undefined && cell !== '').length;
      
      if (nonEmptyCells >= row.length * 0.3) {
        dataStartRow = i;
        break;
      }
    }
  }
  
  // Find data end (last row with meaningful data)
  for (let i = data.length - 1; i >= (dataStartRow || 0); i--) {
    const row = data[i];
    const nonEmptyCells = row.filter(cell => cell !== null && cell !== undefined && cell !== '').length;
    
    if (nonEmptyCells >= row.length * 0.3) {
      dataEndRow = i + 1;
      break;
    }
  }
  
  return { headerRow, dataStartRow, dataEndRow };
}

function mapDetectedTypeToField(detectedType: string, statementType: string): string {
  const mappings: { [key: string]: { [key: string]: string } } = {
    profit_loss: {
      date: 'period',
      amount: 'amount',
      description: 'account_name',
      account: 'account_code'
    },
    cash_flow: {
      date: 'period',
      amount: 'cash_amount',
      description: 'activity_description',
      account: 'activity_category'
    },
    balance_sheet: {
      date: 'as_of_date',
      amount: 'balance',
      description: 'account_name',
      account: 'account_code'
    }
  };
  
  return mappings[statementType]?.[detectedType] || detectedType;
}

function getDataType(detectedType: string): 'date' | 'number' | 'currency' | 'text' | 'category' {
  const typeMap: { [key: string]: 'date' | 'number' | 'currency' | 'text' | 'category' } = {
    date: 'date',
    amount: 'currency',
    description: 'text',
    account: 'category'
  };
  
  return typeMap[detectedType] || 'text';
}

function generateValidationRules(detectedType: string) {
  const rules: { [key: string]: any[] } = {
    date: [
      { type: 'required', message: 'Fecha es requerida' },
      { type: 'format', params: { format: 'date' }, message: 'Formato de fecha inválido' }
    ],
    amount: [
      { type: 'required', message: 'Monto es requerido' },
      { type: 'format', params: { format: 'number' }, message: 'Debe ser un número válido' }
    ],
    description: [
      { type: 'required', message: 'Descripción es requerida' }
    ]
  };
  
  return rules[detectedType] || [];
}

function identifyIssues(columnDetections: any[], dataRows: any[][], locale: Locale) {
  const issues: any[] = [];
  
  // Check for low confidence mappings
  columnDetections.forEach((detection, index) => {
    if (detection.confidence < 60) {
      issues.push({
        type: 'warning',
        message: `Mapeo de columna '${detection.headerText}' tiene baja confianza (${detection.confidence}%)`,
        column: index,
        severity: 'medium'
      });
    }
  });
  
  // Check for missing critical columns
  const hasDate = columnDetections.some(d => d.detectedType === 'date');
  const hasAmount = columnDetections.some(d => d.detectedType === 'amount');
  
  if (!hasDate) {
    issues.push({
      type: 'error',
      message: 'No se detectó una columna de fecha',
      severity: 'high'
    });
  }
  
  if (!hasAmount) {
    issues.push({
      type: 'error',
      message: 'No se detectó una columna de montos',
      severity: 'high'
    });
  }
  
  // Check for empty rows
  const emptyRows = dataRows.filter(row => 
    row.every(cell => !cell || cell.toString().trim() === '')
  ).length;
  
  if (emptyRows > dataRows.length * 0.1) {
    issues.push({
      type: 'warning',
      message: `${emptyRows} filas vacías detectadas (${Math.round(emptyRows/dataRows.length*100)}%)`,
      severity: 'low'
    });
  }
  
  return issues;
}

// Generate mock data for demonstration
function generateMockFinancialData(sheetName: string, locale: Locale) {
  const language = locale.split('-')[0];
  
  if (sheetName.toLowerCase().includes('resultado') || sheetName.toLowerCase().includes('p&l')) {
    // P&L mock data
    return [
      language === 'es' 
        ? ['Cuenta', 'Descripción', 'Enero 2024', 'Febrero 2024', 'Marzo 2024']
        : ['Account', 'Description', 'Jan 2024', 'Feb 2024', 'Mar 2024'],
      ['4010', 'Ingresos por Ventas', 125000, 132000, 128000],
      ['5010', 'Costo de Ventas', -75000, -78000, -76000],
      ['6010', 'Gastos Administrativos', -25000, -26000, -25500],
      ['6020', 'Gastos de Ventas', -15000, -16000, -15200],
      ['', 'Utilidad Neta', 10000, 12000, 11300]
    ];
  } else if (sheetName.toLowerCase().includes('flujo') || sheetName.toLowerCase().includes('cash')) {
    // Cash Flow mock data
    return [
      language === 'es' 
        ? ['Actividad', 'Descripción', 'Q1 2024', 'Q2 2024', 'Q3 2024']
        : ['Activity', 'Description', 'Q1 2024', 'Q2 2024', 'Q3 2024'],
      ['Operación', 'Efectivo de Operaciones', 45000, 52000, 48000],
      ['Inversión', 'Compra de Activos', -20000, -15000, -25000],
      ['Financiamiento', 'Préstamos Bancarios', 10000, 0, -5000],
      ['', 'Flujo Neto', 35000, 37000, 18000]
    ];
  } else {
    // Balance Sheet mock data
    return [
      language === 'es' 
        ? ['Código', 'Cuenta', 'Dic 2023', 'Mar 2024', 'Jun 2024']
        : ['Code', 'Account', 'Dec 2023', 'Mar 2024', 'Jun 2024'],
      ['1010', 'Efectivo y Equivalentes', 50000, 85000, 103000],
      ['1020', 'Cuentas por Cobrar', 75000, 82000, 78000],
      ['1030', 'Inventarios', 120000, 115000, 125000],
      ['2010', 'Cuentas por Pagar', -45000, -52000, -48000],
      ['3010', 'Capital Social', -150000, -150000, -150000]
    ];
  }
}