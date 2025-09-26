import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { getCurrentUser } from '@/lib/auth/server-auth';
import { hasCompanyAccess } from '@/lib/auth/rbac';
import { db, financialDataFiles, processedFinancialData, companyConfigurations, users } from '@/lib/db';
import { eq, and, desc } from 'drizzle-orm';

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
    const includeProcessed = searchParams.get('includeProcessed') === 'true';

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

    if (includeProcessed) {
      // Get files with their processed data information
      const filesWithProcessedData = await db
        .select({
          // File information
          fileId: financialDataFiles.id,
          filename: financialDataFiles.filename,
          originalFilename: financialDataFiles.originalFilename,
          fileSize: financialDataFiles.fileSize,
          uploadedAt: financialDataFiles.uploadedAt,
          uploadSession: financialDataFiles.uploadSession,
          uploadedBy: financialDataFiles.uploadedBy,
          uploadedByName: users.firstName,
          uploadedByLastName: users.lastName,
          
          // Processed data information
          processedDataId: processedFinancialData.id,
          configId: processedFinancialData.configId,
          configName: companyConfigurations.name,
          configType: companyConfigurations.type,
          processingStatus: processedFinancialData.processingStatus,
          processedAt: processedFinancialData.processedAt,
          processingError: processedFinancialData.processingError,
          periodStart: processedFinancialData.periodStart,
          periodEnd: processedFinancialData.periodEnd,
          currency: processedFinancialData.currency,
          units: processedFinancialData.units,
        })
        .from(financialDataFiles)
        .leftJoin(users, eq(financialDataFiles.uploadedBy, users.id))
        .leftJoin(processedFinancialData, eq(financialDataFiles.id, processedFinancialData.fileId))
        .leftJoin(companyConfigurations, eq(processedFinancialData.configId, companyConfigurations.id))
        .where(eq(financialDataFiles.companyId, companyId))
        .orderBy(desc(financialDataFiles.uploadedAt));

      // Group by file and include all processing attempts
      const groupedFiles = filesWithProcessedData.reduce((acc: Record<string, any>, row: any) => {
        if (!acc[row.fileId]) {
          acc[row.fileId] = {
            fileId: row.fileId,
            filename: row.filename,
            originalFilename: row.originalFilename,
            fileSize: row.fileSize,
            uploadedAt: row.uploadedAt,
            uploadSession: row.uploadSession,
            uploadedBy: row.uploadedBy,
            uploadedByName: row.uploadedByName,
            uploadedByLastName: row.uploadedByLastName,
            processedVersions: []
          };
        }

        // Add processed version if it exists
        if (row.processedDataId) {
          acc[row.fileId].processedVersions.push({
            processedDataId: row.processedDataId,
            configId: row.configId,
            configName: row.configName,
            configType: row.configType,
            processingStatus: row.processingStatus,
            processedAt: row.processedAt,
            processingError: row.processingError,
            periodStart: row.periodStart,
            periodEnd: row.periodEnd,
            currency: row.currency,
            units: row.units,
          });
        }

        return acc;
      }, {} as Record<string, any>);

      return NextResponse.json({
        success: true,
        data: Object.values(groupedFiles)
      });

    } else {
      // Get only file information without processed data
      const files = await db
        .select({
          fileId: financialDataFiles.id,
          filename: financialDataFiles.filename,
          originalFilename: financialDataFiles.originalFilename,
          fileSize: financialDataFiles.fileSize,
          uploadedAt: financialDataFiles.uploadedAt,
          uploadSession: financialDataFiles.uploadSession,
          uploadedBy: financialDataFiles.uploadedBy,
          uploadedByName: users.firstName,
          uploadedByLastName: users.lastName,
        })
        .from(financialDataFiles)
        .leftJoin(users, eq(financialDataFiles.uploadedBy, users.id))
        .where(eq(financialDataFiles.companyId, companyId))
        .orderBy(desc(financialDataFiles.uploadedAt));

      return NextResponse.json({
        success: true,
        data: files
      });
    }

  } catch (error) {
    console.error('Error fetching files:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}