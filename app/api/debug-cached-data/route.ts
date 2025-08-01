import { NextRequest, NextResponse } from "next/server";
import { financialDataAggregator } from '@/lib/services/financial-data-aggregator';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || 'b1dea3ff-cac4-45cc-be78-5488e612c2a8';
    
    console.log('🔍 DEBUG CACHED DATA - Company:', companyId);
    
    // Get the same data that AI chat service gets
    const summary = await financialDataAggregator.getCompanyFinancialSummary(companyId);
    const detailedData = await financialDataAggregator.getDetailedFinancialData(companyId, {
      statementTypes: ['profit_loss'],
      periodLimit: 12,
    });
    
    return NextResponse.json({
      success: true,
      debug: {
        company: summary.companyName,
        totalRevenue: detailedData.aggregatedData.totalRevenue,
        totalExpenses: detailedData.aggregatedData.totalExpenses,
        periodAnalysisCount: detailedData.aggregatedData.periodAnalysis.length,
        periodAnalysisSample: detailedData.aggregatedData.periodAnalysis.slice(0, 3),
        statementsCount: detailedData.statements.length,
        firstStatementSample: detailedData.statements[0] ? {
          period: detailedData.statements[0].period,
          currency: detailedData.statements[0].currency,
          lineItemsCount: detailedData.statements[0].lineItems.length,
          sampleLineItems: detailedData.statements[0].lineItems.slice(0, 5).map(item => ({
            accountName: item.accountName.substring(0, 50) + '...',
            category: item.category,
            amount: item.amount,
            isInflow: item.isInflow
          }))
        } : null
      }
    });

  } catch (error) {
    console.error('Debug cached data error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}