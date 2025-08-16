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
    console.log('🔍 Live P&L API: Processing request for company', params.companyId);

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

    console.log('✅ Found active P&L configuration:', pnlConfig.name);
    console.log('🔍 Configuration details:', {
      id: pnlConfig.id,
      name: pnlConfig.name,
      createdAt: pnlConfig.createdAt,
      createdBy: pnlConfig.createdBy,
      isActive: pnlConfig.isActive
    });
    console.log('📋 Configuration structure check:');
    console.log('- configJson type:', typeof pnlConfig.configJson);
    console.log('- configJson exists:', !!pnlConfig.configJson);
    
    if (pnlConfig.configJson) {
      console.log('- configJson keys:', Object.keys(pnlConfig.configJson));
      console.log('- has structure:', !!pnlConfig.configJson.structure);
      console.log('- structure type:', typeof pnlConfig.configJson.structure);
      if (pnlConfig.configJson.structure) {
        console.log('- structure keys:', Object.keys(pnlConfig.configJson.structure));
      }
    } else {
      console.error('❌ configJson is null or undefined');
      return NextResponse.json({ 
        error: 'Configuration data is missing or corrupted' 
      }, { status: 500 });
    }

    // Get the Excel file from the database and process it with the configuration
    console.log('🔄 Processing Excel file with live P&L configuration...');
    
    const { db, financialDataFiles } = await import('@/lib/db');
    const { eq, desc } = await import('drizzle-orm');
    
    const fileResult = await db
      .select({
        fileContent: financialDataFiles.fileContent
      })
      .from(financialDataFiles)
      .where(eq(financialDataFiles.companyId, params.companyId))
      .orderBy(desc(financialDataFiles.uploadedAt))
      .limit(1);

    if (fileResult.length === 0) {
      return NextResponse.json({ 
        error: 'No Excel files found for this company. Please upload an Excel file first.' 
      }, { status: 404 });
    }

    console.log('📊 Found Excel file, processing with P&L configuration...');

    // Process the Excel file with the current configuration
    // The configJson already has the correct structure from the database
    console.log('🔧 P&L Configuration structure debug:');
    console.log('- Configuration type:', pnlConfig.configJson?.type);
    console.log('- Period mapping exists:', !!pnlConfig.configJson?.structure?.periodMapping);
    console.log('- Period mapping length:', pnlConfig.configJson?.structure?.periodMapping?.length || 0);
    console.log('- Data rows:', Object.keys(pnlConfig.configJson?.structure?.dataRows || {}));
    console.log('- File content length:', fileResult[0].fileContent?.length || 0);
    
    console.log('🔄 About to call processExcelWithConfiguration for P&L...');
    const processedData = await excelProcessingService.processExcelWithConfiguration(
      fileResult[0].fileContent,
      pnlConfig.configJson as any, // Cast to bypass TS type checking for now
      'pnl'
    );
    console.log('✅ processExcelWithConfiguration completed successfully for P&L');

    console.log('✅ Live P&L processing complete - periods found:', processedData.periods?.length || 0);
    
    // Transform to dashboard format
    const response = {
      success: true,
      data: {
        periods: processedData.periods || [],
        data: processedData,
        metadata: {
          currency: pnlConfig.configJson?.metadata?.currency || 'USD',
          units: pnlConfig.configJson?.metadata?.units || 'normal',
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

    console.log('✅ Live P&L API: Returning data with', response.data.periods.length, 'periods');
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