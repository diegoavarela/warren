import { NextRequest, NextResponse } from "next/server";
import { withRBAC, hasPermission, PERMISSIONS } from "@/lib/auth/rbac";
import { db, financialLineItems, financialStatements, eq } from "@/lib/db";

export async function GET(request: NextRequest) {
  return withRBAC(request, async (req, user) => {
    try {
      const url = new URL(request.url);
      const companyId = url.searchParams.get('companyId');

      if (!companyId) {
        return NextResponse.json(
          { error: "Missing required parameter: companyId" },
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

      // Get financial statements for the company
      const statements = await db
        .select()
        .from(financialStatements)
        .where(eq(financialStatements.companyId, companyId));

      if (statements.length === 0) {
        return NextResponse.json({
          success: false,
          error: `No financial statements found for company: ${companyId}`
        }, { status: 404 });
      }

      // Get sample line items to analyze categories
      const statementIds = statements.map((s: any) => s.id);
      const sampleItems = await db
        .select({
          id: financialLineItems.id,
          accountName: financialLineItems.accountName,
          category: financialLineItems.category,
          subcategory: financialLineItems.subcategory,
          amount: financialLineItems.amount,
          statementId: financialLineItems.statementId
        })
        .from(financialLineItems)
        .where(eq(financialLineItems.statementId, statementIds[0]))
        .limit(50);

      // Get all unique categories from all line items
      const allItems = await db
        .select({
          category: financialLineItems.category,
          amount: financialLineItems.amount
        })
        .from(financialLineItems)
        .where(eq(financialLineItems.statementId, statementIds[0]));

      const categoryAnalysis = allItems.reduce((acc: any, item: any) => {
        const category = item.category || 'uncategorized';
        if (!acc[category]) {
          acc[category] = { count: 0, totalAmount: 0, items: [] };
        }
        acc[category].count++;
        acc[category].totalAmount += Number(item.amount) || 0;
        if (acc[category].items.length < 3) {
          acc[category].items.push(Number(item.amount));
        }
        return acc;
      }, {} as Record<string, { count: number; totalAmount: number; items: number[] }>);

      const problematicCategories = Object.keys(categoryAnalysis).filter(cat =>
        ['total', 'calculation', 'margin', 'earnings_before_tax', 'net_income'].includes(cat)
      );

      return NextResponse.json({
        success: true,
        data: {
          companyId,
          statementCount: statements.length,
          totalLineItems: allItems.length,
          sampleItems: sampleItems.slice(0, 10).map((item: any) => ({
            accountName: typeof item.accountName === 'string' && item.accountName.includes(':') 
              ? '[ENCRYPTED]' 
              : item.accountName,
            category: item.category,
            amount: item.amount
          })),
          categoryAnalysis,
          problematicCategories: problematicCategories.map(cat => ({
            category: cat,
            ...categoryAnalysis[cat]
          })),
          allCategories: Object.keys(categoryAnalysis).sort(),
          summary: {
            totalCategories: Object.keys(categoryAnalysis).length,
            hasProblematicCategories: problematicCategories.length > 0,
            problematicCount: problematicCategories.length
          }
        }
      });

    } catch (error) {
      console.error("Debug categories error:", error);
      return NextResponse.json(
        { 
          success: false,
          error: "Failed to analyze categories",
          message: error instanceof Error ? error.message : "Please try again in a moment.",
        },
        { status: 500 }
      );
    }
  });
}