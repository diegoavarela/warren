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
    
    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const configId = params.id;
    // Get optional selectedSheet parameter from query string
    const url = new URL(req.url);
    const selectedSheet = url.searchParams.get('sheet') || undefined;

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

    // Get the most recent Excel file for this company based on configuration type
    
    // Filter by filename pattern based on configuration type
    // For cashflow configs, look for files with "cashflow" or "cash" in the name
    // For P&L configs, look for files with "pnl", "p&l", or none of the cashflow keywords
    const allFiles = await db
      .select()
      .from(financialDataFiles)
      .where(eq(financialDataFiles.companyId, config.companyId))
      .orderBy(desc(financialDataFiles.uploadedAt));
    
    // Filter files based on configuration type
    const fileResult = allFiles.filter((file: any) => {
      const filename = file.originalFilename.toLowerCase();
      if (config.type === 'cashflow') {
        // For cashflow, prioritize files with cashflow-related keywords
        return filename.includes('cashflow') || filename.includes('cash') || filename.includes('flujo');
      } else if (config.type === 'pnl') {
        // For P&L, prioritize files with P&L-related keywords or files without cashflow keywords
        return filename.includes('pnl') || filename.includes('p&l') || filename.includes('estado') || 
               (!filename.includes('cashflow') && !filename.includes('cash') && !filename.includes('flujo'));
      }
      return true;
    }).slice(0, 1);

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
        config.configJson,
        selectedSheet
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