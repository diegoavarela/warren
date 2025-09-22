/**
 * Live P&L Data API
 * 
 * This endpoint reads the configuration and processes Excel data on-demand,
 * rather than relying on pre-processed data. This ensures the dashboard
 * always shows data according to the current configuration.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server-auth';
import { hasCompanyAccess } from '@/lib/auth/rbac';
import { configurationService } from '@/lib/services/configuration-service';
import { excelProcessingService } from '@/lib/services/excel-processing-service';
import { cacheService } from '@/lib/services/cache-service';
import { logDashboardView } from '@/lib/audit';

export async function GET(
  request: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    // Authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authorization - check company access
    const accessCheck = await hasCompanyAccess(user.id, params.companyId, ['company_admin', 'org_admin', 'platform_admin', 'user']);
    if (!accessCheck) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Clear cache to force fresh data with updated displayUnits
    // TODO: Remove this cache clear after verifying the fix works
    const cacheKey = cacheService.generateKey.pnlData(params.companyId);
    cacheService.delete(cacheKey);
    console.log('🔍 [API DEBUG] Cache cleared for key:', cacheKey, 'at', new Date().toISOString());

    // Check cache first
    const cachedData = cacheService.get(cacheKey);
    
    if (cachedData) {
      return NextResponse.json({
        ...cachedData,
        metadata: {
          ...cachedData.metadata,
          fromCache: true,
          cachedAt: new Date().toISOString()
        }
      });
    }

    // Get the active P&L configuration for this company
    const configurations = await configurationService.getConfigurationsByCompany(params.companyId);
    const pnlConfig = configurations.find((config: any) => config.type === 'pnl' && config.isActive);
    
    if (!pnlConfig) {
      return NextResponse.json({ 
        error: 'No active P&L configuration found for this company',
        hint: 'Create a P&L configuration first to view the P&L dashboard'
      }, { status: 404 });
    }

    // Found active P&L configuration: ${pnlConfig.name}
    
    if (!pnlConfig.configJson) {
      console.error('❌ configJson is null or undefined');
      return NextResponse.json({ 
        error: 'Configuration data is missing or corrupted' 
      }, { status: 500 });
    }

    // Get the Excel file from the database and process it with the configuration
    
    const { db, financialDataFiles } = await import('@/lib/db');
    const { eq, desc } = await import('drizzle-orm');
    
    // Get the appropriate Excel file based on P&L filename pattern
    const allFiles = await db
      .select({
        fileContent: financialDataFiles.fileContent,
        originalFilename: financialDataFiles.originalFilename
      })
      .from(financialDataFiles)
      .where(eq(financialDataFiles.companyId, params.companyId))
      .orderBy(desc(financialDataFiles.uploadedAt));
    
    // Filter for P&L files (exclude cashflow files)
    const fileResult = allFiles.filter((file: any) => {
      const filename = file.originalFilename.toLowerCase();
      // Include files with P&L keywords or exclude files with cashflow keywords
      return filename.includes('pnl') || filename.includes('p&l') || filename.includes('estado') || 
             (!filename.includes('cashflow') && !filename.includes('cash') && !filename.includes('flujo'));
    }).slice(0, 1);

    if (fileResult.length === 0) {
      return NextResponse.json({ 
        error: 'No Excel files found for this company. Please upload an Excel file first.' 
      }, { status: 404 });
    }

    // Process the Excel file with the current configuration
    const selectedSheet = pnlConfig.configJson?.metadata?.selectedSheet;
    const processedData = await excelProcessingService.processExcelWithConfiguration(
      fileResult[0].fileContent!,
      pnlConfig.configJson as any, // Cast to bypass TS type checking for now
      'pnl',
      selectedSheet // Pass the selected sheet from configuration
    );
    // P&L processing completed successfully
    
    // Debug: Log the configuration and processed data units
    console.log('🔍 [API DEBUG] Raw configuration JSON:', JSON.stringify(pnlConfig.configJson, null, 2));
    console.log('🔍 [API DEBUG] Configuration metadata:', JSON.stringify(pnlConfig.configJson?.metadata, null, 2));
    const configUnits = pnlConfig.configJson?.metadata?.units || 'normal';
    console.log('🔍 [API DEBUG] Original configuration units from config:', configUnits);
    console.log('🔍 [API DEBUG] Processed data metadata:', JSON.stringify(processedData?.metadata, null, 2));
    console.log('🔍 [API DEBUG] Sample revenue values (first 3):',
      processedData?.periods?.slice(0, 3)?.map((period: string) =>
        `${period}: ${processedData?.dataRows?.revenue?.values?.[processedData.periods.indexOf(period)] || 'N/A'}`
      ).join(', ') || 'no periods'
    );

    // Get the transformation status from processed data
    const originalUnits = processedData?.metadata?.originalUnits || configUnits;
    const currentUnits = processedData?.metadata?.units || 'normal';
    const wasTransformed = processedData?.metadata?.wasTransformed || false;

    console.log('🔍 [API DEBUG] Units summary:');
    console.log('  - Original units (from config):', configUnits);
    console.log('  - Original units (stored):', originalUnits);
    console.log('  - Current units (after transform):', currentUnits);
    console.log('  - Was transformed:', wasTransformed);

    // Transform to dashboard format
    const response = {
      success: true,
      data: {
        data: processedData,
        currency: pnlConfig.configJson?.metadata?.currency || 'USD',
        // Pass the correct units information to dashboard
        originalUnits: originalUnits, // What units the data was originally in
        currentUnits: currentUnits, // What units the data is in now (after transformation)
        displayUnits: currentUnits, // For backward compatibility, same as currentUnits
        wasTransformed: wasTransformed,
        // Include the processed data structure directly for easier access
        ...processedData,
        metadata: {
          currency: pnlConfig.configJson?.metadata?.currency || 'USD',
          units: currentUnits, // Current units (after transformation)
          originalUnits: originalUnits, // Original units (before transformation)
          displayUnits: currentUnits, // What units the data is actually in now
          numberFormat: pnlConfig.configJson?.metadata?.numberFormat || {
            decimalSeparator: '.',
            thousandsSeparator: ',',
            decimalPlaces: 0
          },
          type: 'pnl',
          configurationName: pnlConfig.name
        }
      },
      metadata: {
        companyId: params.companyId,
        dataType: 'pnl',
        periodCount: processedData.periods?.length || 0,
        requestedAt: new Date().toISOString(),
        source: 'live-configuration',
        configurationId: pnlConfig.id,
        configurationName: pnlConfig.name
      }
    };

    // Log P&L dashboard view
    await logDashboardView(
      'pnl',
      params.companyId,
      user.id,
      request,
      {
        configurationId: pnlConfig.id,
        configurationName: pnlConfig.name,
        periodCount: processedData.periods?.length || 0,
        currency: pnlConfig.configJson?.metadata?.currency || 'USD',
        fromCache: !!cachedData
      }
    );

    // Cache the response for 5 minutes
    cacheService.set(cacheKey, response);
    
    // Returning P&L data with ${response.data.periods.length} periods
    if (processedData.dataRows?.taxes) {
    }
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Live P&L API: Error processing request', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('❌ Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      type: typeof error,
      errorObject: error
    });
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch live P&L data',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { 
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}