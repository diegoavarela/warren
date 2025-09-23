/**
 * QuickBooks Available Periods API
 *
 * Lists all available periods for a company's QuickBooks data
 * Used by dashboard for period selection
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTransformedPnLData } from '@/lib/services/quickbooks-storage-service';

interface PageProps {
  params: {
    companyId: string;
  };
}

export async function GET(request: NextRequest, { params }: PageProps) {
  try {
    const { companyId } = params;

    console.log('🔍 [QB Dashboard Periods] Getting periods for company:', companyId);

    if (!companyId) {
      return NextResponse.json({
        error: 'Company ID is required'
      }, { status: 400 });
    }

    // Get all P&L data to analyze periods
    const pnlData = await getTransformedPnLData(companyId);

    if (pnlData.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No periods found - no P&L data available',
        data: {
          companyId,
          periods: [],
          summary: {
            totalPeriods: 0,
            earliestPeriod: null,
            latestPeriod: null,
            availableYears: [],
            availableMonths: []
          }
        }
      });
    }

    // Extract unique periods
    const periodsMap = new Map<string, {
      periodStart: string;
      periodEnd: string;
      periodLabel: string;
      accountCount: number;
      detailAccountCount: number;
      categories: Set<string>;
      lastUpdated: string;
    }>();

    for (const record of pnlData) {
      const key = `${record.periodStart}-${record.periodEnd}`;

      if (!periodsMap.has(key)) {
        periodsMap.set(key, {
          periodStart: record.periodStart,
          periodEnd: record.periodEnd,
          periodLabel: record.periodLabel,
          accountCount: 0,
          detailAccountCount: 0,
          categories: new Set(),
          lastUpdated: record.updatedAt || record.createdAt
        });
      }

      const period = periodsMap.get(key)!;
      period.accountCount++;

      if (record.isDetailAccount) {
        period.detailAccountCount++;
      }

      period.categories.add(record.category);

      // Keep the latest update time
      if (record.updatedAt && record.updatedAt > period.lastUpdated) {
        period.lastUpdated = record.updatedAt;
      }
    }

    // Convert to array and sort by period start date
    const periods = Array.from(periodsMap.values())
      .map(period => ({
        ...period,
        categories: Array.from(period.categories),
        categoryCount: period.categories.size,
        // Add formatted dates for easier frontend use
        startDate: period.periodStart,
        endDate: period.periodEnd,
        year: new Date(period.periodStart).getFullYear(),
        month: new Date(period.periodStart).getMonth() + 1,
        quarter: Math.ceil((new Date(period.periodStart).getMonth() + 1) / 3)
      }))
      .sort((a, b) => new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime());

    // Calculate summary information
    const summary = calculatePeriodsSummary(periods);

    return NextResponse.json({
      success: true,
      message: 'Available periods retrieved successfully',
      data: {
        companyId,
        periods,
        summary,
        metadata: {
          totalRecords: pnlData.length,
          generatedAt: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('❌ [QB Dashboard Periods] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Calculate summary information for periods
 */
function calculatePeriodsSummary(periods: any[]) {
  if (periods.length === 0) {
    return {
      totalPeriods: 0,
      earliestPeriod: null,
      latestPeriod: null,
      availableYears: [],
      availableMonths: [],
      availableQuarters: [],
      continuousMonths: false,
      dataQuality: 'no-data'
    };
  }

  const earliestPeriod = periods[0];
  const latestPeriod = periods[periods.length - 1];

  // Extract unique years, months, and quarters
  const years = [...new Set(periods.map(p => p.year))].sort((a, b) => a - b);
  const months = [...new Set(periods.map(p => `${p.year}-${p.month.toString().padStart(2, '0')}`))].sort();
  const quarters = [...new Set(periods.map(p => `${p.year}-Q${p.quarter}`))].sort();

  // Check if we have continuous monthly data
  const continuousMonths = checkContinuousMonths(periods);

  // Assess data quality
  const dataQuality = assessDataQuality(periods);

  // Calculate period types
  const periodTypes = categorizePeriods(periods);

  return {
    totalPeriods: periods.length,
    earliestPeriod: {
      date: earliestPeriod.periodStart,
      label: earliestPeriod.periodLabel,
      year: earliestPeriod.year,
      month: earliestPeriod.month
    },
    latestPeriod: {
      date: latestPeriod.periodEnd,
      label: latestPeriod.periodLabel,
      year: latestPeriod.year,
      month: latestPeriod.month
    },
    availableYears: years,
    availableMonths: months,
    availableQuarters: quarters,
    continuousMonths,
    dataQuality,
    periodTypes,
    averageAccountsPerPeriod: periods.reduce((sum, p) => sum + p.accountCount, 0) / periods.length,
    averageDetailAccountsPerPeriod: periods.reduce((sum, p) => sum + p.detailAccountCount, 0) / periods.length
  };
}

