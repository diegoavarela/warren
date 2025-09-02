import * as XLSX from 'xlsx';

export interface ExcelData {
  sheetName: string;
  headers: string[];
  data: any[][];
  rawData: any[][];
  metadata: {
    totalRows: number;
    totalCols: number;
    headerRow: number;
    dataStartRow: number;
    dataEndRow: number;
  };
}

export async function readExcelFile(buffer: ArrayBuffer, sheetName?: string): Promise<ExcelData> {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  
  // Use specified sheet or first sheet
  const worksheet = sheetName 
    ? workbook.Sheets[sheetName]
    : workbook.Sheets[workbook.SheetNames[0]];
  
  if (!worksheet) {
    throw new Error(`Sheet "${sheetName}" not found`);
  }
  
  // Get raw data including empty cells
  const rawData = XLSX.utils.sheet_to_json(worksheet, { 
    header: 1, 
    defval: null,
    blankrows: true,
    raw: false 
  }) as any[][];
  
  // Find the actual data boundaries
  const boundaries = findDataBoundaries(rawData);
  
  // Extract headers and data
  const headers = boundaries.headerRow !== -1 
    ? rawData[boundaries.headerRow].map((h: any) => String(h || '').trim())
    : [];
  
  const data = rawData.slice(boundaries.dataStartRow, boundaries.dataEndRow);
  
  return {
    sheetName: sheetName || workbook.SheetNames[0],
    headers,
    data,
    rawData,
    metadata: {
      totalRows: rawData.length,
      totalCols: headers.length || (rawData[0]?.length || 0),
      headerRow: boundaries.headerRow,
      dataStartRow: boundaries.dataStartRow,
      dataEndRow: boundaries.dataEndRow
    }
  };
}

function findDataBoundaries(data: any[][]) {
  let headerRow = -1;
  let dataStartRow = 0;
  let dataEndRow = data.length;
  
  // Find header row (row with most non-empty text cells)
  let maxTextCells = 0;
  for (let i = 0; i < Math.min(data.length, 20); i++) {
    const row = data[i] || [];
    const textCells = row.filter(cell => 
      cell && typeof cell === 'string' && cell.trim().length > 0
    ).length;
    
    if (textCells > maxTextCells && textCells >= 2) {
      maxTextCells = textCells;
      headerRow = i;
    }
  }
  
  // Find data start (first row after header with substantial data)
  if (headerRow !== -1) {
    for (let i = headerRow + 1; i < data.length; i++) {
      const row = data[i] || [];
      const nonEmptyCells = row.filter(cell => 
        cell !== null && cell !== undefined && String(cell).trim() !== ''
      ).length;
      
      if (nonEmptyCells >= 2) {
        dataStartRow = i;
        break;
      }
    }
  }
  
  // Find data end (last row with substantial data)
  for (let i = data.length - 1; i >= dataStartRow; i--) {
    const row = data[i] || [];
    const nonEmptyCells = row.filter(cell => 
      cell !== null && cell !== undefined && String(cell).trim() !== ''
    ).length;
    
    if (nonEmptyCells >= 2) {
      dataEndRow = i + 1;
      break;
    }
  }
  
  return { headerRow, dataStartRow, dataEndRow };
}

export function getSheetNames(buffer: ArrayBuffer): string[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  return workbook.SheetNames;
}