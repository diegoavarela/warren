/**
 * QuickBooks Storage Test Endpoint
 *
 * Tests the storage system with real QuickBooks data
 * Multi-tenant company isolation validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { callQuickBooksAPI } from '@/lib/services/quickbooks-service';
import {
  storeRawPnLData,
  storeTransformedPnLData,
  logSyncOperation,
  getTransformedPnLData,
  checkPnLDataExists
} from '@/lib/services/quickbooks-storage-service';
import { db, eq } from '@/lib/db';
import { quickbooksIntegrations } from '@/lib/db/actual-schema';

export async function GET(request: NextRequest) {
  return handleRequest(request);
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}

async function handleRequest(request: NextRequest) {
  try {
    // Support both query params and POST body
    let realmId, companyId, action;

    let periodStart, periodEnd;

    if (request.method === 'POST') {
      const body = await request.json();
      realmId = body.realmId;
      companyId = body.companyId;
      action = body.action || 'store';
      periodStart = body.periodStart;
      periodEnd = body.periodEnd;
    } else {
      const searchParams = request.nextUrl.searchParams;
      realmId = searchParams.get('realmId');
      companyId = searchParams.get('companyId');
      action = searchParams.get('action') || 'store';
      periodStart = searchParams.get('periodStart');
      periodEnd = searchParams.get('periodEnd');
    }

    if (!realmId) {
      return NextResponse.json({
        error: 'realmId parameter is required'
      }, { status: 400 });
    }

    if (!companyId) {
      return NextResponse.json({
        error: 'companyId parameter is required for multi-tenant storage'
      }, { status: 400 });
    }

    console.log('🔍 [QB Store Test] Testing storage for company:', companyId, 'realm:', realmId);

    if (action === 'retrieve') {
      return await retrieveStoredData(companyId);
    } else if (action === 'check') {
      return await checkDataExists(companyId);
    } else {
      return await storeNewData(companyId, realmId);
    }

  } catch (error) {
    console.error('❌ [QB Store Test] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function storeNewData(companyId: string, realmId: string) {
  console.log('🔍 [QB Store Test] Starting storage test...');

  try {
    // Get the integration ID from the database
    console.log('🔍 [QB Store Test] Looking up integration for realm_id:', realmId);
    const integrations = await db
      .select({ id: quickbooksIntegrations.id })
      .from(quickbooksIntegrations)
      .where(eq(quickbooksIntegrations.realmId, realmId))
      .limit(1);

    console.log('🔍 [QB Store Test] Integration query result:', integrations);

    if (integrations.length === 0) {
      throw new Error(`No integration found for realm_id: ${realmId}`);
    }

    const integrationId = integrations[0].id;
    console.log('✅ [QB Store Test] Found integration ID:', integrationId);
    // Step 1: Fetch raw data from QuickBooks
    console.log('📥 [QB Store Test] Fetching raw P&L data from QuickBooks...');

    const pnlResponse = await callQuickBooksAPI(
      realmId,
      `reports/ProfitAndLoss?start_date=2025-08-01&end_date=2025-08-31&summarize_column_by=Month`
    );

    // Step 2: Store raw data
    console.log('💾 [QB Store Test] Storing raw P&L data...');

    const rawDataId = await storeRawPnLData(
      companyId,
      integrationId,
      realmId,
      '2025-08-01',
      '2025-08-31',
      'ProfitAndLoss',
      pnlResponse,
      'USD'
    );

    // Step 3: Transform the data (reuse existing transform logic)
    console.log('🔄 [QB Store Test] Transforming P&L data...');

    const transformedData = transformPnLData(pnlResponse);

    // Step 4: Store transformed data
    console.log('💾 [QB Store Test] Storing transformed P&L data...');

    await storeTransformedPnLData(
      companyId,
      rawDataId,
      transformedData,
      '2025-08-01',
      '2025-08-31',
      'Aug 2025',
      'USD'
    );

    // Step 5: Log completion (skip for now)
    console.log('✅ [QB Store Test] Would log completion here');

    console.log('✅ [QB Store Test] Storage test completed successfully');

    return NextResponse.json({
      success: true,
      message: 'QuickBooks P&L data stored successfully',
      storage: {
        rawDataId,
        recordsStored: transformedData.length,
        companyId,
        period: 'Aug 2025'
      },
      sample: {
        totalAccounts: transformedData.length,
        detailAccounts: transformedData.filter(r => r.isDetailAccount).length,
        categories: [...new Set(transformedData.map(r => r.category))],
        sampleAccounts: transformedData.slice(0, 5).map(r => ({
          name: r.accountName,
          category: r.category,
          amount: r.total,
          isDetail: r.isDetailAccount
        }))
      }
    });

  } catch (error) {
    // Log error (skip for now)
    console.log('❌ [QB Store Test] Would log error here:', error);
    throw error;
  }
}

async function retrieveStoredData(companyId: string) {
  console.log('📤 [QB Store Test] Retrieving stored data for company:', companyId);

  const storedData = await getTransformedPnLData(
    companyId,
    '2025-08-01',
    '2025-08-31'
  );

  return NextResponse.json({
    success: true,
    message: 'Data retrieved successfully',
    data: {
      totalRecords: storedData.length,
      companyId,
      detailAccounts: storedData.filter(r => r.isDetailAccount).length,
      categories: [...new Set(storedData.map(r => r.category))],
      sampleData: storedData.slice(0, 10).map(r => ({
        accountName: r.accountName,
        category: r.category,
        amount: r.amount,
        isDetailAccount: r.isDetailAccount,
        level: r.level,
        periodLabel: r.periodLabel
      })),
      fullData: storedData
    }
  });
}

async function checkDataExists(companyId: string) {
  console.log('🔍 [QB Store Test] Checking data existence for company:', companyId);

  const exists = await checkPnLDataExists(
    companyId,
    '2025-08-01',
    '2025-08-31'
  );

  return NextResponse.json({
    success: true,
    companyId,
    period: 'Aug 2025',
    dataExists: exists,
    message: exists ? 'Data exists for this period' : 'No data found for this period'
  });
}

// Clean QuickBooks transform function - no duplicates
function transformPnLData(pnlResponse: any): any[] {
  const transformedRows: any[] = [];
  const processedAccounts = new Set<string>(); // Track processed accounts to avoid duplicates

  if (!pnlResponse) {
    console.log('⚠️ [Transform] No P&L response provided');
    return transformedRows;
  }

  // Handle both { Report: {...} } and direct { Rows: {...} } formats
  const reportData = pnlResponse.Report || pnlResponse;
  const rowsToProcess = reportData?.Rows?.Row || [];

  console.log('🔄 [Transform] Starting clean transformation with', {
    responseFormat: pnlResponse.Report ? 'Wrapped' : 'Direct',
    rowsCount: Array.isArray(rowsToProcess) ? rowsToProcess.length : 0,
    reportName: reportData?.ReportName || 'Unknown'
  });

  // Simple iterative approach - process each section and its accounts once
  function processSection(section: any, level = 0, parentCategory = '') {
    if (!section) return;

    // Extract section info
    const sectionGroup = section.group;
    const sectionCategory = mapQuickBooksGroupToCategory(sectionGroup);

    // Process section header
    if (section.Header && section.Header.ColData) {
      const headerData = section.Header.ColData;
      const sectionName = headerData[0]?.value || sectionGroup;
      const sectionTotal = parseFloat(headerData[headerData.length - 1]?.value || '0');

      const sectionKey = `${sectionName}_${level}_section`;
      if (!processedAccounts.has(sectionKey)) {
        processedAccounts.add(sectionKey);

        transformedRows.push({
          accountName: sectionName,
          category: sectionCategory,
          subcategory: null,
          parentCategory: null,
          level: 0,
          isDetailAccount: false,
          isSubtotal: false,
          isTotal: true,
          total: sectionTotal,
          amount: sectionTotal,
          periodValues: headerData.slice(1, -1).map((col: any) => parseFloat(col?.value || '0')),
          originalAmount: sectionTotal
        });

        console.log(`📊 [Transform] Section: ${sectionName} (${sectionCategory}) = ${sectionTotal}`);
      }
    }

    // Process section summary
    if (section.Summary && section.Summary.ColData) {
      const summaryData = section.Summary.ColData;
      const summaryName = summaryData[0]?.value;
      const summaryTotal = parseFloat(summaryData[summaryData.length - 1]?.value || '0');

      const summaryKey = `${summaryName}_${level}_summary`;
      if (summaryName && !processedAccounts.has(summaryKey)) {
        processedAccounts.add(summaryKey);

        transformedRows.push({
          accountName: summaryName,
          category: sectionCategory,
          subcategory: summaryName,
          parentCategory: sectionCategory,
          level: level + 1,
          isDetailAccount: false,
          isSubtotal: true,
          isTotal: false,
          total: summaryTotal,
          amount: summaryTotal,
          periodValues: summaryData.slice(1, -1).map((col: any) => parseFloat(col?.value || '0')),
          originalAmount: summaryTotal
        });

        console.log(`📈 [Transform] Summary: ${summaryName} (${sectionCategory}) = ${summaryTotal}`);
      }
    }

    // Process nested rows (accounts)
    if (section.Rows && section.Rows.Row && Array.isArray(section.Rows.Row)) {
      for (const row of section.Rows.Row) {
        processAccountRow(row, level + 1, sectionCategory);
      }
    }
  }

  function processAccountRow(row: any, level: number, parentCategory: string) {
    if (!row) return;

    // Handle detail accounts (ColData)
    if (row.ColData && Array.isArray(row.ColData)) {
      const colData = row.ColData;
      const accountName = colData[0]?.value;
      const accountId = colData[0]?.id;

      if (accountName && accountName.trim()) {
        const accountTotal = parseFloat(colData[colData.length - 1]?.value || '0');
        const accountKey = `${accountName}_${accountId}_${level}_detail`;

        if (!processedAccounts.has(accountKey)) {
          processedAccounts.add(accountKey);

          transformedRows.push({
            accountName,
            category: parentCategory,
            subcategory: accountName,
            parentCategory,
            level,
            isDetailAccount: true,
            isSubtotal: false,
            isTotal: false,
            total: accountTotal,
            amount: accountTotal,
            periodValues: colData.slice(1, -1).map((col: any) => parseFloat(col?.value || '0')),
            originalAmount: accountTotal
          });

          console.log(`💰 [Transform] Account: ${accountName} (${parentCategory}) = ${accountTotal}`);
        }
      }
    }

    // Handle nested sections
    if (row.type === 'Section') {
      processSection(row, level, parentCategory);
    }

    // Handle subsection rows recursively
    if (row.Rows && row.Rows.Row && Array.isArray(row.Rows.Row)) {
      for (const nestedRow of row.Rows.Row) {
        processAccountRow(nestedRow, level + 1, parentCategory);
      }
    }
  }

  // Process each top-level section
  if (Array.isArray(rowsToProcess)) {
    for (const section of rowsToProcess) {
      processSection(section);
    }
  }

  console.log('✅ [Transform] Clean transformation complete:', {
    totalRows: transformedRows.length,
    processedAccounts: processedAccounts.size,
    detailAccounts: transformedRows.filter(r => r.isDetailAccount).length,
    summaryAccounts: transformedRows.filter(r => !r.isDetailAccount).length,
    categories: [...new Set(transformedRows.map(r => r.category))]
  });

  return transformedRows;
}

/**
 * Map QuickBooks group names to standard Warren categories
 */
function mapQuickBooksGroupToCategory(group: string | undefined): string {
  if (!group) {
    return 'Other';
  }

  const groupLower = group.toLowerCase();

  if (groupLower.includes('income') || groupLower.includes('revenue')) {
    return 'Revenue';
  }

  if (groupLower.includes('cost of goods sold') || groupLower.includes('cogs')) {
    return 'Cost of Goods Sold';
  }

  if (groupLower.includes('expense') || groupLower.includes('operating')) {
    return 'Operating Expenses';
  }

  // Default mapping - use the group name as category
  return group;
}

