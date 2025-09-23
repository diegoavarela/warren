/**
 * QuickBooks P&L Dashboard API
 *
 * Provides P&L data for Warren dashboard consumption
 * Multi-tenant: Company-specific data only
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getTransformedPnLData,
  getAccumulativeData
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
    const periodType = searchParams.get('periodType') as 'ytd' | 'qtd' | 'rolling_12m' || 'ytd';
    const includeAccumulative = searchParams.get('includeAccumulative') === 'true';
    const currency = searchParams.get('currency') || 'USD';

    console.log('🔍 [QB Dashboard P&L] Request:', {
      companyId,
      periodStart,
      periodEnd,
      periodType,
      includeAccumulative,
      currency
    });

    if (!companyId) {
      return NextResponse.json({
        error: 'Company ID is required'
      }, { status: 400 });
    }

    // Get base P&L data
    const pnlData = await getTransformedPnLData(
      companyId,
      periodStart || undefined,
      periodEnd || undefined
    );

    if (pnlData.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No P&L data found for the specified period',
        data: {
          companyId,
          period: { start: periodStart, end: periodEnd },
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

    // Get accumulative data if requested
    let accumulativeData = null;
    if (includeAccumulative && periodEnd) {
      try {
        accumulativeData = await getAccumulativeDataService(companyId, periodEnd, periodType);
        console.log(`📊 [QB Dashboard P&L] Retrieved ${accumulativeData.length} accumulative records`);
      } catch (error) {
        console.warn('⚠️ [QB Dashboard P&L] Could not retrieve accumulative data:', error);
      }
    }

    // Calculate summary metrics
    const summary = calculatePnLSummary(categorizedData, accumulativeData);

    return NextResponse.json({
      success: true,
      message: 'P&L data retrieved successfully',
      data: {
        companyId,
        period: {
          start: periodStart,
          end: periodEnd,
          type: periodType
        },
        currency,
        categories: categorizedData,
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

    // Add to category total if it's a detail account
    if (record.isDetailAccount) {
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

    if (record.isDetailAccount) {
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
function calculatePnLSummary(categorizedData: any, accumulativeData?: any) {
  const categories = Object.keys(categorizedData);
  const totalAccounts = Object.values(categorizedData).reduce(
    (sum: number, category: any) => sum + category.accounts.length, 0
  );

  // Calculate key financial metrics
  const revenue = categorizedData['Revenue']?.total || 0;
  const cogs = categorizedData['Cost of Goods Sold']?.total || 0;
  const operatingExpenses = categorizedData['Operating Expenses']?.total || 0;

  const grossProfit = revenue - cogs;
  const netIncome = grossProfit - operatingExpenses;
  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const netMargin = revenue > 0 ? (netIncome / revenue) * 100 : 0;

  return {
    totalAccounts,
    categories: categories.length,
    categoriesList: categories,
    financials: {
      revenue,
      costOfGoodsSold: cogs,
      grossProfit,
      operatingExpenses,
      netIncome,
      margins: {
        gross: grossMargin,
        net: netMargin
      }
    },
    hasAccumulativeData: !!accumulativeData,
    accumulativePeriods: accumulativeData && Object.keys(accumulativeData).length > 0 ?
      Math.max(...Object.values(accumulativeData).map((cat: any) => cat.totals?.periodCount || 0)) : 0
  };
}