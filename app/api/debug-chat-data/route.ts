import { NextRequest, NextResponse } from "next/server";
import { financialDataAggregator } from "@/lib/services/financial-data-aggregator";

export async function GET(request: NextRequest) {
  try {
    const companyId = "b1dea3ff-cac4-45cc-be78-5488e612c2a8"; // VTEX Solutions SRL
    
    console.log('🔍 DEBUG ENDPOINT - Testing data for VTEX Solutions SRL');
    
    // Get the same data the AI chat uses
    const summary = await financialDataAggregator.getCompanyFinancialSummary(companyId);
    
    const detailedData = await financialDataAggregator.getDetailedFinancialData(companyId, {
      statementTypes: ['profit_loss', 'cash_flow'],
      periodLimit: 6,
    });

    // Extract January data specifically
    const januaryData = detailedData.aggregatedData.periodAnalysis.find(period => 
      period.period.includes('2025-01') || period.period.toLowerCase().includes('january')
    );

    // Get all unique account names and categories from the database
    const allAccountNames = new Set<string>();
    const allCategories = new Set<string>();
    const allSubcategories = new Set<string>();
    const opexRelatedItems: any[] = [];
    const ebitdaRelatedItems: any[] = [];

    for (const statement of detailedData.statements) {
      for (const item of statement.lineItems) {
        allAccountNames.add(item.accountName);
        if (item.category) allCategories.add(item.category);
        if (item.subcategory) allSubcategories.add(item.subcategory);
        
        // Look for OPEX-related items
        if (item.accountName.toLowerCase().includes('opex') || 
            item.accountName.toLowerCase().includes('operating') ||
            item.category?.toLowerCase().includes('operating') ||
            item.subcategory?.toLowerCase().includes('operating')) {
          opexRelatedItems.push({
            name: item.accountName,
            category: item.category,
            subcategory: item.subcategory,
            amount: item.amount
          });
        }
        
        // Look for EBITDA-related items
        if (item.accountName.toLowerCase().includes('ebitda') || 
            item.accountName.toLowerCase().includes('depreciation') ||
            item.accountName.toLowerCase().includes('amortization')) {
          ebitdaRelatedItems.push({
            name: item.accountName,
            category: item.category,
            subcategory: item.subcategory,
            amount: item.amount
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      debug: {
        companyName: summary.companyName,
        totalDataPoints: summary.totalDataPoints,
        statementsFound: {
          pnl: summary.availableStatements.pnl.length,
          cashflow: summary.availableStatements.cashflow.length
        },
        periodAnalysis: detailedData.aggregatedData.periodAnalysis,
        januaryData: januaryData || "January data not found",
        aggregatedTotals: {
          totalRevenue: detailedData.aggregatedData.totalRevenue,
          totalExpenses: detailedData.aggregatedData.totalExpenses,
          netIncome: detailedData.aggregatedData.netIncome
        },
        currency: detailedData.statements[0]?.currency || 'Unknown',
        dataBreakdown: {
          totalUniqueAccounts: allAccountNames.size,
          allCategories: Array.from(allCategories).sort(),
          allSubcategories: Array.from(allSubcategories).sort(),
          sampleAccountNames: Array.from(allAccountNames).slice(0, 20),
          opexRelatedItems,
          ebitdaRelatedItems
        }
      }
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}