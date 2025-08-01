import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    
    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Try to read from file system first, then from memory cache
    let fileBuffer: Buffer;
    
    try {
      // Try file system first (local development)
      const uploadDir = path.join(process.cwd(), 'tmp', 'uploads');
      const filePath = path.join(uploadDir, `${sessionId}.xlsx`);
      fileBuffer = await readFile(filePath);
      console.log(`📁 File read from disk: ${filePath}`);
    } catch (fileError) {
      console.log('📁 File not found on disk, checking memory cache...');
      
      // Fallback to memory cache (serverless environment)
      if (global.fileCache && global.fileCache.has(sessionId)) {
        const cached = global.fileCache.get(sessionId);
        
        if (!cached) {
          return NextResponse.json(
            { error: "Upload session not found" },
            { status: 404 }
          );
        }
        
        // Check if cache is expired (30 minutes)
        const isExpired = Date.now() - cached.timestamp > 30 * 60 * 1000;
        if (isExpired) {
          global.fileCache.delete(sessionId);
          return NextResponse.json(
            { error: "Upload session expired" },
            { status: 404 }
          );
        }
        
        fileBuffer = cached.buffer;
        console.log(`💾 File read from memory cache: ${sessionId}`);
      } else {
        console.error('Error: Upload session not found in file system or memory cache');
        return NextResponse.json(
          { error: "File not found or expired" },
          { status: 404 }
        );
      }
    }
    
    // Convert to base64 for consistency with existing code
    const base64Data = fileBuffer.toString('base64');
    
    return NextResponse.json({
      success: true,
      fileData: base64Data
    });

  } catch (error) {
    console.error("Session retrieval error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    
    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    const uploadDir = path.join(process.cwd(), 'tmp', 'uploads');
    const filePath = path.join(uploadDir, `${sessionId}.xlsx`);
    
    try {
      const { unlink } = await import('fs/promises');
      await unlink(filePath);
      
      return NextResponse.json({
        success: true,
        message: "File deleted successfully"
      });
      
    } catch (error) {
      // File may already be deleted or not exist
      return NextResponse.json({
        success: true,
        message: "File already deleted or not found"
      });
    }

  } catch (error) {
    console.error("Session deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}