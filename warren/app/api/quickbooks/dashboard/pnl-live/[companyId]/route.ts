/**
 * QuickBooks Live P&L Dashboard API with Comparisons
 *
 * Fetches real-time P&L data from QuickBooks and provides comparison analytics
 * Supports current month vs year-ago and 3-months-ago comparisons
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, eq } from '@/lib/db';
import { quickbooksIntegrations } from '@/lib/db/actual-schema';
import {
  fetchPnLWithComparisons,
  calculateComparisonPeriods
} from '@/lib/services/quickbooks-service';
import {
  processQuickBooksComparisons
} from '@/lib/services/quickbooks-comparison-service';

interface PageProps {
  params: {
    companyId: string;
  };
}

export async function GET(request: NextRequest, { params }: PageProps) {
  try {
    const { companyId } = params;
    const searchParams = request.nextUrl.searchParams;

    // Extract query parameters
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());
    const includeComparisons = searchParams.get('includeComparisons') !== 'false'; // Default to true
    const currency = searchParams.get('currency') || 'USD';

    console.log('🔍 [QB Live P&L] Request:', {
      companyId,
      year,
      month,
      includeComparisons,
      currency
    });

    if (!companyId) {
      return NextResponse.json({
        error: 'Company ID is required'
      }, { status: 400 });
    }

    // Get QuickBooks integration for this company
    const integration = await db
      .select({ realmId: quickbooksIntegrations.realmId })
      .from(quickbooksIntegrations)
      .where(eq(quickbooksIntegrations.companyId, companyId))
      .limit(1);

    if (integration.length === 0) {
      return NextResponse.json({
        error: 'No QuickBooks integration found for this company'
      }, { status: 404 });
    }

    const realmId = integration[0].realmId;
    console.log('✅ [QB Live P&L] Found QuickBooks integration, realm ID:', realmId);

    if (!includeComparisons) {
      // Simple case: just return current month data
      console.log('📊 [QB Live P&L] Fetching current month only');

      const { fetchSpecificMonthPnL } = require('@/lib/services/quickbooks-service');
      const currentResponse = await fetchSpecificMonthPnL(realmId, year, month);

      const { extractFinancialMetrics } = require('@/lib/services/quickbooks-comparison-service');
      const currentMetrics = extractFinancialMetrics(currentResponse, year, month);

      return NextResponse.json({
        success: true,
        message: 'Current P&L data retrieved successfully',
        data: {
          companyId,
          period: {
            year,
            month,
            label: currentMetrics.periodLabel
          },
          currency,
          current: currentMetrics,
          metadata: {
            hasComparisons: false,
            generatedAt: new Date().toISOString(),
            source: 'quickbooks-live'
          }
        }
      });
    }

    // Full case: fetch current + comparison data
    console.log('📊 [QB Live P&L] Fetching with comparisons');

    const comparisonData = await fetchPnLWithComparisons(realmId, year, month);

    // Process the comparison data
    const processedComparisons = processQuickBooksComparisons(
      comparisonData.current,
      comparisonData.yearAgo,
      comparisonData.threeMonthsAgo,
      year,
      month
    );

    // Calculate comparison periods for metadata
    const periods = calculateComparisonPeriods(year, month);

    // Build response structure
    const response = {
      success: true,
      message: 'P&L data with comparisons retrieved successfully',
      data: {
        companyId,
        period: {
          year,
          month,
          label: processedComparisons.current.periodLabel
        },
        currency,
        current: processedComparisons.current,
        comparisons: {
          yearAgo: processedComparisons.yearAgo ? {
            period: {
              year: periods.yearAgo.year,
              month: periods.yearAgo.month,
              label: processedComparisons.yearAgo.comparisonPeriod.periodLabel
            },
            metrics: processedComparisons.yearAgo.comparisonPeriod,
            changes: processedComparisons.yearAgo.comparison
          } : null,
          threeMonthsAgo: processedComparisons.threeMonthsAgo ? {
            period: {
              year: periods.threeMonthsAgo.year,
              month: periods.threeMonthsAgo.month,
              label: processedComparisons.threeMonthsAgo.comparisonPeriod.periodLabel
            },
            metrics: processedComparisons.threeMonthsAgo.comparisonPeriod,
            changes: processedComparisons.threeMonthsAgo.comparison
          } : null
        },
        metadata: {
          hasComparisons: true,
          hasYearAgo: !!processedComparisons.yearAgo,
          hasThreeMonthsAgo: !!processedComparisons.threeMonthsAgo,
          generatedAt: new Date().toISOString(),
          source: 'quickbooks-live',
          apiCallsUsed: 1 + (comparisonData.yearAgo ? 1 : 0) + (comparisonData.threeMonthsAgo ? 1 : 0)
        }
      }
    };

    console.log('✅ [QB Live P&L] Response prepared successfully');
    console.log('📊 [QB Live P&L] Summary:', {
      currentRevenue: processedComparisons.current.revenue,
      hasYearAgo: !!processedComparisons.yearAgo,
      hasThreeMonthsAgo: !!processedComparisons.threeMonthsAgo,
      yearAgoChange: processedComparisons.yearAgo?.comparison.revenue.changePercent + '%',
      threeMonthsAgoChange: processedComparisons.threeMonthsAgo?.comparison.revenue.changePercent + '%'
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [QB Live P&L] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

/**
 * POST endpoint for triggering data refresh
 */
export async function POST(request: NextRequest, { params }: PageProps) {
  try {
    const { companyId } = params;
    const body = await request.json();

    const year = body.year || new Date().getFullYear();
    const month = body.month || (new Date().getMonth() + 1);

    console.log('🔄 [QB Live P&L] Refresh requested for:', companyId, year, month);

    // Call the GET endpoint to fetch fresh data
    const refreshResponse = await GET(request, { params });

    console.log('✅ [QB Live P&L] Data refreshed successfully');

    return refreshResponse;

  } catch (error) {
    console.error('❌ [QB Live P&L] Refresh error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}