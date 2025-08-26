import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server-auth';
import { hasCompanyAccess } from '@/lib/auth/rbac';
import { db, financialDataFiles } from '@/lib/db';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await req.json();
    const { companyId, filename, originalFilename, fileContent, fileSize, mimeType } = body;

    // Validate required fields
    if (!companyId || !filename || !originalFilename || !fileContent) {
      return NextResponse.json({ 
        error: 'Missing required fields: companyId, filename, originalFilename, fileContent' 
      }, { status: 400 });
    }

    // Check if user has access to the company
    const hasAccess = await hasCompanyAccess(user.id, companyId, ['company_admin', 'org_admin', 'platform_admin']);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Insufficient permissions for this company' },
        { status: 403 }
      );
    }

    // Generate file hash for deduplication
    const fileHash = crypto.createHash('sha256').update(fileContent).digest('hex');

    // Check if file already exists (deduplication)
    const existingFile = await db
      .select()
      .from(financialDataFiles)
      .where(eq(financialDataFiles.fileHash, fileHash))
      .limit(1);

    if (existingFile.length > 0) {
      return NextResponse.json({
        success: true,
        data: existingFile[0],
        message: 'File already exists'
      });
    }

    // Insert new file
    const result = await db
      .insert(financialDataFiles)
      .values({
        companyId,
        filename,
        originalFilename,
        fileContent, // Base64 encoded content
        fileSize: fileSize || 0,
        fileHash,
        mimeType: mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        uploadedBy: user.id,
        uploadedAt: new Date(),
        createdAt: new Date()
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: result[0],
      message: 'File uploaded successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Error uploading file:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to upload file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId parameter is required' },
        { status: 400 }
      );
    }

    // Check if user has access to the company
    const hasAccess = await hasCompanyAccess(user.id, companyId, ['company_admin', 'org_admin', 'platform_admin', 'user']);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Insufficient permissions for this company' },
        { status: 403 }
      );
    }

    // Get files for the company
    const files = await db
      .select({
        id: financialDataFiles.id,
        filename: financialDataFiles.filename,
        originalFilename: financialDataFiles.originalFilename,
        fileSize: financialDataFiles.fileSize,
        mimeType: financialDataFiles.mimeType,
        uploadedAt: financialDataFiles.uploadedAt,
        uploadedBy: financialDataFiles.uploadedBy
      })
      .from(financialDataFiles)
      .where(eq(financialDataFiles.companyId, companyId));

    return NextResponse.json({
      success: true,
      data: files
    });

  } catch (error) {
    console.error('❌ Error fetching files:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}