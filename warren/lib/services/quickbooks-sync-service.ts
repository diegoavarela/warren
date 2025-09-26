/**
 * QuickBooks Multi-Month Sync Service
 *
 * Handles fetching and maintaining historical P&L data
 * Supports rolling 12 months + YTD calculations
 */

import { callQuickBooksAPI } from './quickbooks-service';
import {
  storeRawPnLData,
  storeTransformedPnLData,
  logSyncOperation,
  checkPnLDataExists
} from './quickbooks-storage-service';
import { db, eq } from '@/lib/db';
import { quickbooksIntegrations } from '@/lib/db/actual-schema';

export interface SyncProgress {
  totalMonths: number;
  completedMonths: number;
  currentMonth: string;
  status: 'running' | 'completed' | 'error';
  error?: string;
}

export interface SyncOptions {
  monthsToFetch?: number; // Default 12
  skipExisting?: boolean; // Default true
  includeComparison?: boolean; // Default true (fetch previous year too)
}

/**
 * Sync a full year of P&L data for a company
 */
export async function syncFullYear(
  companyId: string,
  realmId: string,
  options: SyncOptions = {}
): Promise<SyncProgress> {
  const {
    monthsToFetch = 12,
    skipExisting = true,
    includeComparison = true
  } = options;

  console.log('🔄 [QB Sync] Starting full year sync:', {
    companyId,
    realmId,
    monthsToFetch,
    includeComparison
  });

  // Get integration ID
  const integration = await getIntegrationByRealmId(realmId);
  if (!integration) {
    throw new Error(`No integration found for realm_id: ${realmId}`);
  }

  const totalMonths = includeComparison ? monthsToFetch * 2 : monthsToFetch;
  let completedMonths = 0;

  try {
    // Log sync start
    const syncLogId = await logSyncOperation(
      companyId,
      integration.id,
      'manual',
      'pnl',
      'running',
      undefined,
      undefined,
      0
    );

    // Generate date ranges for current year
    const currentYearRanges = generateMonthlyDateRanges(monthsToFetch);

    // Generate date ranges for comparison year (previous year)
    const comparisonRanges = includeComparison
      ? generateMonthlyDateRanges(monthsToFetch, true)
      : [];

    const allRanges = [...currentYearRanges, ...comparisonRanges];

    // Sync each month
    for (const range of allRanges) {
      console.log(`📅 [QB Sync] Processing ${range.label} (${range.start} to ${range.end})`);

      // Skip if data already exists and skipExisting is true
      let shouldSkipAccrual = false;
      let shouldSkipCash = false;

      if (skipExisting) {
        const accrualExists = await checkPnLDataExists(companyId, range.start, range.end, 'Accrual');
        const cashExists = await checkPnLDataExists(companyId, range.start, range.end, 'Cash');

        shouldSkipAccrual = accrualExists;
        shouldSkipCash = cashExists;

        // If both exist, skip entirely
        if (accrualExists && cashExists) {
          console.log(`⏭️ [QB Sync] Skipping ${range.label} - both Accrual and Cash data already exist`);
          completedMonths++;
          continue;
        }

        console.log(`📋 [QB Sync] ${range.label} status: Accrual=${accrualExists ? 'exists' : 'missing'}, Cash=${cashExists ? 'exists' : 'missing'}`);
      }

      try {
        // Fetch and store Accrual data if needed
        if (!shouldSkipAccrual) {
          console.log(`📥 [QB Sync] Fetching Accrual data for ${range.label}...`);
          const accrualPnlResponse = await callQuickBooksAPI(
            realmId,
            `reports/ProfitAndLoss?start_date=${range.start}&end_date=${range.end}&summarize_column_by=Month&accounting_method=Accrual`
          );

          const accrualRawDataId = await storeRawPnLData(
            companyId,
            integration.id,
            realmId,
            range.start,
            range.end,
            'ProfitAndLoss',
            accrualPnlResponse,
            'USD',
            'Accrual'
          );

          const accrualTransformedData = transformPnLData(accrualPnlResponse);
          await storeTransformedPnLData(
            companyId,
            accrualRawDataId,
            accrualTransformedData,
            range.start,
            range.end,
            range.label,
            'USD',
            'Accrual'
          );
          console.log(`✅ [QB Sync] Stored Accrual data for ${range.label}`);
        } else {
          console.log(`⏭️ [QB Sync] Skipping Accrual data for ${range.label} - already exists`);
        }

        // Fetch and store Cash data if needed
        if (!shouldSkipCash) {
          console.log(`📥 [QB Sync] Fetching Cash data for ${range.label}...`);
          const cashPnlResponse = await callQuickBooksAPI(
            realmId,
            `reports/ProfitAndLoss?start_date=${range.start}&end_date=${range.end}&summarize_column_by=Month&accounting_method=Cash`
          );

          const cashRawDataId = await storeRawPnLData(
            companyId,
            integration.id,
            realmId,
            range.start,
            range.end,
            'ProfitAndLoss',
            cashPnlResponse,
            'USD',
            'Cash'
          );

          const cashTransformedData = transformPnLData(cashPnlResponse);
          await storeTransformedPnLData(
            companyId,
            cashRawDataId,
            cashTransformedData,
            range.start,
            range.end,
            range.label,
            'USD',
            'Cash'
          );
          console.log(`✅ [QB Sync] Stored Cash data for ${range.label}`);
        } else {
          console.log(`⏭️ [QB Sync] Skipping Cash data for ${range.label} - already exists`);
        }

        completedMonths++;
        console.log(`✅ [QB Sync] Completed ${range.label} (${completedMonths}/${totalMonths})`);

      } catch (error) {
        console.error(`❌ [QB Sync] Failed to sync ${range.label}:`, error);
        // Continue with other months instead of stopping
      }
    }

    // Log sync completion
    await logSyncOperation(
      companyId,
      integration.id,
      'manual',
      'pnl',
      'completed',
      undefined,
      undefined,
      completedMonths
    );

    console.log(`🎉 [QB Sync] Full year sync completed: ${completedMonths}/${totalMonths} months`);

    return {
      totalMonths,
      completedMonths,
      currentMonth: 'completed',
      status: 'completed'
    };

  } catch (error) {
    console.error('❌ [QB Sync] Full year sync failed:', error);

    return {
      totalMonths,
      completedMonths,
      currentMonth: 'error',
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Sync only the most recent month (for regular updates)
 */
export async function syncLatestMonth(
  companyId: string,
  realmId: string
): Promise<boolean> {
  console.log('🔄 [QB Sync] Syncing latest month for company:', companyId);

  try {
    const integration = await getIntegrationByRealmId(realmId);
    if (!integration) {
      throw new Error(`No integration found for realm_id: ${realmId}`);
    }

    // Get current month range
    const currentMonth = new Date();
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth(); // 0-indexed

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0); // Last day of month

    const start = formatDate(startDate);
    const end = formatDate(endDate);
    const label = startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Fetch and store both Accrual and Cash data (will overwrite existing data for this month)
    const accrualPnlResponse = await callQuickBooksAPI(
      realmId,
      `reports/ProfitAndLoss?start_date=${start}&end_date=${end}&summarize_column_by=Month&accounting_method=Accrual`
    );

    const cashPnlResponse = await callQuickBooksAPI(
      realmId,
      `reports/ProfitAndLoss?start_date=${start}&end_date=${end}&summarize_column_by=Month&accounting_method=Cash`
    );

    const accrualRawDataId = await storeRawPnLData(
      companyId,
      integration.id,
      realmId,
      start,
      end,
      'ProfitAndLoss',
      accrualPnlResponse,
      'USD',
      'Accrual'
    );

    const cashRawDataId = await storeRawPnLData(
      companyId,
      integration.id,
      realmId,
      start,
      end,
      'ProfitAndLoss',
      cashPnlResponse,
      'USD',
      'Cash'
    );

    const accrualTransformedData = transformPnLData(accrualPnlResponse);
    await storeTransformedPnLData(
      companyId,
      accrualRawDataId,
      accrualTransformedData,
      start,
      end,
      label,
      'USD',
      'Accrual'
    );

    const cashTransformedData = transformPnLData(cashPnlResponse);
    await storeTransformedPnLData(
      companyId,
      cashRawDataId,
      cashTransformedData,
      start,
      end,
      label,
      'USD',
      'Cash'
    );

    console.log(`✅ [QB Sync] Latest month sync completed: ${label}`);
    return true;

  } catch (error) {
    console.error('❌ [QB Sync] Latest month sync failed:', error);
    return false;
  }
}

/**
 * Generate monthly date ranges for the specified number of months
 */
function generateMonthlyDateRanges(monthsBack: number, previousYear: boolean = false): Array<{
  start: string;
  end: string;
  label: string;
}> {
  const ranges = [];
  const currentDate = new Date();

  // If previousYear is true, go back an additional 12 months
  const yearOffset = previousYear ? 12 : 0;

  for (let i = 0; i < monthsBack; i++) {
    const targetMonth = new Date(currentDate);
    targetMonth.setMonth(targetMonth.getMonth() - (i + 1 + yearOffset)); // Go back i+1 months

    const year = targetMonth.getFullYear();
    const month = targetMonth.getMonth();

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0); // Last day of month

    ranges.unshift({
      start: formatDate(startDate),
      end: formatDate(endDate),
      label: startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    });
  }

  return ranges;
}

/**
 * Format date to YYYY-MM-DD format for QuickBooks API
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get integration by realm ID
 */
async function getIntegrationByRealmId(realmId: string) {
  const integrations = await db
    .select({ id: quickbooksIntegrations.id })
    .from(quickbooksIntegrations)
    .where(eq(quickbooksIntegrations.realmId, realmId))
    .limit(1);

  return integrations.length > 0 ? integrations[0] : null;
}

/**
 * Transform P&L data (reuse from store-test)
 */
function transformPnLData(pnlResponse: any): any[] {
  const transformedRows: any[] = [];
  const processedAccounts = new Set<string>();

  if (!pnlResponse) {
    console.log('⚠️ [Transform] No P&L response provided');
    return transformedRows;
  }

  // Handle both { Report: {...} } and direct { Rows: {...} } formats
  const reportData = pnlResponse.Report || pnlResponse;
  const rowsToProcess = reportData?.Rows?.Row || [];

  console.log('🔄 [Transform] Starting transformation with', {
    responseFormat: pnlResponse.Report ? 'Wrapped' : 'Direct',
    rowsCount: Array.isArray(rowsToProcess) ? rowsToProcess.length : 0,
    reportName: reportData?.ReportName || 'Unknown'
  });

  // Process each section
  function processSection(section: any, level = 0, parentCategory = null) {
    if (!section) return;

    const sectionGroup = section.group;
    let sectionCategory = mapQuickBooksGroupToCategory(sectionGroup);

    // If we have a parent category and this section doesn't have a clear category,
    // inherit from parent (this handles nested items like "Landscaping Services" under "Income")
    if (parentCategory && (sectionCategory === 'Other' || !sectionCategory)) {
      sectionCategory = parentCategory;
    }

    let sectionName = null;
    let sectionHasOwnAmount = false;

    // Process section header
    if (section.Header && section.Header.ColData) {
      const headerData = section.Header.ColData;
      sectionName = headerData[0]?.value || sectionGroup;
      const sectionTotal = parseFloat(headerData[headerData.length - 1]?.value || '0');
      sectionHasOwnAmount = sectionTotal !== 0;

      const sectionKey = `${sectionName}_${level}_section`;
      if (!processedAccounts.has(sectionKey)) {
        processedAccounts.add(sectionKey);

        // Determine parent relationship
        const actualParentCategory = level > 0 && parentCategory ?
          (typeof parentCategory === 'string' ? parentCategory : sectionCategory) :
          null;

        transformedRows.push({
          accountName: sectionName,
          category: sectionCategory,
          subcategory: sectionName,
          parentCategory: actualParentCategory,
          level: level,
          isDetailAccount: false,
          isSubtotal: false,
          isTotal: true,
          total: sectionTotal,
          amount: sectionTotal,
          originalAmount: sectionTotal
        });
      }
    }

    // Process nested rows - pass the section name (if it has own amount) or category as parent
    if (section.Rows && section.Rows.Row && Array.isArray(section.Rows.Row)) {
      const childParent = sectionHasOwnAmount && sectionName ? sectionName : sectionCategory;
      for (const row of section.Rows.Row) {
        processAccountRow(row, level + 1, childParent);
      }
    }
  }

  function processAccountRow(row: any, level: number, parentCategory: string) {
    if (!row) return;

    // Handle detail accounts
    if (row.ColData && Array.isArray(row.ColData)) {
      const colData = row.ColData;
      const accountName = colData[0]?.value;
      const accountId = colData[0]?.id;

      if (accountName && accountName.trim()) {
        const accountTotal = parseFloat(colData[colData.length - 1]?.value || '0');
        const accountKey = `${accountName}_${accountId}_${level}_detail`;

        if (!processedAccounts.has(accountKey)) {
          processedAccounts.add(accountKey);

          // Determine the category - should be the main category (Revenue, Operating Expenses, etc.)
          let category;

          // Special handling for accounts that should map to specific categories regardless of parent
          const accountCategory = mapQuickBooksGroupToCategory(accountName);
          if (accountCategory === 'Other Expenses') {
            // Accounts like "Miscellaneous" should always be Other Expenses
            category = accountCategory;
          } else if (parentCategory === 'Revenue' || parentCategory === 'Operating Expenses' || parentCategory === 'Cost of Goods Sold' || parentCategory === 'Other Expenses') {
            // If parent is a main category, use it directly
            category = parentCategory;
          } else {
            // If parent is a specific account (like "Automobile"), find its category by mapping
            category = mapQuickBooksGroupToCategory(parentCategory);
            if (!category || category === 'Other') {
              // Try mapping the parent category name
              category = mapQuickBooksGroupToCategory(parentCategory);
              if (!category || category === 'Other') {
                // Fallback: assume Operating Expenses for most cases
                category = 'Operating Expenses';
              }
            }
          }

          // For subcategory: use account name
          const subcategory = accountName;

          transformedRows.push({
            accountName,
            category,
            subcategory,
            parentCategory,
            level,
            isDetailAccount: true,
            isSubtotal: false,
            isTotal: false,
            total: accountTotal,
            amount: accountTotal,
            originalAmount: accountTotal
          });
        }
      }
    }

    // Handle nested sections
    if (row.type === 'Section') {
      processSection(row, level, null);
    }

    // Handle subsection rows recursively
    if (row.Rows && row.Rows.Row && Array.isArray(row.Rows.Row)) {
      for (const nestedRow of row.Rows.Row) {
        processAccountRow(nestedRow, level + 1, parentCategory);
      }
    }
  }

  // Process all top-level sections
  if (Array.isArray(rowsToProcess)) {
    for (const section of rowsToProcess) {
      processSection(section);
    }
  }

  console.log('✅ [Transform] Transformation complete:', {
    totalRows: transformedRows.length,
    detailAccounts: transformedRows.filter(r => r.isDetailAccount).length,
    categories: [...new Set(transformedRows.map(r => r.category))]
  });

  return transformedRows;
}

/**
 * Map QuickBooks group names to Warren categories
 */
function mapQuickBooksGroupToCategory(group: string | undefined): string {
  if (!group) return 'Other';

  const groupLower = group.toLowerCase();

  // Income/Revenue patterns
  if (groupLower.includes('income') ||
      groupLower.includes('revenue') ||
      groupLower.includes('sales') ||
      groupLower.includes('service') ||
      groupLower === 'landscaping services' // Specific case
  ) {
    return 'Revenue';
  }

  // Cost patterns
  if (groupLower.includes('cost of goods sold') ||
      groupLower.includes('cogs') ||
      groupLower.includes('cost of sales')) {
    return 'Cost of Goods Sold';
  }

  // Other Expenses patterns (should come before general expense patterns)
  if (groupLower.includes('other expense') ||
      groupLower === 'other expenses' ||
      groupLower.includes('miscellaneous') ||
      groupLower === 'other') {
    return 'Other Expenses';
  }

  // Operating Expense patterns
  if (groupLower.includes('expense') ||
      groupLower.includes('operating') ||
      groupLower.includes('admin') ||
      groupLower.includes('general')) {
    return 'Operating Expenses';
  }

  // If we can't determine, return 'Other' instead of the group name
  return 'Other';
}