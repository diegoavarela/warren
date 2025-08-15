/**
 * Cash Flow Processed Data API
 * 
 * Provides Cash Flow dashboard data from the configuration-based system.
 * This replaces the old hardcoded cash flow data sources.
 */

import { NextRequest, NextResponse } from 'next/server';
import { processedDataService } from '@/lib/services/processed-data-service';
import { getCurrentUser } from '@/lib/auth/server-auth';
import { hasCompanyAccess } from '@/lib/auth/rbac';

export async function GET(
  request: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    console.log('🔍 Cash Flow API: Processing request for company', params.companyId);

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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '12');
    const periodStart = searchParams.get('periodStart');
    const periodEnd = searchParams.get('periodEnd');

    // Get Cash Flow data
    let cashFlowData;
    let dashboardData;
    
    try {
      console.log(`🔍 Cash Flow API: Fetching data for company ${params.companyId}, limit: ${limit}`);
      
      if (periodStart && periodEnd) {
        // Get specific period
        console.log(`📅 Cash Flow API: Getting specific period ${periodStart} to ${periodEnd}`);
        const data = await processedDataService.getPeriodData(
          params.companyId,
          new Date(periodStart),
          new Date(periodEnd),
          'cashflow'
        );
        cashFlowData = data ? [data] : [];
      } else {
        // Get recent periods
        console.log(`📊 Cash Flow API: Getting recent periods (limit: ${limit})`);
        cashFlowData = await processedDataService.getCashFlowData(params.companyId, limit);
      }

      console.log(`✅ Cash Flow API: Found ${cashFlowData.length} periods for company ${params.companyId}`);
      
      // Debug: Show which configuration(s) are being used for this data
      if (cashFlowData.length > 0) {
        console.log('🔧 Configuration Debug - API is serving data from:');
        cashFlowData.forEach((data, index) => {
          console.log(`- Period ${index + 1}: Config "${data.configurationName}" | Period: ${data.period}`);
        });
      }
      if (cashFlowData.length > 0) {
        console.log(`📈 Cash Flow API: Sample data structure:`, JSON.stringify(cashFlowData[0], null, 2));
      }

      // Transform for dashboard compatibility
      console.log(`🔄 Cash Flow API: Transforming data for dashboard compatibility`);
      dashboardData = processedDataService.transformForDashboard(cashFlowData, 'cashflow');
      console.log(`✅ Cash Flow API: Dashboard transformation complete`);
    } catch (dataError) {
      console.error(`❌ Cash Flow API: Error fetching/transforming data:`, dataError);
      throw dataError;
    }

    // Add request metadata
    const response = {
      success: true,
      data: dashboardData,
      metadata: {
        companyId: params.companyId,
        dataType: 'cashflow',
        periodCount: cashFlowData.length,
        requestedAt: new Date().toISOString(),
        source: 'processed-data',
        dashboardMetadata: dashboardData.metadata
      }
    };

      return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Cash Flow API: Error processing request', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch Cash Flow data',
      details: error instanceof Error ? error.message : 'Unknown error'
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