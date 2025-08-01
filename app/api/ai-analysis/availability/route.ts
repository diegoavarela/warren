import { NextRequest, NextResponse } from "next/server";
import { withRBAC, hasPermission, PERMISSIONS } from "@/lib/auth/rbac";
import { aiAnalysisService } from "@/lib/services/ai-analysis-service";

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

      console.log(`🔍 Checking data availability for company: ${companyId}`);

      // Check data availability
      const availability = await aiAnalysisService.checkDataAvailability(companyId);

      console.log(`✅ Data availability check completed`, {
        available: availability.available,
        dataPoints: availability.details?.dataPoints,
        periods: availability.details?.periods.length
      });

      return NextResponse.json({
        success: true,
        data: availability,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error("AI Analysis availability check error:", error);

      return NextResponse.json(
        { 
          success: false,
          error: "Failed to check data availability",
          message: error instanceof Error ? error.message : "Please try again in a moment.",
        },
        { status: 500 }
      );
    }
  });
}