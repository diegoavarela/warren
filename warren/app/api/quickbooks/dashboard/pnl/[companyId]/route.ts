/**
 * QuickBooks P&L Dashboard API
 *
 * Provides P&L data for Warren dashboard consumption
 * Multi-tenant: Company-specific data only
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getTransformedPnLData,
  getLatestAvailablePeriod,
  getYTDPnLData,
  getComparisonPnLData
} from '@/lib/services/quickbooks-storage-service';
import { getAccumulativeData as getAccumulativeDataService } from '@/lib/services/quickbooks-accumulative-service';

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
    const periodStart = searchParams.get('periodStart');
    const periodEnd = searchParams.get('periodEnd');
    const periodType = searchParams.get('periodType') as 'ytd' | 'qtd' | 'rolling_12m' | null;
    const includeAccumulative = searchParams.get('includeAccumulative') === 'true';
    const currency = searchParams.get('currency') || 'USD';
    const accountingMode = searchParams.get('accountingMode') as 'Accrual' | 'Cash' || 'Accrual';
    const comparisonPeriod = searchParams.get('comparisonPeriod') as 'last_month' | 'last_quarter' | 'last_year' || 'last_month';

    console.log('🔍 [QB Dashboard P&L] Request:', {
      companyId,
      periodStart,
      periodEnd,
      periodType,
      includeAccumulative,
      currency,
      accountingMode,
      comparisonPeriod
    });

    if (!companyId) {
      return NextResponse.json({
        error: 'Company ID is required'
      }, { status: 400 });
    }

    // If no dates provided, find the latest available period
    let actualPeriodStart = periodStart;
    let actualPeriodEnd = periodEnd;

    if (!periodStart || !periodEnd) {
      console.log('🔍 [QB Dashboard P&L] No dates provided, finding latest available period...');

      // Get the latest period from the database
      const latestPeriodData = await getLatestAvailablePeriod(companyId);
      if (latestPeriodData) {
        actualPeriodStart = latestPeriodData.periodStart;
        actualPeriodEnd = latestPeriodData.periodEnd;
        console.log('🎯 [QB Dashboard P&L] Using latest available period:', actualPeriodStart, 'to', actualPeriodEnd);
      } else {
        console.log('⚠️ [QB Dashboard P&L] No data available for company');
      }
    }

    // Get base P&L data - use YTD if specified
    let pnlData;
    if (periodType === 'ytd' && actualPeriodEnd) {
      console.log('🔍 [QB Dashboard P&L] Fetching YTD data up to:', actualPeriodEnd);
      pnlData = await getYTDPnLData(companyId, actualPeriodEnd, accountingMode);
    } else {
      console.log('🔍 [QB Dashboard P&L] Fetching regular period data');
      pnlData = await getTransformedPnLData(
        companyId,
        actualPeriodStart || undefined,
        actualPeriodEnd || undefined,
        accountingMode
      );
    }

    if (pnlData.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No P&L data found for the specified period',
        data: {
          companyId,
          period: { start: actualPeriodStart, end: actualPeriodEnd },
          accounts: [],
          summary: {
            totalAccounts: 0,
            categories: [],
            lastUpdate: null
          }
        }
      });
    }

    // Structure data by categories
    const categorizedData = organizePnLDataByCategory(pnlData);

    // Get comparison data for growth calculations
    let comparisonData = null;
    if (actualPeriodEnd) {
      try {
        const comparisonPnlData = await getComparisonPnLData(
          companyId,
          actualPeriodEnd,
          comparisonPeriod,
          accountingMode
        );
        if (comparisonPnlData.length > 0) {
          comparisonData = organizePnLDataByCategory(comparisonPnlData);
          console.log(`📊 [QB Dashboard P&L] Retrieved ${comparisonPnlData.length} comparison records for ${comparisonPeriod}`);
        } else {
          console.log(`⚠️ [QB Dashboard P&L] No comparison data found for ${comparisonPeriod}`);
        }
      } catch (error) {
        console.warn('⚠️ [QB Dashboard P&L] Could not retrieve comparison data:', error);
      }
    }

    // Get accumulative data if requested
    let accumulativeData = null;
    if (includeAccumulative && actualPeriodEnd) {
      try {
        accumulativeData = await getAccumulativeDataService(companyId, actualPeriodEnd, periodType || undefined);
        console.log(`📊 [QB Dashboard P&L] Retrieved ${accumulativeData.length} accumulative records`);
      } catch (error) {
        console.warn('⚠️ [QB Dashboard P&L] Could not retrieve accumulative data:', error);
      }
    }

    // Calculate summary metrics with comparison data
    const summary = calculatePnLSummary(categorizedData, accumulativeData, comparisonData);

    return NextResponse.json({
      success: true,
      message: 'P&L data retrieved successfully',
      data: {
        companyId,
        period: {
          start: actualPeriodStart,
          end: actualPeriodEnd,
          type: periodType
        },
        currency,
        categories: categorizedData,
        comparison: comparisonData,
        accumulative: accumulativeData ? organizeAccumulativeData(accumulativeData) : null,
        summary,
        metadata: {
          totalRecords: pnlData.length,
          lastUpdate: pnlData[0]?.updatedAt || pnlData[0]?.createdAt,
          generatedAt: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('❌ [QB Dashboard P&L] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Organize P&L data by categories for dashboard consumption
 */
