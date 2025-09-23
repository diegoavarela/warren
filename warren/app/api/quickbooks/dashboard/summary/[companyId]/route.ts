/**
 * QuickBooks Dashboard Summary API
 *
 * Provides overview of available QuickBooks data for a company
 * Multi-tenant: Company-specific data only
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getTransformedPnLData,
  getRawPnLData,
  getLatestSyncStatus
} from '@/lib/services/quickbooks-storage-service';
import {
  getLatestAccumulativeDate
} from '@/lib/services/quickbooks-accumulative-service';

interface PageProps {
  params: {
    companyId: string;
  };
}

export async function GET(request: NextRequest, { params }: PageProps) {
  try {
    const { companyId } = params;

    console.log('🔍 [QB Dashboard Summary] Getting summary for company:', companyId);

    if (!companyId) {
      return NextResponse.json({
        error: 'Company ID is required'
      }, { status: 400 });
    }

    // Get all available data overview
    const [
      allPnLData,
      rawPnLData,
      latestSync,
      latestYTD,
      latestQTD,
      latestRolling12M
    ] = await Promise.all([
      getTransformedPnLData(companyId),
      getRawPnLData(companyId),
      getLatestSyncStatus(companyId),
      getLatestAccumulativeDate(companyId, 'ytd'),
      getLatestAccumulativeDate(companyId, 'qtd'),
      getLatestAccumulativeDate(companyId, 'rolling_12m')
    ]);

    // Analyze available periods
    const availablePeriods = analyzePeriods(allPnLData);

    // Analyze data categories
    const categoriesAnalysis = analyzeCategories(allPnLData);

    // Calculate data health metrics
    const dataHealth = calculateDataHealth(allPnLData, rawPnLData, latestSync);

    return NextResponse.json({
      success: true,
      message: 'QuickBooks data summary retrieved successfully',
      data: {
        companyId,
        overview: {
          hasData: allPnLData.length > 0,
          totalRecords: allPnLData.length,
          totalRawRecords: rawPnLData.length,
          lastDataUpdate: allPnLData[0]?.updatedAt || null,
          dataHealthScore: dataHealth.score,
          dataHealthStatus: dataHealth.status
        },
        periods: availablePeriods,
        categories: categoriesAnalysis,
        accumulative: {
          ytd: {
            available: !!latestYTD,
            latestDate: latestYTD
          },
          qtd: {
            available: !!latestQTD,
            latestDate: latestQTD
          },
          rolling12m: {
            available: !!latestRolling12M,
            latestDate: latestRolling12M
          }
        },
        sync: {
          lastSync: latestSync?.startedAt || null,
          lastSyncStatus: latestSync?.status || 'never',
          recordsProcessed: latestSync?.recordsProcessed || 0,
          hasErrors: !!(latestSync?.errorMessage)
        },
        capabilities: {
          canGeneratePnLDashboard: allPnLData.length > 0,
          canCalculateYTD: allPnLData.length > 0,
          canCalculateQTD: allPnLData.length > 0,
          canGenerateTrends: availablePeriods.periodCount >= 2,
          canComparePerformance: availablePeriods.periodCount >= 2
        },
        recommendations: generateRecommendations(allPnLData, availablePeriods, dataHealth)
      }
    });

  } catch (error) {
    console.error('❌ [QB Dashboard Summary] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Analyze available periods in the data
 */
