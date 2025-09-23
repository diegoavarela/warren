/**
 * QuickBooks Accumulative Data Service
 *
 * Handles YTD, QTD, and rolling period calculations for QuickBooks P&L data
 * Multi-tenant: Company isolation enforced
 */

import { db } from '@/lib/db';
import { eq, and, gte, lte, desc, asc } from 'drizzle-orm';
import {
  quickbooksPnlData,
  quickbooksPnlAccumulative,
  type NewQuickBooksPnlAccumulative,
  type QuickBooksPnlData,
  type QuickBooksPnlAccumulative
} from '@/lib/db/quickbooks-schema';

/**
 * Calculate and store YTD (Year-to-Date) accumulative data
 * This aggregates all P&L data from the beginning of the year to the specified period
 */
export async function calculateYTDAccumulative(
  companyId: string,
  endDate: string, // YYYY-MM-DD format
  currency: string = 'USD'
): Promise<void> {
  try {
    console.log('🔄 [QB Accumulative] Calculating YTD data for company:', companyId, 'end:', endDate);

    // Calculate year start (January 1st of the same year)
    const endDateObj = new Date(endDate);
    const yearStart = `${endDateObj.getFullYear()}-01-01`;

    console.log('📅 [QB Accumulative] YTD period:', yearStart, 'to', endDate);

    // Get all P&L data for the year up to the end date
    const yearData = await db
      .select()
      .from(quickbooksPnlData)
      .where(
        and(
          eq(quickbooksPnlData.companyId, companyId),
          gte(quickbooksPnlData.periodStart, yearStart),
          lte(quickbooksPnlData.periodEnd, endDate)
        )
      )
      .orderBy(quickbooksPnlData.periodStart, quickbooksPnlData.accountName);

    console.log('📊 [QB Accumulative] Found records for YTD calculation:', yearData.length);

    if (yearData.length === 0) {
      console.log('⚠️ [QB Accumulative] No data found for YTD calculation');
      return;
    }

    // Group by account and calculate totals
    const accountTotals = new Map<string, {
      accountName: string;
      accountCode: string | null;
      accountType: string | null;
      category: string;
      subcategory: string | null;
      amounts: number[];
      periodBreakdown: { period: string; amount: number }[];
      totalAmount: number;
      currency: string;
    }>();

    for (const record of yearData) {
      const key = `${record.accountName}|${record.category}`;
      const amount = parseFloat(record.amount.toString());

      if (!accountTotals.has(key)) {
        accountTotals.set(key, {
          accountName: record.accountName,
          accountCode: record.accountCode,
          accountType: record.accountType,
          category: record.category,
          subcategory: record.subcategory,
          amounts: [],
          periodBreakdown: [],
          totalAmount: 0,
          currency: record.currency
        });
      }

      const account = accountTotals.get(key)!;
      account.amounts.push(amount);
      account.periodBreakdown.push({
        period: record.periodLabel,
        amount: amount
      });
      account.totalAmount += amount;
    }

    console.log('📈 [QB Accumulative] Calculated totals for accounts:', accountTotals.size);

    // Clear existing YTD data for this period and company
    await db
      .delete(quickbooksPnlAccumulative)
      .where(
        and(
          eq(quickbooksPnlAccumulative.companyId, companyId),
          eq(quickbooksPnlAccumulative.periodEnd, endDate),
          eq(quickbooksPnlAccumulative.periodType, 'ytd')
        )
      );

    console.log('🧹 [QB Accumulative] Cleared existing YTD data for period');

    // Prepare accumulative records
    const accumulativeRecords: NewQuickBooksPnlAccumulative[] = [];

    for (const [key, account] of accountTotals) {
      const periodCount = account.amounts.length;
      const averageAmount = periodCount > 0 ? account.totalAmount / periodCount : 0;

      accumulativeRecords.push({
        companyId,
        periodEnd: endDate,
        periodType: 'ytd',
        accountName: account.accountName,
        accountCode: account.accountCode,
        accountType: account.accountType,
        category: account.category,
        subcategory: account.subcategory,
        totalAmount: account.totalAmount.toString(),
        periodCount,
        averageAmount: averageAmount.toString(),
        monthlyBreakdown: account.periodBreakdown,
        currency: account.currency
      });
    }

    // Store accumulative data in batches
    if (accumulativeRecords.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < accumulativeRecords.length; i += batchSize) {
        const batch = accumulativeRecords.slice(i, i + batchSize);
        await db.insert(quickbooksPnlAccumulative).values(batch);
        console.log(`✅ [QB Accumulative] Stored YTD batch ${Math.floor(i/batchSize) + 1}, records: ${batch.length}`);
      }
    }

    console.log('✅ [QB Accumulative] YTD calculation completed successfully');

  } catch (error) {
    console.error('❌ [QB Accumulative] Error calculating YTD data:', error);
    throw new Error(`Failed to calculate YTD accumulative data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Calculate and store QTD (Quarter-to-Date) accumulative data
 */
export async function calculateQTDAccumulative(
  companyId: string,
  endDate: string,
  currency: string = 'USD'
): Promise<void> {
  try {
    console.log('🔄 [QB Accumulative] Calculating QTD data for company:', companyId, 'end:', endDate);

    const endDateObj = new Date(endDate);
    const year = endDateObj.getFullYear();
    const month = endDateObj.getMonth() + 1; // JavaScript months are 0-based

    // Determine quarter start
    let quarterStart: string;
    if (month <= 3) {
      quarterStart = `${year}-01-01`; // Q1: Jan-Mar
    } else if (month <= 6) {
      quarterStart = `${year}-04-01`; // Q2: Apr-Jun
    } else if (month <= 9) {
      quarterStart = `${year}-07-01`; // Q3: Jul-Sep
    } else {
      quarterStart = `${year}-10-01`; // Q4: Oct-Dec
    }

    console.log('📅 [QB Accumulative] QTD period:', quarterStart, 'to', endDate);

    // Get all P&L data for the quarter up to the end date
    const quarterData = await db
      .select()
      .from(quickbooksPnlData)
      .where(
        and(
          eq(quickbooksPnlData.companyId, companyId),
          gte(quickbooksPnlData.periodStart, quarterStart),
          lte(quickbooksPnlData.periodEnd, endDate)
        )
      )
      .orderBy(quickbooksPnlData.periodStart, quickbooksPnlData.accountName);

    if (quarterData.length === 0) {
      console.log('⚠️ [QB Accumulative] No data found for QTD calculation');
      return;
    }

    // Use similar logic as YTD but for quarter data
    const accountTotals = new Map<string, {
      accountName: string;
      accountCode: string | null;
      accountType: string | null;
      category: string;
      subcategory: string | null;
      amounts: number[];
      periodBreakdown: { period: string; amount: number }[];
      totalAmount: number;
      currency: string;
    }>();

    for (const record of quarterData) {
      const key = `${record.accountName}|${record.category}`;
      const amount = parseFloat(record.amount.toString());

      if (!accountTotals.has(key)) {
        accountTotals.set(key, {
          accountName: record.accountName,
          accountCode: record.accountCode,
          accountType: record.accountType,
          category: record.category,
          subcategory: record.subcategory,
          amounts: [],
          periodBreakdown: [],
          totalAmount: 0,
          currency: record.currency
        });
      }

      const account = accountTotals.get(key)!;
      account.amounts.push(amount);
      account.periodBreakdown.push({
        period: record.periodLabel,
        amount: amount
      });
      account.totalAmount += amount;
    }

    // Clear existing QTD data
    await db
      .delete(quickbooksPnlAccumulative)
      .where(
        and(
          eq(quickbooksPnlAccumulative.companyId, companyId),
          eq(quickbooksPnlAccumulative.periodEnd, endDate),
          eq(quickbooksPnlAccumulative.periodType, 'qtd')
        )
      );

    // Store QTD accumulative records
    const accumulativeRecords: NewQuickBooksPnlAccumulative[] = [];

    for (const [key, account] of accountTotals) {
      const periodCount = account.amounts.length;
      const averageAmount = periodCount > 0 ? account.totalAmount / periodCount : 0;

      accumulativeRecords.push({
        companyId,
        periodEnd: endDate,
        periodType: 'qtd',
        accountName: account.accountName,
        accountCode: account.accountCode,
        accountType: account.accountType,
        category: account.category,
        subcategory: account.subcategory,
        totalAmount: account.totalAmount.toString(),
        periodCount,
        averageAmount: averageAmount.toString(),
        monthlyBreakdown: account.periodBreakdown,
        currency: account.currency
      });
    }

    if (accumulativeRecords.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < accumulativeRecords.length; i += batchSize) {
        const batch = accumulativeRecords.slice(i, i + batchSize);
        await db.insert(quickbooksPnlAccumulative).values(batch);
      }
    }

    console.log('✅ [QB Accumulative] QTD calculation completed successfully');

  } catch (error) {
    console.error('❌ [QB Accumulative] Error calculating QTD data:', error);
    throw new Error(`Failed to calculate QTD accumulative data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Calculate rolling 12-month accumulative data
 */
export async function calculateRolling12MAccumulative(
  companyId: string,
  endDate: string,
  currency: string = 'USD'
): Promise<void> {
  try {
    console.log('🔄 [QB Accumulative] Calculating Rolling 12M data for company:', companyId, 'end:', endDate);

    // Calculate 12 months back from end date
    const endDateObj = new Date(endDate);
    const startDateObj = new Date(endDateObj);
    startDateObj.setFullYear(endDateObj.getFullYear() - 1);
    startDateObj.setDate(endDateObj.getDate() + 1); // Start from next day of 12 months ago

    const startDate = startDateObj.toISOString().split('T')[0];

    console.log('📅 [QB Accumulative] Rolling 12M period:', startDate, 'to', endDate);

    // Get all P&L data for the rolling 12-month period
    const rollingData = await db
      .select()
      .from(quickbooksPnlData)
      .where(
        and(
          eq(quickbooksPnlData.companyId, companyId),
          gte(quickbooksPnlData.periodStart, startDate),
          lte(quickbooksPnlData.periodEnd, endDate)
        )
      )
      .orderBy(quickbooksPnlData.periodStart, quickbooksPnlData.accountName);

    if (rollingData.length === 0) {
      console.log('⚠️ [QB Accumulative] No data found for Rolling 12M calculation');
      return;
    }

    // Calculate accumulative totals
    const accountTotals = new Map<string, {
      accountName: string;
      accountCode: string | null;
      accountType: string | null;
      category: string;
      subcategory: string | null;
      amounts: number[];
      periodBreakdown: { period: string; amount: number }[];
      totalAmount: number;
      currency: string;
    }>();

    for (const record of rollingData) {
      const key = `${record.accountName}|${record.category}`;
      const amount = parseFloat(record.amount.toString());

      if (!accountTotals.has(key)) {
        accountTotals.set(key, {
          accountName: record.accountName,
          accountCode: record.accountCode,
          accountType: record.accountType,
          category: record.category,
          subcategory: record.subcategory,
          amounts: [],
          periodBreakdown: [],
          totalAmount: 0,
          currency: record.currency
        });
      }

      const account = accountTotals.get(key)!;
      account.amounts.push(amount);
      account.periodBreakdown.push({
        period: record.periodLabel,
        amount: amount
      });
      account.totalAmount += amount;
    }

    // Clear existing Rolling 12M data
    await db
      .delete(quickbooksPnlAccumulative)
      .where(
        and(
          eq(quickbooksPnlAccumulative.companyId, companyId),
          eq(quickbooksPnlAccumulative.periodEnd, endDate),
          eq(quickbooksPnlAccumulative.periodType, 'rolling_12m')
        )
      );

    // Store Rolling 12M accumulative records
    const accumulativeRecords: NewQuickBooksPnlAccumulative[] = [];

    for (const [key, account] of accountTotals) {
      const periodCount = account.amounts.length;
      const averageAmount = periodCount > 0 ? account.totalAmount / periodCount : 0;

      accumulativeRecords.push({
        companyId,
        periodEnd: endDate,
        periodType: 'rolling_12m',
        accountName: account.accountName,
        accountCode: account.accountCode,
        accountType: account.accountType,
        category: account.category,
        subcategory: account.subcategory,
        totalAmount: account.totalAmount.toString(),
        periodCount,
        averageAmount: averageAmount.toString(),
        monthlyBreakdown: account.periodBreakdown,
        currency: account.currency
      });
    }

    if (accumulativeRecords.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < accumulativeRecords.length; i += batchSize) {
        const batch = accumulativeRecords.slice(i, i + batchSize);
        await db.insert(quickbooksPnlAccumulative).values(batch);
      }
    }

    console.log('✅ [QB Accumulative] Rolling 12M calculation completed successfully');

  } catch (error) {
    console.error('❌ [QB Accumulative] Error calculating Rolling 12M data:', error);
    throw new Error(`Failed to calculate Rolling 12M accumulative data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Calculate all accumulative types for a period
 * This is a convenience function to calculate YTD, QTD, and Rolling 12M in one call
 */
export async function calculateAllAccumulative(
  companyId: string,
  endDate: string,
  currency: string = 'USD'
): Promise<void> {
  try {
    console.log('🔄 [QB Accumulative] Calculating all accumulative types for company:', companyId);

    await Promise.all([
      calculateYTDAccumulative(companyId, endDate, currency),
      calculateQTDAccumulative(companyId, endDate, currency),
      calculateRolling12MAccumulative(companyId, endDate, currency)
    ]);

    console.log('✅ [QB Accumulative] All accumulative calculations completed successfully');

  } catch (error) {
    console.error('❌ [QB Accumulative] Error calculating all accumulative data:', error);
    throw new Error(`Failed to calculate all accumulative data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get accumulative data for a company and period
 */
export async function getAccumulativeData(
  companyId: string,
  endDate: string,
  periodType: 'ytd' | 'qtd' | 'rolling_12m' = 'ytd'
): Promise<QuickBooksPnlAccumulative[]> {
  try {
    console.log('🔍 [QB Accumulative] Retrieving accumulative data:', { companyId, endDate, periodType });

    const data = await db
      .select()
      .from(quickbooksPnlAccumulative)
      .where(
        and(
          eq(quickbooksPnlAccumulative.companyId, companyId),
          eq(quickbooksPnlAccumulative.periodEnd, endDate),
          eq(quickbooksPnlAccumulative.periodType, periodType)
        )
      )
      .orderBy(
        quickbooksPnlAccumulative.category,
        desc(quickbooksPnlAccumulative.totalAmount)
      );

    console.log('✅ [QB Accumulative] Retrieved accumulative records:', data.length);
    return data;

  } catch (error) {
    console.error('❌ [QB Accumulative] Error retrieving accumulative data:', error);
    throw new Error(`Failed to retrieve accumulative data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get latest accumulative calculation date for a company
 * This helps determine when data was last calculated
 */
export async function getLatestAccumulativeDate(
  companyId: string,
  periodType: 'ytd' | 'qtd' | 'rolling_12m' = 'ytd'
): Promise<string | null> {
  try {
    const latest = await db
      .select({ periodEnd: quickbooksPnlAccumulative.periodEnd })
      .from(quickbooksPnlAccumulative)
      .where(
        and(
          eq(quickbooksPnlAccumulative.companyId, companyId),
          eq(quickbooksPnlAccumulative.periodType, periodType)
        )
      )
      .orderBy(desc(quickbooksPnlAccumulative.periodEnd))
      .limit(1);

    return latest.length > 0 ? latest[0].periodEnd : null;

  } catch (error) {
    console.error('❌ [QB Accumulative] Error getting latest accumulative date:', error);
    return null;
  }
}