function organizePnLDataByCategory(pnlData: any[]) {
  const categories = new Map<string, {
    name: string;
    total: number;
    accounts: any[];
    subcategories: Map<string, any[]>;
  }>();

  for (const record of pnlData) {
    const categoryName = record.category;
    const amount = parseFloat(record.amount.toString());

    if (!categories.has(categoryName)) {
      categories.set(categoryName, {
        name: categoryName,
        total: 0,
        accounts: [],
        subcategories: new Map()
      });
    }

    const category = categories.get(categoryName)!;

    // Add to category total if it's a detail account OR a section total without detail breakdowns
    // This handles cases like "Landscaping Services" which is a section header representing actual revenue
    if (record.isDetailAccount || (record.isTotal && !record.isSubtotal)) {
      category.total += amount;
    }

    // Add account to category
    category.accounts.push({
      accountName: record.accountName,
      accountCode: record.accountCode,
      accountType: record.accountType,
      amount: amount,
      subcategory: record.subcategory,
      level: record.level,
      isDetailAccount: record.isDetailAccount,
      isSubtotal: record.isSubtotal,
      isTotal: record.isTotal,
      percentOfRevenue: record.percentOfRevenue,
      periodLabel: record.periodLabel,
      currency: record.currency
    });

    // Organize by subcategory
    const subcategoryName = record.subcategory || 'Other';
    if (!category.subcategories.has(subcategoryName)) {
      category.subcategories.set(subcategoryName, []);
    }

    // Include detail accounts and section totals in subcategories
    if (record.isDetailAccount || (record.isTotal && !record.isSubtotal)) {
      category.subcategories.get(subcategoryName)!.push({
        accountName: record.accountName,
        amount: amount,
        accountCode: record.accountCode,
        level: record.level
      });
    }
  }

  // Convert Map to Object for JSON serialization
  const result: any = {};
  for (const [categoryName, categoryData] of categories) {
    result[categoryName] = {
      name: categoryData.name,
      total: categoryData.total,
      accounts: categoryData.accounts,
      subcategories: Object.fromEntries(categoryData.subcategories)
    };
  }

  return result;
}

/**
 * Organize accumulative data for dashboard consumption
 */
function organizeAccumulativeData(accumulativeData: any[]) {
  const organized: any = {};

  for (const record of accumulativeData) {
    const category = record.category;

    if (!organized[category]) {
      organized[category] = {
        name: category,
        accounts: [],
        totals: {
          amount: 0,
          periodCount: 0,
          averageAmount: 0
        }
      };
    }

    const amount = parseFloat(record.totalAmount.toString());
    const avgAmount = parseFloat(record.averageAmount?.toString() || '0');

    organized[category].accounts.push({
      accountName: record.accountName,
      totalAmount: amount,
      periodCount: record.periodCount,
      averageAmount: avgAmount,
      monthlyBreakdown: record.monthlyBreakdown,
      subcategory: record.subcategory,
      currency: record.currency
    });

    // Add to category totals
    organized[category].totals.amount += amount;
    organized[category].totals.periodCount = Math.max(
      organized[category].totals.periodCount,
      record.periodCount
    );
  }

  // Calculate average amounts for categories
  for (const category of Object.values(organized) as any[]) {
    if (category.totals && category.totals.periodCount > 0) {
      category.totals.averageAmount = category.totals.amount / category.totals.periodCount;
    }
  }

  return organized;
}

