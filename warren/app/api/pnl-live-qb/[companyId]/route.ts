/**
 * Enhanced P&L Data API with QuickBooks Integration
 * 
 * This endpoint prioritizes QuickBooks data over Excel data:
 * 1. Check for active QB connection
 * 2. If QB available, fetch and transform QB data
 * 3. If no QB or QB fails, fallback to Excel processing
 * 4. Return data in same format as existing P&L API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server-auth';
import { hasCompanyAccess } from '@/lib/auth/rbac';
import { configurationService } from '@/lib/services/configuration-service';
import { excelProcessingService } from '@/lib/services/excel-processing-service';
import { cacheService } from '@/lib/services/cache-service';
import { logDashboardView } from '@/lib/audit';

// QB imports
import { createQuickBooksClient } from '@/lib/quickbooks/client';
import { createQuickBooksTransformer } from '@/lib/quickbooks/transformer';
import { db, quickbooksConnections, eq, and } from '@/shared/db';

interface QBDataSource {
  source: 'quickbooks';
  connection: any;
  data: any;
  lastSync: string;
}

interface ExcelDataSource {
  source: 'excel';
  configuration: any;
  data: any;
  filename: string;
}

type DataSource = QBDataSource | ExcelDataSource;

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

    // Check cache first
    const cacheKey = cacheService.generateKey.pnlData(params.companyId);
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

    console.log('🔍 Checking data sources for company:', params.companyId);

    // Step 1: Check for QuickBooks connection
    let dataSource: DataSource | null = null;
    
    try {
      dataSource = await getQuickBooksDataSource(params.companyId);
      if (dataSource) {
        console.log('✅ QuickBooks data source available');
      }
    } catch (error) {
      console.log('⚠️ QuickBooks data source failed:', error.message);
    }

    // Step 2: Fallback to Excel if no QB data
    if (!dataSource) {
      try {
        dataSource = await getExcelDataSource(params.companyId);
        if (dataSource) {
          console.log('✅ Excel data source available');
        }
      } catch (error) {
        console.log('⚠️ Excel data source failed:', error.message);
      }
    }

    // Step 3: Return error if no data sources available
    if (!dataSource) {
      return NextResponse.json({ 
        error: 'No data sources available',
        hint: 'Connect to QuickBooks or upload an Excel file with P&L configuration'
      }, { status: 404 });
    }

    // Step 4: Process and return data
    console.log('📊 Processing data from source:', dataSource.source);
    
    const response = {
      success: true,
      data: {
        data: dataSource.data,
        currency: dataSource.source === 'quickbooks' ? 'USD' : 'USD', // TODO: Get from QB company info
        displayUnits: 'normal',
        ...dataSource.data,
        metadata: {
          currency: 'USD',
          units: 'normal',
          displayUnits: 'normal',
          type: 'pnl',
          source: dataSource.source,
          ...(dataSource.source === 'quickbooks' && {
            qbCompanyId: dataSource.connection.qbCompanyId,
            lastSync: dataSource.lastSync
          }),
          ...(dataSource.source === 'excel' && {
            configurationName: dataSource.configuration.name,
            filename: dataSource.filename
          })
        }
      },
      metadata: {
        companyId: params.companyId,
        dataType: 'pnl',
        periodCount: dataSource.data.periods?.length || 0,
        requestedAt: new Date().toISOString(),
        source: dataSource.source,
        ...(dataSource.source === 'quickbooks' && {
          qbConnectionId: dataSource.connection.id,
          qbCompanyName: dataSource.connection.companyName,
          lastSyncAt: dataSource.lastSync
        }),
        ...(dataSource.source === 'excel' && {
          configurationId: dataSource.configuration.id,
          configurationName: dataSource.configuration.name,
          excelFilename: dataSource.filename
        })
      }
    };

    // Log dashboard view with source information
    await logDashboardView(
      'pnl',
      params.companyId,
      user.id,
      request,
      {
        dataSource: dataSource.source,
        periodCount: dataSource.data.periods?.length || 0,
        currency: 'USD',
        fromCache: false
      }
    );

    // Cache the response for 5 minutes (or less for QB data)
    const cacheTime = dataSource.source === 'quickbooks' ? 300 : 600; // 5min vs 10min
    cacheService.set(cacheKey, response, cacheTime);
    
    console.log('✅ Returning P&L data from', dataSource.source, 'with', response.data.periods?.length || 0, 'periods');
    
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Enhanced P&L API: Error processing request', error);
    console.error('❌ Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch P&L data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Get data from QuickBooks if connection is active
 */
