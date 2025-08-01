import { NextRequest, NextResponse } from "next/server";
import { withRBAC, hasPermission, PERMISSIONS } from "@/lib/auth/rbac";
import { financialDataAggregator } from "@/lib/services/financial-data-aggregator-v2";
import { financialDataLoader } from "@/lib/services/financial-data-loader";
import { financialDataService } from "@/lib/services/financial-data-service";
import { periodDataDumper } from "@/lib/utils/period-data-dumper";

export async function GET(request: NextRequest) {
  return withRBAC(request, async (req, user) => {
    try {
      const url = new URL(request.url);
      const companyId = url.searchParams.get('companyId');
      const testQuery = url.searchParams.get('query') || 'Calculate EBITDA from January to May';

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

      console.log(`🔍 DEBUG CONTEXT: Generating debug files for company: ${companyId}`);

      // Check if we should force reload (to test updated calculations)
      const forceReload = url.searchParams.get('forceReload') === 'true';
      
      if (forceReload) {
        console.log(`🔄 Force reloading data to test updated calculations...`);
        const reloaded = await financialDataLoader.forceReloadCompanyData(companyId);
        if (!reloaded) {
          return NextResponse.json({
            success: false,
            error: `Failed to reload financial data for company: ${companyId}`
          }, { status: 404 });
        }
      } else {
        // Ensure company data is loaded into memory
        if (financialDataLoader.needsLoading(companyId)) {
          const loaded = await financialDataLoader.loadCompanyData(companyId);
          if (!loaded) {
            return NextResponse.json({
              success: false,
              error: `Failed to load financial data for company: ${companyId}`
            }, { status: 404 });
          }
        }
      }

      // Get comprehensive financial context
      const financialContext = await financialDataAggregator.buildFinancialContext(companyId);
      
      if (!financialContext) {
        return NextResponse.json({
          success: false,
          error: `No financial data available for company: ${companyId}`
        }, { status: 404 });
      }

      // Generate period-based JSON files with raw data (as requested)
      const companyData = financialDataService.getCompanyData(companyId);
      if (!companyData) {
        return NextResponse.json({
          success: false,
          error: `No company data available in memory for: ${companyId}`
        }, { status: 404 });
      }

      // Clean up old files first
      periodDataDumper.cleanupOldData(companyId);
      
      // Generate period data files
      const periodFiles = periodDataDumper.dumpPeriodData(
        companyId,
        companyData.companyName,
        companyData.currency,
        companyData.dataPoints
      );

      // Create periods index
      const indexFile = periodDataDumper.createPeriodsIndex(
        companyId,
        companyData.companyName,
        companyData.periods
      );

      return NextResponse.json({
        success: true,
        data: {
          companyId,
          companyName: companyData.companyName,
          currency: companyData.currency,
          filesGenerated: {
            periodFiles: periodFiles.map(file => file.split('/').pop()),
            indexFile: indexFile.split('/').pop(),
            totalFiles: periodFiles.length + 1
          },
          periodsData: {
            totalPeriods: companyData.periods.length,
            periods: companyData.periods,
            totalDataPoints: companyData.dataPoints.length,
            dataPointsPerPeriod: companyData.periods.map(period => ({
              period,
              lineItems: companyData.dataPoints.filter(item => item.period === period).length
            }))
          },
          instructions: {
            location: "Check the period-data folder in your project root",
            structure: "One JSON file per period with raw financial data only",
            usage: "AI will calculate metrics on-demand from raw data",
            note: "No pre-calculated totals, EBITDA, or margins"
          }
        },
        message: `Raw period data files generated successfully. Check the period-data folder in your project root.`,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error("Debug AI context error:", error);

      return NextResponse.json(
        { 
          success: false,
          error: "Failed to generate debug context",
          message: error instanceof Error ? error.message : "Please try again in a moment.",
        },
        { status: 500 }
      );
    }
  });
}