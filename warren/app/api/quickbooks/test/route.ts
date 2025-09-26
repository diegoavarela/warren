/**
 * QuickBooks Test API Endpoint
 *
 * This endpoint fetches company info and P&L data from QuickBooks for testing
 * This is where we'll see REAL QuickBooks data on screen
 */

import { NextRequest, NextResponse } from 'next/server';
import { callQuickBooksAPI, getQuickBooksTokens } from '@/lib/services/quickbooks-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const realmId = searchParams.get('realmId');

    console.log('🔍 [QuickBooks Test] Request for realm:', realmId);

    if (!realmId) {
      return NextResponse.json({
        error: 'RealmId (QuickBooks Company ID) is required'
      }, { status: 400 });
    }

    // Check if we have tokens stored for this realm
    const tokens = await getQuickBooksTokens(realmId);
    if (!tokens) {
      return NextResponse.json({
        error: 'No QuickBooks tokens found for this company',
        details: 'Please reconnect to QuickBooks first'
      }, { status: 401 });
    }

    console.log('🔍 [QuickBooks Test] Found tokens for realm:', realmId);

    // Fetch real company information from QuickBooks
    console.log('🔍 [QuickBooks Test] Fetching company info...');
    const companyInfoResponse = await callQuickBooksAPI(realmId, `companyinfo/${realmId}`);
    const companyInfo = companyInfoResponse?.QueryResponse?.CompanyInfo?.[0] || null;

    // Fetch real P&L data from QuickBooks with multiple date ranges
    console.log('🔍 [QuickBooks Test] Fetching P&L reports for multiple periods...');

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed

    // Try multiple date ranges to find data
    const dateRanges = [
      // Current year to date
      {
        name: 'Current Year to Date',
        start: `${currentYear}-01-01`,
        end: `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`
      },
      // Last 24 months
      {
        name: 'Last 24 Months',
        start: `${currentYear - 2}-01-01`,
        end: `${currentYear}-12-31`
      },
      // Previous full year
      {
        name: 'Previous Year',
        start: `${currentYear - 1}-01-01`,
        end: `${currentYear - 1}-12-31`
      },
      // Last 3 years
      {
        name: 'Last 3 Years',
        start: `${currentYear - 3}-01-01`,
        end: `${currentYear}-12-31`
      }
    ];

    let pnlResponse = null;
    let usedDateRange = null;

    // Try each date range until we find data
    for (const dateRange of dateRanges) {
      console.log(`🔍 [QuickBooks Test] Trying ${dateRange.name}: ${dateRange.start} to ${dateRange.end}`);

      try {
        const response = await callQuickBooksAPI(
          realmId,
          `reports/ProfitAndLossDetail?start_date=${dateRange.start}&end_date=${dateRange.end}&summarize_column_by=Month`
        );

        console.log(`🔍 [QuickBooks Debug] Raw response for ${dateRange.name}:`, JSON.stringify(response, null, 2));

        // Check both response structures: { Report: {...} } and direct { Header: {...}, Rows: [...] }
        const reportData = response?.Report || response;
        const rows = reportData?.Rows || [];

        console.log(`🔍 [QuickBooks Debug] Response structure for ${dateRange.name}:`, {
          hasReport: !!response?.Report,
          hasDirectRows: !!response?.Rows,
          hasDirectHeader: !!response?.Header,
          rowCount: rows.length,
          reportName: reportData?.ReportName || reportData?.Header?.ReportName || 'Unknown'
        });

        // Debug the actual row content
        if (rows.length > 0) {
          console.log(`🔍 [QuickBooks Debug] First few rows content for ${dateRange.name}:`);
          rows.slice(0, 5).forEach((row: any, index: number) => {
            console.log(`Row ${index}:`, {
              group: row.group,
              ColDataLength: row.ColData?.length || 0,
              ColDataContent: row.ColData?.map((col: any, colIndex: number) => ({
                index: colIndex,
                value: col?.value || 'N/A'
              })) || [],
              hasSubRows: !!row.Rows,
              subRowCount: row.Rows?.length || 0
            });

            // Show first sub-row if it exists
            if (row.Rows && row.Rows.length > 0) {
              console.log(`  Sub-row 0:`, {
                group: row.Rows[0].group,
                ColDataContent: row.Rows[0].ColData?.map((col: any) => col?.value || 'N/A') || []
              });
            }
          });
        }

        // Check if response has meaningful data
        if (rows.length > 0) {
          console.log(`🔍 [QuickBooks Debug] Found ${rows.length} rows in ${dateRange.name}`);

          const hasData = rows.some((row: any) =>
            row.ColData && row.ColData.length > 2 // More than just account name and total
          );

          if (hasData) {
            pnlResponse = response;
            usedDateRange = dateRange;
            console.log(`✅ [QuickBooks Test] Found data in ${dateRange.name}`);
            break;
          } else {
            console.log(`⚠️ [QuickBooks Debug] ${dateRange.name} has rows but no meaningful data`);
          }
        } else {
          console.log(`⚠️ [QuickBooks Debug] ${dateRange.name} has no rows or empty response`);
        }
      } catch (error) {
        console.log(`⚠️ [QuickBooks Test] Error in ${dateRange.name}:`, error instanceof Error ? error.message : 'Unknown error');
      }
    }

    // If still no data, try without date restrictions (all time) - but use ProfitAndLoss (not Detail)
    if (!pnlResponse) {
      console.log('🔍 [QuickBooks Test] Trying all-time P&L data (summary format)...');
      try {
        const allTimeResponse = await callQuickBooksAPI(
          realmId,
          `reports/ProfitAndLoss?summarize_column_by=Month`
        );

        console.log('🔍 [QuickBooks Debug] All-time ProfitAndLoss response structure:', {
          hasReport: !!allTimeResponse?.Report,
          hasDirectRows: !!allTimeResponse?.Rows,
          reportName: allTimeResponse?.ReportName || allTimeResponse?.Report?.ReportName || 'Unknown',
          rowCount: allTimeResponse?.Rows?.Row?.length || allTimeResponse?.Rows?.length || 0
        });

        // Only use this if it has the right structure (month columns, not transaction details)
        const reportData = allTimeResponse?.Report || allTimeResponse;
        const columns = reportData?.Columns?.Column || reportData?.Columns || [];
        const hasMonthColumns = columns.some((col: any) =>
          col?.ColTitle?.includes('2025') || col?.ColTitle?.includes('Total')
        );

        if (hasMonthColumns) {
          pnlResponse = allTimeResponse;
          usedDateRange = { name: 'All Time (Summary)', start: 'Beginning', end: 'Current' };
          console.log('✅ [QuickBooks Test] Found valid all-time summary data');
        } else {
          console.log('⚠️ [QuickBooks Debug] All-time response has transaction format, skipping');
        }
      } catch (error) {
        console.error('❌ [QuickBooks Test] Failed to fetch any P&L data:', error);
      }
    }

    // Let's try different QuickBooks endpoints to see what data exists
    console.log('🔍 [QuickBooks Test] Let\'s check what data exists in this company...');

    // Check for Items (correct endpoint)
    try {
      const itemsResponse = await callQuickBooksAPI(realmId, 'query?query=SELECT * FROM Item MAXRESULTS 20');
      console.log('🔍 [QuickBooks Debug] Items found:', itemsResponse?.QueryResponse?.Item?.length || 0);
    } catch (error) {
      console.log('⚠️ [QuickBooks Debug] Error fetching items:', error instanceof Error ? error.message : 'Unknown error');
    }

    // Check for Accounts (correct endpoint)
    try {
      const accountsResponse = await callQuickBooksAPI(realmId, 'query?query=SELECT * FROM Account MAXRESULTS 20');
      console.log('🔍 [QuickBooks Debug] Accounts found:', accountsResponse?.QueryResponse?.Account?.length || 0);
    } catch (error) {
      console.log('⚠️ [QuickBooks Debug] Error fetching accounts:', error instanceof Error ? error.message : 'Unknown error');
    }

    // Check for Customers
    try {
      const customersResponse = await callQuickBooksAPI(realmId, 'query?query=SELECT * FROM Customer MAXRESULTS 20');
      console.log('🔍 [QuickBooks Debug] Customers found:', customersResponse?.QueryResponse?.Customer?.length || 0);
    } catch (error) {
      console.log('⚠️ [QuickBooks Debug] Error fetching customers:', error instanceof Error ? error.message : 'Unknown error');
    }

    // Check for Invoices (transactions)
    try {
      const invoicesResponse = await callQuickBooksAPI(realmId, 'query?query=SELECT * FROM Invoice MAXRESULTS 20');
      console.log('🔍 [QuickBooks Debug] Invoices found:', invoicesResponse?.QueryResponse?.Invoice?.length || 0);
    } catch (error) {
      console.log('⚠️ [QuickBooks Debug] Error fetching invoices:', error instanceof Error ? error.message : 'Unknown error');
    }

    // Skip additional endpoint testing if we already have data
    if (!pnlResponse) {
      console.log('⚠️ [QuickBooks Test] No P&L data found in any date range attempts');

      // Try different P&L report formats only as a last resort - QuickBooks is very specific about naming
      const reportVariants = [
        'reports/ProfitAndLoss', // Summary format (preferred)
        'reports/profitandloss',
        'reports/ProfitLoss',
        'reports/IncomeStatement'
        // Note: Skipping ProfitAndLossDetail to avoid transaction format confusion
      ];

      for (const reportEndpoint of reportVariants) {
        console.log(`🔍 [QuickBooks Test] Trying last resort endpoint: ${reportEndpoint}`);
        try {
          const reportResponse = await callQuickBooksAPI(realmId, reportEndpoint);
          console.log(`🔍 [QuickBooks Debug] ${reportEndpoint} response structure:`);
          console.log('- Full response keys:', Object.keys(reportResponse || {}));
          console.log('- Report exists (old):', !!reportResponse?.Report);
          console.log('- Direct Rows exist:', !!reportResponse?.Rows);
          console.log('- Direct Columns exist:', !!reportResponse?.Columns);

          // Handle both structures: { Report: {...} } and direct { Rows: [...], Columns: [...] }
          const reportData = reportResponse?.Report || reportResponse;

          if (reportData) {
            console.log('- Report Name:', reportData.ReportName || reportData.Header?.ReportName);
            console.log('- Report Type:', reportData.ReportType || 'Direct Format');
            console.log('- Rows count:', reportData.Rows?.length || 0);
            console.log('- Columns count:', reportData.Columns?.length || 0);

            if (reportData.Rows?.length > 0) {
              console.log('🔍 [QuickBooks Debug] First few rows from', reportEndpoint);
              reportData.Rows.slice(0, 3).forEach((row: any, index: number) => {
                console.log(`Row ${index}:`, {
                  group: row.group,
                  colDataLength: row.ColData?.length || 0,
                  firstCol: row.ColData?.[0]?.value || 'N/A',
                  allColData: row.ColData?.map((col: any) => col?.value || 'N/A') || []
                });
              });

              // Only use this response if it appears to have summary format
              const columns = reportData?.Columns?.Column || reportData?.Columns || [];
              const hasMonthColumns = columns.some((col: any) =>
                col?.ColTitle?.includes('2025') || col?.ColTitle?.includes('Total')
              );

              if (hasMonthColumns) {
                // Normalize the structure to always have a Report wrapper
                pnlResponse = reportResponse?.Report ? reportResponse : { Report: reportData };
                usedDateRange = { name: `${reportEndpoint} (Last Resort)`, start: 'All', end: 'All' };
                console.log(`✅ [QuickBooks Test] Found working report format: ${reportEndpoint}`);
                break;
              } else {
                console.log(`⚠️ [QuickBooks Debug] ${reportEndpoint} appears to be transaction detail format, skipping`);
              }
            }
          }
        } catch (error) {
          console.log(`⚠️ [QuickBooks Debug] Error with ${reportEndpoint}:`, error instanceof Error ? error.message : 'Unknown error');
        }
      }
    } else {
      console.log('✅ [QuickBooks Test] Already have P&L data, skipping additional endpoint tests');
    }

    // Transform QuickBooks P&L response to our format
    // Handle both structures: { Report: {...} } and direct { Header: {...}, Rows: [...] }
    const pnlReport = pnlResponse?.Report || pnlResponse;
    const pnlData = transformPnLData(pnlReport);

    console.log('✅ [QuickBooks Test] Successfully fetched real QuickBooks data');

    // Create detailed categorization breakdown for testing
    const categorizedData = {
      income: pnlData.rows.filter(row => row.category === 'Income'),
      expenses: pnlData.rows.filter(row => row.category === 'Expense'),
      other: pnlData.rows.filter(row => !['Income', 'Expense'].includes(row.category))
    };

    // Separate detail accounts from summary accounts for better organization
    const detailAccounts = pnlData.rows.filter(row => row.isDetailAccount === true);
    const summaryAccounts = pnlData.rows.filter(row => row.isDetailAccount !== true);

    // Group detail accounts by category and parent
    const accountsByCategory = detailAccounts.reduce((acc, account) => {
      if (!acc[account.category]) {
        acc[account.category] = [];
      }
      acc[account.category].push(account);
      return acc;
    }, {} as Record<string, any[]>);

    // Focus on January (index 0 in periodValues) to show individual account details
    const januaryAnalysis = {
      januaryTotals: {
        revenue: pnlData.rows
          .filter(row => row.category === 'Income')
          .reduce((sum, row) => sum + (row.periodValues?.[0] || 0), 0),
        expenses: pnlData.rows
          .filter(row => row.category === 'Expense')
          .reduce((sum, row) => sum + Math.abs(row.periodValues?.[0] || 0), 0)
      },
      januaryAccounts: pnlData.rows.map(row => ({
        accountName: row.accountName,
        category: row.category,
        januaryValue: row.periodValues?.[0] || 0,
        totalValue: row.total,
        isFixed: row.accountName.includes('Total') || row.accountName.includes('Net') || row.accountName.includes('Gross')
      }))
    };

    const detailedBreakdown = {
      summary: {
        totalRevenue: pnlData.summary.totalRevenue,
        totalExpenses: pnlData.summary.totalExpenses,
        netIncome: pnlData.summary.netIncome,
        grossMargin: pnlData.summary.totalRevenue > 0 ?
          ((pnlData.summary.totalRevenue - pnlData.summary.totalExpenses) / pnlData.summary.totalRevenue * 100).toFixed(2) + '%' : '0%'
      },
      januaryBreakdown: januaryAnalysis, // Show what's available in January specifically
      individualAccountsFound: pnlData.rows.filter(row => row.isDetailAccount === true).map(row => ({
        name: row.accountName,
        category: row.category,
        parentCategory: row.parentCategory,
        januaryAmount: row.periodValues?.[0] || 0,
        totalAmount: row.total,
        isDetailAccount: row.isDetailAccount,
        level: row.level,
        periodBreakdown: row.periodValues?.slice(0, 8) || [] // Show all available periods
      })),
      categorization: {
        incomeItems: categorizedData.income.map(item => ({
          name: item.accountName,
          amount: item.total,
          percentage: pnlData.summary.totalRevenue > 0 ?
            (Math.abs(item.total) / pnlData.summary.totalRevenue * 100).toFixed(1) + '%' : '0%',
          periodBreakdown: item.periodValues?.slice(0, 5) || [] // Show first 5 periods
        })),
        expenseItems: categorizedData.expenses.map(item => ({
          name: item.accountName,
          amount: item.total,
          percentage: pnlData.summary.totalExpenses > 0 ?
            (Math.abs(item.total) / pnlData.summary.totalExpenses * 100).toFixed(1) + '%' : '0%',
          periodBreakdown: item.periodValues?.slice(0, 5) || [] // Show first 5 periods
        })),
        otherItems: categorizedData.other.map(item => ({
          name: item.accountName,
          amount: item.total,
          category: item.category,
          periodBreakdown: item.periodValues?.slice(0, 5) || []
        }))
      },
      periods: pnlData.periods.slice(0, 6), // Show first 6 periods for readability
      dataStructure: {
        totalRows: pnlData.rows.length,
        incomeRows: categorizedData.income.length,
        expenseRows: categorizedData.expenses.length,
        otherRows: categorizedData.other.length,
        periodsAvailable: pnlData.periods.length
      }
    };

    return NextResponse.json({
      success: true,
      companyInfo: {
        Id: companyInfo?.Id || realmId,
        Name: companyInfo?.CompanyName || companyInfo?.Name || 'Unknown Company',
        LegalName: companyInfo?.LegalName || companyInfo?.CompanyName || 'Unknown Company',
        Country: companyInfo?.Country || 'US',
        Currency: companyInfo?.Currency || 'USD',
        FiscalYearStartMonth: companyInfo?.FiscalYearStartMonth || 'January',
        CompanyType: companyInfo?.CompanyType || 'QBO',
        CreatedTime: companyInfo?.CreatedTime || new Date().toISOString(),
        LastUpdatedTime: companyInfo?.LastUpdatedTime || new Date().toISOString()
      },
      pnlData,
      detailedBreakdown, // Enhanced categorized view
      dateRange: usedDateRange,
      dataSource: 'quickbooks', // Real data from QuickBooks
      fetchedAt: new Date().toISOString(),
      dataQuality: {
        hasData: !!pnlResponse,
        rowCount: pnlReport?.Rows?.Row?.length || 0,
        columnCount: pnlReport?.Columns?.Column?.length || 0,
        dateRangeUsed: usedDateRange?.name || 'None',
        periods: pnlData?.periods || []
      },
      note: `✅ REAL QuickBooks Data with Categorization! Revenue: $${pnlData.summary.totalRevenue.toLocaleString()}, Net Income: $${pnlData.summary.netIncome.toLocaleString()}`
    });

  } catch (error) {
    console.error('❌ [QuickBooks Test] Error:', error);

    return NextResponse.json({
      error: 'Failed to fetch QuickBooks data',
      details: error instanceof Error ? error.message : 'Unknown error',
      dataSource: 'error'
    }, { status: 500 });
  }
}

