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
      fileResult[0].fileContent,
      pnlConfig.configJson as any, // Cast to bypass TS type checking for now
      'pnl',
      selectedSheet // Pass the selected sheet from configuration
    );
    // P&L processing completed successfully
    
    // Transform to dashboard format
    const response = {
      success: true,
      data: {
        data: processedData,
        currency: pnlConfig.configJson?.metadata?.currency || 'USD',
        displayUnits: pnlConfig.configJson?.metadata?.units || 'normal',
        // Include the processed data structure directly for easier access
        ...processedData,
        metadata: {
          currency: pnlConfig.configJson?.metadata?.currency || 'USD',
          units: pnlConfig.configJson?.metadata?.units || 'normal',
          displayUnits: pnlConfig.configJson?.metadata?.units || 'normal',
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

    // Returning P&L data with ${response.data.periods.length} periods
    console.log('📊 [LIVE P&L] Processing complete at', new Date().toISOString());
    console.log('📊 [LIVE P&L] Configuration dataRows:', pnlConfig.configJson?.structure?.dataRows);
    console.log('📊 [LIVE P&L] Processed data has taxes?:', !!processedData.dataRows?.taxes);
    if (processedData.dataRows?.taxes) {
      console.log('📊 [LIVE P&L] Taxes values:', processedData.dataRows.taxes.values);
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