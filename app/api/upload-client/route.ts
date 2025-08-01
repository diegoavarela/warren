import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { nanoid } from "nanoid";
import { ExcelFileMetadata, ExcelSheet } from "@/types";

// Force dynamic rendering for serverless
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Processing file upload request');
    
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const locale = formData.get("locale") as string || "es-MX";

    console.log('📁 File details:', { 
      name: file?.name, 
      size: file?.size, 
      type: file?.type,
      locale 
    });

    if (!file) {
      console.error('❌ No file provided in request');
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only .xlsx and .xls files are allowed." },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 50MB." },
        { status: 400 }
      );
    }

    // Generate upload session ID
    const uploadSession = nanoid();

    // Convert file to buffer for processing
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse Excel file to get sheet metadata
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid or corrupted Excel file" },
        { status: 400 }
      );
    }

    // Analyze sheets
    const sheets: ExcelSheet[] = workbook.SheetNames.map((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1:A1");
      
      const rows = range.e.r + 1;
      const cols = range.e.c + 1;
      
      // Check if sheet has meaningful data (more than just headers)
      const hasData = rows > 1 && cols > 0;
      
      // Get preview data (first 5 rows)
      let preview: any[][] = [];
      if (hasData) {
        try {
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1, 
            raw: false,
            range: 0 // Start from first row
          }) as any[][];
          
          // Take first 5 rows for preview
          preview = jsonData.slice(0, 5);
        } catch (error) {
          console.error(`Error parsing sheet ${sheetName}:`, error);
        }
      }

      return {
        name: sheetName,
        rows,
        cols,
        hasData,
        preview,
      };
    });

    // Save file buffer in-memory cache for serverless compatibility
    try {
      // Try file system first (works in local development)
      const { writeFileSync, mkdirSync } = await import('fs');
      const { join } = await import('path');
      
      const uploadDir = join(process.cwd(), 'tmp', 'uploads');
      mkdirSync(uploadDir, { recursive: true });
      
      const filePath = join(uploadDir, `${uploadSession}.xlsx`);
      writeFileSync(filePath, buffer);
      
      console.log(`📁 File saved to disk: ${filePath}`);
    } catch (saveError) {
      console.log('⚠️ File system not available (serverless environment), using in-memory storage');
      
      // Fallback: Store in global memory cache for serverless environments
      if (!global.fileCache) {
        global.fileCache = new Map();
      }
      
      // Store buffer with expiration (30 minutes)
      global.fileCache.set(uploadSession, {
        buffer: buffer,
        timestamp: Date.now(),
        filename: file.name
      });
      
      console.log(`💾 File cached in memory: ${uploadSession}`);
    }
    
    console.log(`Processing file: ${file.name} (${file.size} bytes)`);

    // Create metadata response - no file data included
    const metadata: ExcelFileMetadata = {
      fileName: file.name,
      fileSize: file.size,
      sheets,
      detectedLocale: locale,
      uploadSession
    };

    return NextResponse.json(metadata);

  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error during file upload" },
      { status: 500 }
    );
  }
}