/**
 * Extract financial data from QuickBooks Summary section
 */
function extractFromSummary(summary: any, pnlReport: any) {
  console.log('🔍 [QuickBooks Summary] Extracting data from Summary section:', Object.keys(summary));

  let totalRevenue = 0;
  let totalExpenses = 0;
  const rows = [];

  // Common QuickBooks summary fields
  const revenueFields = ['Total Revenue', 'Total Income', 'Income', 'Revenue'];
  const expenseFields = ['Total Expenses', 'Total Expense', 'Expenses', 'Expense'];

  // Extract revenue
  for (const field of revenueFields) {
    if (summary[field] && typeof summary[field] === 'number') {
      totalRevenue += Math.abs(summary[field]);
      rows.push({
        accountName: field,
        category: 'Income',
        total: Math.abs(summary[field]),
        periodValues: [Math.abs(summary[field])],
        ColData: [{ value: field }, { value: Math.abs(summary[field]).toString() }]
      });
      console.log(`✅ [QuickBooks Summary] Found ${field}: ${summary[field]}`);
    }
  }

  // Extract expenses
  for (const field of expenseFields) {
    if (summary[field] && typeof summary[field] === 'number') {
      totalExpenses += Math.abs(summary[field]);
      rows.push({
        accountName: field,
        category: 'Expense',
        total: Math.abs(summary[field]),
        periodValues: [Math.abs(summary[field])],
        ColData: [{ value: field }, { value: Math.abs(summary[field]).toString() }]
      });
      console.log(`✅ [QuickBooks Summary] Found ${field}: ${summary[field]}`);
    }
  }

  // If no standard fields found, try to parse all numeric fields
  if (totalRevenue === 0 && totalExpenses === 0) {
    console.log('🔍 [QuickBooks Summary] No standard fields found, parsing all numeric fields');
    Object.entries(summary).forEach(([key, value]) => {
      if (typeof value === 'number' && value !== 0) {
        const isRevenue = key.toLowerCase().includes('income') ||
                         key.toLowerCase().includes('revenue') ||
                         key.toLowerCase().includes('sales');
        const category = isRevenue ? 'Income' : 'Expense';
        const amount = Math.abs(value);

        if (isRevenue) {
          totalRevenue += amount;
        } else {
          totalExpenses += amount;
        }

        rows.push({
          accountName: key,
          category,
          total: amount,
          periodValues: [amount],
          ColData: [{ value: key }, { value: amount.toString() }]
        });

        console.log(`✅ [QuickBooks Summary] Parsed ${key} as ${category}: ${value}`);
      }
    });
  }

  const netIncome = totalRevenue - totalExpenses;

  console.log('🔍 [QuickBooks Summary] Final totals:', {
    totalRevenue,
    totalExpenses,
    netIncome,
    rowCount: rows.length
  });

  return {
    dateRange: {
      startDate: pnlReport?.StartPeriod || `${new Date().getFullYear()}-01-01`,
      endDate: pnlReport?.EndPeriod || `${new Date().getFullYear()}-12-31`
    },
    summary: {
      totalRevenue,
      totalExpenses,
      netIncome
    },
    periods: [{ name: 'Summary', index: 1 }],
    rows,
    reportInfo: {
      reportName: pnlReport?.ReportName || 'Profit and Loss (Summary)',
      columnCount: 2,
      hasMultiPeriods: false,
      generatedTime: pnlReport?.GenerationTime || new Date().toISOString(),
      dataSource: 'summary'
    }
  };
}

