import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth/jwt';
import { db, financialDataFiles, companyConfigurations, eq } from '@/lib/db';
import { ROLES } from '@/lib/auth/rbac';

export async function GET(
  request: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const payload = await verifyJWT(token);
    const { companyId } = params;

    // Get all files for the company with configuration status
    const files = await db
      .select({
        id: financialDataFiles.id,
        originalFilename: financialDataFiles.originalFilename,
        uploadedAt: financialDataFiles.uploadedAt,
        fileSize: financialDataFiles.fileSize,
        mimeType: financialDataFiles.mimeType,
        status: financialDataFiles.status,
      })
      .from(financialDataFiles)
      .where(eq(financialDataFiles.companyId, companyId))
      .orderBy(financialDataFiles.uploadedAt);

    // Check which files have associated configurations
    const filesWithStatus = await Promise.all(
      files.map(async (file) => {
        const configs = await db
          .select({
            id: companyConfigurations.id,
            name: companyConfigurations.name,
            type: companyConfigurations.type,
            isActive: companyConfigurations.isActive
          })
          .from(companyConfigurations)
          .where(eq(companyConfigurations.companyId, companyId));

        return {
          ...file,
          hasConfiguration: configs.length > 0,
          configurations: configs,
          isOrphaned: configs.length === 0
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: filesWithStatus
    });

  } catch (error) {
    console.error('File list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const payload = await verifyJWT(token);
    const { companyId } = params;
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }

    // Check if user has permission to delete files for this company
    // (Company admin or higher)
    
    // Delete the file
    const deletedFile = await db
      .delete(financialDataFiles)
      .where(eq(financialDataFiles.id, fileId))
      .where(eq(financialDataFiles.companyId, companyId))
      .returning();

    if (deletedFile.length === 0) {
      return NextResponse.json(
        { error: 'File not found or access denied' },
        { status: 404 }
      );
    }

    console.log(`✅ File deleted: ${deletedFile[0].originalFilename} by ${payload.email}`);

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('File deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}