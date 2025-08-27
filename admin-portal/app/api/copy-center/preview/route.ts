import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/shared/db';
import { 
  companies, 
  organizations, 
  companyConfigurations, 
  financialDataFiles,
  processedFinancialData,
  users 
} from '@/shared/db/actual-schema';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth-middleware';

// POST /api/copy-center/preview - Preview copy operation
export const POST = requireAuth(async (request: NextRequest) => {
  try {
    const { sourceCompanyId, targetCompanyId, selectedConfigIds } = await request.json();
    
    // Debug logging
    console.log('Preview API received:', { 
      sourceCompanyId, 
      targetCompanyId, 
      selectedConfigIds,
      selectedConfigIdsType: typeof selectedConfigIds,
      selectedConfigIdsLength: selectedConfigIds?.length 
    });

    if (!sourceCompanyId || !targetCompanyId) {
      return NextResponse.json(
        { success: false, error: 'Source company and target company are required' },
        { status: 400 }
      );
    }

    // Verify source company exists
    const [sourceCompany] = await db
      .select({
        id: companies.id,
        name: companies.name,
        organizationId: companies.organizationId,
        organizationName: organizations.name,
      })
      .from(companies)
      .leftJoin(organizations, eq(companies.organizationId, organizations.id))
      .where(eq(companies.id, sourceCompanyId))
      .limit(1);

    if (!sourceCompany) {
      return NextResponse.json(
        { success: false, error: 'Source company not found' },
        { status: 404 }
      );
    }

    // Verify target company exists
    const [targetCompany] = await db
      .select({
        id: companies.id,
        name: companies.name,
        organizationId: companies.organizationId,
        organizationName: organizations.name,
      })
      .from(companies)
      .leftJoin(organizations, eq(companies.organizationId, organizations.id))
      .where(eq(companies.id, targetCompanyId))
      .limit(1);

    if (!targetCompany) {
      return NextResponse.json(
        { success: false, error: 'Target company not found' },
        { status: 404 }
      );
    }

    // Get configurations to copy (filter by selected IDs if provided)
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

    const configurations = await db
      .select({
        id: companyConfigurations.id,
        name: companyConfigurations.name,
        type: companyConfigurations.type,
        isActive: companyConfigurations.isActive,
        createdAt: companyConfigurations.createdAt,
      })
      .from(companyConfigurations)
      .where(configWhere)
      .orderBy(companyConfigurations.createdAt);

    // Get data files to copy
    const dataFiles = await db
      .select({
        id: financialDataFiles.id,
        filename: financialDataFiles.filename,
        originalFilename: financialDataFiles.originalFilename,
        fileSize: financialDataFiles.fileSize,
        uploadedAt: financialDataFiles.uploadedAt,
      })
      .from(financialDataFiles)
      .where(eq(financialDataFiles.companyId, sourceCompanyId))
      .orderBy(financialDataFiles.uploadedAt);

    // Get processed data to copy (filter by selected configurations)
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

    const processedData = await db
      .select({
        id: processedFinancialData.id,
        periodStart: processedFinancialData.periodStart,
        periodEnd: processedFinancialData.periodEnd,
        dataType: sql<string>`CASE 
          WHEN ${processedFinancialData.configId} IN (
            SELECT ${companyConfigurations.id} FROM ${companyConfigurations} 
            WHERE ${companyConfigurations.type} = 'pnl'
          ) THEN 'P&L'
          ELSE 'Cash Flow'
        END`,
        processedAt: processedFinancialData.processedAt,
      })
      .from(processedFinancialData)
      .where(processedDataWhere)
      .orderBy(processedFinancialData.processedAt);

    // Calculate estimated size
    const totalFileSize = dataFiles.reduce((sum, file) => sum + (file.fileSize || 0), 0);
    const estimatedSize = formatFileSize(totalFileSize);

    // Check for potential conflicts
    const conflicts: string[] = [];

    // Check if target company already has configurations
    const [existingConfigsInTarget] = await db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(companyConfigurations)
      .where(
        and(
          eq(companyConfigurations.companyId, targetCompanyId),
          eq(companyConfigurations.isActive, true)
        )
      );

    if (existingConfigsInTarget.count > 0) {
      conflicts.push(`Target company already has ${existingConfigsInTarget.count} existing configurations that may conflict`);
    }

    // Check for naming conflicts
    const configNames = configurations.map(c => c.name);
    if (configNames.length !== new Set(configNames).size) {
      conflicts.push('Source company has duplicate configuration names that need to be resolved');
    }

    // Check for large file sizes
    const largeFiles = dataFiles.filter(f => f.fileSize > 50 * 1024 * 1024); // > 50MB
    if (largeFiles.length > 0) {
      conflicts.push(`${largeFiles.length} files are larger than 50MB and may take time to copy`);
    }

    const previewData = {
      sourceCompany,
      targetCompany,
      configurations,
      dataFiles,
      processedData,
      estimatedSize,
      conflicts,
    };

    return NextResponse.json({
      success: true,
      data: previewData,
    });
  } catch (error) {
    console.error('Copy preview error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate copy preview' },
      { status: 500 }
    );
  }
});

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}