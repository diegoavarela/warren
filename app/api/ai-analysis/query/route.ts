import { NextRequest, NextResponse } from "next/server";
import { withRBAC, hasPermission, PERMISSIONS } from "@/lib/auth/rbac";
import { aiAnalysisService } from "@/lib/services/ai-analysis-service";
import { z } from "zod";

// Validation schema
const AnalysisQuerySchema = z.object({
  companyId: z.string().min(1),
  query: z.string().min(1).max(1000),
  context: z.object({
    includeChartData: z.boolean().optional(),
    focusArea: z.enum(['revenue', 'expenses', 'profitability', 'general']).optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  return withRBAC(request, async (req, user) => {
    try {
      console.log('🤖 AI Analysis Query Request');

      const body = await req.json();
      const validatedData = AnalysisQuerySchema.parse(body);
      const { companyId, query, context } = validatedData;

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

      console.log(`🔍 Processing AI analysis query for company: ${companyId}`, {
        query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
        focusArea: context?.focusArea,
        includeChartData: context?.includeChartData
      });

      // Check data availability first
      const availability = await aiAnalysisService.checkDataAvailability(companyId);
      if (!availability.available) {
        return NextResponse.json({
          success: false,
          error: availability.message,
          suggestion: "Please upload and process financial statements for this company first."
        }, { status: 400 });
      }

      // Process the analysis query
      const analysisResponse = await aiAnalysisService.processQuery({
        companyId,
        query,
        context
      });

      console.log(`✅ AI analysis completed successfully`, {
        confidence: analysisResponse.confidence,
        processingTime: analysisResponse.metadata.processingTime,
        tokensUsed: analysisResponse.metadata.tokensUsed,
        hasChartData: !!analysisResponse.chartData
      });

      return NextResponse.json({
        success: true,
        data: analysisResponse,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error("AI Analysis error:", error);
      
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
          error: "AI analysis service temporarily unavailable",
          message: error instanceof Error ? error.message : "Please try again in a moment or contact support if the issue persists.",
          fallback: true
        },
        { status: 500 }
      );
    }
  });
}