/**
 * Check if periods represent continuous monthly data
 */
function checkContinuousMonths(periods: any[]): boolean {
  if (periods.length < 2) return false;

  for (let i = 1; i < periods.length; i++) {
    const prevPeriod = new Date(periods[i - 1].periodEnd);
    const currentPeriod = new Date(periods[i].periodStart);

    // Check if current period starts within a few days of previous period end
    const daysDifference = Math.abs(
      (currentPeriod.getTime() - prevPeriod.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDifference > 5) { // Allow for some flexibility in period boundaries
      return false;
    }
  }

  return true;
}

/**
 * Assess overall data quality across periods
 */
function assessDataQuality(periods: any[]): string {
  if (periods.length === 0) return 'no-data';

  let qualityScore = 0;

  // Check period count (25 points)
  if (periods.length >= 12) {
    qualityScore += 25;
  } else if (periods.length >= 6) {
    qualityScore += 20;
  } else if (periods.length >= 3) {
    qualityScore += 15;
  } else {
    qualityScore += 5;
  }

  // Check data consistency (25 points)
  const avgAccounts = periods.reduce((sum, p) => sum + p.accountCount, 0) / periods.length;
  const accountVariance = periods.reduce((sum, p) => sum + Math.abs(p.accountCount - avgAccounts), 0) / periods.length;
  const consistencyRatio = 1 - (accountVariance / avgAccounts);

  if (consistencyRatio > 0.9) {
    qualityScore += 25;
  } else if (consistencyRatio > 0.8) {
    qualityScore += 20;
  } else if (consistencyRatio > 0.7) {
    qualityScore += 15;
  } else {
    qualityScore += 5;
  }

  // Check category completeness (25 points)
  const hasCompleteStructure = periods.every(p =>
    p.categories.includes('Revenue') &&
    p.categories.includes('Cost of Goods Sold') &&
    p.categories.includes('Operating Expenses')
  );

  if (hasCompleteStructure) {
    qualityScore += 25;
  } else {
    const avgCategories = periods.reduce((sum, p) => sum + p.categoryCount, 0) / periods.length;
    if (avgCategories >= 3) {
      qualityScore += 15;
    } else if (avgCategories >= 2) {
      qualityScore += 10;
    } else {
      qualityScore += 5;
    }
  }

  // Check data freshness (25 points)
  const latestUpdate = new Date(Math.max(...periods.map(p => new Date(p.lastUpdated).getTime())));
  const daysSinceUpdate = (Date.now() - latestUpdate.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceUpdate <= 7) {
    qualityScore += 25;
  } else if (daysSinceUpdate <= 30) {
    qualityScore += 20;
  } else if (daysSinceUpdate <= 90) {
    qualityScore += 15;
  } else {
    qualityScore += 5;
  }

  // Determine quality level
  if (qualityScore >= 85) {
    return 'excellent';
  } else if (qualityScore >= 70) {
    return 'good';
  } else if (qualityScore >= 50) {
    return 'fair';
  } else if (qualityScore >= 30) {
    return 'poor';
  } else {
    return 'critical';
  }
}

/**
 * Categorize periods by type (monthly, quarterly, etc.)
 */
function categorizePeriods(periods: any[]) {
  const monthly = periods.filter(p => {
    const start = new Date(p.periodStart);
    const end = new Date(p.periodEnd);
    const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff >= 25 && daysDiff <= 35; // Roughly monthly
  });

  const quarterly = periods.filter(p => {
    const start = new Date(p.periodStart);
    const end = new Date(p.periodEnd);
    const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff >= 85 && daysDiff <= 95; // Roughly quarterly
  });

  const yearly = periods.filter(p => {
    const start = new Date(p.periodStart);
    const end = new Date(p.periodEnd);
    const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff >= 360 && daysDiff <= 370; // Roughly yearly
  });

  return {
    monthly: {
      count: monthly.length,
      periods: monthly.map(p => ({
        start: p.periodStart,
        end: p.periodEnd,
        label: p.periodLabel
      }))
    },
    quarterly: {
      count: quarterly.length,
      periods: quarterly.map(p => ({
        start: p.periodStart,
        end: p.periodEnd,
        label: p.periodLabel
      }))
    },
    yearly: {
      count: yearly.length,
      periods: yearly.map(p => ({
        start: p.periodStart,
        end: p.periodEnd,
        label: p.periodLabel
      }))
    },
    other: {
      count: periods.length - monthly.length - quarterly.length - yearly.length
    }
  };
}