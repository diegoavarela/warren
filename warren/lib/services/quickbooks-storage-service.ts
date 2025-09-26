/**
 * QuickBooks Storage Service
 *
 * Handles multi-tenant storage of QuickBooks P&L data
 * Phase 1: Basic storage with company isolation
 */

import { db } from '@/lib/db';
import { eq, and, desc, gte, lte } from 'drizzle-orm';
import {
  quickbooksPnlRaw,
  quickbooksPnlData,
  quickbooksSyncLog,
  type NewQuickBooksPnlRaw,
  type NewQuickBooksPnlData,
  type NewQuickBooksSyncLog,
  type QuickBooksPnlRaw,
  type QuickBooksPnlData
} from '@/lib/db/quickbooks-schema';

/**
 * Store raw QuickBooks P&L response
 * Multi-tenant: Always includes companyId for proper isolation
 */
export async function storeRawPnLData(
  companyId: string,
  integrationId: string,
  realmId: string,
  periodStart: string,
  periodEnd: string,
  reportType: string,
  rawResponse: any,
  currency: string = 'USD',
  accountingMode: 'Accrual' | 'Cash' = 'Accrual'
): Promise<string> {
  try {
    console.log('🔍 [QB Storage] Storing raw P&L data for company:', companyId);

    const rawData: NewQuickBooksPnlRaw = {
      companyId,
      integrationId,
      realmId,
      periodStart: periodStart, // Keep as string, let Drizzle handle conversion
      periodEnd: periodEnd, // Keep as string, let Drizzle handle conversion
      periodType: 'month', // Default to monthly, can be enhanced later
      rawResponse,
      reportType,
      currency,
      accountingMode
    };

    const result = await db
      .insert(quickbooksPnlRaw)
      .values(rawData)
      .returning({ id: quickbooksPnlRaw.id });

    const rawDataId = result[0].id;
    console.log('✅ [QB Storage] Stored raw P&L data with ID:', rawDataId);

    return rawDataId;

  } catch (error) {
    console.error('❌ [QB Storage] Error storing raw P&L data:', error);
    throw new Error(`Failed to store raw P&L data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Store transformed P&L data (individual accounts and summaries)
 * Multi-tenant: Company isolation enforced at database level
 */
export async function storeTransformedPnLData(
  companyId: string,
  rawDataId: string,
  transformedData: any[],
  periodStart: string,
  periodEnd: string,
  periodLabel: string,
  currency: string = 'USD',
  accountingMode: 'Accrual' | 'Cash' = 'Accrual'
): Promise<void> {
  try {
    console.log('🔍 [QB Storage] Storing transformed P&L data for company:', companyId);
    console.log('🔍 [QB Storage] Records to store:', transformedData.length);
    console.log('🔍 [QB Storage] Period:', periodStart, 'to', periodEnd);

    // Delete any existing data for this period to avoid duplicates
    console.log('🧹 [QB Storage] Cleaning existing data for period...');
    await db.delete(quickbooksPnlData)
      .where(
        and(
          eq(quickbooksPnlData.companyId, companyId),
          eq(quickbooksPnlData.periodStart, periodStart),
          eq(quickbooksPnlData.periodEnd, periodEnd),
          eq(quickbooksPnlData.accountingMode, accountingMode)
        )
      );
    console.log('✅ [QB Storage] Existing data cleaned');

    // Debug: Check for duplicates in input data
    const accountNames = transformedData.map(row => row.accountName);
    const uniqueAccountNames = new Set(accountNames);
    console.log('🔍 [QB Storage] Total accounts in input:', accountNames.length);
    console.log('🔍 [QB Storage] Unique account names:', uniqueAccountNames.size);

    if (accountNames.length !== uniqueAccountNames.size) {
      console.warn('⚠️ [QB Storage] Input data contains duplicate account names!');
      // Group duplicates for debugging
      const duplicates: any = {};
      accountNames.forEach(name => {
        duplicates[name] = (duplicates[name] || 0) + 1;
      });
      const actualDuplicates = Object.entries(duplicates).filter(([_, count]) => (count as number) > 1);
      console.log('🔍 [QB Storage] Duplicate accounts:', actualDuplicates);
    }

    const dataRecords: NewQuickBooksPnlData[] = transformedData.map(row => ({
      companyId,
      rawDataId,
      periodStart: periodStart, // Keep as string, let Drizzle handle conversion
      periodEnd: periodEnd, // Keep as string, let Drizzle handle conversion
      periodLabel,

      // Account information
      accountName: row.accountName,
      accountCode: row.accountCode || null,
      accountType: row.accountType || null,

      // Categorization
      category: row.category,
      subcategory: row.subcategory || null,
      parentCategory: row.parentCategory || null,

      // Hierarchy
      level: row.level || 0,
      isDetailAccount: row.isDetailAccount || false,
      isSubtotal: row.isSubtotal || false,
      isTotal: row.isTotal || false,

      // Financial data
      amount: row.total || row.amount || '0',
      percentOfRevenue: row.percentOfRevenue || null,

      // Currency
      currency,
      originalAmount: row.originalAmount || row.total || row.amount || '0',
      accountingMode
    }));

    // Insert records individually to avoid any parameter limits
    console.log('🔍 [QB Storage] Inserting records individually to avoid parameter limits');

    // Debug: Show sample records
    if (dataRecords.length > 0) {
      console.log('🔍 [QB Storage] Sample record:', {
        accountName: dataRecords[0].accountName,
        category: dataRecords[0].category,
        amount: dataRecords[0].amount,
        level: dataRecords[0].level,
        isDetailAccount: dataRecords[0].isDetailAccount
      });
    }

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < dataRecords.length; i++) {
      try {
        await db.insert(quickbooksPnlData).values([dataRecords[i]]);
        successCount++;

        if (i > 0 && i % 10 === 0) {
          console.log(`🔍 [QB Storage] Progress: ${i}/${dataRecords.length} records inserted`);
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ [QB Storage] Error inserting record ${i + 1} (${dataRecords[i].accountName}):`, error instanceof Error ? error.message : 'Unknown error');

        // Log first failed record in detail for debugging
        if (i === 0) {
          console.error('🔍 [QB Storage] First failed record data:', {
            accountName: dataRecords[i].accountName,
            category: dataRecords[i].category,
            amount: dataRecords[i].amount,
            periodStart: dataRecords[i].periodStart,
            periodEnd: dataRecords[i].periodEnd
          });
        }

        // Continue with other records even if one fails
      }
    }

    console.log(`✅ [QB Storage] Insertion complete: ${successCount} success, ${errorCount} errors`);

    if (errorCount > 0) {
      console.warn(`⚠️ [QB Storage] ${errorCount} records failed to insert, but ${successCount} were successful`);
    }

    // Throw error if no records were successfully inserted
    if (successCount === 0) {
      throw new Error(`Failed to insert any transformed P&L data: ${errorCount} records failed`);
    }

    console.log('✅ [QB Storage] All transformed P&L data stored successfully');

  } catch (error) {
    console.error('❌ [QB Storage] Error storing transformed P&L data:', error);
    console.error('❌ [QB Storage] Error details:', error);
    throw new Error(`Failed to store transformed P&L data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Log sync operation for audit trail
 * Multi-tenant: Company-specific logging
 */
export async function logSyncOperation(
  companyId: string,
  integrationId: string,
  syncType: string,
  dataType: string,
  status: 'pending' | 'running' | 'completed' | 'failed',
  periodStart?: string,
  periodEnd?: string,
  recordsProcessed?: number,
  errorMessage?: string
): Promise<string> {
  try {
    const syncLogData: NewQuickBooksSyncLog = {
      companyId,
      integrationId,
      syncType,
      dataType,
      status,
      periodStart: periodStart ? periodStart : null,
      periodEnd: periodEnd ? periodEnd : null,
      recordsProcessed: recordsProcessed || 0,
      startedAt: new Date(),
      completedAt: status === 'completed' || status === 'failed' ? new Date() : null,
      errorMessage: errorMessage || null,
      errorDetails: errorMessage ? { error: errorMessage } : null
    };

    const result = await db
      .insert(quickbooksSyncLog)
      .values(syncLogData)
      .returning({ id: quickbooksSyncLog.id });

    const logId = result[0].id;
    console.log('📊 [QB Storage] Logged sync operation:', logId);

    return logId;

  } catch (error) {
    console.error('❌ [QB Storage] Error logging sync operation:', error);
    throw new Error(`Failed to log sync operation: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Retrieve transformed P&L data for a company and period
 * Multi-tenant: Only returns data for specified company
 */
export async function getTransformedPnLData(
  companyId: string,
  periodStart?: string,
  periodEnd?: string,
  accountingMode: 'Accrual' | 'Cash' = 'Accrual'
): Promise<QuickBooksPnlData[]> {
  try {
    console.log('🔍 [QB Storage] Retrieving P&L data for company:', companyId);

    let query = db
      .select()
      .from(quickbooksPnlData)
      .where(
        and(
          eq(quickbooksPnlData.companyId, companyId),
          eq(quickbooksPnlData.accountingMode, accountingMode)
        )
      );

    // Add period filters if provided
    if (periodStart && periodEnd) {
      query = query.where(
        and(
          eq(quickbooksPnlData.companyId, companyId),
          eq(quickbooksPnlData.accountingMode, accountingMode),
          gte(quickbooksPnlData.periodStart, periodStart),
          lte(quickbooksPnlData.periodEnd, periodEnd)
        )
      );
    }

    const data = await query.orderBy(
      desc(quickbooksPnlData.periodEnd),
      quickbooksPnlData.category,
      quickbooksPnlData.level,
      quickbooksPnlData.accountName
    );

    console.log('✅ [QB Storage] Retrieved P&L data records:', data.length);
    return data;

  } catch (error) {
    console.error('❌ [QB Storage] Error retrieving P&L data:', error);
    throw new Error(`Failed to retrieve P&L data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get P&L data for comparison periods (previous month, quarter, year)
 */
export async function getComparisonPnLData(
  companyId: string,
  currentPeriodEnd: string,
  comparisonType: 'last_month' | 'last_quarter' | 'last_year',
  accountingMode: 'Accrual' | 'Cash' = 'Accrual'
): Promise<QuickBooksPnlData[]> {
  try {
    console.log('🔍 [QB Storage] Fetching comparison data:', { companyId, currentPeriodEnd, comparisonType, accountingMode });

    // Calculate comparison period based on type
    const currentDate = new Date(currentPeriodEnd);
    let comparisonStart: Date, comparisonEnd: Date;

    switch (comparisonType) {
      case 'last_month':
        // Previous month
        comparisonEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0); // Last day of previous month
        comparisonStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1); // First day of previous month
        break;

      case 'last_quarter':
        // 3 months ago (same month, 3 months back)
        comparisonEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() - 3, currentDate.getDate());
        comparisonStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 3, 1);
        // Adjust to last day of that month
        comparisonEnd = new Date(comparisonEnd.getFullYear(), comparisonEnd.getMonth() + 1, 0);
        break;

      case 'last_year':
        // Same month, previous year
        comparisonStart = new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1);
        comparisonEnd = new Date(currentDate.getFullYear() - 1, currentDate.getMonth() + 1, 0);
        break;

      default:
        throw new Error(`Unknown comparison type: ${comparisonType}`);
    }

    const startStr = formatDateString(comparisonStart);
    const endStr = formatDateString(comparisonEnd);

    console.log('📅 [QB Storage] Comparison period:', { start: startStr, end: endStr });

    // Fetch data for the comparison period
    const data = await db
      .select()
      .from(quickbooksPnlData)
      .where(
        and(
          eq(quickbooksPnlData.companyId, companyId),
          eq(quickbooksPnlData.accountingMode, accountingMode),
          eq(quickbooksPnlData.periodStart, startStr),
          eq(quickbooksPnlData.periodEnd, endStr)
        )
      )
      .orderBy(
        quickbooksPnlData.category,
        quickbooksPnlData.level,
        quickbooksPnlData.accountName
      );

    console.log('✅ [QB Storage] Retrieved comparison data records:', data.length);
    return data;

  } catch (error) {
    console.error('❌ [QB Storage] Error retrieving comparison P&L data:', error);
    return []; // Return empty array on error to avoid breaking the dashboard
  }
}

// Helper function to format date as YYYY-MM-DD
function formatDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get raw P&L data for debugging/analysis
 * Multi-tenant: Company-specific retrieval
 */
export async function getRawPnLData(
  companyId: string,
  periodStart?: string,
  periodEnd?: string
): Promise<QuickBooksPnlRaw[]> {
  try {
    console.log('🔍 [QB Storage] Retrieving raw P&L data for company:', companyId);

    let query = db
      .select()
      .from(quickbooksPnlRaw)
      .where(eq(quickbooksPnlRaw.companyId, companyId));

    if (periodStart && periodEnd) {
      query = query.where(
        and(
          eq(quickbooksPnlRaw.companyId, companyId),
          gte(quickbooksPnlRaw.periodStart, periodStart),
          lte(quickbooksPnlRaw.periodEnd, periodEnd)
        )
      );
    }

    const data = await query.orderBy(desc(quickbooksPnlRaw.periodEnd));

    console.log('✅ [QB Storage] Retrieved raw P&L data records:', data.length);
    return data;

  } catch (error) {
    console.error('❌ [QB Storage] Error retrieving raw P&L data:', error);
    throw new Error(`Failed to retrieve raw P&L data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if P&L data exists for a company and period
 * Multi-tenant: Company-specific check
 */
export async function checkPnLDataExists(
  companyId: string,
  periodStart: string,
  periodEnd: string,
  accountingMode?: 'Accrual' | 'Cash'
): Promise<boolean> {
  try {
    const conditions = [
      eq(quickbooksPnlData.companyId, companyId),
      eq(quickbooksPnlData.periodStart, periodStart),
      eq(quickbooksPnlData.periodEnd, periodEnd)
    ];

    // If accounting mode is specified, include it in the check
    if (accountingMode) {
      conditions.push(eq(quickbooksPnlData.accountingMode, accountingMode));
    }

    const existing = await db
      .select({ id: quickbooksPnlData.id })
      .from(quickbooksPnlData)
      .where(and(...conditions))
      .limit(1);

    return existing.length > 0;

  } catch (error) {
    console.error('❌ [QB Storage] Error checking P&L data existence:', error);
    return false;
  }
}

/**
 * Get latest sync status for a company
 * Multi-tenant: Company-specific status
 */
export async function getLatestSyncStatus(companyId: string): Promise<any> {
  try {
    const latestSync = await db
      .select()
      .from(quickbooksSyncLog)
      .where(eq(quickbooksSyncLog.companyId, companyId))
      .orderBy(desc(quickbooksSyncLog.startedAt))
      .limit(1);

    return latestSync.length > 0 ? latestSync[0] : null;

  } catch (error) {
    console.error('❌ [QB Storage] Error getting latest sync status:', error);
    return null;
  }
}

/**
 * Get the latest available period for a company
 * Multi-tenant: Company-specific retrieval
 */
export async function getLatestAvailablePeriod(
  companyId: string
): Promise<{ periodStart: string; periodEnd: string; periodLabel: string } | null> {
  try {
    const data = await db
      .select({
        periodStart: quickbooksPnlData.periodStart,
        periodEnd: quickbooksPnlData.periodEnd,
        periodLabel: quickbooksPnlData.periodLabel
      })
      .from(quickbooksPnlData)
      .where(eq(quickbooksPnlData.companyId, companyId))
      .orderBy(desc(quickbooksPnlData.periodEnd))
      .limit(1);

    if (data.length === 0) {
      return null;
    }

    const latestPeriod = data[0];
    return {
      periodStart: latestPeriod.periodStart,
      periodEnd: latestPeriod.periodEnd,
      periodLabel: latestPeriod.periodLabel || ''
    };

  } catch (error) {
    console.error('❌ [QB Storage] Error getting latest available period:', error);
    return null;
  }
}

/**
 * Get all available periods for a company
 * Multi-tenant: Company-specific retrieval
 */
export async function getAllAvailablePeriods(
  companyId: string
): Promise<Array<{ periodStart: string; periodEnd: string; periodLabel: string }>> {
  try {
    console.log('🔍 [QB Storage] Fetching all available periods for company:', companyId);

    const data = await db
      .selectDistinct({
        periodStart: quickbooksPnlData.periodStart,
        periodEnd: quickbooksPnlData.periodEnd,
        periodLabel: quickbooksPnlData.periodLabel
      })
      .from(quickbooksPnlData)
      .where(eq(quickbooksPnlData.companyId, companyId))
      .orderBy(desc(quickbooksPnlData.periodEnd));

    console.log('✅ [QB Storage] Found available periods:', data.length);

    return data.map((period: any) => ({
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      periodLabel: period.periodLabel || ''
    }));

  } catch (error) {
    console.error('❌ [QB Storage] Error getting all available periods:', error);
    return [];
  }
}

/**
 * Get YTD (Year-to-Date) aggregated P&L data for a company up to a specific date
 * Multi-tenant: Company-specific retrieval
 */
export async function getYTDPnLData(
  companyId: string,
  endDate: string, // YYYY-MM-DD format
  accountingMode: 'Accrual' | 'Cash' = 'Accrual'
): Promise<QuickBooksPnlData[]> {
  try {
    console.log('🔍 [QB Storage] Calculating YTD P&L data for company:', companyId, 'up to:', endDate);

    // Calculate year start (January 1st of the same year)
    const endDateObj = new Date(endDate);
    const yearStart = `${endDateObj.getFullYear()}-01-01`;

    console.log('📅 [QB Storage] YTD period:', yearStart, 'to', endDate);

    // Get all P&L data for the year up to the end date
    const yearData = await db
      .select()
      .from(quickbooksPnlData)
      .where(
        and(
          eq(quickbooksPnlData.companyId, companyId),
          eq(quickbooksPnlData.accountingMode, accountingMode),
          gte(quickbooksPnlData.periodStart, yearStart),
          lte(quickbooksPnlData.periodEnd, endDate)
        )
      )
      .orderBy(quickbooksPnlData.periodStart, quickbooksPnlData.accountName);

    console.log('📊 [QB Storage] Found YTD records:', yearData.length);

    if (yearData.length === 0) {
      return [];
    }

    // Group by account and sum amounts
    const accountTotals = new Map<string, {
      record: QuickBooksPnlData;
      totalAmount: number;
      periodCount: number;
    }>();

    for (const record of yearData) {
      const key = `${record.accountName}|${record.category}|${record.subcategory || ''}`;
      const amount = parseFloat(record.amount.toString());

      if (!accountTotals.has(key)) {
        accountTotals.set(key, {
          record: { ...record },
          totalAmount: 0,
          periodCount: 0
        });
      }

      const account = accountTotals.get(key)!;
      account.totalAmount += amount;
      account.periodCount += 1;
    }

    // Convert back to QuickBooksPnlData format with aggregated amounts
    const ytdData: QuickBooksPnlData[] = [];

    for (const [key, account] of accountTotals) {
      ytdData.push({
        ...account.record,
        amount: account.totalAmount.toString(),
        periodStart: yearStart,
        periodEnd: endDate,
        periodLabel: `YTD ${endDateObj.getFullYear()}`,
        // Add metadata about aggregation
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    console.log('✅ [QB Storage] Generated YTD aggregated data records:', ytdData.length);
    return ytdData;

  } catch (error) {
    console.error('❌ [QB Storage] Error getting YTD P&L data:', error);
    throw new Error(`Failed to retrieve YTD P&L data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}