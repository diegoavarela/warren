/**
 * Live Cash Flow Data API
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
    console.log('🔍 Live Cash Flow API: Processing request for company', params.companyId);

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

    // Get the active Cash Flow configuration for this company
    const configurations = await configurationService.getConfigurationsByCompany(params.companyId);
    const cashFlowConfig = configurations.find((config: any) => config.type === 'cashflow' && config.isActive);
    
    if (!cashFlowConfig) {
      return NextResponse.json({ 
        error: 'No active Cash Flow configuration found for this company' 
      }, { status: 404 });
    }

    console.log('✅ Found active Cash Flow configuration:', cashFlowConfig.name);
    console.log('📋 Configuration structure check:');
    console.log('- configJson type:', typeof cashFlowConfig.configJson);
    console.log('- configJson exists:', !!cashFlowConfig.configJson);
    
    if (cashFlowConfig.configJson) {
      console.log('- configJson keys:', Object.keys(cashFlowConfig.configJson));
      console.log('- has structure:', !!cashFlowConfig.configJson.structure);
      console.log('- structure type:', typeof cashFlowConfig.configJson.structure);
      if (cashFlowConfig.configJson.structure) {
        console.log('- structure keys:', Object.keys(cashFlowConfig.configJson.structure));
      }
    } else {
      console.error('❌ configJson is null or undefined');
      return NextResponse.json({ 
        error: 'Configuration data is missing or corrupted' 
      }, { status: 500 });
    }

    // Get the Excel file from the database and process it with the configuration
    console.log('🔄 Processing Excel file with live configuration...');
    
    const { db, financialDataFiles } = await import('@/lib/db');
    const { eq, desc } = await import('drizzle-orm');
    
    // Get the appropriate Excel file based on cashflow filename pattern
    const allFiles = await db
      .select({
        fileContent: financialDataFiles.fileContent,
        originalFilename: financialDataFiles.originalFilename
      })
      .from(financialDataFiles)
      .where(eq(financialDataFiles.companyId, params.companyId))
      .orderBy(desc(financialDataFiles.uploadedAt));
    
    // Filter for cash flow files
    const fileResult = allFiles.filter((file: any) => {
      const filename = file.originalFilename.toLowerCase();
      return filename.includes('cashflow') || filename.includes('cash') || filename.includes('flujo');
    }).slice(0, 1);

    if (fileResult.length === 0) {
      return NextResponse.json({ 
        error: 'No Excel files found for this company. Please upload an Excel file first.' 
      }, { status: 404 });
    }

    console.log('📊 Found Excel file, processing with configuration...');

    // Process the Excel file with the current configuration
    // The configJson already has the correct structure from the database
    console.log('🔧 Configuration structure debug:');
    console.log('- Configuration type:', cashFlowConfig.configJson?.type);
    console.log('- Period mapping exists:', !!cashFlowConfig.configJson?.structure?.periodMapping);
    console.log('- Period mapping length:', cashFlowConfig.configJson?.structure?.periodMapping?.length || 0);
    console.log('- Data rows:', Object.keys(cashFlowConfig.configJson?.structure?.dataRows || {}));
    console.log('- File content length:', fileResult[0].fileContent?.length || 0);
    
    console.log('🔄 About to call processExcelWithConfiguration...');
    const selectedSheet = cashFlowConfig.configJson?.metadata?.selectedSheet;
    const processedData = await excelProcessingService.processExcelWithConfiguration(
      fileResult[0].fileContent,
      cashFlowConfig.configJson as any, // Cast to bypass TS type checking for now
      'cashflow',
      selectedSheet // Pass the selected sheet from configuration
    );
    console.log('✅ processExcelWithConfiguration completed successfully');

    console.log('✅ Live processing complete - periods found:', processedData.periods?.length || 0);
    console.log('🔍 Period metadata generated:', !!processedData.periodMetadata);
    console.log('📅 Period metadata details:', processedData.periodMetadata);
    console.log('⚙️ Configuration lastActualPeriod:', cashFlowConfig.configJson?.structure?.lastActualPeriod);
    
    // Debug financial data for the problematic period (August 2025, likely index 7)
    if (processedData.dataRows && processedData.periods?.length > 7) {
      console.log('🐛 API DEBUG - August 2025 financial data (index 7):');
      console.log('- Total Inflows:', processedData.dataRows.totalInflows?.values[7]);
      console.log('- Total Outflows:', processedData.dataRows.totalOutflows?.values[7]);
      console.log('- Net Cash Flow (API):', processedData.dataRows.netCashFlow?.values[7]);
      console.log('- Monthly Generation:', processedData.dataRows.monthlyGeneration?.values[7]);
      console.log('- Final Balance:', processedData.dataRows.finalBalance?.values[7]);
      console.log('- Initial Balance:', processedData.dataRows.initialBalance?.values[7]);
    }
    
    // Helper function to get the last actual period label from configuration
    const getLastActualPeriodLabel = (periodMetadata: any, lastActualPeriod: any): string | null => {
      if (!lastActualPeriod) return null;
      
      // First priority: Generate label from lastActualPeriod configuration
      if (lastActualPeriod.type === 'month' && lastActualPeriod.month && lastActualPeriod.year) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthName = monthNames[lastActualPeriod.month - 1];
        return `${monthName} ${lastActualPeriod.year}`;
      } else if (lastActualPeriod.label) {
        return lastActualPeriod.label;
      }
      
      // Fallback: Look for periods marked as actual in metadata (if any processed data exists)
      if (periodMetadata) {
        const actualPeriods = Object.entries(periodMetadata)
          .filter(([_, meta]: [string, any]) => meta?.isActual)
          .map(([label]) => label);
        
        if (actualPeriods.length > 0) {
          return actualPeriods[actualPeriods.length - 1]; // Return the last actual period
        }
      }
      
      return null;
    };
    
    const lastActualPeriodLabel = getLastActualPeriodLabel(
      processedData.periodMetadata, 
      cashFlowConfig.configJson?.structure?.lastActualPeriod
    );
    
    console.log('🎯 Calculated last actual period label:', lastActualPeriodLabel);
    
    // Transform to dashboard format
    const response = {
      success: true,
      data: {
        periods: processedData.periods || [],
        data: processedData,
        // Explicitly include period metadata for actual vs projected distinction
        periodMetadata: processedData.periodMetadata || {},
        metadata: {
          currency: cashFlowConfig.configJson?.metadata?.currency || 'ARS',
          units: cashFlowConfig.configJson?.metadata?.units || 'normal',
          type: 'cashflow',
          configurationName: cashFlowConfig.name,
          lastActualPeriod: cashFlowConfig.configJson?.structure?.lastActualPeriod,
          lastActualPeriodLabel: lastActualPeriodLabel
        }
      },
      metadata: {
        companyId: params.companyId,
        dataType: 'cashflow',
        periodCount: processedData.periods?.length || 0,
        requestedAt: new Date().toISOString(),
        source: 'live-configuration',
        configurationId: cashFlowConfig.id,
        configurationName: cashFlowConfig.name,
        hasActualData: !!lastActualPeriodLabel,
        actualPeriodsCount: processedData.periodMetadata ? 
          Object.values(processedData.periodMetadata).filter((meta: any) => meta?.isActual).length : 0,
        projectedPeriodsCount: processedData.periodMetadata ? 
          Object.values(processedData.periodMetadata).filter((meta: any) => meta?.isProjected).length : 0
      }
    };

    console.log('✅ Live Cash Flow API: Returning data with', response.data.periods.length, 'periods');
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Live Cash Flow API: Error processing request', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('❌ Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      type: typeof error,
      errorObject: error
    });
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch live Cash Flow data',
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