function analyzePeriods(pnlData: any[]) {
  const periods = new Map<string, {
    start: string;
    end: string;
    label: string;
    recordCount: number;
  }>();

  for (const record of pnlData) {
    const key = `${record.periodStart}-${record.periodEnd}`;

    if (!periods.has(key)) {
      periods.set(key, {
        start: record.periodStart,
        end: record.periodEnd,
        label: record.periodLabel,
        recordCount: 0
      });
    }

    periods.get(key)!.recordCount++;
  }

  const periodsArray = Array.from(periods.values()).sort((a, b) =>
    new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  return {
    periodCount: periodsArray.length,
    periods: periodsArray,
    earliestPeriod: periodsArray[0]?.start || null,
    latestPeriod: periodsArray[periodsArray.length - 1]?.end || null,
    averageRecordsPerPeriod: periodsArray.length > 0 ?
      periodsArray.reduce((sum, p) => sum + p.recordCount, 0) / periodsArray.length : 0
  };
}

/**
 * Analyze data categories and their completeness
 */
function analyzeCategories(pnlData: any[]) {
  const categories = new Map<string, {
    name: string;
    accountCount: number;
    detailAccountCount: number;
    totalAmount: number;
    subcategories: Set<string>;
  }>();

  for (const record of pnlData) {
    const categoryName = record.category;

    if (!categories.has(categoryName)) {
      categories.set(categoryName, {
        name: categoryName,
        accountCount: 0,
        detailAccountCount: 0,
        totalAmount: 0,
        subcategories: new Set()
      });
    }

    const category = categories.get(categoryName)!;
    category.accountCount++;

    if (record.isDetailAccount) {
      category.detailAccountCount++;
      category.totalAmount += parseFloat(record.amount.toString());
    }

    if (record.subcategory) {
      category.subcategories.add(record.subcategory);
    }
  }

  const categoriesArray = Array.from(categories.values()).map(cat => ({
    ...cat,
    subcategories: Array.from(cat.subcategories),
    subcategoryCount: cat.subcategories.size
  }));

  return {
    totalCategories: categoriesArray.length,
    categories: categoriesArray,
    hasRevenue: categories.has('Revenue'),
    hasCOGS: categories.has('Cost of Goods Sold'),
    hasOperatingExpenses: categories.has('Operating Expenses'),
    isComplete: categories.has('Revenue') && categories.has('Cost of Goods Sold')
  };
}

/**
 * Calculate data health score and status
 */
function calculateDataHealth(pnlData: any[], rawData: any[], latestSync: any) {
  let score = 0;
  const issues: string[] = [];
  const positives: string[] = [];

  // Check data availability (30 points)
  if (pnlData.length > 0) {
    score += 30;
    positives.push('P&L data available');
  } else {
    issues.push('No P&L data found');
  }

  // Check data completeness (25 points)
  const hasRevenue = pnlData.some(r => r.category === 'Revenue');
  const hasCOGS = pnlData.some(r => r.category === 'Cost of Goods Sold');
  const hasExpenses = pnlData.some(r => r.category === 'Operating Expenses');

  if (hasRevenue && hasCOGS && hasExpenses) {
    score += 25;
    positives.push('Complete P&L structure (Revenue, COGS, Expenses)');
  } else {
    if (!hasRevenue) issues.push('Missing Revenue data');
    if (!hasCOGS) issues.push('Missing Cost of Goods Sold data');
    if (!hasExpenses) issues.push('Missing Operating Expenses data');
  }

  // Check data freshness (20 points)
  if (latestSync && latestSync.startedAt) {
    const syncDate = new Date(latestSync.startedAt);
    const daysSinceSync = (Date.now() - syncDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceSync <= 1) {
      score += 20;
      positives.push('Data is very fresh (< 1 day)');
    } else if (daysSinceSync <= 7) {
      score += 15;
      positives.push('Data is recent (< 1 week)');
    } else if (daysSinceSync <= 30) {
      score += 10;
      positives.push('Data is somewhat recent (< 1 month)');
    } else {
      issues.push(`Data is stale (${Math.round(daysSinceSync)} days old)`);
    }
  } else {
    issues.push('No sync history available');
  }

  // Check data consistency (15 points)
  const rawToTransformedRatio = rawData.length > 0 ? pnlData.length / rawData.length : 0;
  if (rawToTransformedRatio > 5) {
    score += 15;
    positives.push('Good data transformation ratio');
  } else if (rawToTransformedRatio > 0) {
    score += 10;
    positives.push('Adequate data transformation');
  } else {
    issues.push('Poor data transformation ratio');
  }

  // Check sync status (10 points)
  if (latestSync?.status === 'completed') {
    score += 10;
    positives.push('Last sync completed successfully');
  } else if (latestSync?.status === 'failed') {
    issues.push('Last sync failed');
  }

  // Determine status
  let status: string;
  if (score >= 85) {
    status = 'excellent';
  } else if (score >= 70) {
    status = 'good';
  } else if (score >= 50) {
    status = 'fair';
  } else if (score >= 30) {
    status = 'poor';
  } else {
    status = 'critical';
  }

  return {
    score,
    status,
    issues,
    positives,
    maxScore: 100
  };
}

/**
 * Generate recommendations based on data analysis
 */
function generateRecommendations(pnlData: any[], periodsAnalysis: any, dataHealth: any) {
  const recommendations: string[] = [];

  // Data availability recommendations
  if (pnlData.length === 0) {
    recommendations.push('Sync QuickBooks data to start using the dashboard');
  }

  // Period recommendations
  if (periodsAnalysis.periodCount < 2) {
    recommendations.push('Add more historical periods for trend analysis');
  }

  if (periodsAnalysis.periodCount < 12) {
    recommendations.push('Consider syncing a full year of data for comprehensive YTD reporting');
  }

  // Data health recommendations
  if (dataHealth.score < 70) {
    recommendations.push('Improve data quality by resolving sync issues');
  }

  if (dataHealth.issues.length > 0) {
    recommendations.push('Address data issues: ' + dataHealth.issues.join(', '));
  }

  // Feature recommendations
  if (periodsAnalysis.periodCount >= 3) {
    recommendations.push('You have enough data for advanced trend analysis and forecasting');
  }

  if (periodsAnalysis.periodCount >= 12) {
    recommendations.push('Consider setting up automated monthly sync for continuous reporting');
  }

  return recommendations;
}