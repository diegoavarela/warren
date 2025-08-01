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

    // Try to read from file system first, then from memory cache
    let buffer: Buffer;
    
    try {
      // Try file system first (local development)
      const uploadDir = path.join(process.cwd(), 'tmp', 'uploads');
      const filePath = path.join(uploadDir, `${session}.xlsx`);
      buffer = await readFile(filePath);
      console.log(`📁 File read from disk: ${filePath}`);
    } catch (fileError) {
      console.log('📁 File not found on disk, checking memory cache...');
      
      // Fallback to memory cache (serverless environment)
      if (global.fileCache && global.fileCache.has(session)) {
        const cached = global.fileCache.get(session);
        
        if (!cached) {
          return NextResponse.json(
            { error: "Upload session not found" },
            { status: 404 }
          );
        }
        
        // Check if cache is expired (30 minutes)
        const isExpired = Date.now() - cached.timestamp > 30 * 60 * 1000;
        if (isExpired) {
          global.fileCache.delete(session);
          return NextResponse.json(
            { error: "Upload session expired" },
            { status: 404 }
          );
        }
        
        buffer = cached.buffer;
        console.log(`💾 File read from memory cache: ${session}`);
      } else {
        console.error('Error: Upload session not found in file system or memory cache');
        return NextResponse.json(
          { error: "Upload session not found or expired" },
          { status: 404 }
        );
      }
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