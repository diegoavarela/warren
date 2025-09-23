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
  currency: string = 'USD'
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
      currency
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
  currency: string = 'USD'
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
          eq(quickbooksPnlData.periodEnd, periodEnd)
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
      const actualDuplicates = Object.entries(duplicates).filter(([_, count]) => count > 1);
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
      originalAmount: row.originalAmount || row.total || row.amount || '0'
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
      startedAt: new Date().toISOString(),
      completedAt: status === 'completed' || status === 'failed' ? new Date().toISOString() : null,
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
  periodEnd?: string
): Promise<QuickBooksPnlData[]> {
  try {
    console.log('🔍 [QB Storage] Retrieving P&L data for company:', companyId);

    let query = db
      .select()
      .from(quickbooksPnlData)
      .where(eq(quickbooksPnlData.companyId, companyId));

    // Add period filters if provided
    if (periodStart && periodEnd) {
      query = query.where(
        and(
          eq(quickbooksPnlData.companyId, companyId),
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
  periodEnd: string
): Promise<boolean> {
  try {
    const existing = await db
      .select({ id: quickbooksPnlData.id })
      .from(quickbooksPnlData)
      .where(
        and(
          eq(quickbooksPnlData.companyId, companyId),
          eq(quickbooksPnlData.periodStart, periodStart),
          eq(quickbooksPnlData.periodEnd, periodEnd)
        )
      )
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