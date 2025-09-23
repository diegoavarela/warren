/**
 * Debug P&L Report Endpoint
 *
 * Direct QuickBooks API calls to understand why P&L is showing zero
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

    console.log('🔍 [QuickBooks Debug] Starting P&L debug for realm:', realmId);

    // Test specific date range where we know transactions exist
    const dateRange = '2025-08-01_to_2025-08-31';

    console.log('🔍 [QuickBooks Debug] Testing date range:', dateRange);

    // Call ProfitAndLoss report directly
    const pnlResponse = await callQuickBooksAPI(
      realmId,
      `reports/ProfitAndLoss?start_date=2025-08-01&end_date=2025-08-31`
    );

    console.log('🔍 [QuickBooks Debug] P&L Response structure:', {
      reportName: pnlResponse?.ReportName,
      hasRows: !!pnlResponse?.Rows,
      rowsLength: pnlResponse?.Rows?.length,
      hasHeader: !!pnlResponse?.Header,
      hasColumns: !!pnlResponse?.Columns
    });

    // Call ProfitAndLossDetail report directly
    const pnlDetailResponse = await callQuickBooksAPI(
      realmId,
      `reports/ProfitAndLossDetail?start_date=2025-08-01&end_date=2025-08-31`
    );

    console.log('🔍 [QuickBooks Debug] P&L Detail Response structure:', {
      reportName: pnlDetailResponse?.ReportName,
      hasRows: !!pnlDetailResponse?.Rows,
      rowsLength: pnlDetailResponse?.Rows?.length,
      hasHeader: !!pnlDetailResponse?.Header,
      hasColumns: !!pnlDetailResponse?.Columns
    });

    // Also check all invoices in August 2025
    const invoicesResponse = await callQuickBooksAPI(
      realmId,
      `query?query=SELECT * FROM Invoice WHERE TxnDate >= '2025-08-01' AND TxnDate <= '2025-08-31'`
    );

    const august2025Invoices = invoicesResponse?.QueryResponse?.Invoice || [];

    console.log('🔍 [QuickBooks Debug] August 2025 invoices:', august2025Invoices.length);

    return NextResponse.json({
      success: true,
      debug: {
        dateRange,
        pnlReport: {
          reportName: pnlResponse?.ReportName,
          hasData: !!pnlResponse?.Rows && pnlResponse.Rows.length > 0,
          fullResponse: pnlResponse
        },
        pnlDetailReport: {
          reportName: pnlDetailResponse?.ReportName,
          hasData: !!pnlDetailResponse?.Rows && pnlDetailResponse.Rows.length > 0,
          fullResponse: pnlDetailResponse
        },
        invoicesInPeriod: {
          count: august2025Invoices.length,
          invoices: august2025Invoices.map((inv: any) => ({
            id: inv.Id,
            docNumber: inv.DocNumber,
            totalAmt: inv.TotalAmt,
            txnDate: inv.TxnDate,
            balance: inv.Balance
          }))
        }
      }
    });

  } catch (error) {
    console.error('❌ [QuickBooks Debug] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}