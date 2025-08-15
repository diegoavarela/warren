/**
 * P&L Processed Data API
 * 
 * Provides P&L dashboard data from the configuration-based system.
 * This replaces the old hardcoded financial data sources.
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
    console.log('🔍 P&L API: Processing request for company', params.companyId);

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

    // Get P&L data
    let pnlData;
    if (periodStart && periodEnd) {
      // Get specific period
      const data = await processedDataService.getPeriodData(
        params.companyId,
        new Date(periodStart),
        new Date(periodEnd),
        'pnl'
      );
      pnlData = data ? [data] : [];
    } else {
      // Get recent periods
      pnlData = await processedDataService.getPnLData(params.companyId, limit);
    }

    console.log(`✅ P&L API: Found ${pnlData.length} periods for company ${params.companyId}`);

    // Transform for dashboard compatibility
    const dashboardData = processedDataService.transformForDashboard(pnlData, 'pnl');

    // Add request metadata
    const response = {
      success: true,
      data: dashboardData,
      metadata: {
        companyId: params.companyId,
        dataType: 'pnl',
        periodCount: pnlData.length,
        requestedAt: new Date().toISOString(),
        source: 'processed-data',
        dashboardMetadata: dashboardData.metadata
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ P&L API: Error processing request', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch P&L data',
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