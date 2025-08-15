/**
 * Company Periods API
 * 
 * Provides available periods for a company across all configurations.
 * Used for period selectors in dashboards.
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
    console.log('🔍 Periods API: Processing request for company', params.companyId);

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
    const type = searchParams.get('type') as 'pnl' | 'cashflow' | null;

    // Get available periods
    const periods = await processedDataService.getAvailablePeriods(params.companyId, type || undefined);

    console.log(`✅ Periods API: Found ${periods.length} periods for company ${params.companyId}`);

    // Group by type for easier consumption
    const groupedPeriods = periods.reduce((acc, period) => {
      if (!acc[period.type]) {
        acc[period.type] = [];
      }
      acc[period.type].push({
        period: period.period,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd
      });
      return acc;
    }, {} as Record<string, Array<{ period: string; periodStart: Date; periodEnd: Date }>>);

    const response = {
      success: true,
      data: {
        companyId: params.companyId,
        periods: type ? periods : groupedPeriods,
        totalCount: periods.length,
        types: Array.from(new Set(periods.map(p => p.type)))
      },
      metadata: {
        requestedAt: new Date().toISOString(),
        type: type || 'all',
        source: 'processed-data'
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Periods API: Error processing request', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch periods',
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