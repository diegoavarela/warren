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

    const uploadDir = path.join(process.cwd(), 'tmp', 'uploads');
    const filePath = path.join(uploadDir, `${sessionId}.xlsx`);
    
    try {
      // Read the file from temporary storage
      const fileBuffer = await readFile(filePath);
      
      // Convert to base64 for consistency with existing code
      const base64Data = fileBuffer.toString('base64');
      
      return NextResponse.json({
        success: true,
        fileData: base64Data
      });
      
    } catch (error) {
      console.error('Error reading file:', error);
      return NextResponse.json(
        { error: "File not found or expired" },
        { status: 404 }
      );
    }

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