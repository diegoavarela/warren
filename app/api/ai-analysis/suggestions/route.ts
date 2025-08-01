import { NextRequest, NextResponse } from "next/server";
import { withRBAC, hasPermission, PERMISSIONS } from "@/lib/auth/rbac";
import { financialDataAggregator } from "@/lib/services/financial-data-aggregator-v2";

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

      console.log(`💡 Getting query suggestions for company: ${companyId}`);

      // Generate contextual query suggestions
      const suggestions = financialDataAggregator.generateQuerySuggestions(companyId);

      console.log(`✅ Generated ${suggestions.length} query suggestions`);

      return NextResponse.json({
        success: true,
        data: {
          suggestions,
          companyId,
          generatedAt: new Date().toISOString()
        },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error("AI Analysis suggestions error:", error);

      return NextResponse.json(
        { 
          success: false,
          error: "Failed to generate query suggestions",
          message: error instanceof Error ? error.message : "Please try again in a moment.",
          fallback: {
            suggestions: [
              "What was our total revenue?",
              "Show me our biggest expense categories",
              "Calculate our EBITDA",
              "Create a chart showing monthly revenue",
              "How is our profitability trending?",
              "What are our operating expenses?"
            ]
          }
        },
        { status: 500 }
      );
    }
  });
}