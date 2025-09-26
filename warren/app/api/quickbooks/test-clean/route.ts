/**

export const dynamic = 'force-dynamic';
 * Clean QuickBooks Test Endpoint - No Conflicts
 *
 * Tests the fixed transformation and storage with real QuickBooks data
 */

import { NextRequest, NextResponse } from 'next/server';
import { callQuickBooksAPI } from '@/lib/services/quickbooks-service';
import {
  storeRawPnLData,
  storeTransformedPnLData,
  getTransformedPnLData
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

    if (request.method === 'POST') {
      const body = await request.json();
      realmId = body.realmId;
      companyId = body.companyId;
      action = body.action || 'store';
    } else {
      const searchParams = request.nextUrl.searchParams;
      realmId = searchParams.get('realmId');
      companyId = searchParams.get('companyId');
      action = searchParams.get('action') || 'store';
    }

    if (!realmId) {
      return NextResponse.json({
        error: 'realmId parameter is required'
      }, { status: 400 });
    }

    if (!companyId) {
      return NextResponse.json({
        error: 'companyId parameter is required'
      }, { status: 400 });
    }

    console.log('🧪 [Clean Test] Testing for company:', companyId, 'realm:', realmId);

    if (action === 'retrieve') {
      return await retrieveStoredData(companyId);
    } else {
      return await storeNewData(companyId, realmId);
    }

  } catch (error) {
    console.error('❌ [Clean Test] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function storeNewData(companyId: string, realmId: string) {
  console.log('🧪 [Clean Test] Starting clean storage test...');

  try {
    // Get the integration ID
    console.log('🔍 [Clean Test] Looking up integration for realm_id:', realmId);
    const integrations = await db
      .select({ id: quickbooksIntegrations.id })
      .from(quickbooksIntegrations)
      .where(eq(quickbooksIntegrations.realmId, realmId))
      .limit(1);

    if (integrations.length === 0) {
      throw new Error(`No integration found for realm_id: ${realmId}`);
    }

    const integrationId = integrations[0].id;
    console.log('✅ [Clean Test] Found integration ID:', integrationId);

    // Step 1: Fetch raw data from QuickBooks
    console.log('📥 [Clean Test] Fetching raw P&L data from QuickBooks...');

    const pnlResponse = await callQuickBooksAPI(
      realmId,
      `reports/ProfitAndLoss?start_date=2025-08-01&end_date=2025-08-31&summarize_column_by=Month`
    );

    // Step 2: Store raw data
    console.log('💾 [Clean Test] Storing raw P&L data...');

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

    // Step 3: Transform the data using our clean function
    console.log('🔄 [Clean Test] Transforming P&L data...');

    const transformedData = cleanTransformPnLData(pnlResponse);

    // Step 4: Store transformed data
    console.log('💾 [Clean Test] Storing transformed P&L data...');

    await storeTransformedPnLData(
      companyId,
      rawDataId,
      transformedData,
      '2025-08-01',
      '2025-08-31',
      'Aug 2025',
      'USD'
    );

    console.log('✅ [Clean Test] Clean storage test completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Clean QuickBooks P&L data stored successfully',
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
    console.error('❌ [Clean Test] Error:', error);
    throw error;
  }
}

async function retrieveStoredData(companyId: string) {
  console.log('📤 [Clean Test] Retrieving stored data for company:', companyId);

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

// Clean QuickBooks transform function - simplified with better deduplication
function cleanTransformPnLData(pnlResponse: any): any[] {
  const transformedRows: any[] = [];
  const processedAccounts = new Map<string, any>(); // Track all processed items

  if (!pnlResponse) {
    console.log('⚠️ [Clean Transform] No P&L response provided');
    return transformedRows;
  }

  // Handle both { Report: {...} } and direct { Rows: {...} } formats
  const reportData = pnlResponse.Report || pnlResponse;
  const rowsToProcess = reportData?.Rows?.Row || [];

  console.log('🔄 [Clean Transform] Starting clean transformation with', {
    responseFormat: pnlResponse.Report ? 'Wrapped' : 'Direct',
    rowsCount: Array.isArray(rowsToProcess) ? rowsToProcess.length : 0,
    reportName: reportData?.ReportName || 'Unknown'
  });

  // Simplified processing - focus on detail accounts and main summaries only
  function processRow(row: any, level = 0, parentCategory = '') {
    if (!row) return;

    // Handle detail accounts with ColData (actual accounts)
    if (row.ColData && Array.isArray(row.ColData)) {
      const colData = row.ColData;
      const accountName = colData[0]?.value;
      const accountId = colData[0]?.id;

      if (accountName && accountName.trim()) {
        const accountTotal = parseFloat(colData[colData.length - 1]?.value || '0');

        // Create a unique key based on account name and parent category only
        const accountKey = `${accountName}_${parentCategory}`;

        // Only add if we haven't seen this exact account in this category
        if (!processedAccounts.has(accountKey)) {
          const accountData = {
            accountName,
            category: parentCategory || mapQuickBooksGroupToCategory(row.group),
            subcategory: accountName,
            parentCategory: parentCategory || null,
            level,
            isDetailAccount: true,
            isSubtotal: false,
            isTotal: false,
            total: accountTotal,
            amount: accountTotal,
            periodValues: colData.slice(1, -1).map((col: any) => parseFloat(col?.value || '0')),
            originalAmount: accountTotal
          };

          processedAccounts.set(accountKey, accountData);
          transformedRows.push(accountData);

          console.log(`💰 [Clean Transform] Account: ${accountName} (${parentCategory || 'Unknown'}) = ${accountTotal}`);
        } else {
          console.log(`⚠️ [Clean Transform] Skipping duplicate account: ${accountName} in ${parentCategory}`);
        }
      }
    }

    // Process summary rows (totals)
    if (row.Summary && row.Summary.ColData) {
      const summaryData = row.Summary.ColData;
      const summaryName = summaryData[0]?.value;
      const summaryTotal = parseFloat(summaryData[summaryData.length - 1]?.value || '0');

      if (summaryName && summaryName.trim()) {
        const category = parentCategory || mapQuickBooksGroupToCategory(row.group);
        const summaryKey = `${summaryName}_${category}_summary`;

        if (!processedAccounts.has(summaryKey)) {
          const summaryRecord = {
            accountName: summaryName,
            category: category,
            subcategory: summaryName,
            parentCategory: category,
            level: level,
            isDetailAccount: false,
            isSubtotal: true,
            isTotal: false,
            total: summaryTotal,
            amount: summaryTotal,
            periodValues: summaryData.slice(1, -1).map((col: any) => parseFloat(col?.value || '0')),
            originalAmount: summaryTotal
          };

          processedAccounts.set(summaryKey, summaryRecord);
          transformedRows.push(summaryRecord);

          console.log(`📈 [Clean Transform] Summary: ${summaryName} (${category}) = ${summaryTotal}`);
        }
      }
    }

    // Process group headers for main sections
    if (row.group && row.Header && row.Header.ColData) {
      const headerData = row.Header.ColData;
      const sectionName = headerData[0]?.value || row.group;
      const sectionTotal = parseFloat(headerData[headerData.length - 1]?.value || '0');
      const sectionCategory = mapQuickBooksGroupToCategory(row.group);

      const sectionKey = `${sectionName}_${sectionCategory}_header`;
      if (!processedAccounts.has(sectionKey)) {
        const sectionRecord = {
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
        };

        processedAccounts.set(sectionKey, sectionRecord);
        transformedRows.push(sectionRecord);

        console.log(`📊 [Clean Transform] Section: ${sectionName} (${sectionCategory}) = ${sectionTotal}`);
      }
    }

    // Recursively process nested rows
    if (row.Rows && row.Rows.Row && Array.isArray(row.Rows.Row)) {
      const currentCategory = parentCategory || mapQuickBooksGroupToCategory(row.group);
      for (const nestedRow of row.Rows.Row) {
        processRow(nestedRow, level + 1, currentCategory);
      }
    }
  }

  // Process all top-level rows
  if (Array.isArray(rowsToProcess)) {
    for (const row of rowsToProcess) {
      processRow(row, 0, '');
    }
  }

  console.log('✅ [Clean Transform] Clean transformation complete:', {
    totalRows: transformedRows.length,
    uniqueKeys: processedAccounts.size,
    detailAccounts: transformedRows.filter(r => r.isDetailAccount).length,
    summaryAccounts: transformedRows.filter(r => r.isSubtotal).length,
    sectionHeaders: transformedRows.filter(r => r.isTotal).length,
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