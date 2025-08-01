import { NextRequest, NextResponse } from "next/server";
import { withRBAC, hasPermission, PERMISSIONS } from "@/lib/auth/rbac";
import { financialDataAggregator } from "@/lib/services/financial-data-aggregator";

export async function POST(
  request: NextRequest,
  { params }: { params: { id?: string } }
) {
  return withRBAC(request, async (req, user) => {
    try {
      const body = await req.json();
      const { companyId } = body;

      if (!companyId) {
        return NextResponse.json(
          { error: "Missing companyId" },
          { status: 400 }
        );
      }

      // Validate company access permissions
      if (!hasPermission(user, PERMISSIONS.VIEW_FINANCIAL_DATA, companyId)) {
        return NextResponse.json(
          { 
            error: "Insufficient permissions to access financial data for this company",
            required: PERMISSIONS.VIEW_FINANCIAL_DATA,
            companyId 
          },
          { status: 403 }
        );
      }

      console.log('🔍 Debugging AI Prompt Data for company:', companyId);

      // Get the exact same data that the AI chat service uses
      const summary = await financialDataAggregator.getCompanyFinancialSummary(companyId);
      
      const detailedData = await financialDataAggregator.getDetailedFinancialData(companyId, {
        statementTypes: ['profit_loss', 'cash_flow'],
        periodLimit: 6,
      });

      // Build the exact same prompt that gets sent to AI
      const systemPrompt = `You are a financial analyst for ${summary.companyName}. You have access to the company's financial data and can answer questions about their P&L and Cash Flow statements.

COMPANY CONTEXT:
- Company: ${summary.companyName}
- Available P&L periods: ${summary.availableStatements.pnl.length}
- Available Cash Flow periods: ${summary.availableStatements.cashflow.length}
- Recent periods: ${summary.recentPeriods.join(', ')}
- Total data points: ${summary.totalDataPoints}
- Last updated: ${summary.lastUpdated}

AVAILABLE DATA TYPES:
${summary.availableStatements.pnl.length > 0 ? '✓ Profit & Loss statements' : '✗ No P&L data'}
${summary.availableStatements.cashflow.length > 0 ? '✓ Cash Flow statements' : '✗ No Cash Flow data'}

DETAILED FINANCIAL DATA (Currency: ${detailedData?.statements[0]?.currency || 'ARS'}):
Total Revenue (All Periods): ${detailedData.aggregatedData.totalRevenue.toLocaleString()} ${detailedData?.statements[0]?.currency || 'ARS'}
Total Expenses (All Periods): ${detailedData.aggregatedData.totalExpenses.toLocaleString()} ${detailedData?.statements[0]?.currency || 'ARS'}
Net Income (All Periods): ${detailedData.aggregatedData.netIncome.toLocaleString()} ${detailedData?.statements[0]?.currency || 'ARS'}

IMPORTANT: When user asks about specific periods (like "February revenue"), use ONLY the period-specific data below, NOT the totals above.

PERIOD-SPECIFIC DATA:
${detailedData.aggregatedData.periodAnalysis.slice(0, 6).map(period =>
  `- ${period.period}: Revenue ${period.revenue.toLocaleString()} ${detailedData?.statements[0]?.currency || 'ARS'}, Expenses ${period.expenses.toLocaleString()} ${detailedData?.statements[0]?.currency || 'ARS'}, Net ${period.netIncome.toLocaleString()} ${detailedData?.statements[0]?.currency || 'ARS'}`
).join('\n')}

Top Categories (All Periods):
${detailedData.aggregatedData.topCategories.slice(0, 5).map(cat => 
  `- ${cat.category}: ${cat.amount.toLocaleString()} ${detailedData?.statements[0]?.currency || 'ARS'} (${cat.type})`
).join('\n')}`;

      return NextResponse.json({
        success: true,
        debug: {
          companyId,
          companyName: summary.companyName,
          systemPrompt,
          rawSummary: summary,
          rawDetailedData: detailedData,
          // Extract the key numbers the AI sees
          keyNumbers: {
            totalRevenue: detailedData.aggregatedData.totalRevenue,
            totalExpenses: detailedData.aggregatedData.totalExpenses,
            periodAnalysis: detailedData.aggregatedData.periodAnalysis,
            currency: detailedData?.statements[0]?.currency || 'ARS'
          }
        }
      });

    } catch (error) {
      console.error("Debug AI prompt error:", error);
      
      return NextResponse.json(
        { 
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        },
        { status: 500 }
      );
    }
  });
}