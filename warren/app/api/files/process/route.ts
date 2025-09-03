import { NextRequest, NextResponse } from 'next/server';
import { excelProcessingService } from '@/lib/services/excel-processing-service';
import { getCurrentUser } from '@/lib/auth/server-auth';
import { hasCompanyAccess } from '@/lib/auth/rbac';
import { db, financialDataFiles, companyConfigurations } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { logDataProcessing } from '@/lib/audit';

// Request validation schema
const ProcessFileRequestSchema = z.object({
  fileId: z.string().uuid('File ID must be a valid UUID'),
  configId: z.string().uuid('Configuration ID must be a valid UUID'),
  companyId: z.string().uuid('Company ID must be a valid UUID'),
});

export async function POST(req: NextRequest) {
  try {
    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await req.json();
    const validation = ProcessFileRequestSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validation.error.errors
        },
        { status: 400 }
      );
    }

    const { fileId, configId, companyId } = validation.data;

    // Check if user has access to the company
    const hasAccess = await hasCompanyAccess(user.id, companyId, ['company_admin', 'org_admin', 'platform_admin', 'user']);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Insufficient permissions for this company' },
        { status: 403 }
      );
    }

    // Verify file exists and belongs to the company
    const fileResult = await db
      .select()
      .from(financialDataFiles)
      .where(and(
        eq(financialDataFiles.id, fileId),
        eq(financialDataFiles.companyId, companyId)
      ))
      .limit(1);

    if (fileResult.length === 0) {
      return NextResponse.json(
        { error: 'File not found or access denied' },
        { status: 404 }
      );
    }

    const fileRecord = fileResult[0];

    // Verify configuration exists and belongs to the company
    const configResult = await db
      .select()
      .from(companyConfigurations)
      .where(and(
        eq(companyConfigurations.id, configId),
        eq(companyConfigurations.companyId, companyId),
        eq(companyConfigurations.isActive, true)
      ))
      .limit(1);

    if (configResult.length === 0) {
      return NextResponse.json(
        { error: 'Configuration not found or access denied' },
        { status: 404 }
      );
    }

    // Check if file content exists in database
    if (!fileRecord.fileContent) {
      return NextResponse.json(
        { error: 'File content not found in database. Please re-upload the file.' },
        { status: 410 }
      );
    }

    try {
      // Process the Excel file with the configuration using database content
      const processingResult = await excelProcessingService.parseExcelFromDatabase(
        fileRecord.fileContent,
        configId,
        fileRecord.originalFilename
      );

      if (!processingResult.success || !processingResult.data) {
        return NextResponse.json(
          { 
            error: 'Processing failed',
            message: processingResult.error || 'Unknown processing error'
          },
          { status: 422 }
        );
      }

      // Store processed data in database
      const processedRecord = await excelProcessingService.storeProcessedData(
        companyId,
        configId,
        fileId,
        processingResult.data,
        user.id
      );

      // Log data processing
      await logDataProcessing(
        'process_data',
        processedRecord.id,
        companyId,
        user.id,
        req,
        {
          fileId: fileRecord.id,
          fileName: fileRecord.originalFilename,
          configId: configId,
          configName: configResult[0].name,
          processingStatus: processedRecord.processingStatus,
          currency: processedRecord.currency,
          units: processedRecord.units
        }
      );

      return NextResponse.json({
        success: true,
        data: {
          processedDataId: processedRecord.id,
          fileId: fileRecord.id,
          configId: configId,
          fileName: fileRecord.originalFilename,
          configName: configResult[0].name,
          processedAt: processedRecord.processedAt,
          processingStatus: processedRecord.processingStatus,
          currency: processedRecord.currency,
          units: processedRecord.units,
          periodStart: processedRecord.periodStart,
          periodEnd: processedRecord.periodEnd,
          metadata: processingResult.metadata,
          preview: {
            periods: processingResult.data.periods,
            dataRowsCount: Object.keys(processingResult.data.dataRows).length,
            categoriesCount: Object.keys(processingResult.data.categories).length
          }
        }
      });

    } catch (processingError) {
      console.error('Excel processing error:', processingError);
      
      return NextResponse.json(
        { 
          error: 'Processing failed',
          message: processingError instanceof Error ? processingError.message : 'Unknown processing error'
        },
        { status: 422 }
      );
    }

  } catch (error) {
    console.error('Error processing file:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}