/**
 * Company Summary API
 * 
 * Provides summary statistics for a company's processed data.
 * Useful for dashboard overview and data availability checks.
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
    console.log('🔍 Summary API: Processing request for company', params.companyId);

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

    // Get company summary
    const summary = await processedDataService.getCompanySummary(params.companyId);

    console.log(`✅ Summary API: Found ${summary.length} data types for company ${params.companyId}`);

    // Calculate overall statistics
    const totalPeriods = summary.reduce((sum, s) => sum + s.periodCount, 0);
    const availableTypes = summary.map(s => s.type);
    const latestUpdate = summary.reduce((latest, s) => {
      const date = new Date(s.latestPeriod + '-01');
      return date > latest ? date : latest;
    }, new Date(0));

    const response = {
      success: true,
      data: {
        companyId: params.companyId,
        summary,
        overview: {
          totalPeriods,
          availableTypes,
          latestUpdate: latestUpdate.toISOString().split('T')[0],
          hasData: totalPeriods > 0,
          dataTypes: {
            pnl: summary.find(s => s.type === 'pnl')?.periodCount || 0,
            cashflow: summary.find(s => s.type === 'cashflow')?.periodCount || 0
          }
        }
      },
      metadata: {
        requestedAt: new Date().toISOString(),
        source: 'processed-data'
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Summary API: Error processing request', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch summary',
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