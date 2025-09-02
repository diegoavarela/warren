import { NextRequest, NextResponse } from 'next/server';
import { excelProcessingService } from '@/lib/services/excel-processing-service';
import { getCurrentUser } from '@/lib/auth/server-auth';
import { hasCompanyAccess } from '@/lib/auth/rbac';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data to get uploaded file and metadata
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const companyId = formData.get('companyId') as string;
    const uploadSession = formData.get('uploadSession') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/excel'
    ];
    
    const allowedExtensions = ['.xlsx', '.xls'];
    const isValidType = allowedTypes.includes(file.type) || 
                       allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!isValidType) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an Excel file (.xlsx or .xls).' },
        { status: 400 }
      );
    }

    // Check file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 50MB limit' },
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

    // Generate unique filename for database storage
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const uniqueId = crypto.randomBytes(8).toString('hex');
    const filename = `${timestamp}_${uniqueId}.${fileExtension}`;

    // Get file content and convert to base64 for database storage
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');
    const fileContentBase64 = buffer.toString('base64');

    try {
      // Store file information and content in database
      const fileRecord = await excelProcessingService.storeFileInfo(
        companyId,
        filename,
        file.name,
        fileContentBase64,
        file.size,
        user.id,
        uploadSession,
        fileHash
      );

      return NextResponse.json({
        success: true,
        data: {
          fileId: fileRecord.id,
          filename: fileRecord.filename,
          originalFilename: fileRecord.originalFilename,
          fileSize: fileRecord.fileSize,
          uploadedAt: fileRecord.uploadedAt,
          fileHash
        }
      }, { status: 201 });

    } catch (dbError) {
      // Database operation failed
      throw dbError;
    }

  } catch (error) {
    console.error('Error uploading file:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}