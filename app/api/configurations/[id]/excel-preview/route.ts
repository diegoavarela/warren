import { NextRequest, NextResponse } from 'next/server';
import { excelProcessingService } from '@/lib/services/excel-processing-service';
import { getCurrentUser } from '@/lib/auth/server-auth';
import { hasCompanyAccess } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import { financialDataFiles, companyConfigurations } from '@/lib/db/actual-schema';
import { eq, and, desc } from 'drizzle-orm';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    console.log(`Excel preview API called for config ID: ${params.id}`);
    
    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      console.log('Unauthorized access to Excel preview API');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const configId = params.id;
    console.log(`User ${user.id} requesting Excel preview for config ${configId}`);

    // Get the configuration
    const configResult = await db
      .select()
      .from(companyConfigurations)
      .where(and(
        eq(companyConfigurations.id, configId),
        eq(companyConfigurations.isActive, true)
      ))
      .limit(1);

    if (configResult.length === 0) {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      );
    }

    const config = configResult[0];

    // Check if user has access to the company
    const hasAccess = await hasCompanyAccess(user.id, config.companyId, ['company_admin', 'org_admin', 'platform_admin', 'user']);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Insufficient permissions for this configuration' },
        { status: 403 }
      );
    }

    // Get the most recent Excel file for this company
    console.log(`Looking for Excel files for company: ${config.companyId}`);
    
    const fileResult = await db
      .select()
      .from(financialDataFiles)
      .where(eq(financialDataFiles.companyId, config.companyId))
      .orderBy(desc(financialDataFiles.uploadedAt))
      .limit(1);

    console.log(`Found ${fileResult.length} Excel files for company ${config.companyId}`);

    if (fileResult.length === 0) {
      return NextResponse.json(
        { 
          error: 'No Excel file found for preview',
          message: 'Please upload an Excel file to see data preview. You can upload a file when creating a new configuration.',
          companyId: config.companyId
        },
        { status: 404 }
      );
    }

    const fileRecord = fileResult[0];

    // Check if file content exists in database
    if (!fileRecord.fileContent) {
      return NextResponse.json(
        { 
          error: 'Excel file content not found',
          message: 'The file content is missing from the database. Please re-upload the Excel file.'
        },
        { status: 410 }
      );
    }

    try {
      // Get Excel file preview data from database content
      const previewData = await excelProcessingService.getExcelPreview(
        fileRecord.fileContent,
        fileRecord.originalFilename,
        config.configJson
      );

      if (!previewData.success || !previewData.data) {
        return NextResponse.json(
          { 
            error: 'Preview generation failed',
            message: previewData.error || 'Unknown preview error'
          },
          { status: 422 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          preview: previewData.data
        }
      });

    } catch (previewError) {
      console.error('Excel preview error:', previewError);
      
      return NextResponse.json(
        { 
          error: 'Preview generation failed',
          message: previewError instanceof Error ? previewError.message : 'Unknown preview error'
        },
        { status: 422 }
      );
    }

  } catch (error) {
    console.error('Error generating Excel preview:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}