async function getQuickBooksDataSource(companyId: string): Promise<QBDataSource | null> {
  console.log('🔗 Checking QuickBooks connection for company:', companyId);
  
  // Get active QB connection
  const qbConnections = await db
    .select()
    .from(quickbooksConnections)
    .where(
      and(
        eq(quickbooksConnections.companyId, companyId),
        eq(quickbooksConnections.isActive, true)
      )
    )
    .limit(1);

  if (qbConnections.length === 0) {
    console.log('⚠️ No active QuickBooks connection found');
    return null;
  }

  const connection = qbConnections[0];
  console.log('✅ Found QB connection:', connection.companyName);

  // Check if token is expired (with 5-minute buffer)
  const now = new Date();
  const expiresWithBuffer = new Date(connection.expiresAt.getTime() - 5 * 60 * 1000);
  
  if (now > expiresWithBuffer) {
    console.log('⚠️ QuickBooks token expired, needs refresh');
    throw new Error('QuickBooks connection expired. Please reconnect.');
  }

  // Create QB client and fetch P&L data
  const qbClient = createQuickBooksClient(
    connection.accessToken,
    connection.qbCompanyId,
    connection.environment === 'sandbox'
  );

  console.log('📊 Fetching P&L report from QuickBooks...');
  
  // Get P&L for last 12 months
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const plReport = await qbClient.getProfitLossReport(startDate, endDate, {
    summarizeColumnsBy: 'Month',
    accounting_method: 'Accrual'
  });

  console.log('✅ P&L report fetched, transforming data...');

  // Transform QB data to Warren format
  const transformer = createQuickBooksTransformer();
  const transformResult = await transformer.transformProfitLoss(plReport, companyId);

  if (!transformResult.success) {
    throw new Error(`QB data transformation failed: ${transformResult.error}`);
  }

  console.log('✅ QB data transformed successfully');

  // Update last sync time
  await db
    .update(quickbooksConnections)
    .set({ 
      lastSyncAt: new Date(),
      syncStatus: 'success'
    })
    .where(eq(quickbooksConnections.id, connection.id));

  return {
    source: 'quickbooks',
    connection: connection,
    data: transformResult.data,
    lastSync: new Date().toISOString()
  };
}

/**
 * Get data from Excel configuration (fallback)
 */
async function getExcelDataSource(companyId: string): Promise<ExcelDataSource | null> {
  console.log('📄 Checking Excel configuration for company:', companyId);
  
  // Get the active P&L configuration for this company
  const configurations = await configurationService.getConfigurationsByCompany(companyId);
  const pnlConfig = configurations.find((config: any) => config.type === 'pnl' && config.isActive);
  
  if (!pnlConfig) {
    console.log('⚠️ No active P&L configuration found');
    return null;
  }

  console.log('✅ Found P&L configuration:', pnlConfig.name);

  if (!pnlConfig.configJson) {
    throw new Error('Configuration data is missing or corrupted');
  }

  // Get the Excel file from the database and process it with the configuration
  const { db: dbConn, financialDataFiles } = await import('@/lib/db');
  const { eq: eqOp, desc } = await import('drizzle-orm');
  
  // Get the appropriate Excel file based on P&L filename pattern
  const allFiles = await dbConn
    .select({
      fileContent: financialDataFiles.fileContent,
      originalFilename: financialDataFiles.originalFilename
    })
    .from(financialDataFiles)
    .where(eqOp(financialDataFiles.companyId, companyId))
    .orderBy(desc(financialDataFiles.uploadedAt));
  
  // Filter for P&L files (exclude cashflow files)
  const fileResult = allFiles.filter((file: any) => {
    const filename = file.originalFilename.toLowerCase();
    // Include files with P&L keywords or exclude files with cashflow keywords
    return filename.includes('pnl') || filename.includes('p&l') || filename.includes('estado') || 
           (!filename.includes('cashflow') && !filename.includes('cash') && !filename.includes('flujo'));
  }).slice(0, 1);

  if (fileResult.length === 0) {
    throw new Error('No Excel files found for this company');
  }

  console.log('✅ Found Excel file:', fileResult[0].originalFilename);
  console.log('📊 Processing Excel with configuration...');

  // Process the Excel file with the current configuration
  const selectedSheet = pnlConfig.configJson?.metadata?.selectedSheet;
  const processedData = await excelProcessingService.processExcelWithConfiguration(
    fileResult[0].fileContent!,
    pnlConfig.configJson as any,
    'pnl',
    selectedSheet
  );

  console.log('✅ Excel data processed successfully');

  return {
    source: 'excel',
    configuration: pnlConfig,
    data: processedData,
    filename: fileResult[0].originalFilename
  };
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