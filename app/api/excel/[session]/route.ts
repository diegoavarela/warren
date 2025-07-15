import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: { session: string } }
) {
  try {
    const { session } = params;
    const sheetName = request.nextUrl.searchParams.get('sheet');

    if (!session) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Read the temporarily stored file
    const uploadDir = path.join(process.cwd(), 'tmp', 'uploads');
    const filePath = path.join(uploadDir, `${session}.xlsx`);
    
    let buffer: Buffer;
    try {
      buffer = await readFile(filePath);
    } catch (error) {
      console.error('Error reading file:', error);
      return NextResponse.json(
        { error: "Upload session not found or expired" },
        { status: 404 }
      );
    }

    // Parse Excel file with formatting preserved (matching the working mapper)
    const workbook = XLSX.read(buffer, { 
      type: "buffer", 
      cellDates: true,
      cellFormula: false, // Don't parse formulas
      cellHTML: false,
      cellStyles: false
    });
    
    // Get the specified sheet or first sheet
    const targetSheetName = sheetName || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[targetSheetName];
    
    if (!worksheet) {
      return NextResponse.json(
        { error: "Sheet not found" },
        { status: 404 }
      );
    }

    // Get worksheet range
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    console.log('Worksheet range:', worksheet['!ref'], 'Decoded:', range);
    
    // Convert to array format with formatting preserved (matching the working mapper)
    let data = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1, 
      raw: false, // Use formatted values as they appear in Excel
      defval: null, // Use null for empty cells instead of empty string
      blankrows: true // Include blank rows
    }) as any[][];
    
    // Clean up data: remove #REF! errors and convert to null
    data = data.map(row => 
      Array.isArray(row) ? row.map(cell => {
        if (cell === '#REF!' || cell === '#VALUE!' || cell === '#DIV/0!' || 
            cell === '#NAME?' || cell === '#NULL!' || cell === '#NUM!' || cell === '#N/A') {
          return null;
        }
        return cell;
      }) : row
    );
    
    // Debug: log first few rows and check for numeric data
    console.log('First 5 rows of data:', data.slice(0, 5));
    
    // Find first row with numeric data
    let firstNumericRow = -1;
    for (let i = 0; i < Math.min(50, data.length); i++) {
      const row = data[i];
      if (Array.isArray(row) && row.some((cell, idx) => 
        idx > 0 && cell !== null && cell !== undefined && cell !== '' &&
        (typeof cell === 'number' || !isNaN(parseFloat(String(cell).replace(/[$,]/g, ''))))
      )) {
        firstNumericRow = i;
        break;
      }
    }
    console.log('First row with numeric data:', firstNumericRow);
    
    // Since we're using raw: false, we get formatted strings
    // The data is already formatted as it appears in Excel
    const processedData = data;

    return NextResponse.json({
      sheetName: targetSheetName,
      data: processedData,
      rowCount: processedData.length,
      colCount: processedData[0]?.length || 0
    });

  } catch (error) {
    console.error("Error reading Excel data:", error);
    return NextResponse.json(
      { error: "Failed to read Excel data" },
      { status: 500 }
    );
  }
}