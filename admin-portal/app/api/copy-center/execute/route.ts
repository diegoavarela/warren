import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/shared/db';
import { 
  companies, 
  organizations, 
  companyConfigurations, 
  financialDataFiles,
  processedFinancialData,
  users 
} from '@/shared/db';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth-middleware';

interface CopyItem {
  type: 'configuration' | 'file' | 'processedData';
  sourceId: string;
  targetId: string;
  name: string;
}

// POST /api/copy-center/execute - Execute copy operation
export const POST = requireAuth(async (request: NextRequest, user) => {
  try {
    const { sourceCompanyId, targetCompanyId, selectedConfigIds } = await request.json();

    if (!sourceCompanyId || !targetCompanyId) {
      return NextResponse.json(
        { success: false, error: 'Source company and target company are required' },
        { status: 400 }
      );
    }

    if (sourceCompanyId === targetCompanyId) {
      return NextResponse.json(
        { success: false, error: 'Cannot copy to the same company' },
        { status: 400 }
      );
    }

    // Verify both companies exist
    const [sourceCompany] = await db
      .select({ id: companies.id, name: companies.name })
      .from(companies)
      .where(eq(companies.id, sourceCompanyId))
      .limit(1);

    const [targetCompany] = await db
      .select({ id: companies.id, name: companies.name })
      .from(companies)
      .where(eq(companies.id, targetCompanyId))
      .limit(1);

    if (!sourceCompany || !targetCompany) {
      return NextResponse.json(
        { success: false, error: 'Source or target company not found' },
        { status: 404 }
      );
    }

    const copiedItems: CopyItem[] = [];
    const errors: string[] = [];

    // 1. Copy Company Configurations (only selected ones)
    let configWhere = eq(companyConfigurations.companyId, sourceCompanyId);
    
    // Only apply inArray filter if we have valid selected config IDs
    if (selectedConfigIds && Array.isArray(selectedConfigIds) && selectedConfigIds.length > 0) {
      // Filter out any null/undefined values and ensure they're strings
      const validConfigIds = selectedConfigIds.filter(id => id != null && typeof id === 'string');
      if (validConfigIds.length > 0) {
        configWhere = and(
          eq(companyConfigurations.companyId, sourceCompanyId),
          inArray(companyConfigurations.id, validConfigIds)
        );
      }
    }

    const sourceConfigurations = await db
      .select()
      .from(companyConfigurations)
      .where(configWhere);

    const configMapping = new Map<string, string>();

    for (const config of sourceConfigurations) {
      try {
        const newConfigId = crypto.randomUUID();
        
        await db.insert(companyConfigurations).values({
          id: newConfigId,
          companyId: targetCompanyId,
          version: config.version,
          type: config.type,
          name: `${config.name} (Copied)`,
          description: `Copied from ${sourceCompany.name}: ${config.description || ''}`,
          configJson: config.configJson,
          metadata: config.metadata,
          isActive: false, // Copied configs are inactive by default
          isTemplate: false,
          parentConfigId: config.id, // Reference to original
          createdBy: user.id,
        });

        configMapping.set(config.id, newConfigId);
        copiedItems.push({
          type: 'configuration',
          sourceId: config.id,
          targetId: newConfigId,
          name: config.name
        });
      } catch (error) {
        errors.push(`Failed to copy configuration "${config.name}": ${error}`);
      }
    }

    // 2. Copy Financial Data Files
    const sourceFiles = await db
      .select()
      .from(financialDataFiles)
      .where(eq(financialDataFiles.companyId, sourceCompanyId));

    const fileMapping = new Map<string, string>();

    for (const file of sourceFiles) {
      try {
        const newFileId = crypto.randomUUID();
        
        await db.insert(financialDataFiles).values({
          id: newFileId,
          companyId: targetCompanyId,
          filename: file.filename,
          originalFilename: `${file.originalFilename} (Copy)`,
          filePath: file.filePath,
          fileContent: file.fileContent,
          fileSize: file.fileSize,
          fileHash: file.fileHash,
          mimeType: file.mimeType,
          uploadSession: crypto.randomUUID().toString().substring(0, 8),
          uploadedBy: user.id,
        });

        fileMapping.set(file.id, newFileId);
        copiedItems.push({
          type: 'file',
          sourceId: file.id,
          targetId: newFileId,
          name: file.originalFilename
        });
      } catch (error) {
        errors.push(`Failed to copy file "${file.originalFilename}": ${error}`);
      }
    }

    // 3. Copy Processed Financial Data (only for selected configurations)
    let processedDataWhere = eq(processedFinancialData.companyId, sourceCompanyId);
    
    // Only apply inArray filter if we have valid selected config IDs
    if (selectedConfigIds && Array.isArray(selectedConfigIds) && selectedConfigIds.length > 0) {
      // Filter out any null/undefined values and ensure they're strings
      const validConfigIds = selectedConfigIds.filter(id => id != null && typeof id === 'string');
      if (validConfigIds.length > 0) {
        processedDataWhere = and(
          eq(processedFinancialData.companyId, sourceCompanyId),
          inArray(processedFinancialData.configId, validConfigIds)
        );
      }
    }

    const sourceProcessedData = await db
      .select()
      .from(processedFinancialData)
      .where(processedDataWhere);

    for (const processedData of sourceProcessedData) {
      try {
        const newConfigId = configMapping.get(processedData.configId);
        const newFileId = fileMapping.get(processedData.fileId);

        if (!newConfigId || !newFileId) {
          errors.push(`Skipping processed data - missing config or file mapping`);
          continue;
        }

        const newProcessedDataId = crypto.randomUUID();
        
        await db.insert(processedFinancialData).values({
          id: newProcessedDataId,
          companyId: targetCompanyId,
          configId: newConfigId,
          fileId: newFileId,
          dataJson: processedData.dataJson,
          validationResults: processedData.validationResults,
          processingStatus: 'completed', // Copy as completed
          processingError: null,
          periodStart: processedData.periodStart,
          periodEnd: processedData.periodEnd,
          currency: processedData.currency,
          units: processedData.units,
          processedBy: user.id,
        });

        copiedItems.push({
          type: 'processedData',
          sourceId: processedData.id,
          targetId: newProcessedDataId,
          name: `${processedData.periodStart} - ${processedData.periodEnd}`
        });
      } catch (error) {
        errors.push(`Failed to copy processed data: ${error}`);
      }
    }

    // 4. Create copy history record (using raw SQL since table might not exist in schema)
    try {
      await db.execute(sql`
        INSERT INTO copy_history (
          id, source_company_id, target_company_id, copied_by, 
          items_copied, status, created_at
        ) VALUES (
          gen_random_uuid(),
          ${sourceCompanyId},
          ${targetCompanyId}, 
          ${user.id},
          ${JSON.stringify(copiedItems)},
          ${errors.length > 0 ? 'completed_with_errors' : 'completed'},
          NOW()
        )
      `);
    } catch (error) {
      errors.push(`Failed to create copy history: ${error}`);
    }

    return NextResponse.json({
      success: true,
      data: {
        sourceCompany: sourceCompany.name,
        targetCompany: targetCompany.name,
        copiedItems,
        errors,
        summary: {
          configurations: copiedItems.filter(i => i.type === 'configuration').length,
          files: copiedItems.filter(i => i.type === 'file').length,
          processedData: copiedItems.filter(i => i.type === 'processedData').length,
          totalItems: copiedItems.length,
          errorCount: errors.length
        }
      },
    });

  } catch (error) {
    console.error('Copy execute error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to execute copy operation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});