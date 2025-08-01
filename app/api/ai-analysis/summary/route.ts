import { NextRequest, NextResponse } from "next/server";
import { withRBAC, hasPermission, PERMISSIONS } from "@/lib/auth/rbac";
import { aiAnalysisService } from "@/lib/services/ai-analysis-service";
import { z } from "zod";

// Validation schema
const DataSummarySchema = z.object({
  companyId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  return withRBAC(request, async (req, user) => {
    try {
      console.log('📊 AI Analysis Data Summary Request');

      const body = await req.json();
      const validatedData = DataSummarySchema.parse(body);
      const { companyId } = validatedData;

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

      console.log(`📈 Getting data summary for company: ${companyId}`);

      // Get comprehensive data summary
      const dataSummary = await aiAnalysisService.getDataSummary(companyId);

      console.log(`✅ Data summary retrieved`, {
        hasData: dataSummary.hasData,
        totalDataPoints: dataSummary.summary?.totalDataPoints,
        periodsAvailable: dataSummary.summary?.periodsAvailable.length,
        suggestionsCount: dataSummary.suggestions.length
      });

      return NextResponse.json({
        success: true,
        data: dataSummary,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error("AI Analysis data summary error:", error);
      
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { 
            success: false,
            error: "Invalid request data",
            details: error.errors,
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { 
          success: false,
          error: "Failed to retrieve data summary",
          message: error instanceof Error ? error.message : "Please try again in a moment.",
          fallback: true
        },
        { status: 500 }
      );
    }
  });
}

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

      console.log(`📊 GET data summary for company: ${companyId}`);

      // Get data summary
      const dataSummary = await aiAnalysisService.getDataSummary(companyId);

      return NextResponse.json({
        success: true,
        data: dataSummary,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error("AI Analysis GET data summary error:", error);

      return NextResponse.json(
        { 
          success: false,
          error: "Failed to retrieve data summary",
          message: error instanceof Error ? error.message : "Please try again in a moment.",
        },
        { status: 500 }
      );
    }
  });
}