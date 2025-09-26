/**

export const dynamic = 'force-dynamic';
 * Raw P&L Response Endpoint
 *
 * Shows exactly what QuickBooks API returns (no processing)
 */

import { NextRequest, NextResponse } from 'next/server';
import { callQuickBooksAPI } from '@/lib/services/quickbooks-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const realmId = searchParams.get('realmId');

    if (!realmId) {
      return NextResponse.json({
        error: 'realmId parameter is required'
      }, { status: 400 });
    }

    console.log('🔍 [Raw P&L] Fetching raw P&L data for realm:', realmId);

    // Test with August 2025 where we know there are invoices
    const startDate = '2025-08-01';
    const endDate = '2025-08-31';

    console.log('🔍 [Raw P&L] Date range:', startDate, 'to', endDate);

    // Get both regular and detail reports
    const pnlRegular = await callQuickBooksAPI(
      realmId,
      `reports/ProfitAndLoss?start_date=${startDate}&end_date=${endDate}`
    );

    const pnlDetail = await callQuickBooksAPI(
      realmId,
      `reports/ProfitAndLossDetail?start_date=${startDate}&end_date=${endDate}`
    );

    console.log('✅ [Raw P&L] Both reports fetched successfully');

    return NextResponse.json({
      success: true,
      dateRange: { startDate, endDate },
      reports: {
        regular: pnlRegular,
        detail: pnlDetail
      },
      analysis: {
        regular: {
          reportName: pnlRegular?.ReportName,
          hasRows: !!pnlRegular?.Rows,
          rowCount: pnlRegular?.Rows?.length || 0,
          hasColumns: !!pnlRegular?.Columns,
          columnCount: pnlRegular?.Columns?.length || 0
        },
        detail: {
          reportName: pnlDetail?.ReportName,
          hasRows: !!pnlDetail?.Rows,
          rowCount: pnlDetail?.Rows?.length || 0,
          hasColumns: !!pnlDetail?.Columns,
          columnCount: pnlDetail?.Columns?.length || 0
        }
      }
    });

  } catch (error) {
    console.error('❌ [Raw P&L] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}