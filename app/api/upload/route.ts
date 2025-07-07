import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import * as XLSX from "xlsx";
import { nanoid } from "nanoid";
import { ExcelFileMetadata, ExcelSheet } from "@/types";
import { addUpload } from "@/lib/db/mock-db";
import { withRBAC, hasPermission, PERMISSIONS } from "@/lib/auth/rbac";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];

export async function POST(request: NextRequest) {
  return withRBAC(request, async (req, user) => {
    try {
      const formData = await req.formData();
      const file = formData.get("file") as File;
      const locale = formData.get("locale") as string || "es-MX";
      const companyId = formData.get("companyId") as string;

      // Check if user has permission to upload files
      if (companyId && !hasPermission(user, PERMISSIONS.UPLOAD_FILES, companyId)) {
        return NextResponse.json(
          { 
            error: "Insufficient permissions to upload files for this company",
            required: PERMISSIONS.UPLOAD_FILES,
            companyId 
          },
          { status: 403 }
        );
      }

      if (!file) {
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

    // Upload file to Vercel Blob for later processing (mock for local dev)
    let blob;
    if (process.env.NODE_ENV === 'development') {
      // Mock blob storage for local development
      blob = {
        url: `http://localhost:3000/mock-blob/${uploadSession}/${file.name}`,
        downloadUrl: `http://localhost:3000/mock-blob/${uploadSession}/${file.name}`,
        pathname: `${uploadSession}/${file.name}`,
        size: buffer.length
      };
      
      // Store the file buffer in mock database for local development
      const uploadRecord = {
        id: nanoid(),
        uploadSession,
        fileName: file.name,
        fileSize: file.size,
        sheets: sheets.map(s => s.name),
        createdAt: new Date(),
        fileBuffer: arrayBuffer
      };
      addUpload(uploadRecord);
      console.log('Stored file in mock DB:', uploadSession, 'size:', arrayBuffer.byteLength);
      
      console.log('📁 Mock file stored:', blob.pathname);
    } else {
      // Real Vercel Blob storage for production
      const { put } = await import("@vercel/blob");
      blob = await put(`${uploadSession}/${file.name}`, buffer, {
        access: "public",
        contentType: file.type,
      });
    }

    // Create metadata response
    const metadata: ExcelFileMetadata = {
      fileName: file.name,
      fileSize: file.size,
      sheets,
      detectedLocale: locale,
      uploadSession,
    };

      return NextResponse.json(metadata);

    } catch (error) {
      console.error("Upload error:", error);
      return NextResponse.json(
        { error: "Internal server error during file upload" },
        { status: 500 }
      );
    }
  });
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405 }
  );
}