/**
 * Calculate summary metrics for P&L dashboard
 */
function calculatePnLSummary(categorizedData: any, accumulativeData?: any, comparisonData?: any) {
  const categories = Object.keys(categorizedData);
  const totalAccounts = Object.values(categorizedData).reduce(
    (sum: number, category: any) => sum + category.accounts.length, 0
  );

  // Calculate key financial metrics
  const revenue = categorizedData['Revenue']?.total || 0;
  const cogs = categorizedData['Cost of Goods Sold']?.total || 0;
  const operatingExpenses = categorizedData['Operating Expenses']?.total || 0;
  const otherExpenses = categorizedData['Other Expenses']?.total || 0;

  const grossProfit = revenue - cogs;
  const operatingIncome = grossProfit - operatingExpenses; // Net Operating Income
  const netIncome = operatingIncome - otherExpenses; // Final Net Income after Other Expenses

  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const operatingMargin = revenue > 0 ? (operatingIncome / revenue) * 100 : 0;
  const netMargin = revenue > 0 ? (netIncome / revenue) * 100 : 0;

  // Calculate growth percentages if comparison data is available
  let growthMetrics = {
    revenueGrowth: 0,
    grossProfitGrowth: 0,
    operatingIncomeGrowth: 0,
    netIncomeGrowth: 0,
    ebitdaGrowth: 0
  };

  if (comparisonData) {
    const compRevenue = comparisonData['Revenue']?.total || 0;
    const compCogs = comparisonData['Cost of Goods Sold']?.total || 0;
    const compOperatingExpenses = comparisonData['Operating Expenses']?.total || 0;
    const compOtherExpenses = comparisonData['Other Expenses']?.total || 0;

    const compGrossProfit = compRevenue - compCogs;
    const compOperatingIncome = compGrossProfit - compOperatingExpenses;
    const compNetIncome = compOperatingIncome - compOtherExpenses;
    // Simple EBITDA approximation (we don't have depreciation data)
    const compEbitda = compOperatingIncome;
    const ebitda = operatingIncome; // Current period EBITDA

    // Calculate growth percentages with proper handling of negative values
    function calculateGrowthPercentage(current: number, previous: number): number {
      // If no previous data, can't calculate growth
      if (previous === 0) return 0;

      // Standard calculation for positive previous values
      if (previous > 0) {
        return ((current - previous) / previous) * 100;
      }

      // Special handling for negative previous values
      if (previous < 0) {
        // If both negative, calculate relative change
        if (current < 0) {
          // Both negative: calculate percentage change in absolute terms
          // Less negative = improvement (positive %), more negative = deterioration (negative %)
          return ((Math.abs(previous) - Math.abs(current)) / Math.abs(previous)) * 100;
        } else {
          // Previous negative, current positive: improvement (use absolute of previous for percentage)
          return ((current + Math.abs(previous)) / Math.abs(previous)) * 100;
        }
      }

      return 0;
    }

    growthMetrics = {
      revenueGrowth: calculateGrowthPercentage(revenue, compRevenue),
      grossProfitGrowth: calculateGrowthPercentage(grossProfit, compGrossProfit),
      operatingIncomeGrowth: calculateGrowthPercentage(operatingIncome, compOperatingIncome),
      netIncomeGrowth: calculateGrowthPercentage(netIncome, compNetIncome),
      ebitdaGrowth: calculateGrowthPercentage(ebitda, compEbitda)
    };
  }

  return {
    totalAccounts,
    categories: categories.length,
    categoriesList: categories,
    financials: {
      revenue,
      costOfGoodsSold: cogs,
      grossProfit,
      operatingExpenses,
      operatingIncome,
      otherExpenses,
      netIncome,
      margins: {
        gross: grossMargin,
        operating: operatingMargin,
        net: netMargin
      },
      growth: growthMetrics
    },
    hasAccumulativeData: !!accumulativeData,
    accumulativePeriods: accumulativeData && Object.keys(accumulativeData).length > 0 ?
      Math.max(...Object.values(accumulativeData).map((cat: any) => cat.totals?.periodCount || 0)) : 0
  };
}