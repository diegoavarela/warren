import { NextRequest, NextResponse } from "next/server";
import { db, companies, financialStatements, financialLineItems, eq, desc } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debugging AI Financial Data Access...');

    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      companies: [],
      statements: [],
      februaryData: [],
      summary: {}
    };

    // 1. Check companies in database
    console.log('1. Checking companies...');
    const allCompanies = await db.select().from(companies);
    debugInfo.companies = allCompanies.map((c: any) => ({
      id: c.id,
      name: c.name,
      organizationId: c.organizationId,
      isActive: c.isActive
    }));

    // 2. Check financial statements for each company
    console.log('2. Checking financial statements...');
    for (const company of allCompanies) {
      const statements = await db
        .select()
        .from(financialStatements)
        .where(eq(financialStatements.companyId, company.id))
        .orderBy(desc(financialStatements.periodEnd));
      
      for (const stmt of statements) {
        // Get line items count
        const lineItems = await db
          .select()
          .from(financialLineItems)
          .where(eq(financialLineItems.statementId, stmt.id));

        debugInfo.statements.push({
          companyName: company.name,
          companyId: company.id,
          statementId: stmt.id,
          statementType: stmt.statementType,
          period: `${stmt.periodStart} to ${stmt.periodEnd}`,
          currency: stmt.currency,
          lineItemsCount: lineItems.length,
          sourceFile: stmt.sourceFile
        });

        // Check for February data specifically
        if (stmt.periodStart?.includes('2025-02') || stmt.periodEnd?.includes('2025-02')) {
          let totalPositive = 0;
          let totalNegative = 0;
          const sampleItems: any[] = [];

          for (const item of lineItems.slice(0, 10)) { // First 10 items as sample
            const amount = parseFloat(item.amount.toString());
            if (amount > 0) totalPositive += amount;
            if (amount < 0) totalNegative += Math.abs(amount);

            sampleItems.push({
              accountName: item.accountName.startsWith('enc_') ? '[ENCRYPTED]' : item.accountName,
              amount: amount,
              category: item.category,
              subcategory: item.subcategory
            });
          }

          debugInfo.februaryData.push({
            companyName: company.name,
            statementType: stmt.statementType,
            currency: stmt.currency,
            totalPositiveAmounts: totalPositive,
            totalNegativeAmounts: totalNegative,
            lineItemsCount: lineItems.length,
            sampleItems
          });
        }
      }
    }

    // 3. Summary statistics
    debugInfo.summary = {
      totalCompanies: allCompanies.length,
      totalStatements: debugInfo.statements.length,
      februaryStatements: debugInfo.februaryData.length,
      currencies: Array.from(new Set(debugInfo.statements.map((s: any) => s.currency))),
      statementTypes: Array.from(new Set(debugInfo.statements.map((s: any) => s.statementType)))
    };

    // 4. Check for any hardcoded values around 150000
    const potentialMockData = debugInfo.februaryData.filter((feb: any) => 
      Math.abs(feb.totalPositiveAmounts - 150000) < 1000 || 
      feb.sampleItems.some((item: any) => Math.abs(item.amount - 150000) < 1000)
    );

    if (potentialMockData.length > 0) {
      debugInfo.suspiciousMockData = potentialMockData;
    }

    console.log('✅ Debug complete');
    
    return NextResponse.json({
      success: true,
      debug: debugInfo
    });

  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}