/**
 * Transform QuickBooks P&L report to Warren format with multi-period support
 */
function transformPnLData(pnlReport: any) {
  console.log('🔍 [QuickBooks Transform] Raw input structure:', {
    hasReport: !!pnlReport,
    hasRows: !!pnlReport?.Rows,
    hasRowArray: !!pnlReport?.Rows?.Row,
    rowArrayLength: pnlReport?.Rows?.Row?.length || 0
  });

  if (!pnlReport || !pnlReport.Rows || !pnlReport.Rows.Row) {
    return {
      dateRange: {
        startDate: `${new Date().getFullYear()}-01-01`,
        endDate: `${new Date().getFullYear()}-12-31`
      },
      summary: {
        totalRevenue: 0,
        totalExpenses: 0,
        netIncome: 0
      },
      periods: [],
      rows: [],
      reportInfo: {
        reportName: 'No Data',
        columnCount: 0,
        hasMultiPeriods: false
      }
    };
  }

  console.log('🔍 [QuickBooks Transform] Report structure:', {
    reportName: pnlReport.ReportName || 'Unknown',
    dateRange: `${pnlReport.StartPeriod || 'N/A'} to ${pnlReport.EndPeriod || 'N/A'}`,
    columnCount: pnlReport.Columns?.length || 0,
    rowCount: pnlReport.Rows?.Row?.length || pnlReport.Rows?.length || 0,
    hasSummary: !!pnlReport.Summary,
    summaryKeys: Object.keys(pnlReport.Summary || {})
  });

  // If we have Summary data but no Rows, try to extract data from Summary
  const hasRows = (pnlReport.Rows?.Row?.length || pnlReport.Rows?.length || 0) > 0;
  if (pnlReport.Summary && !hasRows) {
    console.log('🔍 [QuickBooks Transform] Processing Summary-only data');
    return extractFromSummary(pnlReport.Summary, pnlReport);
  }

  // Extract period information from columns
  const periods = [];
  const columns = pnlReport.Columns?.Column || pnlReport.Columns || [];

  console.log('🔍 [QuickBooks Transform] Processing columns:', {
    hasColumns: !!pnlReport.Columns,
    hasColumnArray: !!pnlReport.Columns?.Column,
    columnCount: Array.isArray(columns) ? columns.length : 0,
    columnTitles: Array.isArray(columns) ? columns.map(col => col?.ColTitle || col?.colTitle) : []
  });

  if (Array.isArray(columns)) {
    for (let i = 1; i < columns.length; i++) { // Skip first column (account names)
      const column = columns[i];
      if (column && (column.ColTitle || column.colTitle)) {
        periods.push({
          name: column.ColTitle || column.colTitle,
          index: i
        });
        console.log(`  📅 [QuickBooks Transform] Added period: ${column.ColTitle || column.colTitle}`);
      }
    }
  }

  const rows: any[] = [];
  let totalRevenue = 0;
  let totalExpenses = 0;

  // Enhanced parsing with better categorization for QuickBooks group structure
  function parseRows(reportRows: any[] = [], level = 0, parentCategory = '') {
    if (!Array.isArray(reportRows)) return;

    for (const row of reportRows) {
      console.log(`🔍 [QuickBooks Transform] Processing row at level ${level}:`, {
        group: row.group,
        hasColData: !!row.ColData,
        colDataLength: row.ColData?.length || 0,
        hasRows: !!row.Rows,
        rowsLength: row.Rows?.length || 0,
        firstColValue: row.ColData?.[0]?.value || 'N/A'
      });

      // Handle different row types
      if (row.group) {
        // This is a grouped row (Income, COGS, Expenses, etc.)
        const groupName = row.ColData?.[0]?.value || row.group || '';
        console.log(`📊 [QuickBooks Transform] Processing group: ${groupName} (${row.group})`);

        // Process the Summary data which contains the totals
        if (row.Summary && row.Summary.ColData) {
          console.log(`  💰 [QuickBooks Transform] Processing Summary for ${groupName}:`, row.Summary.ColData);

          const summaryData = row.Summary.ColData;
          const summaryName = summaryData[0]?.value || groupName;
          const periodValues = [];

          // Extract monetary values from Summary (skip first column which is the name)
          for (let i = 1; i < summaryData.length; i++) {
            const rawValue = summaryData[i]?.value || '0';
            const amount = parseFloat(rawValue.replace(/[,$()]/g, '') || '0');

            // Handle negative values (shown in parentheses in QuickBooks)
            const isNegative = rawValue.includes('(') && rawValue.includes(')');
            const finalAmount = isNegative ? -Math.abs(amount) : amount;

            periodValues.push(finalAmount);
            console.log(`    📈 [QuickBooks Transform] ${summaryName} period ${i}: ${rawValue} → ${finalAmount}`);
          }

          // Calculate total from the last column (usually the "Total" column)
          const totalAmount = Math.abs(periodValues[periodValues.length - 1] || 0);

          if (totalAmount > 0) {
            const category = determineCategory(groupName, parentCategory, level);

            rows.push({
              accountName: summaryName,
              category,
              parentCategory,
              periodValues,
              total: periodValues[periodValues.length - 1] || 0, // Use actual total, not sum
              ColData: [
                { value: summaryName },
                ...periodValues.map(val => ({ value: val.toString() }))
              ]
            });

            // Add to totals based on group type
            if (row.group === 'Income') {
              totalRevenue += totalAmount;
              console.log(`  ✅ [QuickBooks Transform] Added ${totalAmount} to revenue from ${summaryName} (now ${totalRevenue})`);
            } else if (row.group === 'COGS' || row.group === 'Expenses' || row.group === 'OtherExpenses') {
              totalExpenses += totalAmount;
              console.log(`  ✅ [QuickBooks Transform] Added ${totalAmount} to expenses from ${summaryName} (now ${totalExpenses})`);
            }
          }
        }

        // Process child rows with this group as parent category to get individual accounts
        if (row.Rows && Array.isArray(row.Rows)) {
          parseRows(row.Rows, level + 1, groupName);
        }
      } else if (row.Summary && row.Summary.ColData && !row.group) {
        // Handle summary rows that don't have a group but have summary data
        const summaryData = row.Summary.ColData;
        const summaryName = summaryData[0]?.value || 'Unknown Summary';
        const periodValues = [];

        // Extract monetary values from Summary
        for (let i = 1; i < summaryData.length; i++) {
          const rawValue = summaryData[i]?.value || '0';
          const amount = parseFloat(rawValue.replace(/[,$()]/g, '') || '0');
          const isNegative = rawValue.includes('(') && rawValue.includes(')');
          const finalAmount = isNegative ? -Math.abs(amount) : amount;
          periodValues.push(finalAmount);
        }

        const totalAmount = Math.abs(periodValues[periodValues.length - 1] || 0);
        if (totalAmount > 0) {
          const category = determineCategory(summaryName, parentCategory, level);
          rows.push({
            accountName: summaryName,
            category,
            parentCategory,
            periodValues,
            total: periodValues[periodValues.length - 1] || 0,
            ColData: [
              { value: summaryName },
              ...periodValues.map(val => ({ value: val.toString() }))
            ]
          });

          console.log(`  ✅ [QuickBooks Transform] Added summary: ${summaryName} (${category}) = ${totalAmount}`);
        }
      } else if (row.ColData && row.ColData.length > 1) {
        // This is a regular data row without a group - individual account
        const accountName = row.ColData[0]?.value || '';

        if (accountName && accountName.trim()) {
          // Extract values for each period
          const periodValues = [];
          for (let i = 1; i < row.ColData.length; i++) {
            const rawValue = row.ColData[i]?.value || '0';
            const amount = parseFloat(rawValue.replace(/[,$()]/g, '') || '0');

            // Handle negative values (shown in parentheses in QuickBooks)
            const isNegative = rawValue.includes('(') && rawValue.includes(')');
            const finalAmount = isNegative ? -Math.abs(amount) : amount;

            periodValues.push(finalAmount);
          }

          // Calculate total from the last column (usually the "Total" column)
          const totalAmount = Math.abs(periodValues[periodValues.length - 1] || 0);

          if (totalAmount > 0) {
            const category = determineCategory(accountName, parentCategory, level);
            const isDetailAccount = !accountName.includes('Total') && !accountName.includes('Net') && !accountName.includes('Gross');

            rows.push({
              accountName,
              category,
              parentCategory,
              periodValues,
              total: periodValues[periodValues.length - 1] || 0, // Use actual total, not sum
              isDetailAccount, // Flag to distinguish detail accounts from summaries
              level, // Track the nesting level
              ColData: [
                { value: accountName },
                ...periodValues.map(val => ({ value: val.toString() }))
              ]
            });

            // Only add detail accounts to running totals to avoid double-counting
            // (Summary rows already include these amounts)
            if (isDetailAccount) {
              if (category === 'Income') {
                // Note: Don't add to totalRevenue as summaries already include these
                console.log(`  📝 [QuickBooks Transform] Detail account: ${accountName} (${category}) = ${totalAmount} (not added to total - already in summary)`);
              } else if (category === 'Expense') {
                // Note: Don't add to totalExpenses as summaries already include these
                console.log(`  📝 [QuickBooks Transform] Detail account: ${accountName} (${category}) = ${totalAmount} (not added to total - already in summary)`);
              }
            } else {
              console.log(`  ✅ [QuickBooks Transform] Summary account: ${accountName} (${category}) = ${totalAmount}`);
            }
          }
        }
      }

      // Recursively process nested rows if they exist
      if (row.Rows && row.Rows.Row && Array.isArray(row.Rows.Row)) {
        console.log(`🔄 [QuickBooks Transform] Processing ${row.Rows.Row.length} nested rows under ${parentCategory}`);
        parseRows(row.Rows.Row, level + 1, parentCategory);
      }
    }
  }

  // Helper function to determine category based on QuickBooks P&L structure
  function determineCategory(accountName: string, parentCategory: string, level: number): string {
    const name = accountName.toLowerCase();
    const parent = parentCategory.toLowerCase();

    console.log(`🔍 [QuickBooks Category] Categorizing: "${accountName}" (parent: "${parentCategory}", level: ${level})`);

    // QuickBooks standard P&L groups - Income categories
    const incomeGroups = [
      'income', 'revenue', 'sales', 'gross receipts', 'total income',
      'operating revenue', 'service revenue', 'product revenue',
      'fees earned', 'interest income', 'other income'
    ];

    // QuickBooks standard P&L groups - Expense categories
    const expenseGroups = [
      'expense', 'expenses', 'cost', 'costs', 'cogs', 'cost of goods sold',
      'operating expense', 'operating expenses', 'payroll', 'rent',
      'utilities', 'supplies', 'advertising', 'insurance', 'depreciation',
      'interest expense', 'other expense', 'total expense', 'total expenses'
    ];

    // Check parent category first (more reliable for QuickBooks grouped data)
    for (const incomeGroup of incomeGroups) {
      if (parent.includes(incomeGroup) || name.includes(incomeGroup)) {
        console.log(`  → Income (matched: ${incomeGroup})`);
        return 'Income';
      }
    }

    for (const expenseGroup of expenseGroups) {
      if (parent.includes(expenseGroup) || name.includes(expenseGroup)) {
        console.log(`  → Expense (matched: ${expenseGroup})`);
        return 'Expense';
      }
    }

    // Special QuickBooks categories
    if (name.includes('gross profit') || name.includes('net income') ||
        name.includes('net operating income') || name.includes('net other income')) {
      console.log(`  → Income (profit/net category)`);
      return 'Income';
    }

    // Default logic based on QuickBooks P&L structure
    // In QB, top-level groups are usually Income, then everything else is expenses/costs
    const defaultCategory = level <= 1 ? 'Income' : 'Expense';
    console.log(`  → ${defaultCategory} (default by level)`);
    return defaultCategory;
  }

  // Handle both response structures: direct Rows array or nested Rows.Row array
  const rowsToProcess = pnlReport.Rows?.Row || pnlReport.Rows || [];

  console.log('🔍 [QuickBooks Transform] Processing rows structure:', {
    hasDirectRows: !!pnlReport.Rows && Array.isArray(pnlReport.Rows),
    hasNestedRows: !!pnlReport.Rows?.Row && Array.isArray(pnlReport.Rows.Row),
    rowsToProcessLength: Array.isArray(rowsToProcess) ? rowsToProcess.length : 0,
    firstRowStructure: rowsToProcess[0] ? {
      hasGroup: !!rowsToProcess[0].group,
      group: rowsToProcess[0].group,
      hasHeader: !!rowsToProcess[0].Header,
      hasSummary: !!rowsToProcess[0].Summary,
      type: rowsToProcess[0].type
    } : 'No rows'
  });

  if (Array.isArray(rowsToProcess) && rowsToProcess.length > 0) {
    parseRows(rowsToProcess);
  }

  const netIncome = totalRevenue - totalExpenses;

  console.log('🔍 [QuickBooks Transform] Final summary before return:', {
    totalRevenue,
    totalExpenses,
    netIncome,
    rowCount: rows.length,
    periodsCount: periods.length
  });

  // Ensure we don't lose the extracted data - debug what we actually have
  console.log('🔍 [QuickBooks Transform] Sample rows:', rows.slice(0, 3).map(row => ({
    name: row.accountName,
    category: row.category,
    total: row.total,
    periodValues: row.periodValues?.slice(0, 2) || []
  })));

  return {
    dateRange: {
      startDate: pnlReport.StartPeriod || `${new Date().getFullYear()}-01-01`,
      endDate: pnlReport.EndPeriod || `${new Date().getFullYear()}-12-31`
    },
    summary: {
      totalRevenue,
      totalExpenses,
      netIncome
    },
    periods,
    rows,
    reportInfo: {
      reportName: pnlReport.ReportName || 'Profit and Loss',
      columnCount: columns.length,
      hasMultiPeriods: periods.length > 1,
      generatedTime: pnlReport.GenerationTime || new Date().toISOString()
    }
  };
}